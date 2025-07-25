// Simplified authenticated user controller - Profile via web form only
const {
  getIncompleteFields,
  findUserByWhatsAppNumber,
  getProfileCompletionPercentage,
} = require('../models/User');
const { comprehensiveAlumniSearch } = require('../services/searchService');
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
    
    // Check profile completion
    const incompleteFields = getIncompleteFields(user);
    const isProfileComplete = user?.enhancedProfile?.completed === true || incompleteFields.length === 0;
    const completionPercentage = getProfileCompletionPercentage(user);
    
    // Log activity (with error handling)
    try {
      logUserQuery(whatsappNumber, userMessage, intent?.type || 'unknown');
    } catch (logError) {
      console.error('Error logging user query:', logError);
    }
    
    // PRIORITY 1: If profile incomplete, always send web form link
    if (!isProfileComplete) {
      const linkData = generateProfileFormLink(whatsappNumber);
      
      return `Hello ${firstName}! 👋

📋 **Complete Your Profile First**

Your profile is ${completionPercentage}% complete. Please finish it using our web form:

🔗 **Profile Form:** ${linkData?.url || 'http://localhost:3000/profile-setup'}
⏱️ Link expires in 15 minutes

✨ Features:
• All fields in one place
• Easy dropdown for location (Country → State → City)
• Takes only 5 minutes

Once complete, you can search for alumni and access all features!`;
    }
    
    // PRIORITY 2: Handle different intents for users with complete profiles
    
    // Search intents
    if (intent.type === 'search' || intent.type === 'profile_search' || intent.type === 'location_search') {
      const searchResults = await comprehensiveAlumniSearch(
        intent.searchTerms || userMessage,
        user,
        userSession
      );
      
      userSession.lastActivity = 'search_results';
      userSession.lastSearchQuery = intent.searchTerms || userMessage;
      
      return searchResults;
    }
    
    // Jagriti Yatra information
    if (intent.type === 'jagriti_info') {
      return JagritiYatraKnowledgeService.getFormattedResponse(userMessage);
    }
    
    // General knowledge questions
    if (intent.type === 'general_knowledge') {
      return await GeneralQuestionService.processGeneralQuestion(userMessage, whatsappNumber);
    }
    
    // Casual conversation
    if (intent.type === 'casual_chat' || intent.type === 'casual') {
      return await handleCasualConversation(userMessage, userName, whatsappNumber);
    }
    
    // Policy violations
    if (intent.type === 'policy_violation') {
      return UnifiedIntelligenceService.generatePolicyViolationResponse();
    }
    
    // Default response for complete profiles
    return `Hello ${firstName}! How can I help you today?

You can:
🔍 Search for alumni (e.g., "Show me entrepreneurs in Mumbai")
📚 Ask about Jagriti Yatra
💬 Have a casual chat

What would you like to do?`;
    
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