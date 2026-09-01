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
  isActive?: boolean;
  _count?: {
    emailJobs: number;
  };
}

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  subject: string;
  body: string;
  subjectB?: string;
  bodyB?: string;
  isABTest?: boolean;
  totalLeads: number;
  delayBetweenEmailsSec: number;
  hourlyLimit: number;
  startTime: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'COMPLETED' | 'PAUSED';
  createdAt: string;
  stats?: {
    total: number;
    sent: number;
    scheduled: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
    progress: number;
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
  variant?: 'A' | 'B' | null;
  scheduledAt: string;
  sentAt?: string;
  status: 'SCHEDULED' | 'SENDING' | 'SENT' | 'RESCHEDULED' | 'FAILED';
  bullmqJobId?: string;
  etherealPreviewUrl?: string;
  errorMessage?: string;
  retryCount: number;
  rescheduledCount: number;

  // Real-world tracking metrics
  openedAt?: string;
  openCount: number;
  clickedAt?: string;
  clickCount: number;
  unsubscribedAt?: string;

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
  subjectB?: string;
  bodyB?: string;
  isABTest?: boolean;
  includeUnsubscribe?: boolean;
  rotateSenders?: boolean;
  senderEmail?: string;
  senderName?: string;
  leads: LeadItem[];
  startTime?: string;
  delayBetweenEmailsSec: number;
  hourlyLimit: number;
}
