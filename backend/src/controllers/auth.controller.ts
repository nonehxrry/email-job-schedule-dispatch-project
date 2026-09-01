import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export class AuthController {
  /**
   * Google OAuth login handler
   * Supports both real Google ID token verification and dev mock credentials
   */
  public async googleLogin(req: Request, res: Response): Promise<void> {
    try {
      const { credential, email, name, avatarUrl } = req.body;

      let userEmail = email;
      let userName = name || 'Google User';
      let userAvatar = avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
      let googleId: string | undefined = undefined;

      // If a real Google credential JWT is provided and client ID is set, verify with Google Auth Library
      if (credential && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_ID !== 'mock_google_client_id_for_dev') {
        try {
          const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: env.GOOGLE_CLIENT_ID,
          });
          const payload = ticket.getPayload();
          if (payload) {
            userEmail = payload.email;
            userName = payload.name || userName;
            userAvatar = payload.picture || userAvatar;
            googleId = payload.sub;
          }
        } catch (e: any) {
          console.warn('[Auth] Google Token verification failed, falling back to payload data:', e.message);
        }
      }

      if (!userEmail) {
        res.status(400).json({ success: false, message: 'Email is required for login' });
        return;
      }

      // Upsert User in PostgreSQL
      const user = await prisma.user.upsert({
        where: { email: userEmail },
        update: {
          name: userName,
          avatarUrl: userAvatar,
          googleId: googleId || undefined,
        },
        create: {
          email: userEmail,
          name: userName,
          avatarUrl: userAvatar,
          googleId: googleId || undefined,
        },
      });

      // Also ensure a default EmailAccount is created for this user
      const existingAccount = await prisma.emailAccount.findFirst({
        where: { userId: user.id },
      });

      if (!existingAccount) {
        await prisma.emailAccount.create({
          data: {
            userId: user.id,
            emailAddress: user.email,
            senderName: user.name,
            hourlyLimit: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
            isDefault: true,
          },
        });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(200).json({
        success: true,
        message: 'Successfully authenticated',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          hasSlackConnected: Boolean(user.slackAccessToken || user.slackWebhookUrl),
          slackChannel: user.slackChannel,
          slackTeamName: user.slackTeamName,
        },
      });
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      res.status(500).json({ success: false, message: 'Failed to process login', error: error.message });
    }
  }

  /**
   * Get authenticated user profile & integration status
   */
  public async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          emailAccounts: true,
        },
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          hasSlackConnected: Boolean(user.slackAccessToken || user.slackWebhookUrl),
          slackChannel: user.slackChannel,
          slackTeamName: user.slackTeamName,
          emailAccounts: user.emailAccounts,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch user', error: error.message });
    }
  }

  /**
   * Logout
   */
  public async logout(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  }
}

export const authController = new AuthController();
