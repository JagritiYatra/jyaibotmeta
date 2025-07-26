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
    
    // Check if it's a continuation query (like "and hyderabad")
    const isContinuationQuery = /^(and|also|or|plus)\s+\w+/i.test(lowerMessage.trim()) && 
                                userSession.lastActivity === 'search_results';
    
    // Check if the message looks like a search query
    const searchKeywords = [
      'anyone from', 'alumni from', 'people from', 'who is', 'show me',
      'find', 'looking for', 'search', 'developer', 'entrepreneur', 
      'founder', 'startup', 'pune', 'mumbai', 'bangalore', 'delhi',
      'coep', 'iit', 'nit', 'college', 'university', 'web developer',
      'app developer', 'designer', 'marketing', 'sales', 'finance',
      'technology', 'tech', 'software', 'hardware', 'ai', 'ml',
      'data scientist', 'analyst', 'consultant', 'manager', 'list',
      'professionals', 'experts', 'skills', 'domain', 'industry',
      'hyderabad', 'chennai', 'kolkata', 'business', 'import', 'export',
      'yatris', 'yatri'
    ];
    
    const isLikelySearch = searchKeywords.some(keyword => lowerMessage.includes(keyword)) || 
                          isContinuationQuery;
    
    // Determine query type for context-aware responses
    const queryType = await determineQueryType(userMessage);
    console.log(`Query type detected: ${queryType}`);
    
    // Handle different query types - but PRIORITIZE SEARCH
    if (queryType === 'self_reflection') {
      // Handle self-reflection queries
      return await handleSelfReflection(user);
    } else if (queryType === 'follow_up') {
      // Handle follow-up queries
      console.log('Handling as follow-up query...');
      return await intelligentContextService.handleFollowUpQuery(userMessage, user._id, user);
    } else if (queryType === 'search_alumni' || isLikelySearch) {
      // Always do search for alumni queries
      console.log('Performing alumni search...');
    } else {
      switch(queryType) {
        case 'general_chat':
          // Only handle as general chat if it's clearly NOT a search
          if (!lowerMessage.includes('list') && !lowerMessage.includes('from') && !lowerMessage.includes('yatri')) {
            return await handleGeneralChat(userMessage, user);
          }
          break;
          
        case 'definition':
          // Only handle as definition if it's clearly asking for explanation
          if (!lowerMessage.includes('from') && !lowerMessage.includes('list') && !lowerMessage.includes('who')) {
            return await handleDefinitionQuery(userMessage, user);
          }
          break;
      }
    }
    
    // For search-like queries or explicit search intents, use enhanced search
    if (isLikelySearch || intent.type === 'search' || intent.type === 'profile_search' || intent.type === 'location_search') {
      try {
        // Use the new enhanced search service for god-level search
        const searchResults = await enhancedSearchService.search(
          userMessage, // Always use original message for better context
          user
        );
        
        userSession.lastActivity = 'search_results';
        userSession.lastSearchQuery = userMessage;
        
        return searchResults;
      } catch (searchError) {
        console.error('Search error:', searchError);
        // Don't expose technical errors - provide helpful response
        return "I'm having trouble searching right now. Try being more specific, like 'developers in Mumbai' or 'people from IIT'.";
      }
    }
    
    // Jagriti Yatra information - handle founder queries
    if (intent.type === 'jagriti_info' || 
        lowerMessage.includes('jagriti yatra') || 
        (lowerMessage.includes('founder') && lowerMessage.includes('jagriti')) ||
        lowerMessage.includes('shashank mani')) {
      return await JagritiYatraKnowledgeService.getFormattedResponse(userMessage);
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

// Determine query type using AI
async function determineQueryType(message) {
  try {
    const lowerMessage = message.toLowerCase();
    
    // Quick pattern matching for common types
    if (/what is|define|explain|how does|what are|tell me about/i.test(message) && 
        !/anyone|people|alumni|find|looking|list|from/i.test(message)) {
      return 'definition';
    }
    
    // Check for self-reflection queries first
    if (/about me|who am i|what.*know.*about me|remember.*me|my profile|myself/i.test(message)) {
      return 'self_reflection';
    }
    
    // Check for follow-up queries (but not "tell me about X" which could be a new search)
    if (/^(show more|tell me more about (her|him|them)|more details|more about|contact details|email|linkedin|next|another|any more|anything more|more matches|give.*more|where.*matches|show.*matches)/i.test(message)) {
      return 'follow_up';
    }
    
    // Check for "tell me about X" as a search query
    if (/tell me (about|something about) (?!her|him|them)/i.test(message)) {
      return 'search_alumni';
    }
    
    // Check for single name queries (e.g., "ishita", "kirtana", "ishita ?")
    if (/^[a-z]+\s*\??\s*$/i.test(message.trim()) && message.trim().replace(/[?\s]/g, '').length > 3 && message.trim().replace(/[?\s]/g, '').length < 20) {
      return 'search_alumni';
    }
    
    // Check for "about X" pattern
    if (/^about\s+[a-z]+/i.test(message.trim())) {
      return 'search_alumni';
    }
    
    // Check for "do you know X" pattern
    if (/do you know\s+[a-z]+/i.test(message)) {
      return 'search_alumni';
    }
    
    // PRIORITIZE search for any alumni-related queries
    if (/anyone|any one|people|alumni|find|search|looking|developers|professionals|experts|list|yatris|from\s+(COEP|IIT|NIT|BITS)|in.*business|working in|based in|about.*[a-z]+\s+[a-z]+|information about|tell.*about.*person|contact.*number.*of|whatsapp.*of|phone.*of|know.*about.*[a-z]+|content creators?|best.*candidate|top.*yatri|^any\s+(content|developer|designer|founder|entrepreneur|professional|expert)/i.test(message)) {
      return 'search_alumni';
    }
    
    if (/hi|hello|hey|good morning|how are you/i.test(lowerMessage) && lowerMessage.length < 20) {
      return 'greeting';
    }
    
    // Only use general chat if it's clearly not a search
    return 'general_chat';
  } catch (error) {
    return 'general_chat';
  }
}

// Handle general chat like ChatGPT
async function handleGeneralChat(message, user) {
  try {
    const OpenAI = require('openai');
    const { getConfig } = require('../config/environment');
    const config = getConfig();
    
    if (!config.ai?.apiKey) {
      return "I can help you search for alumni or answer questions about Jagriti Yatra. Try asking about specific people, skills, or locations!";
    }
    
    const openai = new OpenAI({ apiKey: config.ai.apiKey });
    
    const prompt = `You are an intelligent alumni network assistant. Answer this general question concisely and helpfully.

User: ${message}

Instructions:
1. Keep response under 3-4 sentences
2. Be conversational and friendly
3. If the question relates to alumni network, guide them to search
4. No bullet points or lists
5. Don't use ellipsis (...)

Answer:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 150
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    return "I can help you search for alumni based on location, skills, companies, or roles. What would you like to know?";
  }
}

// Handle definition/explanation queries
async function handleDefinitionQuery(message, user) {
  try {
    const OpenAI = require('openai');
    const { getConfig } = require('../config/environment');
    const config = getConfig();
    
    if (!config.ai?.apiKey) {
      return intelligentContextService.generateResponse(message, { type: 'definition' }, user);
    }
    
    const openai = new OpenAI({ apiKey: config.ai.apiKey });
    
    const prompt = `You are an intelligent assistant. Provide a clear, concise explanation for this query.

Question: ${message}

Instructions:
1. Give a direct, informative answer in 2-3 sentences
2. Use simple language
3. Include a practical example if relevant
4. No bullet points or complex formatting
5. If it's about alumni network or Jagriti Yatra, be specific

Answer:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 150
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    return intelligentContextService.generateResponse(message, { type: 'definition' }, user);
  }
}

// Handle self-reflection queries about the user
async function handleSelfReflection(user) {
  try {
    const basicProfile = user.basicProfile || {};
    const linkedinData = basicProfile.linkedinScrapedData || {};
    const enhancedProfile = user.enhancedProfile || {};
    
    // Extract user's data
    const name = enhancedProfile.fullName || linkedinData.fullName || basicProfile.name || 'Amazing Person';
    const headline = linkedinData.headline || enhancedProfile.professionalRole || '';
    const location = linkedinData.location || enhancedProfile.currentAddress || enhancedProfile.country || '';
    const company = linkedinData.currentCompany || '';
    const about = linkedinData.about || basicProfile.about || '';
    const skills = linkedinData.skills || [];
    const domain = enhancedProfile.domain || '';
    const yatraYear = user.yatraYear || '2024';
    
    const OpenAI = require('openai');
    const { getConfig } = require('../config/environment');
    const config = getConfig();
    
    if (!config.ai?.apiKey) {
      // Fallback response
      return `${name}, you're an incredible member of the Jagriti Yatra ${yatraYear} family! ${headline ? `As ${headline}, ` : ''}you bring unique value to our community. Your journey is inspiring, and your potential is limitless. Keep pushing boundaries and creating impact!`;
    }
    
    const openai = new OpenAI({ apiKey: config.ai.apiKey });
    
    const prompt = `Write an inspiring, motivational message about this person based on their profile. Make them feel special and highlight their achievements and potential.

Name: ${name}
Role: ${headline}
Company: ${company}
Location: ${location}
About: ${about}
Skills: ${skills.join(', ')}
Domain: ${domain}
Jagriti Yatra: ${yatraYear}

Instructions:
1. Write 4-5 lines that are deeply personal and motivating
2. Highlight their unique achievements and skills
3. Emphasize their potential and future impact
4. Reference their Jagriti Yatra journey
5. Make them feel valued and special
6. End with an empowering statement about their future

Write an inspiring message:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 200
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    const name = user.basicProfile?.name || user.enhancedProfile?.fullName || 'Friend';
    return `${name}, you're an extraordinary individual with immense potential! Your journey through Jagriti Yatra has equipped you with unique perspectives and connections. Your skills and dedication are your superpowers - use them to create the impact you envision. The best is yet to come!`;
  }
}

module.exports = {
  handleAuthenticatedUser,
};