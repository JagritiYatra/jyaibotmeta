// Type definitions for the admin dashboard

export interface User {
  _id: string;
  whatsappNumber: string;
  basicProfile?: {
    name: string;
    email: string;
    emailVerified: boolean;
  };
  enhancedProfile?: {
    fullName: string;
    gender: string;
    professionalRole: string;
    dateOfBirth: string;
    country: string;
    address: string;
    phone: string;
    linkedin?: string;
    instagram?: string;
    additionalEmail?: boolean;
    domain: string;
    yatraImpact: string[];
    communityAsks: string[];
    communityGives: string[];
    completed: boolean;
  };
  searchCount: number;
  totalInteractions: number;
  lastActive: string;
  createdAt: string;
  updatedAt: string;
  completionPercentage?: number;
  lastActiveFormatted?: string;
}

export interface Session {
  sessionId: string;
  userId: string;
  startedAt: string;
  lastActivity: string;
  totalInteractions: number;
  totalSearches: number;
  engagementLevel: string;
  conversationFlow?: Conversation[];
  currentContext?: {
    topic: string | null;
    searchQuery: string | null;
    followUpCount: number;
  };
}

export interface Conversation {
  id: string;
  timestamp: string;
  userMessage: string;
  botResponse: string;
  context: {
    intent: string;
    isFollowUp?: boolean;
    searchQuery?: string;
    topic?: string;
  };
}

export interface DashboardStats {
  overview: {
    totalUsers: number;
    verifiedUsers: number;
    completedProfiles: number;
    activeUsers: number;
    verificationRate: string;
    completionRate: string;
  };
  profileCompletion: any;
  growth: {
    daily: { new: number; active: number };
    weekly: { new: number; active: number };
  };
}

export interface SearchAnalytics {
  topSearches: Array<{ term: string; count: number }>;
  totalUniqueSearches: number;
  totalSearches: number;
  searchCategories: Array<{ category: string; count: number }>;
  dailyTrend: Array<{ _id: string; count: number }>;
}

export interface UserAnalytics {
  sessionId: string;
  startedAt: string;
  totalInteractions: number;
  totalSearches: number;
  followUpRate: string;
  averageSessionLength: string;
  topInterests: any;
  searchPatterns: any[];
  engagementLevel: string;
}

export interface UserBehaviorAnalytics {
  totalQueries: number;
  uniqueUsers: number;
  totalSessions: number;
  avgSessionDuration: number;
  queryTypeBreakdown: Record<string, number>;
  topUsersByActivity: Array<{
    whatsappNumber: string;
    totalQueries: number;
    lastActivity: string;
  }>;
  hourlyDistribution: Array<{
    hour: number;
    count: number;
  }>;
  engagementMetrics: {
    activeUsers: number;
    returningUsers: number;
    newUsers: number;
  };
}

export interface SystemMetrics {
  responseTime: {
    avg: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  apiCalls: {
    total: number;
    successful: number;
    failed: number;
  };
  databaseMetrics: {
    connections: number;
    queries: number;
    avgQueryTime: number;
  };
}