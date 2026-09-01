import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../prisma/client';
import { elasticsearchService } from '../services/elasticsearch.service';
import { queueService } from '../services/queue.service';

export class EmailController {
  /**
   * Get scheduled emails list
   */
  public async getScheduledEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '50', 10);
      const search = (req.query.search as string || '').trim();

      const result = await elasticsearchService.searchEmails({
        query: search,
        userId,
        status: 'SCHEDULED',
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch scheduled emails',
        error: error.message,
      });
    }
  }

  /**
   * Get sent emails list (including preview URLs)
   */
  public async getSentEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '50', 10);
      const search = (req.query.search as string || '').trim();

      const result = await elasticsearchService.searchEmails({
        query: search,
        userId,
        status: 'SENT',
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sent emails',
        error: error.message,
      });
    }
  }

  /**
   * Universal search across all emails via Elasticsearch
   */
  public async searchEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const query = (req.query.q as string || '').trim();
      const status = req.query.status as string || 'ALL';
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '50', 10);

      const result = await elasticsearchService.searchEmails({
        query,
        userId,
        status,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Search query failed',
        error: error.message,
      });
    }
  }

  /**
   * Summary stats for the dashboard header
   */
  public async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const [totalCount, scheduledCount, sentCount, rescheduledCount, failedCount] = await Promise.all([
        prisma.emailJob.count({ where: { userId } }),
        prisma.emailJob.count({ where: { userId, status: 'SCHEDULED' } }),
        prisma.emailJob.count({ where: { userId, status: 'SENT' } }),
        prisma.emailJob.count({ where: { userId, status: 'RESCHEDULED' } }),
        prisma.emailJob.count({ where: { userId, status: 'FAILED' } }),
      ]);

      res.status(200).json({
        success: true,
        stats: {
          total: totalCount,
          scheduled: scheduledCount + rescheduledCount,
          sent: sentCount,
          rescheduled: rescheduledCount,
          failed: failedCount,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve stats',
        error: error.message,
      });
    }
  }

  /**
   * Retry all failed email jobs
   */
  public async retryFailed(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const retriedCount = await queueService.retryFailedJobs(userId);

      res.status(200).json({
        success: true,
        message: `Successfully requeued ${retriedCount} failed emails for delivery.`,
        retriedCount,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to retry failed emails',
        error: error.message,
      });
    }
  }

  /**
   * Export emails to CSV format
   */
  public async exportCsv(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const status = req.query.status as string;

      const where: any = { userId };
      if (status && status !== 'ALL') {
        where.status = status;
      }

      const emails = await prisma.emailJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      // Format as CSV
      const headers = ['ID', 'Recipient Email', 'Recipient Name', 'Subject', 'Sender Email', 'Status', 'Scheduled At', 'Sent At', 'Ethereal Preview URL'];
      const rows = emails.map((e) => [
        e.id,
        `"${e.recipientEmail}"`,
        `"${e.recipientName || ''}"`,
        `"${e.subject.replace(/"/g, '""')}"`,
        `"${e.senderEmail}"`,
        e.status,
        e.scheduledAt.toISOString(),
        e.sentAt ? e.sentAt.toISOString() : '',
        `"${e.etherealPreviewUrl || ''}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="reachinbox_emails_${Date.now()}.csv"`);
      res.status(200).send(csvContent);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate CSV export',
        error: error.message,
      });
    }
  }

  /**
   * Delete / Cancel an email job
   */
  public async deleteJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await prisma.emailJob.deleteMany({
        where: { id, userId },
      });

      res.status(200).json({
        success: true,
        message: 'Email job cancelled and deleted.',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete email job',
        error: error.message,
      });
    }
  }
}

export const emailController = new EmailController();
