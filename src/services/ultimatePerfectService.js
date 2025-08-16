// Ultimate Perfect Service - God-level accuracy with ALL requirements
const { getDatabase } = require('../config/database');
const OpenAI = require('openai');
const { getConfig } = require('../config/environment');

const config = getConfig();
const openai = config.ai?.apiKey ? new OpenAI({ apiKey: config.ai.apiKey }) : null;

class UltimatePerfectService {
  constructor() {
    this.userSessions = new Map();
    this.skillExpansions = {
      'developer': ['developer', 'development', 'engineer', 'programming', 'programmer', 'coder', 'software'],
      'web': ['web', 'frontend', 'front-end', 'backend', 'back-end', 'full stack', 'fullstack', 'react', 'node', 'javascript'],
      'mobile': ['mobile', 'ios', 'android', 'react native', 'flutter', 'app'],
      'data': ['data', 'data science', 'data analysis', 'analytics', 'machine learning', 'ml', 'ai'],
      'marketing': ['marketing', 'digital marketing', 'growth', 'seo', 'content', 'social media'],
      'design': ['design', 'ui', 'ux', 'user interface', 'user experience', 'graphic'],
      'lawyer': ['lawyer', 'legal', 'advocate', 'law', 'attorney'],
      'doctor': ['doctor', 'medical', 'physician', 'healthcare', 'medicine'],
      'finance': ['finance', 'financial', 'accounting', 'investment', 'banking']
    };
  }

  // MAIN SEARCH - Ultimate perfect implementation
  async search(query, user, session) {
    try {
      const userId = user?._id?.toString() || 'anonymous';
      let userSession = this.getOrCreateSession(userId);
      
      console.log(`🎯 Ultimate Perfect Search: "${query}"`);
      
      // Handle simple greetings
      if (this.isGreeting(query)) {
        const name = user?.basicProfile?.name?.split(' ')[0] || 'there';
        return `Hello ${name}! 👋 How can I help you find the perfect alumni match today?`;
      }
      
      // Handle "more" requests
      if (this.isAskingForMore(query, userSession)) {
        return await this.showMoreRelevantResults(userSession);
      }
      
      // Handle self-awareness
      if (this.isSelfQuery(query)) {
        return await this.showOwnProfile(user);
      }
      
      // STEP 1: Understand intent with AI
      const intent = await this.understandWithAI(query, userSession);
      console.log('🧠 AI Understanding:', JSON.stringify(intent, null, 2));
      
      // STEP 2: Deep search with verification
      const searchResults = await this.deepSearchWithVerification(intent);
      console.log(`📊 Found ${searchResults.length} VERIFIED matches`);
      
      // STEP 3: Rank by ACTUAL relevance
      const rankedResults = this.rankByRelevance(searchResults, intent);
      
      // STEP 4: VERIFY profiles actually match
      const verifiedResults = this.verifyRelevance(rankedResults, intent);
      
      // Store for pagination
      userSession.lastQuery = query;
      userSession.lastIntent = intent;
      userSession.verifiedResults = verifiedResults;
      userSession.shownCount = 0;
      
      // STEP 5: Format with PERFECT structure
      return await this.formatPerfectResponse(verifiedResults, intent, userSession);
      
    } catch (error) {
      console.error('Ultimate search error:', error);
      return "Let me search for that... Please try again.";
    }
  }

  // Check if greeting
  isGreeting(query) {
    return /^(hi|hello|hey|good morning|good evening|good afternoon)$/i.test(query.trim());
  }

  // Check if asking for more
  isAskingForMore(query, session) {
    return /^(more|show more|any more|anyone else|next|another)$/i.test(query.trim()) && 
           session.verifiedResults && 
           session.verifiedResults.length > session.shownCount;
  }

  // Check if self query
  isSelfQuery(query) {
    return /about me|my profile|who am i|myself|my info/i.test(query);
  }

  // Show own profile
  async showOwnProfile(user) {
    if (!user?.basicProfile?.name) {
      return "Please complete your profile first to see your information.";
    }
    
    const name = user.basicProfile.name;
    const headline = user.basicProfile?.linkedinScrapedData?.headline || user.enhancedProfile?.professionalRole || '';
    const about = user.basicProfile?.about || '';
    
    let response = `*Your Profile*\n\n`;
    response += `*${name}*\n\n`;
    if (headline) response += `💼 ${headline}\n\n`;
    if (about) response += `${about}\n\n`;
    response += `Keep building your amazing journey! 🚀`;
    
    return response;
  }

  // Understand with AI
  async understandWithAI(query, session) {
    if (!openai) {
      return this.basicUnderstanding(query);
    }
    
    try {
      const systemPrompt = `You are an expert at understanding alumni search queries.
      
Extract from the query:
1. search_type: "name" | "skill" | "location" | "education" | "company" | "role" | "combination"
2. is_name_search: true if searching for specific person
3. person_name: full name if searching for person
4. skills: array of skills/technologies
5. locations: array of cities
6. education: array of colleges/universities
7. companies: array of companies
8. roles: array of job roles
9. keywords: other important keywords

Previous context: ${session.lastQuery || 'none'}

Return JSON only. Be very precise about what the user is actually looking for.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.2,
        max_tokens: 300,
        response_format: { type: "json_object" }
      });
      
      const intent = JSON.parse(response.choices[0].message.content);
      
      // Ensure arrays
      ['skills', 'locations', 'education', 'companies', 'roles', 'keywords'].forEach(field => {
        if (!Array.isArray(intent[field])) {
          intent[field] = intent[field] ? [intent[field]] : [];
        }
      });
      
      return intent;
      
    } catch (error) {
      console.error('AI understanding failed:', error);
      return this.basicUnderstanding(query);
    }
  }

  // Basic understanding fallback
  basicUnderstanding(query) {
    const intent = {
      search_type: 'general',
      is_name_search: false,
      person_name: null,
      skills: [],
      locations: [],
      education: [],
      companies: [],
      roles: [],
      keywords: []
    };
    
    const lowerQuery = query.toLowerCase();
    
    // Check for name search FIRST
    if (/^(do you know about?|who is|tell me about|find|profile of)\s+(.+)$/i.test(query)) {
      const match = query.match(/^(?:do you know about?|who is|tell me about|find|profile of)\s+(.+)$/i);
      if (match) {
        intent.is_name_search = true;
        intent.person_name = match[1].trim();
        intent.search_type = 'name';
        return intent;
      }
    }
    
    // Extract skills
    Object.keys(this.skillExpansions).forEach(skill => {
      if (lowerQuery.includes(skill)) {
        intent.skills.push(skill);
      }
    });
    
    // Extract locations with word boundaries
    const locations = ['pune', 'mumbai', 'bangalore', 'delhi', 'hyderabad', 'chennai', 'kolkata'];
    locations.forEach(loc => {
      const regex = new RegExp(`\\b${loc}\\b`, 'i');
      if (regex.test(query)) {
        intent.locations.push(loc);
      }
    });
    
    // Extract education with word boundaries
    const education = ['iit', 'nit', 'bits', 'coep', 'mit', 'iiit'];
    education.forEach(edu => {
      const regex = new RegExp(`\\b${edu}\\b`, 'i');
      if (regex.test(query)) {
        intent.education.push(edu);
      }
    });
    
    // Extract companies
    const companies = ['google', 'microsoft', 'amazon', 'facebook', 'infosys', 'tcs', 'wipro'];
    companies.forEach(company => {
      if (lowerQuery.includes(company)) {
        intent.companies.push(company);
      }
    });
    
    // Extract roles
    const roles = ['developer', 'engineer', 'designer', 'manager', 'founder', 'ceo', 'lawyer', 'doctor'];
    roles.forEach(role => {
      if (lowerQuery.includes(role)) {
        intent.roles.push(role);
      }
    });
    
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

  // Deep search with verification
  async deepSearchWithVerification(intent) {
    const db = getDatabase();
    
    // Name search
    if (intent.is_name_search && intent.person_name) {
      const nameWords = intent.person_name.split(' ');
      const nameRegex = nameWords.join('.*');
      
      return await db.collection('users').find({
        $or: [
          { 'basicProfile.name': { $regex: nameRegex, $options: 'i' } },
          { 'enhancedProfile.fullName': { $regex: nameRegex, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.fullName': { $regex: nameRegex, $options: 'i' } }
        ]
      }).limit(10).toArray();
    }
    
    // Build comprehensive query
    const conditions = [];
    
    // Skills - search EVERYWHERE with expansions
    if (intent.skills.length > 0) {
      const skillConditions = [];
      intent.skills.forEach(skill => {
        const expansions = this.skillExpansions[skill] || [skill];
        expansions.forEach(expanded => {
          skillConditions.push(
            { 'basicProfile.linkedinScrapedData.headline': { $regex: expanded, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.skills': { $regex: expanded, $options: 'i' } },
            { 'basicProfile.about': { $regex: expanded, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.about': { $regex: expanded, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.experience.title': { $regex: expanded, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.experience.description': { $regex: expanded, $options: 'i' } }
          );
        });
      });
      if (skillConditions.length > 0) {
        conditions.push({ $or: skillConditions });
      }
    }
    
    // Locations with variations
    if (intent.locations.length > 0) {
      const locationConditions = [];
      intent.locations.forEach(location => {
        const variations = this.getLocationVariations(location);
        variations.forEach(loc => {
          locationConditions.push(
            { 'basicProfile.linkedinScrapedData.location': { $regex: loc, $options: 'i' } },
            { 'enhancedProfile.city': { $regex: loc, $options: 'i' } },
            { 'enhancedProfile.currentAddress': { $regex: loc, $options: 'i' } }
          );
        });
      });
      if (locationConditions.length > 0) {
        conditions.push({ $or: locationConditions });
      }
    }
    
    // Education with expansions
    if (intent.education.length > 0) {
      const eduConditions = [];
      intent.education.forEach(edu => {
        const expansions = this.getEducationExpansions(edu);
        expansions.forEach(expanded => {
          eduConditions.push(
            { 'basicProfile.linkedinScrapedData.education.title': { $regex: expanded, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.education.school': { $regex: expanded, $options: 'i' } },
            { 'basicProfile.about': { $regex: expanded, $options: 'i' } }
          );
        });
      });
      if (eduConditions.length > 0) {
        conditions.push({ $or: eduConditions });
      }
    }
    
    // Companies
    if (intent.companies.length > 0) {
      const companyConditions = [];
      intent.companies.forEach(company => {
        companyConditions.push(
          { 'basicProfile.linkedinScrapedData.currentCompany': { $regex: company, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.company': { $regex: company, $options: 'i' } }
        );
      });
      if (companyConditions.length > 0) {
        conditions.push({ $or: companyConditions });
      }
    }
    
    // Roles
    if (intent.roles.length > 0) {
      const roleConditions = [];
      intent.roles.forEach(role => {
        roleConditions.push(
          { 'basicProfile.linkedinScrapedData.headline': { $regex: role, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.title': { $regex: role, $options: 'i' } },
          { 'enhancedProfile.professionalRole': { $regex: role, $options: 'i' } }
        );
      });
      if (roleConditions.length > 0) {
        conditions.push({ $or: roleConditions });
      }
    }
    
    // Execute search
    let query = {};
    if (conditions.length > 1) {
      query = { $and: conditions };
    } else if (conditions.length === 1) {
      query = conditions[0];
    }
    
    // Get results
    let results = await db.collection('users').find(query).limit(50).toArray();
    
    // If too few results, relax constraints
    if (results.length < 5 && conditions.length > 1) {
      const relaxedQuery = { $or: conditions.flatMap(c => c.$or || [c]) };
      const moreResults = await db.collection('users').find(relaxedQuery).limit(30).toArray();
      
      // Merge unique results
      const existingIds = new Set(results.map(r => r._id.toString()));
      moreResults.forEach(result => {
        if (!existingIds.has(result._id.toString())) {
          results.push(result);
        }
      });
    }
    
    return results;
  }

  // Get location variations
  getLocationVariations(location) {
    const variations = {
      'bangalore': ['bangalore', 'bengaluru', 'blr'],
      'mumbai': ['mumbai', 'bombay'],
      'delhi': ['delhi', 'new delhi', 'ncr'],
      'pune': ['pune'],
      'hyderabad': ['hyderabad', 'hyd'],
      'chennai': ['chennai', 'madras'],
      'kolkata': ['kolkata', 'calcutta']
    };
    return variations[location.toLowerCase()] || [location];
  }

  // Get education expansions
  getEducationExpansions(edu) {
    const expansions = {
      'iit': ['iit', 'indian institute of technology'],
      'nit': ['nit', 'national institute of technology'],
      'bits': ['bits', 'birla institute'],
      'coep': ['coep', 'college of engineering pune', 'college of engineering, pune'],
      'mit': ['mit', 'manipal institute', 'massachusetts institute'],
      'iiit': ['iiit', 'international institute']
    };
    return expansions[edu.toLowerCase()] || [edu];
  }

  // Rank by relevance
  rankByRelevance(results, intent) {
    return results.map(user => {
      let score = 0;
      const profile = user.basicProfile?.linkedinScrapedData || {};
      const enhanced = user.enhancedProfile || {};
      
      // Name match - highest priority
      if (intent.is_name_search && intent.person_name) {
        const userName = (user.basicProfile?.name || enhanced.fullName || '').toLowerCase();
        const searchName = intent.person_name.toLowerCase();
        if (userName === searchName) score += 100;
        else if (userName.includes(searchName)) score += 50;
      }
      
      // Skills match - very high priority
      if (intent.skills.length > 0) {
        const userContent = [
          profile.headline || '',
          (profile.skills || []).join(' '),
          user.basicProfile?.about || '',
          profile.about || ''
        ].join(' ').toLowerCase();
        
        intent.skills.forEach(skill => {
          const expansions = this.skillExpansions[skill] || [skill];
          expansions.forEach(expanded => {
            if (userContent.includes(expanded.toLowerCase())) {
              score += 20;
            }
          });
        });
      }
      
      // Location match - high priority
      if (intent.locations.length > 0) {
        const userLocation = (profile.location || enhanced.city || '').toLowerCase();
        intent.locations.forEach(loc => {
          const variations = this.getLocationVariations(loc);
          if (variations.some(v => userLocation.includes(v))) {
            score += 15;
          }
        });
      }
      
      // Education match
      if (intent.education.length > 0) {
        const userEducation = [
          ...(profile.education || []).map(e => (e.title || '') + ' ' + (e.school || '')),
          user.basicProfile?.about || ''
        ].join(' ').toLowerCase();
        
        intent.education.forEach(edu => {
          const expansions = this.getEducationExpansions(edu);
          if (expansions.some(e => userEducation.includes(e.toLowerCase()))) {
            score += 12;
          }
        });
      }
      
      // Company match
      if (intent.companies.length > 0) {
        const userCompanies = [
          profile.currentCompany || '',
          ...(profile.experience || []).map(e => e.company || '')
        ].join(' ').toLowerCase();
        
        intent.companies.forEach(company => {
          if (userCompanies.includes(company.toLowerCase())) {
            score += 10;
          }
        });
      }
      
      // Role match
      if (intent.roles.length > 0) {
        const userRoles = [
          profile.headline || '',
          ...(profile.experience || []).map(e => e.title || '')
        ].join(' ').toLowerCase();
        
        intent.roles.forEach(role => {
          if (userRoles.includes(role.toLowerCase())) {
            score += 10;
          }
        });
      }
      
      // Profile completeness
      if (enhanced.completed) score += 5;
      if (profile.headline) score += 3;
      if (profile.about) score += 3;
      if (profile.experience?.length > 0) score += 3;
      if (user.basicProfile?.linkedin) score += 2;
      
      return { ...user, relevanceScore: score };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // Verify relevance - CRITICAL
  verifyRelevance(results, intent) {
    // Filter out profiles with zero relevance
    const verified = results.filter(user => {
      // Must have minimum score
      if (user.relevanceScore < 5) return false;
      
      // For name search, must have name match
      if (intent.is_name_search) {
        const userName = (user.basicProfile?.name || user.enhancedProfile?.fullName || '').toLowerCase();
        return userName.includes(intent.person_name.toLowerCase());
      }
      
      // For skill search, must have skill match
      if (intent.skills.length > 0) {
        const userContent = [
          user.basicProfile?.linkedinScrapedData?.headline || '',
          user.basicProfile?.about || ''
        ].join(' ').toLowerCase();
        
        const hasSkillMatch = intent.skills.some(skill => {
          const expansions = this.skillExpansions[skill] || [skill];
          return expansions.some(e => userContent.includes(e.toLowerCase()));
        });
        
        if (!hasSkillMatch) return false;
      }
      
      // For location search, must have location match
      if (intent.locations.length > 0) {
        const userLocation = (
          user.basicProfile?.linkedinScrapedData?.location || 
          user.enhancedProfile?.city || ''
        ).toLowerCase();
        
        const hasLocationMatch = intent.locations.some(loc => {
          const variations = this.getLocationVariations(loc);
          return variations.some(v => userLocation.includes(v));
        });
        
        if (!hasLocationMatch) return false;
      }
      
      return true;
    });
    
    return verified;
  }

  // Format perfect response
  async formatPerfectResponse(results, intent, session) {
    if (results.length === 0) {
      return this.handleNoResults(intent);
    }
    
    // Take top 3 for first response
    const toShow = results.slice(0, 3);
    session.shownCount = toShow.length;
    
    // Build header
    let response = `*Found ${results.length} perfect ${results.length === 1 ? 'match' : 'matches'}`;
    
    // Add search context
    const context = [];
    if (intent.person_name) context.push(`for "${intent.person_name}"`);
    if (intent.skills.length > 0) context.push(intent.skills.join('/'));
    if (intent.locations.length > 0) context.push(`in ${intent.locations.join('/')}`);
    if (intent.education.length > 0) context.push(`from ${intent.education.join('/')}`);
    if (intent.companies.length > 0) context.push(`at ${intent.companies.join('/')}`);
    
    if (context.length > 0) {
      response += ` ${context.join(' ')}`;
    }
    response += '*\n\n';
    
    // Format each profile PERFECTLY
    for (let i = 0; i < toShow.length; i++) {
      const profileText = await this.formatSingleProfile(toShow[i], i + 1, intent);
      response += profileText;
      
      if (i < toShow.length - 1) {
        response += '\n────────────────────────────────────────\n\n';
      }
    }
    
    // Add pagination
    if (results.length > 3) {
      response += `\n\n_Type "more" to see ${results.length - 3} additional profiles_`;
    }
    
    return response;
  }

  // Format single profile PERFECTLY
  async formatSingleProfile(user, index, intent) {
    const profile = user.basicProfile?.linkedinScrapedData || {};
    const enhanced = user.enhancedProfile || {};
    const basic = user.basicProfile || {};
    
    // Extract all data
    const name = basic.name || enhanced.fullName || profile.fullName || 'Alumni';
    const headline = profile.headline || enhanced.professionalRole || '';
    const company = profile.currentCompany || '';
    const location = profile.location || enhanced.city || '';
    const about = basic.about || profile.about || '';
    const linkedin = basic.linkedin || enhanced.linkedin || '';
    
    // Get latest experience
    const latestExp = profile.experience?.[0];
    const currentRole = latestExp?.title || '';
    const currentCompany = latestExp?.company || company;
    const duration = latestExp?.duration || '';
    
    // Get education
    const education = profile.education?.[0];
    const eduName = education?.title || education?.school || '';
    
    // Start formatting
    let response = `${index}. *${name}*\n`;
    
    // Add match indicators on separate line
    const matches = this.getMatchIndicators(user, intent);
    if (matches.length > 0) {
      response += `   _Perfect match: ${matches.join(' • ')}_\n\n`;
    } else {
      response += '\n';
    }
    
    // Add headline (rewritten if AI available)
    if (headline) {
      const rewrittenHeadline = await this.rewriteContent(headline, 'headline');
      response += `   💼 ${rewrittenHeadline}\n`;
    }
    
    // Add company
    if (currentCompany) {
      response += `   🏢 ${currentCompany}\n`;
    }
    
    // Add current role
    if (currentRole) {
      response += `   💡 ${currentRole}`;
      if (currentCompany && currentRole.toLowerCase().indexOf(currentCompany.toLowerCase()) === -1) {
        response += ` at ${currentCompany}`;
      }
      if (duration) {
        response += ` (${duration})`;
      }
      response += '\n';
    }
    
    // Add education
    if (eduName) {
      response += `   🎓 ${eduName}\n`;
    }
    
    // Add about section - COMPLETE and rewritten
    if (about) {
      response += '\n   About:\n';
      const rewrittenAbout = await this.rewriteContent(about, 'about', name);
      // Show complete content, no truncation
      response += `   ${rewrittenAbout.replace(/\n/g, '\n   ')}\n`;
    }
    
    // Add LinkedIn
    if (linkedin) {
      response += `\n   🔗 Connect: ${linkedin}\n`;
    }
    
    return response;
  }

  // Get match indicators
  getMatchIndicators(user, intent) {
    const matches = [];
    const profile = user.basicProfile?.linkedinScrapedData || {};
    const enhanced = user.enhancedProfile || {};
    
    // Skills match
    if (intent.skills?.length > 0) {
      const userContent = [
        profile.headline || '',
        user.basicProfile?.about || '',
        (profile.skills || []).join(' ')
      ].join(' ').toLowerCase();
      
      const matchedSkills = intent.skills.filter(skill => {
        const expansions = this.skillExpansions[skill] || [skill];
        return expansions.some(e => userContent.includes(e.toLowerCase()));
      });
      
      if (matchedSkills.length > 0) {
        matches.push(`✅ ${matchedSkills.join(', ')}`);
      }
    }
    
    // Location match
    if (intent.locations?.length > 0) {
      const userLocation = (profile.location || enhanced.city || '').toLowerCase();
      const matchedLocation = intent.locations.find(loc => {
        const variations = this.getLocationVariations(loc);
        return variations.some(v => userLocation.includes(v));
      });
      
      if (matchedLocation) {
        matches.push(`📍 ${profile.location || enhanced.city}`);
      }
    }
    
    // Education match
    if (intent.education?.length > 0 && profile.education) {
      const userEducation = profile.education.map(e => 
        ((e.title || '') + ' ' + (e.school || '')).toLowerCase()
      ).join(' ');
      
      const matchedEdu = intent.education.find(edu => {
        const expansions = this.getEducationExpansions(edu);
        return expansions.some(e => userEducation.includes(e.toLowerCase()));
      });
      
      if (matchedEdu) {
        matches.push(`🎓 ${matchedEdu.toUpperCase()}`);
      }
    }
    
    // Company match
    if (intent.companies?.length > 0) {
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

  // Rewrite content with AI
  async rewriteContent(content, type, name = '') {
    if (!openai || !content) return content;
    
    try {
      let prompt = '';
      
      if (type === 'headline') {
        prompt = `Rewrite this professional headline to be impressive and engaging:
"${content}"

Make it powerful, achievement-focused, and impactful in one line. Keep it professional but exciting.`;
      } else if (type === 'about') {
        prompt = `Rewrite this professional about section to be impressive and engaging:

Name: ${name}
About: ${content}

Create a compelling narrative that:
1. Highlights their expertise and achievements
2. Shows their passion and drive
3. Demonstrates their value and impact
4. Tells their professional story engagingly
5. Makes them sound exceptional

Write 3-4 lines that flow naturally. No bullet points. Make it inspiring and memorable.`;
      }
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 200
      });
      
      return response.choices[0].message.content.trim();
      
    } catch (error) {
      console.error('Rewriting failed:', error);
      return content; // Return original if rewriting fails
    }
  }

  // Handle no results
  handleNoResults(intent) {
    let message = `*No exact matches found`;
    
    const context = [];
    if (intent.person_name) context.push(`for "${intent.person_name}"`);
    if (intent.skills?.length > 0) context.push(intent.skills.join('/'));
    if (intent.locations?.length > 0) context.push(`in ${intent.locations.join('/')}`);
    
    if (context.length > 0) {
      message += ` ${context.join(' ')}`;
    }
    message += '*\n\n';
    
    message += '💡 Try:\n';
    message += '• Different search terms\n';
    message += '• Fewer criteria for broader results\n';
    message += '• Alternative spellings or keywords';
    
    return message;
  }

  // Show more relevant results
  async showMoreRelevantResults(session) {
    if (!session.verifiedResults || session.verifiedResults.length === 0) {
      return "No previous search to show more results. Please search first.";
    }
    
    const remaining = session.verifiedResults.length - session.shownCount;
    if (remaining <= 0) {
      return "That's all the relevant results! Try a new search for different profiles.";
    }
    
    const nextBatch = session.verifiedResults.slice(
      session.shownCount,
      session.shownCount + 3
    );
    
    session.shownCount += nextBatch.length;
    
    let response = `*Showing ${nextBatch.length} more relevant profiles`;
    response += ` (${remaining - nextBatch.length} remaining)*\n\n`;
    
    for (let i = 0; i < nextBatch.length; i++) {
      const profileText = await this.formatSingleProfile(
        nextBatch[i],
        session.shownCount - nextBatch.length + i + 1,
        session.lastIntent || {}
      );
      response += profileText;
      
      if (i < nextBatch.length - 1) {
        response += '\n────────────────────────────────────────\n\n';
      }
    }
    
    if (remaining - nextBatch.length > 0) {
      response += `\n\n_Type "more" to see remaining ${remaining - nextBatch.length} profiles_`;
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
        verifiedResults: [],
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

module.exports = new UltimatePerfectService();