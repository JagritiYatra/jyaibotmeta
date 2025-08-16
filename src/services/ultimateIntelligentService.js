// Ultimate Intelligent Service - TRUE intelligence with ZERO generic responses
const { getDatabase } = require('../config/database');
const OpenAI = require('openai');
const { getConfig } = require('../config/environment');

const config = getConfig();
const openai = config.ai?.apiKey ? new OpenAI({ apiKey: config.ai.apiKey }) : null;

class UltimateIntelligentService {
  constructor() {
    this.sessions = new Map();
    this.expansions = {
      // Colleges
      'coep': ['coep', 'college of engineering pune', 'college of engineering, pune'],
      'iit': ['iit', 'indian institute of technology'],
      'nit': ['nit', 'national institute of technology'],
      'bits': ['bits', 'birla institute'],
      
      // Companies  
      'tcs': ['tcs', 'tata consultancy'],
      'infy': ['infosys'],
      'ms': ['microsoft'],
      'goog': ['google'],
      
      // Locations
      'blr': ['bangalore', 'bengaluru'],
      'mum': ['mumbai'],
      'del': ['delhi', 'new delhi'],
      'hyd': ['hyderabad'],
      'chn': ['chennai'],
      'kol': ['kolkata'],
      
      // Common typos
      'develoeper': 'developer',
      'developper': 'developer', 
      'develper': 'developer',
      'lawer': 'lawyer',
      'laywer': 'lawyer',
      'enginer': 'engineer',
      'enterprenuer': 'entrepreneur',
      'mumbi': 'mumbai',
      'bangaluru': 'bangalore',
      'dehli': 'delhi',
      'hyderbad': 'hyderabad',
      'leagal': 'legal',
      'marketting': 'marketing',
      'finence': 'finance'
    };
  }

  // MAIN SEARCH - Ultimate intelligence
  async search(query, user, session) {
    try {
      const userId = user?._id?.toString() || 'anonymous';
      const userPhone = user?.whatsappNumber || user?.phone;
      
      // Get or create session
      let userSession = this.sessions.get(userId);
      if (!userSession) {
        userSession = { 
          userId, 
          history: [], 
          lastSearch: null, 
          lastResults: [],
          shownProfiles: new Set()
        };
        this.sessions.set(userId, userSession);
      }
      
      // Clean and correct query
      const cleanQuery = this.cleanQuery(query);
      console.log(`Ultimate Search: "${query}" -> "${cleanQuery}"`);
      
      // CRITICAL: Handle greetings first
      if (this.isGreeting(cleanQuery)) {
        const name = user?.basicProfile?.name?.split(' ')[0] || user?.enhancedProfile?.fullName?.split(' ')[0] || 'there';
        return `Hello ${name}! How can I help you today?`;
      }
      
      // Check self-awareness
      if (this.isAskingAboutSelf(cleanQuery)) {
        return await this.handleSelfQuery(user, userPhone);
      }
      
      // Check follow-up
      if (this.isFollowUp(cleanQuery, userSession)) {
        return await this.handleFollowUp(cleanQuery, userSession);
      }
      
      // Extract ALL parameters intelligently
      const params = await this.extractAllParameters(cleanQuery);
      console.log('Extracted params:', JSON.stringify(params, null, 2));
      
      // Check if casual question
      if (this.isCasualQuestion(cleanQuery)) {
        return await this.handleCasualWithProfiles(cleanQuery, params);
      }
      
      // ALWAYS search database
      const results = await this.searchDatabase(params);
      console.log(`Database search returned ${results.length} results`);
      
      // Store for follow-ups
      userSession.lastSearch = cleanQuery;
      userSession.lastResults = results;
      userSession.lastParams = params;
      
      // Format response intelligently
      return this.formatSmartResponse(results, params, cleanQuery);
      
    } catch (error) {
      console.error('Ultimate search error:', error);
      // Even on error, try to be helpful
      return await this.searchFallback(query);
    }
  }

  // Clean and fix query
  cleanQuery(query) {
    let cleaned = query.toLowerCase().trim();
    
    // Fix common typos
    for (const [typo, correct] of Object.entries(this.expansions)) {
      if (typeof correct === 'string') {
        const regex = new RegExp(`\\b${typo}\\b`, 'gi');
        cleaned = cleaned.replace(regex, correct);
      }
    }
    
    return cleaned;
  }

  // Check if greeting
  isGreeting(query) {
    return /^(hi|hello|hey|good morning|good evening|good afternoon)$/i.test(query.trim());
  }

  // Check if asking about self
  isAskingAboutSelf(query) {
    return /about me|my profile|who am i|myself|my info/i.test(query);
  }

  // Handle self query
  async handleSelfQuery(user, phone) {
    const db = getDatabase();
    const userProfile = await db.collection('users').findOne({
      $or: [
        { whatsappNumber: phone },
        { 'basicProfile.phone': phone },
        { _id: user._id }
      ]
    });
    
    if (!userProfile) {
      return "Please complete your profile first to see your information.";
    }
    
    const name = userProfile.basicProfile?.name || userProfile.enhancedProfile?.fullName || 'Friend';
    const headline = userProfile.basicProfile?.linkedinScrapedData?.headline || '';
    
    return `*${name}*\n${headline ? `_${headline}_\n\n` : '\n'}You're an amazing member of our network! Your unique skills and experience make you valuable to our community.`;
  }

  // Check if follow-up
  isFollowUp(query, session) {
    const followUpPatterns = [
      /^(more|show more|any more)$/i,
      /^(anyone else|different|next|another)$/i,
      /^(other options?|additional)$/i
    ];
    
    return followUpPatterns.some(p => p.test(query.trim())) && 
           session.lastSearch && 
           session.lastResults?.length > 0;
  }

  // Handle follow-up
  async handleFollowUp(query, session) {
    const { lastResults, shownProfiles } = session;
    
    // Filter out already shown
    const newResults = lastResults.filter(r => 
      !shownProfiles.has(r._id?.toString())
    );
    
    if (newResults.length === 0) {
      return "That's all the results. Try a different search!";
    }
    
    // Show next batch
    const toShow = newResults.slice(0, 3);
    toShow.forEach(r => shownProfiles.add(r._id?.toString()));
    
    return this.formatSmartResponse(toShow, session.lastParams, 'more results');
  }

  // Check if casual question
  isCasualQuestion(query) {
    return /^(what is|how to|explain|why|when|where|tell me about)\s+/i.test(query) &&
           !query.includes('who is') && !query.includes('profile');
  }

  // Handle casual question with embedded profiles
  async handleCasualWithProfiles(query, params) {
    // Skip casual response for "tell me about X experts" - just search
    if (query.includes('experts') || query.includes('professionals')) {
      return this.searchDatabase(params).then(results => 
        this.formatSmartResponse(results, params, query)
      );
    }
    
    // First answer the question
    let answer = '';
    
    if (openai) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [{
            role: 'user',
            content: `Answer concisely in 2 lines: ${query}`
          }],
          temperature: 0.7,
          max_tokens: 100
        });
        answer = response.choices[0].message.content;
      } catch (error) {
        answer = "Let me help you with that.";
      }
    } else {
      answer = "Let me help you with that.";
    }
    
    // Now find relevant profiles
    const keywords = query.split(' ').filter(w => w.length > 3);
    const results = await this.searchByKeywords(keywords);
    
    let finalResponse = answer + '\n\n';
    
    if (results.length > 0) {
      finalResponse += '*Alumni who can help:*\n';
      results.slice(0, 2).forEach((user, i) => {
        const name = user.basicProfile?.name || user.enhancedProfile?.fullName;
        const headline = user.basicProfile?.linkedinScrapedData?.headline || '';
        const linkedin = user.basicProfile?.linkedin || '';
        
        finalResponse += `\n${i+1}. *${name}*\n`;
        if (headline) finalResponse += `   ${headline}\n`;
        if (linkedin) finalResponse += `   ${linkedin}\n`;
      });
    }
    
    return finalResponse;
  }

  // Extract ALL parameters intelligently
  async extractAllParameters(query) {
    const params = {
      names: [],
      skills: [],
      locations: [],
      companies: [],
      education: [],
      roles: [],
      keywords: []
    };
    
    // Extract names (capitalize check)
    const nameMatch = query.match(/(?:who is|tell me about|find|profile of)\s+([a-z]+(?:\s+[a-z]+)?)/i);
    if (nameMatch) {
      params.names.push(nameMatch[1]);
    }
    
    // Skills/Technologies - comprehensive list
    const skills = [
      'web', 'developer', 'javascript', 'react', 'python', 'java', 'node',
      'frontend', 'backend', 'fullstack', 'full stack', 'mobile', 'ios', 'android',
      'machine learning', 'ml', 'ai', 'artificial intelligence', 'data science',
      'blockchain', 'cloud', 'aws', 'devops', 'database', 'sql', 'mongodb',
      'design', 'ui', 'ux', 'marketing', 'sales', 'finance', 'hr', 'legal', 'law'
    ];
    
    skills.forEach(skill => {
      if (query.includes(skill)) {
        params.skills.push(skill);
      }
    });
    
    // Locations - all Indian cities
    const locations = [
      'pune', 'mumbai', 'bangalore', 'bengaluru', 'delhi', 'new delhi', 'gurgaon', 'gurugram', 'noida',
      'chennai', 'kolkata', 'hyderabad', 'ahmedabad', 'surat', 'jaipur', 'lucknow',
      'indore', 'nagpur', 'bhopal', 'chandigarh', 'kochi', 'goa', 'mysore', 'coimbatore'
    ];
    
    locations.forEach(loc => {
      if (query.includes(loc)) {
        params.locations.push(loc);
      }
    });
    
    // Handle expansions for locations
    if (query.includes('blr')) params.locations.push('bangalore');
    if (query.includes('mum')) params.locations.push('mumbai');
    if (query.includes('del')) params.locations.push('delhi');
    
    // Companies
    const companies = [
      'google', 'microsoft', 'amazon', 'facebook', 'meta', 'apple',
      'infosys', 'tcs', 'wipro', 'hcl', 'tech mahindra', 'cognizant',
      'accenture', 'deloitte', 'pwc', 'ey', 'kpmg', 'mckinsey',
      'flipkart', 'paytm', 'ola', 'uber', 'zomato', 'swiggy', 'byju'
    ];
    
    companies.forEach(company => {
      if (query.includes(company)) {
        params.companies.push(company);
      }
    });
    
    // Education - handle COEP specially
    if (query.includes('coep')) {
      params.education.push('coep', 'college of engineering pune', 'college of engineering, pune');
    }
    
    const colleges = [
      'iit', 'nit', 'bits', 'iiit', 'iim', 'vit', 'mit', 'manipal',
      'symbiosis', 'university', 'college', 'institute'
    ];
    
    colleges.forEach(college => {
      if (query.includes(college)) {
        params.education.push(college);
      }
    });
    
    // Roles
    const roles = [
      'developer', 'engineer', 'designer', 'manager', 'director', 'ceo', 'cto',
      'founder', 'co-founder', 'entrepreneur', 'consultant', 'analyst', 'architect',
      'lead', 'senior', 'junior', 'intern', 'lawyer', 'advocate', 'doctor'
    ];
    
    roles.forEach(role => {
      if (query.includes(role)) {
        params.roles.push(role);
      }
    });
    
    // Extract remaining keywords
    const words = query.split(/\s+/).filter(w => 
      w.length > 2 && !['the', 'and', 'for', 'with', 'can', 'you', 'help', 'me', 'to', 'connect'].includes(w)
    );
    params.keywords = words;
    
    return params;
  }

  // Search database with ALL combinations
  async searchDatabase(params) {
    const db = getDatabase();
    const conditions = [];
    
    // Name search - highest priority
    if (params.names.length > 0) {
      const nameQuery = {
        $or: params.names.flatMap(name => [
          { 'basicProfile.name': { $regex: name, $options: 'i' } },
          { 'enhancedProfile.fullName': { $regex: name, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.fullName': { $regex: name, $options: 'i' } }
        ])
      };
      
      const nameResults = await db.collection('users').find(nameQuery).limit(5).toArray();
      if (nameResults.length > 0) return nameResults;
    }
    
    // Build complex query for combinations
    
    // Skills conditions
    if (params.skills.length > 0) {
      const skillConds = params.skills.flatMap(skill => [
        { 'basicProfile.linkedinScrapedData.headline': { $regex: skill, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.skills': { $regex: skill, $options: 'i' } },
        { 'basicProfile.about': { $regex: skill, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.experience.title': { $regex: skill, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.experience.description': { $regex: skill, $options: 'i' } }
      ]);
      conditions.push({ $or: skillConds });
    }
    
    // Location conditions
    if (params.locations.length > 0) {
      const locConds = params.locations.flatMap(loc => [
        { 'basicProfile.linkedinScrapedData.location': { $regex: loc, $options: 'i' } },
        { 'enhancedProfile.city': { $regex: loc, $options: 'i' } },
        { 'enhancedProfile.currentAddress': { $regex: loc, $options: 'i' } }
      ]);
      conditions.push({ $or: locConds });
    }
    
    // Company conditions
    if (params.companies.length > 0) {
      const compConds = params.companies.flatMap(comp => [
        { 'basicProfile.linkedinScrapedData.currentCompany': { $regex: comp, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.experience.company': { $regex: comp, $options: 'i' } }
      ]);
      conditions.push({ $or: compConds });
    }
    
    // Education conditions - SPECIAL HANDLING FOR COEP
    if (params.education.length > 0) {
      const eduConds = [];
      
      // Check if COEP is mentioned
      if (params.education.some(e => e.includes('coep') || e.includes('college of engineering'))) {
        eduConds.push(
          { 'basicProfile.linkedinScrapedData.education.title': { $regex: 'college.*engineering.*pune', $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.education.title': { $regex: 'COEP', $options: 'i' } },
          { 'basicProfile.about': { $regex: 'COEP', $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.about': { $regex: 'COEP', $options: 'i' } }
        );
      }
      
      // Add other education conditions
      params.education.forEach(edu => {
        if (!edu.includes('coep')) {
          eduConds.push(
            { 'basicProfile.linkedinScrapedData.education.title': { $regex: edu, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.education.school': { $regex: edu, $options: 'i' } }
          );
        }
      });
      
      if (eduConds.length > 0) {
        conditions.push({ $or: eduConds });
      }
    }
    
    // Role conditions
    if (params.roles.length > 0) {
      const roleConds = params.roles.flatMap(role => [
        { 'basicProfile.linkedinScrapedData.headline': { $regex: role, $options: 'i' } },
        { 'enhancedProfile.professionalRole': { $regex: role, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.experience.title': { $regex: role, $options: 'i' } }
      ]);
      conditions.push({ $or: roleConds });
    }
    
    // Execute search
    let query = {};
    if (conditions.length > 0) {
      query = conditions.length === 1 ? conditions[0] : { $and: conditions };
    } else if (params.keywords.length > 0) {
      // Fallback to keyword search
      const keywordConds = params.keywords.flatMap(keyword => [
        { 'basicProfile.name': { $regex: keyword, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.headline': { $regex: keyword, $options: 'i' } },
        { 'basicProfile.about': { $regex: keyword, $options: 'i' } }
      ]);
      query = { $or: keywordConds };
    }
    
    // Always try to get some results
    let results = await db.collection('users').find(query).limit(10).toArray();
    
    // If no results and we have params, try broader search
    if (results.length === 0 && (params.skills.length > 0 || params.roles.length > 0)) {
      const broaderQuery = {
        $or: [
          ...params.skills.map(s => ({ 'basicProfile.linkedinScrapedData.headline': { $regex: s, $options: 'i' } })),
          ...params.roles.map(r => ({ 'basicProfile.linkedinScrapedData.headline': { $regex: r, $options: 'i' } }))
        ]
      };
      results = await db.collection('users').find(broaderQuery).limit(5).toArray();
    }
    
    return results;
  }

  // Search by keywords
  async searchByKeywords(keywords) {
    const db = getDatabase();
    const conditions = keywords.map(keyword => ({
      $or: [
        { 'basicProfile.linkedinScrapedData.headline': { $regex: keyword, $options: 'i' } },
        { 'basicProfile.about': { $regex: keyword, $options: 'i' } }
      ]
    }));
    
    const query = conditions.length > 0 ? { $or: conditions } : {};
    return await db.collection('users').find(query).limit(2).toArray();
  }

  // Format smart response
  formatSmartResponse(results, params, query) {
    if (results.length === 0) {
      // Be helpful even with no results
      let message = "No exact matches found.\n\n";
      
      if (params.locations.length > 0 && params.skills.length > 0) {
        message += `Try searching for just "${params.skills[0]}" or just "${params.locations[0]}"`;
      } else if (params.education.length > 0) {
        message += "Try different college names or abbreviations";
      } else {
        message += "Try different keywords or check spelling";
      }
      
      return message;
    }
    
    let response = `*Found ${results.length} ${results.length === 1 ? 'profile' : 'profiles'}`;
    
    // Add context about what was searched
    if (params.skills.length > 0) response += ` - ${params.skills[0]}`;
    if (params.locations.length > 0) response += ` in ${params.locations[0]}`;
    if (params.companies.length > 0) response += ` at ${params.companies[0]}`;
    if (params.education.length > 0) response += ` from ${params.education[0]}`;
    response += '*\n\n';
    
    // Format profiles
    results.slice(0, 5).forEach((user, index) => {
      const name = user.basicProfile?.name || 
                  user.enhancedProfile?.fullName || 
                  user.basicProfile?.linkedinScrapedData?.fullName || 'Alumni';
      
      const headline = user.basicProfile?.linkedinScrapedData?.headline || 
                      user.enhancedProfile?.professionalRole || '';
      
      const location = user.basicProfile?.linkedinScrapedData?.location || 
                      user.enhancedProfile?.city || '';
      
      const company = user.basicProfile?.linkedinScrapedData?.currentCompany || '';
      const linkedin = user.basicProfile?.linkedin || user.enhancedProfile?.linkedin || '';
      
      response += `${index + 1}. *${name}*\n`;
      
      // Show match reason
      const matchReasons = [];
      if (params.locations.some(l => location.toLowerCase().includes(l))) {
        matchReasons.push(`📍 ${location}`);
      }
      if (params.skills.some(s => headline.toLowerCase().includes(s))) {
        matchReasons.push('Skills match');
      }
      
      if (matchReasons.length > 0) {
        response += `   [${matchReasons.join(' • ')}]\n\n`;
      }
      
      if (headline) response += `   ${headline}\n`;
      if (company) response += `   Company: ${company}\n`;
      if (location && !matchReasons.some(r => r.includes('📍'))) {
        response += `   Location: ${location}\n`;
      }
      
      // Show relevant experience
      const exp = user.basicProfile?.linkedinScrapedData?.experience?.[0];
      if (exp && exp.title) {
        response += `   Experience: ${exp.title}`;
        if (exp.duration) response += ` (${exp.duration})`;
        response += '\n';
      }
      
      // About section (short)
      const about = user.basicProfile?.about || user.basicProfile?.linkedinScrapedData?.about;
      if (about && about.length > 0) {
        const shortAbout = about.substring(0, 100).replace(/\n/g, ' ');
        response += `\n   _${shortAbout}..._\n`;
      }
      
      if (linkedin) response += `\n   LinkedIn: ${linkedin}\n`;
      
      response += '\n';
    });
    
    return response.trim();
  }

  // Search fallback
  async searchFallback(query) {
    const db = getDatabase();
    
    // Just try to find SOMETHING relevant
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (words.length === 0) return "Please be more specific about what you're looking for.";
    
    const conditions = words.map(word => ({
      $or: [
        { 'basicProfile.name': { $regex: word, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.headline': { $regex: word, $options: 'i' } }
      ]
    }));
    
    const results = await db.collection('users')
      .find({ $or: conditions })
      .limit(3)
      .toArray();
    
    if (results.length === 0) {
      return "I couldn't find specific matches. Try different keywords or be more specific.";
    }
    
    return this.formatSmartResponse(results, { keywords: words }, query);
  }
}

module.exports = new UltimateIntelligentService();