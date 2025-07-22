// Enhanced intent detection service with improved accuracy
// File: src/services/intentDetection.js
// FIXED VERSION - Properly handles profile updates and URLs

const OpenAI = require('openai');
const { getConfig } = require('../config/environment');
const { logError, logAIOperation } = require('../middleware/logging');
const { sanitizeInput } = require('../utils/validation');

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
  console.warn('⚠️ OpenAI not initialized for intent detection');
}

// Enhanced search keywords
const SEARCH_KEYWORDS = [
  // General help terms
  'help',
  'need',
  'looking',
  'find',
  'search',
  'connect',
  'assistance',
  'support',
  'want',
  'require',
  'someone',
  'anyone',
  'somebody',
  'people',
  'person',
  'alumni',
  'member',
  'from this domain',
  'in the list',
  'can you',
  'could you',
  'would you',
  'any',
  'is there',

  // Technical skills
  'developer',
  'development',
  'react',
  'javascript',
  'python',
  'java',
  'web development',
  'app development',
  'frontend',
  'backend',
  'fullstack',
  'devops',
  'software',
  'programming',
  'coding',
  'engineer',
  'mobile app',
  'android',
  'ios',
  'flutter',
  'nodejs',
  'angular',
  'vue',
  'database',
  'ai',
  'ml',
  'data scientist',
  'data analyst',
  'machine learning',
  'artificial intelligence',
  'blockchain',
  'cybersecurity',
  'cloud computing',
  'aws',
  'azure',
  'docker',
  'kubernetes',

  // Business roles
  'entrepreneur',
  'startup',
  'business',
  'marketing',
  'sales',
  'finance',
  'legal',
  'accounting',
  'consultant',
  'mentor',
  'advisor',
  'investor',
  'funding',
  'partnership',
  'strategy',
  'ceo',
  'founder',
  'business development',
  'product manager',
  'project manager',
  'operations',
  'hr',
  'recruitment',

  // Industries
  'fintech',
  'edtech',
  'healthtech',
  'agritech',
  'manufacturing',
  'healthcare',
  'pharmaceutical',
  'education',
  'agriculture',
  'technology',
  'media',
  'entertainment',
  'retail',
  'ecommerce',
  'logistics',
  'transportation',
  'energy',
  'renewable',
  'sustainability',
  'environment',
  'construction',
  'real estate',
  'hospitality',
  'tourism',
  'food',
  'beverage',
  'fashion',

  // Professional services
  'designer',
  'ux',
  'ui',
  'graphic design',
  'content writer',
  'copywriter',
  'researcher',
  'analyst',
  'freelancer',
  'specialist',
  'expert',
  'professional',
  'architect',
  'manager',
  'director',
  'executive',
  'lead',
  'head',
  'chief',
  'senior',
  'junior',

  // Cities
  'mumbai',
  'delhi',
  'bangalore',
  'hyderabad',
  'chennai',
  'kolkata',
  'pune',
  'ahmedabad',
  'new york',
  'san francisco',
  'london',
  'toronto',
  'sydney',
  'singapore',
  'dubai',

  // Support types
  'advice',
  'guidance',
  'mentorship',
  'feedback',
  'insights',
  'experience',
  'networking',
  'collaboration',
  'partnership',
  'consultation',
  'coaching',
  'training',
  'workshop',
  'internship',
  'job',
  'opportunity',
  'career',
  'growth',
  'learning',
];

// Skip keywords
const SKIP_KEYWORDS = [
  'later',
  'skip',
  'not now',
  'maybe later',
  'stop',
  'pause',
  'cancel',
  'exit',
  'quit',
  'pass',
  'next time',
  'not interested',
  'wait',
  'postpone',
  'defer',
  'delay',
];

// Main intent detection function
function detectUserIntent(message, userContext = {}) {
  const msg = message.toLowerCase().trim();
  const sanitizedMessage = sanitizeInput(message);

  console.log(
    `🧠 Analyzing intent for: "${sanitizedMessage.substring(0, 50)}${sanitizedMessage.length > 50 ? '...' : ''}"`
  );
  console.log(`📍 Current state: ${userContext.waiting_for}`);

  // Check profile completion status
  const isProfileComplete =
    userContext.authenticated && userContext.user_data?.enhancedProfile?.completed;
  const isInProfileUpdate = userContext.waiting_for?.startsWith('updating_');

  // CRITICAL FIX: If user is updating profile fields, ALWAYS treat input as profile data
  if (isInProfileUpdate) {
    const currentField = userContext.waiting_for.replace('updating_', '');
    console.log(`📝 User is updating field: ${currentField}`);

    // Only check for skip/stop commands
    const skipIntent = detectSkipIntent(msg);
    if (skipIntent.detected) {
      return {
        type: 'skip_profile',
        confidence: skipIntent.confidence,
        allowedDuringProfile: true,
      };
    }

    // For LinkedIn field, accept URLs as profile input
    if (
      currentField === 'linkedin' &&
      (msg.includes('linkedin') || msg.includes('http') || msg.includes('.com'))
    ) {
      console.log(`🔗 LinkedIn URL detected during profile update`);
      return {
        type: 'profile_input',
        field: currentField,
        value: sanitizedMessage,
        confidence: 'high',
        allowedDuringProfile: true,
      };
    }

    // For Instagram field
    if (currentField === 'instagram' || userContext.waiting_for === 'instagram_url_input') {
      return {
        type: 'profile_input',
        field: currentField,
        value: sanitizedMessage,
        confidence: 'high',
        allowedDuringProfile: true,
      };
    }

    // For additional email input
    if (userContext.waiting_for === 'additional_email_input') {
      return {
        type: 'profile_input',
        field: 'additionalEmailInput',
        value: sanitizedMessage,
        confidence: 'high',
        allowedDuringProfile: true,
      };
    }

    // Default: treat as profile input
    return {
      type: 'profile_input',
      field: currentField,
      value: sanitizedMessage,
      confidence: 'high',
      allowedDuringProfile: true,
    };
  }

  // 1. Email Pattern Detection
  if (msg.includes('@') && msg.includes('.')) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch = sanitizedMessage.match(emailRegex);
    if (emailMatch) {
      return {
        type: 'email_input',
        email: emailMatch[0],
        confidence: 'high',
      };
    }
  }

  // 2. OTP Pattern Detection
  if (/^\s*\d{6}\s*$/.test(msg)) {
    return {
      type: 'otp_verification',
      otp: msg.replace(/\s/g, ''),
      confidence: 'high',
    };
  }

  // 3. Skip/Later Intent
  const skipIntent = detectSkipIntent(msg);
  if (skipIntent.detected) {
    return {
      type: 'skip_profile',
      confidence: skipIntent.confidence,
      allowedDuringProfile: true,
    };
  }

  // 4. Profile update request
  if (detectProfileUpdateIntent(msg)) {
    return {
      type: 'profile_update',
      confidence: 'medium',
      allowedDuringProfile: true,
    };
  }

  // 5. Yes/No Responses
  const yesNoIntent = detectYesNoIntent(msg);
  if (yesNoIntent.detected) {
    return {
      type: yesNoIntent.value ? 'affirmative' : 'negative',
      confidence: yesNoIntent.confidence,
      allowedDuringProfile: true,
    };
  }

  // 6. Numeric Input
  if (/^\s*\d+(\s*,\s*\d+)*\s*$/.test(msg)) {
    return {
      type: 'numeric_input',
      numbers: msg.match(/\d+/g).map((n) => parseInt(n)),
      confidence: 'high',
      allowedDuringProfile: true,
    };
  }

  // 7. Check for follow-up search queries BEFORE casual intent
  const followUpIntent = detectFollowUpSearchIntent(msg, userContext);
  if (followUpIntent.detected) {
    return {
      type: 'follow_up_search',
      originalMessage: sanitizedMessage,
      refinementType: followUpIntent.refinementType,
      refinementValue: followUpIntent.refinementValue,
      confidence: followUpIntent.confidence,
      allowedDuringProfile: false,
    };
  }

  // 8. Greetings and casual conversation
  const casualIntent = detectCasualIntent(msg);
  if (casualIntent.detected) {
    // Don't treat "thank you" as requiring a full reset
    if (casualIntent.subtype === 'thanks' && userContext.lastActivity === 'search_results') {
      return {
        type: 'acknowledgment',
        subtype: 'thanks',
        message: sanitizedMessage,
        confidence: 'high',
        allowedDuringProfile: false,
      };
    }

    return {
      type: 'casual',
      subtype: casualIntent.subtype,
      message: sanitizedMessage,
      confidence: casualIntent.confidence,
      allowedDuringProfile: casualIntent.subtype === 'greeting',
    };
  }

  // 8. Search Intent Detection (only if not in profile update)
  if (!isInProfileUpdate) {
    const searchIntent = detectSearchIntent(msg, sanitizedMessage);
    if (searchIntent.detected) {
      return {
        type: 'search',
        query: sanitizedMessage,
        confidence: searchIntent.confidence,
        keywords: searchIntent.keywords,
        profileComplete: isProfileComplete,
        blocked: !isProfileComplete,
      };
    }
  }

  // 9. Default response based on context
  if (userContext.authenticated && !isInProfileUpdate && sanitizedMessage.length > 8) {
    // Check if it might be a search
    const hasSearchIndicators =
      SEARCH_KEYWORDS.some((keyword) => msg.includes(keyword)) || msg.includes('?');

    if (hasSearchIndicators) {
      return {
        type: 'search',
        query: sanitizedMessage,
        confidence: 'low',
        source: 'fallback',
        profileComplete: isProfileComplete,
        blocked: !isProfileComplete,
      };
    }
  }

  // 10. Generic response
  return {
    type: 'casual',
    subtype: 'generic',
    message: sanitizedMessage,
    confidence: 'low',
    allowedDuringProfile: false,
  };
}

// Enhanced search intent detection
function detectSearchIntent(msg, originalMessage) {
  // Don't detect search if message contains profile-related URLs
  if (
    msg.includes('linkedin.com') ||
    msg.includes('instagram.com') ||
    msg.includes('.com/in/') ||
    msg.includes('@')
  ) {
    return { detected: false };
  }

  let confidence = 'low';
  const matchedKeywords = [];

  // Check for keyword matches
  const keywordMatches = SEARCH_KEYWORDS.filter((keyword) => {
    const variations = [
      keyword,
      `${keyword}s`,
      `${keyword}er`,
      `${keyword}ing`,
      `${keyword}ed`,
      `${keyword}ist`,
    ];

    return variations.some((variation) => {
      if (msg.includes(variation)) {
        matchedKeywords.push(keyword);
        return true;
      }
      return false;
    });
  });

  // Search patterns
  const searchPatterns = [
    /i\s+(need|want|require|looking for).*(help|support|assistance|expert|guidance)/,
    /looking\s+for.*(expert|developer|help|advice|mentor|professional)/,
    /(need|want)\s+.*(developer|expert|help|advice|mentor|consultant)/,
    /help.*(with|in|for|about)/,
    /(expert|specialist|professional).*(in|for|with)/,
    /(advice|guidance|mentorship).*(on|for|about|with)/,
    /connect.*(with|to|me with)/,
    /find.*(someone|expert|help|person|professional)/,
    /(work|job|opportunity).*(in|with|for)/,
    /(startup|business|company).*(founder|entrepreneur|advisor)/,
    /(tech|technology|it).*(expert|professional|developer)/,
    /(marketing|sales|finance).*(expert|professional|specialist)/,
    /(professional|expert|developer).*(in|from|near)/,
    /(react|python|javascript|java|node).*(developer|expert)/,
    /(ui|ux|design).*(expert|professional)/,
    /(finance|accounting|legal).*(expert|advisor)/,
    // Conversational search patterns
    /can you.*(help|find|show).*(someone|anyone|people|person)/,
    /help.*to find.*(someone|anyone|people|person)/,
    /find.*someone.*(from|in|with).*domain/,
    /any.*(professional|expert|person|alumni).*(in|from|with)/,
    /anyone.*(who|that|with|from)/,
    /is there.*(anyone|someone|any)/,
    /do you.*(know|have).*(anyone|someone)/,
    /(someone|anyone|people).*(from|in).*this.*(domain|field|area)/,
    /any.*in the list/,
    /show me.*(profiles|people|alumni|experts)/,
    /list.*(of|all).*(people|alumni|experts)/,
  ];

  const hasSearchPattern = searchPatterns.some((pattern) => pattern.test(msg));

  // Confidence determination
  if (hasSearchPattern && keywordMatches.length >= 2) {
    confidence = 'high';
  } else if (hasSearchPattern || keywordMatches.length >= 2) {
    confidence = 'medium';
  } else if (keywordMatches.length >= 1 && originalMessage.length > 15) {
    confidence = 'medium';
  } else if (keywordMatches.length >= 1) {
    confidence = 'low';
  }

  // Additional indicators
  const additionalIndicators = [
    msg.includes('?'),
    originalMessage.length > 30,
    /\b(who|what|where|how|when)\b/.test(msg),
    /\b(can|could|would|should)\b/.test(msg),
    /\b(anyone|somebody|someone)\b/.test(msg),
  ];

  const indicatorCount = additionalIndicators.filter(Boolean).length;
  if (indicatorCount >= 2) {
    confidence = confidence === 'low' ? 'medium' : 'high';
  }

  const detected =
    hasSearchPattern ||
    keywordMatches.length > 0 ||
    (originalMessage.length > 25 && indicatorCount >= 2);

  return {
    detected,
    confidence,
    keywords: matchedKeywords,
    patterns: hasSearchPattern,
    indicators: indicatorCount,
  };
}

// Skip intent detection
function detectSkipIntent(msg) {
  const skipMatches = SKIP_KEYWORDS.filter((skip) => msg.includes(skip));

  if (skipMatches.length > 0) {
    const strongSkipWords = ['stop', 'cancel', 'quit', 'exit'];
    const mediumSkipWords = ['skip', 'later', 'pause'];

    let confidence = 'low';
    if (skipMatches.some((skip) => strongSkipWords.includes(skip))) {
      confidence = 'high';
    } else if (skipMatches.some((skip) => mediumSkipWords.includes(skip))) {
      confidence = 'medium';
    }

    return { detected: true, confidence, keywords: skipMatches };
  }

  return { detected: false };
}

// Profile update intent detection
function detectProfileUpdateIntent(msg) {
  const profileKeywords = ['update', 'edit', 'change', 'modify', 'complete', 'finish'];
  const targetKeywords = ['profile', 'details', 'info', 'information', 'data'];

  const hasProfileKeyword = profileKeywords.some((keyword) => msg.includes(keyword));
  const hasTargetKeyword = targetKeywords.some((keyword) => msg.includes(keyword));

  if (msg === 'update profile' || msg === 'complete profile' || msg === 'edit profile') {
    return true;
  }

  return hasProfileKeyword && hasTargetKeyword;
}

// Yes/No intent detection
function detectYesNoIntent(msg) {
  const yesVariations = [
    'yes',
    'y',
    'yeah',
    'yep',
    'sure',
    'ok',
    'okay',
    'alright',
    '1',
    'correct',
    'right',
  ];
  const noVariations = ['no', 'n', 'nope', 'not', 'cancel', 'nah', '2', 'wrong', 'incorrect'];

  const isYes = yesVariations.some(
    (variation) =>
      msg === variation || msg.startsWith(`${variation} `) || msg.endsWith(` ${variation}`)
  );
  const isNo = noVariations.some(
    (variation) =>
      msg === variation || msg.startsWith(`${variation} `) || msg.endsWith(` ${variation}`)
  );

  if (isYes) {
    return { detected: true, value: true, confidence: 'high' };
  }
  if (isNo) {
    return { detected: true, value: false, confidence: 'high' };
  }

  return { detected: false };
}

// Detect follow-up search intent
function detectFollowUpSearchIntent(msg, userContext) {
  // Check if there was a recent search
  if (!userContext || !userContext.lastActivity || userContext.lastActivity !== 'search_results') {
    return { detected: false };
  }

  const lowerMsg = msg.toLowerCase();

  // Location-based refinements
  const locationPatterns = [
    /(?:from|in|at|near)\s+(\w+)/i,
    /candidates?\s+(?:from|in)\s+(\w+)/i,
    /any(?:one|body)?\s+(?:from|in)\s+(\w+)/i,
    /(\w+)\s+based/i,
  ];

  for (const pattern of locationPatterns) {
    const match = lowerMsg.match(pattern);
    if (match) {
      return {
        detected: true,
        refinementType: 'location',
        refinementValue: match[1],
        confidence: 'high',
      };
    }
  }

  // More results request
  const morePatterns = [
    /more\s+(?:results?|people|candidates?|lawyers?|developers?)/i,
    /any\s+(?:other|more)/i,
    /show\s+(?:me\s+)?more/i,
    /what\s+else/i,
    /who\s+else/i,
  ];

  for (const pattern of morePatterns) {
    if (pattern.test(lowerMsg)) {
      return {
        detected: true,
        refinementType: 'more_results',
        refinementValue: null,
        confidence: 'high',
      };
    }
  }

  // Experience level refinements
  if (/(senior|junior|experienced|fresher|entry\s*level)/i.test(lowerMsg)) {
    const match = lowerMsg.match(/(senior|junior|experienced|fresher|entry\s*level)/i);
    return {
      detected: true,
      refinementType: 'experience',
      refinementValue: match[1],
      confidence: 'medium',
    };
  }

  // Specific skill refinements
  if (userContext.lastSearchKeywords) {
    const hasKeyword = userContext.lastSearchKeywords.some((keyword) =>
      lowerMsg.includes(keyword.toLowerCase())
    );

    if (hasKeyword && lowerMsg.split(' ').length <= 5) {
      return {
        detected: true,
        refinementType: 'skill_refinement',
        refinementValue: lowerMsg,
        confidence: 'medium',
      };
    }
  }

  return { detected: false };
}

// Casual intent detection
function detectCasualIntent(msg) {
  const greetings = [
    'hi',
    'hey',
    'hello',
    'good morning',
    'good afternoon',
    'good evening',
    'namaste',
  ];
  const gratitude = ['thanks', 'thank you', 'thankyou', 'thx', 'appreciate', 'grateful'];
  const farewells = ['bye', 'goodbye', 'see you', 'talk later', 'take care', 'farewell'];
  const simple = ['ok', 'okay', 'cool', 'nice', 'great', 'awesome', 'good', 'fine', 'alright'];

  const isGreeting = greetings.some((greeting) => msg.startsWith(greeting) || msg === greeting);
  const isGratitude = gratitude.some((thanks) => msg.includes(thanks));
  const isFarewell = farewells.some((bye) => msg.includes(bye));
  const isSimple = simple.some((word) => msg === word || msg === `${word}!` || msg === `${word}.`);

  if (isGreeting) {
    return { detected: true, subtype: 'greeting', confidence: 'high' };
  }
  if (isGratitude) {
    return { detected: true, subtype: 'gratitude', confidence: 'high' };
  }
  if (isFarewell) {
    return { detected: true, subtype: 'farewell', confidence: 'high' };
  }
  if (isSimple) {
    return { detected: true, subtype: 'acknowledgment', confidence: 'medium' };
  }
  if (msg.length < 8) {
    return { detected: true, subtype: 'short', confidence: 'low' };
  }

  return { detected: false };
}

// Validate intent against current user state
function validateIntentForUserState(intent, userContext) {
  const isInProfileUpdate = userContext.waiting_for?.startsWith('updating_');
  const isProfileComplete =
    userContext.authenticated && userContext.user_data?.enhancedProfile?.completed;

  // During profile updates, allow profile inputs
  if (isInProfileUpdate && intent.type === 'profile_input') {
    return intent;
  }

  // During profile updates, only allow specific intents
  if (isInProfileUpdate) {
    const allowedDuringProfile = [
      'numeric_input',
      'affirmative',
      'negative',
      'skip_profile',
      'profile_help',
      'email_input',
      'casual',
      'profile_input',
    ];

    if (!allowedDuringProfile.includes(intent.type) && !intent.allowedDuringProfile) {
      return {
        ...intent,
        blocked: true,
        blockReason: 'profile_update_in_progress',
      };
    }
  }

  // Block search if profile incomplete
  if (intent.type === 'search' && !isProfileComplete) {
    return {
      ...intent,
      blocked: true,
      blockReason: 'profile_incomplete',
    };
  }

  return intent;
}

// Get intent confidence score
function getIntentConfidenceScore(intent) {
  const confidenceScores = {
    high: 0.9,
    medium: 0.7,
    low: 0.5,
  };

  return confidenceScores[intent.confidence] || 0.5;
}

// Get intent statistics
function getIntentStatistics() {
  return {
    supportedIntents: [
      'search',
      'profile_update',
      'casual',
      'skip_profile',
      'email_input',
      'otp_verification',
      'numeric_input',
      'affirmative',
      'negative',
      'profile_help',
      'profile_input',
    ],
    searchKeywords: SEARCH_KEYWORDS.length,
    skipKeywords: SKIP_KEYWORDS.length,
    strictProfileEnforcement: true,
    features: [
      'Multi-pattern search detection',
      'Profile completion enforcement',
      'Context-aware validation',
      'Confidence scoring',
      'Profile input recognition',
    ],
  };
}

module.exports = {
  detectUserIntent,
  validateIntentForUserState,
  getIntentConfidenceScore,
  getIntentStatistics,
  SEARCH_KEYWORDS,
  SKIP_KEYWORDS,
};
