export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  hasSlackConnected: boolean;
  slackChannel?: string;
  slackTeamName?: string;
  emailAccounts?: EmailAccount[];
}

export interface EmailAccount {
  id: string;
  userId: string;
  emailAddress: string;
  senderName: string;
  hourlyLimit: number;
  isDefault: boolean;
}

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  subject: string;
  body: string;
  totalLeads: number;
  delayBetweenEmailsSec: number;
  hourlyLimit: number;
  startTime: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'COMPLETED' | 'PAUSED';
  createdAt: string;
  _count?: {
    emailJobs: number;
  };
}

export interface EmailJob {
  id: string;
  campaignId?: string;
  userId: string;
  senderEmail: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string;
  status: 'SCHEDULED' | 'SENDING' | 'SENT' | 'RESCHEDULED' | 'FAILED';
  bullmqJobId?: string;
  etherealPreviewUrl?: string;
  errorMessage?: string;
  retryCount: number;
  rescheduledCount: number;
  createdAt: string;
}

export interface EmailStats {
  total: number;
  scheduled: number;
  sent: number;
  rescheduled: number;
  failed: number;
}

export interface LeadItem {
  email: string;
  name?: string;
}

export interface ScheduleFormData {
  subject: string;
  body: string;
  senderEmail?: string;
  senderName?: string;
  leads: LeadItem[];
  startTime?: string;
  delayBetweenEmailsSec: number;
  hourlyLimit: number;
}
