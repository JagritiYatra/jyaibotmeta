// Simplified authenticated user controller - Profile via web form only
const {
  getIncompleteFields,
  findUserByWhatsAppNumber,
  getProfileCompletionPercentage,
} = require('../models/User');
const { comprehensiveAlumniSearch } = require('../services/searchService');
const enhancedSearchService = require('../services/enhancedSearchService');
// const godLevelIntelligentService = require('../services/godLevelIntelligentService');
// const ultimateIntelligentService = require('../services/ultimateIntelligentService'); // ULTIMATE service - ZERO generic responses
// const perfectMatchService = require('../services/perfectMatchService'); // PERFECT matching with god-level relevance
// const aiPoweredSearchService = require('../services/aiPoweredSearchService'); // AI-POWERED with GPT-4 understanding
const ultimatePerfectService = require('../services/ultimatePerfectService'); // ULTIMATE PERFECT - God-level accuracy
// const intelligentContextService = require('../services/intelligentContextService'); // REMOVED - causes generic responses
const { handleCasualConversation } = require('./conversationController');
const { logUserQuery } = require('../services/analyticsService');
const { sendProfileFormWebView } = require('./profileFormController');
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
      // Send webview button instead of plain text link
      const webViewResult = await sendProfileFormWebView(whatsappNumber, user, []);
      
      if (webViewResult.success) {
        // WebView button sent successfully - return null to indicate no text response needed
        return null;
      } else {
        // Fallback to text message if WebView fails
        return webViewResult.fallbackMessage || webViewResult.message || `Hello! 👋

📋 *Complete Your Profile First*

Please complete your profile to access all features.
Once you complete your profile, you can search and connect with 9000+ alumni!`;
      }
    }
    
    // PRIORITY 2: Handle different intents for users with complete profiles
    
    // For simple greetings, provide a welcome message with the user's name
    const lowerMessage = userMessage.toLowerCase();
    if (['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'].includes(lowerMessage.trim())) {
      // Use name from enhancedProfile (filled via form) or basicProfile
      const userFullName = user.enhancedProfile?.fullName || user.basicProfile?.name || 'there';
      const userFirstName = userFullName.split(' ')[0];
      
      return `Hello ${userFirstName}!

Welcome back to JY Alumni Network. How can I help you today?`;
    }
    
    // Check if it's a continuation query (like "and hyderabad")
    const isContinuationQuery = /^(and|also|or|plus)\s+\w+/i.test(lowerMessage.trim()) && 
                                userSession.lastActivity === 'search_results';
    
    // Check if the message looks like a search query - BE VERY LIBERAL
    const searchKeywords = [
      'anyone from', 'alumni from', 'people from', 'who is', 'show me',
      'find', 'looking for', 'search', 'developer', 'entrepreneur', 
      'founder', 'startup', 'pune', 'mumbai', 'bangalore', 'delhi',
      'coep', 'college of engineering', 'iit', 'nit', 'college', 'university', 'web developer',
      'app developer', 'designer', 'marketing', 'sales', 'finance',
      'technology', 'tech', 'software', 'hardware', 'ai', 'ml',
      'data scientist', 'analyst', 'consultant', 'manager', 'list',
      'professionals', 'experts', 'skills', 'domain', 'industry',
      'hyderabad', 'chennai', 'kolkata', 'business', 'import', 'export',
      'yatris', 'yatri', 'connect', 'help', 'assist', 'need', 'want',
      'lawyer', 'legal', 'engineer', 'professional', 'people', 'person',
      'someone', 'anybody', 'contact', 'reach', 'talk', 'know', 'meet'
    ];
    
    const isLikelySearch = searchKeywords.some(keyword => lowerMessage.includes(keyword)) || 
                          isContinuationQuery;
    
    // INTELLIGENT INTENT DETECTION - Handle different types of queries appropriately
    console.log('Analyzing query type for:', userMessage);
    
    // Check for follow-up questions FIRST
    const followUpPatterns = [
      /^(any\s*more|more|another|other|additional)/i,
      /^(show|tell|give)\s*(me)?\s*more/i,
      /more\s*(profiles?|people|results?)/i,
      /^(details|info|information)\s*about/i
    ];
    
    const isFollowUp = followUpPatterns.some(pattern => pattern.test(lowerMessage));
    
    // Determine query type more intelligently
    const queryType = await determineQueryType(userMessage);
    console.log('Detected query type:', queryType);
    
    // Handle different types of queries appropriately
    switch (queryType) {
      case 'jagriti_info':
        console.log('Handling Jagriti Yatra information query');
        try {
          const { JagritiYatraKnowledgeService } = require('../services/jagritiYatraKnowledge');
          return await JagritiYatraKnowledgeService.getFormattedResponse(userMessage);
        } catch (error) {
          console.error('Jagriti knowledge error:', error);
          return "Let me help you with Jagriti Yatra information. Please try asking again.";
        }
        
      case 'founder_info':
        console.log('Handling founder/management team query');
        try {
          return await handleFounderAndTeamQueries(userMessage);
        } catch (error) {
          console.error('Founder info error:', error);
          return "Let me help you with leadership information. Please try asking again.";
        }
        
      case 'general_chat':
        console.log('Handling general ChatGPT-like query');
        try {
          return await handleGeneralChat(userMessage, user);
        } catch (error) {
          console.error('General chat error:', error);
          return "I can help with general questions and alumni searches. What would you like to know?";
        }
        
      case 'definition':
        console.log('Handling definition/explanation query');
        try {
          const definitionResponse = await handleDefinitionQuery(userMessage, user);
          // Try to add relevant profiles if any
          const enhancedResponse = await addRelevantProfiles(definitionResponse, userMessage, user);
          return enhancedResponse;
        } catch (error) {
          console.error('Definition query error:', error);
          return "Let me help you understand that. Please try asking in a different way.";
        }
        
      case 'self_reflection':
        console.log('Handling self-reflection query');
        try {
          return await handleSelfReflection(user);
        } catch (error) {
          console.error('Self-reflection error:', error);
          return "You're an amazing member of our Jagriti Yatra community! Keep making an impact.";
        }
        
      case 'search_alumni':
      case 'follow_up':
      default:
        console.log('Using Ultimate Perfect Service for alumni search');
        try {
          // Use the ultimate perfect service for actual alumni searches
          const response = await ultimatePerfectService.search(
            userMessage,
            user,
            userSession
          );
          
          // Update session for tracking
          if (response.includes('Found') || response.includes('found') || response.includes('profile')) {
            userSession.lastActivity = 'search_results';
            userSession.lastSearchQuery = userMessage;
          }
          
          return response;
        } catch (searchError) {
          console.error('Ultimate perfect search error:', searchError);
          return "Let me search for that... Please try again or be more specific.";
        }
    }
    
    // REMOVED: These were causing generic responses
    // All queries now go through god-level search above
    
    // Only handle specific Jagriti Yatra info if explicitly asked
    // if (intent.type === 'jagriti_info' || 
    //     lowerMessage.includes('jagriti yatra') || 
    //     (lowerMessage.includes('founder') && lowerMessage.includes('jagriti')) ||
    //     lowerMessage.includes('shashank mani')) {
    //   return await JagritiYatraKnowledgeService.getFormattedResponse(userMessage);
    // }
    
    // The god-level search handles everything now
    // No more falling back to generic responses
    
  } catch (error) {
    console.error('Error in handleAuthenticatedUser:', error);
    console.error('Error stack:', error.stack);
    console.error('WhatsApp number:', whatsappNumber);
    console.error('User message:', userMessage);
    console.error('Intent:', intent);
    return `Sorry, I encountered an error. Please try again or contact support.`;
  }
}

// Determine query type using AI and enhanced pattern matching
async function determineQueryType(message) {
  try {
    const lowerMessage = message.toLowerCase();
    
    // Check for greetings first
    if (/^(hi|hello|hey|good morning|good afternoon|good evening)$/i.test(lowerMessage.trim())) {
      return 'greeting';
    }
    
    // Check for self-reflection queries
    if (/about me|who am i|what.*know.*about me|remember.*me|my profile|myself/i.test(message)) {
      return 'self_reflection';
    }
    
    // Check for follow-up queries (but not "tell me about X" which could be a new search)
    if (/^(show more|tell me more about (her|him|them)|more details|more about|contact details|email|linkedin|next|another|any more|anything more|more matches|give.*more|where.*matches|show.*matches)/i.test(message)) {
      return 'follow_up';
    }
    
    // PRIORITY: Check for Jagriti Yatra related queries
    if (/jagriti|yatra|shashank mani|founder.*jagriti|what.*jagriti|jecp|purvanchal|enterprise.*center|jagriti.*enterprise/i.test(message)) {
      return 'jagriti_info';
    }
    
    // Check for founder/management team queries
    if (/(who.*founder|founder.*of|management.*team|executive.*team|leadership.*team|ceo.*of|director.*of)(?!.*jagriti)/i.test(message)) {
      return 'founder_info';
    }
    
    // Check for specific name queries that are alumni searches (excluding "tell me about" for now)
    if (/^(do you know|who is|find|profile of)\s+[a-z]+/i.test(message)) {
      return 'search_alumni';
    }
    
    // Check for single name queries (e.g., "ishita", "kirtana", "ishita ?")
    if (/^[a-z]+\s*\??\s*$/i.test(message.trim()) && message.trim().replace(/[?\s]/g, '').length > 3 && message.trim().replace(/[?\s]/g, '').length < 20) {
      return 'search_alumni';
    }
    
    // PRIORITIZE search for any alumni-related queries
    if (/anyone|any one|people|alumni|find|search|looking|developers|professionals|experts|list|yatris|from\s+(COEP|IIT|NIT|BITS)|in.*business|working in|working at|based in|contact.*number.*of|whatsapp.*of|phone.*of|content creators?|best.*candidate|top.*yatri|^any\s+(content|developer|designer|founder|entrepreneur|professional|expert)/i.test(message)) {
      return 'search_alumni';
    }
    
    // Check for definition/explanation queries that aren't searches
    if (/^(what is|define|explain|how does|what are|tell me about)\s+(?!.*\b(anyone|people|alumni|who|person|someone|name)\b)/i.test(message)) {
      // Additional check for technology/concept terms vs people names
      const topicWords = message.toLowerCase().match(/\b(computing|intelligence|learning|technology|science|engineering|development|programming|software|algorithm|blockchain|data|analytics|ai|ml|quantum|neural|deep|machine|artificial|cyber|cloud|iot|fintech|biotech|nanotech|robotics|automation)\b/);
      if (topicWords) {
        return 'definition';
      }
    }
    
    // Check for "tell me about X" - determine if it's about technology/concepts or people
    if (/tell me (about|something about)\s+[a-z]+/i.test(message) && !/her|him|them|it/i.test(message)) {
      // Check if it's about a technology/concept - key tech terms
      const techKeywords = ['computing', 'technology', 'science', 'engineering', 'programming', 'software', 
                           'algorithm', 'blockchain', 'data', 'analytics', 'ai', 'ml', 'quantum', 'neural', 
                           'deep', 'machine', 'artificial', 'cyber', 'cloud', 'iot', 'robotics', 'automation',
                           'physics', 'chemistry', 'biology', 'mathematics', 'economics', 'finance', 
                           'business', 'marketing', 'design', 'medicine', 'healthcare', 'cryptocurrency',
                           'bitcoin', 'ethereum', 'startup', 'entrepreneurship', 'investing', 'trading'];
      
      const messageLower = message.toLowerCase();
      const isTechTopic = techKeywords.some(keyword => messageLower.includes(keyword));
      
      if (isTechTopic) {
        return 'definition';
      }
      
      return 'search_alumni';
    }
    
    // Default to general chat for other queries
    return 'general_chat';
  } catch (error) {
    console.error('Error in determineQueryType:', error);
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
      return "Let me find information about that for you. Try being more specific about what you need to know.";
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
    return "Let me help you with that question. Try asking in a different way or be more specific.";
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

// Handle founder and management team queries with AI
async function handleFounderAndTeamQueries(message) {
  try {
    const OpenAI = require('openai');
    const { getConfig } = require('../config/environment');
    
    const config = getConfig();
    if (!config.ai?.apiKey) {
      return "I can help you find information about leadership teams. For specific company leadership, please try asking with more details.";
    }
    
    const openai = new OpenAI({ apiKey: config.ai.apiKey });
    
    // Use AI to provide current information about founders and teams
    const prompt = `Answer this leadership/founder question with current, accurate information: "${message}"

Instructions:
1. Provide exactly 4-5 lines with factual information
2. Focus on current leadership, roles, and achievements  
3. Be specific with names and positions when possible
4. If about Jagriti Yatra leadership, redirect to jagriti_info
5. Keep it professional and informative

Answer:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert business researcher with access to current information. Provide accurate, up-to-date information about company founders and leadership teams. Be factual and specific.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 200
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Founder query error:', error);
    return "I can help you find information about leadership and founding teams. Please try asking with more specific details about the company or organization.";
  }
}

// Add relevant profiles to definition responses
async function addRelevantProfiles(definitionResponse, originalQuery, user) {
  try {
    // Extract keywords from the query to find related profiles
    const keywords = originalQuery.toLowerCase().match(/\b\w{4,}\b/g) || [];
    
    if (keywords.length === 0) {
      return definitionResponse;
    }
    
    // Try to find 1-2 relevant profiles
    const ultimatePerfectService = require('../services/ultimatePerfectService');
    const searchQuery = keywords.join(' ') + ' expert professional';
    
    const searchResults = await ultimatePerfectService.search(searchQuery, user, {});
    
    // If we found profiles, add them
    if (searchResults.includes('Found') && !searchResults.includes('No exact matches')) {
      const profileSection = searchResults.split('\n\n')[1]; // Get first profile
      if (profileSection && profileSection.includes('*')) {
        const profileName = profileSection.match(/\*([^*]+)\*/)?.[1];
        if (profileName) {
          return `${definitionResponse}\n\n💡 *Related Alumni*: ${profileName} from our community might be able to help with this topic. Type "more" to see profiles.`;
        }
      }
    }
    
    return definitionResponse;
  } catch (error) {
    console.error('Error adding relevant profiles:', error);
    return definitionResponse;
  }
}

module.exports = {
  handleAuthenticatedUser,
};