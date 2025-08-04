// Intent Detection Service
// Analyzes user messages to determine intent and provide contextual responses

const { logError, logSuccess } = require('../middleware/logging');
const userContextService = require('./userContextService');

class IntentDetectionService {
  constructor() {
    // Intent patterns with confidence scores
    this.intentPatterns = {
      greeting: {
        patterns: [
          /^(hi|hello|hey|hola|namaste|good\s*(morning|afternoon|evening))$/i,
          /^(what'?s up|howdy|greetings)$/i,
          /^(yo|hii+|hel+o+)$/i
        ],
        confidence: 0.9
      },
      
      profile_view: {
        patterns: [
          /\b(view|show|see|check|display)\s*(my)?\s*profile/i,
          /\bmy\s*(profile|information|details|info)/i,
          /\bprofile\s*status/i,
          /\bwhat'?s\s*my\s*profile/i
        ],
        confidence: 0.85
      },
      
      profile_update: {
        patterns: [
          /\b(update|edit|change|modify|complete)\s*(my)?\s*profile/i,
          /\b(add|fill|enter)\s*(my)?\s*(details|information|info)/i,
          /\bcomplete\s*registration/i,
          /\bprofile\s*completion/i
        ],
        confidence: 0.85
      },
      
      search: {
        patterns: [
          /\b(search|find|look for|looking for|show me|list)\s+.*(people|members|alumni|professionals?)/i,
          /\b(who|anyone|someone|people)\s+.*(work|working|from|in|at|with)/i,
          /\b(developers?|designers?|founders?|entrepreneurs?|students?)\s+(in|from|at)/i,
          /\bshow\s*me\s*.*(from|in|at|working)/i,
          /\b(need|want|looking for)\s+.*(contact|connect|help)/i,
          /\b(anyone|people|alumni|yatris?)\s+(from|in)\s+\w+/i,
          /\b(web\s*developers?|app\s*developers?|software\s*engineers?)/i,
          /\blist\s*(of)?\s*(people|alumni|yatris?|members)/i,
          /\bimport\s*(export|and\s*export)?\s*(business|professionals?)?/i,
          /\bexport\s*(import|and\s*import)?\s*(business|professionals?)?/i,
          /\bcontent\s*creators?/i,
          /\b(pune|mumbai|delhi|bangalore|hyderabad|chennai|kolkata)/i,
          /\b(coep|iit|nit|bits)\b/i
        ],
        confidence: 0.8
      },
      
      help: {
        patterns: [
          /\b(help|assist|support|guide|how\s*to)/i,
          /\bwhat\s*can\s*(you|i)\s*do/i,
          /\b(commands?|options?|features?)/i,
          /\bdon'?t\s*know\s*what/i
        ],
        confidence: 0.85
      },
      
      connection_request: {
        patterns: [
          /\b(connect|contact|reach out|talk to|meet|introduce)/i,
          /\b(how\s*to|can\s*i|help\s*me)\s*(connect|contact|reach)/i,
          /\bget\s*in\s*touch/i,
          /\bintroduction\s*to/i
        ],
        confidence: 0.8
      },
      
      specific_field_update: {
        patterns: [
          /\b(my\s*)?(name|email|phone|gender|role|domain|country|linkedin)\s*is\s*/i,
          /\b(change|update)\s*(my\s*)?(name|email|phone|gender|role|domain|country|linkedin)/i,
          /\badd\s*(my\s*)?(skills?|experience|education)/i
        ],
        confidence: 0.9
      },
      
      acknowledgment: {
        patterns: [
          /^(yes|yeah|yep|sure|okay|ok|alright|correct|right)$/i,
          /^(no|nope|nah|wrong|incorrect)$/i,
          /^(thanks?|thank\s*you|ty|thx)$/i,
          /^(got\s*it|understood|noted)$/i,
          /^(done|finished|completed|profile\s*(done|completed))$/i
        ],
        confidence: 0.95
      },
      
      exit: {
        patterns: [
          /\b(bye|goodbye|exit|quit|stop|cancel|leave)/i,
          /\b(talk\s*later|see\s*you|ttyl)/i,
          /\bend\s*(chat|conversation)/i
        ],
        confidence: 0.9
      }
    };
    
    // Context-based intent refinement
    this.contextualIntents = {
      profile_incomplete: ['profile_update', 'specific_field_update'],
      recent_search: ['search', 'connection_request'],
      first_time_user: ['greeting', 'help', 'profile_update']
    };
  }
  
  // Detect intent from user message
  async detectIntent(message, whatsappNumber) {
    try {
      // Get user context
      const context = await userContextService.getUserContext(whatsappNumber);
      
      // Primary intent detection
      const primaryIntent = this.detectPrimaryIntent(message);
      
      // Refine based on context
      const refinedIntent = await this.refineIntentWithContext(
        primaryIntent,
        message,
        context
      );
      
      // Update user context with detected intent
      if (refinedIntent.type !== 'unknown') {
        await userContextService.updateUserIntent(
          whatsappNumber,
          refinedIntent.type,
          refinedIntent.confidence
        );
      }
      
      logSuccess('intent_detected', {
        whatsappNumber,
        intent: refinedIntent.type,
        confidence: refinedIntent.confidence
      });
      
      return refinedIntent;
    } catch (error) {
      logError(error, { operation: 'detectIntent', whatsappNumber });
      return { type: 'unknown', confidence: 0 };
    }
  }
  
  // Detect primary intent from patterns
  detectPrimaryIntent(message) {
    let bestMatch = { type: 'unknown', confidence: 0 };
    
    for (const [intentType, { patterns, confidence }] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              type: intentType,
              confidence,
              pattern: pattern.toString()
            };
          }
        }
      }
    }
    
    return bestMatch;
  }
  
  // Refine intent based on context
  async refineIntentWithContext(primaryIntent, message, context) {
    if (!context) return primaryIntent;
    
    let refinedIntent = { ...primaryIntent };
    
    // Check if message contains specific field names
    const fieldMentions = this.detectFieldMentions(message);
    if (fieldMentions.length > 0) {
      refinedIntent = {
        type: 'specific_field_update',
        confidence: 0.95,
        fields: fieldMentions,
        originalIntent: primaryIntent.type
      };
    }
    
    // If profile is incomplete and user seems confused
    if (!context.profileStatus.completed && 
        primaryIntent.type === 'unknown' &&
        context.engagement.totalInteractions < 5) {
      refinedIntent = {
        type: 'help',
        confidence: 0.7,
        reason: 'new_user_confusion'
      };
    }
    
    // If user recently searched and mentions names
    if (context.insights.searchPatterns.length > 0 &&
        this.containsPersonName(message) &&
        primaryIntent.type !== 'search') {
      refinedIntent = {
        type: 'connection_request',
        confidence: 0.8,
        originalIntent: primaryIntent.type
      };
    }
    
    // Handle follow-up intents
    if (primaryIntent.type === 'acknowledgment') {
      refinedIntent = await this.determineAcknowledgmentContext(
        message,
        context
      );
    }
    
    return refinedIntent;
  }
  
  // Detect field mentions in message
  detectFieldMentions(message) {
    const fields = [
      'name', 'email', 'phone', 'gender', 'role', 'domain',
      'country', 'state', 'city', 'linkedin', 'skills',
      'company', 'experience', 'education'
    ];
    
    const mentioned = [];
    const lowerMessage = message.toLowerCase();
    
    fields.forEach(field => {
      if (lowerMessage.includes(field)) {
        mentioned.push(field);
      }
    });
    
    return mentioned;
  }
  
  // Check if message contains person names
  containsPersonName(message) {
    // Simple heuristic: check for capitalized words that might be names
    const words = message.split(/\s+/);
    const namePattern = /^[A-Z][a-z]+$/;
    
    return words.some(word => namePattern.test(word));
  }
  
  // Determine context for acknowledgment
  async determineAcknowledgmentContext(message, context) {
    const lastIntent = context.intents.current?.type;
    const isPositive = /^(yes|yeah|yep|sure|okay|ok|correct|right)$/i.test(message);
    
    if (!lastIntent) {
      return {
        type: 'acknowledgment',
        confidence: 0.95,
        sentiment: isPositive ? 'positive' : 'negative'
      };
    }
    
    // Map acknowledgment to appropriate action
    const intentMap = {
      'profile_update': isPositive ? 'profile_update' : 'help',
      'connection_request': isPositive ? 'connection_request' : 'search',
      'help': isPositive ? 'help' : 'exit'
    };
    
    return {
      type: intentMap[lastIntent] || 'acknowledgment',
      confidence: 0.9,
      previousIntent: lastIntent,
      sentiment: isPositive ? 'positive' : 'negative'
    };
  }
  
  // Get intent suggestions based on context
  async getIntentSuggestions(context) {
    const suggestions = [];
    
    // Profile completion suggestion
    if (!context.profileStatus.completed) {
      suggestions.push({
        intent: 'profile_update',
        priority: 1,
        message: 'Complete your profile'
      });
    }
    
    // Search suggestion
    if (context.engagement.totalInteractions > 3 && 
        context.insights.searchPatterns.length === 0) {
      suggestions.push({
        intent: 'search',
        priority: 2,
        message: 'Search for alumni members'
      });
    }
    
    // Connection suggestion
    if (context.relationships.searchedProfiles.length > 0 &&
        context.relationships.connectionsMade.length === 0) {
      suggestions.push({
        intent: 'connection_request',
        priority: 2,
        message: 'Connect with members you viewed'
      });
    }
    
    return suggestions.sort((a, b) => a.priority - b.priority);
  }
  
  // Generate contextual response based on intent
  async generateContextualResponse(intent, context) {
    const responses = {
      greeting: {
        new_user: "Welcome! I'm here to help you connect with the alumni community. Would you like to complete your profile first?",
        returning_user: "Welcome back! How can I assist you today?",
        incomplete_profile: "Good to see you! Ready to complete your profile? You're almost there!"
      },
      
      profile_update: {
        first_time: "Let's get your profile set up! I'll guide you through each step.",
        incomplete: `Let's complete your profile. You have ${context.profileStatus.incompleteFields.length} fields remaining.`,
        complete: "Your profile is already complete! Would you like to update any specific information?"
      },
      
      search: {
        general: "I can help you find alumni members. What are you looking for?",
        specific: "I'll search for members matching your criteria.",
        no_profile: "Please complete your profile first to search for other members."
      },
      
      help: {
        general: "I can help you with:\n• Completing your profile\n• Searching for alumni\n• Connecting with members\n• Updating your information\n\nWhat would you like to do?",
        new_user: "Welcome! I'm your alumni network assistant. I can help you create your profile and connect with other members. Shall we start with your profile?"
      }
    };
    
    // Select appropriate response variant
    const responseSet = responses[intent.type] || responses.help;
    let variant = 'general';
    
    if (intent.type === 'greeting') {
      if (context.engagement.totalInteractions === 0) variant = 'new_user';
      else if (!context.profileStatus.completed) variant = 'incomplete_profile';
      else variant = 'returning_user';
    } else if (intent.type === 'profile_update') {
      if (context.profileStatus.completed) variant = 'complete';
      else if (context.engagement.totalInteractions === 0) variant = 'first_time';
      else variant = 'incomplete';
    } else if (intent.type === 'search' && !context.profileStatus.completed) {
      variant = 'no_profile';
    }
    
    return responseSet[variant] || responseSet.general || "How can I help you?";
  }
}

module.exports = new IntentDetectionService();