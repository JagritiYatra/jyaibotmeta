// AI-Powered Search Service - God-level intelligence with GPT-4
const { getDatabase } = require('../config/database');
const OpenAI = require('openai');
const { getConfig } = require('../config/environment');

const config = getConfig();
const openai = config.ai?.apiKey ? new OpenAI({ apiKey: config.ai.apiKey }) : null;

class AIPoweredSearchService {
  constructor() {
    this.userSessions = new Map();
  }

  // MAIN SEARCH - AI-powered understanding
  async search(query, user, session) {
    try {
      const userId = user?._id?.toString() || 'anonymous';
      let userSession = this.getOrCreateSession(userId);
      
      console.log(`🤖 AI-Powered Search: "${query}"`);
      
      // Handle greetings
      if (this.isSimpleGreeting(query)) {
        const name = user?.basicProfile?.name?.split(' ')[0] || 'there';
        return `Hello ${name}! 👋 How can I help you find the perfect alumni today?`;
      }
      
      // Handle "more" requests
      if (this.isAskingForMore(query, userSession)) {
        return await this.showMoreResults(userSession);
      }
      
      // STEP 1: Use GPT-4 to understand intent
      const intent = await this.analyzeIntentWithAI(query, userSession);
      console.log('🧠 AI Intent:', JSON.stringify(intent, null, 2));
      
      // STEP 2: Deep database scan based on AI understanding
      const searchResults = await this.intelligentDatabaseSearch(intent);
      console.log(`📊 Found ${searchResults.length} potential matches`);
      
      // STEP 3: Score and rank results
      const rankedResults = await this.rankResultsWithAI(searchResults, intent);
      
      // Store for pagination
      userSession.lastQuery = query;
      userSession.lastIntent = intent;
      userSession.allResults = rankedResults;
      userSession.shownCount = 0;
      
      // STEP 4: Format response with AI-rewritten content
      return await this.formatIntelligentResponse(rankedResults, intent, userSession);
      
    } catch (error) {
      console.error('AI search error:', error);
      // Fallback to basic search
      return await this.fallbackSearch(query);
    }
  }

  // Check if simple greeting
  isSimpleGreeting(query) {
    return /^(hi|hello|hey|good morning|good evening|good afternoon)$/i.test(query.trim());
  }

  // Check if asking for more
  isAskingForMore(query, session) {
    const morePatterns = [
      /^(more|show more|any more|anyone else|next|another|additional|others?)$/i,
      /^(give|show|tell)\s*(me)?\s*more$/i,
      /^what else/i
    ];
    
    return morePatterns.some(p => p.test(query.trim())) && 
           session.allResults && 
           session.allResults.length > session.shownCount;
  }

  // Analyze intent with GPT-4
  async analyzeIntentWithAI(query, session) {
    if (!openai) {
      // Fallback to rule-based extraction
      return this.extractBasicIntent(query);
    }
    
    try {
      const systemPrompt = `You are an expert at understanding user search queries for an alumni network database.
      
Analyze the user's query and extract:
1. search_type: "person" | "skill" | "location" | "education" | "company" | "role" | "combination" | "general"
2. is_name_search: true if searching for a specific person's name
3. person_name: the full name if searching for a person
4. skills: array of technical/professional skills mentioned
5. locations: array of cities/countries mentioned
6. education: array of colleges/universities mentioned  
7. companies: array of company names mentioned
8. roles: array of job roles/titles mentioned
9. experience_level: "junior" | "senior" | "lead" | "executive" | null
10. query_intent: brief description of what user wants
11. must_have: critical requirements that MUST match
12. nice_to_have: optional preferences

Context from previous query: ${session.lastQuery || 'none'}

Return JSON only.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });
      
      const intent = JSON.parse(response.choices[0].message.content);
      
      // Post-process to ensure arrays
      ['skills', 'locations', 'education', 'companies', 'roles', 'must_have', 'nice_to_have'].forEach(field => {
        if (!Array.isArray(intent[field])) {
          intent[field] = intent[field] ? [intent[field]] : [];
        }
      });
      
      return intent;
      
    } catch (error) {
      console.error('GPT-4 intent analysis failed:', error);
      return this.extractBasicIntent(query);
    }
  }

  // Basic intent extraction (fallback)
  extractBasicIntent(query) {
    const intent = {
      search_type: 'general',
      is_name_search: false,
      person_name: null,
      skills: [],
      locations: [],
      education: [],
      companies: [],
      roles: [],
      experience_level: null,
      query_intent: query,
      must_have: [],
      nice_to_have: []
    };
    
    // Check for name patterns
    const namePatterns = [
      /^(?:do you know about?|who is|tell me about|find|profile of)\s+(.+?)$/i,
      /^about\s+(.+?)$/i,
      /^([a-z]+(?:\s+[a-z]+){0,2})\s*\??$/i
    ];
    
    for (const pattern of namePatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (query.startsWith('do you know') || query.startsWith('who is') || query.startsWith('tell me about')) {
          intent.is_name_search = true;
          intent.person_name = name;
          intent.search_type = 'person';
          return intent;
        }
      }
    }
    
    // Extract other parameters
    const lowerQuery = query.toLowerCase();
    
    // Skills
    const skillKeywords = ['developer', 'designer', 'engineer', 'scientist', 'analyst', 'manager', 'marketing', 'sales', 'finance', 'hr', 'legal', 'data', 'web', 'mobile', 'cloud', 'ai', 'ml'];
    skillKeywords.forEach(skill => {
      if (lowerQuery.includes(skill)) {
        intent.skills.push(skill);
      }
    });
    
    // Locations
    const cities = ['pune', 'mumbai', 'bangalore', 'delhi', 'hyderabad', 'chennai', 'kolkata', 'ahmedabad'];
    cities.forEach(city => {
      if (lowerQuery.includes(city)) {
        intent.locations.push(city);
      }
    });
    
    // Education
    if (/\b(iit|nit|bits|coep|mit|iiit|iim)\b/i.test(query)) {
      const eduMatch = query.match(/\b(iit|nit|bits|coep|mit|iiit|iim)\b/gi);
      if (eduMatch) {
        intent.education = eduMatch.map(e => e.toLowerCase());
      }
    }
    
    // Determine search type
    if (intent.skills.length > 0 && intent.locations.length > 0) {
      intent.search_type = 'combination';
    } else if (intent.skills.length > 0) {
      intent.search_type = 'skill';
    } else if (intent.locations.length > 0) {
      intent.search_type = 'location';
    } else if (intent.education.length > 0) {
      intent.search_type = 'education';
    }
    
    return intent;
  }

  // Intelligent database search
  async intelligentDatabaseSearch(intent) {
    const db = getDatabase();
    
    // For name search
    if (intent.is_name_search && intent.person_name) {
      const nameRegex = new RegExp(intent.person_name.split(' ').join('.*'), 'i');
      return await db.collection('users').find({
        $or: [
          { 'basicProfile.name': { $regex: nameRegex } },
          { 'enhancedProfile.fullName': { $regex: nameRegex } },
          { 'basicProfile.linkedinScrapedData.fullName': { $regex: nameRegex } }
        ]
      }).limit(10).toArray();
    }
    
    // Build complex query for other searches
    const conditions = [];
    
    // Skills conditions - search everywhere
    if (intent.skills.length > 0) {
      const skillConditions = [];
      intent.skills.forEach(skill => {
        // Expand skill terms
        const expandedSkills = this.expandSkillTerms(skill);
        expandedSkills.forEach(expandedSkill => {
          skillConditions.push(
            { 'basicProfile.linkedinScrapedData.headline': { $regex: expandedSkill, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.skills': { $regex: expandedSkill, $options: 'i' } },
            { 'basicProfile.about': { $regex: expandedSkill, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.about': { $regex: expandedSkill, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.experience.title': { $regex: expandedSkill, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.experience.description': { $regex: expandedSkill, $options: 'i' } },
            { 'enhancedProfile.skills': { $regex: expandedSkill, $options: 'i' } }
          );
        });
      });
      if (skillConditions.length > 0) {
        conditions.push({ $or: skillConditions });
      }
    }
    
    // Location conditions
    if (intent.locations.length > 0) {
      const locationConditions = [];
      intent.locations.forEach(location => {
        // Expand location variations
        const locationVariations = this.getLocationVariations(location);
        locationVariations.forEach(loc => {
          locationConditions.push(
            { 'basicProfile.linkedinScrapedData.location': { $regex: loc, $options: 'i' } },
            { 'enhancedProfile.city': { $regex: loc, $options: 'i' } },
            { 'enhancedProfile.currentAddress': { $regex: loc, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.experience.location': { $regex: loc, $options: 'i' } }
          );
        });
      });
      if (locationConditions.length > 0) {
        conditions.push({ $or: locationConditions });
      }
    }
    
    // Education conditions
    if (intent.education.length > 0) {
      const eduConditions = [];
      intent.education.forEach(edu => {
        const expandedEdu = this.expandEducationTerms(edu);
        expandedEdu.forEach(eduTerm => {
          eduConditions.push(
            { 'basicProfile.linkedinScrapedData.education.title': { $regex: eduTerm, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.education.school': { $regex: eduTerm, $options: 'i' } },
            { 'basicProfile.about': { $regex: eduTerm, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.about': { $regex: eduTerm, $options: 'i' } }
          );
        });
      });
      if (eduConditions.length > 0) {
        conditions.push({ $or: eduConditions });
      }
    }
    
    // Company conditions
    if (intent.companies.length > 0) {
      const companyConditions = [];
      intent.companies.forEach(company => {
        companyConditions.push(
          { 'basicProfile.linkedinScrapedData.currentCompany': { $regex: company, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.company': { $regex: company, $options: 'i' } },
          { 'enhancedProfile.company': { $regex: company, $options: 'i' } }
        );
      });
      if (companyConditions.length > 0) {
        conditions.push({ $or: companyConditions });
      }
    }
    
    // Role conditions
    if (intent.roles.length > 0) {
      const roleConditions = [];
      intent.roles.forEach(role => {
        const expandedRoles = this.expandRoleTerms(role);
        expandedRoles.forEach(expandedRole => {
          roleConditions.push(
            { 'basicProfile.linkedinScrapedData.headline': { $regex: expandedRole, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.experience.title': { $regex: expandedRole, $options: 'i' } },
            { 'enhancedProfile.professionalRole': { $regex: expandedRole, $options: 'i' } }
          );
        });
      });
      if (roleConditions.length > 0) {
        conditions.push({ $or: roleConditions });
      }
    }
    
    // Execute search
    let query = {};
    
    // For must-have requirements, use AND
    if (intent.must_have.length > 0 || conditions.length > 1) {
      query = conditions.length > 0 ? { $and: conditions } : {};
    } else if (conditions.length === 1) {
      query = conditions[0];
    }
    
    // Get more results for better ranking
    let results = await db.collection('users').find(query).limit(50).toArray();
    
    // If no results with strict matching, relax constraints
    if (results.length < 5 && conditions.length > 0) {
      // Try with OR instead
      const relaxedQuery = { $or: conditions.flatMap(c => c.$or || [c]) };
      const additionalResults = await db.collection('users')
        .find(relaxedQuery)
        .limit(30)
        .toArray();
      
      // Merge and deduplicate
      const existingIds = new Set(results.map(r => r._id.toString()));
      additionalResults.forEach(result => {
        if (!existingIds.has(result._id.toString())) {
          results.push(result);
        }
      });
    }
    
    return results;
  }

  // Expand skill terms for better matching
  expandSkillTerms(skill) {
    const expansions = {
      'developer': ['developer', 'development', 'engineer', 'engineering', 'programmer', 'programming', 'coder', 'coding'],
      'web': ['web', 'frontend', 'front-end', 'backend', 'back-end', 'full stack', 'fullstack', 'website', 'web application'],
      'mobile': ['mobile', 'ios', 'android', 'react native', 'flutter', 'app development', 'mobile application'],
      'data': ['data', 'data science', 'data analysis', 'analytics', 'data engineering', 'big data', 'data mining'],
      'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural network', 'nlp'],
      'cloud': ['cloud', 'aws', 'azure', 'gcp', 'google cloud', 'devops', 'kubernetes', 'docker'],
      'design': ['design', 'ui', 'ux', 'user interface', 'user experience', 'graphic design', 'product design'],
      'marketing': ['marketing', 'digital marketing', 'growth', 'seo', 'sem', 'content marketing', 'social media'],
      'sales': ['sales', 'business development', 'bd', 'account management', 'customer success'],
      'finance': ['finance', 'financial', 'accounting', 'investment', 'banking', 'fintech']
    };
    
    const lowerSkill = skill.toLowerCase();
    return expansions[lowerSkill] || [skill];
  }

  // Get location variations
  getLocationVariations(location) {
    const variations = {
      'bangalore': ['bangalore', 'bengaluru', 'blr'],
      'bengaluru': ['bangalore', 'bengaluru', 'blr'],
      'mumbai': ['mumbai', 'bombay'],
      'delhi': ['delhi', 'new delhi', 'ncr', 'gurgaon', 'gurugram', 'noida'],
      'pune': ['pune', 'pne'],
      'hyderabad': ['hyderabad', 'hyd'],
      'chennai': ['chennai', 'madras'],
      'kolkata': ['kolkata', 'calcutta']
    };
    
    const lowerLocation = location.toLowerCase();
    return variations[lowerLocation] || [location];
  }

  // Expand education terms
  expandEducationTerms(edu) {
    const expansions = {
      'iit': ['iit', 'indian institute of technology'],
      'nit': ['nit', 'national institute of technology'],
      'bits': ['bits', 'birla institute'],
      'coep': ['coep', 'college of engineering pune', 'college of engineering, pune'],
      'mit': ['mit', 'manipal institute', 'massachusetts institute'],
      'iiit': ['iiit', 'international institute of information technology'],
      'iim': ['iim', 'indian institute of management']
    };
    
    const lowerEdu = edu.toLowerCase();
    return expansions[lowerEdu] || [edu];
  }

  // Expand role terms
  expandRoleTerms(role) {
    const expansions = {
      'developer': ['developer', 'engineer', 'programmer', 'software engineer', 'sde'],
      'manager': ['manager', 'management', 'lead', 'head'],
      'director': ['director', 'vp', 'vice president', 'avp'],
      'founder': ['founder', 'co-founder', 'cofounder', 'entrepreneur', 'ceo'],
      'designer': ['designer', 'design lead', 'ux designer', 'ui designer'],
      'analyst': ['analyst', 'analysis', 'analytics', 'data analyst'],
      'consultant': ['consultant', 'consulting', 'advisor', 'advisory']
    };
    
    const lowerRole = role.toLowerCase();
    return expansions[lowerRole] || [role];
  }

  // Rank results with AI
  async rankResultsWithAI(results, intent) {
    if (results.length === 0) return [];
    
    // Score each result
    const scoredResults = results.map(user => {
      let score = 0;
      const profile = user.basicProfile?.linkedinScrapedData || {};
      const enhanced = user.enhancedProfile || {};
      
      // Exact name match gets highest score
      if (intent.is_name_search && intent.person_name) {
        const name = (user.basicProfile?.name || enhanced.fullName || '').toLowerCase();
        const searchName = intent.person_name.toLowerCase();
        if (name === searchName) score += 100;
        else if (name.includes(searchName)) score += 50;
      }
      
      // Skills matching
      if (intent.skills.length > 0) {
        const userSkills = [
          profile.headline || '',
          profile.skills?.join(' ') || '',
          user.basicProfile?.about || '',
          profile.about || '',
          (profile.experience || []).map(e => e.title + ' ' + e.description).join(' ')
        ].join(' ').toLowerCase();
        
        intent.skills.forEach(skill => {
          const expanded = this.expandSkillTerms(skill);
          expanded.forEach(term => {
            if (userSkills.includes(term.toLowerCase())) {
              score += 15;
            }
          });
        });
      }
      
      // Location matching
      if (intent.locations.length > 0) {
        const userLocation = (profile.location || enhanced.city || '').toLowerCase();
        intent.locations.forEach(loc => {
          const variations = this.getLocationVariations(loc);
          variations.forEach(v => {
            if (userLocation.includes(v.toLowerCase())) {
              score += 12;
            }
          });
        });
      }
      
      // Education matching
      if (intent.education.length > 0) {
        const userEducation = [
          ...(profile.education || []).map(e => (e.title || '') + ' ' + (e.school || '')),
          user.basicProfile?.about || '',
          profile.about || ''
        ].join(' ').toLowerCase();
        
        intent.education.forEach(edu => {
          const expanded = this.expandEducationTerms(edu);
          expanded.forEach(term => {
            if (userEducation.includes(term.toLowerCase())) {
              score += 10;
            }
          });
        });
      }
      
      // Company matching
      if (intent.companies.length > 0) {
        const userCompanies = [
          profile.currentCompany || '',
          ...(profile.experience || []).map(e => e.company || '')
        ].join(' ').toLowerCase();
        
        intent.companies.forEach(company => {
          if (userCompanies.includes(company.toLowerCase())) {
            score += 8;
          }
        });
      }
      
      // Role matching
      if (intent.roles.length > 0) {
        const userRoles = [
          profile.headline || '',
          enhanced.professionalRole || '',
          ...(profile.experience || []).map(e => e.title || '')
        ].join(' ').toLowerCase();
        
        intent.roles.forEach(role => {
          const expanded = this.expandRoleTerms(role);
          expanded.forEach(term => {
            if (userRoles.includes(term.toLowerCase())) {
              score += 10;
            }
          });
        });
      }
      
      // Profile completeness bonus
      if (enhanced.completed) score += 5;
      if (profile.headline) score += 3;
      if (profile.about) score += 3;
      if (profile.experience?.length > 0) score += 3;
      if (profile.skills?.length > 0) score += 2;
      if (user.basicProfile?.linkedin) score += 2;
      
      return { ...user, relevanceScore: score };
    });
    
    // Sort by score
    scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return scoredResults;
  }

  // Format intelligent response with AI rewriting
  async formatIntelligentResponse(results, intent, session) {
    if (results.length === 0) {
      return await this.handleNoResults(intent);
    }
    
    // Take top results
    const topResults = results.slice(0, 3);
    session.shownCount = topResults.length;
    
    // Build response header
    let response = `*Found ${results.length} ${this.getMatchDescription(intent, results.length)}*\n\n`;
    
    // Format each profile with AI rewriting
    for (let i = 0; i < topResults.length; i++) {
      const user = topResults[i];
      const profileText = await this.formatProfileWithAI(user, i + 1, intent);
      response += profileText;
      
      if (i < topResults.length - 1) {
        response += '\n' + '─'.repeat(40) + '\n\n';
      }
    }
    
    // Add pagination hint
    if (results.length > 3) {
      response += `\n\n_Type "more" to see ${results.length - 3} additional profiles_`;
    }
    
    return response;
  }

  // Get match description
  getMatchDescription(intent, count) {
    const plural = count === 1 ? 'match' : 'matches';
    
    if (intent.is_name_search) {
      return `profile${count === 1 ? '' : 's'} for "${intent.person_name}"`;
    }
    
    const parts = [];
    if (intent.skills.length > 0) parts.push(intent.skills[0]);
    if (intent.locations.length > 0) parts.push(`in ${intent.locations[0]}`);
    if (intent.education.length > 0) parts.push(`from ${intent.education[0]}`);
    if (intent.companies.length > 0) parts.push(`at ${intent.companies[0]}`);
    if (intent.roles.length > 0) parts.push(intent.roles[0]);
    
    if (parts.length > 0) {
      return `${plural} for ${parts.join(' ')}`;
    }
    
    return `relevant ${plural}`;
  }

  // Format profile with AI rewriting
  async formatProfileWithAI(user, index, intent) {
    const profile = user.basicProfile?.linkedinScrapedData || {};
    const enhanced = user.enhancedProfile || {};
    const name = user.basicProfile?.name || enhanced.fullName || 'Alumni';
    const headline = profile.headline || enhanced.professionalRole || '';
    const about = user.basicProfile?.about || profile.about || '';
    const location = profile.location || enhanced.city || '';
    const company = profile.currentCompany || '';
    const linkedin = user.basicProfile?.linkedin || '';
    
    // Start with name
    let response = `${index}. *${name}*\n`;
    
    // Add match indicators
    const matches = this.getMatchIndicators(user, intent);
    if (matches.length > 0) {
      response += `   _Perfect match: ${matches.join(' • ')}_\n\n`;
    }
    
    // Rewrite headline and about with AI
    if (openai && (headline || about)) {
      try {
        const rewritePrompt = `Rewrite this professional profile to be impressive and engaging for WhatsApp.
        
Name: ${name}
Headline: ${headline}
About: ${about}
Location: ${location}
Company: ${company}

Create a 3-4 line compelling summary that:
1. Highlights their expertise and achievements
2. Shows their impact and value
3. Makes them sound impressive
4. Is conversational and engaging
5. NO bullet points, just flowing text

Write only the summary, nothing else.`;

        const rewritten = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [{ role: 'user', content: rewritePrompt }],
          temperature: 0.7,
          max_tokens: 150
        });
        
        const summary = rewritten.choices[0].message.content.trim();
        response += `   ${summary}\n\n`;
      } catch (error) {
        // Fallback to original
        if (headline) response += `   💼 ${headline}\n`;
        if (about) {
          response += `\n   ${about.substring(0, 200)}${about.length > 200 ? '...' : ''}\n\n`;
        }
      }
    } else {
      // No AI available or no content
      if (headline) response += `   💼 ${headline}\n`;
      if (company) response += `   🏢 ${company}\n`;
      if (location) response += `   📍 ${location}\n`;
    }
    
    // Add experience if relevant
    if (profile.experience && profile.experience.length > 0) {
      const latestExp = profile.experience[0];
      if (latestExp.title && latestExp.company) {
        response += `   💡 ${latestExp.title} at ${latestExp.company}`;
        if (latestExp.duration) {
          response += ` (${latestExp.duration})`;
        }
        response += '\n';
      }
    }
    
    // Add education if it matches search
    if (intent.education.length > 0 && profile.education && profile.education.length > 0) {
      const matchingEdu = profile.education.find(e => {
        const eduText = ((e.title || '') + ' ' + (e.school || '')).toLowerCase();
        return intent.education.some(searchEdu => {
          const expanded = this.expandEducationTerms(searchEdu);
          return expanded.some(term => eduText.includes(term.toLowerCase()));
        });
      });
      
      if (matchingEdu) {
        response += `   🎓 ${matchingEdu.title || matchingEdu.school}\n`;
      }
    }
    
    // Add LinkedIn
    if (linkedin) {
      response += `\n   🔗 *Connect:* ${linkedin}\n`;
    }
    
    return response;
  }

  // Get match indicators
  getMatchIndicators(user, intent) {
    const matches = [];
    const profile = user.basicProfile?.linkedinScrapedData || {};
    const enhanced = user.enhancedProfile || {};
    
    // Skills match
    if (intent.skills.length > 0) {
      const userSkills = [
        profile.headline || '',
        user.basicProfile?.about || '',
        profile.about || ''
      ].join(' ').toLowerCase();
      
      const matchedSkills = intent.skills.filter(skill => {
        const expanded = this.expandSkillTerms(skill);
        return expanded.some(term => userSkills.includes(term.toLowerCase()));
      });
      
      if (matchedSkills.length > 0) {
        matches.push(`✅ ${matchedSkills.join(', ')}`);
      }
    }
    
    // Location match
    if (intent.locations.length > 0) {
      const userLocation = (profile.location || enhanced.city || '').toLowerCase();
      const matchedLocation = intent.locations.find(loc => {
        const variations = this.getLocationVariations(loc);
        return variations.some(v => userLocation.includes(v.toLowerCase()));
      });
      
      if (matchedLocation) {
        matches.push(`📍 ${profile.location || enhanced.city}`);
      }
    }
    
    // Education match
    if (intent.education.length > 0 && profile.education) {
      const userEducation = profile.education.map(e => 
        ((e.title || '') + ' ' + (e.school || '')).toLowerCase()
      ).join(' ');
      
      const matchedEdu = intent.education.find(edu => {
        const expanded = this.expandEducationTerms(edu);
        return expanded.some(term => userEducation.includes(term.toLowerCase()));
      });
      
      if (matchedEdu) {
        matches.push(`🎓 ${matchedEdu.toUpperCase()}`);
      }
    }
    
    // Company match
    if (intent.companies.length > 0) {
      const userCompany = (profile.currentCompany || '').toLowerCase();
      const matchedCompany = intent.companies.find(company => 
        userCompany.includes(company.toLowerCase())
      );
      
      if (matchedCompany) {
        matches.push(`🏢 ${profile.currentCompany}`);
      }
    }
    
    return matches;
  }

  // Handle no results
  async handleNoResults(intent) {
    let message = `*No exact matches found`;
    
    // Describe what wasn't found
    const parts = [];
    if (intent.person_name) {
      parts.push(`for "${intent.person_name}"`);
    } else {
      if (intent.skills.length > 0) parts.push(intent.skills[0]);
      if (intent.locations.length > 0) parts.push(`in ${intent.locations[0]}`);
      if (intent.education.length > 0) parts.push(`from ${intent.education[0]}`);
      if (intent.companies.length > 0) parts.push(`at ${intent.companies[0]}`);
    }
    
    if (parts.length > 0) {
      message += ` ${parts.join(' ')}`;
    }
    message += '*\n\n';
    
    // Get some alternative results
    const db = getDatabase();
    const alternatives = await db.collection('users')
      .find({ 'enhancedProfile.completed': true })
      .limit(3)
      .toArray();
    
    if (alternatives.length > 0) {
      message += 'Here are some other alumni you might find interesting:\n\n';
      
      for (let i = 0; i < alternatives.length; i++) {
        const user = alternatives[i];
        const name = user.basicProfile?.name || user.enhancedProfile?.fullName;
        const headline = user.basicProfile?.linkedinScrapedData?.headline || '';
        const location = user.basicProfile?.linkedinScrapedData?.location || '';
        const linkedin = user.basicProfile?.linkedin || '';
        
        message += `${i + 1}. *${name}*\n`;
        if (headline) message += `   ${headline}\n`;
        if (location) message += `   📍 ${location}\n`;
        if (linkedin) message += `   ${linkedin}\n`;
        message += '\n';
      }
    }
    
    message += '💡 *Tip:* Try different search terms or be less specific';
    
    return message;
  }

  // Show more results
  async showMoreResults(session) {
    if (!session.allResults || session.allResults.length === 0) {
      return "No previous search to show more results. Please search first.";
    }
    
    const remaining = session.allResults.length - session.shownCount;
    if (remaining <= 0) {
      return "That's all the results! Try a new search to find different alumni.";
    }
    
    const nextBatch = session.allResults.slice(
      session.shownCount,
      session.shownCount + 3
    );
    
    session.shownCount += nextBatch.length;
    
    let response = `*Showing ${nextBatch.length} more profiles (${remaining - nextBatch.length} remaining)*\n\n`;
    
    for (let i = 0; i < nextBatch.length; i++) {
      const user = nextBatch[i];
      const profileText = await this.formatProfileWithAI(
        user,
        session.shownCount - nextBatch.length + i + 1,
        session.lastIntent || {}
      );
      response += profileText;
      
      if (i < nextBatch.length - 1) {
        response += '\n' + '─'.repeat(40) + '\n\n';
      }
    }
    
    if (remaining - nextBatch.length > 0) {
      response += `\n\n_Type "more" to see remaining ${remaining - nextBatch.length} profiles_`;
    }
    
    return response;
  }

  // Fallback search (when AI fails)
  async fallbackSearch(query) {
    const db = getDatabase();
    
    // Simple keyword search
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const conditions = [];
    
    words.forEach(word => {
      conditions.push(
        { 'basicProfile.name': { $regex: word, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.headline': { $regex: word, $options: 'i' } },
        { 'basicProfile.about': { $regex: word, $options: 'i' } }
      );
    });
    
    const results = await db.collection('users')
      .find({ $or: conditions })
      .limit(5)
      .toArray();
    
    if (results.length === 0) {
      return "I couldn't find any matches. Try different search terms.";
    }
    
    let response = `*Found ${results.length} profiles*\n\n`;
    
    results.forEach((user, i) => {
      const name = user.basicProfile?.name || 'Alumni';
      const headline = user.basicProfile?.linkedinScrapedData?.headline || '';
      const linkedin = user.basicProfile?.linkedin || '';
      
      response += `${i + 1}. *${name}*\n`;
      if (headline) response += `   ${headline}\n`;
      if (linkedin) response += `   ${linkedin}\n`;
      response += '\n';
    });
    
    return response;
  }

  // Session management
  getOrCreateSession(userId) {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        userId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        allResults: [],
        shownCount: 0,
        lastQuery: null,
        lastIntent: null
      });
    }
    
    const session = this.userSessions.get(userId);
    session.lastActivity = Date.now();
    
    // Clean old sessions
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    for (const [id, sess] of this.userSessions.entries()) {
      if (sess.lastActivity < thirtyMinutesAgo) {
        this.userSessions.delete(id);
      }
    }
    
    return session;
  }
}

module.exports = new AIPoweredSearchService();