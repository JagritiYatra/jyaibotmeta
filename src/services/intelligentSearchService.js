// Intelligent Search Service with Accurate Matching and GPT Capabilities
// Provides precise profile matching and general knowledge responses

const { getDatabase } = require('../config/database');
const { logError, logSuccess } = require('../middleware/logging');
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

class IntelligentSearchService {
  constructor() {
    this.conversationMemory = new Map();
    this.locationProximity = this.initializeLocationProximity();
  }

  initializeLocationProximity() {
    // Define nearby locations for intelligent suggestions
    return {
      'pune': ['mumbai', 'nashik', 'aurangabad', 'kolhapur', 'maharashtra'],
      'mumbai': ['pune', 'thane', 'navi mumbai', 'nashik', 'maharashtra'],
      'bangalore': ['bengaluru', 'mysore', 'chennai', 'hyderabad', 'karnataka'],
      'delhi': ['new delhi', 'gurgaon', 'gurugram', 'noida', 'faridabad', 'ncr'],
      'chennai': ['bangalore', 'coimbatore', 'madurai', 'tamil nadu'],
      'kolkata': ['howrah', 'durgapur', 'west bengal'],
      'hyderabad': ['secunderabad', 'bangalore', 'telangana', 'andhra pradesh']
    };
  }

  // Main search function with intelligent matching
  async performIntelligentSearch(query, user, context) {
    try {
      logSuccess('intelligent_search_initiated', { query, userId: user?._id });
      
      // Step 1: Determine if this is a general knowledge question or alumni search
      const queryType = await this.classifyQuery(query);
      
      if (queryType.isGeneralKnowledge) {
        // Handle as GPT-style general knowledge question
        return await this.handleGeneralKnowledge(query, queryType);
      }
      
      // Step 2: Extract search parameters with precision
      const searchParams = await this.extractPreciseSearchParams(query);
      
      // Step 3: Build precise MongoDB query
      const dbQuery = this.buildPreciseQuery(searchParams);
      
      // Step 4: Execute search with strict matching
      const results = await this.executePreciseSearch(dbQuery, searchParams);
      
      // Step 5: If no exact matches, try nearby locations
      let finalResults = results;
      let isNearbySearch = false;
      
      if (results.length === 0 && searchParams.locations?.length > 0) {
        const nearbyResults = await this.searchNearbyLocations(searchParams);
        if (nearbyResults.length > 0) {
          finalResults = nearbyResults;
          isNearbySearch = true;
        }
      }
      
      // Step 6: Format response with only top relevant matches
      const response = await this.formatPreciseResponse(
        finalResults, 
        searchParams, 
        query, 
        isNearbySearch
      );
      
      // Store context for follow-ups
      this.storeContext(user, query, finalResults, searchParams);
      
      return response;
      
    } catch (error) {
      logError(error, { operation: 'performIntelligentSearch', query });
      return this.getErrorResponse();
    }
  }

  // Classify if query is general knowledge or alumni search
  async classifyQuery(query) {
    const generalIndicators = [
      /^what is/i,
      /^define/i,
      /^explain/i,
      /^how does/i,
      /^tell me about(?! alumni| people| someone)/i,
      /^why/i,
      /scope of/i,
      /difference between/i,
      /advantages of/i,
      /disadvantages of/i,
      /benefits of/i,
      /^what are/i,
      /^which/i,
      /career in/i,
      /future of/i,
      /opportunities in/i
    ];
    
    const isGeneral = generalIndicators.some(pattern => pattern.test(query));
    
    if (isGeneral) {
      return {
        isGeneralKnowledge: true,
        topic: query.replace(/^(what is|define|explain|tell me about)\s*/i, '').trim()
      };
    }
    
    return { isGeneralKnowledge: false };
  }

  // Handle general knowledge questions like GPT
  async handleGeneralKnowledge(query, queryType) {
    try {
      const prompt = `You are a knowledgeable assistant helping alumni network members.
      
User Question: "${query}"

Provide a comprehensive, helpful answer about this topic. Include:
1. Clear definition or explanation
2. Key points or features
3. Practical applications or relevance
4. Any career or industry insights if applicable

Keep the response informative but concise (under 300 words).
Format with proper markdown for WhatsApp.`;

      const completion = await openai.chat.completions.create({
        model: config.ai.model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      });

      return completion.choices[0].message.content;
      
    } catch (error) {
      logError(error, { operation: 'handleGeneralKnowledge' });
      return "I understand you're asking about that topic. While I specialize in connecting alumni, I can help with general questions too. Could you be more specific about what aspect interests you?";
    }
  }

  // Extract precise search parameters
  async extractPreciseSearchParams(query) {
    try {
      const prompt = `Extract EXACT search parameters from this alumni search query.
      
Query: "${query}"

Extract precisely:
1. Skills/Technologies: Extract specific technical skills mentioned (e.g., "web developer" -> ["web development", "javascript", "html", "css"])
2. Locations: Extract exact city/state/country names
3. Professional Roles: Extract job titles/roles
4. Companies/Organizations: Extract company or college names
5. Domains/Industries: Extract industry sectors
6. Special Requirements: Legal help, mentorship, funding, etc.

For "web developer" include: ["web", "developer", "javascript", "frontend", "backend", "full stack"]
For "law" or "legal" include: ["law", "legal", "lawyer", "advocate", "legal advisor"]

Return as JSON with actual search terms, not categories.`;

      const completion = await openai.chat.completions.create({
        model: config.ai.model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      });

      const params = JSON.parse(completion.choices[0].message.content);
      
      // Enhance common terms
      if (params.skills) {
        const enhanced = [];
        params.skills.forEach(skill => {
          enhanced.push(skill);
          if (skill.toLowerCase().includes('web')) {
            enhanced.push('javascript', 'react', 'node', 'html', 'css', 'frontend', 'backend');
          }
          if (skill.toLowerCase().includes('law') || skill.toLowerCase().includes('legal')) {
            enhanced.push('lawyer', 'advocate', 'legal advisor', 'law', 'legal');
          }
        });
        params.skills = [...new Set(enhanced)];
      }
      
      return params;
      
    } catch (error) {
      logError(error, { operation: 'extractPreciseSearchParams' });
      // Fallback to basic extraction
      return this.basicParamExtraction(query);
    }
  }

  // Build precise MongoDB query
  buildPreciseQuery(params) {
    const conditions = [];
    
    // Location matching (STRICT)
    if (params.locations?.length > 0) {
      const locationConditions = [];
      params.locations.forEach(location => {
        locationConditions.push(
          { 'basicProfile.linkedinScrapedData.location': { $regex: location, $options: 'i' } },
          { 'enhancedProfile.city': { $regex: location, $options: 'i' } },
          { 'enhancedProfile.state': { $regex: location, $options: 'i' } },
          { 'enhancedProfile.currentAddress': { $regex: location, $options: 'i' } }
        );
      });
      conditions.push({ $or: locationConditions });
    }
    
    // Skills matching (COMPREHENSIVE)
    if (params.skills?.length > 0) {
      const skillConditions = [];
      params.skills.forEach(skill => {
        skillConditions.push(
          { 'basicProfile.linkedinScrapedData.skills': { $regex: skill, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.headline': { $regex: skill, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.title': { $regex: skill, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.description': { $regex: skill, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.projects.title': { $regex: skill, $options: 'i' } },
          { 'basicProfile.about': { $regex: skill, $options: 'i' } },
          { 'enhancedProfile.domain': { $regex: skill, $options: 'i' } },
          { 'enhancedProfile.professionalRole': { $regex: skill, $options: 'i' } }
        );
      });
      conditions.push({ $or: skillConditions });
    }
    
    // Professional roles
    if (params.roles?.length > 0) {
      const roleConditions = [];
      params.roles.forEach(role => {
        roleConditions.push(
          { 'enhancedProfile.professionalRole': { $regex: role, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.headline': { $regex: role, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.currentCompanyTitle': { $regex: role, $options: 'i' } }
        );
      });
      conditions.push({ $or: roleConditions });
    }
    
    // Special requirements (legal help, mentorship, etc.)
    if (params.requirements?.length > 0) {
      const reqConditions = [];
      params.requirements.forEach(req => {
        reqConditions.push(
          { 'enhancedProfile.communityGive': { $regex: req, $options: 'i' } },
          { 'enhancedProfile.domain': { $regex: req, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.headline': { $regex: req, $options: 'i' } }
        );
      });
      conditions.push({ $or: reqConditions });
    }
    
    // Ensure profiles have actual data
    conditions.push({
      $or: [
        { 'enhancedProfile.fullName': { $exists: true, $ne: null, $ne: '' } },
        { 'basicProfile.name': { $exists: true, $ne: null, $ne: '' } }
      ]
    });
    
    return conditions.length > 0 ? { $and: conditions } : {};
  }

  // Execute precise search
  async executePreciseSearch(query, params) {
    try {
      const db = getDatabase();
      
      const results = await db.collection('users')
        .find(query)
        .limit(20)
        .toArray();
      
      // Score and rank results based on match quality
      const scoredResults = results.map(user => {
        let score = 0;
        
        // Location match (highest priority for location-based searches)
        if (params.locations?.length > 0) {
          params.locations.forEach(loc => {
            const userData = JSON.stringify(user).toLowerCase();
            if (userData.includes(loc.toLowerCase())) {
              score += 10;
            }
          });
        }
        
        // Skills match
        if (params.skills?.length > 0) {
          params.skills.forEach(skill => {
            const userData = JSON.stringify(user).toLowerCase();
            const matches = (userData.match(new RegExp(skill.toLowerCase(), 'g')) || []).length;
            score += matches * 3;
          });
        }
        
        // Profile completeness
        if (user.enhancedProfile?.completed) score += 5;
        if (user.basicProfile?.linkedinScrapedData?.experience?.length > 0) score += 3;
        
        // Recent activity
        if (user.metadata?.lastActive) {
          const daysSince = (Date.now() - new Date(user.metadata.lastActive)) / (1000 * 60 * 60 * 24);
          if (daysSince < 30) score += 5;
        }
        
        return { ...user, matchScore: score };
      });
      
      // Sort by score and return only top matches
      scoredResults.sort((a, b) => b.matchScore - a.matchScore);
      
      // Return only high-scoring matches (top 3)
      const threshold = scoredResults[0]?.matchScore * 0.5 || 10;
      return scoredResults.filter(r => r.matchScore >= threshold).slice(0, 3);
      
    } catch (error) {
      logError(error, { operation: 'executePreciseSearch' });
      return [];
    }
  }

  // Search nearby locations if no exact matches
  async searchNearbyLocations(originalParams) {
    const nearbyLocations = [];
    
    originalParams.locations?.forEach(loc => {
      const nearby = this.locationProximity[loc.toLowerCase()];
      if (nearby) {
        nearbyLocations.push(...nearby);
      }
    });
    
    if (nearbyLocations.length === 0) return [];
    
    const nearbyParams = {
      ...originalParams,
      locations: nearbyLocations
    };
    
    const query = this.buildPreciseQuery(nearbyParams);
    return await this.executePreciseSearch(query, nearbyParams);
  }

  // Format precise response
  async formatPreciseResponse(results, params, originalQuery, isNearbySearch) {
    if (results.length === 0) {
      return this.getNoResultsResponse(params, originalQuery);
    }
    
    let response = '';
    
    // Header based on results
    if (isNearbySearch) {
      const requestedLocation = params.locations?.[0] || 'your location';
      response = `No exact matches in ${requestedLocation}, but found ${results.length} relevant alumni from nearby areas:\n\n`;
    } else if (results.length === 1) {
      response = `Found 1 highly relevant match for your search:\n\n`;
    } else {
      response = `Found ${results.length} highly relevant matches:\n\n`;
    }
    
    // Format each profile (clean, no extra actions)
    results.forEach((user, index) => {
      response += this.formatCleanProfile(user, index + 1, params);
      if (index < results.length - 1) {
        response += '\n━━━━━━━━━━━━━━━\n\n';
      }
    });
    
    return response;
  }

  // Format clean profile without unnecessary elements
  formatCleanProfile(user, index, params) {
    let profile = '';
    
    // Name and verification
    const name = user.enhancedProfile?.fullName || 
                 user.basicProfile?.linkedinScrapedData?.fullName || 
                 user.basicProfile?.name || 'Alumni Member';
    
    profile += `*${index}. ${name}*\n`;
    
    // Professional headline
    const headline = user.basicProfile?.linkedinScrapedData?.headline || 
                    user.enhancedProfile?.professionalRole || '';
    if (headline) {
      profile += `💼 ${headline}\n`;
    }
    
    // Current position
    const currentCompany = user.basicProfile?.linkedinScrapedData?.currentCompany;
    if (currentCompany) {
      const title = user.basicProfile?.linkedinScrapedData?.currentCompanyTitle;
      profile += `🏢 ${title ? title + ' at ' : ''}${currentCompany}\n`;
    }
    
    // Location
    const location = user.basicProfile?.linkedinScrapedData?.location || 
                    `${user.enhancedProfile?.city || ''} ${user.enhancedProfile?.state || ''}`.trim();
    if (location) {
      profile += `📍 ${location}\n`;
    }
    
    // Domain if relevant
    if (user.enhancedProfile?.domain) {
      profile += `🎯 ${user.enhancedProfile.domain}\n`;
    }
    
    // Skills (only if searched for skills)
    if (params.skills?.length > 0) {
      const skills = user.basicProfile?.linkedinScrapedData?.skills || [];
      if (skills.length > 0) {
        const relevantSkills = skills.filter(skill => 
          params.skills.some(searchSkill => 
            skill.toLowerCase().includes(searchSkill.toLowerCase())
          )
        );
        if (relevantSkills.length > 0) {
          profile += `💡 Skills: ${relevantSkills.slice(0, 5).join(', ')}\n`;
        }
      }
    }
    
    // Experience summary (brief)
    const experience = user.basicProfile?.linkedinScrapedData?.experience || [];
    if (experience.length > 0 && params.skills?.length > 0) {
      const relevantExp = experience.find(exp => 
        params.skills.some(skill => 
          (exp.title + ' ' + exp.description).toLowerCase().includes(skill.toLowerCase())
        )
      );
      if (relevantExp) {
        profile += `\n📋 Relevant Experience:\n`;
        profile += `• ${relevantExp.title} at ${relevantExp.company}\n`;
      }
    }
    
    // Community offerings (if searching for help)
    if (params.requirements?.includes('help') || params.requirements?.includes('mentorship')) {
      if (user.enhancedProfile?.communityGive?.length > 0) {
        profile += `\n🤝 Can help with: ${user.enhancedProfile.communityGive.slice(0, 3).join(', ')}\n`;
      }
    }
    
    // LinkedIn for connection
    const linkedIn = user.basicProfile?.linkedin || user.enhancedProfile?.linkedin;
    if (linkedIn) {
      profile += `\n🔗 Connect: ${linkedIn}`;
    }
    
    return profile;
  }

  // No results response
  getNoResultsResponse(params, originalQuery) {
    let response = `No matches found for: "${originalQuery}"\n\n`;
    
    if (params.locations?.length > 0) {
      response += `No alumni found in ${params.locations.join(', ')}.\n`;
      response += `Try searching in nearby cities or remove location filter.\n\n`;
    }
    
    if (params.skills?.length > 0) {
      response += `No one with ${params.skills.join(', ')} skills found.\n`;
      response += `Try broader terms or different skills.\n\n`;
    }
    
    response += `💡 Suggestions:\n`;
    response += `• Try simpler search terms\n`;
    response += `• Search by single criteria first\n`;
    response += `• Check spelling of locations\n`;
    
    return response;
  }

  // Store context for follow-ups
  storeContext(user, query, results, params) {
    if (!user?._id) return;
    
    const userId = user._id.toString();
    if (!this.conversationMemory.has(userId)) {
      this.conversationMemory.set(userId, []);
    }
    
    const memory = this.conversationMemory.get(userId);
    memory.push({
      query,
      results: results.map(r => ({ _id: r._id, name: r.basicProfile?.name })),
      params,
      timestamp: Date.now()
    });
    
    if (memory.length > 5) memory.shift();
  }

  // Basic parameter extraction fallback
  basicParamExtraction(query) {
    const lower = query.toLowerCase();
    const params = {
      skills: [],
      locations: [],
      requirements: []
    };
    
    // Common skills
    const skillKeywords = ['developer', 'designer', 'lawyer', 'legal', 'engineer', 
                          'manager', 'analyst', 'consultant', 'founder', 'entrepreneur'];
    skillKeywords.forEach(skill => {
      if (lower.includes(skill)) params.skills.push(skill);
    });
    
    // Common locations
    const cities = ['pune', 'mumbai', 'bangalore', 'delhi', 'chennai', 'kolkata', 
                   'hyderabad', 'ahmedabad', 'surat', 'jaipur'];
    cities.forEach(city => {
      if (lower.includes(city)) params.locations.push(city);
    });
    
    // Requirements
    if (lower.includes('help')) params.requirements.push('help');
    if (lower.includes('legal')) params.requirements.push('legal');
    if (lower.includes('mentor')) params.requirements.push('mentorship');
    
    return params;
  }

  // Error response
  getErrorResponse() {
    return "I'm having trouble processing your request. Please try rephrasing your search or ask a specific question about alumni or any general topic.";
  }
}

module.exports = new IntelligentSearchService();