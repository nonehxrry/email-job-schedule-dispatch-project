import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../prisma/client';
import { z } from 'zod';

const createAccountSchema = z.object({
  emailAddress: z.string().email('Invalid email address'),
  senderName: z.string().min(1, 'Sender name is required'),
  hourlyLimit: z.number().min(1).max(5000).default(50),
  isDefault: z.boolean().optional(),
});

export class AccountController {
  /**
   * List sender accounts for user
   */
  public async getAccounts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const accounts = await prisma.emailAccount.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        include: {
          _count: {
            select: { emailJobs: true },
          },
        },
      });

      res.status(200).json({
        success: true,
        accounts,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch sender accounts', error: error.message });
    }
  }

  /**
   * Create new sender account
   */
  public async createAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const data = createAccountSchema.parse(req.body);

      // If marked default, unset other defaults
      if (data.isDefault) {
        await prisma.emailAccount.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      const account = await prisma.emailAccount.create({
        data: {
          userId,
          emailAddress: data.emailAddress.toLowerCase().trim(),
          senderName: data.senderName,
          hourlyLimit: data.hourlyLimit,
          isDefault: Boolean(data.isDefault),
        },
      });

      res.status(201).json({
        success: true,
        message: 'Sender inbox connected successfully!',
        account,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to create sender account', error: error.message });
    }
  }

  /**
   * Update sender account
   */
  public async updateAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { senderName, hourlyLimit, isDefault, isActive } = req.body;

      if (isDefault) {
        await prisma.emailAccount.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      const account = await prisma.emailAccount.update({
        where: { id },
        data: {
          senderName,
          hourlyLimit: hourlyLimit ? Number(hourlyLimit) : undefined,
          isDefault,
          isActive,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Sender account updated',
        account,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to update sender account', error: error.message });
    }
  }

  /**
   * Delete sender account
   */
  public async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await prisma.emailAccount.deleteMany({
        where: { id, userId },
      });

      res.status(200).json({
        success: true,
        message: 'Sender account removed',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to delete sender account', error: error.message });
    }
  }
}

export const accountController = new AccountController();
