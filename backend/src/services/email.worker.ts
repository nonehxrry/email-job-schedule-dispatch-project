import { Worker, Job } from 'bullmq';
import { redisClient } from '../config/redis.config';
import { EmailJobData } from '../types';
import { QUEUE_NAME, queueService } from './queue.service';
import { rateLimiterService } from './ratelimiter.service';
import { smtpService } from './smtp.service';
import { slackService } from './slack.service';
import { elasticsearchService } from './elasticsearch.service';
import { prisma } from '../prisma/client';
import { env } from '../config/env.config';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class EmailWorkerService {
  private worker: Worker<EmailJobData> | null = null;

  public initWorker(): Worker<EmailJobData> {
    if (this.worker) return this.worker;

    console.log(`[BullMQ Worker] Initializing email worker with concurrency: ${env.WORKER_CONCURRENCY}`);

    this.worker = new Worker<EmailJobData>(
      QUEUE_NAME,
      async (job: Job<EmailJobData>) => {
        const { data } = job;
        console.log(`[Worker] Processing Job ID ${data.jobId} for recipient: ${data.recipientEmail}`);

        // 1. Idempotency Check in Database
        const dbJob = await prisma.emailJob.findUnique({
          where: { id: data.jobId },
        });

        if (!dbJob) {
          console.warn(`[Worker] Job ${data.jobId} not found in database. Skipping.`);
          return { status: 'skipped', reason: 'not_found' };
        }

        if (dbJob.status === 'SENT') {
          console.log(`[Worker] Job ${data.jobId} was already SENT. Skipping to avoid duplicate.`);
          return { status: 'skipped', reason: 'already_sent' };
        }

        // 2. Hourly Rate Limit Check
        const rateLimitResult = await rateLimiterService.checkAndConsume(
          data.senderEmail,
          data.hourlyLimit || env.MAX_EMAILS_PER_HOUR_PER_SENDER
        );

        if (!rateLimitResult.allowed) {
          console.warn(
            `[RateLimit] Sender ${data.senderEmail} hit rate limit (${rateLimitResult.currentCount}/${data.hourlyLimit}). Rescheduling job ${data.jobId}.`
          );

          // Calculate start of next hour window (+ 2s buffer)
          const nextHourStart = new Date(rateLimitResult.resetTimeMs + 2000);

          // Update DB state to RESCHEDULED
          const updatedJob = await prisma.emailJob.update({
            where: { id: data.jobId },
            data: {
              status: 'RESCHEDULED',
              scheduledAt: nextHourStart,
              rescheduledCount: { increment: 1 },
            },
          });

          // Index in Elasticsearch
          await elasticsearchService.indexEmail(updatedJob);

          // Send real-time Slack alert
          await slackService.sendRateLimitAlert(
            data.userId,
            data.senderEmail,
            rateLimitResult.currentCount,
            data.hourlyLimit,
            nextHourStart
          );

          // Re-enqueue in BullMQ with calculated delay
          await queueService.scheduleSingleJob(
            {
              ...updatedJob,
              senderName: data.senderName,
            },
            data.hourlyLimit,
            data.delayBetweenEmailsMs
          );

          return {
            status: 'rescheduled',
            rescheduledTo: nextHourStart.toISOString(),
            reason: 'hourly_rate_limit_exceeded',
          };
        }

        // 3. Mark as SENDING in DB
        await prisma.emailJob.update({
          where: { id: data.jobId },
          data: { status: 'SENDING' },
        });

        // 4. Inter-email delay throttling (to mimic realistic provider throttling)
        const delayMs = data.delayBetweenEmailsMs || env.EMAIL_SEND_DELAY_MS;
        if (delayMs > 0) {
          await sleep(delayMs);
        }

        // 5. Dispatch via SMTP (Ethereal Email)
        try {
          const sendResult = await smtpService.sendEmail({
            to: data.recipientEmail,
            recipientName: data.recipientName,
            subject: data.subject,
            html: data.body,
            fromEmail: data.senderEmail,
            fromName: data.senderName,
          });

          // 6. Update Database to SENT
          const finishedJob = await prisma.emailJob.update({
            where: { id: data.jobId },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              etherealPreviewUrl: sendResult.etherealPreviewUrl,
              errorMessage: null,
            },
          });

          // 7. Update Elasticsearch index
          await elasticsearchService.indexEmail(finishedJob);

          console.log(`[Worker] Successfully sent email to ${data.recipientEmail}. Preview: ${sendResult.etherealPreviewUrl}`);

          return {
            status: 'sent',
            previewUrl: sendResult.etherealPreviewUrl,
          };
        } catch (smtpError: any) {
          console.error(`[Worker] Failed sending email to ${data.recipientEmail}: ${smtpError.message}`);

          const failedJob = await prisma.emailJob.update({
            where: { id: data.jobId },
            data: {
              status: 'FAILED',
              errorMessage: smtpError.message,
              retryCount: { increment: 1 },
            },
          });

          await elasticsearchService.indexEmail(failedJob);
          throw smtpError;
        }
      },
      {
        connection: redisClient as any,
        concurrency: env.WORKER_CONCURRENCY,
      }
    );

    this.worker.on('failed', (job, err) => {
      console.error(`[Worker] Job ${job?.id} encountered an error:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error('[Worker] Worker internal error:', err.message);
    });

    return this.worker;
  }

  public async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }
}

export const emailWorkerService = new EmailWorkerService();
