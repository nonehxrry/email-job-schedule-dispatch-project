import axios from 'axios';
import { env } from '../config/env.config';
import { redisClient } from '../config/redis.config';
import { prisma } from '../prisma/client';

export class SlackService {
  /**
   * Dispatches a formatted Slack message to a user or fallback webhook.
   */
  public async sendMessage(
    userId: string,
    message: { text: string; blocks?: any[]; attachments?: any[] }
  ): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      const webhookUrl = user?.slackWebhookUrl || env.SLACK_DEFAULT_WEBHOOK_URL;
      const accessToken = user?.slackAccessToken;

      if (!webhookUrl && !accessToken) {
        // User has not connected Slack; fail gracefully without throwing error
        console.log(`[Slack] No Slack webhook or token configured for user ${userId}. Skipping alert.`);
        return false;
      }

      if (webhookUrl) {
        // Dispatch via Incoming Webhook
        await axios.post(webhookUrl, {
          text: message.text,
          blocks: message.blocks,
          attachments: message.attachments,
        });
        console.log(`[Slack] Successfully posted message via webhook to Slack.`);
        return true;
      }

      if (accessToken && user?.slackChannel) {
        // Dispatch via Web API
        await axios.post(
          'https://slack.com/api/chat.postMessage',
          {
            channel: user.slackChannel,
            text: message.text,
            blocks: message.blocks,
            attachments: message.attachments,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log(`[Slack] Successfully posted message to channel ${user.slackChannel}.`);
        return true;
      }

      return false;
    } catch (error: any) {
      console.error(`[Slack] Error dispatching message:`, error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Sends a rate limit hit notification with Redis anti-spam debounce
   */
  public async sendRateLimitAlert(
    userId: string,
    senderEmail: string,
    currentCount: number,
    limitPerHour: number,
    rescheduledToTime: Date
  ): Promise<boolean> {
    const cooldownKey = `slack:alert:cooldown:${senderEmail.toLowerCase().trim()}`;

    // Check if we sent an alert for this sender in the last 60 seconds
    try {
      const isCoolingDown = await redisClient.get(cooldownKey);
      if (isCoolingDown) {
        console.log(`[Slack] Alert cooldown active for sender ${senderEmail}. Skipping duplicate notification.`);
        return false;
      }
      // Set 60s cooldown
      await redisClient.set(cooldownKey, '1', 'EX', 60);
    } catch (e) {
      // Ignore redis cache check failure
    }

    const formattedTime = rescheduledToTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
    const formattedDate = rescheduledToTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⚠️ Rate Limit Exceeded - Email Jobs Rescheduled',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Sender Account:*\n\`${senderEmail}\``,
          },
          {
            type: 'mrkdwn',
            text: `*Hourly Quota:*\n${limitPerHour} emails/hr`,
          },
          {
            type: 'mrkdwn',
            text: `*Attempted Dispatches:*\n*${currentCount}* in current window`,
          },
          {
            type: 'mrkdwn',
            text: `*Rescheduled Window:*\n*${formattedDate} at ${formattedTime}*`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `🔒 *ReachInbox Protection*: No emails were lost or dropped. Remaining jobs have been delayed to the next available hour window preserving original queue order.`,
          },
        ],
      },
    ];

    return this.sendMessage(userId, {
      text: `⚠️ Rate limit exceeded for ${senderEmail} (${currentCount}/${limitPerHour}). Overflow emails rescheduled to ${formattedDate} at ${formattedTime}.`,
      blocks,
    });
  }

  /**
   * Exchanges OAuth code for access token & incoming webhook from Slack
   */
  public async exchangeOAuthCode(code: string): Promise<any> {
    const params = new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: env.SLACK_REDIRECT_URI,
    });

    const response = await axios.post('https://slack.com/api/oauth.v2.access', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data;
  }
}

export const slackService = new SlackService();
