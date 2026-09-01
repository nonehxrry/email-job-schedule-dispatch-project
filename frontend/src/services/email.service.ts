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
  async getScheduledEmails(page = 1, limit = 50, search = ''): Promise<EmailListResponse> {
    const res = await api.get('/emails/scheduled', {
      params: { page, limit, search },
    });
    return res.data;
  },

  async getSentEmails(page = 1, limit = 50, search = ''): Promise<EmailListResponse> {
    const res = await api.get('/emails/sent', {
      params: { page, limit, search },
    });
    return res.data;
  },

  async searchEmails(query: string, status = 'ALL', page = 1, limit = 50): Promise<EmailListResponse> {
    const res = await api.get('/emails/search', {
      params: { q: query, status, page, limit },
    });
    return res.data;
  },

  async getStats(): Promise<EmailStats> {
    const res = await api.get('/emails/stats');
    return res.data.stats || { total: 0, scheduled: 0, sent: 0, rescheduled: 0, failed: 0 };
  },

  async retryFailed(): Promise<{ success: boolean; message: string; retriedCount: number }> {
    const res = await api.post('/emails/retry-failed');
    return res.data;
  },

  async deleteJob(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/emails/${id}`);
    return res.data;
  },

  downloadCsvExport(status?: string): void {
    const token = localStorage.getItem('reachinbox_jwt_token');
    const url = `/api/emails/export${status ? `?status=${status}` : ''}`;
    
    // Trigger browser download via fetch with auth header
    fetch(url, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `reachinbox_export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => console.error('Export download failed:', err));
  },
};
