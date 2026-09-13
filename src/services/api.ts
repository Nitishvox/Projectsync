import axios from 'axios';
import { Project, Task, DashboardStats } from '../types';

export type { Project, Task, DashboardStats };

const axiosClient = axios.create({
  baseURL: '/api',
});

// Add token interceptor if present
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  get: async (url: string) => {
    return axiosClient.get(url);
  },
  post: async (url: string, data?: any) => {
    return axiosClient.post(url, data);
  },
  put: async (url: string, data?: any) => {
    return axiosClient.put(url, data);
  },
  patch: async (url: string, data?: any) => {
    return axiosClient.patch(url, data);
  },
  delete: async (url: string) => {
    return axiosClient.delete(url);
  },
};

export default api;
