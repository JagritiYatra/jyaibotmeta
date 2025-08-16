// Production-Ready Search Service - WhatsApp formatted, complete DB search, proper follow-ups
const { getDatabase } = require('../config/database');
const { logError, logSuccess } = require('../middleware/logging');
const OpenAI = require('openai');
const { getConfig } = require('../config/environment');

// Initialize OpenAI
const config = getConfig();
const openai = config.ai?.apiKey ? new OpenAI({ apiKey: config.ai.apiKey }) : null;

class ProductionSearchService {
  constructor() {
    // Enhanced session storage for follow-ups
    this.userSessions = new Map();
    this.spellingMap = this.initSpellingMap();
    this.queryPatterns = this.initQueryPatterns();
  }

  initSpellingMap() {
    return {
      // Common misspellings
      'developper': 'developer', 'develper': 'developer', 'devloper': 'developer',
      'lawer': 'lawyer', 'laywer': 'lawyer', 'advocat': 'advocate',
      'enginer': 'engineer', 'engeneer': 'engineer',
      'enterprenuer': 'entrepreneur', 'enterprener': 'entrepreneur', 'entreprenur': 'entrepreneur',
      'bengaluru': 'bangalore', 'bengalore': 'bangalore', 'banglore': 'bangalore',
      'mumbi': 'mumbai', 'bombay': 'mumbai', 'mumbay': 'mumbai',
      'dilli': 'delhi', 'dehli': 'delhi',
      'kolkatta': 'kolkata', 'calcutta': 'kolkata',
      'puna': 'pune', 'poona': 'pune',
      'hyderbad': 'hyderabad', 'hydrabadi': 'hyderabad',
      'ahmdabad': 'ahmedabad', 'ahemdabad': 'ahmedabad',
      'leagal': 'legal', 'ligal': 'legal', 'lagal': 'legal',
      'tecnology': 'technology', 'techonology': 'technology',
      'finence': 'finance', 'finnance': 'finance',
      'helthcare': 'healthcare', 'healtcare': 'healthcare',
      'maneger': 'manager', 'managr': 'manager',
      'consulant': 'consultant', 'consultent': 'consultant',
      'analist': 'analyst', 'analyt': 'analyst',
      'marketting': 'marketing', 'marketting': 'marketing',
      'desiner': 'designer', 'desginer': 'designer'
    };
  }

  initQueryPatterns() {
    return {
      followUp: [
        /^(show\s+me\s+)?more$/i,
        /^(any\s+)?more\s*(profiles?|people|results?)?$/i,
        /^(show|give|tell)\s*(me)?\s*more/i,
        /^next\s*(profiles?|results?)?$/i,
        /^other\s*(profiles?|options?)?$/i,
        /^anyone\s+else\??$/i,
        /^different\s+(profiles?|people)$/i,
        /^additional\s*(profiles?|results?)?$/i,
        /^what\s+about\s+others?\??$/i,
        /^any\s+other\s+options?\??$/i
      ],
      nameSearch: [
        /^who\s+is\s+([a-z]+(?:\s+[a-z]+)?)\??$/i,
        /^tell\s+me\s+about\s+([a-z]+(?:\s+[a-z]+)?)\??$/i,
        /^find\s+([a-z]+(?:\s+[a-z]+)?)\??$/i,
        /^show\s+me\s+([a-z]+(?:\s+[a-z]+)?)'?s?\s+profile\??$/i,
        /^([a-z]+(?:\s+[a-z]+)?)\??$/i,
        /^contact\s+details?\s+of\s+([a-z]+(?:\s+[a-z]+)?)\??$/i,
        /^information\s+about\s+([a-z]+(?:\s+[a-z]+)?)\??$/i
      ],
      generalKnowledge: [
        /^what\s+is\s+.+/i,
        /^explain\s+.+/i,
        /^define\s+.+/i,
        /^how\s+(does|do|to)\s+.+/i,
        /^why\s+.+/i,
        /^when\s+(was|is|did)\s+.+/i
      ]
    };
  }

  // Main search with production-ready features
  async search(query, user, session) {
    try {
      const userId = user?._id?.toString() || 'anonymous';
      const userSession = this.getOrCreateSession(userId);
      
      // Clean and correct the query
      const cleanQuery = this.cleanQuery(query);
      const correctedQuery = this.correctSpelling(cleanQuery);
      
      console.log(`Search request: "${query}" -> "${correctedQuery}" for user ${userId}`);
      
      // Check query type
      if (this.isFollowUpQuery(correctedQuery)) {
        return await this.handleFollowUp(correctedQuery, userSession);
      }
      
      if (this.isGeneralKnowledge(correctedQuery)) {
        return await this.handleGeneralKnowledge(correctedQuery);
      }
      
      // Extract comprehensive search parameters
      const searchParams = await this.extractSearchParams(correctedQuery);
      console.log('Search parameters:', JSON.stringify(searchParams, null, 2));
      
      // Search ENTIRE database with multiple strategies
      const allResults = await this.searchEntireDatabase(searchParams);
      console.log(`Found ${allResults.length} total results from database`);
      
      // Rank and filter results
      const rankedResults = this.rankResults(allResults, searchParams);
      
      // Store session for follow-ups
      this.updateSession(userSession, {
        lastQuery: correctedQuery,
        lastParams: searchParams,
        lastResults: rankedResults,
        shownCount: 0
      });
      
      // Format for WhatsApp
      return this.formatWhatsAppResponse(rankedResults, searchParams, correctedQuery);
      
    } catch (error) {
      console.error('Production search error:', error);
      return "I'm having trouble with that search. Please try again or be more specific.";
    }
  }

  // Clean query
  cleanQuery(query) {
    return query
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[""'']/g, '"')
      .toLowerCase();
  }

  // Correct spelling
  correctSpelling(query) {
    let corrected = query;
    for (const [wrong, right] of Object.entries(this.spellingMap)) {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      corrected = corrected.replace(regex, right);
    }
    return corrected;
  }

  // Check if follow-up
  isFollowUpQuery(query) {
    return this.queryPatterns.followUp.some(pattern => pattern.test(query));
  }

  // Check if general knowledge
  isGeneralKnowledge(query) {
    return this.queryPatterns.generalKnowledge.some(pattern => pattern.test(query)) &&
           !query.includes('alumni') && !query.includes('yatri') && !query.includes('people');
  }

  // Handle follow-up queries with proper context
  async handleFollowUp(query, session) {
    if (!session.lastResults || session.lastResults.length === 0) {
      return "No previous search found. Please make a new search first.\n\nExample: *Find web developers in Pune*";
    }
    
    const { lastResults, shownCount = 0, lastQuery } = session;
    const remainingResults = lastResults.slice(shownCount);
    
    if (remainingResults.length === 0) {
      return `No more results for: *${lastQuery}*\n\nTry a different search or modify your criteria.`;
    }
    
    // Show next batch (3-5 results)
    const batchSize = Math.min(3, remainingResults.length);
    const nextBatch = remainingResults.slice(0, batchSize);
    
    // Update shown count
    session.shownCount = shownCount + batchSize;
    
    // Format continuation response
    let response = `*Showing ${batchSize} more results* (${session.shownCount} of ${lastResults.length} total)\n\n`;
    
    nextBatch.forEach((user, index) => {
      response += this.formatProfileForWhatsApp(user, shownCount + index + 1);
      if (index < nextBatch.length - 1) response += '\n━━━━━━━━━━━━━━━\n\n';
    });
    
    // Add navigation hint
    const remaining = lastResults.length - session.shownCount;
    if (remaining > 0) {
      response += `\n\n_Reply *"more"* to see ${remaining} more ${remaining === 1 ? 'result' : 'results'}_`;
    } else {
      response += '\n\n_That\'s all the results. Try a new search!_';
    }
    
    return response;
  }

  // Handle general knowledge
  async handleGeneralKnowledge(query) {
    if (!openai) {
      return "I specialize in alumni connections. For general questions, I can help with:\n• Finding alumni by skills/location\n• Connecting with professionals\n• Searching specific expertise";
    }
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'user',
          content: `Answer this concisely for WhatsApp (use *bold* for emphasis, avoid emojis): ${query}`
        }],
        temperature: 0.7,
        max_tokens: 200
      });
      return response.choices[0].message.content;
    } catch (error) {
      return `I understand you're asking about "${query}". While I specialize in alumni search, I can help you find experts in this area.`;
    }
  }

  // Extract comprehensive search parameters
  async extractSearchParams(query) {
    const params = {
      type: 'general',
      names: [],
      skills: [],
      locations: [],
      roles: [],
      companies: [],
      domains: [],
      requirements: [],
      keywords: []
    };
    
    // Check for name search
    for (const pattern of this.queryPatterns.nameSearch) {
      const match = query.match(pattern);
      if (match && match[1]) {
        params.type = 'name';
        params.names.push(match[1]);
        break;
      }
    }
    
    // Professional categories with comprehensive keywords
    const categories = {
      legal: {
        keywords: ['legal', 'law', 'lawyer', 'advocate', 'attorney', 'litigation', 'court'],
        skills: ['law', 'legal', 'litigation', 'corporate law', 'criminal law', 'civil law'],
        roles: ['lawyer', 'advocate', 'legal advisor', 'attorney', 'legal consultant', 'legal counsel'],
        domains: ['Legal', 'Law', 'Legal Services', 'Law Firm']
      },
      development: {
        keywords: ['developer', 'programmer', 'coder', 'software', 'web', 'app', 'frontend', 'backend', 'fullstack'],
        skills: ['javascript', 'react', 'angular', 'vue', 'nodejs', 'python', 'java', 'php', 'html', 'css', 'mongodb', 'mysql', 'api', 'rest'],
        roles: ['developer', 'engineer', 'programmer', 'software engineer', 'web developer', 'full stack developer'],
        domains: ['Technology', 'Software', 'IT', 'Tech']
      },
      business: {
        keywords: ['entrepreneur', 'founder', 'startup', 'business', 'ceo', 'cofounder'],
        skills: ['entrepreneurship', 'business development', 'strategy', 'leadership', 'fundraising'],
        roles: ['entrepreneur', 'founder', 'co-founder', 'ceo', 'business owner', 'director'],
        domains: ['Startup', 'Business', 'Entrepreneurship']
      },
      marketing: {
        keywords: ['marketing', 'sales', 'brand', 'digital', 'social media', 'seo', 'growth'],
        skills: ['marketing', 'digital marketing', 'social media', 'seo', 'sem', 'content marketing', 'branding'],
        roles: ['marketer', 'marketing manager', 'sales manager', 'brand manager', 'growth hacker'],
        domains: ['Marketing', 'Sales', 'Advertising', 'Digital Marketing']
      },
      finance: {
        keywords: ['finance', 'accounting', 'investment', 'banking', 'fintech', 'financial'],
        skills: ['finance', 'accounting', 'financial analysis', 'investment', 'banking', 'fintech'],
        roles: ['analyst', 'accountant', 'financial advisor', 'investment banker', 'cfo'],
        domains: ['Finance', 'Banking', 'Fintech', 'Investment']
      },
      healthcare: {
        keywords: ['healthcare', 'medical', 'doctor', 'health', 'pharma', 'hospital', 'clinic'],
        skills: ['healthcare', 'medical', 'clinical', 'pharmaceutical', 'nursing'],
        roles: ['doctor', 'physician', 'nurse', 'healthcare professional', 'medical officer'],
        domains: ['Healthcare', 'Medical', 'Pharmaceutical', 'Hospital']
      },
      design: {
        keywords: ['designer', 'design', 'ui', 'ux', 'graphic', 'creative', 'visual'],
        skills: ['design', 'ui design', 'ux design', 'graphic design', 'figma', 'photoshop', 'illustrator'],
        roles: ['designer', 'ui designer', 'ux designer', 'graphic designer', 'creative director'],
        domains: ['Design', 'Creative', 'UI/UX']
      }
    };
    
    // Match categories
    for (const [category, data] of Object.entries(categories)) {
      if (data.keywords.some(keyword => query.includes(keyword))) {
        params.type = 'professional';
        params.skills.push(...data.skills);
        params.roles.push(...data.roles);
        params.domains.push(...data.domains);
      }
    }
    
    // Extract locations (comprehensive Indian cities)
    const cities = [
      'pune', 'mumbai', 'bangalore', 'bengaluru', 'delhi', 'new delhi', 'gurgaon', 'gurugram', 'noida',
      'chennai', 'kolkata', 'hyderabad', 'ahmedabad', 'surat', 'jaipur', 'lucknow', 'kanpur',
      'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam', 'patna', 'vadodara', 'ghaziabad',
      'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot', 'varanasi', 'srinagar',
      'aurangabad', 'dhanbad', 'amritsar', 'navi mumbai', 'allahabad', 'ranchi', 'coimbatore',
      'jabalpur', 'gwalior', 'vijayawada', 'jodhpur', 'madurai', 'raipur', 'kota', 'chandigarh',
      'guwahati', 'solapur', 'hubli', 'dharwad', 'mysore', 'mangalore', 'trivandrum', 'kochi', 'goa'
    ];
    
    cities.forEach(city => {
      if (query.includes(city)) {
        params.locations.push(city);
      }
    });
    
    // Extract states
    const states = [
      'maharashtra', 'karnataka', 'tamil nadu', 'kerala', 'gujarat', 'rajasthan',
      'uttar pradesh', 'bihar', 'west bengal', 'telangana', 'andhra pradesh',
      'delhi', 'punjab', 'haryana', 'madhya pradesh', 'odisha', 'assam'
    ];
    
    states.forEach(state => {
      if (query.includes(state)) {
        params.locations.push(state);
      }
    });
    
    // Requirements (help, assistance, advice)
    if (query.includes('help') || query.includes('assist') || query.includes('advice') || query.includes('support')) {
      params.requirements.push('needs assistance');
    }
    
    // Extract remaining keywords
    const stopWords = ['the', 'and', 'for', 'with', 'from', 'who', 'can', 'need', 'want', 'find', 'show', 'any', 'more', 'in', 'at', 'to', 'me', 'i', 'a', 'an'];
    const words = query.split(/\s+/).filter(word => 
      word.length > 2 && !stopWords.includes(word)
    );
    params.keywords = [...new Set(words)];
    
    return params;
  }

  // Search ENTIRE database with multiple strategies
  async searchEntireDatabase(params) {
    const db = getDatabase();
    const queries = [];
    
    // Strategy 1: Name search (if applicable)
    if (params.names.length > 0) {
      const nameConditions = [];
      params.names.forEach(name => {
        nameConditions.push(
          { 'basicProfile.name': { $regex: name, $options: 'i' } },
          { 'enhancedProfile.fullName': { $regex: name, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.fullName': { $regex: name, $options: 'i' } }
        );
      });
      queries.push({ $or: nameConditions });
    }
    
    // Strategy 2: Location + Skills/Roles (exact match)
    if (params.locations.length > 0 && (params.skills.length > 0 || params.roles.length > 0)) {
      const locationConds = this.buildLocationConditions(params.locations);
      const skillRoleConds = this.buildSkillRoleConditions([...params.skills, ...params.roles]);
      queries.push({ $and: [locationConds, skillRoleConds] });
    }
    
    // Strategy 3: Just Skills/Roles (broader search)
    if (params.skills.length > 0 || params.roles.length > 0) {
      queries.push(this.buildSkillRoleConditions([...params.skills, ...params.roles]));
    }
    
    // Strategy 4: Just Location
    if (params.locations.length > 0) {
      queries.push(this.buildLocationConditions(params.locations));
    }
    
    // Strategy 5: Domain search
    if (params.domains.length > 0) {
      const domainConds = [];
      params.domains.forEach(domain => {
        domainConds.push(
          { 'enhancedProfile.domain': { $regex: domain, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.headline': { $regex: domain, $options: 'i' } }
        );
      });
      queries.push({ $or: domainConds });
    }
    
    // Strategy 6: Keyword search (fallback)
    if (params.keywords.length > 0 && queries.length === 0) {
      const keywordConds = [];
      params.keywords.forEach(keyword => {
        keywordConds.push(
          { 'basicProfile.name': { $regex: keyword, $options: 'i' } },
          { 'basicProfile.about': { $regex: keyword, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.headline': { $regex: keyword, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.about': { $regex: keyword, $options: 'i' } },
          { 'enhancedProfile.professionalRole': { $regex: keyword, $options: 'i' } }
        );
      });
      queries.push({ $or: keywordConds });
    }
    
    // Execute all queries and combine results
    let allResults = [];
    const seenIds = new Set();
    
    for (const query of queries) {
      try {
        const results = await db.collection('users')
          .find(query)
          .limit(100)
          .toArray();
        
        // Add unique results only
        results.forEach(user => {
          const id = user._id.toString();
          if (!seenIds.has(id)) {
            seenIds.add(id);
            allResults.push(user);
          }
        });
      } catch (error) {
        console.error('Query execution error:', error);
      }
    }
    
    // If no results from specific searches, do a general search
    if (allResults.length === 0 && params.type !== 'name') {
      console.log('No results from specific searches, trying general search...');
      const generalResults = await db.collection('users')
        .find({
          $and: [
            { 'enhancedProfile.completed': true },
            {
              $or: [
                { 'basicProfile.name': { $exists: true, $ne: null, $ne: '' } },
                { 'enhancedProfile.fullName': { $exists: true, $ne: null, $ne: '' } }
              ]
            }
          ]
        })
        .limit(200)
        .toArray();
      
      allResults = generalResults;
    }
    
    return allResults;
  }

  // Build location conditions
  buildLocationConditions(locations) {
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

  // Build skill/role conditions
  buildSkillRoleConditions(terms) {
    const conditions = [];
    terms.forEach(term => {
      conditions.push(
        { 'basicProfile.linkedinScrapedData.headline': { $regex: term, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.experience.title': { $regex: term, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.experience.description': { $regex: term, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.skills': { $regex: term, $options: 'i' } },
        { 'basicProfile.about': { $regex: term, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.about': { $regex: term, $options: 'i' } },
        { 'enhancedProfile.professionalRole': { $regex: term, $options: 'i' } },
        { 'enhancedProfile.domain': { $regex: term, $options: 'i' } },
        { 'enhancedProfile.skills': { $regex: term, $options: 'i' } }
      );
    });
    return { $or: conditions };
  }

  // Rank results based on relevance
  rankResults(results, params) {
    const scored = results.map(user => {
      let score = 0;
      const matchReasons = [];
      
      // Convert user data to searchable text
      const userData = JSON.stringify(user).toLowerCase();
      const headline = (user.basicProfile?.linkedinScrapedData?.headline || '').toLowerCase();
      const about = (user.basicProfile?.about || user.basicProfile?.linkedinScrapedData?.about || '').toLowerCase();
      const location = (user.basicProfile?.linkedinScrapedData?.location || user.enhancedProfile?.city || '').toLowerCase();
      
      // Name match (highest priority)
      if (params.names.length > 0) {
        const userName = (user.basicProfile?.name || user.enhancedProfile?.fullName || '').toLowerCase();
        if (params.names.some(name => userName.includes(name.toLowerCase()))) {
          score += 100;
          matchReasons.push('Name match');
        }
      }
      
      // Location matching
      if (params.locations.length > 0) {
        const locationMatch = params.locations.some(loc => 
          location.includes(loc.toLowerCase())
        );
        
        if (locationMatch) {
          score += 40;
          matchReasons.push(`Location: ${location}`);
        } else if (params.type === 'professional') {
          score -= 20; // Penalty for wrong location in professional search
        }
      }
      
      // Skills matching
      const matchedSkills = [];
      params.skills.forEach(skill => {
        if (headline.includes(skill.toLowerCase())) {
          score += 30;
          matchedSkills.push(skill);
        } else if (about.includes(skill.toLowerCase())) {
          score += 20;
          matchedSkills.push(skill);
        } else if (userData.includes(skill.toLowerCase())) {
          score += 10;
          matchedSkills.push(skill);
        }
      });
      
      if (matchedSkills.length > 0) {
        matchReasons.push(`Skills: ${[...new Set(matchedSkills)].join(', ')}`);
      }
      
      // Role matching
      params.roles.forEach(role => {
        if (headline.includes(role.toLowerCase())) {
          score += 35;
          matchReasons.push(`Role match`);
        }
      });
      
      // Domain matching
      params.domains.forEach(domain => {
        const userDomain = (user.enhancedProfile?.domain || '').toLowerCase();
        if (userDomain.includes(domain.toLowerCase())) {
          score += 25;
          matchReasons.push(`Domain: ${domain}`);
        }
      });
      
      // Special handling for professional searches
      if (params.requirements.includes('needs assistance')) {
        // Penalize students heavily
        if (userData.includes('student') && !userData.includes('graduate')) {
          score -= 80;
        }
        // Boost professionals
        if (userData.includes('professional') || userData.includes('expert') || 
            userData.includes('years') || userData.includes('experience')) {
          score += 30;
        }
      }
      
      // Profile completeness bonus
      if (user.enhancedProfile?.completed) score += 10;
      if (user.basicProfile?.linkedinScrapedData?.experience?.length > 0) score += 15;
      if (user.basicProfile?.linkedinScrapedData?.skills?.length > 0) score += 10;
      if (user.basicProfile?.linkedinScrapedData?.about) score += 5;
      
      return {
        ...user,
        relevanceScore: score,
        matchReasons
      };
    });
    
    // Sort by score
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Filter out negative scores
    return scored.filter(r => r.relevanceScore > 0);
  }

  // Format response for WhatsApp
  formatWhatsAppResponse(results, params, query) {
    if (results.length === 0) {
      return this.getNoResultsMessage(params, query);
    }
    
    // Separate exact and related matches
    const exactMatches = results.filter(r => r.relevanceScore >= 50);
    const relatedMatches = results.filter(r => r.relevanceScore > 0 && r.relevanceScore < 50);
    
    // Show top results
    const toShow = exactMatches.length > 0 ? exactMatches.slice(0, 3) : relatedMatches.slice(0, 3);
    
    let response = '';
    
    // Header
    if (exactMatches.length > 0) {
      response = `*Found ${Math.min(exactMatches.length, 10)} relevant ${exactMatches.length === 1 ? 'profile' : 'profiles'}*\n\n`;
    } else {
      response = `*Found ${Math.min(relatedMatches.length, 10)} related ${relatedMatches.length === 1 ? 'profile' : 'profiles'}*\n_No exact matches, showing similar profiles_\n\n`;
    }
    
    // Format each profile
    toShow.forEach((user, index) => {
      response += this.formatProfileForWhatsApp(user, index + 1);
      if (index < toShow.length - 1) response += '\n━━━━━━━━━━━━━━━\n\n';
    });
    
    // Add navigation hints
    const totalResults = exactMatches.length > 0 ? exactMatches.length : relatedMatches.length;
    if (totalResults > 3) {
      response += `\n\n_Showing 3 of ${Math.min(totalResults, 10)} results_\n`;
      response += `*Reply "more" to see additional profiles*`;
    }
    
    // Add search tips if few results
    if (totalResults < 3 && params.locations.length > 0) {
      response += '\n\n💡 _Tip: Try searching without location for more results_';
    }
    
    return response;
  }

  // Format individual profile for WhatsApp
  formatProfileForWhatsApp(user, index) {
    const name = user.enhancedProfile?.fullName || 
                user.basicProfile?.linkedinScrapedData?.fullName || 
                user.basicProfile?.name || 'Alumni Member';
    
    const headline = user.basicProfile?.linkedinScrapedData?.headline || 
                    user.enhancedProfile?.professionalRole || '';
    
    const location = user.basicProfile?.linkedinScrapedData?.location || 
                    user.enhancedProfile?.city || '';
    
    const company = user.basicProfile?.linkedinScrapedData?.currentCompany || 
                   user.basicProfile?.linkedinScrapedData?.experience?.[0]?.company || '';
    
    let profile = `${index}. *${name}*\n`;
    
    // Show match reasons if available
    if (user.matchReasons && user.matchReasons.length > 0) {
      profile += `   _[${user.matchReasons.slice(0, 2).join(' • ')}]_\n\n`;
    }
    
    // Professional details
    if (headline) profile += `   📋 ${headline}\n`;
    if (company) profile += `   🏢 ${company}\n`;
    if (location) profile += `   📍 ${location}\n`;
    
    // Experience highlight (if relevant)
    const experience = user.basicProfile?.linkedinScrapedData?.experience || [];
    if (experience.length > 0 && experience[0].title) {
      const exp = experience[0];
      profile += `   💼 ${exp.title}`;
      if (exp.duration) profile += ` (${exp.duration})`;
      profile += '\n';
    }
    
    // Skills (show top 5 relevant)
    const skills = user.basicProfile?.linkedinScrapedData?.skills || [];
    if (skills.length > 0) {
      const topSkills = skills.slice(0, 5).join(', ');
      profile += `   🎯 ${topSkills}\n`;
    }
    
    // About section (complete, not truncated)
    const about = user.basicProfile?.about || user.basicProfile?.linkedinScrapedData?.about;
    if (about && about.length > 0) {
      // Clean and format about text
      const cleanAbout = about
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanAbout.length > 200) {
        profile += `\n   _${cleanAbout.substring(0, 200)}..._\n`;
      } else {
        profile += `\n   _${cleanAbout}_\n`;
      }
    }
    
    // Education (show latest)
    const education = user.basicProfile?.linkedinScrapedData?.education || [];
    if (education.length > 0 && education[0].title) {
      profile += `\n   🎓 ${education[0].title}`;
      if (education[0].degree) profile += ` - ${education[0].degree}`;
      profile += '\n';
    }
    
    // Contact information
    const linkedin = user.basicProfile?.linkedin || 
                    user.enhancedProfile?.linkedin || 
                    user.basicProfile?.linkedinScrapedData?.profileUrl;
    
    const email = user.basicProfile?.email || user.enhancedProfile?.email;
    
    if (linkedin || email) {
      profile += '\n   *Connect:*\n';
      if (linkedin) profile += `   🔗 LinkedIn: ${linkedin}\n`;
      if (email && user.matchReasons?.includes('needs assistance')) {
        profile += `   ✉️ Email: ${email}\n`;
      }
    }
    
    // Yatra info
    if (user.yatraYear) {
      profile += `   🚂 Yatra: ${user.yatraYear}\n`;
    }
    
    return profile;
  }

  // No results message
  getNoResultsMessage(params, query) {
    let message = `*No profiles found for:* "${query}"\n\n`;
    
    if (params.locations.length > 0 && params.skills.length > 0) {
      message += `Searched: _${params.skills.slice(0, 3).join(', ')} in ${params.locations.join(', ')}_\n\n`;
      message += '*Try:*\n';
      message += '• Remove location filter\n';
      message += '• Use broader terms\n';
      message += '• Check spelling\n';
    } else if (params.locations.length > 0) {
      message += `No alumni found in *${params.locations.join(', ')}*\n\n`;
      message += '*Try nearby cities or remove location*';
    } else if (params.skills.length > 0) {
      message += `No profiles with *${params.skills.slice(0, 3).join(', ')}*\n\n`;
      message += '*Try related skills or broader search*';
    } else if (params.names.length > 0) {
      message += `Person named *${params.names[0]}* not found\n\n`;
      message += '*Check spelling or try partial name*';
    }
    
    message += '\n\n*Example searches:*\n';
    message += '• _Web developers in Pune_\n';
    message += '• _Marketing professionals_\n';
    message += '• _Entrepreneurs in Bangalore_\n';
    message += '• _Who is Ashish Mittal_';
    
    return message;
  }

  // Session management
  getOrCreateSession(userId) {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        userId,
        createdAt: Date.now(),
        lastActivity: Date.now()
      });
    }
    
    const session = this.userSessions.get(userId);
    session.lastActivity = Date.now();
    
    // Clean old sessions after 30 minutes
    if (Date.now() - session.createdAt > 30 * 60 * 1000) {
      this.userSessions.delete(userId);
      return this.getOrCreateSession(userId);
    }
    
    return session;
  }

  // Update session with search data
  updateSession(session, data) {
    Object.assign(session, data);
    session.lastActivity = Date.now();
  }
}

module.exports = new ProductionSearchService();