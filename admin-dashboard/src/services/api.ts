// API service for admin dashboard

import axios from 'axios';
import { User, Session, DashboardStats, SearchAnalytics, Conversation } from '../types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/admin';

// Create axios instance without auth header
const api = axios.create({
  baseURL: API_BASE
});

// Dashboard stats
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get('/stats');
  return response.data;
};

// User management
export const getUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  filter?: string;
}) => {
  const response = await api.get('/users', { params });
  return response.data;
};

export const getUserDetails = async (whatsappNumber: string) => {
  const response = await api.get(`/users/${whatsappNumber}`);
  return response.data;
};

export const updateUser = async (whatsappNumber: string, updates: Partial<User>) => {
  const response = await api.put(`/users/${whatsappNumber}`, updates);
  return response.data;
};

export const deleteUser = async (whatsappNumber: string) => {
  const response = await api.delete(`/users/${whatsappNumber}`);
  return response.data;
};

// Session management
export const getSessions = async () => {
  const response = await api.get('/sessions');
  return response.data;
};

// Conversations
export const getConversations = async (whatsappNumber: string, params?: {
  limit?: number;
  offset?: number;
}) => {
  const response = await api.get(`/conversations/${whatsappNumber}`, { params });
  return response.data;
};

// Analytics
export const getSearchAnalytics = async (): Promise<SearchAnalytics> => {
  const response = await api.get('/analytics/searches');
  return response.data;
};

export const getUserBehaviorAnalytics = async (timeframe: string = '24h') => {
  const response = await api.get('/analytics/user-behavior', { params: { timeframe } });
  return response.data;
};

export const getSystemMetrics = async (timeframe: string = '24h') => {
  const response = await api.get('/analytics/system-metrics', { params: { timeframe } });
  return response.data;
};

// Error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);