import { Queue, QueueEvents } from 'bullmq';
import { redisConnectionOptions } from '../config/redis.config';
import { EmailJobData, ScheduleCampaignDTO } from '../types';
import { prisma } from '../prisma/client';
import { elasticsearchService } from './elasticsearch.service';
import { env } from '../config/env.config';

export const QUEUE_NAME = 'email-dispatch-queue';

export let emailQueue: Queue<EmailJobData>;
export let emailQueueEvents: QueueEvents;

export function initQueue(): Queue<EmailJobData> {
  emailQueue = new Queue<EmailJobData>(QUEUE_NAME, {
    connection: redisConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: false,
      removeOnFail: false,
    },
  });

  emailQueueEvents = new QueueEvents(QUEUE_NAME, {
    connection: redisConnectionOptions,
  });

  emailQueueEvents.on('completed', ({ jobId }) => {
    console.log(`[BullMQ] Job ${jobId} finished execution`);
  });

  emailQueueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`[BullMQ] Job ${jobId} failed: ${failedReason}`);
  });

  return emailQueue;
}

export class QueueService {
  /**
   * Schedules a single email job with exact delay calculation
   */
  public async scheduleSingleJob(
    emailJobRecord: {
      id: string;
      campaignId?: string | null;
      userId: string;
      senderId?: string | null;
      senderEmail: string;
      senderName?: string;
      recipientEmail: string;
      recipientName?: string | null;
      subject: string;
      body: string;
      scheduledAt: Date;
    },
    hourlyLimit: number,
    delayBetweenEmailsMs: number
  ): Promise<string> {
    if (!emailQueue) {
      initQueue();
    }

    const delayMs = Math.max(0, emailJobRecord.scheduledAt.getTime() - Date.now());

    // Replace template variables {{name}}, {{email}} in subject & body
    const formattedSubject = emailJobRecord.subject
      .replace(/{{name}}/gi, emailJobRecord.recipientName || 'there')
      .replace(/{{email}}/gi, emailJobRecord.recipientEmail);

    const formattedBody = emailJobRecord.body
      .replace(/{{name}}/gi, emailJobRecord.recipientName || 'there')
      .replace(/{{email}}/gi, emailJobRecord.recipientEmail);

    const jobData: EmailJobData = {
      jobId: emailJobRecord.id,
      campaignId: emailJobRecord.campaignId || undefined,
      userId: emailJobRecord.userId,
      senderId: emailJobRecord.senderId || undefined,
      senderEmail: emailJobRecord.senderEmail,
      senderName: emailJobRecord.senderName || env.DEFAULT_SENDER_NAME,
      recipientEmail: emailJobRecord.recipientEmail,
      recipientName: emailJobRecord.recipientName || undefined,
      subject: formattedSubject,
      body: formattedBody,
      scheduledAt: emailJobRecord.scheduledAt.toISOString(),
      hourlyLimit,
      delayBetweenEmailsMs,
    };

    const job = await emailQueue.add(`send-${emailJobRecord.id}`, jobData, {
      jobId: emailJobRecord.id, // Idempotency
      delay: delayMs,
    });

    // Update DB with BullMQ job ID
    await prisma.emailJob.update({
      where: { id: emailJobRecord.id },
      data: { bullmqJobId: job.id },
    });

    console.log(
      `[BullMQ] Enqueued delayed job ${emailJobRecord.id} with delay ${delayMs}ms (fires at ${emailJobRecord.scheduledAt.toISOString()})`
    );

    return job.id!;
  }

  /**
   * Bulk schedules a batch campaign of leads with staggered intervals
   */
  public async scheduleBatchCampaign(userId: string, campaignData: ScheduleCampaignDTO) {
    if (!emailQueue) {
      initQueue();
    }

    const senderEmail = campaignData.senderEmail || env.DEFAULT_SENDER_EMAIL;
    const senderName = campaignData.senderName || env.DEFAULT_SENDER_NAME;
    const delayBetweenSec = campaignData.delayBetweenEmailsSec ?? 2;
    const delayBetweenMs = delayBetweenSec * 1000;
    const hourlyLimit = campaignData.hourlyLimit ?? env.MAX_EMAILS_PER_HOUR_PER_SENDER;

    // Parse start time (default to now if omitted or in the past)
    const baseStartTime = campaignData.startTime ? new Date(campaignData.startTime) : new Date();
    const effectiveStartTime = baseStartTime.getTime() < Date.now() ? new Date() : baseStartTime;

    // 1. Create Campaign in Database
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name: campaignData.subject.slice(0, 50) || 'Untitled Campaign',
        subject: campaignData.subject,
        body: campaignData.body,
        totalLeads: campaignData.leads.length,
        delayBetweenEmailsSec: delayBetweenSec,
        hourlyLimit,
        startTime: effectiveStartTime,
        status: 'SCHEDULED',
      },
    });

    // 2. Prepare EmailJob records with staggered scheduledAt timestamps
    const emailJobDataList = campaignData.leads.map((lead, index) => {
      const scheduledTimestamp = effectiveStartTime.getTime() + index * delayBetweenMs;
      const scheduledAt = new Date(scheduledTimestamp);

      return {
        campaignId: campaign.id,
        userId,
        senderEmail,
        recipientEmail: lead.email.toLowerCase().trim(),
        recipientName: lead.name || null,
        subject: campaignData.subject,
        body: campaignData.body,
        scheduledAt,
        status: 'SCHEDULED',
      };
    });

    // 3. Batch insert into Database
    const createdJobs = await prisma.$transaction(
      emailJobDataList.map((job) => prisma.emailJob.create({ data: job }))
    );

    // 4. Enqueue BullMQ delayed jobs and index into Elasticsearch
    for (let i = 0; i < createdJobs.length; i++) {
      const dbJob = createdJobs[i];

      await this.scheduleSingleJob(
        {
          ...dbJob,
          senderName,
        },
        hourlyLimit,
        delayBetweenMs
      );

      // Index in Elasticsearch
      await elasticsearchService.indexEmail(dbJob);
    }

    return {
      campaignId: campaign.id,
      totalScheduled: createdJobs.length,
      startTime: effectiveStartTime,
      staggerDelaySeconds: delayBetweenSec,
    };
  }

  /**
   * Resumes and recovers pending jobs on system boot / restart
   */
  public async recoverPendingJobsOnBoot(): Promise<number> {
    const pendingJobs = await prisma.emailJob.findMany({
      where: {
        status: { in: ['SCHEDULED', 'RESCHEDULED'] },
      },
    });

    if (pendingJobs.length === 0) return 0;

    console.log(`[BullMQ Recovery] Found ${pendingJobs.length} pending jobs from previous session. Re-verifying queues...`);

    let recoveredCount = 0;
    for (const job of pendingJobs) {
      try {
        await this.scheduleSingleJob(
          {
            ...job,
            senderName: env.DEFAULT_SENDER_NAME,
          },
          env.MAX_EMAILS_PER_HOUR_PER_SENDER,
          env.EMAIL_SEND_DELAY_MS
        );
        recoveredCount++;
      } catch (e: any) {
        console.warn(`[BullMQ Recovery] Could not re-enqueue job ${job.id}: ${e.message}`);
      }
    }

    console.log(`[BullMQ Recovery] Successfully verified ${recoveredCount} jobs for execution.`);
    return recoveredCount;
  }

  /**
   * Retries all failed jobs for a user
   */
  public async retryFailedJobs(userId: string): Promise<number> {
    const failedJobs = await prisma.emailJob.findMany({
      where: { userId, status: 'FAILED' },
    });

    for (const job of failedJobs) {
      const updated = await prisma.emailJob.update({
        where: { id: job.id },
        data: { status: 'SCHEDULED', scheduledAt: new Date() },
      });

      await this.scheduleSingleJob(
        {
          ...updated,
          senderName: env.DEFAULT_SENDER_NAME,
        },
        env.MAX_EMAILS_PER_HOUR_PER_SENDER,
        env.EMAIL_SEND_DELAY_MS
      );
    }

    return failedJobs.length;
  }
}

export const queueService = new QueueService();
