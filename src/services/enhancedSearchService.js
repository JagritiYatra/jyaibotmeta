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
      const prompt = `Analyze this search query and extract key information:
Query: "${query}"

Extract:
1. Person names (if any)
2. Locations (cities, states, countries)
3. Companies/Organizations
4. Skills/Technologies
5. Professional roles/titles
6. Industries/Domains
7. Search intent (finding experts, location-based search, skill search, etc.)

Return as JSON format:
{
  "names": [],
  "locations": [],
  "companies": [],
  "skills": [],
  "roles": [],
  "industries": [],
  "intent": "description of what user is looking for",
  "keywords": []
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      logError(error, { operation: 'extractSearchIntent', query });
      // Fallback to basic keyword extraction
      return {
        keywords: query.toLowerCase().split(/\s+/),
        intent: 'general search'
      };
    }
  }

  // Build MongoDB query from extracted intent
  buildSearchQuery(intent) {
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
          { 'basicProfile.linkedinScrapedData.education.title': { $regex: company, $options: 'i' } }
        );
      });
    }

    // Skills search - enhanced to check multiple fields
    if (intent.skills && intent.skills.length > 0) {
      intent.skills.forEach(skill => {
        orConditions.push(
          { 'basicProfile.linkedinScrapedData.skills': { $regex: skill, $options: 'i' } },
          { 'basicProfile.about': { $regex: skill, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.about': { $regex: skill, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.headline': { $regex: skill, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.currentCompanyTitle': { $regex: skill, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.title': { $regex: skill, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.experience.description': { $regex: skill, $options: 'i' } }
        );
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

    // Industry search
    if (intent.industries && intent.industries.length > 0) {
      intent.industries.forEach(industry => {
        orConditions.push(
          { 'enhancedProfile.domain': { $regex: industry, $options: 'i' } },
          { 'basicProfile.about': { $regex: industry, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.about': { $regex: industry, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.headline': { $regex: industry, $options: 'i' } }
        );
      });
    }

    // General keyword search as fallback
    if (intent.keywords && intent.keywords.length > 0) {
      intent.keywords.forEach(keyword => {
        // Skip common words
        if (!['the', 'in', 'at', 'from', 'list', 'show', 'find', 'me'].includes(keyword.toLowerCase())) {
          orConditions.push(
            { 'basicProfile.name': { $regex: keyword, $options: 'i' } },
            { 'basicProfile.about': { $regex: keyword, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.headline': { $regex: keyword, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.about': { $regex: keyword, $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.currentCompanyTitle': { $regex: keyword, $options: 'i' } }
          );
        }
      });
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

  // Format search results with AI-powered summaries
  async formatSearchResults(users, query, intent) {
    try {
      if (users.length === 0) {
        return "No alumni found matching your search criteria. Try different keywords or broaden your search.";
      }

      // Sort by relevance score
      const scoredUsers = users.map(user => ({
        user,
        score: this.calculateRelevanceScore(user, intent)
      })).sort((a, b) => b.score - a.score);

      // Take top 10 results
      const topResults = scoredUsers.slice(0, 10);

      // Generate AI summary for each result
      const formattedResults = await Promise.all(topResults.map(async (result, index) => {
        const user = result.user;
        const profile = {
          name: user.basicProfile?.linkedinScrapedData?.fullName || user.basicProfile?.name || 'Unknown',
          headline: user.basicProfile?.linkedinScrapedData?.headline || '',
          location: user.basicProfile?.linkedinScrapedData?.location || user.enhancedProfile?.country || '',
          company: user.basicProfile?.linkedinScrapedData?.currentCompany || '',
          role: user.basicProfile?.linkedinScrapedData?.currentCompanyTitle || user.enhancedProfile?.professionalRole || '',
          about: user.basicProfile?.about || user.basicProfile?.linkedinScrapedData?.about || '',
          skills: user.basicProfile?.linkedinScrapedData?.skills || [],
          linkedin: user.basicProfile?.linkedin || ''
        };

        // Generate smart summary
        const summary = await this.generateProfileSummary(profile, query);
        
        return `${index + 1}. **${profile.name}** ${profile.location ? `📍 ${profile.location}` : ''}
${profile.headline || profile.role}
${profile.company ? `🏢 ${profile.company}` : ''}
${summary}
${profile.linkedin ? `🔗 [LinkedIn Profile](${profile.linkedin})` : ''}
`;
      }));

      const header = `Found ${users.length} alumni matching "${query}"\n\n`;
      return header + formattedResults.join('\n---\n\n');

    } catch (error) {
      logError(error, { operation: 'formatSearchResults' });
      // Fallback to simple formatting
      return this.simpleFormatResults(users, query);
    }
  }

  // Generate AI-powered profile summary
  async generateProfileSummary(profile, query) {
    try {
      const prompt = `Based on this search query: "${query}"
And this profile information:
- Name: ${profile.name}
- Role: ${profile.role}
- Company: ${profile.company}
- Location: ${profile.location}
- About: ${profile.about.substring(0, 200)}...
- Skills: ${profile.skills.slice(0, 5).join(', ')}

Generate a 2-3 line summary highlighting why this person is relevant to the search query. Focus on their expertise and what value they can provide.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 100
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      // Fallback to basic summary
      return `${profile.skills.slice(0, 3).join(', ')} expert with experience in ${profile.company || 'various organizations'}.`;
    }
  }

  // Simple fallback formatting
  simpleFormatResults(users, query) {
    const results = users.slice(0, 10).map((user, index) => {
      const name = user.basicProfile?.name || 'Unknown';
      const location = user.basicProfile?.linkedinScrapedData?.location || '';
      const company = user.basicProfile?.linkedinScrapedData?.currentCompany || '';
      const role = user.basicProfile?.linkedinScrapedData?.currentCompanyTitle || '';
      
      return `${index + 1}. **${name}** ${location ? `📍 ${location}` : ''}
${role} ${company ? `at ${company}` : ''}`;
    }).join('\n\n');

    return `Found ${users.length} alumni matching "${query}"\n\n${results}`;
  }

  // Main search method
  async search(query, currentUser) {
    try {
      logSuccess('enhanced_search_initiated', { query, userId: currentUser?._id });

      // Extract search intent using AI
      const intent = await this.extractSearchIntent(query);
      logSuccess('search_intent_extracted', { intent });

      // Build MongoDB query
      const searchQuery = this.buildSearchQuery(intent);
      
      // Execute search
      const db = getDatabase();
      const users = await db.collection('users')
        .find(searchQuery)
        .limit(50)
        .toArray();

      logSuccess('search_executed', { 
        query, 
        resultsCount: users.length,
        intent: intent.intent 
      });

      // Format and return results
      return await this.formatSearchResults(users, query, intent);

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