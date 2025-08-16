// Jagriti Yatra Knowledge Service
// Comprehensive knowledge base about Jagriti Yatra, JECP, and core team

const UnifiedIntelligenceService = require('./unifiedIntelligenceService');
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

const JAGRITI_YATRA_KNOWLEDGE = {
  // Core Information - Enhanced
  about: {
    overview:
      'Jagriti Yatra is a 15-day, 8000 km train journey across India that takes 450 young changemakers aged 20-27 to meet social and business entrepreneurs.',
    founded:
      "Started in 2008 by Shashank Mani, Jagriti Yatra has become India's largest platform for young social entrepreneurs.",
    founder:
      "Shashank Mani is the founder of Jagriti Yatra. He envisioned and created this transformative journey to inspire young Indians to become entrepreneurs and change-makers.",
    purpose:
      'To inspire youth to lead development by taking to enterprise, fostering an entrepreneurial ecosystem across India.',
    participants:
      'Over 9000+ alumni from diverse backgrounds including students, professionals, and aspiring entrepreneurs.',
    detailed_description:
      'Jagriti Yatra is not just a journey but a movement that transforms young minds into changemakers. Every December, 450 carefully selected youth embark on a life-changing expedition across India, witnessing entrepreneurship in action, from bustling metros to remote villages. This unique platform combines experiential learning with peer engagement, creating a network of motivated individuals committed to driving positive change in their communities.',
    impact_philosophy:
      'The philosophy behind Jagriti Yatra is simple yet powerful: expose young minds to real-world entrepreneurship, let them witness the impact of enterprise-led development, and inspire them to become job creators rather than job seekers. This approach has created a ripple effect of innovation and social impact across India.',
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

  // JECP - Jagriti Enterprise Centre Purvanchal - Enhanced
  jecp: {
    full_form: 'Jagriti Enterprise Centre Purvanchal',
    location: 'Deoria, Eastern Uttar Pradesh',
    founded: '2013, as a post-Yatra initiative',
    purpose: "Fostering entrepreneurship in one of India's most challenging regions",
    detailed_overview: 'JECP represents Jagriti Yatra\'s commitment to creating lasting impact beyond the annual journey. Located in Deoria, Eastern UP, this center serves as a beacon of hope in a region historically challenged by limited economic opportunities. JECP demonstrates how enterprise-led development can transform entire communities.',
    strategic_importance: 'Purvanchal (Eastern UP) was chosen strategically as it represents the challenges faced by much of rural India - limited infrastructure, low literacy rates, and few economic opportunities. By proving that entrepreneurship can thrive here, JECP serves as a model for similar initiatives across India.',
    focus_areas: [
      'Agriculture and agri-business development',
      'Handicrafts and traditional skills preservation',
      'Women entrepreneurship and empowerment',
      'Youth skill development and employment',
      'Technology adoption in rural areas',
      'Microfinance and financial inclusion',
      'Rural innovation and product development',
      'Market linkage creation',
      'Digital literacy and e-commerce',
      'Sustainable development practices',
    ],
    programs: {
      incubation: 'Comprehensive startup incubation program for rural entrepreneurs',
      training: 'Regular skill development workshops for youth and women',
      mentorship: 'One-on-one mentoring by successful entrepreneurs and Jagriti alumni',
      funding: 'Access to microfinance and venture funding opportunities',
      market_access: 'Connecting rural products to urban and global markets',
    },
    impact: "500+ enterprises supported, 5000+ jobs created, transforming Eastern UP's economy",
    success_stories: 'JECP has enabled countless success stories - from women starting handicraft businesses to youth creating tech-enabled agricultural solutions. The center has become a symbol of how dedicated effort can transform the most challenging regions.',
    innovation_model: 'JECP operates on the unique model of combining traditional knowledge with modern business practices, creating enterprises that are both economically viable and culturally rooted.',
  },

  // Impact & Alumni - Enhanced
  impact: {
    alumni_count: '9000+ changemakers across India and globally',
    enterprises_started: '700+ ventures in diverse sectors',
    jobs_created: 'Over 10,000 direct and indirect employment opportunities',
    economic_impact: 'Generated over ₹500 crores in economic value through alumni enterprises',
    social_reach: 'Impacted over 1 million lives through various social initiatives',
    sectors_impacted: [
      'Agriculture and food processing',
      'Education and skill development',
      'Healthcare and wellness',
      'Technology and digital services',
      'Handicrafts and rural industries',
      'Clean energy and sustainability',
      'Financial inclusion and fintech',
      'Waste management and recycling',
      'Water conservation and management',
      'Rural development and infrastructure',
    ],
    alumni_achievements: [
      'Forbes 30 Under 30 recipients',
      'National and international award winners',
      'Policy influencers and thought leaders',
      'Social impact at scale creators',
      'Government advisors and consultants',
      'International development professionals',
      'Academic researchers and professors',
      'Corporate social responsibility leaders',
    ],
    global_presence: 'Alumni working across 25+ countries, creating international networks and opportunities',
    innovation_stories: 'From rural healthcare solutions to urban sustainability projects, alumni continue to innovate across sectors',
  },

  // Enhanced Journey Details
  journey_detailed: {
    preparation_phase: 'Rigorous 3-month pre-yatra preparation including workshops, assignments, and team building',
    daily_structure: 'Each day combines travel, role model visits, learning sessions, cultural immersion, and reflection',
    learning_methodology: 'Experiential learning through direct interaction with entrepreneurs, case study discussions, and peer learning',
    cultural_component: 'Deep cultural immersion including local festivals, traditional arts, and community interactions',
    networking_opportunities: 'Structured networking sessions creating lifelong professional and personal connections',
    documentation: 'Comprehensive documentation through blogs, videos, and social media creating lasting memories',
    follow_up: 'Post-yatra engagement through alumni networks, reunions, and continued mentorship',
  },

  // Current Programs and Initiatives
  current_initiatives: {
    virtual_yatra: 'Online programs reaching youth who cannot join the physical journey',
    alumni_chapters: 'Active chapters in major cities facilitating local networking and collaboration',
    mentorship_programs: 'Structured mentorship connecting experienced alumni with new entrepreneurs',
    funding_support: 'Access to angel investors and funding opportunities through the alumni network',
    policy_advocacy: 'Working with government bodies to create entrepreneur-friendly policies',
    research_publications: 'Regular research and reports on entrepreneurship trends and best practices',
    international_programs: 'Exchange programs and collaborations with global entrepreneurship organizations',
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

// Enhanced Quick response generator for common questions
const QUICK_RESPONSES = {
  // Greetings and basic info
  'what is jagriti yatra': () => `${JAGRITI_YATRA_KNOWLEDGE.about.overview} ${JAGRITI_YATRA_KNOWLEDGE.about.detailed_description}`,
  'when is jagriti yatra': () =>
    'Jagriti Yatra happens annually from December 24 to January 7 - a 15-day transformative journey across India.',
  'who founded jagriti': () =>
    `${JAGRITI_YATRA_KNOWLEDGE.core_team.founder.name}, ${JAGRITI_YATRA_KNOWLEDGE.core_team.founder.background}, founded Jagriti Yatra in 2008.`,
  'shashank mani': () =>
    `${JAGRITI_YATRA_KNOWLEDGE.core_team.founder.name} is the visionary founder of Jagriti Yatra. ${JAGRITI_YATRA_KNOWLEDGE.about.founder}`,

  // Journey details - Enhanced
  'yatra route': () =>
    `The 8000km journey covers: ${JAGRITI_YATRA_KNOWLEDGE.journey.locations
      .slice(0, 5)
      .map((l) => l.split(' - ')[0])
      .join(', ')} and more cities across India.`,
  'how many days': () => `${JAGRITI_YATRA_KNOWLEDGE.journey.duration}. ${JAGRITI_YATRA_KNOWLEDGE.journey_detailed.preparation_phase}`,
  'which cities': () =>
    `Major stops include: ${JAGRITI_YATRA_KNOWLEDGE.journey.locations.map((l) => l.split(' - ')[0]).join(', ')}.`,
  'journey experience': () => JAGRITI_YATRA_KNOWLEDGE.journey_detailed.learning_methodology,

  // JECP - Enhanced
  'what is jecp': () =>
    `${JAGRITI_YATRA_KNOWLEDGE.jecp.full_form} in ${JAGRITI_YATRA_KNOWLEDGE.jecp.location} - ${JAGRITI_YATRA_KNOWLEDGE.jecp.detailed_overview}`,
  'jecp impact': () => `${JAGRITI_YATRA_KNOWLEDGE.jecp.impact}. ${JAGRITI_YATRA_KNOWLEDGE.jecp.success_stories}`,
  'purvanchal': () => JAGRITI_YATRA_KNOWLEDGE.jecp.strategic_importance,
  'deoria': () => `${JAGRITI_YATRA_KNOWLEDGE.jecp.location} is home to JECP. ${JAGRITI_YATRA_KNOWLEDGE.jecp.innovation_model}`,

  // Impact - Enhanced
  'alumni count': () => `${JAGRITI_YATRA_KNOWLEDGE.impact.alumni_count} with ${JAGRITI_YATRA_KNOWLEDGE.impact.global_presence}`,
  'yatra impact': () =>
    `${JAGRITI_YATRA_KNOWLEDGE.impact.alumni_count}, ${JAGRITI_YATRA_KNOWLEDGE.impact.enterprises_started}, ${JAGRITI_YATRA_KNOWLEDGE.impact.economic_impact}.`,
  'economic impact': () => JAGRITI_YATRA_KNOWLEDGE.impact.economic_impact,
  'social impact': () => JAGRITI_YATRA_KNOWLEDGE.impact.social_reach,

  // Application - Enhanced
  'how to apply': () =>
    `${JAGRITI_YATRA_KNOWLEDGE.application.eligibility}. ${JAGRITI_YATRA_KNOWLEDGE.application.process}.`,
  'eligibility': () => JAGRITI_YATRA_KNOWLEDGE.application.eligibility,
  'selection process': () => JAGRITI_YATRA_KNOWLEDGE.application.process,
  'application timeline': () => JAGRITI_YATRA_KNOWLEDGE.application.timeline,

  // Current Programs
  'current programs': () => Object.values(JAGRITI_YATRA_KNOWLEDGE.current_initiatives).join('. '),
  'virtual yatra': () => JAGRITI_YATRA_KNOWLEDGE.current_initiatives.virtual_yatra,
  'alumni chapters': () => JAGRITI_YATRA_KNOWLEDGE.current_initiatives.alumni_chapters,
  'mentorship': () => JAGRITI_YATRA_KNOWLEDGE.current_initiatives.mentorship_programs,

  // Philosophy and Values
  'vision mission': () => `Vision: ${JAGRITI_YATRA_KNOWLEDGE.vision_mission.vision}. Mission: ${JAGRITI_YATRA_KNOWLEDGE.vision_mission.mission}`,
  'philosophy': () => JAGRITI_YATRA_KNOWLEDGE.about.impact_philosophy,
  'core values': () => JAGRITI_YATRA_KNOWLEDGE.vision_mission.core_values.join(', '),
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
      if (config.ai?.apiKey) {
        const openai = new OpenAI({ apiKey: config.ai.apiKey });
        
        // Use AI with web search capabilities to get current information
        const prompt = `You have access to web search. Search jagritiyatra.com and provide current information about: ${userMessage}

Context: Jagriti Yatra is India's transformative entrepreneurship journey founded by Shashank Mani in 2008.

Instructions:
1. Search for the most current information from jagritiyatra.com
2. Provide exactly 4 factual lines
3. Include specific details like dates, names, programs, or impact numbers
4. Focus on leadership, current programs, applications, or recent updates
5. Be accurate and current - verify information from official sources

Answer:`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are an expert researcher with web search access. Always search for current information from jagritiyatra.com and official sources. Provide factual, verified information only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 300
        });
        
        return completion.choices[0].message.content.trim();
      }
      
      // Fallback to knowledge base if AI not available
      return this.getInformation(userMessage);
    } catch (error) {
      console.error('AI search failed:', error);
      return this.getInformation(userMessage);
    }
  }

  // Handle queries with intelligent responses - Enhanced
  static async getFormattedResponse(userMessage) {
    try {
      const query = userMessage.toLowerCase();
      
      // Check if query needs current/web information
      const needsWebSearch = /current|latest|recent|2024|2025|today|now|updated|team|management|leadership|apply.*now|when.*apply/i.test(userMessage);
      
      if (needsWebSearch) {
        console.log('Using web search for current Jagriti info');
        return await this.searchInternetForJagritiInfo(userMessage);
      }
      
      // Enhanced AI-powered response with comprehensive context
      const { getConfig } = require('../config/environment');
      const config = getConfig();
      
      if (config.ai?.apiKey && openai) {
        const comprehensiveContext = `You are an expert on Jagriti Yatra, India's most transformative entrepreneurship journey. Answer this query with rich details.

Query: "${userMessage}"

Enhanced Context:
- Jagriti Yatra: 15-day, 8000 km train journey across India for 450 changemakers aged 20-27
- Founded by Shashank Mani in 2008, now with 9000+ alumni creating impact across 25+ countries
- Generated ₹500+ crores in economic value, impacted 1+ million lives through alumni initiatives
- JECP in Deoria, Eastern UP: Flagship innovation center transforming Purvanchal region
- 700+ ventures started, 10,000+ jobs created through alumni network
- Applications open July-August for December journey
- Alumni active in agriculture, education, healthcare, technology, fintech, sustainability
- Unique model: experiential learning + role model visits + cultural immersion + peer networks
- Global presence with chapters in major cities and international collaborations
- Virtual programs, mentorship networks, funding support, policy advocacy

Key Programs:
- Annual 15-day train journey (Dec 24 - Jan 7)
- JECP rural innovation center
- Alumni chapters and mentorship programs
- Virtual yatra for broader reach
- Research and policy advocacy
- International exchange programs

Instructions:
1. Provide comprehensive, engaging answers with specific details
2. Include relevant numbers, impact stories, and concrete examples
3. Be inspiring and informative - showcase the transformative power
4. Maximum 5-6 lines for detailed responses
5. If about founder/team, mention Shashank Mani's vision and leadership
6. For current info needs, suggest checking jagritiyatra.com

Answer:`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [{ role: 'user', content: comprehensiveContext }],
          temperature: 0.7,
          max_tokens: 300
        });

        return completion.choices[0].message.content.trim();
      }
    } catch (error) {
      console.error('AI response failed:', error);
    }

    // Enhanced fallback to comprehensive knowledge base search
    const query = userMessage.toLowerCase();
    let info = this.getInformation(query);
    
    // If no specific match, try broader search
    if (!info || info.length < 50) {
      info = this.searchKnowledge(query);
    }
    
    // Make response more conversational and comprehensive
    if (info.includes('Jagriti Yatra') || info.includes('JECP')) {
      return this.expandInformation(info, query);
    }
    
    return info || 'Jagriti Yatra is India\'s premier platform for youth entrepreneurship. Founded by Shashank Mani in 2008, it transforms young minds through a 15-day train journey across India, creating a network of 9000+ changemakers who have generated ₹500+ crores in economic impact.';
  }
}

module.exports = {
  JagritiYatraKnowledgeService,
  JAGRITI_YATRA_KNOWLEDGE,
  QUICK_RESPONSES,
};
