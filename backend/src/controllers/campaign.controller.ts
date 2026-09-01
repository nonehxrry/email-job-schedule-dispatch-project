import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { queueService } from '../services/queue.service';
import { prisma } from '../prisma/client';

export const scheduleCampaignSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  subjectB: z.string().optional(),
  bodyB: z.string().optional(),
  isABTest: z.boolean().optional(),
  includeUnsubscribe: z.boolean().optional(),
  rotateSenders: z.boolean().optional(),
  senderEmail: z.string().email().optional(),
  senderName: z.string().optional(),
  leads: z
    .array(
      z.object({
        email: z.string().email('Invalid email in lead list'),
        name: z.string().optional(),
      })
    )
    .min(1, 'At least one lead email is required'),
  startTime: z.string().optional(),
  delayBetweenEmailsSec: z.number().min(0).max(3600).default(2),
  hourlyLimit: z.number().min(1).max(10000).default(50),
});

export class CampaignController {
  /**
   * Schedule a new batch email campaign
   */
  public async scheduleCampaign(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const validatedData = scheduleCampaignSchema.parse(req.body);

      console.log(`[Campaign] User ${userId} scheduling campaign with ${validatedData.leads.length} leads (A/B: ${validatedData.isABTest}, Rotation: ${validatedData.rotateSenders})`);

      const result = await queueService.scheduleBatchCampaign(userId, validatedData);

      res.status(201).json({
        success: true,
        message: `Successfully scheduled campaign with ${result.totalScheduled} emails.`,
        data: result,
      });
    } catch (error: any) {
      console.error('[Campaign] Error scheduling campaign:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule campaign',
        error: error.message,
      });
    }
  }

  /**
   * Get all campaigns for current user with statistics & progress
   */
  public async getCampaigns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const campaigns = await prisma.campaign.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          emailJobs: {
            select: {
              status: true,
              openCount: true,
              clickCount: true,
              variant: true,
            },
          },
        },
      });

      const formatted = campaigns.map((c) => {
        const total = c.emailJobs.length;
        const sent = c.emailJobs.filter((j) => j.status === 'SENT').length;
        const scheduled = c.emailJobs.filter((j) => j.status === 'SCHEDULED' || j.status === 'RESCHEDULED').length;
        const opened = c.emailJobs.filter((j) => j.openCount > 0).length;
        const clicked = c.emailJobs.filter((j) => j.clickCount > 0).length;

        return {
          id: c.id,
          name: c.name,
          subject: c.subject,
          subjectB: c.subjectB,
          isABTest: c.isABTest,
          totalLeads: c.totalLeads,
          status: c.status,
          startTime: c.startTime,
          createdAt: c.createdAt,
          stats: {
            total,
            sent,
            scheduled,
            opened,
            clicked,
            openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
            clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
            progress: total > 0 ? Math.round((sent / total) * 100) : 0,
          },
        };
      });

      res.status(200).json({
        success: true,
        campaigns: formatted,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve campaigns',
        error: error.message,
      });
    }
  }

  /**
   * Delete / Cancel entire campaign and its pending jobs
   */
  public async deleteCampaign(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await prisma.emailJob.deleteMany({
        where: { campaignId: id, userId, status: { in: ['SCHEDULED', 'RESCHEDULED'] } },
      });

      await prisma.campaign.deleteMany({
        where: { id, userId },
      });

      res.status(200).json({
        success: true,
        message: 'Campaign deleted and pending jobs cancelled.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to delete campaign', error: error.message });
    }
  }
}

export const campaignController = new CampaignController();
