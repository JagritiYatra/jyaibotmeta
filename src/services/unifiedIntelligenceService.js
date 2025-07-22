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
      // Get conversation context from MongoDB
      const context = await this.getConversationContext(whatsappNumber);

      const systemPrompt = `You are an intelligent assistant for Jagriti Yatra alumni network.
            
Analyze the user's message considering their last 3 messages for context.

Determine:
1. Primary intent - Choose the MOST appropriate:
   - "casual_chat" - Greetings, thanks, how are you, general conversation
   - "jagriti_info" - Questions about Jagriti Yatra, JECP, team, vision, route
   - "general_knowledge" - Questions like "what is X", "tell me about Y"
   - "profile_search" - Looking for people/alumni with skills, asking "can you find someone", "any X in the list", "help me find", "is there anyone"
   - "location_search" - Looking for people from specific places
   - "follow_up_search" - Asking for people after learning about a topic (e.g., after asking about chemical engineering, then asking "find someone from this domain")

2. Extract key information:
   - searchTerms: Skills/expertise they're looking for
   - location: Specific location mentioned
   - topic: Main subject of discussion
   - isFollowUp: true if continuing previous conversation
   - needsProfiles: true if response should include profile suggestions
   
IMPORTANT: If user asks variations of "can you help find someone", "any X in the list", "someone from this domain/field" - mark intent as profile_search
If the previous message was about a topic and now they ask for "someone from this domain" - use the topic as searchTerms

Context of last 3 messages: ${JSON.stringify(context.recentMessages)}

Return JSON: {intent, searchTerms, location, topic, isFollowUp, needsProfiles, confidence}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const analysis = JSON.parse(completion.choices[0].message.content);

      // Enhanced context extraction for follow-up searches
      if (
        (analysis.intent === 'profile_search' || analysis.intent === 'follow_up_search') &&
        (!analysis.searchTerms || analysis.searchTerms === 'this domain')
      ) {
        // Extract domain/topic from recent messages
        const extractedContext = await this.extractSearchContext(message, context);
        if (extractedContext) {
          analysis.searchTerms = extractedContext;
          analysis.isFollowUp = true;
        }
      }

      // Store intent in MongoDB for learning
      await this.storeIntentAnalysis(whatsappNumber, message, analysis);

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
      // Get user context and history
      const context = await this.getConversationContext(whatsappNumber);

      switch (intent.intent) {
        case 'casual_chat':
          return await this.generateCasualResponse(message, context);

        case 'jagriti_info':
          return await this.generateJagritiResponse(message, context);

        case 'general_knowledge':
          return await this.generateKnowledgeResponse(message, context, additionalContext.profiles);

        case 'profile_search':
        case 'location_search':
          return await this.generateSearchGuidance(intent, context);

        case 'follow_up':
          return await this.generateFollowUpResponse(message, intent, context);

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
    const systemPrompt = `You are a friendly, warm chatbot for Jagriti Yatra alumni.

Generate a SHORT (1-2 lines), natural response to the user's message.
Be conversational and engaging. If appropriate, gently guide toward using bot features.
Use maximum 1 emoji. Be warm but professional.

User's recent context: ${JSON.stringify(context.summary)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.8,
      max_tokens: 100,
    });

    return completion.choices[0].message.content;
  }

  // Generate Jagriti Yatra information response
  static async generateJagritiResponse(message, context) {
    const jagritiKnowledge = {
      overview:
        'Jagriti Yatra is a 15-day, 8000km train journey across India for 450 young changemakers to meet social and business entrepreneurs.',
      vision: 'Building India through enterprise - inspiring youth to become job creators.',
      mission:
        'Creating a national ecosystem of enterprise through experiential learning and peer engagement.',
      route:
        'Covers 12-15 locations including Mumbai, Bengaluru, Chennai, Delhi, visiting metros and villages.',
      team: 'Founded by Shashank Mani in 2008, run by dedicated professionals.',
      impact: '7000+ alumni, 500+ enterprises started, thousands of jobs created.',
    };

    const systemPrompt = `You are an expert on Jagriti Yatra. Use this knowledge:
${JSON.stringify(jagritiKnowledge, null, 2)}

Answer the user's question in EXACTLY 4-5 short lines.
Be inspiring, accurate, and concise. Focus on impact and transformation.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.5,
      max_tokens: 150,
    });

    return completion.choices[0].message.content;
  }

  // Generate general knowledge response with profile suggestions
  static async generateKnowledgeResponse(message, context, availableProfiles = []) {
    const systemPrompt = `Answer this question concisely in EXACTLY 5 lines.
Be informative, practical, and helpful. Each line should add value.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.6,
      max_tokens: 200,
    });

    let response = completion.choices[0].message.content;

    // Find relevant profiles if available
    if (availableProfiles && availableProfiles.length > 0) {
      const relevantProfiles = await this.findRelevantProfiles(message, availableProfiles);
      if (relevantProfiles.length > 0) {
        response += '\n\n**Alumni who might help:**';
        relevantProfiles.forEach((profile) => {
          response += `\n• ${profile.name} - ${profile.enhancedAbout || profile.about}`;
        });
      }
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
    if (!context.lastSearch) {
      return "I'm not sure what you're referring to. Could you please clarify what you're looking for?";
    }

    const systemPrompt = `The user is asking a follow-up question to their previous search.
Previous search: "${context.lastSearch}"
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

      // Get user's recent messages from MongoDB
      const recentMessages = await db
        .collection('conversations')
        .find({ whatsappNumber })
        .sort({ timestamp: -1 })
        .limit(3)
        .toArray();

      // Get user's last search
      const lastSearch = await db
        .collection('searches')
        .findOne({ whatsappNumber }, { sort: { timestamp: -1 } });

      // Get user profile completion status
      const user = await db.collection('users').findOne({ whatsappNumber });

      return {
        recentMessages: recentMessages.map((m) => ({
          message: m.message,
          intent: m.intent,
          timestamp: m.timestamp,
        })),
        lastSearch: lastSearch?.query || null,
        profileComplete: user?.enhancedProfile?.completed || false,
        userName: user?.enhancedProfile?.fullName || user?.basicProfile?.name || null,
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
}

module.exports = UnifiedIntelligenceService;
