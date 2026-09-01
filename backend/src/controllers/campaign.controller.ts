import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { queueService } from '../services/queue.service';
import { prisma } from '../prisma/client';

export const scheduleCampaignSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
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

      console.log(`[Campaign] User ${userId} scheduling campaign with ${validatedData.leads.length} leads`);

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
   * Get all campaigns for current user with statistics
   */
  public async getCampaigns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const campaigns = await prisma.campaign.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { emailJobs: true },
          },
        },
      });

      res.status(200).json({
        success: true,
        campaigns,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve campaigns',
        error: error.message,
      });
    }
  }
}

export const campaignController = new CampaignController();
