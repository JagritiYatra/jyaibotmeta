// Simplified authenticated user controller - Profile via web form only
const {
  getIncompleteFields,
  findUserByWhatsAppNumber,
  getProfileCompletionPercentage,
} = require('../models/User');
const { comprehensiveAlumniSearch } = require('../services/searchService');
const enhancedSearchService = require('../services/enhancedSearchService');
const intelligentContextService = require('../services/intelligentContextService');
const { handleCasualConversation } = require('./conversationController');
const { logUserQuery } = require('../services/analyticsService');
const { generateProfileFormLink } = require('./profileFormController');
const JagritiYatraKnowledgeService = require('../services/jagritiYatraKnowledge');
const GeneralQuestionService = require('../services/generalQuestionService');
const UnifiedIntelligenceService = require('../services/unifiedIntelligenceService');

async function handleAuthenticatedUser(userMessage, intent, userSession, whatsappNumber) {
  try {
    // Get fresh user data
    const user = await findUserByWhatsAppNumber(whatsappNumber);
    if (!user) {
      console.error('User not found for WhatsApp number:', whatsappNumber);
      return 'User not found. Please ensure you are registered.';
    }
    
    const userName = user?.enhancedProfile?.fullName || user?.basicProfile?.name || 'there';
    const firstName = userName.split(' ')[0];
    
    // Check profile completion - trust the completed flag
    const enhancedProfile = user?.enhancedProfile || {};
    
    // Simple check - if the profile is marked as completed, trust it
    const isProfileComplete = enhancedProfile.completed === true;
    
    // Log for debugging
    console.log(`Profile check for ${whatsappNumber}: completed=${enhancedProfile.completed}, isProfileComplete=${isProfileComplete}`);
    
    // Log activity (with error handling)
    try {
      logUserQuery(whatsappNumber, userMessage, intent?.type || 'unknown');
    } catch (logError) {
      console.error('Error logging user query:', logError);
    }
    
    // PRIORITY 1: If profile incomplete, always send web form link
    if (!isProfileComplete) {
      const linkData = generateProfileFormLink(whatsappNumber);
      
      return `Hello! 👋

📋 *Complete Your Profile First*

Please complete your profile using our web form:

🔗 *Click here:* ${linkData?.url || 'https://jyaibot-profile-form.vercel.app/profile-setup'}

⏱️ This link expires in 15 minutes

The form includes all required fields with easy dropdowns for location selection.

Once you complete your profile, you can access all features!`;
    }
    
    // PRIORITY 2: Handle different intents for users with complete profiles
    
    // For simple greetings, provide a welcome message
    const lowerMessage = userMessage.toLowerCase();
    if (['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'].includes(lowerMessage.trim())) {
      return `Hello ${firstName}! 👋

Welcome back to JY Alumni Network. How can I help you today?

You can:
🔍 Search for alumni (e.g., "developers in Mumbai")
📍 Find people by location (e.g., "anyone from Pune")
🏢 Search by company or college (e.g., "people from COEP")
💼 Find expertise (e.g., "AI experts", "entrepreneurs")

What would you like to explore?`;
    }
    
    // Check if the message looks like a search query
    const searchKeywords = [
      'anyone from', 'alumni from', 'people from', 'who is', 'show me',
      'find', 'looking for', 'search', 'developer', 'entrepreneur', 
      'founder', 'startup', 'pune', 'mumbai', 'bangalore', 'delhi',
      'coep', 'iit', 'nit', 'college', 'university', 'web developer',
      'app developer', 'designer', 'marketing', 'sales', 'finance',
      'technology', 'tech', 'software', 'hardware', 'ai', 'ml',
      'data scientist', 'analyst', 'consultant', 'manager'
    ];
    
    const isLikelySearch = searchKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // For search-like queries or explicit search intents, use enhanced search
    if (isLikelySearch || intent.type === 'search' || intent.type === 'profile_search' || intent.type === 'location_search') {
      // Use the new enhanced search service for god-level search
      const searchResults = await enhancedSearchService.search(
        userMessage, // Always use original message for better context
        user
      );
      
      userSession.lastActivity = 'search_results';
      userSession.lastSearchQuery = userMessage;
      
      return searchResults;
    }
    
    // Jagriti Yatra information
    if (intent.type === 'jagriti_info' || lowerMessage.includes('jagriti yatra')) {
      return JagritiYatraKnowledgeService.getFormattedResponse(userMessage);
    }
    
    // Policy violations
    if (intent.type === 'policy_violation') {
      return UnifiedIntelligenceService.generatePolicyViolationResponse();
    }
    
    // Use intelligent context service for all other queries
    const contextAnalysis = await intelligentContextService.analyzeQuery(
      userMessage,
      user,
      userSession
    );
    
    const response = await intelligentContextService.generateResponse(
      userMessage,
      contextAnalysis,
      user
    );
    
    return response;
    
  } catch (error) {
    console.error('Error in handleAuthenticatedUser:', error);
    console.error('Error stack:', error.stack);
    console.error('WhatsApp number:', whatsappNumber);
    console.error('User message:', userMessage);
    console.error('Intent:', intent);
    return `Sorry, I encountered an error. Please try again or contact support.`;
  }
}

module.exports = {
  handleAuthenticatedUser,
};