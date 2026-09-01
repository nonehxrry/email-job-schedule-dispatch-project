import api from './api';
import { EmailJob, EmailStats } from '../types';

export interface EmailListResponse {
  success: boolean;
  emails: EmailJob[];
  total: number;
  page: number;
  totalPages: number;
  source?: string;
}

export const emailService = {
  async getScheduledEmails(page = 1, limit = 20, search = ''): Promise<EmailListResponse> {
    const res = await api.get('/emails/scheduled', {
      params: { page, limit, search },
    });
    return res.data;
  },

  async getSentEmails(page = 1, limit = 20, search = ''): Promise<EmailListResponse> {
    const res = await api.get('/emails/sent', {
      params: { page, limit, search },
    });
    return res.data;
  },

  async searchEmails(query: string, status = 'ALL', page = 1, limit = 20): Promise<EmailListResponse> {
    const res = await api.get('/emails/search', {
      params: { q: query, status, page, limit },
    });
    return res.data;
  },

  async getStats(): Promise<EmailStats> {
    const res = await api.get('/emails/stats');
    return res.data.stats || { total: 0, scheduled: 0, sent: 0, rescheduled: 0, failed: 0 };
  },
};
