import { Queue, QueueEvents } from 'bullmq';
import { redisClient, redisConnectionOptions } from '../config/redis.config';
import { EmailJobData, ScheduleCampaignDTO } from '../types';
import { prisma } from '../prisma/client';
import { elasticsearchService } from './elasticsearch.service';
import { env } from '../config/env.config';

export const QUEUE_NAME = 'email-dispatch-queue';

let emailQueueInstance: Queue<EmailJobData> | null = null;
let emailQueueEventsInstance: QueueEvents | null = null;

export function getEmailQueue(): Queue<EmailJobData> {
  if (!emailQueueInstance) {
    emailQueueInstance = new Queue<EmailJobData>(QUEUE_NAME, {
      connection: redisClient as any,
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
  }
  return emailQueueInstance;
}

export function initQueueEvents(): QueueEvents {
  if (!emailQueueEventsInstance) {
    emailQueueEventsInstance = new QueueEvents(QUEUE_NAME, {
      connection: redisClient as any,
    });

    emailQueueEventsInstance.on('completed', ({ jobId }) => {
      console.log(`[BullMQ] Job ${jobId} finished execution`);
    });

    emailQueueEventsInstance.on('failed', ({ jobId, failedReason }) => {
      console.error(`[BullMQ] Job ${jobId} failed: ${failedReason}`);
    });
  }
  return emailQueueEventsInstance;
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
    const queue = getEmailQueue();
    const delayMs = Math.max(0, emailJobRecord.scheduledAt.getTime() - Date.now());

    const jobData: EmailJobData = {
      jobId: emailJobRecord.id,
      campaignId: emailJobRecord.campaignId || undefined,
      userId: emailJobRecord.userId,
      senderId: emailJobRecord.senderId || undefined,
      senderEmail: emailJobRecord.senderEmail,
      senderName: emailJobRecord.senderName || env.DEFAULT_SENDER_NAME,
      recipientEmail: emailJobRecord.recipientEmail,
      recipientName: emailJobRecord.recipientName || undefined,
      subject: emailJobRecord.subject,
      body: emailJobRecord.body,
      scheduledAt: emailJobRecord.scheduledAt.toISOString(),
      hourlyLimit,
      delayBetweenEmailsMs,
    };

    const job = await queue.add(`send-${emailJobRecord.id}`, jobData, {
      jobId: emailJobRecord.id, // Idempotency
      delay: delayMs,
    });

    // Update DB with BullMQ job ID
    await prisma.emailJob.update({
      where: { id: emailJobRecord.id },
      data: { bullmqJobId: job.id },
    });

    console.log(`[BullMQ] Enqueued delayed job ${emailJobRecord.id} with delay ${delayMs}ms (fires at ${emailJobRecord.scheduledAt.toISOString()})`);

    return job.id!;
  }

  /**
   * Bulk schedules a batch campaign of leads with staggered intervals
   */
  public async scheduleBatchCampaign(
    userId: string,
    campaignData: ScheduleCampaignDTO
  ) {
    const senderEmail = campaignData.senderEmail || env.DEFAULT_SENDER_EMAIL;
    const senderName = campaignData.senderName || env.DEFAULT_SENDER_NAME;
    const delayBetweenSec = campaignData.delayBetweenEmailsSec ?? 2;
    const delayBetweenMs = delayBetweenSec * 1000;
    const hourlyLimit = campaignData.hourlyLimit ?? env.MAX_EMAILS_PER_HOUR_PER_SENDER;

    // Parse start time (default to now if omitted or past)
    const baseStartTime = campaignData.startTime ? new Date(campaignData.startTime) : new Date();
    const effectiveStartTime = baseStartTime.getTime() < Date.now() ? new Date() : baseStartTime;

    // 1. Create Campaign in PostgreSQL / SQLite
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
}

export const queueService = new QueueService();
export const emailQueue = getEmailQueue();
