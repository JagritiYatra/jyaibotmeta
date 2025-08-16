// Enhanced Search Service - God-level AI search across all profile fields
// Implements intelligent string matching, semantic search, and context understanding

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

class EnhancedSearchService {
  constructor() {
    this.searchFields = [
      // Basic profile fields
      'basicProfile.name',
      'basicProfile.about',
      'basicProfile.email',
      'basicProfile.linkedin',
      
      // LinkedIn scraped data fields
      'basicProfile.linkedinScrapedData.fullName',
      'basicProfile.linkedinScrapedData.headline',
      'basicProfile.linkedinScrapedData.location',
      'basicProfile.linkedinScrapedData.currentCompany',
      'basicProfile.linkedinScrapedData.currentCompanyTitle',
      'basicProfile.linkedinScrapedData.about',
      
      // Experience fields
      'basicProfile.linkedinScrapedData.experience.title',
      'basicProfile.linkedinScrapedData.experience.company',
      'basicProfile.linkedinScrapedData.experience.location',
      
      // Education fields
      'basicProfile.linkedinScrapedData.education.title',
      'basicProfile.linkedinScrapedData.education.degree',
      'basicProfile.linkedinScrapedData.education.field',
      
      // Skills
      'basicProfile.linkedinScrapedData.skills',
      
      // Enhanced profile fields
      'enhancedProfile.fullName',
      'enhancedProfile.country',
      'enhancedProfile.currentAddress',
      'enhancedProfile.permanentAddress',
      'enhancedProfile.domain',
      'enhancedProfile.professionalRole',
      'enhancedProfile.yatraHelp',
      'enhancedProfile.communityAsks',
      'enhancedProfile.communityGive'
    ];
  }

  // Extract search intent using AI
  async extractSearchIntent(query) {
    try {
      const prompt = `Analyze this search query and extract key information for an alumni network search:
Query: "${query}"

Important: Extract actual searchable terms, not generic descriptions.
For colleges/universities, extract both full names and common abbreviations.

Extract:
1. Person names (if any)
2. Locations (cities, states, countries) 
3. Companies/Organizations/Colleges (include common abbreviations like COEP, IIT, NIT)
4. Skills/Technologies (web developer -> web, developer, javascript, etc.)
5. Professional roles/titles
6. Industries/Domains
7. Gender (if mentioned: male, female, women, men)
8. Experience level (if mentioned: senior, junior, experienced, fresher)
9. Search intent type: location_search, skill_search, company_search, person_search, cross_filter, or general
10. Special requests (contact number, whatsapp, phone)

Return as JSON format:
{
  "names": [],
  "locations": [],
  "companies": [],
  "skills": [],
  "roles": [],
  "industries": [],
  "gender": "",
  "experience": "",
  "intent": "type of search",
  "keywords": [],
  "wantsContact": false
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content);
      
      // Add common variations for colleges
      if (result.companies) {
        const expandedCompanies = [];
        result.companies.forEach(company => {
          expandedCompanies.push(company);
          // Add common variations
          if (company.toLowerCase().includes('coep')) {
            expandedCompanies.push('COEP', 'College of Engineering Pune', 'College of Engineering, Pune');
          }
          if (company.toLowerCase().includes('iit')) {
            expandedCompanies.push('IIT', 'Indian Institute of Technology');
          }
        });
        result.companies = [...new Set(expandedCompanies)];
      }
      
      return result;
    } catch (error) {
      logError(error, { operation: 'extractSearchIntent', query });
      // Improved fallback
      const keywords = query.toLowerCase().split(/\s+/).filter(word => 
        !['anyone', 'from', 'in', 'the', 'list', 'show', 'find', 'me'].includes(word)
      );
      return {
        keywords,
        intent: 'general search',
        locations: keywords.filter(k => ['pune', 'mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata', 'hyderabad'].includes(k)),
        companies: keywords.filter(k => ['coep', 'iit', 'nit', 'bits'].includes(k)),
        skills: keywords.filter(k => ['developer', 'designer', 'analyst', 'engineer', 'manager'].includes(k))
      };
    }
  }

  // Build MongoDB query from extracted intent
  buildSearchQuery(intent, originalQuery) {
    // Check if this is a location-specific search
    const locationSpecificMatch = /(.+?)\s+from\s+(.+)/i.exec(originalQuery);
    
    if (locationSpecificMatch) {
      // This is a location-specific search like "web developers from bengaluru"
      const [, searchTerm, location] = locationSpecificMatch;
      
      logSuccess('location_specific_search_detected', { searchTerm, location });
      
      // Build AND query for location-specific searches
      const andConditions = [];
      
      // Location condition
      andConditions.push({
        $or: [
          { 'basicProfile.linkedinScrapedData.location': { $regex: location, $options: 'i' } },
          { 'enhancedProfile.currentAddress': { $regex: location, $options: 'i' } },
          { 'enhancedProfile.country': { $regex: location, $options: 'i' } }
        ]
      });
      
      // Search term condition
      const searchConditions = [];
      const keywords = searchTerm.toLowerCase().split(/\s+/);
      keywords.forEach(keyword => {
        if (!['the', 'in', 'at', 'any', 'all'].includes(keyword)) {
          searchConditions.push(
            { 'basicProfile.linkedinScrapedData.headline': { $regex: keyword, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.skills': { $regex: keyword, $options: 'i' } },
            { 'basicProfile.about': { $regex: keyword, $options: 'i' } },
            { 'enhancedProfile.professionalRole': { $regex: keyword, $options: 'i' } }
          );
        }
      });
      
      if (searchConditions.length > 0) {
        andConditions.push({ $or: searchConditions });
      }
      
      logSuccess('location_query_built', { andConditions: JSON.stringify(andConditions) });
      return { $and: andConditions };
    }
    
    // Regular OR-based search
    const orConditions = [];

    // Name search
    if (intent.names && intent.names.length > 0) {
      intent.names.forEach(name => {
        orConditions.push(
          { 'basicProfile.name': { $regex: name, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.fullName': { $regex: name, $options: 'i' } },
          { 'enhancedProfile.fullName': { $regex: name, $options: 'i' } }
        );
      });
    }

    // Location search
    if (intent.locations && intent.locations.length > 0) {
      intent.locations.forEach(location => {
        orConditions.push(
          { 'basicProfile.linkedinScrapedData.location': { $regex: location, $options: 'i' } },
          { 'enhancedProfile.country': { $regex: location, $options: 'i' } },
          { 'enhancedProfile.currentAddress': { $regex: location, $options: 'i' } },
          { 'enhancedProfile.permanentAddress': { $regex: location, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.location': { $regex: location, $options: 'i' } }
        );
      });
    }

    // Company search (including education institutions)
    if (intent.companies && intent.companies.length > 0) {
      intent.companies.forEach(company => {
        orConditions.push(
          { 'basicProfile.linkedinScrapedData.currentCompany': { $regex: company, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.company': { $regex: company, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.education.title': { $regex: company, $options: 'i' } },
          { 'basicProfile.about': { $regex: company, $options: 'i' } },
          { 'enhancedProfile.yatraHelp': { $regex: company, $options: 'i' } }
        );
      });
    }

    // Skills search - enhanced to check multiple fields
    if (intent.skills && intent.skills.length > 0) {
      intent.skills.forEach(skill => {
        // Also search for related terms
        const relatedTerms = this.getRelatedTerms(skill);
        const searchTerms = [skill, ...relatedTerms];
        
        searchTerms.forEach(term => {
          orConditions.push(
            { 'basicProfile.linkedinScrapedData.skills': { $regex: term, $options: 'i' } },
            { 'basicProfile.about': { $regex: term, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.about': { $regex: term, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.headline': { $regex: term, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.currentCompanyTitle': { $regex: term, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.experience.title': { $regex: term, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.experience.description': { $regex: term, $options: 'i' } },
            { 'enhancedProfile.domain': { $regex: term, $options: 'i' } },
            { 'enhancedProfile.professionalRole': { $regex: term, $options: 'i' } }
          );
        });
      });
    }

    // Role search
    if (intent.roles && intent.roles.length > 0) {
      intent.roles.forEach(role => {
        // Clean up role string (remove 's' from plural)
        const cleanRole = role.replace(/s$/, '');
        orConditions.push(
          { 'enhancedProfile.professionalRole': { $regex: cleanRole, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.headline': { $regex: cleanRole, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.currentCompanyTitle': { $regex: cleanRole, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.title': { $regex: cleanRole, $options: 'i' } },
          { 'basicProfile.about': { $regex: cleanRole, $options: 'i' } }
        );
      });
    }

    // Industry/Business search
    if (intent.industries && intent.industries.length > 0) {
      intent.industries.forEach(industry => {
        // Expand industry terms
        const expandedTerms = this.expandIndustryTerms(industry);
        expandedTerms.forEach(term => {
          orConditions.push(
            { 'enhancedProfile.domain': { $regex: term, $options: 'i' } },
            { 'basicProfile.about': { $regex: term, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.about': { $regex: term, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.headline': { $regex: term, $options: 'i' } },
            { 'enhancedProfile.yatraHelp': { $regex: term, $options: 'i' } },
            { 'enhancedProfile.professionalRole': { $regex: term, $options: 'i' } }
          );
        });
      });
    }

    // General keyword search as fallback - search only relevant text fields
    if (intent.keywords && intent.keywords.length > 0) {
      intent.keywords.forEach(keyword => {
        // Skip common words
        if (!['the', 'in', 'at', 'from', 'list', 'show', 'find', 'me', 'any', 'all', 'anyone'].includes(keyword.toLowerCase())) {
          // Search in text-based fields only (not email/linkedin URLs)
          const textFields = [
            'basicProfile.name',
            'basicProfile.about',
            'basicProfile.linkedinScrapedData.fullName',
            'basicProfile.linkedinScrapedData.headline',
            'basicProfile.linkedinScrapedData.about',
            'basicProfile.linkedinScrapedData.currentCompanyTitle',
            'basicProfile.linkedinScrapedData.experience.title',
            'basicProfile.linkedinScrapedData.experience.company',
            'basicProfile.linkedinScrapedData.education.title',
            'basicProfile.linkedinScrapedData.skills',
            'enhancedProfile.professionalRole',
            'enhancedProfile.domain'
          ];
          textFields.forEach(field => {
            orConditions.push({ [field]: { $regex: keyword, $options: 'i' } });
          });
        }
      });
    }

    // Gender filter
    if (intent.gender) {
      const genderConditions = [];
      if (intent.gender.toLowerCase().includes('female') || intent.gender.toLowerCase().includes('women')) {
        genderConditions.push(
          { 'enhancedProfile.gender': { $regex: 'female', $options: 'i' } },
          { 'basicProfile.name': { $regex: '(priya|anjali|neha|pooja|divya|shreya|anita|sita|radha)', $options: 'i' } }
        );
      } else if (intent.gender.toLowerCase().includes('male') || intent.gender.toLowerCase().includes('men')) {
        genderConditions.push(
          { 'enhancedProfile.gender': { $regex: 'male', $options: 'i' } },
          { 'enhancedProfile.gender': { $not: { $regex: 'female', $options: 'i' } } }
        );
      }
      if (genderConditions.length > 0) {
        orConditions.push(...genderConditions);
      }
    }
    
    // Experience level filter
    if (intent.experience) {
      const exp = intent.experience.toLowerCase();
      if (exp.includes('senior') || exp.includes('experienced')) {
        orConditions.push(
          { 'basicProfile.linkedinScrapedData.headline': { $regex: '(senior|sr\\.|lead|principal|head|director|vp|ceo|cto|founder)', $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.currentCompanyTitle': { $regex: '(senior|sr\\.|lead|principal|head|director|vp|ceo|cto|founder)', $options: 'i' } }
        );
      } else if (exp.includes('junior') || exp.includes('fresher')) {
        orConditions.push(
          { 'basicProfile.linkedinScrapedData.headline': { $regex: '(junior|jr\\.|intern|trainee|fresher|associate)', $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.currentCompanyTitle': { $regex: '(junior|jr\\.|intern|trainee|fresher|associate)', $options: 'i' } }
        );
      }
    }
    
    // Return query - use $or for all conditions
    return orConditions.length > 0 ? { $or: orConditions } : {};
  }

  // Calculate relevance score for search results
  calculateRelevanceScore(user, intent) {
    let score = 0;
    const weights = {
      nameMatch: 10,
      locationMatch: 8,
      companyMatch: 7,
      skillMatch: 9,
      roleMatch: 8,
      industryMatch: 6,
      profileCompleteness: 5,
      recentActivity: 3
    };

    // Name matching
    if (intent.names) {
      intent.names.forEach(name => {
        const nameRegex = new RegExp(name, 'i');
        if (user.basicProfile?.name?.match(nameRegex) || 
            user.basicProfile?.linkedinScrapedData?.fullName?.match(nameRegex) ||
            user.enhancedProfile?.fullName?.match(nameRegex)) {
          score += weights.nameMatch;
        }
      });
    }

    // Location matching
    if (intent.locations) {
      intent.locations.forEach(location => {
        const locationRegex = new RegExp(location, 'i');
        if (user.basicProfile?.linkedinScrapedData?.location?.match(locationRegex) ||
            user.enhancedProfile?.country?.match(locationRegex) ||
            user.enhancedProfile?.currentAddress?.match(locationRegex)) {
          score += weights.locationMatch;
        }
      });
    }

    // Skill matching - check multiple fields since skills array is often empty
    if (intent.skills) {
      intent.skills.forEach(skill => {
        const skillRegex = new RegExp(skill, 'i');
        const skills = user.basicProfile?.linkedinScrapedData?.skills || [];
        
        // Check in multiple places for skills
        const skillFound = 
          skills.some(s => s.match(skillRegex)) ||
          user.basicProfile?.about?.match(skillRegex) ||
          user.basicProfile?.linkedinScrapedData?.about?.match(skillRegex) ||
          user.basicProfile?.linkedinScrapedData?.headline?.match(skillRegex) ||
          user.basicProfile?.linkedinScrapedData?.currentCompanyTitle?.match(skillRegex) ||
          user.basicProfile?.linkedinScrapedData?.experience?.some(exp => 
            exp.title?.match(skillRegex) || exp.description?.match(skillRegex)
          );
          
        if (skillFound) {
          score += weights.skillMatch;
        }
      });
    }

    // Profile completeness bonus
    if (user.enhancedProfile?.completed) {
      score += weights.profileCompleteness;
    }

    return score;
  }

  // Format search results with professional summaries
  async formatSearchResults(users, query, intent, currentUserId) {
    try {
      if (users.length === 0) {
        return "No alumni found matching your search. Try different keywords.";
      }

      // Import cache service
      const resultsCacheService = require('./resultsCacheService');
      
      // Filter out already shown profiles
      const newUsers = resultsCacheService.filterNewProfiles(currentUserId, users);
      
      if (newUsers.length === 0 && users.length > 0) {
        return "You've seen all matching profiles today. Try a different search.";
      }

      // Sort by relevance score
      const scoredUsers = newUsers.map(user => ({
        user,
        score: this.calculateRelevanceScore(user, intent)
      })).sort((a, b) => b.score - a.score);

      // Always show exactly 2 profiles (or 1 if only 1 available)
      const resultCount = Math.min(2, scoredUsers.length);
      const topResults = scoredUsers.slice(0, resultCount);
      
      // Ensure we have at least some results to show if available
      if (topResults.length === 0 && scoredUsers.length > 0) {
        // Force showing at least 2 results if available
        topResults.push(...scoredUsers.slice(0, Math.min(2, scoredUsers.length)));
      }
      
      // Mark these profiles as shown
      const shownIds = topResults.map(r => r.user._id);
      resultsCacheService.markProfilesShown(currentUserId, shownIds);

      // Analyze what user wants
      const wantsContact = /contact|email|linkedin|connect|reach/i.test(query);
      const isFollowUp = /more|tell me more|details|elaborate/i.test(query);
      const detailLevel = isFollowUp ? 'detailed' : 'normal';
      
      // Store ALL results in session for follow-ups (not just top results)
      if (currentUserId && scoredUsers.length > 0) {
        const intelligentContext = require('./intelligentContextService');
        intelligentContext.storeSearchResults(
          currentUserId, 
          scoredUsers.map(r => r.user), // Store all scored users, not just top
          query,
          intent
        );
      }

      // Check if user wants WhatsApp numbers
      const wantsWhatsApp = intent.wantsContact || /whatsapp|phone|number|contact.*number/i.test(query);
      
      // Format results with clean structure
      const formattedResults = await Promise.all(topResults.map(async (result, index) => {
        const user = result.user;
        const profile = this.extractProfileData(user);
        
        // Clean, structured format
        return this.formatProfileClean(profile, index + 1);
      }));
      
      // Join results with clear separator
      const finalMessage = formattedResults.join('\n\n---\n\n');
      
      return finalMessage;

    } catch (error) {
      logError(error, { operation: 'formatSearchResults' });
      return this.simpleFormatResults(users.slice(0, 2), query);
    }
  }

  // Format profile in clean structure
  formatProfileClean(profile, index) {
    const lines = [];
    
    // Profile number and name
    lines.push(`👤 Profile ${index}:`);
    lines.push(`Name: ${profile.name}`);
    
    // Location
    if (profile.location) {
      lines.push(`Location: ${profile.location}`);
    }
    
    // Professional info
    if (profile.headline || profile.company) {
      const professional = [];
      if (profile.headline) professional.push(profile.headline);
      if (profile.company) professional.push(`at ${profile.company}`);
      lines.push(`Role: ${professional.join(' ')}`);
    }
    
    // Skills - clean and concise
    if (profile.skills && profile.skills.length > 0) {
      const topSkills = profile.skills.slice(0, 5).join(', ');
      lines.push(`Skills: ${topSkills}`);
    }
    
    // About - brief excerpt
    if (profile.about) {
      const aboutBrief = profile.about.substring(0, 100).replace(/\n/g, ' ').trim();
      lines.push(`About: ${aboutBrief}${profile.about.length > 100 ? '...' : ''}`);
    }
    
    // Contact information
    const contacts = [];
    if (profile.email) contacts.push(`📧 ${profile.email}`);
    if (profile.linkedin) {
      const linkedinClean = profile.linkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//g, '');
      contacts.push(`🔗 linkedin.com/in/${linkedinClean}`);
    }
    
    if (contacts.length > 0) {
      lines.push(`Contact: ${contacts.join(' | ')}`);
    }
    
    return lines.join('\n');
  }

  // Generate intelligent AI-powered profile summary
  async generateIntelligentSummary(profile, query, intent, includeContact = true, detailLevel = 'normal', includeWhatsApp = false) {
    try {
      // Determine what user is looking for
      const wantsNameLocation = /who|name|where|location|from where|city|country/i.test(query);
      const wantsContact = /contact|email|linkedin|connect|reach/i.test(query);
      const wantsDetailed = /more|detail|about|tell me|elaborate/i.test(query) || detailLevel === 'detailed';
      
      const prompt = `Create a compelling professional summary for this alumni based on the search query.

Search: "${query}"

Profile:
- Name: ${profile.name}
- Role: ${profile.headline || profile.professionalRole || 'Professional'}
- Company: ${profile.company}
- Location: ${profile.location}
- About: ${profile.about}
- Skills: ${profile.skills.join(', ')}
- Experience: ${profile.experience.map(e => `${e.title} at ${e.company}`).join('; ')}
- Education: ${profile.education.map(e => e.title).join('; ')}
- Domain: ${profile.domain}
- Can help with: ${profile.yatraHelp}
- Looking for: ${profile.communityAsks.join(', ')}
- Can offer: ${profile.communityGives.join(', ')}

Instructions:
1. Write ONLY 2-3 lines maximum
2. First line: Name, location, and primary expertise relevant to "${query}"
3. Second line: Key skills or achievements that match the search
4. Third line (optional): What they can offer/help with
5. End with contact info ONLY if available: ${profile.email || profile.linkedin ? `Contact: ${profile.email || 'Email not available'}${profile.linkedin ? ' | ' + profile.linkedin : ''}` : 'Contact info not available'}${includeWhatsApp && profile.whatsapp ? ' | WhatsApp: ' + profile.whatsapp : ''}
6. BE CONCISE - no flowery language or long sentences
7. Focus ONLY on what matches the search query

Write a brief, impactful summary:`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 150
      });

      let summary = completion.choices[0].message.content.trim();
      
      // Add contact only if requested
      if ((wantsContact || includeContact) && !summary.includes(profile.email)) {
        if (includeWhatsApp && profile.whatsapp) {
          summary += `\n📧 ${profile.email} | 🔗 ${profile.linkedin} | 📱 WhatsApp: ${profile.whatsapp}`;
        } else {
          summary += `\n📧 ${profile.email} | 🔗 ${profile.linkedin}`;
        }
      }
      
      return summary;
    } catch (error) {
      // Concise fallback
      const lines = [];
      
      // Line 1: Name, location, role
      const namePart = profile.name;
      const locationPart = profile.location ? `, ${profile.location}` : '';
      const rolePart = profile.headline || profile.company || 'Professional';
      lines.push(`${namePart}${locationPart} - ${rolePart}`);
      
      // Line 2: Key expertise
      if (profile.skills.length > 0) {
        lines.push(`Skills: ${profile.skills.slice(0, 3).join(', ')}`);
      } else if (profile.domain) {
        lines.push(`Domain: ${profile.domain}`);
      }
      
      // Contact line - only if available
      const contactParts = [];
      if (profile.email) contactParts.push(profile.email);
      if (profile.linkedin) contactParts.push(profile.linkedin);
      if (includeWhatsApp && profile.whatsapp) contactParts.push(`WhatsApp: ${profile.whatsapp}`);
      
      if (contactParts.length > 0) {
        lines.push(`Contact: ${contactParts.join(' | ')}`);
      }
      
      return lines.join('\n');
    }
  }

  // Get related terms for better search
  getRelatedTerms(skill) {
    const relatedMap = {
      'developer': ['development', 'programmer', 'coding', 'software'],
      'web': ['frontend', 'backend', 'fullstack', 'website'],
      'import': ['export', 'trade', 'trading', 'international business'],
      'export': ['import', 'trade', 'trading', 'international business'],
      'ai': ['artificial intelligence', 'machine learning', 'ml', 'data science'],
      'ml': ['machine learning', 'ai', 'artificial intelligence', 'data science'],
      'entrepreneur': ['founder', 'startup', 'business owner', 'co-founder'],
      'founder': ['entrepreneur', 'ceo', 'co-founder', 'startup']
    };
    
    const lower = skill.toLowerCase();
    return relatedMap[lower] || [];
  }
  
  // Expand industry terms
  expandIndustryTerms(industry) {
    const lower = industry.toLowerCase();
    const terms = [industry];
    
    if (lower.includes('import') || lower.includes('export')) {
      terms.push('trade', 'trading', 'international business', 'import export', 'import-export');
    }
    
    if (lower.includes('tech')) {
      terms.push('technology', 'software', 'it');
    }
    
    return terms;
  }

  // Extract profile data from user object
  extractProfileData(user) {
    const basicProfile = user.basicProfile || {};
    const linkedinData = basicProfile.linkedinScrapedData || {};
    const enhancedProfile = user.enhancedProfile || {};
    
    return {
      name: enhancedProfile.fullName || linkedinData.fullName || basicProfile.name || 'Unknown',
      headline: linkedinData.headline || linkedinData.currentCompanyTitle || enhancedProfile.professionalRole || '',
      location: linkedinData.location || enhancedProfile.currentAddress || enhancedProfile.country || '',
      company: linkedinData.currentCompany || linkedinData.experience?.[0]?.company || '',
      email: basicProfile.email || enhancedProfile.email || '',
      linkedin: basicProfile.linkedin || enhancedProfile.linkedin || '',
      about: linkedinData.about || basicProfile.about || '',
      skills: linkedinData.skills || [],
      experience: linkedinData.experience || [],
      education: linkedinData.education || [],
      domain: enhancedProfile.domain || '',
      yatraHelp: enhancedProfile.yatraHelp || '',
      communityAsks: enhancedProfile.communityAsks || [],
      communityGives: enhancedProfile.communityGives || []
    };
  }

  // Create professional summary using all available profile data
  createProfessionalSummary(profile, intent) {
    let summary = [];
    
    // Add about section if available
    if (profile.about) {
      const aboutPreview = profile.about.substring(0, 150);
      summary.push(aboutPreview + (profile.about.length > 150 ? '...' : ''));
    }
    
    // Add skills if matching search intent
    if (profile.skills.length > 0) {
      const relevantSkills = profile.skills.slice(0, 5).join(', ');
      summary.push(`💪 Skills: ${relevantSkills}`);
    }
    
    // Add experience highlight
    if (profile.experience.length > 0) {
      const recentExp = profile.experience[0];
      if (recentExp.title && recentExp.company) {
        summary.push(`🏢 Experience: ${recentExp.title} at ${recentExp.company}`);
      }
    }
    
    // Add domain/industry
    if (profile.domain) {
      summary.push(`🎯 Domain: ${profile.domain}`);
    }
    
    // Add what they can help with
    if (profile.yatraHelp && typeof profile.yatraHelp === 'string') {
      summary.push(`🤝 Can help with: ${profile.yatraHelp.substring(0, 100)}...`);
    }
    
    return summary.join('\n');
  }

  // Simple fallback formatting
  simpleFormatResults(users, query) {
    const results = users.slice(0, 3).map((user, index) => {
      const profile = this.extractProfileData(user);
      
      // Concise format: Name, Role/Location
      const nameLine = `${index + 1}. ${profile.name}${profile.location ? `, ${profile.location}` : ''}`;
      const roleSkills = profile.headline || (profile.skills.length > 0 ? profile.skills.slice(0, 2).join(', ') : 'Professional');
      
      // Contact line
      const contactParts = [];
      if (profile.email) contactParts.push(profile.email);
      if (profile.linkedin) contactParts.push(profile.linkedin);
      const contact = contactParts.length > 0 ? `Contact: ${contactParts.join(' | ')}` : '';
      
      return `${nameLine}\n${roleSkills}${contact ? '\n' + contact : ''}`;
    }).join('\n---\n');

    return results;
  }

  // Main search method
  async search(query, currentUser) {
    try {
      logSuccess('enhanced_search_initiated', { query, userId: currentUser?._id });

      // Extract search intent using AI
      const intent = await this.extractSearchIntent(query);
      logSuccess('search_intent_extracted', { intent });

      // Build MongoDB query with original query for better context
      const searchQuery = this.buildSearchQuery(intent, query);
      
      // Execute search
      const db = getDatabase();
      
      // If no specific query conditions, do a broader search
      if (Object.keys(searchQuery).length === 0 || (searchQuery.$or && searchQuery.$or.length === 0)) {
        // Check if this is a location-specific query that wasn't caught
        const locationSpecificMatch = /(.+?)\s+from\s+(.+)/i.exec(query);
        if (locationSpecificMatch) {
          // Manually build location-specific query
          const [, searchTerm, location] = locationSpecificMatch;
          searchQuery = {
            $and: [
              {
                $or: [
                  { 'basicProfile.linkedinScrapedData.location': { $regex: location, $options: 'i' } },
                  { 'enhancedProfile.currentAddress': { $regex: location, $options: 'i' } },
                  { 'enhancedProfile.country': { $regex: location, $options: 'i' } }
                ]
              },
              {
                $or: searchTerm.toLowerCase().split(/\s+/).filter(word => 
                  !['the', 'in', 'at', 'any', 'all'].includes(word)
                ).map(keyword => [
                  { 'basicProfile.linkedinScrapedData.headline': { $regex: keyword, $options: 'i' } },
                  { 'basicProfile.linkedinScrapedData.skills': { $regex: keyword, $options: 'i' } },
                  { 'basicProfile.about': { $regex: keyword, $options: 'i' } },
                  { 'enhancedProfile.professionalRole': { $regex: keyword, $options: 'i' } }
                ]).flat()
              }
            ]
          };
        } else {
          // Check if this is a "who is" query
          const whoIsMatch = /who\s+is\s+(.+)/i.exec(query);
          if (whoIsMatch) {
            const personName = whoIsMatch[1].trim();
            // Search specifically by name for "who is" queries
            searchQuery = {
              $or: [
                { 'basicProfile.name': { $regex: personName, $options: 'i' } },
                { 'basicProfile.linkedinScrapedData.fullName': { $regex: personName, $options: 'i' } },
                { 'enhancedProfile.fullName': { $regex: personName, $options: 'i' } }
              ]
            };
          } else {
            // Check if searching for educational institutions like IIT
            const educationMatch = /(IIT|NIT|BITS|COEP|college|university|institute|graduates?|alumni)/i.test(query);
            if (educationMatch) {
              // Focus search on education fields
              const searchTerms = query.split(/\s+/).filter(term => term.length > 2);
              searchQuery = {
                $or: searchTerms.map(term => [
                  { 'basicProfile.linkedinScrapedData.education.title': { $regex: term, $options: 'i' } },
                  { 'basicProfile.linkedinScrapedData.education.degree': { $regex: term, $options: 'i' } },
                  { 'basicProfile.linkedinScrapedData.education.field': { $regex: term, $options: 'i' } },
                  { 'basicProfile.about': { $regex: term, $options: 'i' } },
                  { 'enhancedProfile.yatraHelp': { $regex: term, $options: 'i' } }
                ]).flat()
              };
            } else {
              // Fallback to text search on the original query
              searchQuery = {
                $or: [
                  { 'basicProfile.name': { $regex: query, $options: 'i' } },
                  { 'basicProfile.about': { $regex: query, $options: 'i' } },
                  { 'basicProfile.linkedinScrapedData.headline': { $regex: query, $options: 'i' } },
                  { 'basicProfile.linkedinScrapedData.about': { $regex: query, $options: 'i' } },
                  { 'basicProfile.linkedinScrapedData.location': { $regex: query, $options: 'i' } },
                  { 'basicProfile.linkedinScrapedData.currentCompany': { $regex: query, $options: 'i' } },
                  { 'basicProfile.linkedinScrapedData.education.title': { $regex: query, $options: 'i' } },
                  { 'enhancedProfile.currentAddress': { $regex: query, $options: 'i' } }
                ]
              };
            }
          }
        }
      }
      
      const users = await db.collection('users')
        .find(searchQuery)
        .limit(100)  // Increased to ensure we get more results
        .toArray();

      logSuccess('search_executed', { 
        query, 
        resultsCount: users.length,
        intent: intent.intent 
      });

      // Format and return results
      return await this.formatSearchResults(users, query, intent, currentUser?._id);

    } catch (error) {
      logError(error, { operation: 'enhancedSearch', query });
      return "I encountered an error while searching. Please try again with different keywords.";
    }
  }

  // Search for similar profiles (for recommendations)
  async findSimilarProfiles(user, limit = 5) {
    try {
      const userSkills = user.basicProfile?.linkedinScrapedData?.skills || [];
      const userLocation = user.basicProfile?.linkedinScrapedData?.location || user.enhancedProfile?.country;
      const userIndustry = user.enhancedProfile?.domain;

      const conditions = [];

      // Similar skills
      if (userSkills.length > 0) {
        conditions.push({
          'basicProfile.linkedinScrapedData.skills': { 
            $in: userSkills.map(skill => new RegExp(skill, 'i')) 
          }
        });
      }

      // Similar location
      if (userLocation) {
        conditions.push({
          $or: [
            { 'basicProfile.linkedinScrapedData.location': { $regex: userLocation, $options: 'i' } },
            { 'enhancedProfile.country': { $regex: userLocation, $options: 'i' } }
          ]
        });
      }

      // Similar industry
      if (userIndustry) {
        conditions.push({
          'enhancedProfile.domain': userIndustry
        });
      }

      if (conditions.length === 0) return [];

      const db = getDatabase();
      const similarUsers = await db.collection('users')
        .find({
          $or: conditions,
          _id: { $ne: user._id }
        })
        .limit(limit)
        .toArray();

      return similarUsers;
    } catch (error) {
      logError(error, { operation: 'findSimilarProfiles' });
      return [];
    }
  }
}

module.exports = new EnhancedSearchService();