// Unified Intelligence Service - Central AI brain for the chatbot
// Handles all AI-powered intent understanding and response generation
// Uses GPT-4 for maximum understanding and natural responses

const OpenAI = require('openai');
const { getConfig } = require('../config/environment');
const { logError, logAIOperation } = require('../middleware/logging');
const { getDatabase } = require('../config/database');

let openai;
try {
  const config = getConfig();
  if (config.ai.apiKey) {
    openai = new OpenAI({
      apiKey: config.ai.apiKey,
      timeout: 30000,
    });
  }
} catch (error) {
  console.warn('⚠️ OpenAI not initialized for unified intelligence');
}

class UnifiedIntelligenceService {
  // Analyze user message with full context awareness
  static async analyzeMessage(message, whatsappNumber) {
    if (!openai) {
      return {
        intent: 'unknown',
        confidence: 0.5,
        response: "I'm having trouble understanding. Can you try again?",
      };
    }

    try {
      // Get minimal conversation context to prevent session confusion
      const context = await this.getConversationContext(whatsappNumber);

      const systemPrompt = `You are an intelligent assistant for Jagriti Yatra alumni network.
            
IMPORTANT: Treat EACH message as a NEW request unless explicitly referring to previous context.

Analyze the CURRENT message and determine intent:

1. Primary intents:
   - "casual_chat" - Greetings (hi, hello), thanks, how are you, general chat
   - "jagriti_info" - Questions about Jagriti Yatra, founders, mission, routes, JECP
   - "general_knowledge" - Educational questions (what is X, explain Y, tell me about Z)
   - "profile_search" - Looking for people/alumni. Keywords: developers, lawyers, doctors, engineers, designers, founders, entrepreneurs, marketing, finance, any profession/skill/role
   - "location_search" - Looking for people from specific places only
   - "show_more_results" - ONLY when user says "show more", "more results", "next" 
   - "knowledge_and_connect" - When user asks to both learn AND find people

2. Extract key information:
   - searchTerms: EXACT profession/skill mentioned by user (lawyers, doctors, engineers, etc.) - DO NOT use previous context if new profession mentioned
   - location: Specific location mentioned  
   - topic: Current message topic (prioritize over previous context)
   - isFollowUp: true ONLY if asking "more" without mentioning new profession
   - needsProfiles: true if response should include profile suggestions
   - wantsDefinitionAndConnect: true if user asks for both definition AND connections
   - isNewSearch: true if user mentions different profession from previous context
   
CRITICAL RULES:
- EACH MESSAGE IS INDEPENDENT - Don't carry over search terms from previous messages
- "developers" = profile_search for developers (NOT previous search)
- "web developers" = profile_search for web developers (NOT previous search)
- "connect me with X" = profile_search for X
- "who is the founder" = jagriti_info
- Educational questions = general_knowledge
- Only use previous context if user says "more", "show more", "next"

Examples:
- "developers" → intent: "profile_search", searchTerms: "developers"
- "web developers" → intent: "profile_search", searchTerms: "web developers"
- "connect me with akash" → intent: "profile_search", searchTerms: "akash"
- "who is the founder" → intent: "jagriti_info"
- "what is blockchain" → intent: "general_knowledge"

Recent context (last 1-2 messages): ${JSON.stringify(context.recentMessages.slice(0, 2) || [])}

Return JSON: {intent, searchTerms, location, topic, isFollowUp, needsProfiles, confidence}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.2,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const analysis = JSON.parse(completion.choices[0].message.content);

      // ALWAYS extract search terms from current message for profile searches
      if (analysis.intent === 'profile_search') {
        // Extract search terms directly from message
        const searchTerms = this.extractSearchTermsFromMessage(message);
        if (searchTerms) {
          analysis.searchTerms = searchTerms;
          analysis.isFollowUp = false;
          analysis.isNewSearch = true;
        }
      }
      
      // Only use context for explicit "show more" requests
      if (analysis.intent === 'show_more_results' && !analysis.searchTerms) {
        // Use previous search query
        const lastSearch = context.recentMessages.find(m => m.intent === 'profile_search');
        if (lastSearch) {
          analysis.searchTerms = lastSearch.searchQuery;
          analysis.isFollowUp = true;
        }
      }

      // Store intent in MongoDB for learning and track topic for context
      await this.storeIntentAnalysis(whatsappNumber, message, analysis);
      
      // Store current topic for future follow-up queries
      if (analysis.topic || analysis.searchTerms) {
        await this.storeCurrentTopic(whatsappNumber, analysis.topic || analysis.searchTerms);
      } else if (analysis.intent === 'general_knowledge') {
        // Extract topic from the message for general knowledge queries
        const extractedTopic = this.extractTopicFromMessage(message);
        if (extractedTopic) {
          await this.storeCurrentTopic(whatsappNumber, extractedTopic);
        }
      }

      logAIOperation('unified_intent_analysis', {
        message: message.substring(0, 50),
        intent: analysis.intent,
        confidence: analysis.confidence,
      });

      return analysis;
    } catch (error) {
      logError('Unified intent analysis error:', error);
      return {
        intent: 'unknown',
        confidence: 0.5,
        response: "I'm having trouble understanding. Can you try again?",
      };
    }
  }

  // Generate appropriate response based on intent
  static async generateResponse(message, intent, whatsappNumber, additionalContext = {}) {
    if (!openai) {
      return this.getFallbackResponse(intent);
    }

    try {
      // Get user context and history - ONLY previous 1-2 messages to prevent session issues
      const context = await this.getConversationContext(whatsappNumber);

      switch (intent.intent) {
        case 'casual_chat':
          return await this.generateCasualResponse(message, context);

        case 'jagriti_info':
          return await this.generateJagritiResponse(message, context);

        case 'general_knowledge':
          return await this.generateKnowledgeResponse(message, context);

        case 'knowledge_and_connect':
          // Handle "define X and connect" queries
          return await this.generateKnowledgeAndConnectResponse(message, context, intent);

        case 'profile_search':
        case 'location_search':
          return await this.generateSearchGuidance(intent, context);

        case 'follow_up':
        case 'follow_up_profiles':
          return await this.generateFollowUpResponse(message, intent, context);

        case 'show_more_results':
          return await this.generateShowMoreResponse(whatsappNumber);

        case 'policy_violation':
          return this.generatePolicyViolationResponse();

        default:
          return await this.generateSmartFallback(message, context);
      }
    } catch (error) {
      logError('Response generation error:', error);
      return this.getFallbackResponse(intent);
    }
  }

  // Generate natural casual conversation response
  static async generateCasualResponse(message, context) {
    const systemPrompt = `You are a friendly alumni network assistant. Be human, warm, and conversational.

Rules:
- Be friendly and conversational
- Keep responses natural and warm
- 2-3 sentences maximum
- Sound helpful and approachable
- Match the user's energy

Examples:
User: "how are you" → "Doing great! How about you?"
User: "thanks" → "Happy to help! 😊"
User: "what's up" → "Hey! Ready to help you connect!"`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return completion.choices[0].message.content;
  }

  // Generate Jagriti Yatra information response - Direct search and answer
  static async generateJagritiResponse(message, context) {
    const systemPrompt = `You are an expert on Jagriti Yatra, a transformative train journey for young entrepreneurs across India.

Key facts:
- Founded by Shashank Mani in 2008
- 15-day, 8000km train journey across India
- 450 young participants (age 20-27) per year
- Visits 12-15 locations including metros and villages
- Focus: Building India through enterprise
- Impact: 7000+ alumni, 500+ enterprises started

Answer the specific question in 4 concise lines. Be accurate and inspiring.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.4,
      max_tokens: 200,
    });

    return completion.choices[0].message.content;
  }

  // Generate general knowledge response with profile suggestions
  static async generateKnowledgeResponse(message, context) {
    const systemPrompt = `You are a knowledgeable assistant. Answer the question in 4 clear, informative lines.
Be accurate, helpful, and conversational. After answering, mention if alumni with related expertise are available.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    let response = completion.choices[0].message.content;
    
    // Extract and store topic for future follow-up queries
    const topic = this.extractTopicFromMessage(message);
    if (topic && context.whatsappNumber) {
      await this.storeCurrentTopic(context.whatsappNumber, topic);
    }

    // Auto-search for relevant alumni profiles using search service
    try {
      const searchService = require('./searchService');
      const searchResults = await searchService.comprehensiveAlumniSearch(topic || message, context.whatsappNumber || 'system');
      
      if (searchResults && typeof searchResults === 'string' && searchResults.length > 100) {
        response += '\n\n**Related Alumni:**\n\n' + searchResults;
      }
    } catch (error) {
      // If search fails, continue with just the knowledge response
    }

    return response;
  }

  // Generate search guidance response
  static async generateSearchGuidance(intent, context) {
    if (intent.searchTerms || intent.location) {
      return `I'll help you find ${intent.searchTerms || 'alumni'} ${intent.location ? `in ${intent.location}` : ''}.

Please complete your profile first to access our network of 9000+ alumni.
Type "hi" to start the quick profile completion process!`;
    }

    return `I can help you search for alumni with specific skills or from particular locations.

First, let's complete your profile to unlock search access.
Type "hi" to begin!`;
  }

  // Generate follow-up response based on context
  static async generateFollowUpResponse(message, intent, context) {
    const messageLower = message.toLowerCase();
    
    // Check if user is asking for profiles related to the last topic discussed
    if (messageLower.includes('any profiles') || messageLower.includes('profiles related') ||
        messageLower.includes('any more') || messageLower.includes('related to it') ||
        messageLower.includes('profiles for this')) {
      
      // Get the last response topic from context
      const lastTopic = context.lastResponseTopic || context.lastSearch;
      
      if (lastTopic) {
        // Use search service to find profiles for the last discussed topic
        try {
          const searchService = require('./searchService');
          const searchResults = await searchService.comprehensiveAlumniSearch(lastTopic, context.whatsappNumber || 'system');
          
          if (searchResults && typeof searchResults === 'string' && searchResults.length > 100) {
            // Clean formatting for follow-up searches
            const cleanedResults = searchResults.replace(/\*\*Related Alumni:\*\*\n\n/, '');
            return `**More ${lastTopic} professionals:**\n\n${cleanedResults}`;
          }
        } catch (error) {
          // Fall back to generic response
        }
      }
    }
    
    // If no specific topic context, provide helpful guidance
    if (!context.lastSearch && !context.lastResponseTopic) {
      return "What specific expertise or field would you like me to search for? I can help you find alumni with particular skills or from specific domains.";
    }

    const systemPrompt = `The user is asking a follow-up question to their previous conversation.
Previous topic: "${context.lastResponseTopic || context.lastSearch}"
Current message: "${message}"

Generate a helpful response that acknowledges the follow-up nature and guides them appropriately.
Keep it short (2-3 lines).`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.6,
      max_tokens: 100,
    });

    return completion.choices[0].message.content;
  }

  // Generate smart fallback response
  static async generateSmartFallback(message, context) {
    const systemPrompt = `The user said something we couldn't clearly categorize.
Generate a helpful response that:
1. Acknowledges their message
2. Offers relevant options (search, learn about Jagriti, chat)
3. Keeps it short and friendly (2-3 lines)`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    return completion.choices[0].message.content;
  }

  // Find relevant profiles using AI
  static async findRelevantProfiles(query, profiles, limit = 2) {
    if (!profiles || profiles.length === 0) return [];

    try {
      const profileSummaries = profiles
        .slice(0, 50)
        .map((p, i) => `${i}: ${p.name} - ${p.skills || p.company || p.about || 'No info'}`)
        .join('\n');

      const prompt = `Given the query "${query}", find the ${limit} most relevant profiles:

${profileSummaries}

Return only the indices as JSON array like [0, 5].`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 50,
      });

      const indices = JSON.parse(completion.choices[0].message.content);

      return indices
        .filter((i) => i < profiles.length)
        .map((i) => profiles[i])
        .slice(0, limit);
    } catch (error) {
      logError('Find relevant profiles error:', error);
      return profiles.slice(0, limit);
    }
  }

  // Get conversation context from MongoDB
  static async getConversationContext(whatsappNumber) {
    try {
      const db = getDatabase();

      // Get user's recent messages from MongoDB - ONLY LAST 2 MESSAGES to prevent session issues
      const recentMessages = await db
        .collection('conversations')
        .find({ whatsappNumber })
        .sort({ timestamp: -1 })
        .limit(2)
        .toArray();

      // Get user's last search
      const lastSearch = await db
        .collection('searches')
        .findOne({ whatsappNumber }, { sort: { timestamp: -1 } });

      // Get user profile completion status
      const user = await db.collection('users').findOne({ whatsappNumber });

      // Get the last response topic for context tracking
      const lastResponseTopic = await db
        .collection('conversation_topics')
        .findOne({ whatsappNumber }, { sort: { timestamp: -1 } });

      return {
        recentMessages: recentMessages.map((m) => ({
          message: m.message,
          intent: m.intent,
          timestamp: m.timestamp,
        })),
        lastSearch: lastSearch?.query || null,
        lastResponseTopic: lastResponseTopic?.topic || null,
        profileComplete: user?.enhancedProfile?.completed || false,
        userName: user?.enhancedProfile?.fullName || user?.basicProfile?.name || null,
        whatsappNumber: whatsappNumber,
        summary: {
          messageCount: recentMessages.length,
          lastActivity: recentMessages[0]?.timestamp || null,
          topics: [...new Set(recentMessages.map((m) => m.intent).filter(Boolean))],
        },
      };
    } catch (error) {
      logError('Get conversation context error:', error);
      return {
        recentMessages: [],
        lastSearch: null,
        profileComplete: false,
        summary: {},
      };
    }
  }

  // Store intent analysis in MongoDB for learning
  static async storeIntentAnalysis(whatsappNumber, message, analysis) {
    try {
      const db = getDatabase();

      await db.collection('conversations').insertOne({
        whatsappNumber,
        message,
        intent: analysis.intent,
        confidence: analysis.confidence,
        searchTerms: analysis.searchTerms,
        location: analysis.location,
        timestamp: new Date(),
        isFollowUp: analysis.isFollowUp || false,
      });

      // Update user's intent patterns
      await db.collection('user_patterns').updateOne(
        { whatsappNumber },
        {
          $inc: { [`intents.${analysis.intent}`]: 1 },
          $set: { lastActivity: new Date() },
          $push: {
            recentIntents: {
              $each: [analysis.intent],
              $slice: -10,
            },
          },
        },
        { upsert: true }
      );
    } catch (error) {
      logError('Store intent analysis error:', error);
    }
  }

  // Get fallback response for different intents
  static getFallbackResponse(intent) {
    const fallbacks = {
      casual_chat: 'Hey there! How can I help you today?',
      jagriti_info:
        'Jagriti Yatra is an incredible journey of entrepreneurship. What would you like to know?',
      general_knowledge: "That's an interesting question! Let me help you connect with experts.",
      profile_search: "I can help you find alumni. First, let's complete your profile!",
      location_search:
        'Looking for alumni from a specific location? Complete your profile to search!',
      follow_up: "Could you please clarify what you're looking for?",
      unknown:
        "I'm here to help! You can search for alumni, ask about Jagriti Yatra, or just chat.",
    };

    return fallbacks[intent.intent] || fallbacks.unknown;
  }

  // Enhance profile display with complete information
  static async enhanceProfileDisplay(profile) {
    if (!profile) return null;

    try {
      // Ensure all fields are complete
      const enhancedProfile = {
        name: profile.name || 'Alumni Member',
        about: profile.about || (await this.generateProfileSummary(profile)),
        skills: profile.skills || 'Not specified',
        company: profile.company || profile.organization || 'Not specified',
        location:
          profile.location ||
          `${profile.city || ''} ${profile.state || ''}`.trim() ||
          'Not specified',
        email: profile.email || profile.primaryEmail || 'Contact via network',
        linkedin: profile.linkedin
          ? profile.linkedin.startsWith('http')
            ? profile.linkedin
            : `https://linkedin.com/in/${profile.linkedin}`
          : 'Not available',
        experience: profile.experience || profile.professionalRole || 'Not specified',
      };

      // Generate enhanced about if needed
      if (!profile.about || profile.about.length < 50) {
        enhancedProfile.enhancedAbout = await this.generateProfileSummary(profile);
      }

      return enhancedProfile;
    } catch (error) {
      logError('Enhance profile display error:', error);
      return profile;
    }
  }

  // Extract search context from conversation
  static async extractSearchContext(currentMessage, context) {
    try {
      // Check if user is referring to "this domain" or "this field"
      const referentialPhrases = [
        'this domain',
        'this field',
        'this area',
        'that domain',
        'that field',
        'from there',
      ];
      const hasReference = referentialPhrases.some((phrase) =>
        currentMessage.toLowerCase().includes(phrase)
      );

      if (!hasReference) return null;

      // Look for topics in recent messages
      for (const msg of context.recentMessages) {
        // Check for general knowledge queries about specific domains
        if (msg.intent === 'general_knowledge') {
          // Extract the main topic from questions like "what is chemical engineering"
          const topicMatch = msg.message.match(
            /what is ([\w\s]+)|tell me about ([\w\s]+)|explain ([\w\s]+)/i
          );
          if (topicMatch) {
            const topic = topicMatch[1] || topicMatch[2] || topicMatch[3];
            if (topic && topic.length > 3) {
              return topic.trim();
            }
          }
        }
      }

      return null;
    } catch (error) {
      logError('Extract search context error:', error);
      return null;
    }
  }

  // Generate profile summary using AI
  static async generateProfileSummary(profile) {
    if (!openai) {
      return `${profile.professionalRole || 'Professional'} with expertise in ${profile.skills || 'various fields'}.`;
    }

    try {
      const prompt = `Create a professional 2-line bio for:
Name: ${profile.name}
Role: ${profile.professionalRole || 'Not specified'}
Company: ${profile.company || 'Not specified'}
Skills: ${profile.skills || 'Not specified'}

Write an engaging bio highlighting their expertise.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 80,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      return `${profile.professionalRole || 'Professional'} with expertise in ${profile.skills || 'various fields'}.`;
    }
  }

  // Generate show more results response
  static async generateShowMoreResponse(whatsappNumber) {
    try {
      const db = getDatabase();
      
      // Get stored overflow results
      const overflowData = await db.collection('search_overflow').findOne({ whatsappNumber });
      
      if (!overflowData || !overflowData.remainingResults || overflowData.remainingResults.length === 0) {
        return "No additional results to show. Try a new search!";
      }
      
      // Check if results are still fresh (within 10 minutes)
      const resultAge = (new Date() - new Date(overflowData.timestamp)) / 1000 / 60;
      if (resultAge > 10) {
        await db.collection('search_overflow').deleteOne({ whatsappNumber });
        return "Previous search results have expired. Please perform a new search!";
      }
      
      // Generate response for remaining results
      const searchService = require('./searchService');
      const response = await searchService.generateCleanSearchResponse(
        overflowData.remainingResults,
        overflowData.originalQuery,
        whatsappNumber
      );
      
      // Clear the overflow after showing
      await db.collection('search_overflow').deleteOne({ whatsappNumber });
      
      return `**Remaining results for "${overflowData.originalQuery}":**\n\n${response}`;
    } catch (error) {
      logError('Generate show more response error:', error);
      return "Unable to retrieve additional results. Please try a new search!";
    }
  }

  // Generate knowledge and connect response
  static async generateKnowledgeAndConnectResponse(message, context) {
    try {
      // Extract the topic from the message
      const topicMatch = message.match(/(?:define|explain|what is|tell me about)\s+(.+?)(?:\s+and\s+(?:can\s+)?connect|$)/i);
      const topic = topicMatch ? topicMatch[1] : intent.topic || message;
      
      // First, generate the knowledge response
      const knowledgePrompt = `Answer this question concisely in EXACTLY 5 lines.
Be informative, practical, and helpful. Each line should add value.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: knowledgePrompt },
          { role: 'user', content: `What is ${topic}?` },
        ],
        temperature: 0.6,
        max_tokens: 200,
      });

      let response = completion.choices[0].message.content;
      
      // Now search for relevant profiles
      const searchService = require('./searchService');
      const searchResults = await searchService.comprehensiveAlumniSearch(topic, context.whatsappNumber);
      
      // Combine the knowledge response with the search results
      response += '\n\n**Alumni who can help with ' + topic + ':**\n\n';
      response += searchResults;
      
      return response;
    } catch (error) {
      logError('Generate knowledge and connect response error:', error);
      // Fallback to regular knowledge response
      return await this.generateKnowledgeResponse(message, context);
    }
  }

  // Generate policy violation response
  static generatePolicyViolationResponse() {
    return `I understand you're looking for help, but I can't assist with topics related to adult content, inappropriate relationships, politics, or religious discussions.

I'm here to help you connect with Jagriti Yatra alumni for professional networking, career guidance, and business opportunities.

How can I help you with your professional journey today?`;
  }

  // Store current topic for follow-up context
  static async storeCurrentTopic(whatsappNumber, topic) {
    try {
      const db = getDatabase();
      
      await db.collection('conversation_topics').insertOne({
        whatsappNumber,
        topic: topic,
        timestamp: new Date(),
      });
      
      // Keep only last 5 topics to prevent database bloat
      const allTopics = await db
        .collection('conversation_topics')
        .find({ whatsappNumber })
        .sort({ timestamp: -1 })
        .skip(5)
        .toArray();
      
      if (allTopics.length > 0) {
        const idsToDelete = allTopics.map(t => t._id);
        await db.collection('conversation_topics').deleteMany({
          _id: { $in: idsToDelete }
        });
      }
    } catch (error) {
      logError('Store current topic error:', error);
    }
  }
  
  // Extract topic from user message for context tracking
  static extractTopicFromMessage(message) {
    const messageLower = message.toLowerCase();
    
    // Direct topic extractions
    if (messageLower.includes('fintech')) return 'fintech';
    if (messageLower.includes('agriculture') || messageLower.includes('farming') || messageLower.includes('agri')) return 'agriculture';
    if (messageLower.includes('doctor') || messageLower.includes('medical') || messageLower.includes('healthcare')) return 'healthcare';
    if (messageLower.includes('marketing')) return 'marketing';
    if (messageLower.includes('technology') || messageLower.includes('tech')) return 'technology';
    if (messageLower.includes('startup') || messageLower.includes('entrepreneur')) return 'startup';
    if (messageLower.includes('ai') || messageLower.includes('artificial intelligence')) return 'artificial intelligence';
    if (messageLower.includes('blockchain')) return 'blockchain';
    if (messageLower.includes('design')) return 'design';
    if (messageLower.includes('sales')) return 'sales';
    if (messageLower.includes('finance') || messageLower.includes('financial')) return 'finance';
    if (messageLower.includes('legal') || messageLower.includes('law')) return 'legal';
    if (messageLower.includes('consulting')) return 'consulting';
    if (messageLower.includes('education') || messageLower.includes('teaching')) return 'education';
    
    // Extract from "what is X" patterns
    const whatIsMatch = messageLower.match(/what is ([\w\s]+)/i);
    if (whatIsMatch) {
      return whatIsMatch[1].trim();
    }
    
    const tellMeAboutMatch = messageLower.match(/tell me about ([\w\s]+)/i);
    if (tellMeAboutMatch) {
      return tellMeAboutMatch[1].trim();
    }
    
    const explainMatch = messageLower.match(/explain ([\w\s]+)/i);
    if (explainMatch) {
      return explainMatch[1].trim();
    }
    
    const scopeMatch = messageLower.match(/scope in ([\w\s]+) field/i);
    if (scopeMatch) {
      return scopeMatch[1].trim();
    }
    
    return null;
  }
  
  // Extract search terms directly from message
  static extractSearchTermsFromMessage(message) {
    const messageLower = message.toLowerCase();
    
    // Remove common phrases to get the core search term
    let searchTerm = message;
    const phrasesToRemove = [
      'can you connect me with',
      'connect me with',
      'find me',
      'looking for',
      'i need',
      'show me',
      'any',
      'some',
      'the'
    ];
    
    phrasesToRemove.forEach(phrase => {
      const regex = new RegExp(phrase, 'gi');
      searchTerm = searchTerm.replace(regex, '').trim();
    });
    
    // If the message is just a profession/skill word, return it
    if (searchTerm && searchTerm.split(' ').length <= 3) {
      return searchTerm;
    }
    
    // Check for specific professions
    const professions = [
      'developers', 'developer', 'web developers', 'web developer',
      'lawyers', 'lawyer', 'doctors', 'doctor', 'engineers', 'engineer',
      'designers', 'designer', 'founders', 'founder', 'entrepreneurs', 'entrepreneur',
      'marketers', 'marketer', 'marketing', 'finance', 'financial',
      'consultants', 'consultant', 'analysts', 'analyst'
    ];
    
    for (const profession of professions) {
      if (messageLower.includes(profession)) {
        // Check if there's a modifier before the profession
        const regex = new RegExp(`(\\w+\\s+)?${profession}`, 'i');
        const match = message.match(regex);
        if (match) {
          return match[0].trim();
        }
      }
    }
    
    return searchTerm || message;
  }
  
  // Check if message contains specific profession
  static hasSpecificProfession(message) {
    const messageLower = message.toLowerCase();
    const professions = [
      'lawyer', 'lawyers', 'doctor', 'doctors', 'engineer', 'engineers',
      'teacher', 'teachers', 'nurse', 'nurses', 'accountant', 'accountants',
      'architect', 'architects', 'designer', 'designers', 'developer', 'developers',
      'manager', 'managers', 'consultant', 'consultants', 'analyst', 'analysts',
      'therapist', 'therapists', 'chef', 'chefs', 'pilot', 'pilots',
      'pharmacist', 'pharmacists', 'dentist', 'dentists', 'veterinarian', 'veterinarians',
      'journalist', 'journalists', 'photographer', 'photographers'
    ];
    
    return professions.some(profession => {
      // Check for exact word match
      const regex = new RegExp(`\\b${profession}\\b`, 'i');
      return regex.test(messageLower);
    });
  }
  
  // Extract specific profession from message
  static extractSpecificProfession(message) {
    const messageLower = message.toLowerCase();
    const professions = [
      'lawyer', 'lawyers', 'doctor', 'doctors', 'engineer', 'engineers',
      'teacher', 'teachers', 'nurse', 'nurses', 'accountant', 'accountants',
      'architect', 'architects', 'designer', 'designers', 'developer', 'developers',
      'manager', 'managers', 'consultant', 'consultants', 'analyst', 'analysts',
      'therapist', 'therapists', 'chef', 'chefs', 'pilot', 'pilots',
      'pharmacist', 'pharmacists', 'dentist', 'dentists', 'veterinarian', 'veterinarians',
      'journalist', 'journalists', 'photographer', 'photographers'
    ];
    
    for (const profession of professions) {
      const regex = new RegExp(`\\b${profession}\\b`, 'i');
      if (regex.test(messageLower)) {
        return profession;
      }
    }
    
    return null;
  }
}

module.exports = UnifiedIntelligenceService;
