// AI Intent Handler - Uses GPT-4 for all understanding and responses
const OpenAI = require('openai');
const { getConfig } = require('../config/environment');
const { logError, logAIOperation } = require('../middleware/logging');

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
  console.warn('⚠️ OpenAI not initialized for AI intent handler');
}

// Comprehensive Jagriti Yatra knowledge base
const JAGRITI_KNOWLEDGE = {
  overview: {
    'jagriti yatra':
      'Jagriti Yatra is a 15-day, 8000km train journey across India that takes 450 young changemakers to meet social and business entrepreneurs.',
    vision:
      'To build India through enterprise by inspiring youth to become job creators rather than job seekers.',
    mission:
      'Creating a national ecosystem of enterprise through experiential learning, role model interaction, and peer-to-peer engagement.',
    founded: 'Started in 2008 by Shashank Mani and supported by various organizations and leaders.',
  },

  route: {
    route:
      'The journey covers 12-15 locations including Mumbai, Hubli, Bengaluru, Madurai, Chennai, Vizag, Bhubaneswar, Patna, Deoria, Delhi, and more.',
    duration: '15 days covering 8000 kilometers by train across India.',
    locations:
      'Visits metros, tier-2 cities, and villages to showcase diverse entrepreneurial models.',
  },

  core_team: {
    'shashank mani': 'Founder of Jagriti Yatra, social entrepreneur and visionary leader.',
    'core team':
      'Dedicated individuals managing operations, content, partnerships, and participant experience.',
    'team structure':
      'Led by experienced professionals with specialized teams for different verticals.',
  },

  jecp: {
    jecp: 'Jagriti Enterprise Centre Poorvanchal - fostering entrepreneurship in Eastern UP through mentorship and resources.',
    poorvanchal:
      'JECP focuses on Eastern Uttar Pradesh region to create local entrepreneurs and employment.',
  },

  impact: {
    alumni: 'Over 7000+ alumni creating ventures, working in social sector, and driving change.',
    enterprises: '500+ enterprises started by alumni creating thousands of jobs.',
    network: 'Strong ecosystem of changemakers, mentors, and entrepreneurs.',
  },
};

async function analyzeUserIntent(message, context = {}) {
  if (!openai) {
    return {
      intent: 'unknown',
      confidence: 0.5,
      shouldSearch: false,
    };
  }

  try {
    // Use last 3 messages for better context
    const recentMessages = context.conversationHistory?.slice(-3) || [];

    const systemPrompt = `You are analyzing user intent for a Jagriti Yatra alumni network chatbot.

Analyze the message and determine:
1. Primary intent (choose ONE):
   - "casual_conversation" - Greetings, thanks, general chat, how are you, etc.
   - "jagriti_info" - Questions about Jagriti Yatra, JECP, core team, vision, mission, route
   - "general_knowledge" - Questions like "what is AI", "tell me about agriculture", etc.
   - "profile_search" - Looking for alumni/people with specific skills or expertise
   - "location_search" - Looking for people from specific locations
   - "follow_up" - Follow-up to previous message (like "tell me more", "anyone else?")

2. Extract key information:
   - searchTerms: Skills/expertise they're looking for (if profile_search)
   - topic: Main subject of discussion
   - isGreeting: true if it's a greeting
   - needsProfiles: true if response should include profile suggestions

Recent conversation (last 3 messages): ${JSON.stringify(recentMessages)}

Return a JSON object with: {intent, searchTerms, topic, isGreeting, needsProfiles, confidence}`;

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

    const result = JSON.parse(completion.choices[0].message.content);

    logAIOperation('intent_analysis', {
      message: message.substring(0, 50),
      intent: result.intent,
      confidence: result.confidence,
    });

    return result;
  } catch (error) {
    logError('AI intent analysis error:', error);
    return {
      intent: 'unknown',
      confidence: 0.5,
      shouldSearch: false,
    };
  }
}

async function generateCasualResponse(message, context = {}) {
  if (!openai) {
    return 'Hey there! How can I help you today?';
  }

  try {
    const systemPrompt = `You are a friendly, engaging chatbot for Jagriti Yatra alumni network.
        
Generate a natural, conversational response to the user's message.
Keep it short (1-2 lines), warm, and engaging.
If appropriate, guide them toward using the bot's features (searching alumni, asking questions).
Be casual but professional. Use emojis sparingly (max 1).

Context: This is an alumni network where people search for connections and information.`;

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
  } catch (error) {
    logError('Casual response generation error:', error);
    return "Hey! I'm here to help you connect with alumni or answer questions. What can I do for you?";
  }
}

async function generateJagritiResponse(query) {
  if (!openai) {
    // Fallback to knowledge base
    const lowerQuery = query.toLowerCase();
    for (const category of Object.values(JAGRITI_KNOWLEDGE)) {
      for (const [key, value] of Object.entries(category)) {
        if (lowerQuery.includes(key)) {
          return value;
        }
      }
    }
    return 'Jagriti Yatra is an incredible entrepreneurial journey across India. Visit jagritiyatra.com for more details.';
  }

  try {
    const systemPrompt = `You are an expert on Jagriti Yatra. Use this knowledge base:
${JSON.stringify(JAGRITI_KNOWLEDGE, null, 2)}

Provide accurate, inspiring information about "${query}" in EXACTLY 4-5 short lines.
Be concise, informative, and engaging. Focus on facts and impact.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      temperature: 0.5,
      max_tokens: 150,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    logError('Jagriti response generation error:', error);
    return 'Jagriti Yatra is a transformative journey building India through enterprise. Ask me anything specific!';
  }
}

async function generateGeneralKnowledgeResponse(question, profiles = []) {
  if (!openai) {
    return {
      answer:
        "That's an interesting question! Let me connect you with alumni who might have expertise in this area.",
      relevantProfiles: profiles.slice(0, 2),
    };
  }

  try {
    const systemPrompt = `Answer this question concisely in EXACTLY 5 lines.
Be informative, clear, and helpful. Each line should add value.
Focus on practical, useful information.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      temperature: 0.6,
      max_tokens: 200,
    });

    const answer = completion.choices[0].message.content;

    // Find relevant profiles if available
    let relevantProfiles = [];
    if (profiles && profiles.length > 0) {
      // Extract key terms from the question
      const keyTermsPrompt = `Extract 3-5 key technical/professional terms from this question: "${question}"
Return only comma-separated terms, nothing else.`;

      const termsCompletion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: keyTermsPrompt }],
        temperature: 0.3,
        max_tokens: 50,
      });

      const terms = termsCompletion.choices[0].message.content
        .toLowerCase()
        .split(',')
        .map((t) => t.trim());

      // Find profiles matching these terms
      relevantProfiles = profiles
        .filter((profile) => {
          const profileText = `${profile.skills} ${profile.about} ${profile.company}`.toLowerCase();
          return terms.some((term) => profileText.includes(term));
        })
        .slice(0, 2);
    }

    return {
      answer,
      relevantProfiles,
    };
  } catch (error) {
    logError('General knowledge response error:', error);
    return {
      answer:
        "That's a great question! I can help connect you with alumni who have expertise in this area.",
      relevantProfiles: profiles.slice(0, 2),
    };
  }
}

async function enhanceProfileContent(profile) {
  if (!openai || !profile) {
    return profile;
  }

  try {
    // Don't enhance if already has good content
    if (profile.about && profile.about.length > 100) {
      return profile;
    }

    const prompt = `Create a professional 2-3 line bio for this alumni:
Name: ${profile.name}
Company: ${profile.company || 'Not specified'}
Skills: ${profile.skills || 'Not specified'}
Current About: ${profile.about || 'No bio available'}

Write an engaging bio highlighting their expertise and value. Keep it professional and concise.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 100,
    });

    return {
      ...profile,
      enhancedAbout: completion.choices[0].message.content,
      originalAbout: profile.about,
    };
  } catch (error) {
    logError(`Profile enhancement error for ${profile.name}:`, error);
    return profile;
  }
}

async function findSimilarProfiles(searchQuery, allProfiles, limit = 2) {
  if (!openai || !allProfiles || allProfiles.length === 0) {
    return [];
  }

  try {
    const profileList = allProfiles
      .slice(0, 100)
      .map((p, i) => `${i}: ${p.name} - ${p.skills || p.company || 'No info'}`)
      .join('\n');

    const prompt = `Given the search "${searchQuery}", find the ${limit} most relevant profiles:

${profileList}

Return only the indices of the most relevant profiles as a JSON array like [0, 5, 12].`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 50,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    const indices = result.indices || result.profiles || [];

    return indices
      .filter((i) => i < allProfiles.length)
      .map((i) => allProfiles[i])
      .slice(0, limit);
  } catch (error) {
    logError('Find similar profiles error:', error);
    return allProfiles.slice(0, limit);
  }
}

async function understandFollowUp(message, previousContext) {
  if (!openai) {
    return { isFollowUp: false, intent: 'unknown' };
  }

  try {
    const prompt = `Analyze if this is a follow-up message and what the user wants:
Previous context: ${JSON.stringify(previousContext)}
Current message: "${message}"

Determine:
1. isFollowUp: true/false
2. What they want: more_results, different_criteria, specific_filter, clarification
3. Key terms to add to search

Return JSON: {isFollowUp, intent, additionalTerms}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 100,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    logError('Follow-up understanding error:', error);
    return { isFollowUp: false, intent: 'unknown' };
  }
}

module.exports = {
  analyzeUserIntent,
  generateCasualResponse,
  generateJagritiResponse,
  generateGeneralKnowledgeResponse,
  enhanceProfileContent,
  findSimilarProfiles,
  understandFollowUp,
  JAGRITI_KNOWLEDGE,
};
