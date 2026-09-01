import { Queue, QueueEvents } from 'bullmq';
import { redisConnectionOptions } from '../config/redis.config';
import { EmailJobData } from '../types';
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

export interface ExtendedScheduleCampaignDTO {
  subject: string;
  body: string;
  subjectB?: string;
  bodyB?: string;
  isABTest?: boolean;
  includeUnsubscribe?: boolean;
  rotateSenders?: boolean;
  senderEmail?: string;
  senderName?: string;
  leads: { email: string; name?: string }[];
  startTime?: string;
  delayBetweenEmailsSec?: number;
  hourlyLimit?: number;
}

export class QueueService {
  /**
   * Schedules a single email job with exact delay calculation & tracking injections
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
    delayBetweenEmailsMs: number,
    includeTracking = true
  ): Promise<string> {
    if (!emailQueue) {
      initQueue();
    }

    const delayMs = Math.max(0, emailJobRecord.scheduledAt.getTime() - Date.now());

    // 1. Template Variables Replacement
    let formattedSubject = emailJobRecord.subject
      .replace(/{{name}}/gi, emailJobRecord.recipientName || 'there')
      .replace(/{{email}}/gi, emailJobRecord.recipientEmail);

    let formattedBody = emailJobRecord.body
      .replace(/{{name}}/gi, emailJobRecord.recipientName || 'there')
      .replace(/{{email}}/gi, emailJobRecord.recipientEmail);

    // 2. Real-World Tracking Injections (Open Pixel + Unsubscribe Link)
    if (includeTracking) {
      const openPixelUrl = `http://localhost:5000/api/track/open/${emailJobRecord.id}`;
      const unsubscribeUrl = `http://localhost:5000/api/track/unsubscribe/${emailJobRecord.id}`;

      formattedBody += `
        <br/><br/>
        <div style="font-size: 11px; color: #888; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px; font-family: sans-serif;">
          You received this email as part of ReachInbox outreach.
          <a href="${unsubscribeUrl}" style="color: #6366f1; text-decoration: underline; margin-left: 4px;">Unsubscribe</a>
        </div>
        <img src="${openPixelUrl}" width="1" height="1" alt="" style="display:none !important;" />
      `;
    }

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
   * Bulk schedules a batch campaign of leads with sender rotation, A/B testing & suppression list
   */
  public async scheduleBatchCampaign(userId: string, campaignData: ExtendedScheduleCampaignDTO) {
    if (!emailQueue) {
      initQueue();
    }

    const defaultSenderEmail = campaignData.senderEmail || env.DEFAULT_SENDER_EMAIL;
    const defaultSenderName = campaignData.senderName || env.DEFAULT_SENDER_NAME;
    const delayBetweenSec = campaignData.delayBetweenEmailsSec ?? 2;
    const delayBetweenMs = delayBetweenSec * 1000;
    const hourlyLimit = campaignData.hourlyLimit ?? env.MAX_EMAILS_PER_HOUR_PER_SENDER;

    // 1. Suppression List Check (Skip unsubscribed contacts)
    const unsubscribed = await prisma.unsubscribedContact.findMany({
      where: { userId },
      select: { email: true },
    });
    const suppressedSet = new Set(unsubscribed.map((u) => u.email.toLowerCase().trim()));
    const eligibleLeads = campaignData.leads.filter((l) => !suppressedSet.has(l.email.toLowerCase().trim()));

    if (eligibleLeads.length === 0) {
      throw new Error('All provided leads are in the suppression/unsubscribe list.');
    }

    // 2. Fetch Active Sender Accounts if Rotation Enabled
    const senderAccounts = await prisma.emailAccount.findMany({
      where: { userId, isActive: true },
    });
    const hasMultipleSenders = campaignData.rotateSenders && senderAccounts.length > 0;

    // 3. Parse start time
    const baseStartTime = campaignData.startTime ? new Date(campaignData.startTime) : new Date();
    const effectiveStartTime = baseStartTime.getTime() < Date.now() ? new Date() : baseStartTime;

    // 4. Create Campaign in Database
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name: campaignData.subject.slice(0, 50) || 'Untitled Campaign',
        subject: campaignData.subject,
        body: campaignData.body,
        subjectB: campaignData.subjectB || null,
        bodyB: campaignData.bodyB || null,
        isABTest: Boolean(campaignData.isABTest && campaignData.subjectB),
        includeUnsubscribe: campaignData.includeUnsubscribe !== false,
        rotateSenders: Boolean(campaignData.rotateSenders),
        totalLeads: eligibleLeads.length,
        delayBetweenEmailsSec: delayBetweenSec,
        hourlyLimit,
        startTime: effectiveStartTime,
        status: 'SCHEDULED',
      },
    });

    // 5. Prepare EmailJob records with staggered timestamps, A/B variants, and sender rotation
    const emailJobDataList = eligibleLeads.map((lead, index) => {
      const scheduledTimestamp = effectiveStartTime.getTime() + index * delayBetweenMs;
      const scheduledAt = new Date(scheduledTimestamp);

      // A/B Variant Assignment (50/50 split)
      const isVariantB = campaignData.isABTest && campaignData.subjectB && index % 2 === 1;
      const variant = campaignData.isABTest ? (isVariantB ? 'B' : 'A') : null;
      const chosenSubject = isVariantB && campaignData.subjectB ? campaignData.subjectB : campaignData.subject;
      const chosenBody = isVariantB && campaignData.bodyB ? campaignData.bodyB : campaignData.body;

      // Sender Rotation (Round-Robin)
      const assignedSender = hasMultipleSenders
        ? senderAccounts[index % senderAccounts.length]
        : null;
      const senderEmail = assignedSender ? assignedSender.emailAddress : defaultSenderEmail;
      const senderName = assignedSender ? assignedSender.senderName : defaultSenderName;
      const senderId = assignedSender ? assignedSender.id : null;

      return {
        campaignId: campaign.id,
        userId,
        senderId,
        senderEmail,
        recipientEmail: lead.email.toLowerCase().trim(),
        recipientName: lead.name || null,
        subject: chosenSubject,
        body: chosenBody,
        variant,
        scheduledAt,
        status: 'SCHEDULED',
      };
    });

    // 6. Batch insert into Database
    const createdJobs = await prisma.$transaction(
      emailJobDataList.map((job) => prisma.emailJob.create({ data: job }))
    );

    // 7. Enqueue BullMQ delayed jobs and index into Elasticsearch
    for (let i = 0; i < createdJobs.length; i++) {
      const dbJob = createdJobs[i];

      await this.scheduleSingleJob(
        {
          ...dbJob,
          senderName: defaultSenderName,
        },
        hourlyLimit,
        delayBetweenMs,
        campaignData.includeUnsubscribe !== false
      );

      // Index in Elasticsearch
      await elasticsearchService.indexEmail(dbJob);
    }

    return {
      campaignId: campaign.id,
      totalScheduled: createdJobs.length,
      suppressedCount: campaignData.leads.length - eligibleLeads.length,
      startTime: effectiveStartTime,
      staggerDelaySeconds: delayBetweenSec,
      isABTest: campaign.isABTest,
      rotateSenders: campaign.rotateSenders,
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
