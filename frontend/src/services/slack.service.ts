import api from './api';

export const slackService = {
  async getInstallUrl(): Promise<string> {
    const res = await api.get('/slack/install');
    return res.data.url;
  },

  async saveWebhook(webhookUrl: string, channelName?: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/slack/webhook', { webhookUrl, channelName });
    return res.data;
  },

  async disconnect(): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/slack/disconnect');
    return res.data;
  },

  async sendTestAlert(): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/slack/test');
    return res.data;
  },
};
