// Professional Search Service - No emojis, proper follow-ups, accurate matching
const { getDatabase } = require('../config/database');
const { logError, logSuccess } = require('../middleware/logging');
const OpenAI = require('openai');
const { getConfig } = require('../config/environment');

// Initialize OpenAI
const config = getConfig();
const openai = config.ai?.apiKey ? new OpenAI({ apiKey: config.ai.apiKey }) : null;

class ProfessionalSearchService {
  constructor() {
    // Store last search results for follow-ups
    this.userSearchHistory = new Map();
    this.userLastResults = new Map();
  }

  // Main search function
  async search(query, user, session) {
    try {
      const userId = user?._id?.toString() || 'anonymous';
      
      // Check if this is a follow-up question
      if (this.isFollowUpQuery(query)) {
        return await this.handleFollowUp(query, userId);
      }
      
      // Check if it's a general knowledge question
      if (this.isGeneralKnowledge(query)) {
        return await this.handleGeneralKnowledge(query);
      }
      
      // Extract search parameters
      const params = await this.extractSearchParams(query);
      console.log('Search params:', JSON.stringify(params));
      
      // Build and execute search
      const dbQuery = this.buildDatabaseQuery(params);
      const results = await this.executeSearch(dbQuery);
      
      // Filter and rank results
      const relevantResults = this.filterResults(results, params);
      
      // Store for follow-ups
      this.storeSearchContext(userId, query, relevantResults);
      
      // Format response
      return this.formatResponse(relevantResults, params, query);
      
    } catch (error) {
      console.error('Search error:', error);
      return "I'm having trouble with that search. Please try again with specific criteria.";
    }
  }

  // Check if query is a follow-up
  isFollowUpQuery(query) {
    const lower = query.toLowerCase();
    const followUpPatterns = [
      /^(any\s*more|more|another|other|additional)/i,
      /^(show|tell|give)\s*(me)?\s*more/i,
      /^(what|how)\s*about/i,
      /^(details|info|information)\s*about/i,
      /^next/i,
      /more\s*(profiles?|people|results?)/i
    ];
    return followUpPatterns.some(pattern => pattern.test(query));
  }

  // Handle follow-up queries
  async handleFollowUp(query, userId) {
    const lastResults = this.userLastResults.get(userId);
    const searchHistory = this.userSearchHistory.get(userId);
    
    if (!lastResults || lastResults.length === 0) {
      return "I don't have any recent search results. Please make a new search first.";
    }
    
    // If asking for "more", show additional results
    if (/more|additional|another/i.test(query)) {
      // If we showed 3 results before, show next 3
      const shownCount = searchHistory?.shownCount || 3;
      const additionalResults = lastResults.slice(shownCount, shownCount + 3);
      
      if (additionalResults.length === 0) {
        return "No more results available for your previous search.";
      }
      
      // Update shown count
      if (searchHistory) {
        searchHistory.shownCount = shownCount + additionalResults.length;
      }
      
      return this.formatResponse(additionalResults, searchHistory?.params, searchHistory?.query, true);
    }
    
    // If asking for details about specific person
    const nameMatch = query.match(/about\s+(\w+)/i);
    if (nameMatch) {
      const name = nameMatch[1].toLowerCase();
      const person = lastResults.find(r => 
        (r.basicProfile?.name || '').toLowerCase().includes(name) ||
        (r.enhancedProfile?.fullName || '').toLowerCase().includes(name)
      );
      
      if (person) {
        return this.formatDetailedProfile(person);
      }
    }
    
    return "Please be more specific. You can ask for 'more results' or 'details about [name]'.";
  }

  // Check if it's a general knowledge question
  isGeneralKnowledge(query) {
    const patterns = [
      /^what\s+is\s+/i,
      /^explain\s+/i,
      /^define\s+/i,
      /^how\s+(does|do|to)\s+/i,
      /^why\s+/i,
      /^tell\s+me\s+about\s+(?!people|alumni|someone)/i
    ];
    return patterns.some(p => p.test(query));
  }

  // Handle general knowledge
  async handleGeneralKnowledge(query) {
    if (!openai) {
      return "I can help with alumni searches. For general knowledge, please be more specific.";
    }
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: `Answer concisely without emojis: ${query}`
        }],
        temperature: 0.7,
        max_tokens: 300
      });
      return response.choices[0].message.content;
    } catch (error) {
      return `I understand you're asking about "${query}". While I specialize in alumni connections, I can help with general questions too.`;
    }
  }

  // Extract search parameters
  async extractSearchParams(query) {
    const lower = query.toLowerCase();
    const params = {
      searchType: 'general',
      names: [],
      skills: [],
      locations: [],
      roles: [],
      companies: [],
      requirements: []
    };
    
    // Check for name search (who is X, find X, show me X)
    const namePatterns = [
      /who\s+is\s+(\w+(?:\s+\w+)?)/i,
      /find\s+(\w+(?:\s+\w+)?)/i,
      /show\s+me\s+(\w+(?:\s+\w+)?)\s*$/i,
      /profile\s+of\s+(\w+(?:\s+\w+)?)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = query.match(pattern);
      if (match) {
        params.searchType = 'name';
        params.names.push(match[1]);
      }
    }
    
    // Legal/Law help
    if (lower.includes('legal') || lower.includes('law')) {
      params.searchType = 'professional';
      params.skills.push('law', 'legal', 'lawyer', 'advocate', 'attorney');
      params.roles.push('lawyer', 'advocate', 'legal advisor', 'attorney', 'legal consultant');
      params.requirements.push('legal help');
    }
    
    // Web development
    if (lower.includes('web') || lower.includes('developer')) {
      params.searchType = 'professional';
      params.skills.push('web', 'javascript', 'react', 'html', 'css', 'frontend', 'backend');
      params.roles.push('developer', 'engineer', 'programmer');
    }
    
    // Locations
    const cities = [
      'pune', 'mumbai', 'bangalore', 'bengaluru', 'delhi', 'chennai', 
      'kolkata', 'hyderabad', 'ahmedabad', 'jaipur', 'noida', 'gurgaon'
    ];
    
    cities.forEach(city => {
      if (lower.includes(city)) {
        params.locations.push(city);
      }
    });
    
    // Professional roles
    const roleKeywords = {
      'entrepreneur': ['entrepreneur', 'founder', 'co-founder'],
      'developer': ['developer', 'engineer', 'programmer'],
      'designer': ['designer', 'ui', 'ux'],
      'manager': ['manager', 'lead', 'head'],
      'consultant': ['consultant', 'advisor'],
      'analyst': ['analyst', 'data scientist']
    };
    
    for (const [key, values] of Object.entries(roleKeywords)) {
      if (values.some(v => lower.includes(v))) {
        params.roles.push(...values);
      }
    }
    
    return params;
  }

  // Build database query
  buildDatabaseQuery(params) {
    const conditions = [];
    
    // Name search - highest priority
    if (params.names.length > 0) {
      const nameConditions = [];
      params.names.forEach(name => {
        nameConditions.push(
          { 'basicProfile.name': { $regex: name, $options: 'i' } },
          { 'enhancedProfile.fullName': { $regex: name, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.fullName': { $regex: name, $options: 'i' } }
        );
      });
      return { $or: nameConditions };
    }
    
    // Location filter - MUST match
    if (params.locations.length > 0) {
      const locConditions = [];
      params.locations.forEach(loc => {
        locConditions.push(
          { 'basicProfile.linkedinScrapedData.location': { $regex: loc, $options: 'i' } },
          { 'enhancedProfile.city': { $regex: loc, $options: 'i' } },
          { 'enhancedProfile.state': { $regex: loc, $options: 'i' } }
        );
      });
      conditions.push({ $or: locConditions });
    }
    
    // Skills and roles
    const skillRoleTerms = [...new Set([...params.skills, ...params.roles])];
    if (skillRoleTerms.length > 0) {
      const skillConditions = [];
      skillRoleTerms.forEach(term => {
        skillConditions.push(
          { 'basicProfile.linkedinScrapedData.headline': { $regex: term, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.title': { $regex: term, $options: 'i' } },
          { 'basicProfile.about': { $regex: term, $options: 'i' } },
          { 'enhancedProfile.professionalRole': { $regex: term, $options: 'i' } },
          { 'enhancedProfile.domain': { $regex: term, $options: 'i' } }
        );
      });
      conditions.push({ $or: skillConditions });
    }
    
    // Must have basic data
    conditions.push({
      $or: [
        { 'basicProfile.name': { $exists: true, $ne: null, $ne: '' } },
        { 'enhancedProfile.fullName': { $exists: true, $ne: null, $ne: '' } }
      ]
    });
    
    return conditions.length > 0 ? { $and: conditions } : {};
  }

  // Execute database search
  async executeSearch(query) {
    const db = getDatabase();
    return await db.collection('users')
      .find(query)
      .limit(100)
      .toArray();
  }

  // Filter results based on relevance
  filterResults(results, params) {
    if (results.length === 0) return [];
    
    // Score each result
    const scored = results.map(user => {
      let score = 0;
      const userData = JSON.stringify(user).toLowerCase();
      
      // Location match - very important
      if (params.locations.length > 0) {
        const hasLocation = params.locations.some(loc => 
          userData.includes(loc.toLowerCase())
        );
        if (hasLocation) {
          score += 30;
        } else {
          score -= 50; // Heavy penalty for wrong location
        }
      }
      
      // Skills match
      params.skills.forEach(skill => {
        const headline = (user.basicProfile?.linkedinScrapedData?.headline || '').toLowerCase();
        const experience = JSON.stringify(user.basicProfile?.linkedinScrapedData?.experience || []).toLowerCase();
        
        if (headline.includes(skill.toLowerCase())) {
          score += 20;
        } else if (experience.includes(skill.toLowerCase())) {
          score += 15;
        }
      });
      
      // Role match
      params.roles.forEach(role => {
        const headline = (user.basicProfile?.linkedinScrapedData?.headline || '').toLowerCase();
        const profRole = (user.enhancedProfile?.professionalRole || '').toLowerCase();
        
        if (headline.includes(role.toLowerCase()) || profRole.includes(role.toLowerCase())) {
          score += 25;
        }
      });
      
      // Penalize students when looking for professionals
      if (params.requirements.includes('legal help')) {
        if (userData.includes('student')) {
          score -= 100; // Heavy penalty for students
        }
        if (userData.includes('lawyer') || userData.includes('advocate')) {
          score += 50;
        }
      }
      
      // Profile completeness bonus
      if (user.enhancedProfile?.completed) score += 10;
      if (user.basicProfile?.linkedinScrapedData?.experience?.length > 0) score += 10;
      
      return { ...user, relevanceScore: score };
    });
    
    // Sort by score and filter positive scores only
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return scored.filter(r => r.relevanceScore > 0);
  }

  // Format response - NO EMOJIS
  formatResponse(results, params, query, isAdditional = false) {
    if (results.length === 0) {
      return this.getNoResultsMessage(params, query);
    }
    
    // Show only top 3 results initially
    const toShow = results.slice(0, 3);
    
    let response = '';
    if (isAdditional) {
      response = `Here are ${toShow.length} more results:\n\n`;
    } else {
      response = `Found ${Math.min(results.length, 10)} relevant ${results.length === 1 ? 'match' : 'matches'}:\n\n`;
    }
    
    toShow.forEach((user, index) => {
      const name = user.enhancedProfile?.fullName || 
                  user.basicProfile?.linkedinScrapedData?.fullName || 
                  user.basicProfile?.name || 'Alumni Member';
      
      const headline = user.basicProfile?.linkedinScrapedData?.headline || 
                      user.enhancedProfile?.professionalRole || '';
      
      const location = user.basicProfile?.linkedinScrapedData?.location || 
                      user.enhancedProfile?.city || '';
      
      const company = user.basicProfile?.linkedinScrapedData?.currentCompany || '';
      
      response += `${index + 1}. ${name}\n`;
      if (headline) response += `   Role: ${headline}\n`;
      if (company) response += `   Company: ${company}\n`;
      if (location) response += `   Location: ${location}\n`;
      
      // Add relevant experience for professional searches
      if (params.searchType === 'professional' && user.basicProfile?.linkedinScrapedData?.experience?.length > 0) {
        const relevantExp = user.basicProfile?.linkedinScrapedData?.experience[0];
        if (relevantExp?.title) {
          response += `   Experience: ${relevantExp.title} at ${relevantExp.company || 'Company'}\n`;
        }
      }
      
      // LinkedIn
      const linkedin = user.basicProfile?.linkedin || user.enhancedProfile?.linkedin;
      if (linkedin) {
        response += `   LinkedIn: ${linkedin}\n`;
      }
      
      response += '\n';
    });
    
    // Add note about more results if available
    if (results.length > 3 && !isAdditional) {
      response += `Showing top 3 results. Say "more" to see additional profiles.`;
    }
    
    return response.trim();
  }

  // Format detailed profile
  formatDetailedProfile(user) {
    const name = user.enhancedProfile?.fullName || user.basicProfile?.name || 'Alumni Member';
    
    let response = `Detailed Profile:\n\n`;
    response += `Name: ${name}\n`;
    
    if (user.basicProfile?.linkedinScrapedData?.headline) {
      response += `Professional Title: ${user.basicProfile.linkedinScrapedData.headline}\n`;
    }
    
    if (user.basicProfile?.linkedinScrapedData?.location) {
      response += `Location: ${user.basicProfile.linkedinScrapedData.location}\n`;
    }
    
    if (user.basicProfile?.about) {
      response += `\nAbout:\n${user.basicProfile.about}\n`;
    }
    
    if (user.basicProfile?.linkedinScrapedData?.experience?.length > 0) {
      response += `\nExperience:\n`;
      user.basicProfile.linkedinScrapedData.experience.slice(0, 3).forEach(exp => {
        response += `- ${exp.title} at ${exp.company}\n`;
      });
    }
    
    if (user.basicProfile?.linkedinScrapedData?.education?.length > 0) {
      response += `\nEducation:\n`;
      user.basicProfile.linkedinScrapedData.education.slice(0, 2).forEach(edu => {
        response += `- ${edu.title}`;
        if (edu.degree) response += ` (${edu.degree})`;
        response += '\n';
      });
    }
    
    const linkedin = user.basicProfile?.linkedin || user.enhancedProfile?.linkedin;
    if (linkedin) {
      response += `\nConnect on LinkedIn: ${linkedin}\n`;
    }
    
    return response;
  }

  // No results message
  getNoResultsMessage(params, query) {
    let message = `No matches found for "${query}"\n\n`;
    
    if (params.locations.length > 0) {
      message += `No alumni found in ${params.locations.join(', ')}.\n`;
      message += `Try searching without location filter or try different cities.\n\n`;
    }
    
    if (params.skills.length > 0) {
      message += `No one found with those specific skills.\n`;
      message += `Try broader search terms.\n\n`;
    }
    
    message += `Suggestions:\n`;
    message += `- Search by single criteria first\n`;
    message += `- Try "entrepreneurs" or "developers"\n`;
    message += `- Search by city: "people in Mumbai"\n`;
    message += `- Find by name: "who is [name]"`;
    
    return message;
  }

  // Store search context for follow-ups
  storeSearchContext(userId, query, results) {
    this.userLastResults.set(userId, results);
    this.userSearchHistory.set(userId, {
      query,
      results: results.map(r => ({
        id: r._id,
        name: r.basicProfile?.name || r.enhancedProfile?.fullName
      })),
      params: this.extractSearchParams(query),
      shownCount: Math.min(3, results.length),
      timestamp: Date.now()
    });
    
    // Clean old entries after 10 minutes
    setTimeout(() => {
      this.userLastResults.delete(userId);
      this.userSearchHistory.delete(userId);
    }, 10 * 60 * 1000);
  }
}

module.exports = new ProfessionalSearchService();