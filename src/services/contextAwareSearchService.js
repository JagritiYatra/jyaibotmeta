// Context-Aware Search Service with Follow-up Capabilities
// File: src/services/contextAwareSearchService.js

const { comprehensiveAlumniSearch } = require('./searchService');
const EnhancedMemoryService = require('./enhancedMemoryService');
const { logError } = require('../middleware/logging');

class ContextAwareSearchService {
  // Process search with context awareness
  static async processContextualSearch(whatsappNumber, userMessage, intent) {
    try {
      // Get conversation context
      const context = await EnhancedMemoryService.getResponseContext(whatsappNumber);

      // Check if this is a follow-up query
      const isFollowUp = await this.isFollowUpQuery(userMessage, context);

      let searchQuery = intent.query || userMessage;
      let searchContext = {
        isFollowUp: false,
        previousQuery: null,
        refinements: [],
        excludeProfiles: [],
      };

      if (isFollowUp) {
        // Process as follow-up search
        const followUpData = await this.processFollowUpSearch(userMessage, context, whatsappNumber);

        searchQuery = followUpData.enhancedQuery;
        searchContext = followUpData.context;
      }

      // Perform the search
      const searchResults = await comprehensiveAlumniSearch(searchQuery, whatsappNumber);

      // Process and enhance results based on context
      const enhancedResults = await this.enhanceSearchResults(
        searchResults,
        searchContext,
        context
      );

      // Track the search in memory
      await EnhancedMemoryService.addConversation(whatsappNumber, userMessage, enhancedResults, {
        intent: 'search',
        searchQuery,
        searchResults: this.extractProfileIds(searchResults),
        isFollowUp: searchContext.isFollowUp,
      });

      return enhancedResults;
    } catch (error) {
      logError(error, { operation: 'processContextualSearch', whatsappNumber });
      return this.getErrorResponse();
    }
  }

  // Check if query is a follow-up
  static async isFollowUpQuery(message, context) {
    if (!context || !context.lastSearch) return false;

    const messageLower = message.toLowerCase();
    const followUpIndicators = [
      'more',
      'another',
      'any more',
      'else',
      'other',
      'similar',
      'like this',
      'same kind',
      'also',
      'what about',
      'how about',
      'show me more',
      'different',
      'besides',
      'additional',
      'next',
    ];

    // Check for follow-up phrases
    const hasFollowUpPhrase = followUpIndicators.some((indicator) =>
      messageLower.includes(indicator)
    );

    // Check if message is very short (likely follow-up)
    const isShortQuery = message.split(' ').length <= 3;

    // Check recency of last search (within 5 minutes)
    const lastSearchTime = context.searchHistory.slice(-1)[0]?.timestamp;
    const timeSinceLastSearch = lastSearchTime
      ? (new Date() - new Date(lastSearchTime)) / 1000 / 60
      : Infinity;
    const isRecent = timeSinceLastSearch < 5;

    return (hasFollowUpPhrase || isShortQuery) && isRecent;
  }

  // Process follow-up search
  static async processFollowUpSearch(userMessage, context, whatsappNumber) {
    const { lastSearch } = context;
    const messageLower = userMessage.toLowerCase();

    let enhancedQuery = lastSearch;
    const refinements = [];
    const excludeProfiles = context.lastResults || [];

    // Analyze follow-up intent
    if (messageLower.includes('senior') || messageLower.includes('experienced')) {
      refinements.push('senior');
      enhancedQuery = `senior ${lastSearch}`;
    } else if (messageLower.includes('junior') || messageLower.includes('fresher')) {
      refinements.push('junior');
      enhancedQuery = `junior ${lastSearch}`;
    } else if (messageLower.includes('startup')) {
      refinements.push('startup');
      enhancedQuery = `${lastSearch} startup experience`;
    } else if (messageLower.includes('same city') || messageLower.includes('nearby')) {
      // Extract user's city from profile
      const userCity = await this.getUserCity(whatsappNumber);
      if (userCity) {
        refinements.push(`location:${userCity}`);
        enhancedQuery = `${lastSearch} in ${userCity}`;
      }
    } else if (messageLower.includes('different')) {
      // Show different results by excluding previous ones
      refinements.push('exclude_previous');
    } else {
      // Generic "more" request - show next set of results
      refinements.push('next_batch');
    }

    return {
      enhancedQuery,
      context: {
        isFollowUp: true,
        previousQuery: lastSearch,
        refinements,
        excludeProfiles,
        followUpType: refinements[0] || 'more',
      },
    };
  }

  // Enhance search results based on context
  static async enhanceSearchResults(searchResults, searchContext, userContext) {
    if (!searchResults || typeof searchResults !== 'string') {
      return searchResults;
    }

    let enhancedResponse = searchResults;

    // Add context-aware prefix for follow-ups
    if (searchContext.isFollowUp) {
      const prefixes = {
        senior: 'Here are more senior professionals based on your search:\n\n',
        junior: 'Here are junior/entry-level professionals:\n\n',
        startup: 'Here are professionals with startup experience:\n\n',
        exclude_previous: 'Here are different profiles from your last search:\n\n',
        next_batch: 'Here are more profiles matching your criteria:\n\n',
        default: 'Based on your previous search, here are additional profiles:\n\n',
      };

      const prefix = prefixes[searchContext.followUpType] || prefixes.default;
      enhancedResponse = prefix + searchResults;
    }

    // Add smart suggestions at the end
    const suggestions = await this.generateSmartSuggestions(searchContext, userContext);
    if (suggestions) {
      enhancedResponse += `\n\n${suggestions}`;
    }

    return enhancedResponse;
  }

  // Generate smart suggestions for next actions
  static async generateSmartSuggestions(searchContext, userContext) {
    const suggestions = [];

    // Remove all quick tips as requested by user

    return suggestions.length > 1 ? suggestions.join('\n') : null;
  }

  // Extract profile IDs from search results
  static extractProfileIds(searchResults) {
    if (!searchResults || typeof searchResults !== 'string') return [];

    // Extract profile IDs/names from the search results
    // This is a simple implementation - adjust based on actual format
    const profileMatches = searchResults.match(/Profile ID: ([^\n]+)/g) || [];
    return profileMatches.map((match) => match.replace('Profile ID: ', ''));
  }

  // Get user's city from profile
  static async getUserCity(whatsappNumber) {
    try {
      const { findUserByWhatsAppNumber } = require('../models/User');
      const user = await findUserByWhatsAppNumber(whatsappNumber);
      return user?.enhancedProfile?.address || user?.enhancedProfile?.city || null;
    } catch (error) {
      return null;
    }
  }

  // Generate contextual response for no results
  static async generateNoResultsResponse(searchQuery, context) {
    let response = `No exact matches found for "${searchQuery}".\n\n`;

    if (context && context.userInterests) {
      response += 'Based on your interests, you might want to search for:\n';

      const interests = context.userInterests;
      if (interests.domains && interests.domains.length > 0) {
        response += `• ${interests.domains[0].item} professionals\n`;
      }
      if (interests.skills && interests.skills.length > 0) {
        response += `• ${interests.skills[0].item}s in your area\n`;
      }

      response += '\nTry being more specific or using different keywords.';
    } else {
      response +=
        'Try:\n• Using different keywords\n• Being more specific\n• Searching by skills or location';
    }

    return response;
  }

  // Get error response
  static getErrorResponse() {
    return `⚠️ I'm having trouble with that search right now.

Please try:
• Simpler search terms
• Being more specific
• Searching again in a moment

Example: "web developers in Mumbai"`;
  }
}

module.exports = ContextAwareSearchService;
