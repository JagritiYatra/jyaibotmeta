// God-Level Search Service - Supreme Intelligence for JY Alumni Network
// Uses ALL profile data to provide comprehensive, intelligent responses

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

class GodLevelSearchService {
  constructor() {
    this.conversationMemory = new Map();
    this.searchCache = new Map();
    this.initializeSearchCapabilities();
  }

  initializeSearchCapabilities() {
    // Comprehensive field mapping for intelligent search
    this.searchableFields = {
      // Identity fields
      identity: [
        'basicProfile.name',
        'basicProfile.linkedinScrapedData.fullName',
        'enhancedProfile.fullName',
        'yatraId'
      ],
      
      // Professional fields
      professional: [
        'basicProfile.linkedinScrapedData.headline',
        'basicProfile.linkedinScrapedData.currentCompany',
        'basicProfile.linkedinScrapedData.currentCompanyTitle',
        'basicProfile.linkedinScrapedData.experience.company',
        'basicProfile.linkedinScrapedData.experience.title',
        'enhancedProfile.professionalRole',
        'enhancedProfile.domain'
      ],
      
      // Location fields
      location: [
        'basicProfile.linkedinScrapedData.location',
        'enhancedProfile.country',
        'enhancedProfile.state',
        'enhancedProfile.city',
        'enhancedProfile.currentAddress',
        'enhancedProfile.permanentAddress'
      ],
      
      // Education fields
      education: [
        'basicProfile.linkedinScrapedData.education.title',
        'basicProfile.linkedinScrapedData.education.degree',
        'basicProfile.linkedinScrapedData.education.field'
      ],
      
      // Skills and expertise
      skills: [
        'basicProfile.linkedinScrapedData.skills',
        'basicProfile.linkedinScrapedData.courses.title',
        'basicProfile.linkedinScrapedData.certifications.title',
        'basicProfile.linkedinScrapedData.projects.title'
      ],
      
      // Community engagement
      community: [
        'enhancedProfile.yatraHelp',
        'enhancedProfile.communityAsks',
        'enhancedProfile.communityGive',
        'basicProfile.about'
      ],
      
      // Contact fields
      contact: [
        'basicProfile.email',
        'basicProfile.linkedin',
        'enhancedProfile.phoneNumber',
        'enhancedProfile.instagram',
        'enhancedProfile.linkedin',
        'whatsappNumber'
      ]
    };
  }

  // Master search function with supreme intelligence
  async performGodLevelSearch(query, user, context) {
    try {
      logSuccess('god_level_search_initiated', { query, userId: user?._id });
      
      // Step 1: Understand the query with deep AI analysis
      const queryIntelligence = await this.understandQueryDeeply(query, user, context);
      
      // Step 2: Check if this is a follow-up question
      const isFollowUp = await this.detectFollowUpIntent(query, user);
      
      // Step 3: Build intelligent search query
      const searchQuery = await this.buildIntelligentQuery(queryIntelligence, isFollowUp, user);
      
      // Step 4: Execute search with all data fields
      const results = await this.executeComprehensiveSearch(searchQuery);
      
      // Step 5: Rank and filter results intelligently
      const rankedResults = await this.rankResultsIntelligently(results, queryIntelligence);
      
      // Step 6: Format response with rich, comprehensive data
      const response = await this.formatGodLevelResponse(rankedResults, queryIntelligence, query);
      
      // Step 7: Store context for follow-up questions
      this.storeConversationContext(user, query, results, queryIntelligence);
      
      logSuccess('god_level_search_completed', { 
        query, 
        resultsCount: rankedResults.length,
        responseLength: response.length 
      });
      
      return response;
      
    } catch (error) {
      logError(error, { operation: 'performGodLevelSearch', query });
      return this.getIntelligentFallback(query);
    }
  }

  // Deep understanding of query using GPT-4
  async understandQueryDeeply(query, user, context) {
    try {
      const conversationHistory = this.conversationMemory.get(user?._id) || [];
      
      const prompt = `You are an AI with supreme intelligence analyzing alumni network queries.
      
User Query: "${query}"

User Context:
- Name: ${user?.basicProfile?.name || 'Unknown'}
- Professional Role: ${user?.enhancedProfile?.professionalRole || 'Unknown'}
- Location: ${user?.basicProfile?.linkedinScrapedData?.location || user?.enhancedProfile?.city || 'Unknown'}
- Has Complete Profile: ${user?.enhancedProfile?.completed ? 'Yes' : 'No'}

Recent Conversation:
${conversationHistory.slice(-3).map(h => `${h.type}: ${h.content}`).join('\n') || 'No previous conversation'}

Analyze this query deeply and extract:
1. Primary Intent: What exactly does the user want?
2. Search Targets: Who/what are they looking for?
3. Specific Requirements: Any specific criteria mentioned?
4. Implicit Needs: What might they need but haven't directly asked?
5. Information Depth: How detailed should the response be?
6. Contact Request: Do they want contact information?
7. Follow-up Detection: Is this related to a previous query?
8. Urgency Level: How urgent is this request?
9. Response Style: Professional/Casual/Detailed/Brief
10. Special Context: Any special considerations?

Extract ALL entities:
- Names (people, companies, organizations, colleges)
- Locations (countries, states, cities, areas)
- Skills/Technologies
- Professional roles/titles
- Industries/Domains
- Time references
- Qualifications

Return comprehensive JSON with all extracted information.`;

      const completion = await openai.chat.completions.create({
        model: config.ai.model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const intelligence = JSON.parse(completion.choices[0].message.content);
      
      // Enhance with pattern matching
      intelligence.enhanced = this.enhanceWithPatterns(query);
      
      return intelligence;
      
    } catch (error) {
      logError(error, { operation: 'understandQueryDeeply' });
      return this.getBasicUnderstanding(query);
    }
  }

  // Detect if this is a follow-up question
  async detectFollowUpIntent(query, user) {
    const userId = user?._id?.toString();
    if (!userId || !this.conversationMemory.has(userId)) {
      return false;
    }
    
    const history = this.conversationMemory.get(userId);
    const lastEntry = history[history.length - 1];
    
    if (!lastEntry) return false;
    
    // Check time difference (within 5 minutes)
    const timeDiff = Date.now() - lastEntry.timestamp;
    if (timeDiff > 5 * 60 * 1000) return false;
    
    // Check for follow-up indicators
    const followUpIndicators = [
      /^(and|also|what about|how about|tell me more|more|another|any other)/i,
      /^(his|her|their|them)/i,
      /^(contact|phone|email|linkedin)/i,
      /^(yes|no|okay|sure)/i,
      /^show me/i,
      /^details/i
    ];
    
    return followUpIndicators.some(pattern => pattern.test(query));
  }

  // Build intelligent MongoDB query
  async buildIntelligentQuery(intelligence, isFollowUp, user) {
    const conditions = [];
    
    // Handle follow-up queries
    if (isFollowUp) {
      const userId = user?._id?.toString();
      const history = this.conversationMemory.get(userId);
      if (history && history.length > 0) {
        const lastResults = history[history.length - 1].results;
        if (lastResults && lastResults.length > 0) {
          // If asking for contact info of previous results
          if (/contact|phone|email|linkedin/i.test(intelligence.query)) {
            return { _id: { $in: lastResults.map(r => r._id) } };
          }
        }
      }
    }
    
    // Build comprehensive search conditions
    
    // Name search (if specified)
    if (intelligence.entities?.names?.length > 0) {
      const nameConditions = [];
      intelligence.entities.names.forEach(name => {
        this.searchableFields.identity.forEach(field => {
          nameConditions.push({ [field]: { $regex: name, $options: 'i' } });
        });
      });
      if (nameConditions.length > 0) {
        conditions.push({ $or: nameConditions });
      }
    }
    
    // Location search (if specified)
    if (intelligence.entities?.locations?.length > 0) {
      const locationConditions = [];
      intelligence.entities.locations.forEach(location => {
        this.searchableFields.location.forEach(field => {
          locationConditions.push({ [field]: { $regex: location, $options: 'i' } });
        });
      });
      if (locationConditions.length > 0) {
        conditions.push({ $or: locationConditions });
      }
    }
    
    // Professional search (skills, roles, companies)
    const professionalTerms = [
      ...(intelligence.entities?.skills || []),
      ...(intelligence.entities?.roles || []),
      ...(intelligence.entities?.companies || [])
    ];
    
    if (professionalTerms.length > 0) {
      const profConditions = [];
      professionalTerms.forEach(term => {
        this.searchableFields.professional.forEach(field => {
          profConditions.push({ [field]: { $regex: term, $options: 'i' } });
        });
        this.searchableFields.skills.forEach(field => {
          profConditions.push({ [field]: { $regex: term, $options: 'i' } });
        });
      });
      if (profConditions.length > 0) {
        conditions.push({ $or: profConditions });
      }
    }
    
    // Education search
    if (intelligence.entities?.education?.length > 0) {
      const eduConditions = [];
      intelligence.entities.education.forEach(edu => {
        this.searchableFields.education.forEach(field => {
          eduConditions.push({ [field]: { $regex: edu, $options: 'i' } });
        });
      });
      if (eduConditions.length > 0) {
        conditions.push({ $or: eduConditions });
      }
    }
    
    // Domain/Industry search
    if (intelligence.entities?.industries?.length > 0) {
      conditions.push({
        $or: intelligence.entities.industries.map(industry => ({
          'enhancedProfile.domain': { $regex: industry, $options: 'i' }
        }))
      });
    }
    
    // Gender filter
    if (intelligence.entities?.gender) {
      conditions.push({
        'enhancedProfile.gender': { $regex: intelligence.entities.gender, $options: 'i' }
      });
    }
    
    // If no specific conditions, use text search
    if (conditions.length === 0 && intelligence.searchTargets) {
      const searchText = intelligence.searchTargets.join(' ');
      return { $text: { $search: searchText } };
    }
    
    return conditions.length > 0 ? { $and: conditions } : {};
  }

  // Execute comprehensive search
  async executeComprehensiveSearch(searchQuery) {
    try {
      const db = getDatabase();
      
      // Add filter for profiles with actual data
      const enhancedQuery = {
        $and: [
          searchQuery,
          {
            $or: [
              { 'enhancedProfile.fullName': { $exists: true, $ne: null } },
              { 'basicProfile.name': { $exists: true, $ne: null } }
            ]
          }
        ]
      };
      
      const results = await db.collection('users')
        .find(enhancedQuery)
        .limit(50)
        .toArray();
      
      logSuccess('comprehensive_search_executed', { 
        query: JSON.stringify(searchQuery),
        resultsCount: results.length 
      });
      
      return results;
      
    } catch (error) {
      logError(error, { operation: 'executeComprehensiveSearch' });
      return [];
    }
  }

  // Rank results intelligently
  async rankResultsIntelligently(results, intelligence) {
    if (results.length === 0) return [];
    
    // Score each result based on relevance
    const scoredResults = results.map(user => {
      let score = 0;
      
      // Profile completeness score
      if (user.enhancedProfile?.completed) score += 10;
      if (user.enhancedProfile?.fullName) score += 5;
      if (user.basicProfile?.linkedinScrapedData?.experience?.length > 0) score += 5;
      
      // Activity score
      if (user.metadata?.lastActive) {
        const daysSinceActive = (Date.now() - new Date(user.metadata.lastActive)) / (1000 * 60 * 60 * 24);
        if (daysSinceActive < 7) score += 10;
        else if (daysSinceActive < 30) score += 5;
        else if (daysSinceActive < 90) score += 2;
      }
      
      // Match quality score
      const searchTerms = [
        ...(intelligence.entities?.names || []),
        ...(intelligence.entities?.skills || []),
        ...(intelligence.entities?.locations || [])
      ];
      
      searchTerms.forEach(term => {
        const termLower = term.toLowerCase();
        const userData = JSON.stringify(user).toLowerCase();
        const matches = (userData.match(new RegExp(termLower, 'g')) || []).length;
        score += matches * 2;
      });
      
      // Professional experience score
      const experience = user.basicProfile?.linkedinScrapedData?.experience || [];
      score += Math.min(experience.length * 2, 10);
      
      // Community engagement score
      if (user.enhancedProfile?.communityAsks?.length > 0) score += 3;
      if (user.enhancedProfile?.communityGive?.length > 0) score += 3;
      
      return { ...user, relevanceScore: score };
    });
    
    // Sort by relevance score
    scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Return top results
    return scoredResults.slice(0, 20);
  }

  // Format god-level response with all available data
  async formatGodLevelResponse(results, intelligence, originalQuery) {
    if (results.length === 0) {
      return this.getNoResultsResponse(intelligence, originalQuery);
    }
    
    let response = '';
    
    // Header based on search intent
    if (results.length === 1) {
      response = `✨ **Found the perfect match for your search!**\n\n`;
    } else {
      response = `🎯 **Found ${results.length} amazing alumni matching your criteria!**\n\n`;
    }
    
    // Add search context
    if (intelligence.primaryIntent) {
      response += `📍 *Search: ${originalQuery}*\n`;
      response += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
    
    // Format each result with comprehensive data
    results.forEach((user, index) => {
      response += this.formatComprehensiveProfile(user, index + 1, intelligence);
      
      if (index < results.length - 1) {
        response += '\n───────────────────────\n\n';
      }
    });
    
    // Add footer with helpful suggestions
    response += this.getHelpfulFooter(results, intelligence);
    
    return response;
  }

  // Format comprehensive profile with all data
  formatComprehensiveProfile(user, index, intelligence) {
    let profile = '';
    
    // Name and headline
    const name = user.enhancedProfile?.fullName || 
                 user.basicProfile?.linkedinScrapedData?.fullName || 
                 user.basicProfile?.name || 'Alumni Member';
    
    profile += `**${index}. ${name}** ${user.enhancedProfile?.completed ? '✅' : ''}\n`;
    
    // Professional headline
    const headline = user.basicProfile?.linkedinScrapedData?.headline || 
                    user.enhancedProfile?.professionalRole || '';
    if (headline) {
      profile += `💼 *${headline}*\n`;
    }
    
    // Current position
    const currentCompany = user.basicProfile?.linkedinScrapedData?.currentCompany;
    const currentTitle = user.basicProfile?.linkedinScrapedData?.currentCompanyTitle;
    if (currentCompany || currentTitle) {
      profile += `🏢 **Currently:** ${currentTitle ? currentTitle + ' at ' : ''}${currentCompany || ''}\n`;
    }
    
    // Location
    const location = user.basicProfile?.linkedinScrapedData?.location || 
                    `${user.enhancedProfile?.city || ''} ${user.enhancedProfile?.state || ''} ${user.enhancedProfile?.country || ''}`.trim();
    if (location) {
      profile += `📍 **Location:** ${location}\n`;
    }
    
    // Domain/Industry
    if (user.enhancedProfile?.domain) {
      profile += `🎯 **Domain:** ${user.enhancedProfile.domain}\n`;
    }
    
    // About/Bio
    const about = user.basicProfile?.about || user.basicProfile?.linkedinScrapedData?.about;
    if (about && about.length > 0) {
      const shortAbout = about.length > 150 ? about.substring(0, 150) + '...' : about;
      profile += `\n📝 **About:** ${shortAbout}\n`;
    }
    
    // Experience summary
    const experience = user.basicProfile?.linkedinScrapedData?.experience || [];
    if (experience.length > 0) {
      profile += `\n🏆 **Experience Highlights:**\n`;
      experience.slice(0, 3).forEach(exp => {
        const title = exp.title || exp.positions?.[0]?.title;
        const company = exp.company;
        if (title || company) {
          profile += `   • ${title ? title : ''}${title && company ? ' at ' : ''}${company || ''}\n`;
        }
      });
      if (experience.length > 3) {
        profile += `   • *+${experience.length - 3} more positions*\n`;
      }
    }
    
    // Education
    const education = user.basicProfile?.linkedinScrapedData?.education || [];
    if (education.length > 0) {
      profile += `\n🎓 **Education:**\n`;
      education.slice(0, 2).forEach(edu => {
        if (edu.title) {
          profile += `   • ${edu.title}`;
          if (edu.degree) profile += ` - ${edu.degree}`;
          profile += '\n';
        }
      });
    }
    
    // Skills
    const skills = user.basicProfile?.linkedinScrapedData?.skills || [];
    if (skills.length > 0) {
      const topSkills = skills.slice(0, 5).join(', ');
      profile += `\n💡 **Skills:** ${topSkills}`;
      if (skills.length > 5) {
        profile += ` +${skills.length - 5} more`;
      }
      profile += '\n';
    }
    
    // Community engagement
    if (user.enhancedProfile?.communityAsks?.length > 0) {
      profile += `\n🤝 **Looking for:** ${user.enhancedProfile.communityAsks.slice(0, 3).join(', ')}\n`;
    }
    
    if (user.enhancedProfile?.communityGive?.length > 0) {
      profile += `💝 **Can offer:** ${user.enhancedProfile.communityGive.slice(0, 3).join(', ')}\n`;
    }
    
    // Yatra impact
    if (user.enhancedProfile?.yatraHelp?.length > 0) {
      profile += `\n🚂 **Yatra Impact:** ${user.enhancedProfile.yatraHelp.join(', ')}\n`;
    }
    
    // Contact information (if requested or appropriate)
    if (intelligence.contactRequest || intelligence.primaryIntent === 'connection_request') {
      profile += `\n📧 **Connect:**\n`;
      
      if (user.basicProfile?.email) {
        profile += `   • Email: ${user.basicProfile.email}\n`;
      }
      
      if (user.basicProfile?.linkedin || user.enhancedProfile?.linkedin) {
        const linkedinUrl = user.basicProfile?.linkedin || user.enhancedProfile?.linkedin;
        profile += `   • LinkedIn: ${linkedinUrl}\n`;
      }
      
      if (user.enhancedProfile?.instagram) {
        profile += `   • Instagram: ${user.enhancedProfile.instagram}\n`;
      }
      
      if (user.enhancedProfile?.phoneNumber && intelligence.urgencyLevel === 'high') {
        // Only show phone for urgent requests
        profile += `   • Phone: ${user.enhancedProfile.phoneNumber}\n`;
      }
    } else {
      // Just show LinkedIn for professional connection
      if (user.basicProfile?.linkedin || user.enhancedProfile?.linkedin) {
        const linkedinUrl = user.basicProfile?.linkedin || user.enhancedProfile?.linkedin;
        profile += `\n🔗 **Connect:** ${linkedinUrl}\n`;
      }
    }
    
    // Yatra batch
    if (user.yatraId) {
      profile += `\n🎫 *Yatra ID: ${user.yatraId}*`;
    }
    
    return profile;
  }

  // Get no results response
  getNoResultsResponse(intelligence, originalQuery) {
    let response = `😔 **No exact matches found for:** "${originalQuery}"\n\n`;
    
    response += `💡 **Suggestions to improve your search:**\n`;
    response += `• Try using broader terms (e.g., "developer" instead of "React developer")\n`;
    response += `• Check spelling of names and locations\n`;
    response += `• Use single keywords instead of long phrases\n`;
    response += `• Try searching by domain: "Technology", "Healthcare", etc.\n\n`;
    
    response += `📍 **Popular searches that work:**\n`;
    response += `• "entrepreneurs in Bangalore"\n`;
    response += `• "Technology experts"\n`;
    response += `• "alumni from Delhi"\n`;
    response += `• "Startup founders"\n\n`;
    
    response += `Need help? Just ask "How do I search for alumni?" and I'll guide you! 🤝`;
    
    return response;
  }

  // Get helpful footer
  getHelpfulFooter(results, intelligence) {
    let footer = '\n\n━━━━━━━━━━━━━━━━━━━━━━\n';
    
    if (results.length > 5) {
      footer += `\n📊 *Showing top ${Math.min(results.length, 20)} most relevant results*\n`;
    }
    
    footer += '\n💡 **Quick Actions:**\n';
    footer += '• Reply "contact" to get contact details\n';
    footer += '• Reply "more" to see additional results\n';
    footer += '• Ask about specific skills or locations\n';
    footer += '• Say "filter by [criteria]" to refine\n';
    
    if (results.some(r => !r.enhancedProfile?.completed)) {
      footer += '\n*Note: Some profiles may have limited information*';
    }
    
    return footer;
  }

  // Store conversation context
  storeConversationContext(user, query, results, intelligence) {
    if (!user?._id) return;
    
    const userId = user._id.toString();
    if (!this.conversationMemory.has(userId)) {
      this.conversationMemory.set(userId, []);
    }
    
    const memory = this.conversationMemory.get(userId);
    memory.push({
      type: 'search',
      content: query,
      results: results.map(r => ({ _id: r._id, name: r.basicProfile?.name })),
      intelligence,
      timestamp: Date.now()
    });
    
    // Keep only last 10 entries
    if (memory.length > 10) {
      memory.shift();
    }
  }

  // Pattern enhancement
  enhanceWithPatterns(query) {
    const patterns = {
      locationBased: /(.+?)\s+from\s+(.+)/i,
      skillBased: /(.+?)\s+(expert|developer|engineer|designer|analyst)/i,
      companyBased: /(.+?)\s+at\s+(.+)/i,
      roleBased: /(founder|ceo|cto|manager|director|head)\s+of\s+(.+)/i,
      educationBased: /alumni\s+of\s+(.+)/i,
      genderBased: /(female|male|women|men)\s+(.+)/i
    };
    
    const enhancements = {};
    
    for (const [type, pattern] of Object.entries(patterns)) {
      const match = query.match(pattern);
      if (match) {
        enhancements[type] = match;
      }
    }
    
    return enhancements;
  }

  // Basic understanding fallback
  getBasicUnderstanding(query) {
    const keywords = query.toLowerCase().split(/\s+/).filter(word => 
      word.length > 2 && !['the', 'and', 'for', 'with', 'from'].includes(word)
    );
    
    return {
      primaryIntent: 'search',
      searchTargets: keywords,
      entities: {
        keywords
      },
      urgencyLevel: 'medium',
      contactRequest: /contact|phone|email|whatsapp|connect/i.test(query)
    };
  }

  // Intelligent fallback response
  getIntelligentFallback(query) {
    return `I understand you're looking for: "${query}"

I'm having a moment to process your request optimally. Meanwhile, you can try:

📍 **Search by location:** "alumni from Mumbai"
💼 **Search by role:** "entrepreneurs" or "startup founders"
🎯 **Search by domain:** "Technology experts" or "Healthcare professionals"
🏢 **Search by company:** "people at Google" or "TCS employees"

Please rephrase your search or try one of the examples above. I'm here to help! 🤝`;
  }
}

module.exports = new GodLevelSearchService();