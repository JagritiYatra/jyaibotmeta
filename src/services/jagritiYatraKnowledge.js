// Jagriti Yatra Knowledge Service
// Comprehensive knowledge base about Jagriti Yatra, JECP, and core team

const UnifiedIntelligenceService = require('./unifiedIntelligenceService');

const JAGRITI_YATRA_KNOWLEDGE = {
  // Core Information
  about: {
    overview:
      'Jagriti Yatra is a 15-day, 8000 km train journey across India that takes 450 young changemakers aged 20-27 to meet social and business entrepreneurs.',
    founded:
      "Started in 2008 by Shashank Mani, Jagriti Yatra has become India's largest platform for young social entrepreneurs.",
    purpose:
      'To inspire youth to lead development by taking to enterprise, fostering an entrepreneurial ecosystem across India.',
    participants:
      'Over 7000+ alumni from diverse backgrounds including students, professionals, and aspiring entrepreneurs.',
  },

  // Vision & Mission
  vision_mission: {
    vision:
      'To build India through enterprise by inspiring youth to become job creators rather than job seekers.',
    mission:
      'Creating a national ecosystem of enterprise through experiential learning, role model interaction, and peer-to-peer engagement.',
    core_values: [
      'Enterprise as a force for positive change',
      'Youth as catalysts of transformation',
      'Learning through real-world exposure',
      'Building inclusive growth models',
    ],
  },

  // The Journey
  journey: {
    duration: '15 days of transformative travel from December 24 to January 7 every year',
    distance: '8000 kilometers across India by a special chartered train',
    locations: [
      'Mumbai - Financial capital and startup hub',
      'Hubli - Agricultural innovations and rural enterprise',
      'Bengaluru - Technology and innovation center',
      'Madurai - Traditional businesses and social enterprises',
      'Chennai - Healthcare and education innovations',
      'Vizag - Port city with industrial growth',
      'Bhubaneswar - Tribal enterprises and handicrafts',
      "Patna - Bihar's transformation stories",
      'Deoria - JECP and grassroots innovation',
      'Delhi - Policy and scale-up ecosystem',
    ],
    unique_aspects: [
      'Middle India travels - discovering Bharat beyond metros',
      'Basti visits - understanding real grassroots challenges',
      'Role model interactions - meeting 20+ successful entrepreneurs',
      'Panel discussions with industry leaders',
      'Cultural immersion and diversity celebration',
    ],
  },

  // Core Team & Leadership
  core_team: {
    founder: {
      name: 'Shashank Mani',
      role: 'Founder, Jagriti Yatra',
      background: 'IIM Ahmedabad alumnus, social entrepreneur, and visionary leader',
      vision: 'Building enterprise-led development model for India',
    },
    key_members: [
      'Raj Krishnamurthy - CEO, instrumental in scaling the platform',
      'Operations team - Managing complex logistics across India',
      'Content team - Curating transformative learning experiences',
      'Alumni engagement team - Building post-yatra ecosystem',
    ],
    advisors: 'Distinguished leaders from business, social sector, and government',
  },

  // JECP - Jagriti Enterprise Centre Purvanchal
  jecp: {
    full_form: 'Jagriti Enterprise Centre Purvanchal',
    location: 'Deoria, Eastern Uttar Pradesh',
    founded: '2013, as a post-Yatra initiative',
    purpose: "Fostering entrepreneurship in one of India's most challenging regions",
    focus_areas: [
      'Agriculture and agri-business',
      'Handicrafts and traditional skills',
      'Women entrepreneurship',
      'Youth skill development',
      'Technology adoption in rural areas',
    ],
    impact: "500+ enterprises supported, 5000+ jobs created, transforming Eastern UP's economy",
  },

  // Impact & Alumni
  impact: {
    alumni_count: '7000+ changemakers across India and globally',
    enterprises_started: '500+ ventures in diverse sectors',
    jobs_created: 'Thousands of direct and indirect employment opportunities',
    sectors_impacted: [
      'Agriculture and food processing',
      'Education and skill development',
      'Healthcare and wellness',
      'Technology and digital services',
      'Handicrafts and rural industries',
      'Clean energy and sustainability',
    ],
    alumni_achievements: [
      'Forbes 30 Under 30 recipients',
      'National and international award winners',
      'Policy influencers and thought leaders',
      'Social impact at scale creators',
    ],
  },

  // Application Process
  application: {
    eligibility: 'Age 20-27, Indian nationals, passionate about enterprise-led development',
    process: 'Online application, essays, video submission, regional selections',
    selection_criteria: [
      'Entrepreneurial mindset and initiative',
      'Commitment to social change',
      'Leadership potential',
      'Diversity of thought and background',
    ],
    cost: 'Subsidized fee covering train travel, accommodation, meals, and learning',
    timeline: 'Applications open in July-August, selections in September-October',
  },

  // Post-Yatra Engagement
  post_yatra: {
    programs: [
      'Jagriti Fellowship - Deep dive mentorship program',
      'Regional chapters and meetups',
      'Enterprise support and incubation',
      'Mentorship connections',
      'Alumni enterprise visits',
    ],
    support: 'Continuous guidance, networking, funding connections, and market linkages',
  },
};

// Quick response generator for common questions
const QUICK_RESPONSES = {
  // Greetings and basic info
  'what is jagriti yatra': () => JAGRITI_YATRA_KNOWLEDGE.about.overview,
  'when is jagriti yatra': () =>
    'Jagriti Yatra happens annually from December 24 to January 7 - a 15-day transformative journey.',
  'who founded jagriti': () =>
    `${JAGRITI_YATRA_KNOWLEDGE.core_team.founder.name}, ${JAGRITI_YATRA_KNOWLEDGE.core_team.founder.background}, founded Jagriti Yatra in 2008.`,

  // Journey details
  'yatra route': () =>
    `The 8000km journey covers: ${JAGRITI_YATRA_KNOWLEDGE.journey.locations
      .slice(0, 5)
      .map((l) => l.split(' - ')[0])
      .join(', ')} and more.`,
  'how many days': () => JAGRITI_YATRA_KNOWLEDGE.journey.duration,
  'which cities': () =>
    `Major stops include: ${JAGRITI_YATRA_KNOWLEDGE.journey.locations.map((l) => l.split(' - ')[0]).join(', ')}.`,

  // JECP
  'what is jecp': () =>
    `${JAGRITI_YATRA_KNOWLEDGE.jecp.full_form} in ${JAGRITI_YATRA_KNOWLEDGE.jecp.location} - ${JAGRITI_YATRA_KNOWLEDGE.jecp.purpose}.`,
  'jecp impact': () => JAGRITI_YATRA_KNOWLEDGE.jecp.impact,

  // Impact
  'alumni count': () => JAGRITI_YATRA_KNOWLEDGE.impact.alumni_count,
  'yatra impact': () =>
    `${JAGRITI_YATRA_KNOWLEDGE.impact.alumni_count}, ${JAGRITI_YATRA_KNOWLEDGE.impact.enterprises_started}, creating ${JAGRITI_YATRA_KNOWLEDGE.impact.jobs_created}.`,

  // Application
  'how to apply': () =>
    `${JAGRITI_YATRA_KNOWLEDGE.application.eligibility}. ${JAGRITI_YATRA_KNOWLEDGE.application.process}.`,
  eligibility: () => JAGRITI_YATRA_KNOWLEDGE.application.eligibility,
  'selection process': () => JAGRITI_YATRA_KNOWLEDGE.application.process,
};

class JagritiYatraKnowledgeService {
  // Get comprehensive information about a topic
  static getInformation(topic) {
    const topicLower = topic.toLowerCase();

    // Check quick responses first
    for (const [key, value] of Object.entries(QUICK_RESPONSES)) {
      if (topicLower.includes(key)) {
        return value();
      }
    }

    // Search in knowledge base
    return this.searchKnowledge(topicLower);
  }

  // Search through the knowledge base
  static searchKnowledge(query) {
    const results = [];

    // Search through all sections
    const searchInObject = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          if (value.toLowerCase().includes(query) || key.toLowerCase().includes(query)) {
            results.push({
              path: `${path}${key}`,
              content: value,
              relevance: this.calculateRelevance(query, value, key),
            });
          }
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'string' && item.toLowerCase().includes(query)) {
              results.push({
                path: `${path}${key}[${index}]`,
                content: item,
                relevance: this.calculateRelevance(query, item, key),
              });
            }
          });
        } else if (typeof value === 'object') {
          searchInObject(value, `${path}${key}.`);
        }
      }
    };

    searchInObject(JAGRITI_YATRA_KNOWLEDGE);

    // Sort by relevance and return top results
    results.sort((a, b) => b.relevance - a.relevance);

    if (results.length === 0) {
      // Provide helpful context instead of "I don't have info"
      return 'Jagriti Yatra is a 15-day train journey across India for 450 changemakers.\nIt covers 8000 km visiting entrepreneurs and social enterprises.\nFounded by Shashank Mani in 2008, it has 7000+ alumni.\nFor specific details, ask about the journey, impact, JECP, or applications.';
    }

    // Combine top results into a coherent response
    const topResults = results.slice(0, 3);
    return topResults.map((r) => r.content).join(' ');
  }

  // Calculate relevance score
  static calculateRelevance(query, content, key) {
    let score = 0;
    const queryWords = query.split(/\s+/);
    const contentLower = content.toLowerCase();
    const keyLower = key.toLowerCase();

    // Exact match in key
    if (keyLower === query) score += 10;

    // Partial match in key
    if (keyLower.includes(query)) score += 5;

    // Word matches in content
    queryWords.forEach((word) => {
      if (contentLower.includes(word)) score += 2;
    });

    // Bonus for shorter, more focused content
    if (content.length < 200) score += 1;

    return score;
  }


  // Expand information with more context
  static expandInformation(baseInfo, topic) {
    const topicLower = topic.toLowerCase();

    // Add relevant context based on topic
    if (topicLower.includes('apply') || topicLower.includes('eligibility')) {
      return `${baseInfo}\n\nThe selection looks for entrepreneurial mindset, leadership potential, and commitment to social change. Applications typically open in July-August.`;
    }

    if (topicLower.includes('impact') || topicLower.includes('alumni')) {
      return `${baseInfo}\n\nAlumni work across sectors like agriculture, education, healthcare, and technology, creating grassroots to scalable solutions.`;
    }

    if (topicLower.includes('journey') || topicLower.includes('route')) {
      return `${baseInfo}\n\nThe journey includes role model visits, basti immersions, and panel discussions, creating a 360-degree learning experience.`;
    }

    return baseInfo;
  }

  // Get all topics available
  static getAvailableTopics() {
    return {
      main_topics: [
        'About Jagriti Yatra',
        'Vision and Mission',
        'The 15-day Journey',
        'Route and Cities',
        'Core Team and Founder',
        'JECP - Purvanchal Centre',
        'Alumni Impact',
        'Application Process',
        'Post-Yatra Programs',
      ],
      quick_queries: Object.keys(QUICK_RESPONSES),
    };
  }

  // Get inspiring quotes and messages
  static getInspiringMessage() {
    const messages = [
      'Jagriti Yatra: Where 450 dreams board a train to build a nation through enterprise!',
      "From job seekers to job creators - that's the Jagriti transformation.",
      "8000 kms, 15 days, lifetime of impact - that's Jagriti Yatra.",
      'Middle India mein enterprise ka jagriti - building Bharat through business.',
      'Every Yatri returns as a changemaker, ready to transform India.',
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Search jagritiyatra.com for accurate information using AI with web search
  static async searchInternetForJagritiInfo(userMessage) {
    try {
      const OpenAI = require('openai');
      const { getConfig } = require('../config/environment');
      
      const config = getConfig();
      if (config.ai.apiKey) {
        const openai = new OpenAI({ apiKey: config.ai.apiKey });
        
        // Use AI to search and provide accurate Jagriti Yatra information
        const prompt = `Search for current information about Jagriti Yatra and answer: ${userMessage}
        
Provide EXACTLY 4 accurate lines based on the latest information from jagritiyatra.com.
Focus on factual details about leadership, programs, dates, impact, or applications.
Be specific and current - avoid outdated information.`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are an expert researcher. Search for and provide the most current, accurate information about Jagriti Yatra from jagritiyatra.com. Always give exactly 4 factual lines.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 200
        });
        
        return completion.choices[0].message.content;
      }
      
      // Fallback to knowledge base if AI not available
      return this.getInformation(userMessage);
    } catch (error) {
      console.error('AI search failed:', error);
      return this.getInformation(userMessage);
    }
  }

  // Handle queries with web search for accurate Jagriti Yatra information
  static async getFormattedResponse(userMessage) {
    const query = userMessage.toLowerCase();

    // For ANY Jagriti Yatra related query, search the website for accurate info
    if (query.includes('jagriti') || query.includes('yatra') || 
        query.includes('founder') || query.includes('ceo') || 
        query.includes('team') || query.includes('member') || 
        query.includes('current') || query.includes('latest') || 
        query.includes('2024') || query.includes('2025') || 
        query.includes('who') || query.includes('impact') ||
        query.includes('journey') || query.includes('route') ||
        query.includes('application') || query.includes('jecp')) {
      
      // Always search jagritiyatra.com for accurate information
      return await this.searchInternetForJagritiInfo(userMessage);
    }

    // For non-Jagriti queries, use knowledge base
    const topic = userMessage;
    const info = this.getInformation(topic);

    return info;
  }
}

module.exports = {
  JagritiYatraKnowledgeService,
  JAGRITI_YATRA_KNOWLEDGE,
  QUICK_RESPONSES,
};
