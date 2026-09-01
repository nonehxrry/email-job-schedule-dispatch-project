import api from './api';
import { Campaign, ScheduleFormData } from '../types';

export const campaignService = {
  async scheduleCampaign(data: ScheduleFormData): Promise<{ success: boolean; message: string; data: any }> {
    const res = await api.post('/campaigns/schedule', data);
    return res.data;
  },

  async getCampaigns(): Promise<Campaign[]> {
    const res = await api.get('/campaigns');
    return res.data.campaigns || [];
  },

  async deleteCampaign(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/campaigns/${id}`);
    return res.data;
  },
};
