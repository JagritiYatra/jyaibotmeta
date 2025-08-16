// User Memory Service - Unique conversation memory for each user
// File: src/services/userMemoryService.js

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logError } = require('../middleware/logging');

// Configuration
const MEMORY_BASE_PATH = path.join(__dirname, '../../data/sessions/memory');
const MAX_MEMORY_ENTRIES = 100;
const MEMORY_FILE_EXTENSION = '.json';

class UserMemoryService {
  // Initialize memory directory for user
  static async initializeUserMemory(whatsappNumber) {
    const userDir = path.join(MEMORY_BASE_PATH, whatsappNumber.replace(/[^\d]/g, ''));
    try {
      await fs.mkdir(userDir, { recursive: true });
      return userDir;
    } catch (error) {
      logError(error, { operation: 'initializeUserMemory', whatsappNumber });
      throw error;
    }
  }

  // Get memory file path
  static getMemoryFilePath(whatsappNumber) {
    const sanitizedNumber = whatsappNumber.replace(/[^\d]/g, '');
    return path.join(MEMORY_BASE_PATH, sanitizedNumber, `memory${MEMORY_FILE_EXTENSION}`);
  }

  // Load user memory
  static async loadUserMemory(whatsappNumber) {
    try {
      const filePath = this.getMemoryFilePath(whatsappNumber);
      const fileContent = await fs.readFile(filePath, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Create new memory if doesn't exist
        return await this.createNewMemory(whatsappNumber);
      }
      logError(error, { operation: 'loadUserMemory', whatsappNumber });
      return null;
    }
  }

  // Create new memory structure
  static async createNewMemory(whatsappNumber) {
    const newMemory = {
      userId: whatsappNumber,
      memoryId: uuidv4(),
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      conversations: [],
      topics: {},
      preferences: {
        communicationStyle: null,
        interests: [],
        searchPatterns: [],
      },
      insights: {
        totalInteractions: 0,
        averageMessageLength: 0,
        mostActiveTime: null,
        frequentQueries: [],
        profileCompletionJourney: [],
      },
      relationships: {
        searchedProfiles: [],
        interestedIn: [],
        connectionsMade: [],
      },
    };

    await this.saveUserMemory(whatsappNumber, newMemory);
    return newMemory;
  }

  // Save user memory
  static async saveUserMemory(whatsappNumber, memoryData) {
    try {
      await this.initializeUserMemory(whatsappNumber);
      const filePath = this.getMemoryFilePath(whatsappNumber);

      memoryData.lastUpdated = new Date().toISOString();

      await fs.writeFile(filePath, JSON.stringify(memoryData, null, 2), 'utf8');
      return true;
    } catch (error) {
      logError(error, { operation: 'saveUserMemory', whatsappNumber });
      return false;
    }
  }

  // Add conversation entry
  static async addConversation(whatsappNumber, userMessage, botResponse, context = {}) {
    try {
      const memory = await this.loadUserMemory(whatsappNumber);
      if (!memory) return null;

      const conversation = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        userMessage,
        botResponse,
        context: {
          intent: context.intent || 'unknown',
          topic: context.topic || null,
          sessionState: context.sessionState || null,
          fieldBeingUpdated: context.fieldBeingUpdated || null,
        },
      };

      memory.conversations.push(conversation);

      // Trim if too many entries
      if (memory.conversations.length > MAX_MEMORY_ENTRIES) {
        memory.conversations = memory.conversations.slice(-MAX_MEMORY_ENTRIES);
      }

      // Update insights
      memory.insights.totalInteractions++;

      // Track topics
      if (context.topic) {
        memory.topics[context.topic] = (memory.topics[context.topic] || 0) + 1;
      }

      await this.saveUserMemory(whatsappNumber, memory);
      return memory;
    } catch (error) {
      logError(error, { operation: 'addConversation', whatsappNumber });
      return null;
    }
  }

  // Get conversation context
  static async getConversationContext(whatsappNumber, limit = 5) {
    try {
      const memory = await this.loadUserMemory(whatsappNumber);
      if (!memory) return null;

      const recentConversations = memory.conversations.slice(-limit);

      return {
        recentHistory: recentConversations,
        topics: memory.topics,
        preferences: memory.preferences,
        lastInteraction: memory.lastUpdated,
      };
    } catch (error) {
      logError(error, { operation: 'getConversationContext', whatsappNumber });
      return null;
    }
  }

  // Track search behavior
  static async trackSearchBehavior(whatsappNumber, searchQuery, results) {
    try {
      const memory = await this.loadUserMemory(whatsappNumber);
      if (!memory) return null;

      // Add to search patterns
      if (!memory.preferences.searchPatterns.includes(searchQuery)) {
        memory.preferences.searchPatterns.push(searchQuery);

        // Keep last 20 unique searches
        if (memory.preferences.searchPatterns.length > 20) {
          memory.preferences.searchPatterns.shift();
        }
      }

      // Track searched profiles
      if (results && results.length > 0) {
        results.forEach((profile) => {
          if (!memory.relationships.searchedProfiles.find((p) => p.id === profile.id)) {
            memory.relationships.searchedProfiles.push({
              id: profile.id,
              name: profile.name,
              searchedAt: new Date().toISOString(),
              searchQuery,
            });
          }
        });
      }

      await this.saveUserMemory(whatsappNumber, memory);
      return memory;
    } catch (error) {
      logError(error, { operation: 'trackSearchBehavior', whatsappNumber });
      return null;
    }
  }

  // Track profile completion journey
  static async trackProfileUpdate(whatsappNumber, fieldName, value, attempts) {
    try {
      const memory = await this.loadUserMemory(whatsappNumber);
      if (!memory) return null;

      memory.insights.profileCompletionJourney.push({
        timestamp: new Date().toISOString(),
        field: fieldName,
        attempts,
        completed: true,
      });

      await this.saveUserMemory(whatsappNumber, memory);
      return memory;
    } catch (error) {
      logError(error, { operation: 'trackProfileUpdate', whatsappNumber });
      return null;
    }
  }

  // Get user insights
  static async getUserInsights(whatsappNumber) {
    try {
      const memory = await this.loadUserMemory(whatsappNumber);
      if (!memory) return null;

      // Calculate additional insights
      const topTopics = Object.entries(memory.topics)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([topic, count]) => ({ topic, count }));

      const avgMessageLength =
        memory.conversations.length > 0
          ? memory.conversations.reduce((sum, conv) => sum + conv.userMessage.length, 0) /
            memory.conversations.length
          : 0;

      return {
        totalInteractions: memory.insights.totalInteractions,
        topTopics,
        averageMessageLength: Math.round(avgMessageLength),
        searchPatterns: memory.preferences.searchPatterns,
        profilesSearched: memory.relationships.searchedProfiles.length,
        profileCompletionSteps: memory.insights.profileCompletionJourney.length,
        memberSince: memory.createdAt,
        lastActive: memory.lastUpdated,
      };
    } catch (error) {
      logError(error, { operation: 'getUserInsights', whatsappNumber });
      return null;
    }
  }

  // Analyze conversation patterns
  static async analyzeUserBehavior(whatsappNumber) {
    try {
      const memory = await this.loadUserMemory(whatsappNumber);
      if (!memory || memory.conversations.length < 5) {
        return { needsMoreData: true };
      }

      // Analyze message patterns
      const messageTimings = memory.conversations.map((c) => new Date(c.timestamp).getHours());
      const mostActiveHour = this.getMostFrequent(messageTimings);

      // Analyze intents
      const intents = memory.conversations
        .map((c) => c.context.intent)
        .filter((i) => i !== 'unknown');
      const primaryIntent = this.getMostFrequent(intents);

      // Communication style
      const avgLength =
        memory.conversations.reduce((sum, c) => sum + c.userMessage.length, 0) /
        memory.conversations.length;
      const communicationStyle =
        avgLength < 50 ? 'concise' : avgLength < 150 ? 'moderate' : 'detailed';

      return {
        mostActiveHour,
        primaryIntent,
        communicationStyle,
        engagementLevel:
          memory.insights.totalInteractions > 50
            ? 'high'
            : memory.insights.totalInteractions > 20
              ? 'medium'
              : 'low',
        interests: Object.keys(memory.topics).slice(0, 5),
      };
    } catch (error) {
      logError(error, { operation: 'analyzeUserBehavior', whatsappNumber });
      return null;
    }
  }

  // Helper function to get most frequent item
  static getMostFrequent(arr) {
    if (!arr || arr.length === 0) return null;

    const frequency = {};
    let maxFreq = 0;
    let mostFrequent = null;

    arr.forEach((item) => {
      frequency[item] = (frequency[item] || 0) + 1;
      if (frequency[item] > maxFreq) {
        maxFreq = frequency[item];
        mostFrequent = item;
      }
    });

    return mostFrequent;
  }

  // Export memory for analytics
  static async exportUserMemory(whatsappNumber) {
    try {
      const memory = await this.loadUserMemory(whatsappNumber);
      const insights = await this.getUserInsights(whatsappNumber);
      const behavior = await this.analyzeUserBehavior(whatsappNumber);

      return {
        userId: whatsappNumber,
        exportedAt: new Date().toISOString(),
        memory,
        insights,
        behavior,
      };
    } catch (error) {
      logError(error, { operation: 'exportUserMemory', whatsappNumber });
      return null;
    }
  }
}

module.exports = UserMemoryService;
