// Admin API Routes for Dashboard
// File: src/routes/admin.js

const express = require('express');

const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandlers');
const {
  findAllUsers,
  findUserByWhatsAppNumber,
  updateUserProfile,
  deleteUser,
  getProfileCompletionStats,
} = require('../models/User');
const EnhancedMemoryService = require('../services/enhancedMemoryService');
const UserMemoryService = require('../services/userMemoryService');
const { logError } = require('../middleware/logging');
const { getDatabase } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

// Authentication disabled for development
// Uncomment the following to enable authentication:
/*
const adminAuth = (req, res, next) => {
    const adminToken = req.headers['x-admin-token'];
    const validToken = process.env.ADMIN_TOKEN || 'your-secure-admin-token';
    
    if (adminToken !== validToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

router.use(adminAuth);
*/

// Dashboard statistics
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    try {
      const users = await findAllUsers();
      const totalUsers = users.length;
      const verifiedUsers = users.filter((u) => u.basicProfile?.emailVerified).length;
      const completedProfiles = users.filter((u) => u.enhancedProfile?.completed).length;

      // Calculate engagement metrics
      const activeUsers = users.filter((u) => {
        const lastActive = u.lastActive || u.updatedAt;
        const daysSinceActive = (Date.now() - new Date(lastActive)) / (1000 * 60 * 60 * 24);
        return daysSinceActive <= 7;
      }).length;

      // Profile completion breakdown
      const profileStats = await getProfileCompletionStats();

      res.json({
        overview: {
          totalUsers,
          verifiedUsers,
          completedProfiles,
          activeUsers,
          verificationRate: `${((verifiedUsers / totalUsers) * 100).toFixed(1)}%`,
          completionRate: `${((completedProfiles / totalUsers) * 100).toFixed(1)}%`,
        },
        profileCompletion: profileStats,
        growth: {
          daily: await getDailyGrowth(),
          weekly: await getWeeklyGrowth(),
        },
      });
    } catch (error) {
      logError(error, { operation: 'admin_stats' });
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  })
);

// User management endpoints
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    try {
      const { page = 1, limit = 20, search, filter } = req.query;
      const users = await findAllUsers();

      let filteredUsers = users;

      // Apply search
      if (search) {
        filteredUsers = filteredUsers.filter(
          (user) =>
            user.basicProfile?.name?.toLowerCase().includes(search.toLowerCase()) ||
            user.basicProfile?.email?.toLowerCase().includes(search.toLowerCase()) ||
            user.whatsappNumber?.includes(search)
        );
      }

      // Apply filters
      if (filter === 'completed') {
        filteredUsers = filteredUsers.filter((u) => u.enhancedProfile?.completed);
      } else if (filter === 'incomplete') {
        filteredUsers = filteredUsers.filter((u) => !u.enhancedProfile?.completed);
      } else if (filter === 'verified') {
        filteredUsers = filteredUsers.filter((u) => u.basicProfile?.emailVerified);
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

      // Add completion percentage to each user
      const usersWithStats = paginatedUsers.map((user) => ({
        ...user.toObject(),
        completionPercentage: calculateCompletionPercentage(user),
        lastActiveFormatted: formatLastActive(user.lastActive || user.updatedAt),
      }));

      res.json({
        users: usersWithStats,
        pagination: {
          total: filteredUsers.length,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(filteredUsers.length / limit),
        },
      });
    } catch (error) {
      logError(error, { operation: 'admin_users_list' });
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  })
);

// Get single user details
router.get(
  '/users/:whatsappNumber',
  asyncHandler(async (req, res) => {
    try {
      const { whatsappNumber } = req.params;
      const user = await findUserByWhatsAppNumber(whatsappNumber);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's session data
      const sessionData = await EnhancedMemoryService.loadSession(whatsappNumber);
      const memoryData = await UserMemoryService.loadUserMemory(whatsappNumber);
      const analytics = await EnhancedMemoryService.getUserAnalytics(whatsappNumber);

      res.json({
        user: {
          ...user.toObject(),
          completionPercentage: calculateCompletionPercentage(user),
        },
        session: sessionData,
        memory: memoryData,
        analytics,
      });
    } catch (error) {
      logError(error, {
        operation: 'admin_user_details',
        whatsappNumber: req.params.whatsappNumber,
      });
      res.status(500).json({ error: 'Failed to fetch user details' });
    }
  })
);

// Update user profile
router.put(
  '/users/:whatsappNumber',
  asyncHandler(async (req, res) => {
    try {
      const { whatsappNumber } = req.params;
      const updates = req.body;

      const user = await findUserByWhatsAppNumber(whatsappNumber);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update fields
      for (const [key, value] of Object.entries(updates)) {
        if (key !== '_id' && key !== 'whatsappNumber') {
          await updateUserProfile(whatsappNumber, key, value);
        }
      }

      const updatedUser = await findUserByWhatsAppNumber(whatsappNumber);
      res.json({
        success: true,
        user: updatedUser,
      });
    } catch (error) {
      logError(error, {
        operation: 'admin_user_update',
        whatsappNumber: req.params.whatsappNumber,
      });
      res.status(500).json({ error: 'Failed to update user' });
    }
  })
);

// Delete user
router.delete(
  '/users/:whatsappNumber',
  asyncHandler(async (req, res) => {
    try {
      const { whatsappNumber } = req.params;

      // Delete user from database
      await deleteUser(whatsappNumber);

      // Delete session files
      const sessionDir = path.join(
        __dirname,
        '../../data/sessions/memory',
        whatsappNumber.replace(/[^\d]/g, '')
      );
      try {
        await fs.rmdir(sessionDir, { recursive: true });
      } catch (err) {
        console.log('Session directory not found or already deleted');
      }

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      logError(error, {
        operation: 'admin_user_delete',
        whatsappNumber: req.params.whatsappNumber,
      });
      res.status(500).json({ error: 'Failed to delete user' });
    }
  })
);

// Session management endpoints
router.get(
  '/sessions',
  asyncHandler(async (req, res) => {
    try {
      const sessionDir = path.join(__dirname, '../../data/sessions/memory');
      const userDirs = await fs.readdir(sessionDir);

      const sessions = [];
      for (const dir of userDirs) {
        try {
          const sessionPath = path.join(sessionDir, dir, 'enhanced_session.json');
          const sessionData = JSON.parse(await fs.readFile(sessionPath, 'utf8'));

          sessions.push({
            userId: sessionData.userId,
            sessionId: sessionData.sessionId,
            startedAt: sessionData.startedAt,
            lastActivity: sessionData.lastActivity,
            totalInteractions: sessionData.conversationFlow.length,
            totalSearches: sessionData.behaviorMetrics.totalSearches,
            engagementLevel: EnhancedMemoryService.calculateEngagementLevel(sessionData),
          });
        } catch (err) {
          // Skip if session file doesn't exist
        }
      }

      // Sort by last activity
      sessions.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

      res.json({ sessions });
    } catch (error) {
      logError(error, { operation: 'admin_sessions_list' });
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  })
);

// Get conversation history
router.get(
  '/conversations/:whatsappNumber',
  asyncHandler(async (req, res) => {
    try {
      const { whatsappNumber } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const memoryData = await UserMemoryService.loadUserMemory(whatsappNumber);
      const sessionData = await EnhancedMemoryService.loadSession(whatsappNumber);

      const conversations = memoryData?.conversations || [];
      const enhancedConversations = sessionData?.conversationFlow || [];

      // Merge both sources
      const allConversations = [
        ...conversations,
        ...enhancedConversations.filter(
          (ec) => !conversations.find((c) => c.timestamp === ec.timestamp)
        ),
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const paginatedConversations = allConversations.slice(offset, offset + limit);

      res.json({
        conversations: paginatedConversations,
        total: allConversations.length,
        hasMore: offset + limit < allConversations.length,
      });
    } catch (error) {
      logError(error, {
        operation: 'admin_conversations',
        whatsappNumber: req.params.whatsappNumber,
      });
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  })
);

// Search analytics - Get real search data from queries collection
router.get(
  '/analytics/searches',
  asyncHandler(async (req, res) => {
    try {
      const db = getDatabase();

      // Get search queries from queries collection
      const searchQueries = await db
        .collection('queries')
        .find({
          queryType: { $in: ['search', 'alumni_search'] },
          query: { $exists: true, $ne: null },
        })
        .sort({ timestamp: -1 })
        .limit(1000)
        .toArray();

      // Count search terms
      const searchCounts = {};
      const searchCategories = {
        Technical: [],
        Business: [],
        Location: [],
        Skills: [],
        Other: [],
      };

      searchQueries.forEach((queryLog) => {
        const query = queryLog.query?.toLowerCase() || '';

        // Skip profile field inputs
        if (query.includes('@') || query.includes('http') || query.length < 3) {
          return;
        }

        searchCounts[query] = (searchCounts[query] || 0) + 1;

        // Categorize searches
        if (
          query.includes('developer') ||
          query.includes('engineer') ||
          query.includes('tech') ||
          query.includes('programming')
        ) {
          searchCategories.Technical.push(query);
        } else if (
          query.includes('marketing') ||
          query.includes('sales') ||
          query.includes('business') ||
          query.includes('finance')
        ) {
          searchCategories.Business.push(query);
        } else if (
          query.includes('mumbai') ||
          query.includes('delhi') ||
          query.includes('bangalore') ||
          query.includes('pune')
        ) {
          searchCategories.Location.push(query);
        } else if (
          query.includes('skill') ||
          query.includes('expert') ||
          query.includes('mentor')
        ) {
          searchCategories.Skills.push(query);
        } else {
          searchCategories.Other.push(query);
        }
      });

      // Get top searches
      const sortedSearches = Object.entries(searchCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20);

      // Get search trends (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const dailySearches = await db
        .collection('queries')
        .aggregate([
          {
            $match: {
              queryType: { $in: ['search', 'alumni_search'] },
              timestamp: { $gte: sevenDaysAgo },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      res.json({
        topSearches: sortedSearches.map(([term, count]) => ({ term, count })),
        totalUniqueSearches: Object.keys(searchCounts).length,
        totalSearches: searchQueries.length,
        searchCategories: Object.entries(searchCategories).map(([category, searches]) => ({
          category,
          count: new Set(searches).size,
        })),
        dailyTrend: dailySearches,
      });
    } catch (error) {
      logError(error, { operation: 'admin_search_analytics' });
      res.status(500).json({ error: 'Failed to fetch search analytics' });
    }
  })
);

// Helper functions
function calculateCompletionPercentage(user) {
  const requiredFields = 13; // Total required fields
  let completedFields = 0;

  if (user.enhancedProfile) {
    const profile = user.enhancedProfile;
    if (profile.fullName) completedFields++;
    if (profile.gender) completedFields++;
    if (profile.professionalRole) completedFields++;
    if (profile.dateOfBirth) completedFields++;
    if (profile.country) completedFields++;
    if (profile.address) completedFields++;
    if (profile.phone) completedFields++;
    if (profile.linkedin) completedFields++;
    if (profile.domain) completedFields++;
    if (profile.yatraImpact?.length > 0) completedFields++;
    if (profile.communityAsks?.length > 0) completedFields++;
    if (profile.communityGives?.length > 0) completedFields++;
    if (profile.additionalEmail !== undefined) completedFields++;
  }

  return Math.round((completedFields / requiredFields) * 100);
}

function formatLastActive(date) {
  if (!date) return 'Never';

  const now = new Date();
  const then = new Date(date);
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;

  return then.toLocaleDateString();
}

async function getDailyGrowth() {
  // Implement daily growth calculation
  return { new: 5, active: 12 };
}

async function getWeeklyGrowth() {
  // Implement weekly growth calculation
  return { new: 35, active: 89 };
}

module.exports = router;
