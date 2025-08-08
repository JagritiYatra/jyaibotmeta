import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/admin';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Request interceptor for auth and logging
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error.response?.data || error.message);
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Advanced Analytics APIs
export const analyticsAPI = {
  // Real-time metrics
  getRealtimeMetrics: () => api.get('/analytics/realtime'),
  
  // User analytics
  getUserGrowth: (timeframe: string) => 
    api.get('/analytics/user-growth', { params: { timeframe } }),
  
  getUserEngagement: (timeframe: string) => 
    api.get('/analytics/user-engagement', { params: { timeframe } }),
  
  getUserRetention: (cohort?: string) => 
    api.get('/analytics/user-retention', { params: { cohort } }),
  
  // Geographic analytics
  getGeographicDistribution: () => api.get('/analytics/geographic'),
  
  getLocationHeatmap: (metric: string) => 
    api.get('/analytics/location-heatmap', { params: { metric } }),
  
  // Professional analytics
  getProfessionalDomains: () => api.get('/analytics/professional-domains'),
  
  getSkillsDistribution: () => api.get('/analytics/skills'),
  
  getNetworkGraph: (userId?: string) => 
    api.get('/analytics/network-graph', { params: { userId } }),
  
  // WhatsApp analytics
  getMessageVolume: (timeframe: string) => 
    api.get('/analytics/message-volume', { params: { timeframe } }),
  
  getConversationMetrics: () => api.get('/analytics/conversation-metrics'),
  
  getResponseTimes: () => api.get('/analytics/response-times'),
  
  // AI performance metrics
  getAIPerformance: () => api.get('/analytics/ai-performance'),
  
  getIntentAccuracy: () => api.get('/analytics/intent-accuracy'),
  
  getSearchRelevance: () => api.get('/analytics/search-relevance'),
  
  // Query analytics
  getPopularQueries: (limit?: number) => 
    api.get('/analytics/popular-queries', { params: { limit } }),
  
  getQueryPatterns: () => api.get('/analytics/query-patterns'),
  
  getSearchInsights: () => api.get('/analytics/search-insights'),
  
  // System analytics
  getSystemHealth: () => api.get('/analytics/system-health'),
  
  getAPIUsage: () => api.get('/analytics/api-usage'),
  
  getErrorRates: () => api.get('/analytics/error-rates'),
  
  getDatabaseMetrics: () => api.get('/analytics/database-metrics'),
  
  // Predictive analytics
  getUserChurn: () => api.get('/analytics/user-churn-prediction'),
  
  getGrowthForecast: () => api.get('/analytics/growth-forecast'),
  
  getEngagementPrediction: () => api.get('/analytics/engagement-prediction'),
};

// Enhanced User Management APIs
export const userAPI = {
  // Advanced search with filters
  searchUsers: (params: {
    query?: string;
    filters?: Record<string, any>;
    sort?: string;
    page?: number;
    limit?: number;
  }) => api.post('/users/search', params),
  
  // Bulk operations
  bulkUpdate: (userIds: string[], updates: any) => 
    api.post('/users/bulk-update', { userIds, updates }),
  
  bulkDelete: (userIds: string[]) => 
    api.post('/users/bulk-delete', { userIds }),
  
  // User insights
  getUserInsights: (userId: string) => 
    api.get(`/users/${userId}/insights`),
  
  getUserActivity: (userId: string, timeframe?: string) => 
    api.get(`/users/${userId}/activity`, { params: { timeframe } }),
  
  getUserConnections: (userId: string) => 
    api.get(`/users/${userId}/connections`),
  
  // Profile completion
  getIncompleteProfiles: () => api.get('/users/incomplete-profiles'),
  
  sendProfileReminder: (userId: string) => 
    api.post(`/users/${userId}/send-reminder`),
};

// Session Management APIs
export const sessionAPI = {
  getActiveSessions: () => api.get('/sessions'),
  
  getSessionHistory: (params?: { 
    userId?: string; 
    timeframe?: string;
    limit?: number;
  }) => api.get('/sessions', { params }),
  
  getSessionDetails: (sessionId: string) => 
    api.get(`/sessions/${sessionId}`),
  
  terminateSession: (sessionId: string) => 
    api.delete(`/sessions/${sessionId}`),
  
  getSessionAnalytics: () => api.get('/sessions'),
};

// Conversation APIs
export const conversationAPI = {
  getConversations: (params?: {
    userId?: string;
    status?: string;
    timeframe?: string;
    limit?: number;
  }) => api.get('/conversations', { params }),
  
  getConversationDetails: (conversationId: string) => 
    api.get(`/conversations/${conversationId}`),
  
  searchConversations: (query: string) => 
    api.get('/conversations/search', { params: { query } }),
  
  getConversationSentiment: (conversationId: string) => 
    api.get(`/conversations/${conversationId}/sentiment`),
  
  exportConversations: (params?: any) => 
    api.get('/conversations/export', { 
      params, 
      responseType: 'blob' 
    }),
};

// Export and Report APIs
export const exportAPI = {
  exportUsers: (format: 'csv' | 'xlsx' | 'json', filters?: any) => 
    api.post('/export/users', { format, filters }, { responseType: 'blob' }),
  
  exportAnalytics: (type: string, format: string, params?: any) => 
    api.post('/export/analytics', { type, format, params }, { responseType: 'blob' }),
  
  generateReport: (reportType: string, params?: any) => 
    api.post('/export/report', { reportType, params }, { responseType: 'blob' }),
  
  scheduleReport: (schedule: any) => 
    api.post('/export/schedule', schedule),
  
  getScheduledReports: () => 
    api.get('/export/scheduled'),
};

// System Configuration APIs
export const systemAPI = {
  getConfig: () => api.get('/system/config'),
  
  updateConfig: (config: any) => 
    api.put('/system/config', config),
  
  getFeatureFlags: () => api.get('/system/feature-flags'),
  
  updateFeatureFlag: (flag: string, enabled: boolean) => 
    api.put(`/system/feature-flags/${flag}`, { enabled }),
  
  getIntegrations: () => api.get('/system/integrations'),
  
  testIntegration: (integration: string) => 
    api.post(`/system/integrations/${integration}/test`),
  
  getLogs: (params?: { 
    level?: string; 
    service?: string; 
    timeframe?: string;
    limit?: number;
  }) => api.get('/system/logs', { params }),
  
  clearCache: (cacheType?: string) => 
    api.post('/system/cache/clear', { cacheType }),
};

// Notification APIs
export const notificationAPI = {
  getNotifications: (params?: { 
    status?: string; 
    priority?: string;
    limit?: number;
  }) => api.get('/notifications', { params }),
  
  markAsRead: (notificationId: string) => 
    api.put(`/notifications/${notificationId}/read`),
  
  markAllAsRead: () => 
    api.put('/notifications/read-all'),
  
  deleteNotification: (notificationId: string) => 
    api.delete(`/notifications/${notificationId}`),
  
  getNotificationSettings: () => 
    api.get('/notifications/settings'),
  
  updateNotificationSettings: (settings: any) => 
    api.put('/notifications/settings', settings),
};

// Dashboard Customization APIs
export const dashboardAPI = {
  getLayout: () => api.get('/dashboard/layout'),
  
  saveLayout: (layout: any) => 
    api.put('/dashboard/layout', layout),
  
  getWidgets: () => api.get('/dashboard/widgets'),
  
  addWidget: (widget: any) => 
    api.post('/dashboard/widgets', widget),
  
  updateWidget: (widgetId: string, updates: any) => 
    api.put(`/dashboard/widgets/${widgetId}`, updates),
  
  deleteWidget: (widgetId: string) => 
    api.delete(`/dashboard/widgets/${widgetId}`),
  
  getPresets: () => api.get('/dashboard/presets'),
  
  applyPreset: (presetId: string) => 
    api.post(`/dashboard/presets/${presetId}/apply`),
};

export default api;