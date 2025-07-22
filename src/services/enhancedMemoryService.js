// Enhanced Memory Service with Context-Aware Follow-up Capabilities
// File: src/services/enhancedMemoryService.js

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logError } = require('../middleware/logging');

// Configuration
const MEMORY_BASE_PATH = path.join(__dirname, '../../sessions/memory');
const MAX_MEMORY_ENTRIES = 200;
const CONTEXT_WINDOW = 10; // Number of recent messages to consider for context

class EnhancedMemoryService {
  // Initialize user session memory
  static async initializeSession(whatsappNumber) {
    const sessionId = uuidv4();
    const userDir = path.join(MEMORY_BASE_PATH, whatsappNumber.replace(/[^\d]/g, ''));

    try {
      await fs.mkdir(userDir, { recursive: true });

      const session = {
        sessionId,
        userId: whatsappNumber,
        startedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        conversationFlow: [],
        currentContext: {
          topic: null,
          searchQuery: null,
          searchResults: [],
          followUpCount: 0,
          relatedQueries: [],
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
          averageSessionLength: 0,
          topicsExplored: {},
        },
        aiMemory: {
          userPreferences: {},
          communicationStyle: null,
          interests: [],
          learnings: [],
        },
      };

      await this.saveSession(whatsappNumber, session);
      return session;
    } catch (error) {
      logError(error, { operation: 'initializeSession', whatsappNumber });
      throw error;
    }
  }

  // Get session file path
  static getSessionFilePath(whatsappNumber) {
    const sanitizedNumber = whatsappNumber.replace(/[^\d]/g, '');
    return path.join(MEMORY_BASE_PATH, sanitizedNumber, 'enhanced_session.json');
  }

  // Load or create session
  static async loadSession(whatsappNumber) {
    try {
      const filePath = this.getSessionFilePath(whatsappNumber);
      const fileContent = await fs.readFile(filePath, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return await this.initializeSession(whatsappNumber);
      }
      logError(error, { operation: 'loadSession', whatsappNumber });
      return null;
    }
  }

  // Save session
  static async saveSession(whatsappNumber, session) {
    try {
      const filePath = this.getSessionFilePath(whatsappNumber);
      session.lastActivity = new Date().toISOString();
      await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf8');
      return true;
    } catch (error) {
      logError(error, { operation: 'saveSession', whatsappNumber });
      return false;
    }
  }

  // Add conversation with enhanced context tracking
  static async addConversation(whatsappNumber, userMessage, botResponse, context = {}) {
    try {
      const session = await this.loadSession(whatsappNumber);
      if (!session) return null;

      const conversation = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        userMessage,
        botResponse,
        context: {
          intent: context.intent || 'unknown',
          isFollowUp: false,
          relatedTo: null,
          searchQuery: context.searchQuery || null,
          searchResults: context.searchResults || [],
          profilesShown: context.profilesShown || [],
        },
      };

      // Detect follow-up patterns
      const followUpInfo = await this.detectFollowUp(session, userMessage, context);
      if (followUpInfo.isFollowUp) {
        conversation.context.isFollowUp = true;
        conversation.context.relatedTo = followUpInfo.relatedTo;
        session.currentContext.followUpCount++;
      }

      // Update conversation flow
      session.conversationFlow.push(conversation);

      // Maintain max entries
      if (session.conversationFlow.length > MAX_MEMORY_ENTRIES) {
        session.conversationFlow = session.conversationFlow.slice(-MAX_MEMORY_ENTRIES);
      }

      // Update current context
      if (context.intent === 'search' && context.searchQuery) {
        session.currentContext.topic = context.searchQuery;
        session.currentContext.searchQuery = context.searchQuery;
        session.currentContext.searchResults = context.searchResults || [];

        // Add to search history
        session.searchHistory.push({
          query: context.searchQuery,
          timestamp: new Date().toISOString(),
          resultsCount: (context.searchResults || []).length,
          followedBy: [],
        });

        // Track search interests
        this.extractInterests(session, context.searchQuery);
      }

      // Update behavior metrics
      session.behaviorMetrics.totalSearches += context.intent === 'search' ? 1 : 0;
      session.behaviorMetrics.followUpSearches += followUpInfo.isFollowUp ? 1 : 0;

      await this.saveSession(whatsappNumber, session);
      return { session, conversation, followUpInfo };
    } catch (error) {
      logError(error, { operation: 'addConversation', whatsappNumber });
      return null;
    }
  }

  // Detect if message is a follow-up
  static async detectFollowUp(session, userMessage, context) {
    const recentConversations = session.conversationFlow.slice(-5);
    const lastSearch = session.currentContext.searchQuery;
    const messageLower = userMessage.toLowerCase();

    // Follow-up indicators
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
      'additionally',
      'besides',
      'what about',
      'how about',
      'show more',
      'next',
      'different',
    ];

    // Check for follow-up patterns
    const hasFollowUpPhrase = followUpPhrases.some((phrase) => messageLower.includes(phrase));
    const referencesLastTopic = lastSearch && this.isRelatedToTopic(messageLower, lastSearch);
    const shortMessage = userMessage.length < 30;

    if ((hasFollowUpPhrase || (shortMessage && referencesLastTopic)) && lastSearch) {
      // Find the most recent search conversation
      const lastSearchConv = recentConversations
        .reverse()
        .find((conv) => conv.context.intent === 'search');

      return {
        isFollowUp: true,
        relatedTo: lastSearchConv ? lastSearchConv.id : null,
        previousQuery: lastSearch,
        type: hasFollowUpPhrase ? 'explicit' : 'implicit',
      };
    }

    return { isFollowUp: false };
  }

  // Check if message relates to a topic
  static isRelatedToTopic(message, topic) {
    const topicWords = topic.toLowerCase().split(/\s+/);
    const messageWords = message.split(/\s+/);

    // Check for word overlap
    const overlap = topicWords.filter((word) =>
      messageWords.some((msgWord) => msgWord.includes(word) || word.includes(msgWord))
    );

    return overlap.length > 0;
  }

  // Extract interests from search queries
  static extractInterests(session, query) {
    const queryLower = query.toLowerCase();

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

    // Location extraction (basic)
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

    // Update interests
    domains.forEach((domain) => {
      if (queryLower.includes(domain)) {
        session.profileInterests.domains[domain] =
          (session.profileInterests.domains[domain] || 0) + 1;
      }
    });

    skills.forEach((skill) => {
      if (queryLower.includes(skill)) {
        session.profileInterests.skills[skill] = (session.profileInterests.skills[skill] || 0) + 1;
      }
    });

    locations.forEach((location) => {
      if (queryLower.includes(location)) {
        session.profileInterests.locations[location] =
          (session.profileInterests.locations[location] || 0) + 1;
      }
    });
  }

  // Get context for generating responses
  static async getResponseContext(whatsappNumber) {
    try {
      const session = await this.loadSession(whatsappNumber);
      if (!session) return null;

      const recentConversations = session.conversationFlow.slice(-CONTEXT_WINDOW);
      const lastSearch = session.currentContext.searchQuery;
      const lastResults = session.currentContext.searchResults;

      // Analyze conversation flow
      const conversationSummary = this.summarizeConversations(recentConversations);

      // Get top interests
      const topInterests = this.getTopInterests(session.profileInterests);

      return {
        recentHistory: recentConversations,
        currentTopic: session.currentContext.topic,
        lastSearch,
        lastResults,
        followUpCount: session.currentContext.followUpCount,
        conversationSummary,
        userInterests: topInterests,
        searchHistory: session.searchHistory.slice(-5),
        behaviorMetrics: session.behaviorMetrics,
      };
    } catch (error) {
      logError(error, { operation: 'getResponseContext', whatsappNumber });
      return null;
    }
  }

  // Summarize recent conversations
  static summarizeConversations(conversations) {
    if (!conversations || conversations.length === 0) {
      return { topics: [], intents: [], mood: 'neutral' };
    }

    const topics = [];
    const intents = {};

    conversations.forEach((conv) => {
      // Track intents
      intents[conv.context.intent] = (intents[conv.context.intent] || 0) + 1;

      // Extract topics from search queries
      if (conv.context.searchQuery) {
        topics.push(conv.context.searchQuery);
      }
    });

    return {
      topics: [...new Set(topics)],
      intents: Object.entries(intents)
        .sort(([, a], [, b]) => b - a)
        .map(([intent, count]) => ({ intent, count })),
      conversationLength: conversations.length,
    };
  }

  // Get top interests
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

  // Generate follow-up suggestions
  static async generateFollowUpSuggestions(whatsappNumber) {
    try {
      const context = await this.getResponseContext(whatsappNumber);
      if (!context || !context.lastSearch) return [];

      const suggestions = [];

      // Based on last search
      if (context.lastSearch.includes('developer')) {
        suggestions.push(
          'senior developers in the same field',
          'developers with startup experience',
          'tech leads or architects'
        );
      } else if (context.lastSearch.includes('marketing')) {
        suggestions.push('digital marketing experts', 'brand strategists', 'growth hackers');
      } else if (context.lastSearch.includes('startup')) {
        suggestions.push('startup mentors', 'angel investors', 'co-founders looking for partners');
      }

      // Based on interests
      const topDomains = context.userInterests.domains || [];
      if (topDomains.length > 0) {
        suggestions.push(`more experts in ${topDomains[0].item}`);
      }

      return suggestions.slice(0, 3);
    } catch (error) {
      logError(error, { operation: 'generateFollowUpSuggestions', whatsappNumber });
      return [];
    }
  }

  // Get analytics for user behavior
  static async getUserAnalytics(whatsappNumber) {
    try {
      const session = await this.loadSession(whatsappNumber);
      if (!session) return null;

      const sessionDuration = new Date() - new Date(session.startedAt);
      const avgSessionLength = sessionDuration / (session.behaviorMetrics.totalSearches || 1);

      return {
        sessionId: session.sessionId,
        startedAt: session.startedAt,
        totalInteractions: session.conversationFlow.length,
        totalSearches: session.behaviorMetrics.totalSearches,
        followUpRate:
          session.behaviorMetrics.totalSearches > 0
            ? `${(
                (session.behaviorMetrics.followUpSearches / session.behaviorMetrics.totalSearches) *
                100
              ).toFixed(2)}%`
            : '0%',
        averageSessionLength: `${Math.round(avgSessionLength / 1000 / 60)} minutes`,
        topInterests: this.getTopInterests(session.profileInterests),
        searchPatterns: session.searchHistory.slice(-10),
        engagementLevel: this.calculateEngagementLevel(session),
      };
    } catch (error) {
      logError(error, { operation: 'getUserAnalytics', whatsappNumber });
      return null;
    }
  }

  // Calculate user engagement level
  static calculateEngagementLevel(session) {
    const metrics = session.behaviorMetrics;
    const score =
      metrics.totalSearches * 10 +
      metrics.followUpSearches * 20 +
      session.conversationFlow.length * 2;

    if (score > 200) return 'highly_engaged';
    if (score > 100) return 'engaged';
    if (score > 50) return 'moderate';
    return 'new_user';
  }

  // Export session for analysis
  static async exportSession(whatsappNumber) {
    try {
      const session = await this.loadSession(whatsappNumber);
      const analytics = await this.getUserAnalytics(whatsappNumber);
      const context = await this.getResponseContext(whatsappNumber);

      return {
        exportedAt: new Date().toISOString(),
        session,
        analytics,
        context,
        recommendations: await this.generateFollowUpSuggestions(whatsappNumber),
      };
    } catch (error) {
      logError(error, { operation: 'exportSession', whatsappNumber });
      return null;
    }
  }
}

module.exports = EnhancedMemoryService;
