import api from './api';
import { User } from '../types';

export const authService = {
  async googleLogin(payload: {
    credential?: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }): Promise<{ user: User; token: string }> {
    const res = await api.post('/auth/google', payload);
    if (res.data.token) {
      localStorage.setItem('reachinbox_jwt_token', res.data.token);
      localStorage.setItem('reachinbox_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async getMe(): Promise<User> {
    const res = await api.get('/auth/me');
    if (res.data.user) {
      localStorage.setItem('reachinbox_user', JSON.stringify(res.data.user));
    }
    return res.data.user;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('reachinbox_jwt_token');
      localStorage.removeItem('reachinbox_user');
    }
  },

  getStoredUser(): User | null {
    const userJson = localStorage.getItem('reachinbox_user');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  },

  getStoredToken(): string | null {
    return localStorage.getItem('reachinbox_jwt_token');
  },
};
