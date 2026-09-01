export interface EmailLead {
  email: string;
  name?: string;
}

export interface EmailJobData {
  jobId: string;
  campaignId?: string;
  userId: string;
  senderId?: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  scheduledAt: string; // ISO string
  hourlyLimit: number;
  delayBetweenEmailsMs: number;
  retryCount?: number;
}

export interface ScheduleCampaignDTO {
  subject: string;
  body: string;
  senderEmail?: string;
  senderName?: string;
  leads: EmailLead[];
  startTime?: string; // ISO string
  delayBetweenEmailsSec?: number;
  hourlyLimit?: number;
}

export interface UserJWTPayload {
  id: string;
  email: string;
  name: string;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  maxLimit: number;
  resetTimeMs: number;
  windowKey: string;
}

export interface SlackOAuthPayload {
  ok: boolean;
  access_token?: string;
  token_type?: string;
  scope?: string;
  bot_user_id?: string;
  app_id?: string;
  team?: {
    name: string;
    id: string;
  };
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
  error?: string;
}
