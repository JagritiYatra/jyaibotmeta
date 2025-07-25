// Intelligent Context Understanding Service
// Provides god-level AI capabilities for understanding user queries and context

const OpenAI = require('openai');
const { getConfig } = require('../config/environment');

// Initialize OpenAI
let openai;
const config = getConfig();
if (config.ai?.apiKey) {
  openai = new OpenAI({
    apiKey: config.ai.apiKey,
  });
}
const { logError, logSuccess } = require('../middleware/logging');
const enhancedSearchService = require('./enhancedSearchService');
const JagritiYatraKnowledgeService = require('./jagritiYatraKnowledge');

class IntelligentContextService {
  constructor() {
    this.conversationHistory = new Map(); // Store conversation context per user
    this.queryPatterns = this.initializeQueryPatterns();
  }

  // Initialize common query patterns
  initializeQueryPatterns() {
    return {
      // Search patterns
      searchPatterns: [
        { pattern: /show\s+me\s+(.+)\s+in\s+(.+)/i, type: 'location_search' },
        { pattern: /find\s+(.+)\s+who\s+(.+)/i, type: 'criteria_search' },
        { pattern: /looking\s+for\s+(.+)/i, type: 'general_search' },
        { pattern: /connect\s+me\s+with\s+(.+)/i, type: 'connection_request' },
        { pattern: /who\s+is\s+(.+)/i, type: 'person_search' },
        { pattern: /alumni\s+from\s+(.+)/i, type: 'location_search' },
        { pattern: /(.+)\s+experts?/i, type: 'expertise_search' },
        { pattern: /entrepreneurs?\s+in\s+(.+)/i, type: 'entrepreneur_search' },
      ],
      
      // Information patterns
      infoPatterns: [
        { pattern: /what\s+is\s+jagriti\s+yatra/i, type: 'jy_info' },
        { pattern: /tell\s+me\s+about\s+(.+)/i, type: 'general_info' },
        { pattern: /how\s+to\s+(.+)/i, type: 'how_to' },
        { pattern: /when\s+is\s+(.+)/i, type: 'time_query' },
        { pattern: /where\s+is\s+(.+)/i, type: 'location_query' },
      ],
      
      // Action patterns
      actionPatterns: [
        { pattern: /update\s+my\s+(.+)/i, type: 'profile_update' },
        { pattern: /change\s+my\s+(.+)/i, type: 'profile_change' },
        { pattern: /add\s+(.+)\s+to\s+my\s+profile/i, type: 'profile_add' },
      ],
      
      // Conversational patterns
      conversationalPatterns: [
        { pattern: /^(hi|hello|hey|greetings)/i, type: 'greeting' },
        { pattern: /^(thanks|thank\s+you|thx)/i, type: 'thanks' },
        { pattern: /^(bye|goodbye|see\s+you)/i, type: 'farewell' },
        { pattern: /^(yes|yeah|yep|sure|ok|okay)/i, type: 'affirmative' },
        { pattern: /^(no|nope|nah|not\s+really)/i, type: 'negative' },
      ]
    };
  }

  // Analyze query with advanced NLP
  async analyzeQuery(query, user, sessionContext) {
    try {
      // Get or create user conversation history
      const userId = user?._id?.toString() || 'anonymous';
      if (!this.conversationHistory.has(userId)) {
        this.conversationHistory.set(userId, []);
      }
      
      const history = this.conversationHistory.get(userId);
      
      // Add current query to history
      history.push({ role: 'user', content: query, timestamp: new Date() });
      
      // Keep only last 10 messages
      if (history.length > 10) {
        history.shift();
      }
      
      // Analyze query intent using GPT-4
      const analysis = await this.analyzeWithAI(query, history, user);
      
      // Determine best response strategy
      const responseStrategy = await this.determineResponseStrategy(analysis, user, sessionContext);
      
      logSuccess('query_analyzed', { 
        query, 
        intent: analysis.intent,
        strategy: responseStrategy.type 
      });
      
      return {
        analysis,
        strategy: responseStrategy,
        context: {
          history,
          userProfile: this.getUserContext(user),
          sessionContext
        }
      };
      
    } catch (error) {
      logError(error, { operation: 'analyzeQuery', query });
      return this.getFallbackAnalysis(query);
    }
  }

  // Analyze query with AI
  async analyzeWithAI(query, history, user) {
    try {
      const historyContext = history.slice(-5).map(h => `${h.role}: ${h.content}`).join('\n');
      
      const prompt = `Analyze this user query in the context of a Jagriti Yatra alumni network bot.

User Profile:
- Name: ${user?.basicProfile?.name || 'Unknown'}
- Location: ${user?.basicProfile?.linkedinScrapedData?.location || 'Unknown'}
- Role: ${user?.enhancedProfile?.professionalRole || 'Unknown'}
- Profile Complete: ${user?.enhancedProfile?.completed ? 'Yes' : 'No'}

Recent Conversation:
${historyContext}

Current Query: "${query}"

Analyze and return:
1. Primary intent (search, information, action, conversation, etc.)
2. Specific intent details
3. Entities mentioned (names, locations, skills, companies, etc.)
4. Sentiment (positive, negative, neutral, confused, urgent)
5. Response urgency (high, medium, low)
6. Suggested response type (search_results, information, action_required, conversational)
7. Any implicit needs not directly stated

Return as JSON format.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      logError(error, { operation: 'analyzeWithAI' });
      return this.getBasicIntentAnalysis(query);
    }
  }

  // Basic intent analysis as fallback
  getBasicIntentAnalysis(query) {
    const lowerQuery = query.toLowerCase();
    
    // Check against patterns
    for (const [category, patterns] of Object.entries(this.queryPatterns)) {
      for (const { pattern, type } of patterns) {
        if (pattern.test(query)) {
          return {
            intent: type,
            category,
            confidence: 'medium',
            entities: [],
            sentiment: 'neutral'
          };
        }
      }
    }
    
    // Default to search if contains common search keywords
    const searchKeywords = ['find', 'search', 'looking', 'show', 'alumni', 'who', 'expert'];
    if (searchKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return {
        intent: 'general_search',
        category: 'search',
        confidence: 'low',
        entities: [],
        sentiment: 'neutral'
      };
    }
    
    return {
      intent: 'unknown',
      category: 'general',
      confidence: 'low',
      entities: [],
      sentiment: 'neutral'
    };
  }

  // Determine response strategy
  async determineResponseStrategy(analysis, user, sessionContext) {
    const { intent, category, sentiment, entities } = analysis;
    
    // Profile incomplete - always prioritize completion
    if (!user?.enhancedProfile?.completed) {
      return {
        type: 'profile_completion_required',
        priority: 'high',
        action: 'show_profile_form_link'
      };
    }
    
    // Search intents
    if (category === 'searchPatterns' || analysis.suggested_response_type === 'search_results') {
      return {
        type: 'search',
        priority: 'high',
        searchType: intent,
        entities
      };
    }
    
    // Information requests about Jagriti Yatra
    if (intent === 'jy_info' || (category === 'infoPatterns' && query.toLowerCase().includes('jagriti'))) {
      return {
        type: 'jagriti_yatra_info',
        priority: 'medium'
      };
    }
    
    // Conversational responses
    if (category === 'conversationalPatterns') {
      return {
        type: 'conversational',
        subtype: intent,
        priority: 'low'
      };
    }
    
    // Default to intelligent search
    return {
      type: 'intelligent_search',
      priority: 'medium',
      fallback: true
    };
  }

  // Generate response based on analysis
  async generateResponse(query, analysisResult, user) {
    const { strategy, context } = analysisResult;
    
    try {
      switch (strategy.type) {
        case 'profile_completion_required':
          return this.generateProfileCompletionMessage(user);
          
        case 'search':
        case 'intelligent_search':
          return await enhancedSearchService.search(query, user);
          
        case 'jagriti_yatra_info':
          return JagritiYatraKnowledgeService.getFormattedResponse(query);
          
        case 'conversational':
          return await this.generateConversationalResponse(query, strategy.subtype, user);
          
        default:
          return await this.generateIntelligentResponse(query, analysisResult, user);
      }
    } catch (error) {
      logError(error, { operation: 'generateResponse', strategy: strategy.type });
      return "I'm having trouble understanding your request. Could you please rephrase it?";
    }
  }

  // Generate profile completion message
  generateProfileCompletionMessage(user) {
    const { generateProfileFormLink } = require('../controllers/profileFormController');
    const linkData = generateProfileFormLink(user?.whatsappNumber || '');
    
    return `📋 **Complete Your Profile First**

To access search and connect with 9000+ alumni, please complete your profile:

🔗 **Click here:** ${linkData?.url || 'https://jyaibot-profile-form.vercel.app/profile-setup'}

⏱️ Takes only 5 minutes
✨ All fields in one simple form

Once complete, I can help you find and connect with relevant alumni!`;
  }

  // Generate conversational response
  async generateConversationalResponse(query, subtype, user) {
    const userName = user?.basicProfile?.name?.split(' ')[0] || 'there';
    
    const responses = {
      greeting: `Hello ${userName}! 👋 How can I help you connect with our alumni network today?`,
      thanks: "You're welcome! Is there anything else you'd like to know about our alumni?",
      farewell: "Goodbye! Feel free to come back anytime to connect with fellow Yatris. 🚆",
      affirmative: "Great! What would you like to do next?",
      negative: "No problem. Is there something else I can help you with?"
    };
    
    return responses[subtype] || await this.generateIntelligentResponse(query, { context: {} }, user);
  }

  // Generate intelligent response using AI
  async generateIntelligentResponse(query, analysisResult, user) {
    try {
      const { analysis, context } = analysisResult;
      
      const prompt = `You are an intelligent assistant for the Jagriti Yatra Alumni Network with 9000+ members.

User Query: "${query}"

Query Analysis:
${JSON.stringify(analysis, null, 2)}

User Context:
- Name: ${user?.basicProfile?.name || 'Unknown'}
- Professional Role: ${user?.enhancedProfile?.professionalRole || 'Unknown'}
- Location: ${user?.basicProfile?.linkedinScrapedData?.location || 'Unknown'}
- Skills: ${user?.basicProfile?.linkedinScrapedData?.skills?.slice(0, 5).join(', ') || 'Not specified'}

Generate a helpful, concise response that:
1. Directly addresses the user's query
2. Provides actionable information
3. Suggests relevant alumni connections if applicable
4. Is friendly but professional
5. Keeps response under 200 words

If the query is about finding people or expertise, mention that you can search the alumni database.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300
      });

      const response = completion.choices[0].message.content.trim();
      
      // Add conversation to history
      const userId = user?._id?.toString() || 'anonymous';
      const history = this.conversationHistory.get(userId) || [];
      history.push({ role: 'assistant', content: response, timestamp: new Date() });
      
      return response;
      
    } catch (error) {
      logError(error, { operation: 'generateIntelligentResponse' });
      return `I understand you're asking about "${query}". Let me search our alumni database for relevant information.

You can ask me to:
- Find alumni by location, skills, or company
- Search for specific expertise
- Get information about Jagriti Yatra
- Connect with entrepreneurs and professionals

What specifically would you like to know?`;
    }
  }

  // Get user context for better responses
  getUserContext(user) {
    if (!user) return {};
    
    return {
      name: user.basicProfile?.name,
      location: user.basicProfile?.linkedinScrapedData?.location || user.enhancedProfile?.country,
      company: user.basicProfile?.linkedinScrapedData?.currentCompany,
      role: user.basicProfile?.linkedinScrapedData?.currentCompanyTitle || user.enhancedProfile?.professionalRole,
      skills: user.basicProfile?.linkedinScrapedData?.skills || [],
      interests: [
        ...(user.enhancedProfile?.communityAsks || []),
        ...(user.enhancedProfile?.communityGives || [])
      ],
      profileComplete: user.enhancedProfile?.completed || false
    };
  }

  // Get fallback analysis
  getFallbackAnalysis(query) {
    return {
      analysis: this.getBasicIntentAnalysis(query),
      strategy: {
        type: 'intelligent_search',
        priority: 'medium',
        fallback: true
      },
      context: {}
    };
  }

  // Clear user conversation history
  clearUserHistory(userId) {
    this.conversationHistory.delete(userId);
  }

  // Get conversation summary
  async getConversationSummary(userId) {
    const history = this.conversationHistory.get(userId);
    if (!history || history.length === 0) return null;
    
    try {
      const conversationText = history.map(h => `${h.role}: ${h.content}`).join('\n');
      
      const prompt = `Summarize this conversation in 2-3 sentences, highlighting the main topics discussed and any pending actions:

${conversationText}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 100
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      logError(error, { operation: 'getConversationSummary' });
      return null;
    }
  }
}

module.exports = new IntelligentContextService();