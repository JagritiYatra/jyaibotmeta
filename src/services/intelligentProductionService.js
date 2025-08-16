// Intelligent Production Service - Strict filtering, no duplicates, smart follow-ups
const { getDatabase } = require('../config/database');
const { logError, logSuccess } = require('../middleware/logging');
const OpenAI = require('openai');
const { getConfig } = require('../config/environment');

// Initialize OpenAI
const config = getConfig();
const openai = config.ai?.apiKey ? new OpenAI({ apiKey: config.ai.apiKey }) : null;

class IntelligentProductionService {
  constructor() {
    this.userSessions = new Map();
    this.spellingMap = this.initSpellingMap();
    this.queryPatterns = this.initQueryPatterns();
  }

  initSpellingMap() {
    return {
      'developper': 'developer', 'develper': 'developer', 'devloper': 'developer',
      'lawer': 'lawyer', 'laywer': 'lawyer', 'advocat': 'advocate',
      'enginer': 'engineer', 'engeneer': 'engineer',
      'enterprenuer': 'entrepreneur', 'enterprener': 'entrepreneur',
      'bengaluru': 'bangalore', 'bengalore': 'bangalore', 'banglore': 'bangalore',
      'mumbi': 'mumbai', 'bombay': 'mumbai',
      'dilli': 'delhi', 'dehli': 'delhi',
      'kolkatta': 'kolkata', 'calcutta': 'kolkata',
      'puna': 'pune', 'poona': 'pune',
      'hyderbad': 'hyderabad', 'hydrabadi': 'hyderabad',
      'ahmdabad': 'ahmedabad', 'ahemdabad': 'ahmedabad',
      'leagal': 'legal', 'ligal': 'legal',
      'tecnology': 'technology', 'techonology': 'technology',
      'finence': 'finance', 'finnance': 'finance',
      'helthcare': 'healthcare', 'healtcare': 'healthcare',
      'maneger': 'manager', 'managr': 'manager',
      'consulant': 'consultant', 'consultent': 'consultant',
      'analist': 'analyst', 'analyt': 'analyst',
      'marketting': 'marketing', 'desiner': 'designer'
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
        /^do\s+you\s+know\s+(?:about\s+)?([a-z]+(?:\s+[a-z]+)?)\??$/i,
        /^what\s+about\s+([a-z]+(?:\s+[a-z]+)?)\??$/i,
        /^information\s+(?:about|on)\s+([a-z]+(?:\s+[a-z]+)?)\??$/i,
        /^details\s+(?:about|of)\s+([a-z]+(?:\s+[a-z]+)?)\??$/i,
        /^profile\s+of\s+([a-z]+(?:\s+[a-z]+)?)\??$/i,
        /^([a-z]+(?:\s+[a-z]+)?)\??$/i
      ],
      generalKnowledge: [
        /^what\s+is\s+.+/i,
        /^explain\s+.+/i,
        /^define\s+.+/i,
        /^how\s+(does|do|to)\s+.+/i
      ]
    };
  }

  // Main search function
  async search(query, user, session) {
    try {
      const userId = user?._id?.toString() || 'anonymous';
      const userSession = this.getOrCreateSession(userId);
      
      // Clean and correct query
      const cleanQuery = this.cleanQuery(query);
      const correctedQuery = this.correctSpelling(cleanQuery);
      
      console.log(`Search: "${query}" -> "${correctedQuery}" for user ${userId}`);
      
      // Check if follow-up
      if (this.isFollowUpQuery(correctedQuery)) {
        return await this.handleFollowUp(correctedQuery, userSession);
      }
      
      // Check if general knowledge
      if (this.isGeneralKnowledge(correctedQuery)) {
        return await this.handleGeneralKnowledge(correctedQuery);
      }
      
      // Extract search parameters
      const searchParams = await this.extractSearchParams(correctedQuery);
      console.log('Search params:', JSON.stringify(searchParams, null, 2));
      
      // Search database with strict filtering
      const allResults = await this.searchDatabase(searchParams);
      console.log(`Found ${allResults.length} results`);
      
      // Strictly filter and rank results
      const filteredResults = this.strictFilter(allResults, searchParams);
      const rankedResults = this.rankResults(filteredResults, searchParams);
      
      console.log(`After strict filtering: ${rankedResults.length} results`);
      
      // Store session for follow-ups
      this.updateSession(userSession, {
        lastQuery: correctedQuery,
        lastParams: searchParams,
        allResults: rankedResults, // Store ALL results
        shownIds: new Set(), // Track shown profile IDs
        shownCount: 0
      });
      
      // Format response (intelligent - no "type more" hints)
      return await this.formatIntelligentResponse(rankedResults, searchParams, correctedQuery, userSession);
      
    } catch (error) {
      console.error('Search error:', error);
      return "I'm having trouble with that search. Please try again.";
    }
  }

  cleanQuery(query) {
    return query.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  correctSpelling(query) {
    let corrected = query;
    for (const [wrong, right] of Object.entries(this.spellingMap)) {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      corrected = corrected.replace(regex, right);
    }
    return corrected;
  }

  isFollowUpQuery(query) {
    return this.queryPatterns.followUp.some(pattern => pattern.test(query));
  }

  isGeneralKnowledge(query) {
    return this.queryPatterns.generalKnowledge.some(pattern => pattern.test(query)) &&
           !query.includes('alumni') && !query.includes('people');
  }

  // Handle follow-up - NO DUPLICATES
  async handleFollowUp(query, session) {
    if (!session.allResults || session.allResults.length === 0) {
      return "No previous search found. Please make a new search.";
    }
    
    const { allResults, shownIds = new Set(), lastQuery, lastParams } = session;
    
    // Filter out already shown profiles
    const unseenResults = allResults.filter(user => {
      const userId = user._id?.toString();
      return !shownIds.has(userId);
    });
    
    if (unseenResults.length === 0) {
      // Intelligently suggest what to do next
      if (lastParams?.locations?.length > 0) {
        return `All results shown for "${lastQuery}".\n\nTry searching without location filter for more results.`;
      } else {
        return `All results shown for "${lastQuery}".\n\nTry a different search or broader terms.`;
      }
    }
    
    // Show next batch (max 3)
    const nextBatch = unseenResults.slice(0, 3);
    
    // Update shown IDs
    nextBatch.forEach(user => {
      shownIds.add(user._id?.toString());
    });
    session.shownCount = shownIds.size;
    
    // Format response without "type more" hints
    let response = '';
    
    // Only show count if meaningful
    if (shownIds.size > 3) {
      response = `*Additional results:*\n\n`;
    }
    
    nextBatch.forEach((user, index) => {
      response += this.formatProfile(user, shownIds.size - nextBatch.length + index + 1);
      if (index < nextBatch.length - 1) response += '\n---\n\n';
    });
    
    // Intelligent ending - no explicit "type more"
    const remaining = allResults.length - shownIds.size;
    if (remaining > 0 && remaining <= 3) {
      // Will automatically show remaining in next request
    } else if (remaining === 0) {
      response += '\n\n_All relevant profiles shown._';
    }
    
    return response;
  }

  async handleGeneralKnowledge(query) {
    if (!openai) {
      return "I specialize in alumni connections. Please ask about finding people or professionals.";
    }
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'user',
          content: `Answer concisely for WhatsApp: ${query}`
        }],
        temperature: 0.7,
        max_tokens: 150
      });
      return response.choices[0].message.content;
    } catch (error) {
      return "I can help you find alumni by skills, location, or name.";
    }
  }

  async extractSearchParams(query) {
    const params = {
      type: 'general',
      names: [],
      skills: [],
      locations: [],
      roles: [],
      companies: [],
      domains: [],
      education: [], // ADD EDUCATION FIELD
      requirements: [],
      strictLocation: false, // Flag for strict location matching
      strictSkills: false // Flag for strict skill matching
    };
    
    // Check for name search (but not general terms)
    const generalTerms = ['entrepreneurs', 'developers', 'lawyers', 'designers', 'marketers', 'professionals'];
    for (const pattern of this.queryPatterns.nameSearch) {
      const match = query.match(pattern);
      if (match && match[1] && match[1].length > 2 && !generalTerms.includes(match[1])) {
        params.type = 'name';
        params.names.push(match[1]);
        break;
      }
    }
    
    // Professional categories
    if (query.includes('legal') || query.includes('law') || query.includes('lawyer')) {
      params.type = 'professional';
      params.strictSkills = true;
      params.skills.push('law', 'legal', 'lawyer', 'advocate', 'attorney');
      params.roles.push('lawyer', 'advocate', 'legal advisor', 'attorney');
      params.domains.push('Legal', 'Law');
    }
    
    if (query.includes('developer') || query.includes('programmer') || query.includes('web')) {
      params.type = 'professional';
      params.strictSkills = true;
      params.skills.push('developer', 'javascript', 'react', 'node', 'python', 'java', 'web');
      params.roles.push('developer', 'engineer', 'programmer');
      params.domains.push('Technology', 'Software', 'IT');
    }
    
    if (query.includes('entrepreneur') || query.includes('founder') || query.includes('startup')) {
      params.roles.push('entrepreneur', 'founder', 'co-founder', 'ceo');
      params.domains.push('Startup', 'Business');
    }
    
    if (query.includes('marketing') || query.includes('sales')) {
      params.strictSkills = true;
      params.skills.push('marketing', 'digital marketing', 'sales', 'branding');
      params.roles.push('marketer', 'marketing manager', 'sales manager');
      params.domains.push('Marketing', 'Sales');
    }
    
    // CHECK FOR EDUCATION/COLLEGE SEARCHES
    // Map abbreviations to full names for better search
    const collegeMap = {
      'coep': ['coep', 'college of engineering pune', 'college of engineering, pune'],
      'iit': ['iit', 'indian institute of technology'],
      'nit': ['nit', 'national institute of technology'],
      'bits': ['bits', 'birla institute'],
      'vit': ['vit', 'vellore institute'],
      'mit': ['mit', 'manipal institute', 'maharashtra institute'],
      'iiit': ['iiit', 'international institute of information technology'],
      'iim': ['iim', 'indian institute of management']
    };
    
    const colleges = [
      'coep', 'iit', 'nit', 'bits', 'vit', 'mit', 'iiit', 'iim',
      'college of engineering pune', 'indian institute', 'national institute',
      'birla institute', 'manipal', 'symbiosis', 'pune university',
      'mumbai university', 'delhi university', 'anna university'
    ];
    
    // Check if asking about education/college
    if (query.includes('education') || query.includes('studied') || 
        query.includes('college') || query.includes('university') ||
        query.includes('alumni from') || query.includes('graduated')) {
      params.type = 'education';
      
      // Extract college names and expand abbreviations
      for (const [abbr, expansions] of Object.entries(collegeMap)) {
        if (query.includes(abbr)) {
          // Add all variations for this abbreviation
          params.education.push(...expansions);
        }
      }
      
      // Also check for full college names
      colleges.forEach(college => {
        if (query.includes(college) && !params.education.includes(college)) {
          params.education.push(college);
        }
      });
    } else {
      // Also check for direct college mentions
      for (const [abbr, expansions] of Object.entries(collegeMap)) {
        if (query.includes(abbr)) {
          params.education.push(...expansions);
        }
      }
      
      colleges.forEach(college => {
        if (query.includes(college) && !params.education.includes(college)) {
          params.education.push(college);
        }
      });
    }
    
    // Extract locations - if location is specified, it's STRICT
    const cities = [
      'pune', 'mumbai', 'bangalore', 'bengaluru', 'delhi', 'gurgaon', 'noida',
      'chennai', 'kolkata', 'hyderabad', 'ahmedabad', 'jaipur', 'lucknow',
      'indore', 'nagpur', 'surat', 'chandigarh', 'kochi', 'goa'
    ];
    
    cities.forEach(city => {
      if (query.includes(city)) {
        params.locations.push(city);
        // Only strict if not education search
        if (params.type !== 'education' && params.education.length === 0) {
          params.strictLocation = true;
        }
      }
    });
    
    // If user asks for help, they need professionals
    if (query.includes('help') || query.includes('assist') || query.includes('advice')) {
      params.requirements.push('needs professional');
    }
    
    return params;
  }

  async searchDatabase(params) {
    const db = getDatabase();
    const queries = [];
    
    // Name search
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
    
    // EDUCATION SEARCH - SEARCH IN EDUCATION FIELDS
    if (params.education.length > 0) {
      const eduConditions = [];
      params.education.forEach(college => {
        eduConditions.push(
          { 'basicProfile.linkedinScrapedData.education.title': { $regex: college, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.education.school': { $regex: college, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.education.degree': { $regex: college, $options: 'i' } },
          { 'enhancedProfile.education': { $regex: college, $options: 'i' } },
          { 'basicProfile.about': { $regex: college, $options: 'i' } }
        );
      });
      queries.push({ $or: eduConditions });
    }
    
    // Build query based on params
    if (params.skills.length > 0 || params.roles.length > 0) {
      const skillConditions = [];
      [...params.skills, ...params.roles].forEach(term => {
        skillConditions.push(
          { 'basicProfile.linkedinScrapedData.headline': { $regex: term, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.title': { $regex: term, $options: 'i' } },
          { 'basicProfile.about': { $regex: term, $options: 'i' } },
          { 'enhancedProfile.professionalRole': { $regex: term, $options: 'i' } },
          { 'enhancedProfile.domain': { $regex: term, $options: 'i' } }
        );
      });
      queries.push({ $or: skillConditions });
    }
    
    // Execute queries
    let allResults = [];
    const seenIds = new Set();
    
    for (const query of queries) {
      const results = await db.collection('users')
        .find(query)
        .limit(100)
        .toArray();
      
      results.forEach(user => {
        const id = user._id.toString();
        if (!seenIds.has(id)) {
          seenIds.add(id);
          allResults.push(user);
        }
      });
    }
    
    return allResults;
  }

  // STRICT FILTERING - Remove profiles that don't match requirements
  strictFilter(results, params) {
    return results.filter(user => {
      const location = (user.basicProfile?.linkedinScrapedData?.location || 
                       user.enhancedProfile?.city || '').toLowerCase();
      const headline = (user.basicProfile?.linkedinScrapedData?.headline || '').toLowerCase();
      const about = (user.basicProfile?.about || '').toLowerCase();
      const userData = JSON.stringify(user).toLowerCase();
      
      // STRICT LOCATION CHECK - if location specified, MUST match
      if (params.strictLocation && params.locations.length > 0) {
        const hasLocation = params.locations.some(loc => 
          location.includes(loc.toLowerCase())
        );
        if (!hasLocation) {
          return false; // Reject if location doesn't match
        }
      }
      
      // STRICT SKILL CHECK - if professional search, MUST have relevant skills
      if (params.strictSkills && params.skills.length > 0) {
        const hasSkill = params.skills.some(skill => 
          headline.includes(skill.toLowerCase()) ||
          about.includes(skill.toLowerCase()) ||
          userData.includes(skill.toLowerCase())
        );
        if (!hasSkill) {
          return false; // Reject if no relevant skills
        }
      }
      
      // Filter out students if looking for professionals
      if (params.requirements.includes('needs professional')) {
        if (userData.includes('student') && !userData.includes('graduate')) {
          return false; // Reject students
        }
      }
      
      return true; // Pass all filters
    });
  }

  rankResults(results, params) {
    const scored = results.map(user => {
      let score = 0;
      const matchReasons = [];
      
      const location = (user.basicProfile?.linkedinScrapedData?.location || 
                       user.enhancedProfile?.city || '').toLowerCase();
      const headline = (user.basicProfile?.linkedinScrapedData?.headline || '').toLowerCase();
      const about = (user.basicProfile?.about || '').toLowerCase();
      const name = (user.basicProfile?.name || user.enhancedProfile?.fullName || '').toLowerCase();
      
      // Name match - highest priority
      if (params.names.length > 0) {
        if (params.names.some(n => name.includes(n.toLowerCase()))) {
          score += 100;
          matchReasons.push('Name match');
        }
      }
      
      // Location match bonus (already filtered strictly)
      if (params.locations.length > 0 && params.locations.some(loc => location.includes(loc))) {
        score += 30;
        const city = params.locations.find(loc => location.includes(loc));
        matchReasons.push(`📍 ${city}`);
      }
      
      // Skill matches
      const matchedSkills = [];
      params.skills.forEach(skill => {
        if (headline.includes(skill.toLowerCase())) {
          score += 40;
          matchedSkills.push(skill);
        } else if (about.includes(skill.toLowerCase())) {
          score += 20;
          matchedSkills.push(skill);
        }
      });
      
      if (matchedSkills.length > 0) {
        matchReasons.push(`Skills: ${[...new Set(matchedSkills)].slice(0, 3).join(', ')}`);
      }
      
      // Role matches
      params.roles.forEach(role => {
        if (headline.includes(role.toLowerCase())) {
          score += 35;
          matchReasons.push('Role match');
        }
      });
      
      // Profile completeness
      if (user.enhancedProfile?.completed) score += 10;
      if (user.basicProfile?.linkedinScrapedData?.experience?.length > 0) score += 15;
      
      return {
        ...user,
        relevanceScore: score,
        matchReasons
      };
    });
    
    // Sort by score and return only positive scores
    return scored
      .filter(r => r.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  async formatIntelligentResponse(results, params, query, session) {
    if (results.length === 0) {
      return this.getNoResultsMessage(params, query);
    }
    
    // For name searches, provide RICH detailed profile
    if (params.type === 'name' && params.names.length > 0 && results.length > 0) {
      return await this.formatDetailedNameProfile(results[0], params.names[0]);
    }
    
    // Show first 3-5 results
    const toShow = results.slice(0, Math.min(5, results.length));
    
    // Mark these as shown
    const shownIds = new Set();
    toShow.forEach(user => {
      shownIds.add(user._id?.toString());
    });
    session.shownIds = shownIds;
    session.shownCount = shownIds.size;
    
    let response = `*Found ${results.length} ${results.length === 1 ? 'profile' : 'profiles'}*\n\n`;
    
    toShow.forEach((user, index) => {
      response += this.formatProfile(user, index + 1);
      if (index < toShow.length - 1) response += '\n---\n\n';
    });
    
    // Intelligent context - no explicit "type more"
    // The system knows there are more results and will show them if asked
    
    return response;
  }

  formatProfile(user, index) {
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
    
    // Match reasons if available
    if (user.matchReasons && user.matchReasons.length > 0) {
      profile += `   _[${user.matchReasons.join(' • ')}]_\n\n`;
    }
    
    if (headline) profile += `   ${headline}\n`;
    if (company) profile += `   Company: ${company}\n`;
    if (location) profile += `   Location: ${location}\n`;
    
    // Experience
    const experience = user.basicProfile?.linkedinScrapedData?.experience || [];
    if (experience.length > 0 && experience[0].title) {
      profile += `   Experience: ${experience[0].title}`;
      if (experience[0].duration) profile += ` (${experience[0].duration})`;
      profile += '\n';
    }
    
    // About (concise)
    const about = user.basicProfile?.about || user.basicProfile?.linkedinScrapedData?.about;
    if (about && about.length > 0) {
      const cleanAbout = about.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanAbout.length > 150) {
        profile += `\n   _${cleanAbout.substring(0, 150)}..._\n`;
      } else {
        profile += `\n   _${cleanAbout}_\n`;
      }
    }
    
    // Contact
    const linkedin = user.basicProfile?.linkedin || 
                    user.enhancedProfile?.linkedin || 
                    user.basicProfile?.linkedinScrapedData?.profileUrl;
    
    if (linkedin) {
      profile += `\n   LinkedIn: ${linkedin}\n`;
    }
    
    return profile;
  }

  // Create rich, detailed profile for name searches
  async formatDetailedNameProfile(user, searchedName) {
    const name = user.enhancedProfile?.fullName || 
                user.basicProfile?.linkedinScrapedData?.fullName || 
                user.basicProfile?.name || 'Alumni Member';
    
    const scraped = user.basicProfile?.linkedinScrapedData || {};
    const headline = scraped.headline || user.enhancedProfile?.professionalRole || '';
    const location = scraped.location || user.enhancedProfile?.city || '';
    const about = scraped.about || user.basicProfile?.about || '';
    const company = scraped.currentCompany || scraped.experience?.[0]?.company || '';
    const linkedin = user.basicProfile?.linkedin || user.enhancedProfile?.linkedin || scraped.profileUrl;
    const email = user.basicProfile?.email || user.enhancedProfile?.email;
    
    // Use AI to create impressive content if available
    if (openai && about) {
      try {
        const prompt = `Rewrite this professional profile in an impressive, engaging way for WhatsApp (use *bold* for emphasis, no emojis):
        
Name: ${name}
Headline: ${headline}
About: ${about}
Location: ${location}
Company: ${company}

Instructions:
1. Start with an impressive introduction about who they are
2. Highlight their key achievements and expertise
3. Mention their professional journey
4. Include what makes them unique
5. Keep it under 300 words
6. Make it inspiring and memorable
7. Use *bold* for key points`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 400
        });
        
        let aiContent = response.choices[0].message.content;
        
        // Add structured data after AI content
        aiContent += '\n\n*Professional Details:*\n';
        if (headline) aiContent += `Position: ${headline}\n`;
        if (company) aiContent += `Company: ${company}\n`;
        if (location) aiContent += `Location: ${location}\n`;
        
        // Add experience highlights
        if (scraped.experience?.length > 0) {
          aiContent += '\n*Career Journey:*\n';
          scraped.experience.slice(0, 3).forEach(exp => {
            aiContent += `• ${exp.title} at ${exp.company}`;
            if (exp.duration) aiContent += ` (${exp.duration})`;
            aiContent += '\n';
            if (exp.description) {
              const cleanDesc = exp.description.replace(/\n+/g, ' ').substring(0, 100);
              aiContent += `  _${cleanDesc}..._\n`;
            }
          });
        }
        
        // Add education
        if (scraped.education?.length > 0) {
          aiContent += '\n*Education:*\n';
          scraped.education.slice(0, 2).forEach(edu => {
            aiContent += `• ${edu.title}`;
            if (edu.degree) aiContent += ` - ${edu.degree}`;
            aiContent += '\n';
          });
        }
        
        // Add skills
        if (scraped.skills?.length > 0) {
          aiContent += `\n*Key Skills:*\n${scraped.skills.slice(0, 10).join(', ')}\n`;
        }
        
        // Add contact
        if (linkedin || email) {
          aiContent += '\n*Connect:*\n';
          if (linkedin) aiContent += `LinkedIn: ${linkedin}\n`;
          if (email) aiContent += `Email: ${email}\n`;
        }
        
        return aiContent;
        
      } catch (error) {
        console.error('AI rewriting error:', error);
        // Fall back to standard format
      }
    }
    
    // Fallback: Create impressive content without AI
    let response = `*${name}*\n`;
    if (headline) response += `_${headline}_\n\n`;
    
    // Create an impressive introduction
    response += `Meet ${name.split(' ')[0]}, `;
    
    if (headline.toLowerCase().includes('founder') || headline.toLowerCase().includes('ceo')) {
      response += 'a visionary entrepreneur and leader ';
    } else if (headline.toLowerCase().includes('engineer') || headline.toLowerCase().includes('developer')) {
      response += 'a talented technologist and innovator ';
    } else if (headline.toLowerCase().includes('manager') || headline.toLowerCase().includes('director')) {
      response += 'an accomplished leader and strategist ';
    } else {
      response += 'a dedicated professional ';
    }
    
    if (company) response += `currently making waves at *${company}*`;
    if (location) response += ` from ${location}`;
    response += '.\n\n';
    
    // Add about section with formatting
    if (about) {
      response += '*About:*\n';
      const cleanAbout = about.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      response += `_${cleanAbout}_\n\n`;
    }
    
    // Professional journey
    if (scraped.experience?.length > 0) {
      response += '*Professional Journey:*\n';
      scraped.experience.slice(0, 4).forEach(exp => {
        response += `\n• *${exp.title}* at ${exp.company || 'Company'}`;
        if (exp.duration) response += ` (${exp.duration})`;
        response += '\n';
        if (exp.description) {
          const desc = exp.description.replace(/\n+/g, ' ').substring(0, 150);
          response += `  _${desc}..._\n`;
        }
      });
      response += '\n';
    }
    
    // Education
    if (scraped.education?.length > 0) {
      response += '*Educational Background:*\n';
      scraped.education.forEach(edu => {
        response += `• ${edu.title}`;
        if (edu.degree) response += ` - ${edu.degree}`;
        response += '\n';
      });
      response += '\n';
    }
    
    // Skills
    if (scraped.skills?.length > 0) {
      response += '*Core Competencies:*\n';
      response += scraped.skills.slice(0, 15).join(', ') + '\n\n';
    }
    
    // Yatra connection
    if (user.yatraYear) {
      response += `*Jagriti Yatra:* ${user.yatraYear} Alumni\n\n`;
    }
    
    // Contact
    response += '*Get in Touch:*\n';
    if (linkedin) response += `LinkedIn: ${linkedin}\n`;
    if (email) response += `Email: ${email}\n`;
    
    return response;
  }
  
  getNoResultsMessage(params, query) {
    let message = `No profiles found for: "${query}"\n\n`;
    
    if (params.strictLocation && params.locations.length > 0) {
      message += `No one with those skills in ${params.locations.join(', ')}.\n`;
      message += 'Try removing location or searching nearby cities.';
    } else if (params.strictSkills && params.skills.length > 0) {
      message += `No exact matches for ${params.skills.slice(0, 2).join(', ')}.\n`;
      message += 'Try related terms or broader search.';
    } else {
      message += 'Try different keywords or check spelling.';
    }
    
    return message;
  }

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
    
    // Clean after 30 minutes
    if (Date.now() - session.createdAt > 30 * 60 * 1000) {
      this.userSessions.delete(userId);
      return this.getOrCreateSession(userId);
    }
    
    return session;
  }

  updateSession(session, data) {
    Object.assign(session, data);
    session.lastActivity = Date.now();
  }
}

module.exports = new IntelligentProductionService();