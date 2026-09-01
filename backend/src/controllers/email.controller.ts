import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../prisma/client';
import { elasticsearchService } from '../services/elasticsearch.service';

export class EmailController {
  /**
   * Get scheduled emails list
   */
  public async getScheduledEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
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
      const limit = parseInt(req.query.limit as string || '20', 10);
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
      const limit = parseInt(req.query.limit as string || '20', 10);

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
}

export const emailController = new EmailController();
