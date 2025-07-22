// MongoDB-based Memory Service with Context-Aware Capabilities
// Replaces file-based memory with database storage for better scalability

const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../config/database');
const { logError } = require('../middleware/logging');

const MAX_MEMORY_ENTRIES = 200;
const CONTEXT_WINDOW = 3; // Last 3 messages for context

class MongoMemoryService {
  // Initialize or get user memory session
  static async initializeSession(whatsappNumber) {
    try {
      const db = getDatabase();
      const existingSession = await db.collection('user_memory').findOne({ whatsappNumber });

      if (existingSession) {
        // Update last activity
        await db
          .collection('user_memory')
          .updateOne({ whatsappNumber }, { $set: { lastActivity: new Date() } });
        return existingSession;
      }

      // Create new session
      const session = {
        sessionId: uuidv4(),
        whatsappNumber,
        startedAt: new Date(),
        lastActivity: new Date(),
        conversationFlow: [],
        currentContext: {
          topic: null,
          lastSearch: null,
          searchResults: [],
          followUpCount: 0,
        },
        searchHistory: [],
        profileInterests: {
          domains: {},
          skills: {},
          locations: {},
          roles: {},
        },
        behaviorMetrics: {
          totalSearches: 0,
          followUpSearches: 0,
          profileViews: 0,
          casualChats: 0,
          jagritiQueries: 0,
          generalQuestions: 0,
        },
      };

      await db.collection('user_memory').insertOne(session);
      return session;
    } catch (error) {
      logError('Initialize memory session error:', error);
      return null;
    }
  }

  // Add conversation to memory
  static async addConversation(whatsappNumber, userMessage, botResponse, context = {}) {
    try {
      const db = getDatabase();

      const conversation = {
        id: uuidv4(),
        timestamp: new Date(),
        userMessage,
        botResponse,
        intent: context.intent || 'unknown',
        isFollowUp: context.isFollowUp || false,
        searchQuery: context.searchQuery || null,
      };

      // Update memory with new conversation
      const updateResult = await db.collection('user_memory').updateOne(
        { whatsappNumber },
        {
          $push: {
            conversationFlow: {
              $each: [conversation],
              $slice: -MAX_MEMORY_ENTRIES,
            },
          },
          $set: {
            lastActivity: new Date(),
            'currentContext.topic': context.topic || '$currentContext.topic',
            'currentContext.lastSearch': context.searchQuery || '$currentContext.lastSearch',
          },
          $inc: {
            'behaviorMetrics.totalSearches': context.intent === 'search' ? 1 : 0,
            'behaviorMetrics.followUpSearches': context.isFollowUp ? 1 : 0,
            'behaviorMetrics.casualChats': context.intent === 'casual_chat' ? 1 : 0,
            'behaviorMetrics.jagritiQueries': context.intent === 'jagriti_info' ? 1 : 0,
            'behaviorMetrics.generalQuestions': context.intent === 'general_knowledge' ? 1 : 0,
          },
        },
        { upsert: true }
      );

      // Track interests if it's a search
      if (context.intent === 'search' && context.searchQuery) {
        await this.trackInterests(whatsappNumber, context.searchQuery);
      }

      return { success: true, conversation };
    } catch (error) {
      logError('Add conversation error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get recent conversation context
  static async getRecentContext(whatsappNumber) {
    try {
      const db = getDatabase();
      const memory = await db.collection('user_memory').findOne({ whatsappNumber });

      if (!memory) {
        return {
          recentMessages: [],
          lastSearch: null,
          currentTopic: null,
          behaviorMetrics: {},
        };
      }

      const recentMessages = memory.conversationFlow.slice(-CONTEXT_WINDOW);

      return {
        recentMessages: recentMessages.map((c) => ({
          message: c.userMessage,
          intent: c.intent,
          timestamp: c.timestamp,
        })),
        lastSearch: memory.currentContext.lastSearch,
        currentTopic: memory.currentContext.topic,
        behaviorMetrics: memory.behaviorMetrics,
        interests: this.getTopInterests(memory.profileInterests),
      };
    } catch (error) {
      logError('Get recent context error:', error);
      return {
        recentMessages: [],
        lastSearch: null,
        currentTopic: null,
        behaviorMetrics: {},
      };
    }
  }

  // Track user interests from searches
  static async trackInterests(whatsappNumber, query) {
    try {
      const db = getDatabase();
      const queryLower = query.toLowerCase();

      const updates = {};

      // Domain keywords
      const domains = [
        'tech',
        'finance',
        'healthcare',
        'education',
        'marketing',
        'sales',
        'design',
        'engineering',
        'consulting',
        'startup',
      ];

      domains.forEach((domain) => {
        if (queryLower.includes(domain)) {
          updates[`profileInterests.domains.${domain}`] = 1;
        }
      });

      // Skill keywords
      const skills = [
        'developer',
        'designer',
        'manager',
        'analyst',
        'consultant',
        'engineer',
        'architect',
        'specialist',
        'expert',
        'lead',
      ];

      skills.forEach((skill) => {
        if (queryLower.includes(skill)) {
          updates[`profileInterests.skills.${skill}`] = 1;
        }
      });

      // Location extraction
      const locations = [
        'mumbai',
        'delhi',
        'bangalore',
        'pune',
        'hyderabad',
        'chennai',
        'kolkata',
        'ahmedabad',
        'noida',
        'gurgaon',
      ];

      locations.forEach((location) => {
        if (queryLower.includes(location)) {
          updates[`profileInterests.locations.${location}`] = 1;
        }
      });

      if (Object.keys(updates).length > 0) {
        await db.collection('user_memory').updateOne({ whatsappNumber }, { $inc: updates });
      }
    } catch (error) {
      logError('Track interests error:', error);
    }
  }

  // Get top interests from profile data
  static getTopInterests(interests) {
    const result = {};

    Object.entries(interests).forEach(([category, items]) => {
      const sorted = Object.entries(items)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([item, count]) => ({ item, count }));

      if (sorted.length > 0) {
        result[category] = sorted;
      }
    });

    return result;
  }

  // Check if message is a follow-up
  static async isFollowUp(whatsappNumber, message) {
    try {
      const context = await this.getRecentContext(whatsappNumber);

      if (!context.lastSearch) return false;

      const messageLower = message.toLowerCase();
      const followUpPhrases = [
        'any more',
        'more',
        'another',
        'other',
        'else',
        'similar',
        'like this',
        'same',
        'also',
        'from',
        'in',
        'anyone else',
      ];

      return followUpPhrases.some((phrase) => messageLower.includes(phrase));
    } catch (error) {
      logError('Check follow-up error:', error);
      return false;
    }
  }

  // Get user analytics
  static async getUserAnalytics(whatsappNumber) {
    try {
      const db = getDatabase();
      const memory = await db.collection('user_memory').findOne({ whatsappNumber });

      if (!memory) return null;

      const sessionDuration = new Date() - new Date(memory.startedAt);
      const totalInteractions = memory.conversationFlow.length;

      return {
        sessionId: memory.sessionId,
        startedAt: memory.startedAt,
        totalInteractions,
        behaviorMetrics: memory.behaviorMetrics,
        topInterests: this.getTopInterests(memory.profileInterests),
        averageResponseTime: `${Math.round(sessionDuration / totalInteractions / 1000)}s`,
        engagementLevel: this.calculateEngagementLevel(memory.behaviorMetrics, totalInteractions),
      };
    } catch (error) {
      logError('Get user analytics error:', error);
      return null;
    }
  }

  // Calculate engagement level
  static calculateEngagementLevel(metrics, totalInteractions) {
    const score =
      metrics.totalSearches * 10 +
      metrics.followUpSearches * 20 +
      metrics.profileViews * 5 +
      totalInteractions * 2;

    if (score > 200) return 'highly_engaged';
    if (score > 100) return 'engaged';
    if (score > 50) return 'moderate';
    return 'new_user';
  }

  // Clean up old sessions (run periodically)
  static async cleanupOldSessions(daysOld = 30) {
    try {
      const db = getDatabase();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await db.collection('user_memory').deleteMany({
        lastActivity: { $lt: cutoffDate },
      });

      return { deleted: result.deletedCount };
    } catch (error) {
      logError('Cleanup old sessions error:', error);
      return { deleted: 0, error: error.message };
    }
  }
}

module.exports = MongoMemoryService;
