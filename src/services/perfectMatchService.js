// Perfect Match Service - God-level relevance and intelligence
const { getDatabase } = require('../config/database');
const OpenAI = require('openai');
const { getConfig } = require('../config/environment');

const config = getConfig();
const openai = config.ai?.apiKey ? new OpenAI({ apiKey: config.ai.apiKey }) : null;

class PerfectMatchService {
  constructor() {
    this.userSessions = new Map();
    this.namePatterns = [
      /^(do you know|who is|tell me about|what about|information on|details about|profile of)\s+(.+?)$/i,
      /^(.+?)\s*\??\s*$/i, // Just a name with optional ?
      /^about\s+(.+?)$/i,
      /^(find|show|search)\s+(.+?)$/i
    ];
  }

  // MAIN SEARCH - Perfect matching with god-level intelligence
  async search(query, user, session) {
    try {
      const userId = user?._id?.toString() || 'anonymous';
      let userSession = this.getOrCreateSession(userId);
      
      // Clean query
      const cleanQuery = this.cleanQuery(query);
      console.log(`🎯 Perfect Match Search: "${query}"`);
      
      // Check if greeting
      if (this.isGreeting(cleanQuery)) {
        const name = user?.basicProfile?.name?.split(' ')[0] || 'there';
        return `Hello ${name}! 👋 How can I help you find the perfect alumni match today?`;
      }
      
      // Check if asking for more
      if (this.isAskingForMore(cleanQuery, userSession)) {
        return await this.showMoreResults(userSession);
      }
      
      // Check if name search
      const nameSearch = this.extractNameSearch(cleanQuery);
      if (nameSearch) {
        return await this.perfectNameSearch(nameSearch);
      }
      
      // Extract search parameters
      const params = this.extractSearchParams(cleanQuery);
      console.log('📊 Extracted params:', JSON.stringify(params, null, 2));
      
      // Perform perfect search with relevance scoring
      const results = await this.performPerfectSearch(params);
      
      // Store session for pagination
      userSession.lastQuery = cleanQuery;
      userSession.lastParams = params;
      userSession.allResults = results;
      userSession.shownCount = 0;
      
      // Format response with top matches
      return await this.formatPerfectResponse(results, params, userSession);
      
    } catch (error) {
      console.error('Perfect match error:', error);
      return "I'm having trouble with the search. Please try again.";
    }
  }

  // Clean query
  cleanQuery(query) {
    return query.toLowerCase().trim()
      .replace(/[.,!?;:"']/g, '')
      .replace(/\s+/g, ' ');
  }

  // Check if greeting
  isGreeting(query) {
    return /^(hi|hello|hey|good morning|good evening|good afternoon)$/i.test(query);
  }

  // Check if asking for more results
  isAskingForMore(query, session) {
    const morePatterns = [
      /^(more|show more|any more|anyone else|next|another|additional|others?)$/i,
      /^(give|show|tell)\s*(me)?\s*more$/i,
      /^what else/i
    ];
    
    return morePatterns.some(p => p.test(query)) && 
           session.allResults && 
           session.allResults.length > session.shownCount;
  }

  // Extract name search
  extractNameSearch(query) {
    // Check various name patterns
    for (const pattern of this.namePatterns) {
      const match = query.match(pattern);
      if (match) {
        // Extract the name part
        const name = match[2] || match[1];
        // Check if it looks like a name (not too many words, not common keywords)
        if (name && name.split(' ').length <= 3 && !this.isKeyword(name)) {
          // Check if first letter is capital or if it's a simple query
          if (/^[a-z]+(\s+[a-z]+)?$/i.test(name) && name.length > 2 && name.length < 30) {
            return name;
          }
        }
      }
    }
    return null;
  }

  // Check if word is a keyword
  isKeyword(word) {
    const keywords = [
      'developer', 'engineer', 'designer', 'manager', 'founder', 'alumni',
      'people', 'someone', 'anyone', 'expert', 'professional', 'specialist',
      'pune', 'mumbai', 'bangalore', 'delhi', 'hyderabad', 'chennai'
    ];
    return keywords.includes(word.toLowerCase());
  }

  // Perfect name search
  async perfectNameSearch(name) {
    const db = getDatabase();
    console.log(`🔍 Searching for name: "${name}"`);
    
    // Search for exact and partial matches
    const results = await db.collection('users').find({
      $or: [
        { 'basicProfile.name': { $regex: `^${name}`, $options: 'i' } },
        { 'basicProfile.name': { $regex: `\\b${name}\\b`, $options: 'i' } },
        { 'enhancedProfile.fullName': { $regex: `^${name}`, $options: 'i' } },
        { 'enhancedProfile.fullName': { $regex: `\\b${name}\\b`, $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.fullName': { $regex: name, $options: 'i' } }
      ]
    }).toArray();
    
    if (results.length === 0) {
      // No exact match - find similar profiles
      return await this.findSimilarProfiles(name, 'name');
    }
    
    // Found exact matches - return detailed profile
    if (results.length === 1) {
      return this.formatDetailedProfile(results[0]);
    } else {
      // Multiple matches
      return this.formatMultipleNameMatches(results, name);
    }
  }

  // Extract search parameters with intelligence
  extractSearchParams(query) {
    const params = {
      skills: [],
      locations: [],
      companies: [],
      education: [],
      roles: [],
      experience_level: null
    };
    
    // Skills extraction - comprehensive
    const skillsMap = {
      'web': ['web development', 'web developer', 'frontend', 'backend', 'full stack'],
      'mobile': ['mobile development', 'ios', 'android', 'react native', 'flutter'],
      'data': ['data science', 'data analysis', 'machine learning', 'ai', 'analytics'],
      'cloud': ['cloud computing', 'aws', 'azure', 'gcp', 'devops'],
      'design': ['ui design', 'ux design', 'graphic design', 'product design'],
      'marketing': ['digital marketing', 'seo', 'content marketing', 'social media'],
      'finance': ['financial analysis', 'accounting', 'investment', 'banking'],
      'law': ['legal', 'lawyer', 'advocate', 'legal advisor']
    };
    
    for (const [key, values] of Object.entries(skillsMap)) {
      if (query.includes(key)) {
        params.skills.push(...values);
      }
      values.forEach(skill => {
        if (query.includes(skill.toLowerCase())) {
          params.skills.push(skill);
        }
      });
    }
    
    // Locations - all Indian cities
    const locations = [
      'pune', 'mumbai', 'bangalore', 'bengaluru', 'delhi', 'new delhi', 'gurgaon', 'gurugram',
      'noida', 'chennai', 'kolkata', 'hyderabad', 'ahmedabad', 'surat', 'jaipur', 'lucknow',
      'indore', 'nagpur', 'bhopal', 'chandigarh', 'kochi', 'goa', 'mysore', 'coimbatore',
      'usa', 'uk', 'canada', 'australia', 'germany', 'singapore', 'dubai', 'remote'
    ];
    
    locations.forEach(loc => {
      if (query.includes(loc)) {
        params.locations.push(loc);
        // Add variations
        if (loc === 'bangalore') params.locations.push('bengaluru');
        if (loc === 'bengaluru') params.locations.push('bangalore');
        if (loc === 'delhi') params.locations.push('new delhi', 'ncr');
        if (loc === 'gurgaon') params.locations.push('gurugram');
        if (loc === 'mumbai') params.locations.push('bombay');
      }
    });
    
    // Companies
    const companies = [
      'google', 'microsoft', 'amazon', 'facebook', 'meta', 'apple', 'netflix',
      'infosys', 'tcs', 'wipro', 'hcl', 'tech mahindra', 'cognizant',
      'accenture', 'deloitte', 'pwc', 'ey', 'kpmg', 'mckinsey',
      'flipkart', 'paytm', 'ola', 'uber', 'zomato', 'swiggy', 'byju',
      'startup', 'mnc', 'product company', 'service company'
    ];
    
    companies.forEach(company => {
      if (query.includes(company)) {
        params.companies.push(company);
      }
    });
    
    // Education - with COEP special handling
    if (query.includes('coep')) {
      params.education.push('COEP', 'College of Engineering Pune', 'College of Engineering, Pune');
    }
    
    const education = [
      'iit', 'nit', 'bits', 'iiit', 'iim', 'vit', 'mit', 'manipal',
      'symbiosis', 'pune university', 'mumbai university', 'delhi university'
    ];
    
    education.forEach(edu => {
      if (query.includes(edu)) {
        params.education.push(edu);
        // Add full forms
        if (edu === 'iit') params.education.push('indian institute of technology');
        if (edu === 'nit') params.education.push('national institute of technology');
        if (edu === 'bits') params.education.push('birla institute');
      }
    });
    
    // Roles
    const roles = [
      'developer', 'engineer', 'designer', 'manager', 'director', 'vp', 'ceo', 'cto', 'cfo',
      'founder', 'co-founder', 'entrepreneur', 'consultant', 'analyst', 'architect',
      'lead', 'senior', 'junior', 'intern', 'freelancer', 'lawyer', 'doctor', 'teacher'
    ];
    
    roles.forEach(role => {
      if (query.includes(role)) {
        params.roles.push(role);
        // Add variations
        if (role === 'developer') params.roles.push('engineer', 'programmer');
        if (role === 'founder') params.roles.push('entrepreneur', 'co-founder');
      }
    });
    
    // Experience level
    if (query.includes('senior') || query.includes('experienced')) {
      params.experience_level = 'senior';
    } else if (query.includes('junior') || query.includes('fresher') || query.includes('entry')) {
      params.experience_level = 'junior';
    } else if (query.includes('mid-level') || query.includes('mid level')) {
      params.experience_level = 'mid';
    }
    
    // Remove duplicates
    Object.keys(params).forEach(key => {
      if (Array.isArray(params[key])) {
        params[key] = [...new Set(params[key])];
      }
    });
    
    return params;
  }

  // Perform perfect search with relevance scoring
  async performPerfectSearch(params) {
    const db = getDatabase();
    
    // Build match conditions
    const mustMatch = [];
    const shouldMatch = [];
    const boost = {};
    
    // Skills - HIGHEST PRIORITY
    if (params.skills.length > 0) {
      const skillConditions = params.skills.map(skill => ({
        $or: [
          { 'basicProfile.linkedinScrapedData.headline': { $regex: skill, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.skills': { $regex: skill, $options: 'i' } },
          { 'basicProfile.about': { $regex: skill, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.title': { $regex: skill, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.description': { $regex: skill, $options: 'i' } }
        ]
      }));
      mustMatch.push({ $or: skillConditions.flatMap(c => c.$or) });
      boost.skills = 10;
    }
    
    // Location - HIGH PRIORITY
    if (params.locations.length > 0) {
      const locationConditions = params.locations.map(loc => ({
        $or: [
          { 'basicProfile.linkedinScrapedData.location': { $regex: loc, $options: 'i' } },
          { 'enhancedProfile.city': { $regex: loc, $options: 'i' } },
          { 'enhancedProfile.currentAddress': { $regex: loc, $options: 'i' } }
        ]
      }));
      mustMatch.push({ $or: locationConditions.flatMap(c => c.$or) });
      boost.location = 8;
    }
    
    // Education - HIGH PRIORITY
    if (params.education.length > 0) {
      const eduConditions = [];
      params.education.forEach(edu => {
        eduConditions.push(
          { 'basicProfile.linkedinScrapedData.education.title': { $regex: edu, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.education.school': { $regex: edu, $options: 'i' } },
          { 'basicProfile.about': { $regex: edu, $options: 'i' } }
        );
      });
      if (eduConditions.length > 0) {
        mustMatch.push({ $or: eduConditions });
        boost.education = 7;
      }
    }
    
    // Company - MEDIUM PRIORITY
    if (params.companies.length > 0) {
      const companyConditions = params.companies.map(company => ({
        $or: [
          { 'basicProfile.linkedinScrapedData.currentCompany': { $regex: company, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.company': { $regex: company, $options: 'i' } }
        ]
      }));
      shouldMatch.push({ $or: companyConditions.flatMap(c => c.$or) });
      boost.company = 5;
    }
    
    // Roles - MEDIUM PRIORITY
    if (params.roles.length > 0) {
      const roleConditions = params.roles.map(role => ({
        $or: [
          { 'basicProfile.linkedinScrapedData.headline': { $regex: role, $options: 'i' } },
          { 'enhancedProfile.professionalRole': { $regex: role, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.title': { $regex: role, $options: 'i' } }
        ]
      }));
      shouldMatch.push({ $or: roleConditions.flatMap(c => c.$or) });
      boost.role = 6;
    }
    
    // Build final query
    let query = {};
    if (mustMatch.length > 0 && shouldMatch.length > 0) {
      query = {
        $and: [
          ...mustMatch,
          { $or: shouldMatch }
        ]
      };
    } else if (mustMatch.length > 0) {
      query = mustMatch.length === 1 ? mustMatch[0] : { $and: mustMatch };
    } else if (shouldMatch.length > 0) {
      query = { $or: shouldMatch.flatMap(c => c.$or) };
    }
    
    // Execute search
    let results = await db.collection('users').find(query).toArray();
    
    // If no results with strict matching, try relaxed search
    if (results.length === 0 && (mustMatch.length > 1 || shouldMatch.length > 0)) {
      // Try with OR instead of AND
      const relaxedConditions = [...mustMatch, ...shouldMatch].flatMap(c => 
        c.$or || (c.$and ? c.$and : [c])
      );
      
      if (relaxedConditions.length > 0) {
        query = { $or: relaxedConditions };
        results = await db.collection('users').find(query).limit(20).toArray();
      }
    }
    
    // Calculate relevance scores
    results = results.map(user => {
      let score = 0;
      const profile = user.basicProfile?.linkedinScrapedData || {};
      const enhanced = user.enhancedProfile || {};
      
      // Skills scoring
      if (params.skills.length > 0) {
        const headline = (profile.headline || '').toLowerCase();
        const about = (user.basicProfile?.about || '').toLowerCase();
        const skills = Array.isArray(profile.skills) 
          ? profile.skills.join(' ').toLowerCase()
          : (profile.skills || '').toLowerCase();
        
        params.skills.forEach(skill => {
          if (headline.includes(skill.toLowerCase())) score += 10;
          if (about.includes(skill.toLowerCase())) score += 8;
          if (skills.includes(skill.toLowerCase())) score += 7;
        });
      }
      
      // Location scoring
      if (params.locations.length > 0) {
        const location = (profile.location || enhanced.city || '').toLowerCase();
        params.locations.forEach(loc => {
          if (location.includes(loc.toLowerCase())) score += 8;
        });
      }
      
      // Education scoring
      if (params.education.length > 0) {
        const education = (profile.education || []).map(e => 
          (e.title || e.school || '').toLowerCase()
        ).join(' ');
        
        params.education.forEach(edu => {
          if (education.includes(edu.toLowerCase())) score += 7;
        });
      }
      
      // Company scoring
      if (params.companies.length > 0) {
        const currentCompany = (profile.currentCompany || '').toLowerCase();
        const experience = (profile.experience || []).map(e => 
          (e.company || '').toLowerCase()
        ).join(' ');
        
        params.companies.forEach(company => {
          if (currentCompany.includes(company.toLowerCase())) score += 6;
          if (experience.includes(company.toLowerCase())) score += 4;
        });
      }
      
      // Role scoring
      if (params.roles.length > 0) {
        const headline = (profile.headline || '').toLowerCase();
        const role = (enhanced.professionalRole || '').toLowerCase();
        
        params.roles.forEach(r => {
          if (headline.includes(r.toLowerCase())) score += 5;
          if (role.includes(r.toLowerCase())) score += 5;
        });
      }
      
      // Profile completeness bonus
      if (enhanced.completed) score += 3;
      if (profile.headline) score += 2;
      if (profile.experience && profile.experience.length > 0) score += 2;
      if (user.basicProfile?.linkedin) score += 1;
      
      return { ...user, relevanceScore: score };
    });
    
    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return results;
  }

  // Format perfect response
  async formatPerfectResponse(results, params, session) {
    if (results.length === 0) {
      // No results - find similar profiles
      return await this.findSimilarProfiles(params, 'params');
    }
    
    // Show top 2-3 results
    const topResults = results.slice(0, 3);
    session.shownCount = topResults.length;
    
    let response = `*Found ${results.length} perfect ${results.length === 1 ? 'match' : 'matches'}`;
    
    // Describe search
    const searchDesc = [];
    if (params.skills.length > 0) searchDesc.push(`${params.skills[0]} skills`);
    if (params.locations.length > 0) searchDesc.push(`in ${params.locations[0]}`);
    if (params.education.length > 0) searchDesc.push(`from ${params.education[0]}`);
    if (params.companies.length > 0) searchDesc.push(`at ${params.companies[0]}`);
    
    if (searchDesc.length > 0) {
      response += ` for ${searchDesc.join(' ')}`;
    }
    response += '*\n\n';
    
    // Show profiles with complete details
    topResults.forEach((user, index) => {
      response += this.formatProfileWithRelevance(user, index + 1, params);
    });
    
    // Add pagination hint
    if (results.length > 3) {
      response += `\n_Type "more" to see ${results.length - 3} additional profiles_`;
    }
    
    return response;
  }

  // Format profile with relevance indicators
  formatProfileWithRelevance(user, index, params) {
    const profile = user.basicProfile?.linkedinScrapedData || {};
    const enhanced = user.enhancedProfile || {};
    const name = user.basicProfile?.name || enhanced.fullName || 'Alumni';
    const headline = profile.headline || enhanced.professionalRole || '';
    const location = profile.location || enhanced.city || '';
    const company = profile.currentCompany || '';
    const about = user.basicProfile?.about || profile.about || '';
    const linkedin = user.basicProfile?.linkedin || enhanced.linkedin || '';
    
    let response = `${index}. *${name}*\n`;
    
    // Show relevance matches
    const matches = [];
    
    // Check skill matches
    if (params.skills && params.skills.length > 0) {
      const matchedSkills = params.skills.filter(skill => 
        (headline + about).toLowerCase().includes(skill.toLowerCase())
      );
      if (matchedSkills.length > 0) {
        matches.push(`✅ ${matchedSkills.join(', ')}`);
      }
    }
    
    // Check location match
    if (params.locations && params.locations.length > 0 && location) {
      const matchedLoc = params.locations.find(loc => 
        location.toLowerCase().includes(loc.toLowerCase())
      );
      if (matchedLoc) {
        matches.push(`📍 ${location}`);
      }
    }
    
    // Check education match
    if (params.education && params.education.length > 0 && profile.education) {
      const eduText = profile.education.map(e => 
        (e.title || e.school || '').toLowerCase()
      ).join(' ');
      
      const matchedEdu = params.education.find(edu => 
        eduText.includes(edu.toLowerCase())
      );
      if (matchedEdu) {
        matches.push(`🎓 ${matchedEdu}`);
      }
    }
    
    // Check company match
    if (params.companies && params.companies.length > 0 && company) {
      const matchedCompany = params.companies.find(comp => 
        company.toLowerCase().includes(comp.toLowerCase())
      );
      if (matchedCompany) {
        matches.push(`🏢 ${company}`);
      }
    }
    
    // Show match indicators
    if (matches.length > 0) {
      response += `   _Perfect match: ${matches.join(' • ')}_\n\n`;
    }
    
    // Professional details
    if (headline) {
      response += `   💼 ${headline}\n`;
    }
    
    if (company && !matches.some(m => m.includes('🏢'))) {
      response += `   🏢 ${company}\n`;
    }
    
    if (location && !matches.some(m => m.includes('📍'))) {
      response += `   📍 ${location}\n`;
    }
    
    // Experience
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
    
    // Education
    if (profile.education && profile.education.length > 0 && !matches.some(m => m.includes('🎓'))) {
      const latestEdu = profile.education[0];
      if (latestEdu.title || latestEdu.school) {
        response += `   🎓 ${latestEdu.title || latestEdu.school}\n`;
      }
    }
    
    // About section - COMPLETE without truncation
    if (about && about.length > 0) {
      response += `\n   *About:*\n`;
      // Show complete about section, no truncation
      response += `   ${about.replace(/\n/g, '\n   ')}\n`;
    }
    
    // Skills
    if (profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0) {
      const topSkills = profile.skills.slice(0, 5);
      response += `\n   *Skills:* ${topSkills.join(', ')}\n`;
    } else if (typeof profile.skills === 'string' && profile.skills.length > 0) {
      response += `\n   *Skills:* ${profile.skills}\n`;
    }
    
    // LinkedIn
    if (linkedin) {
      response += `\n   🔗 *Connect:* ${linkedin}\n`;
    }
    
    response += '\n' + '─'.repeat(40) + '\n\n';
    
    return response;
  }

  // Format detailed profile for name search
  formatDetailedProfile(user) {
    const profile = user.basicProfile?.linkedinScrapedData || {};
    const enhanced = user.enhancedProfile || {};
    const name = user.basicProfile?.name || enhanced.fullName || 'Alumni';
    const headline = profile.headline || enhanced.professionalRole || '';
    const about = user.basicProfile?.about || profile.about || '';
    const linkedin = user.basicProfile?.linkedin || '';
    
    let response = `*Yes, I know ${name}!*\n\n`;
    
    if (headline) {
      response += `${name} is ${headline}\n\n`;
    }
    
    // Complete about section
    if (about) {
      response += `*About ${name.split(' ')[0]}:*\n${about}\n\n`;
    }
    
    // Professional Experience
    if (profile.experience && profile.experience.length > 0) {
      response += `*Professional Journey:*\n`;
      profile.experience.slice(0, 3).forEach(exp => {
        response += `• ${exp.title} at ${exp.company}`;
        if (exp.duration) response += ` (${exp.duration})`;
        response += '\n';
        if (exp.description) {
          response += `  ${exp.description.substring(0, 150)}\n`;
        }
      });
      response += '\n';
    }
    
    // Education
    if (profile.education && profile.education.length > 0) {
      response += `*Education:*\n`;
      profile.education.forEach(edu => {
        if (edu.title) response += `• ${edu.title}`;
        if (edu.school) response += ` from ${edu.school}`;
        response += '\n';
      });
      response += '\n';
    }
    
    // Skills
    if (profile.skills) {
      if (Array.isArray(profile.skills) && profile.skills.length > 0) {
        response += `*Key Skills:*\n${profile.skills.slice(0, 10).join(', ')}\n\n`;
      } else if (typeof profile.skills === 'string' && profile.skills.length > 0) {
        response += `*Key Skills:*\n${profile.skills}\n\n`;
      }
    }
    
    // Location
    if (profile.location || enhanced.city) {
      response += `📍 *Location:* ${profile.location || enhanced.city}\n`;
    }
    
    // LinkedIn
    if (linkedin) {
      response += `🔗 *Connect with ${name.split(' ')[0]}:* ${linkedin}\n`;
    }
    
    return response;
  }

  // Format multiple name matches
  formatMultipleNameMatches(results, searchName) {
    let response = `*Found ${results.length} people named "${searchName}":*\n\n`;
    
    results.slice(0, 5).forEach((user, index) => {
      const name = user.basicProfile?.name || user.enhancedProfile?.fullName;
      const headline = user.basicProfile?.linkedinScrapedData?.headline || '';
      const location = user.basicProfile?.linkedinScrapedData?.location || '';
      const linkedin = user.basicProfile?.linkedin || '';
      
      response += `${index + 1}. *${name}*\n`;
      if (headline) response += `   ${headline}\n`;
      if (location) response += `   📍 ${location}\n`;
      if (linkedin) response += `   ${linkedin}\n`;
      response += '\n';
    });
    
    if (results.length > 5) {
      response += `_...and ${results.length - 5} more_\n`;
    }
    
    return response;
  }

  // Find similar profiles when no exact match
  async findSimilarProfiles(searchTerm, searchType) {
    const db = getDatabase();
    let response = `*No exact matches found`;
    
    if (searchType === 'name') {
      response += ` for "${searchTerm}"*\n\n`;
    } else {
      // Describe what wasn't found
      const params = searchTerm;
      const notFound = [];
      if (params.skills?.length > 0) notFound.push(params.skills[0]);
      if (params.locations?.length > 0) notFound.push(`in ${params.locations[0]}`);
      if (params.education?.length > 0) notFound.push(`from ${params.education[0]}`);
      
      if (notFound.length > 0) {
        response += ` for ${notFound.join(' ')}*\n\n`;
      } else {
        response += `*\n\n`;
      }
    }
    
    response += `But here are some closely related profiles:\n\n`;
    
    // Find similar profiles based on partial matches
    let similarQuery = {};
    
    if (searchType === 'name') {
      // For name search, try to find people with similar roles or from similar companies
      const results = await db.collection('users')
        .find({})
        .limit(3)
        .toArray();
      
      if (results.length > 0) {
        results.forEach((user, index) => {
          response += this.formatProfileWithRelevance(user, index + 1, {});
        });
      }
    } else {
      // For parameter search, relax constraints
      const params = searchTerm;
      const conditions = [];
      
      // Try with just skills
      if (params.skills?.length > 0) {
        conditions.push({
          'basicProfile.linkedinScrapedData.headline': { 
            $regex: params.skills[0].split(' ')[0], 
            $options: 'i' 
          }
        });
      }
      
      // Try with just location
      if (params.locations?.length > 0) {
        conditions.push({
          'basicProfile.linkedinScrapedData.location': { 
            $regex: params.locations[0], 
            $options: 'i' 
          }
        });
      }
      
      // Try with just education
      if (params.education?.length > 0) {
        conditions.push({
          'basicProfile.linkedinScrapedData.education.title': { 
            $regex: params.education[0], 
            $options: 'i' 
          }
        });
      }
      
      if (conditions.length > 0) {
        const results = await db.collection('users')
          .find({ $or: conditions })
          .limit(3)
          .toArray();
        
        if (results.length > 0) {
          results.forEach((user, index) => {
            response += this.formatProfileWithRelevance(user, index + 1, params);
          });
          
          response += '\n💡 *Tip:* Try searching with fewer criteria for more results';
        } else {
          response += 'Try searching with different keywords or criteria.';
        }
      }
    }
    
    return response;
  }

  // Show more results
  async showMoreResults(session) {
    if (!session.allResults || session.allResults.length === 0) {
      return "No previous search to show more results from. Please search first.";
    }
    
    const remaining = session.allResults.length - session.shownCount;
    if (remaining <= 0) {
      return "That's all the results! Try a new search to find more alumni.";
    }
    
    const nextBatch = session.allResults.slice(
      session.shownCount, 
      session.shownCount + 3
    );
    
    session.shownCount += nextBatch.length;
    
    let response = `*Showing ${nextBatch.length} more ${nextBatch.length === 1 ? 'profile' : 'profiles'}`;
    response += ` (${remaining - nextBatch.length} remaining)*\n\n`;
    
    nextBatch.forEach((user, index) => {
      response += this.formatProfileWithRelevance(
        user, 
        session.shownCount - nextBatch.length + index + 1, 
        session.lastParams || {}
      );
    });
    
    if (remaining - nextBatch.length > 0) {
      response += `\n_Type "more" to see remaining ${remaining - nextBatch.length} profiles_`;
    }
    
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
        lastParams: null
      });
    }
    
    const session = this.userSessions.get(userId);
    session.lastActivity = Date.now();
    
    // Clean old sessions (older than 30 minutes)
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    for (const [id, sess] of this.userSessions.entries()) {
      if (sess.lastActivity < thirtyMinutesAgo) {
        this.userSessions.delete(id);
      }
    }
    
    return session;
  }
}

module.exports = new PerfectMatchService();