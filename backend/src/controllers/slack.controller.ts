import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { env } from '../config/env.config';
import { prisma } from '../prisma/client';
import { slackService } from '../services/slack.service';

export class SlackController {
  /**
   * Get Slack OAuth installation URL
   */
  public async getInstallUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    const scopes = 'chat:write,incoming-webhook';
    const state = req.user?.id || 'anonymous';

    const url = `https://slack.com/oauth/v2/authorize?client_id=${env.SLACK_CLIENT_ID}&scope=${encodeURIComponent(
      scopes
    )}&redirect_uri=${encodeURIComponent(env.SLACK_REDIRECT_URI)}&state=${state}`;

    res.status(200).json({
      success: true,
      url,
    });
  }

  /**
   * Slack OAuth callback handler
   */
  public async oauthCallback(req: Request, res: Response): Promise<void> {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string; // userId passed in state

      if (!code) {
        res.redirect(`${env.CLIENT_URL}?slack_error=no_code_provided`);
        return;
      }

      console.log(`[Slack OAuth] Exchanging code for user state: ${state}`);
      const oauthData = await slackService.exchangeOAuthCode(code);

      if (!oauthData.ok) {
        console.error('[Slack OAuth] Exchange failed:', oauthData.error);
        res.redirect(`${env.CLIENT_URL}?slack_error=${oauthData.error || 'oauth_failed'}`);
        return;
      }

      // Update user in DB
      if (state && state !== 'anonymous') {
        await prisma.user.update({
          where: { id: state },
          data: {
            slackAccessToken: oauthData.access_token || null,
            slackWebhookUrl: oauthData.incoming_webhook?.url || null,
            slackChannel: oauthData.incoming_webhook?.channel || null,
            slackTeamName: oauthData.team?.name || null,
          },
        });
      }

      res.redirect(`${env.CLIENT_URL}?slack_connected=true`);
    } catch (error: any) {
      console.error('[Slack OAuth] Callback exception:', error.message);
      res.redirect(`${env.CLIENT_URL}?slack_error=internal_error`);
    }
  }

  /**
   * Save Slack webhook URL directly (convenient for immediate testing)
   */
  public async saveWebhook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { webhookUrl, channelName } = req.body;

      if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/services/')) {
        res.status(400).json({
          success: false,
          message: 'Valid Slack webhook URL is required (must start with https://hooks.slack.com/services/)',
        });
        return;
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          slackWebhookUrl: webhookUrl,
          slackChannel: channelName || '#outreach-alerts',
          slackTeamName: 'Connected Workspace',
        },
      });

      res.status(200).json({
        success: true,
        message: 'Slack webhook successfully connected!',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to save Slack webhook',
        error: error.message,
      });
    }
  }

  /**
   * Disconnect Slack
   */
  public async disconnect(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      await prisma.user.update({
        where: { id: userId },
        data: {
          slackAccessToken: null,
          slackWebhookUrl: null,
          slackChannel: null,
          slackTeamName: null,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Slack integration disconnected successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect Slack',
        error: error.message,
      });
    }
  }

  /**
   * Send test alert to connected Slack channel
   */
  public async sendTestAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const sent = await slackService.sendRateLimitAlert(
        userId,
        req.user!.email,
        51,
        50,
        new Date(Date.now() + 3600 * 1000)
      );

      if (!sent) {
        res.status(400).json({
          success: false,
          message: 'Could not send test message. Please ensure Slack is connected or webhook is set.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Test alert successfully delivered to Slack!',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to send test alert',
        error: error.message,
      });
    }
  }
}

export const slackController = new SlackController();
