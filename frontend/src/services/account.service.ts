import api from './api';
import { EmailAccount } from '../types';

export const accountService = {
  async getAccounts(): Promise<EmailAccount[]> {
    const res = await api.get('/accounts');
    return res.data.accounts || [];
  },

  async createAccount(data: {
    emailAddress: string;
    senderName: string;
    hourlyLimit: number;
    isDefault?: boolean;
  }): Promise<{ success: boolean; message: string; account: EmailAccount }> {
    const res = await api.post('/accounts', data);
    return res.data;
  },

  async updateAccount(
    id: string,
    data: { senderName?: string; hourlyLimit?: number; isDefault?: boolean; isActive?: boolean }
  ): Promise<{ success: boolean; message: string; account: EmailAccount }> {
    const res = await api.put(`/accounts/${id}`, data);
    return res.data;
  },

  async deleteAccount(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/accounts/${id}`);
    return res.data;
  },
};
