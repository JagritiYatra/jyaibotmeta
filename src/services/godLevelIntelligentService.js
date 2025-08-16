// God-Level Intelligent Service - Handles EVERYTHING with supreme intelligence
const { getDatabase } = require('../config/database');
const OpenAI = require('openai');
const { getConfig } = require('../config/environment');

const config = getConfig();
const openai = config.ai?.apiKey ? new OpenAI({ apiKey: config.ai.apiKey }) : null;

class GodLevelIntelligentService {
  constructor() {
    this.userSessions = new Map();
    this.abbreviations = this.initAbbreviations();
  }

  initAbbreviations() {
    return {
      // Colleges
      'coep': 'college of engineering pune',
      'iit': 'indian institute of technology',
      'nit': 'national institute of technology',
      'bits': 'birla institute',
      'vit': 'vellore institute',
      'mit': 'manipal institute',
      
      // Companies
      'tcs': 'tata consultancy services',
      'infy': 'infosys',
      'wipro': 'wipro',
      'hcl': 'hcl technologies',
      'ms': 'microsoft',
      'goog': 'google',
      'fb': 'facebook',
      'meta': 'meta',
      
      // Skills
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'ml': 'machine learning',
      'ai': 'artificial intelligence',
      'ds': 'data science',
      'dev': 'developer',
      'eng': 'engineer',
      
      // Locations
      'blr': 'bangalore',
      'mum': 'mumbai',
      'del': 'delhi',
      'hyd': 'hyderabad',
      'chn': 'chennai',
      'kol': 'kolkata',
      'ncr': 'delhi ncr',
      
      // Common misspellings
      'developper': 'developer',
      'lawer': 'lawyer',
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

  // MAIN SEARCH - God-level intelligence
  async search(query, user, session) {
    try {
      const userId = user?._id?.toString() || 'anonymous';
      const userPhone = user?.whatsappNumber || user?.phone;
      const userSession = this.getOrCreateSession(userId);
      
      // Clean and expand query
      const cleanQuery = this.cleanAndExpand(query);
      console.log(`God-level search: "${query}" -> "${cleanQuery}"`);
      
      // SELF-AWARENESS: Check if user asking about themselves
      if (this.isAskingAboutSelf(cleanQuery)) {
        return await this.generateSelfProfile(user, userPhone);
      }
      
      // Analyze intent with extended thinking
      const intent = await this.analyzeIntentDeeply(cleanQuery, userSession);
      console.log('Deep intent analysis:', JSON.stringify(intent, null, 2));
      
      // Handle different intent types
      switch(intent.type) {
        case 'casual_question':
          // Answer the question AND embed relevant profiles
          return await this.handleCasualQuestionWithProfiles(cleanQuery, intent);
          
        case 'follow_up':
          return await this.handleIntelligentFollowUp(cleanQuery, userSession);
          
        case 'complex_search':
          // Multi-parameter search
          return await this.handleComplexSearch(intent.parameters);
          
        case 'simple_search':
          // Single parameter search
          return await this.handleSimpleSearch(intent.parameters);
          
        case 'name_search':
          // Rich profile for specific person
          return await this.generateRichProfile(intent.parameters);
          
        case 'greeting':
          return this.handleGreeting(user);
          
        default:
          // Fallback to intelligent search
          return await this.performIntelligentSearch(cleanQuery, intent.parameters);
      }
      
    } catch (error) {
      console.error('God-level search error:', error);
      return "I'm having trouble understanding. Can you rephrase your question?";
    }
  }

  // Clean and expand abbreviations
  cleanAndExpand(query) {
    let expanded = query.toLowerCase().trim();
    
    // Expand all abbreviations
    for (const [abbr, full] of Object.entries(this.abbreviations)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      expanded = expanded.replace(regex, full);
    }
    
    return expanded;
  }

  // Check if user asking about themselves
  isAskingAboutSelf(query) {
    const selfPatterns = [
      /about me/i,
      /my profile/i,
      /who am i/i,
      /tell me about myself/i,
      /what do you know about me/i,
      /my information/i,
      /show my profile/i
    ];
    
    return selfPatterns.some(pattern => pattern.test(query));
  }

  // Generate user's own profile
  async generateSelfProfile(user, phone) {
    const db = getDatabase();
    
    // Find user by phone number
    const userProfile = await db.collection('users').findOne({
      $or: [
        { whatsappNumber: phone },
        { 'basicProfile.phone': phone },
        { 'enhancedProfile.phone': phone },
        { _id: user._id }
      ]
    });
    
    if (!userProfile) {
      return "I don't have your complete profile yet. Please complete your profile to see your information.";
    }
    
    // Generate impressive self-reflection
    const name = userProfile.enhancedProfile?.fullName || 
                userProfile.basicProfile?.name || 'Friend';
    
    const scraped = userProfile.basicProfile?.linkedinScrapedData || {};
    const headline = scraped.headline || userProfile.enhancedProfile?.professionalRole || '';
    const about = scraped.about || userProfile.basicProfile?.about || '';
    
    if (openai && about) {
      try {
        const prompt = `Write an inspiring, motivational message about this person's profile. Make them feel special and valued:
        
Name: ${name}
Role: ${headline}
About: ${about}

Write a personal, uplifting message (150 words) that:
1. Highlights their strengths
2. Acknowledges their journey
3. Inspires them about their future
4. Makes them feel proud
Use *bold* for emphasis`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.9,
          max_tokens: 200
        });
        
        return response.choices[0].message.content;
      } catch (error) {
        // Fallback
      }
    }
    
    return `*${name}*, you're an incredible member of our alumni network!\n\n${headline ? `As ${headline}, you` : 'You'} bring unique value to our community. Your journey is inspiring, and your potential is limitless.\n\nKeep pushing boundaries and creating impact! 🌟`;
  }

  // Deep intent analysis with extended thinking
  async analyzeIntentDeeply(query, session) {
    const intent = {
      type: 'unknown',
      parameters: {
        names: [],
        skills: [],
        locations: [],
        companies: [],
        education: [],
        roles: [],
        domains: [],
        keywords: []
      },
      confidence: 0
    };
    
    // Check for follow-up
    if (this.isFollowUp(query, session)) {
      intent.type = 'follow_up';
      intent.confidence = 0.9;
      return intent;
    }
    
    // Check for greeting
    if (/^(hi|hello|hey|good morning|good evening)$/i.test(query.trim())) {
      intent.type = 'greeting';
      intent.confidence = 1.0;
      return intent;
    }
    
    // Check for casual questions (what is, how to, etc.)
    if (/^(what is|how to|explain|why|when|where does)/i.test(query)) {
      intent.type = 'casual_question';
      intent.confidence = 0.8;
      
      // Extract topic for finding relevant profiles
      const topic = query.replace(/^(what is|how to|explain|why|when|where does)\s+/i, '');
      intent.parameters.keywords = topic.split(/\s+/);
      return intent;
    }
    
    // Extract ALL possible parameters
    
    // Names (proper nouns, capitalized words)
    const nameMatches = query.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) || [];
    intent.parameters.names.push(...nameMatches.map(n => n.toLowerCase()));
    
    // Check if it's primarily a name search
    if (query.match(/^(who is|tell me about|do you know|profile of|information on)\s+/i)) {
      intent.type = 'name_search';
      const name = query.replace(/^(who is|tell me about|do you know|profile of|information on)\s+/i, '').trim();
      intent.parameters.names = [name];
      intent.confidence = 0.9;
      return intent;
    }
    
    // Companies
    const companies = [
      'google', 'microsoft', 'amazon', 'facebook', 'meta', 'apple', 'netflix',
      'infosys', 'tcs', 'wipro', 'hcl', 'tech mahindra', 'capgemini', 'accenture',
      'deloitte', 'pwc', 'ey', 'kpmg', 'mckinsey', 'bain', 'bcg',
      'flipkart', 'paytm', 'ola', 'uber', 'zomato', 'swiggy', 'byju',
      'startup', 'mnc', 'consulting', 'fintech', 'edtech', 'healthtech'
    ];
    
    companies.forEach(company => {
      if (query.includes(company)) {
        intent.parameters.companies.push(company);
      }
    });
    
    // Locations
    const locations = [
      'pune', 'mumbai', 'bangalore', 'delhi', 'hyderabad', 'chennai', 'kolkata',
      'ahmedabad', 'surat', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore',
      'thane', 'bhopal', 'vadodara', 'gurgaon', 'noida', 'chandigarh', 'goa',
      'usa', 'uk', 'canada', 'australia', 'germany', 'singapore', 'dubai'
    ];
    
    locations.forEach(location => {
      if (query.includes(location)) {
        intent.parameters.locations.push(location);
      }
    });
    
    // Skills & Technologies
    const skills = [
      'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node',
      'machine learning', 'artificial intelligence', 'data science', 'blockchain',
      'web development', 'mobile development', 'cloud', 'aws', 'azure', 'gcp',
      'devops', 'docker', 'kubernetes', 'microservices', 'api', 'database',
      'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis',
      'marketing', 'sales', 'finance', 'hr', 'operations', 'strategy',
      'design', 'ui', 'ux', 'product management', 'project management'
    ];
    
    skills.forEach(skill => {
      if (query.includes(skill)) {
        intent.parameters.skills.push(skill);
      }
    });
    
    // Roles
    const roles = [
      'developer', 'engineer', 'manager', 'director', 'ceo', 'cto', 'founder',
      'consultant', 'analyst', 'architect', 'designer', 'lead', 'senior',
      'junior', 'intern', 'freelancer', 'entrepreneur', 'lawyer', 'doctor',
      'teacher', 'professor', 'researcher', 'scientist'
    ];
    
    roles.forEach(role => {
      if (query.includes(role)) {
        intent.parameters.roles.push(role);
      }
    });
    
    // Education
    const education = [
      'iit', 'nit', 'bits', 'iiit', 'iim', 'isc', 'coep', 'vjti', 'mit', 'vit',
      'college of engineering', 'university', 'institute', 'school',
      'btech', 'mtech', 'mba', 'phd', 'bachelor', 'master', 'graduate'
    ];
    
    education.forEach(edu => {
      if (query.includes(edu)) {
        intent.parameters.education.push(edu);
      }
    });
    
    // Determine search complexity
    const paramCount = Object.values(intent.parameters).filter(arr => arr.length > 0).length;
    
    if (paramCount > 1) {
      intent.type = 'complex_search';
      intent.confidence = 0.8;
    } else if (paramCount === 1) {
      intent.type = 'simple_search';
      intent.confidence = 0.7;
    } else {
      // Extract any remaining keywords
      intent.parameters.keywords = query.split(/\s+/).filter(word => 
        word.length > 2 && !['the', 'and', 'for', 'with', 'from', 'who', 'can', 'any'].includes(word)
      );
      intent.type = intent.parameters.keywords.length > 0 ? 'simple_search' : 'unknown';
      intent.confidence = 0.5;
    }
    
    return intent;
  }

  // Handle casual questions with embedded profiles
  async handleCasualQuestionWithProfiles(query, intent) {
    if (!openai) {
      return this.performIntelligentSearch(query, intent.parameters);
    }
    
    try {
      // First, answer the question
      const answerPrompt = `Answer this question concisely in 2-3 lines: ${query}`;
      
      const answer = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: answerPrompt }],
        temperature: 0.7,
        max_tokens: 150
      });
      
      let response = answer.choices[0].message.content + '\n\n';
      
      // Now find relevant profiles based on the topic
      const db = getDatabase();
      const searchTerms = intent.parameters.keywords;
      
      if (searchTerms.length > 0) {
        const conditions = [];
        searchTerms.forEach(term => {
          conditions.push(
            { 'basicProfile.linkedinScrapedData.headline': { $regex: term, $options: 'i' } },
            { 'basicProfile.about': { $regex: term, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.experience.title': { $regex: term, $options: 'i' } }
          );
        });
        
        const profiles = await db.collection('users')
          .find({ $or: conditions })
          .limit(2)
          .toArray();
        
        if (profiles.length > 0) {
          response += '*Alumni who can help with this:*\n\n';
          
          profiles.forEach((profile, index) => {
            const name = profile.basicProfile?.name || profile.enhancedProfile?.fullName;
            const headline = profile.basicProfile?.linkedinScrapedData?.headline || '';
            const company = profile.basicProfile?.linkedinScrapedData?.currentCompany || '';
            const linkedin = profile.basicProfile?.linkedin || '';
            
            response += `${index + 1}. *${name}*\n`;
            if (headline) response += `   ${headline}\n`;
            if (company) response += `   @ ${company}\n`;
            if (linkedin) response += `   Connect: ${linkedin}\n`;
            response += '\n';
          });
        }
      }
      
      return response;
      
    } catch (error) {
      return this.performIntelligentSearch(query, intent.parameters);
    }
  }

  // Handle complex multi-parameter searches
  async handleComplexSearch(params) {
    const db = getDatabase();
    let pipeline = [];
    
    // Build match conditions for each parameter type
    const matchConditions = { $and: [] };
    
    // Location conditions
    if (params.locations.length > 0) {
      const locConditions = params.locations.map(loc => ({
        $or: [
          { 'basicProfile.linkedinScrapedData.location': { $regex: loc, $options: 'i' } },
          { 'enhancedProfile.city': { $regex: loc, $options: 'i' } }
        ]
      }));
      matchConditions.$and.push({ $or: locConditions.flat() });
    }
    
    // Skills conditions
    if (params.skills.length > 0) {
      const skillConditions = params.skills.map(skill => ({
        $or: [
          { 'basicProfile.linkedinScrapedData.headline': { $regex: skill, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.skills': { $regex: skill, $options: 'i' } },
          { 'basicProfile.about': { $regex: skill, $options: 'i' } }
        ]
      }));
      matchConditions.$and.push({ $or: skillConditions.flat() });
    }
    
    // Company conditions
    if (params.companies.length > 0) {
      const companyConditions = params.companies.map(company => ({
        $or: [
          { 'basicProfile.linkedinScrapedData.currentCompany': { $regex: company, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.company': { $regex: company, $options: 'i' } }
        ]
      }));
      matchConditions.$and.push({ $or: companyConditions.flat() });
    }
    
    // Education conditions - handle COEP properly
    if (params.education.length > 0) {
      const eduConditions = [];
      params.education.forEach(edu => {
        // Special handling for COEP
        if (edu.includes('college of engineering')) {
          eduConditions.push(
            { 'basicProfile.linkedinScrapedData.education.title': { $regex: 'college.*engineering.*pune', $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.education.title': { $regex: 'COEP', $options: 'i' } },
            { 'basicProfile.about': { $regex: 'COEP', $options: 'i' } }
          );
        } else {
          eduConditions.push(
            { 'basicProfile.linkedinScrapedData.education.title': { $regex: edu, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.education.school': { $regex: edu, $options: 'i' } }
          );
        }
      });
      if (eduConditions.length > 0) {
        matchConditions.$and.push({ $or: eduConditions });
      }
    }
    
    // Role conditions
    if (params.roles.length > 0) {
      const roleConditions = params.roles.map(role => ({
        $or: [
          { 'basicProfile.linkedinScrapedData.headline': { $regex: role, $options: 'i' } },
          { 'enhancedProfile.professionalRole': { $regex: role, $options: 'i' } }
        ]
      }));
      matchConditions.$and.push({ $or: roleConditions.flat() });
    }
    
    // Build pipeline
    if (matchConditions.$and.length > 0) {
      pipeline.push({ $match: matchConditions });
    }
    
    // Add scoring based on match quality
    pipeline.push({
      $addFields: {
        matchScore: {
          $add: [
            { $cond: [{ $ifNull: ['$enhancedProfile.completed', false] }, 10, 0] },
            { $cond: [{ $ifNull: ['$basicProfile.linkedinScrapedData', false] }, 10, 0] },
            { $size: { $ifNull: ['$basicProfile.linkedinScrapedData.experience', []] } },
            { $size: { $ifNull: ['$basicProfile.linkedinScrapedData.skills', []] } }
          ]
        }
      }
    });
    
    // Sort by score
    pipeline.push({ $sort: { matchScore: -1 } });
    pipeline.push({ $limit: 10 });
    
    // Execute search
    const results = await db.collection('users').aggregate(pipeline).toArray();
    
    return this.formatIntelligentResults(results, params);
  }

  // Format results intelligently
  formatIntelligentResults(results, params) {
    if (results.length === 0) {
      return this.getIntelligentNoResults(params);
    }
    
    let response = `*Found ${results.length} ${results.length === 1 ? 'profile' : 'profiles'}`;
    
    // Describe what was searched
    const searchDesc = [];
    if (params.skills.length > 0) searchDesc.push(params.skills.join('/'));
    if (params.locations.length > 0) searchDesc.push(`in ${params.locations.join('/')}`);
    if (params.companies.length > 0) searchDesc.push(`at ${params.companies.join('/')}`);
    if (params.education.length > 0) searchDesc.push(`from ${params.education.join('/')}`);
    
    if (searchDesc.length > 0) {
      response += ` - ${searchDesc.join(' ')}`;
    }
    response += '*\n\n';
    
    // Show profiles
    results.slice(0, 5).forEach((user, index) => {
      const name = user.basicProfile?.name || user.enhancedProfile?.fullName || 'Alumni';
      const headline = user.basicProfile?.linkedinScrapedData?.headline || '';
      const location = user.basicProfile?.linkedinScrapedData?.location || '';
      const company = user.basicProfile?.linkedinScrapedData?.currentCompany || '';
      const linkedin = user.basicProfile?.linkedin || '';
      
      response += `${index + 1}. *${name}*\n`;
      if (headline) response += `   ${headline}\n`;
      if (company) response += `   @ ${company}`;
      if (location) response += ` • ${location}`;
      response += '\n';
      
      // Show why this matches
      const matches = [];
      if (params.skills.some(s => (headline + (user.basicProfile?.about || '')).toLowerCase().includes(s))) {
        matches.push('Skills match');
      }
      if (params.locations.some(l => location.toLowerCase().includes(l))) {
        matches.push('Location match');
      }
      if (params.companies.some(c => company.toLowerCase().includes(c))) {
        matches.push('Company match');
      }
      
      if (matches.length > 0) {
        response += `   _[${matches.join(' • ')}]_\n`;
      }
      
      if (linkedin) response += `   ${linkedin}\n`;
      response += '\n';
    });
    
    return response;
  }

  // Get intelligent no results message
  getIntelligentNoResults(params) {
    let message = 'No exact matches found.\n\n';
    
    if (params.locations.length > 0 && params.skills.length > 0) {
      message += `Try searching for just ${params.skills[0]} or just ${params.locations[0]} to get more results.`;
    } else if (params.companies.length > 0) {
      message += `No alumni currently at ${params.companies[0]}. Try searching by skills or location instead.`;
    } else {
      message += 'Try different keywords or broader search terms.';
    }
    
    return message;
  }

  // Check if follow-up
  isFollowUp(query, session) {
    const followUpPatterns = [
      /^(more|show more|any more|anyone else)$/i,
      /^(next|another|different)$/i,
      /^(what about|how about|and)$/i
    ];
    
    return followUpPatterns.some(p => p.test(query.trim())) && 
           session.lastActivity && 
           (Date.now() - session.lastActivity < 5 * 60 * 1000); // Within 5 minutes
  }

  // Handle intelligent follow-up
  async handleIntelligentFollowUp(query, session) {
    if (!session.lastResults || session.lastResults.length === 0) {
      return "No previous search to continue from. What would you like to search for?";
    }
    
    const shown = session.shownCount || 0;
    const remaining = session.lastResults.slice(shown, shown + 3);
    
    if (remaining.length === 0) {
      return "That's all the results. Try a new search!";
    }
    
    session.shownCount = shown + remaining.length;
    
    return this.formatIntelligentResults(remaining, session.lastParams || {});
  }

  // Handle simple single-parameter search
  async handleSimpleSearch(params) {
    const db = getDatabase();
    let query = {};
    
    // Build query based on single parameter
    if (params.names.length > 0) {
      query = {
        $or: [
          { 'basicProfile.name': { $regex: params.names[0], $options: 'i' } },
          { 'enhancedProfile.fullName': { $regex: params.names[0], $options: 'i' } }
        ]
      };
    } else if (params.roles.length > 0) {
      // For developer searches, be more specific
      if (params.roles.includes('developer')) {
        query = {
          $or: [
            { 'basicProfile.linkedinScrapedData.headline': { $regex: '(web|software|full.?stack|front.?end|back.?end|developer|engineer|programmer)', $options: 'i' } },
            { 'basicProfile.about': { $regex: '(web|software|development|programming|coding)', $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.experience.title': { $regex: 'developer|engineer|programmer', $options: 'i' } },
            { 'enhancedProfile.professionalRole': { $regex: 'developer|engineer|programmer', $options: 'i' } }
          ]
        };
      } else {
        query = {
          $or: [
            { 'basicProfile.linkedinScrapedData.headline': { $regex: params.roles[0], $options: 'i' } },
            { 'enhancedProfile.professionalRole': { $regex: params.roles[0], $options: 'i' } }
          ]
        };
      }
    } else if (params.skills.length > 0) {
      query = {
        $or: [
          { 'basicProfile.linkedinScrapedData.headline': { $regex: params.skills[0], $options: 'i' } },
          { 'basicProfile.about': { $regex: params.skills[0], $options: 'i' } }
        ]
      };
    } else if (params.locations.length > 0) {
      query = {
        $or: [
          { 'basicProfile.linkedinScrapedData.location': { $regex: params.locations[0], $options: 'i' } },
          { 'enhancedProfile.city': { $regex: params.locations[0], $options: 'i' } }
        ]
      };
    } else if (params.companies.length > 0) {
      query = {
        $or: [
          { 'basicProfile.linkedinScrapedData.currentCompany': { $regex: params.companies[0], $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.company': { $regex: params.companies[0], $options: 'i' } }
        ]
      };
    } else if (params.education.length > 0) {
      query = {
        $or: [
          { 'basicProfile.linkedinScrapedData.education.title': { $regex: params.education[0], $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.education.school': { $regex: params.education[0], $options: 'i' } }
        ]
      };
    }
    
    const results = await db.collection('users').find(query).limit(10).toArray();
    return this.formatIntelligentResults(results, params);
  }

  // Generate rich profile for name search
  async generateRichProfile(params) {
    if (params.names.length === 0) {
      return "Please specify a name to search for.";
    }
    
    const db = getDatabase();
    const user = await db.collection('users').findOne({
      $or: [
        { 'basicProfile.name': { $regex: params.names[0], $options: 'i' } },
        { 'enhancedProfile.fullName': { $regex: params.names[0], $options: 'i' } }
      ]
    });
    
    if (!user) {
      return `No profile found for "${params.names[0]}". Try checking the spelling or search differently.`;
    }
    
    // Generate rich profile with AI if available
    const name = user.basicProfile?.name || user.enhancedProfile?.fullName;
    const scraped = user.basicProfile?.linkedinScrapedData || {};
    const headline = scraped.headline || '';
    const about = scraped.about || user.basicProfile?.about || '';
    
    if (openai && about) {
      try {
        const prompt = `Create an impressive professional profile summary for WhatsApp:
        
Name: ${name}
Role: ${headline}
About: ${about}

Write a compelling 200-word profile that highlights their expertise and achievements. Use *bold* for emphasis.`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 300
        });
        
        let aiProfile = response.choices[0].message.content + '\n\n';
        
        // Add contact info
        if (user.basicProfile?.linkedin) {
          aiProfile += `*Connect:* ${user.basicProfile.linkedin}\n`;
        }
        
        return aiProfile;
      } catch (error) {
        // Fallback
      }
    }
    
    // Fallback formatting
    let profile = `*${name}*\n`;
    if (headline) profile += `_${headline}_\n\n`;
    if (about) profile += `${about.substring(0, 300)}...\n\n`;
    
    if (scraped.experience?.length > 0) {
      profile += '*Experience:*\n';
      scraped.experience.slice(0, 3).forEach(exp => {
        profile += `• ${exp.title} at ${exp.company}\n`;
      });
      profile += '\n';
    }
    
    if (user.basicProfile?.linkedin) {
      profile += `*Connect:* ${user.basicProfile.linkedin}\n`;
    }
    
    return profile;
  }

  // Handle greeting
  handleGreeting(user) {
    const name = user?.basicProfile?.name?.split(' ')[0] || 'Friend';
    const greetings = [
      `Hello ${name}! How can I help you today?`,
      `Hi ${name}! What would you like to know?`,
      `Hey ${name}! Ready to connect with amazing alumni?`,
      `Welcome back ${name}! What can I do for you?`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Perform intelligent search (fallback)
  async performIntelligentSearch(query, params) {
    const db = getDatabase();
    
    // Build a general search query
    const words = query.split(/\s+/).filter(w => w.length > 2);
    const conditions = [];
    
    words.forEach(word => {
      conditions.push(
        { 'basicProfile.name': { $regex: word, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.headline': { $regex: word, $options: 'i' } },
        { 'basicProfile.about': { $regex: word, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.location': { $regex: word, $options: 'i' } }
      );
    });
    
    if (conditions.length === 0) {
      return "I couldn't understand your search. Try asking about people, skills, locations, or companies.";
    }
    
    const results = await db.collection('users')
      .find({ $or: conditions })
      .limit(5)
      .toArray();
    
    return this.formatIntelligentResults(results, params);
  }

  // Session management
  getOrCreateSession(userId) {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        userId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        lastResults: [],
        lastParams: {},
        shownCount: 0
      });
    }
    
    const session = this.userSessions.get(userId);
    session.lastActivity = Date.now();
    return session;
  }
}

module.exports = new GodLevelIntelligentService();