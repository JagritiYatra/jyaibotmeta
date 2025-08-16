// Ultimate Search Service - Intelligent, accurate, and context-aware
const { getDatabase } = require('../config/database');
const { logError, logSuccess } = require('../middleware/logging');
const OpenAI = require('openai');
const { getConfig } = require('../config/environment');

// Initialize OpenAI
const config = getConfig();
const openai = config.ai?.apiKey ? new OpenAI({ apiKey: config.ai.apiKey }) : null;

class UltimateSearchService {
  constructor() {
    this.userSearchHistory = new Map();
    this.spellingCorrections = this.initSpellingCorrections();
  }

  initSpellingCorrections() {
    return {
      // Common misspellings
      'developper': 'developer',
      'develper': 'developer',
      'devloper': 'developer',
      'lawer': 'lawyer',
      'laywer': 'lawyer',
      'advocat': 'advocate',
      'enginer': 'engineer',
      'enterprenuer': 'entrepreneur',
      'enterprener': 'entrepreneur',
      'bengaluru': 'bangalore',
      'bengalore': 'bangalore',
      'mumbi': 'mumbai',
      'bombay': 'mumbai',
      'dilli': 'delhi',
      'kolkatta': 'kolkata',
      'calcutta': 'kolkata',
      'puna': 'pune',
      'poona': 'pune',
      'banglore': 'bangalore',
      'hyderbad': 'hyderabad',
      'hydrabadi': 'hyderabad',
      'ahmdabad': 'ahmedabad',
      'ahemdabad': 'ahmedabad',
      'leagal': 'legal',
      'ligal': 'legal',
      'tecnology': 'technology',
      'techonology': 'technology',
      'finence': 'finance',
      'finnance': 'finance',
      'helthcare': 'healthcare',
      'healtcare': 'healthcare',
      'maneger': 'manager',
      'managr': 'manager',
      'consulant': 'consultant',
      'analist': 'analyst',
      'analyt': 'analyst'
    };
  }

  // Main search with ultimate intelligence
  async search(query, user, session) {
    try {
      const userId = user?._id?.toString() || 'anonymous';
      
      // Check for follow-up
      if (this.isFollowUp(query)) {
        return await this.handleFollowUp(query, userId);
      }
      
      // Check for general knowledge
      if (this.isGeneralKnowledge(query)) {
        return await this.handleGeneralKnowledge(query);
      }
      
      // Correct spelling mistakes
      const correctedQuery = this.correctSpelling(query);
      if (correctedQuery !== query) {
        console.log(`Corrected spelling: "${query}" -> "${correctedQuery}"`);
      }
      
      // Extract comprehensive search parameters
      const params = await this.extractComprehensiveParams(correctedQuery);
      console.log('Comprehensive params:', JSON.stringify(params));
      
      // Build multi-stage search query
      const queries = this.buildMultiStageQueries(params);
      
      // Execute comprehensive search
      let allResults = [];
      for (const searchQuery of queries) {
        const results = await this.executeSearch(searchQuery);
        allResults = allResults.concat(results);
      }
      
      // Remove duplicates
      const uniqueResults = this.removeDuplicates(allResults);
      
      // Score and rank with match explanations
      const rankedResults = this.rankWithExplanations(uniqueResults, params, correctedQuery);
      
      // Store for follow-ups
      this.storeSearchHistory(userId, correctedQuery, rankedResults, params);
      
      // Format intelligent response
      return this.formatIntelligentResponse(rankedResults, params, correctedQuery);
      
    } catch (error) {
      console.error('Ultimate search error:', error);
      return "I'm having trouble with that search. Please try again.";
    }
  }

  // Correct common spelling mistakes
  correctSpelling(query) {
    let corrected = query.toLowerCase();
    
    // Apply known corrections
    for (const [wrong, right] of Object.entries(this.spellingCorrections)) {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      corrected = corrected.replace(regex, right);
    }
    
    return corrected;
  }

  // Extract comprehensive parameters
  async extractComprehensiveParams(query) {
    const lower = query.toLowerCase();
    const params = {
      originalQuery: query,
      searchType: 'general',
      names: [],
      skills: [],
      locations: [],
      roles: [],
      companies: [],
      domains: [],
      requirements: [],
      keywords: []
    };
    
    // Extract names (who is, find person by name)
    const namePatterns = [
      /who\s+is\s+([a-z]+(?:\s+[a-z]+)?)/i,
      /find\s+([a-z]+(?:\s+[a-z]+)?)\s*$/i,
      /profile\s+of\s+([a-z]+(?:\s+[a-z]+)?)/i,
      /([a-z]+(?:\s+[a-z]+)?)'s\s+profile/i
    ];
    
    for (const pattern of namePatterns) {
      const match = query.match(pattern);
      if (match) {
        params.searchType = 'name';
        params.names.push(match[1]);
      }
    }
    
    // Legal/Law requirements
    if (/\b(legal|law|lawyer|advocate|attorney|litigation|court|justice)\b/i.test(lower)) {
      params.searchType = 'professional';
      params.skills.push('law', 'legal', 'litigation', 'corporate law', 'legal advisory');
      params.roles.push('lawyer', 'advocate', 'legal advisor', 'attorney', 'legal consultant', 'legal counsel');
      params.domains.push('Legal', 'Law', 'Legal Services');
      
      if (lower.includes('help') || lower.includes('assist') || lower.includes('advice')) {
        params.requirements.push('legal assistance', 'legal advice', 'legal help');
      }
    }
    
    // Web/Software development
    if (/\b(web|website|software|app|application|developer|programmer|coding)\b/i.test(lower)) {
      params.searchType = 'professional';
      params.skills.push(
        'web development', 'javascript', 'react', 'angular', 'vue', 
        'html', 'css', 'node', 'nodejs', 'python', 'java', 'php',
        'frontend', 'backend', 'fullstack', 'full stack', 'api',
        'database', 'mongodb', 'mysql', 'postgresql'
      );
      params.roles.push(
        'developer', 'engineer', 'programmer', 'software engineer',
        'web developer', 'frontend developer', 'backend developer',
        'full stack developer', 'software developer'
      );
      params.domains.push('Technology', 'Software', 'IT');
    }
    
    // Entrepreneurs/Founders
    if (/\b(entrepreneur|founder|co-?founder|startup|business owner|ceo)\b/i.test(lower)) {
      params.roles.push('entrepreneur', 'founder', 'co-founder', 'ceo', 'business owner');
      params.keywords.push('startup', 'business', 'venture');
    }
    
    // Marketing/Sales
    if (/\b(marketing|sales|brand|digital marketing|social media|seo|growth)\b/i.test(lower)) {
      params.skills.push('marketing', 'sales', 'digital marketing', 'social media', 'seo', 'branding');
      params.roles.push('marketer', 'sales manager', 'marketing manager', 'growth hacker');
      params.domains.push('Marketing', 'Sales', 'Advertising');
    }
    
    // Finance
    if (/\b(finance|accounting|investment|banking|fintech|financial)\b/i.test(lower)) {
      params.skills.push('finance', 'accounting', 'investment', 'banking', 'financial analysis');
      params.roles.push('analyst', 'accountant', 'financial advisor', 'investment banker');
      params.domains.push('Finance', 'Banking', 'Fintech');
    }
    
    // Healthcare
    if (/\b(healthcare|medical|doctor|health|pharma|hospital)\b/i.test(lower)) {
      params.domains.push('Healthcare', 'Medical', 'Pharmaceutical');
      params.keywords.push('health', 'medical', 'wellness');
    }
    
    // Extract all locations (comprehensive list)
    const allCities = [
      'pune', 'mumbai', 'bangalore', 'bengaluru', 'delhi', 'new delhi',
      'chennai', 'kolkata', 'hyderabad', 'ahmedabad', 'surat', 'jaipur',
      'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal',
      'visakhapatnam', 'pimpri', 'chinchwad', 'patna', 'vadodara',
      'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut',
      'rajkot', 'kalyan', 'dombivli', 'vasai', 'virar', 'varanasi',
      'srinagar', 'aurangabad', 'dhanbad', 'amritsar', 'navi mumbai',
      'allahabad', 'ranchi', 'howrah', 'coimbatore', 'jabalpur',
      'gwalior', 'vijayawada', 'jodhpur', 'madurai', 'raipur',
      'kota', 'chandigarh', 'guwahati', 'solapur', 'hubli', 'dharwad',
      'noida', 'gurgaon', 'gurugram', 'goa', 'mangalore', 'trivandrum'
    ];
    
    allCities.forEach(city => {
      if (lower.includes(city)) {
        params.locations.push(city);
      }
    });
    
    // Extract states if mentioned
    const states = [
      'maharashtra', 'karnataka', 'tamil nadu', 'kerala', 'gujarat',
      'rajasthan', 'uttar pradesh', 'bihar', 'west bengal', 'telangana',
      'andhra pradesh', 'delhi', 'punjab', 'haryana', 'madhya pradesh'
    ];
    
    states.forEach(state => {
      if (lower.includes(state)) {
        params.locations.push(state);
      }
    });
    
    // Extract any remaining keywords
    const words = lower.split(/\s+/).filter(word => 
      word.length > 2 && 
      !['the', 'and', 'for', 'with', 'from', 'who', 'can', 'help', 'need', 'want', 'find', 'show', 'any', 'more'].includes(word)
    );
    params.keywords.push(...words);
    
    return params;
  }

  // Build multi-stage queries for comprehensive search
  buildMultiStageQueries(params) {
    const queries = [];
    
    // Query 1: Exact match on all criteria
    if (params.locations.length > 0 && (params.skills.length > 0 || params.roles.length > 0)) {
      const exactQuery = {
        $and: [
          this.buildLocationCondition(params.locations),
          this.buildSkillRoleCondition([...params.skills, ...params.roles])
        ]
      };
      queries.push(exactQuery);
    }
    
    // Query 2: Just skills/roles (no location constraint)
    if (params.skills.length > 0 || params.roles.length > 0) {
      queries.push(this.buildSkillRoleCondition([...params.skills, ...params.roles]));
    }
    
    // Query 3: Just location
    if (params.locations.length > 0) {
      queries.push(this.buildLocationCondition(params.locations));
    }
    
    // Query 4: Name search
    if (params.names.length > 0) {
      queries.push(this.buildNameCondition(params.names));
    }
    
    // Query 5: Domain search
    if (params.domains.length > 0) {
      queries.push(this.buildDomainCondition(params.domains));
    }
    
    // Ensure at least one query
    if (queries.length === 0) {
      queries.push({}); // Return all
    }
    
    return queries;
  }

  // Build location condition
  buildLocationCondition(locations) {
    const conditions = [];
    locations.forEach(loc => {
      conditions.push(
        { 'basicProfile.linkedinScrapedData.location': { $regex: loc, $options: 'i' } },
        { 'enhancedProfile.city': { $regex: loc, $options: 'i' } },
        { 'enhancedProfile.state': { $regex: loc, $options: 'i' } },
        { 'enhancedProfile.country': { $regex: loc, $options: 'i' } },
        { 'enhancedProfile.currentAddress': { $regex: loc, $options: 'i' } }
      );
    });
    return { $or: conditions };
  }

  // Build skill/role condition
  buildSkillRoleCondition(terms) {
    const conditions = [];
    terms.forEach(term => {
      conditions.push(
        { 'basicProfile.linkedinScrapedData.headline': { $regex: term, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.experience.title': { $regex: term, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.experience.description': { $regex: term, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.skills': { $regex: term, $options: 'i' } },
        { 'basicProfile.about': { $regex: term, $options: 'i' } },
        { 'enhancedProfile.professionalRole': { $regex: term, $options: 'i' } },
        { 'enhancedProfile.domain': { $regex: term, $options: 'i' } }
      );
    });
    return { $or: conditions };
  }

  // Build name condition
  buildNameCondition(names) {
    const conditions = [];
    names.forEach(name => {
      conditions.push(
        { 'basicProfile.name': { $regex: name, $options: 'i' } },
        { 'enhancedProfile.fullName': { $regex: name, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.fullName': { $regex: name, $options: 'i' } }
      );
    });
    return { $or: conditions };
  }

  // Build domain condition
  buildDomainCondition(domains) {
    const conditions = [];
    domains.forEach(domain => {
      conditions.push(
        { 'enhancedProfile.domain': { $regex: domain, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.headline': { $regex: domain, $options: 'i' } }
      );
    });
    return { $or: conditions };
  }

  // Execute search
  async executeSearch(query) {
    const db = getDatabase();
    return await db.collection('users')
      .find(query)
      .limit(50)
      .toArray();
  }

  // Remove duplicates
  removeDuplicates(results) {
    const seen = new Set();
    return results.filter(user => {
      const id = user._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  // Rank results with match explanations
  rankWithExplanations(results, params, query) {
    const scored = results.map(user => {
      let score = 0;
      const matchReasons = [];
      const userData = JSON.stringify(user).toLowerCase();
      
      // Location matching
      if (params.locations.length > 0) {
        const location = user.basicProfile?.linkedinScrapedData?.location || 
                        user.enhancedProfile?.city || '';
        
        const locationMatch = params.locations.some(loc => 
          location.toLowerCase().includes(loc.toLowerCase())
        );
        
        if (locationMatch) {
          score += 50;
          matchReasons.push(`Location: ${location}`);
        } else {
          score -= 30; // Penalty for wrong location when location specified
        }
      }
      
      // Skills matching with details
      const matchedSkills = [];
      params.skills.forEach(skill => {
        const headline = (user.basicProfile?.linkedinScrapedData?.headline || '').toLowerCase();
        const experience = JSON.stringify(user.basicProfile?.linkedinScrapedData?.experience || []).toLowerCase();
        const about = (user.basicProfile?.about || '').toLowerCase();
        
        if (headline.includes(skill.toLowerCase())) {
          score += 30;
          matchedSkills.push(skill);
        } else if (experience.includes(skill.toLowerCase())) {
          score += 20;
          matchedSkills.push(skill);
        } else if (about.includes(skill.toLowerCase())) {
          score += 15;
          matchedSkills.push(skill);
        }
      });
      
      if (matchedSkills.length > 0) {
        matchReasons.push(`Skills: ${[...new Set(matchedSkills)].join(', ')}`);
      }
      
      // Role matching
      const matchedRoles = [];
      params.roles.forEach(role => {
        const headline = (user.basicProfile?.linkedinScrapedData?.headline || '').toLowerCase();
        const profRole = (user.enhancedProfile?.professionalRole || '').toLowerCase();
        
        if (headline.includes(role.toLowerCase()) || profRole.includes(role.toLowerCase())) {
          score += 35;
          matchedRoles.push(role);
        }
      });
      
      if (matchedRoles.length > 0) {
        matchReasons.push(`Role matches: ${[...new Set(matchedRoles)].join(', ')}`);
      }
      
      // Domain matching
      if (params.domains.length > 0) {
        const userDomain = user.enhancedProfile?.domain || '';
        const domainMatch = params.domains.some(domain => 
          userDomain.toLowerCase().includes(domain.toLowerCase())
        );
        
        if (domainMatch) {
          score += 25;
          matchReasons.push(`Domain: ${userDomain}`);
        }
      }
      
      // Requirements matching (e.g., legal help)
      if (params.requirements.length > 0) {
        // Penalize students heavily when looking for professional help
        if (params.requirements.some(req => req.includes('help') || req.includes('advice'))) {
          if (userData.includes('student')) {
            score -= 100;
            matchReasons.push('Note: Student profile');
          } else if (userData.includes('professional') || userData.includes('expert')) {
            score += 40;
            matchReasons.push('Professional expertise');
          }
        }
      }
      
      // Profile completeness bonus
      if (user.enhancedProfile?.completed) score += 15;
      if (user.basicProfile?.linkedinScrapedData?.experience?.length > 2) score += 10;
      if (user.basicProfile?.linkedinScrapedData?.skills?.length > 0) score += 10;
      
      return {
        ...user,
        matchScore: score,
        matchReasons
      };
    });
    
    // Sort by score
    scored.sort((a, b) => b.matchScore - a.matchScore);
    
    // Separate exact matches from related matches
    const exactMatches = scored.filter(r => r.matchScore >= 50);
    const relatedMatches = scored.filter(r => r.matchScore > 0 && r.matchScore < 50);
    
    return {
      exact: exactMatches.slice(0, 5),
      related: relatedMatches.slice(0, 3)
    };
  }

  // Format intelligent response
  formatIntelligentResponse(results, params, query) {
    const { exact, related } = results;
    
    if (exact.length === 0 && related.length === 0) {
      return this.getNoResultsResponse(params, query);
    }
    
    let response = '';
    
    // Exact matches
    if (exact.length > 0) {
      response = `Found ${exact.length} ${exact.length === 1 ? 'profile' : 'profiles'} matching your requirements:\n\n`;
      
      exact.forEach((user, index) => {
        response += this.formatDetailedProfile(user, index + 1, params);
        if (index < exact.length - 1) response += '\n---\n\n';
      });
      
      // Add related matches if available
      if (related.length > 0) {
        response += `\n\nAlso consider these related profiles:\n\n`;
        related.forEach((user, index) => {
          response += this.formatBriefProfile(user, index + 1);
        });
      }
    } else if (related.length > 0) {
      // Only related matches found
      response = `No exact matches for "${query}", but found ${related.length} related ${related.length === 1 ? 'profile' : 'profiles'}:\n\n`;
      
      related.forEach((user, index) => {
        response += this.formatDetailedProfile(user, index + 1, params);
        if (index < related.length - 1) response += '\n---\n\n';
      });
    }
    
    // Add note about showing more
    if (exact.length + related.length > 3) {
      response += '\n\nReply "more" to see additional profiles.';
    }
    
    return response;
  }

  // Format detailed profile with match reasons
  formatDetailedProfile(user, index, params) {
    const name = user.enhancedProfile?.fullName || 
                user.basicProfile?.linkedinScrapedData?.fullName || 
                user.basicProfile?.name || 'Alumni Member';
    
    const headline = user.basicProfile?.linkedinScrapedData?.headline || 
                    user.enhancedProfile?.professionalRole || '';
    
    const location = user.basicProfile?.linkedinScrapedData?.location || 
                    user.enhancedProfile?.city || 'Location not specified';
    
    const company = user.basicProfile?.linkedinScrapedData?.currentCompany || '';
    
    let profile = `${index}. ${name}\n`;
    
    // Show why this profile matches
    if (user.matchReasons && user.matchReasons.length > 0) {
      profile += `   [Matches: ${user.matchReasons.join(' | ')}]\n\n`;
    }
    
    if (headline) profile += `   Professional Title: ${headline}\n`;
    if (company) profile += `   Current Company: ${company}\n`;
    profile += `   Location: ${location}\n`;
    
    // Add relevant experience based on search
    const experience = user.basicProfile?.linkedinScrapedData?.experience || [];
    if (experience.length > 0 && params.skills?.length > 0) {
      const relevantExp = experience.find(exp => {
        const expText = (exp.title + ' ' + exp.description).toLowerCase();
        return params.skills.some(skill => expText.includes(skill.toLowerCase()));
      });
      
      if (relevantExp) {
        profile += `   Relevant Experience: ${relevantExp.title} at ${relevantExp.company || 'Company'}\n`;
      }
    }
    
    // Show skills if searching for skills
    if (params.skills?.length > 0) {
      const skills = user.basicProfile?.linkedinScrapedData?.skills || [];
      const relevantSkills = skills.filter(skill => 
        params.skills.some(searchSkill => 
          skill.toLowerCase().includes(searchSkill.toLowerCase()) ||
          searchSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );
      
      if (relevantSkills.length > 0) {
        profile += `   Relevant Skills: ${relevantSkills.join(', ')}\n`;
      }
    }
    
    // Add complete About section (not truncated)
    const about = user.basicProfile?.about || user.basicProfile?.linkedinScrapedData?.about;
    if (about && about.length > 0) {
      profile += `\n   About:\n   ${about}\n`;
    }
    
    // Education if relevant
    const education = user.basicProfile?.linkedinScrapedData?.education || [];
    if (education.length > 0) {
      profile += `\n   Education:\n`;
      education.slice(0, 2).forEach(edu => {
        profile += `   - ${edu.title}`;
        if (edu.degree) profile += ` (${edu.degree})`;
        profile += '\n';
      });
    }
    
    // Contact
    const linkedin = user.basicProfile?.linkedin || user.enhancedProfile?.linkedin;
    const email = user.basicProfile?.email || user.enhancedProfile?.email;
    
    profile += '\n   Contact:\n';
    if (linkedin) profile += `   - LinkedIn: ${linkedin}\n`;
    if (email && params.requirements?.some(r => r.includes('help'))) {
      profile += `   - Email: ${email}\n`;
    }
    
    return profile;
  }

  // Format brief profile for related matches
  formatBriefProfile(user, index) {
    const name = user.enhancedProfile?.fullName || user.basicProfile?.name || 'Alumni Member';
    const headline = user.basicProfile?.linkedinScrapedData?.headline || '';
    const location = user.basicProfile?.linkedinScrapedData?.location || '';
    
    let profile = `${index}. ${name}`;
    if (headline) profile += ` - ${headline}`;
    if (location) profile += ` (${location})`;
    profile += '\n';
    
    return profile;
  }

  // No results response
  getNoResultsResponse(params, query) {
    let response = `No profiles found matching "${query}"\n\n`;
    
    if (params.locations.length > 0 && params.skills.length > 0) {
      response += `Searched for: ${params.skills.join(', ')} in ${params.locations.join(', ')}\n\n`;
      response += `Suggestions:\n`;
      response += `- Try searching without location filter\n`;
      response += `- Use broader skill terms\n`;
      response += `- Check spelling of location names\n`;
    } else if (params.locations.length > 0) {
      response += `No alumni found in ${params.locations.join(', ')}\n`;
      response += `Try nearby cities or remove location filter\n`;
    } else if (params.skills.length > 0) {
      response += `No one found with ${params.skills.join(', ')} skills\n`;
      response += `Try related terms or broader search\n`;
    }
    
    return response;
  }

  // Check if follow-up
  isFollowUp(query) {
    const patterns = [
      /^(any\s*more|more|another|additional)/i,
      /^(show|tell)\s*(me)?\s*more/i,
      /^next/i
    ];
    return patterns.some(p => p.test(query));
  }

  // Handle follow-up
  async handleFollowUp(query, userId) {
    const history = this.userSearchHistory.get(userId);
    if (!history) {
      return "No recent search found. Please make a new search first.";
    }
    
    const { exact, related } = history.results;
    const shown = history.shownCount || 3;
    
    const allResults = [...(exact || []), ...(related || [])];
    const moreResults = allResults.slice(shown, shown + 3);
    
    if (moreResults.length === 0) {
      return "No more results available for your previous search.";
    }
    
    history.shownCount = shown + moreResults.length;
    
    let response = `Showing ${moreResults.length} more results:\n\n`;
    moreResults.forEach((user, index) => {
      response += this.formatDetailedProfile(user, index + 1, history.params);
      if (index < moreResults.length - 1) response += '\n---\n\n';
    });
    
    return response;
  }

  // Check if general knowledge
  isGeneralKnowledge(query) {
    const patterns = [
      /^what\s+is\s+/i,
      /^explain\s+/i,
      /^define\s+/i,
      /^tell\s+me\s+about\s+(?!people|alumni|someone)/i
    ];
    return patterns.some(p => p.test(query));
  }

  // Handle general knowledge
  async handleGeneralKnowledge(query) {
    if (!openai) return "I can help with alumni searches. Please be specific.";
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: `Answer concisely: ${query}`
        }],
        temperature: 0.7,
        max_tokens: 300
      });
      return response.choices[0].message.content;
    } catch (error) {
      return `I understand you're asking about "${query}". I specialize in alumni connections.`;
    }
  }

  // Store search history
  storeSearchHistory(userId, query, results, params) {
    this.userSearchHistory.set(userId, {
      query,
      results,
      params,
      shownCount: Math.min(3, (results.exact?.length || 0) + (results.related?.length || 0)),
      timestamp: Date.now()
    });
    
    // Clear after 15 minutes
    setTimeout(() => {
      this.userSearchHistory.delete(userId);
    }, 15 * 60 * 1000);
  }
}

module.exports = new UltimateSearchService();