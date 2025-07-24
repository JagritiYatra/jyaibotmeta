// AI-Enhanced Alumni Search Service with intelligent reconnection system
// File: src/services/searchService.js
// ENHANCED VERSION - AI-powered relevance scoring and crisp profile rewriting

const OpenAI = require('openai');
const { getDatabase } = require('../config/database');
const { getConfig } = require('../config/environment');
const { logError, logSuccess, logAIOperation } = require('../middleware/logging');
const { sanitizeInput } = require('../utils/validation');
const { logUserQuery } = require('./analyticsService');
const UnifiedIntelligenceService = require('./unifiedIntelligenceService');

let openai;
try {
  const config = getConfig();
  if (config.ai.apiKey) {
    openai = new OpenAI({
      apiKey: config.ai.apiKey,
      timeout: 30000,
    });
  }
} catch (error) {
  console.warn('⚠️ OpenAI not initialized for search service');
}

// Enhanced search keywords for better matching
const SEARCH_ENHANCEMENT_MAP = {
  'web dev': 'web development frontend backend javascript react nodejs',
  'web development': 'web development frontend backend javascript react nodejs',
  'web developers': 'web development frontend backend javascript react nodejs developers',
  'developers': 'developers software engineering programming coding development',
  'developer': 'developer software engineering programming coding development',
  devops: 'devops development operations infrastructure deployment automation cloud',
  react: 'react javascript frontend development programming web ui',
  marketing: 'marketing advertising digital promotion branding social media',
  fintech: 'fintech financial technology banking payments digital finance',
  healthtech: 'healthtech healthcare medical technology digital health',
  edtech: 'edtech education technology learning digital education',
  agritech: 'agritech agriculture technology farming digital agriculture',
  startup: 'startup entrepreneur business founder venture',
  ai: 'artificial intelligence machine learning data science AI ML',
  blockchain: 'blockchain cryptocurrency crypto distributed ledger',
  mobile: 'mobile app android ios flutter react native',
  design: 'design UI UX user interface user experience graphic',
  sales: 'sales business development customer acquisition revenue',
  hr: 'human resources talent management recruitment hiring',
  legal: 'legal compliance law regulatory corporate legal',
  consulting: 'consulting advisory strategy business consulting',
  finance: 'finance accounting financial analysis investment banking',
  'akash': 'akash',
  'akash jadhav': 'akash jadhav',
};

// Store shown profiles to prevent duplicates in follow-ups
const shownProfilesCache = new Map();

// Clear cache when new search is different from previous
function shouldClearCache(newQuery, userWhatsApp) {
  const lastQuery = shownProfilesCache.get(`${userWhatsApp}_lastQuery`);
  if (!lastQuery || lastQuery.toLowerCase() !== newQuery.toLowerCase()) {
    clearShownProfilesForUser(userWhatsApp);
    shownProfilesCache.set(`${userWhatsApp}_lastQuery`, newQuery);
    return true;
  }
  return false;
}

// Clear shown profiles cache when switching searches
function clearShownProfilesForUser(userWhatsApp) {
  if (userWhatsApp) {
    shownProfilesCache.delete(userWhatsApp);
  }
}

// Main comprehensive alumni search function
async function comprehensiveAlumniSearch(query, userWhatsApp = null, excludeProfiles = []) {
  try {
    // Clear cache if this is a new search
    shouldClearCache(query, userWhatsApp);
    // Check if no relevant profiles found - suggest alternative profiles
    const handleNoResults = async (originalQuery) => {
      const db = getDatabase();
      // Get 2 random verified profiles as suggestions
      const suggestions = await db
        .collection('users')
        .aggregate([
          {
            $match: {
              'enhancedProfile.completed': true,
              'enhancedProfile.skills': { $exists: true },
            },
          },
          { $sample: { size: 2 } },
          {
            $project: {
              'basicProfile.name': 1,
              'basicProfile.email': 1,
              'basicProfile.about': 1,
              'basicProfile.linkedin': 1,
              'enhancedProfile': 1,
            },
          },
        ])
        .toArray();

      if (suggestions.length > 0) {
        let response = `No exact matches for "${originalQuery}"\n\nSimilar professionals you might find helpful:\n\n`;
        const formattedSuggestions = await generateCleanSearchResponse(
          suggestions,
          originalQuery,
          userWhatsApp
        );
        return response + formattedSuggestions;
      }

      return `No profiles found for "${originalQuery}".\n\nTry different keywords or broader search terms.`;
    };
    const db = getDatabase();
    if (!db) {
      return generateErrorResponse('database_unavailable');
    }

    const sanitizedQuery = sanitizeInput(query);

    // Step 0: Apply typo correction
    const correctedQuery = correctCommonTypos(sanitizedQuery);
    console.log(
      `🔍 Starting AI-enhanced search for: "${correctedQuery}"${correctedQuery !== sanitizedQuery ? ` (corrected from: "${sanitizedQuery}")` : ''}`
    );

    // Step 1: AI-powered keyword extraction
    const keywords = await extractSearchKeywords(correctedQuery);

    // Step 2: Database search with enhanced queries
    const searchResults = await performDatabaseSearch(keywords, userWhatsApp, excludeProfiles);

    if (searchResults.length === 0) {
      return await handleNoResults(sanitizedQuery);
    }

    // Step 3: AI-powered relevance scoring and selection (top 3-4 only)
    const topResults = await selectTopResults(searchResults, sanitizedQuery, keywords);

    // Step 4: AI-enhanced profile rewriting for better presentation
    const enhancedResults = await enhanceProfilesWithAI(topResults, sanitizedQuery);

    // Step 5: Generate clean, focused response
    const response = await generateCleanSearchResponse(enhancedResults, sanitizedQuery, userWhatsApp);
    
    // Track shown profiles to prevent duplicates in follow-ups
    if (userWhatsApp && topResults.length > 0) {
      const shownEmails = topResults.map(r => r.basicProfile?.email).filter(Boolean);
      const currentShown = shownProfilesCache.get(userWhatsApp) || [];
      shownProfilesCache.set(userWhatsApp, [...currentShown, ...shownEmails]);
    }

    // Step 6: Log search for analytics
    await logUserQuery(
      userWhatsApp,
      sanitizedQuery,
      'alumni_search',
      searchResults.length,
      topResults.length
    );

    return response;
  } catch (error) {
    logError(error, { operation: 'comprehensiveAlumniSearch', query });
    await logUserQuery(userWhatsApp, query, 'search_error', 0, 0);
    return generateErrorResponse('search_failed');
  }
}

// AI-powered keyword extraction with fallback
async function extractSearchKeywords(query) {
  try {
    const config = getConfig();

    // Try AI extraction first
    if (openai) {
      const startTime = Date.now();

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract relevant search keywords from user queries for professional alumni networking.

Rules:
- Extract EXACT search terms from the query
- If query is just "developers", focus on developer-related keywords
- If query is "web developers", focus on web development keywords
- For names, return the exact name as primary keyword
- Include 5-8 relevant related terms
- Return as JSON array of strings only, no other text

Examples:
"developers" → ["developers", "developer", "software", "engineering", "programming", "coding", "tech"]
"web developers" → ["web developers", "web development", "frontend", "backend", "javascript", "react", "nodejs"]
"akash jadhav" → ["akash jadhav", "akash", "jadhav"]
"connect me with developers" → ["developers", "developer", "software", "engineering", "programming"]`,
          },
          {
            role: 'user',
            content: `Extract keywords from: "${query}"`,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      let aiResponse = response.choices[0].message.content.trim();
      aiResponse = aiResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/`/g, '');

      const aiKeywords = JSON.parse(aiResponse);
      const duration = Date.now() - startTime;

      logAIOperation(
        'keyword_extraction',
        response.usage?.total_tokens || 0,
        'gpt-4o-mini',
        duration
      );

      if (Array.isArray(aiKeywords) && aiKeywords.length > 0) {
        console.log(`🎯 AI extracted keywords: ${aiKeywords.join(', ')}`);
        return aiKeywords;
      }
    }

    // Fallback to rule-based extraction
    return extractKeywordsFallback(query);
  } catch (error) {
    logError(error, { operation: 'extractSearchKeywords', query });
    return extractKeywordsFallback(query);
  }
}

// Fallback keyword extraction
function extractKeywordsFallback(query) {
  const normalizedQuery = query.toLowerCase();
  let keywords = [];

  // Apply search enhancement mappings
  Object.entries(SEARCH_ENHANCEMENT_MAP).forEach(([key, value]) => {
    if (normalizedQuery.includes(key)) {
      keywords.push(...value.split(' '));
    }
  });

  // Extract direct keywords from query
  const directKeywords = normalizedQuery
    .replace(/\b(help|need|want|looking|find|search|connect|assistance|support|with|for|in)\b/g, '')
    .split(/[,\s]+/)
    .filter((word) => word.length > 2)
    .slice(0, 8);

  keywords.push(...directKeywords);

  // Remove duplicates and limit
  keywords = [...new Set(keywords)].slice(0, 12);

  console.log(`🎯 Fallback extracted keywords: ${keywords.join(', ')}`);
  return keywords;
}

// Enhanced database search
async function performDatabaseSearch(keywords, userWhatsApp = null, excludeProfiles = []) {
  try {
    const db = getDatabase();
    const regexPattern = keywords.join('|');

    // Get previously shown profiles for this user
    const shownProfiles = shownProfilesCache.get(userWhatsApp) || [];
    const excludeEmails = [...new Set([...shownProfiles, ...(excludeProfiles || [])])];

    // Build search query
    const searchQuery = {
      $and: [
        {
          $or: [
            { 'basicProfile.about': { $regex: regexPattern, $options: 'i' } },
            { 'basicProfile.name': { $regex: regexPattern, $options: 'i' } },
            { 'enhancedProfile.fullName': { $regex: regexPattern, $options: 'i' } },
            { 'enhancedProfile.domain': { $regex: regexPattern, $options: 'i' } },
            { 'enhancedProfile.professionalRole': { $regex: regexPattern, $options: 'i' } },
            { 'enhancedProfile.city': { $regex: regexPattern, $options: 'i' } },
            { 'enhancedProfile.state': { $regex: regexPattern, $options: 'i' } },
            { 'enhancedProfile.country': { $regex: regexPattern, $options: 'i' } },
            { 'enhancedProfile.communityAsks': { $regex: regexPattern, $options: 'i' } },
            { 'enhancedProfile.communityGives': { $regex: regexPattern, $options: 'i' } },
            { 'enhancedProfile.yatraImpact': { $regex: regexPattern, $options: 'i' } },
          ],
        },
        // Exclude previously shown profiles
        ...(excludeEmails.length > 0
          ? [{ 'basicProfile.email': { $nin: excludeEmails } }]
          : []),
        // Exclude the searching user
        ...(userWhatsApp
          ? [
              {
                $and: [
                  {
                    $or: [
                      { whatsappNumber: { $ne: userWhatsApp } },
                      { whatsappNumber: { $exists: false } },
                    ],
                  },
                  {
                    $or: [
                      {
                        whatsappNumbers: {
                          $not: {
                            $elemMatch: {
                              $regex: userWhatsApp.replace(/[^\d]/g, ''),
                              $options: 'i',
                            },
                          },
                        },
                      },
                      { whatsappNumbers: { $exists: false } },
                    ],
                  },
                ],
              },
            ]
          : []),
      ],
    };

    // Execute search with projection
    const results = await db
      .collection('users')
      .find(searchQuery, {
        projection: {
          'basicProfile.name': 1,
          'basicProfile.email': 1,
          'basicProfile.about': 1,
          'basicProfile.linkedin': 1,
          'enhancedProfile.fullName': 1,
          'enhancedProfile.domain': 1,
          'enhancedProfile.professionalRole': 1,
          'enhancedProfile.city': 1,
          'enhancedProfile.state': 1,
          'enhancedProfile.country': 1,
          'enhancedProfile.linkedin': 1,
          'enhancedProfile.communityGives': 1,
          'enhancedProfile.communityAsks': 1,
          'enhancedProfile.yatraImpact': 1,
          'metadata.lastActive': 1,
        },
      })
      .limit(20) // Limit for performance
      .toArray();

    console.log(`📊 Database search completed: ${results.length} matches found`);
    return results;
  } catch (error) {
    logError(error, { operation: 'performDatabaseSearch', keywords });
    return [];
  }
}

// AI-powered selection of top results (2-3 only to prevent message length issues)
async function selectTopResults(searchResults, originalQuery, keywords) {
  try {
    const config = getConfig();
    const maxResults = 3; // Reduced to 2-3 to prevent message length issues

    if (searchResults.length <= maxResults) {
      return searchResults;
    }

    // Use AI for intelligent selection
    if (openai && searchResults.length > 0) {
      const startTime = Date.now();

      // Prepare profiles for AI analysis
      const profilesForAI = searchResults.slice(0, 15).map((user) => ({
        email: user.basicProfile?.email || 'no-email',
        name: user.enhancedProfile?.fullName || user.basicProfile?.name || 'Name not available',
        about: (user.basicProfile?.about || '').substring(0, 150),
        role: user.enhancedProfile?.professionalRole || 'Role not specified',
        domain: user.enhancedProfile?.domain || 'Domain not specified',
        location:
          `${user.enhancedProfile?.city || ''}, ${user.enhancedProfile?.state || ''}`
            .replace(', ,', '')
            .trim() || 'Location not specified',
        gives: user.enhancedProfile?.communityGives || [],
        asks: user.enhancedProfile?.communityAsks || [],
      }));

      const response = await openai.chat.completions.create({
        model: config.ai.model,
        messages: [
          {
            role: 'system',
            content: `Select the TOP ${maxResults} MOST RELEVANT alumni profiles for the user's query.

Ranking Criteria:
1. Direct skill/expertise match
2. Professional role relevance
3. Industry domain alignment
4. Geographic relevance (if specified)
5. Community contributions that match needs

Return ONLY a JSON array of the ${maxResults} most relevant profile emails in order of relevance:
["email1@example.com", "email2@example.com", ...]`,
          },
          {
            role: 'user',
            content: `User query: "${originalQuery}"
Keywords: ${keywords.join(', ')}

Profiles:
${JSON.stringify(profilesForAI, null, 2)}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.1,
      });

      let aiResponse = response.choices[0].message.content.trim();
      aiResponse = aiResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/`/g, '');

      const selectedEmails = JSON.parse(aiResponse);
      const duration = Date.now() - startTime;

      logAIOperation(
        'result_selection',
        response.usage?.total_tokens || 0,
        config.ai.model,
        duration
      );

      if (Array.isArray(selectedEmails)) {
        const topResults = selectedEmails
          .map((email) => searchResults.find((user) => user.basicProfile?.email === email))
          .filter(Boolean)
          .slice(0, maxResults);

        console.log(`🏆 AI selected ${topResults.length} top results`);
        return topResults;
      }
    }

    // Fallback to simple scoring
    return selectResultsFallback(searchResults, keywords, maxResults);
  } catch (error) {
    logError(error, { operation: 'selectTopResults' });
    return selectResultsFallback(searchResults, keywords, 3);
  }
}

// Fallback result selection
function selectResultsFallback(searchResults, keywords, maxResults) {
  const scored = searchResults.map((user) => {
    let score = 0;

    const searchableText = [
      user.basicProfile?.about || '',
      user.basicProfile?.name || '',
      user.enhancedProfile?.fullName || '',
      user.enhancedProfile?.domain || '',
      user.enhancedProfile?.professionalRole || '',
      user.enhancedProfile?.city || '',
      user.enhancedProfile?.state || '',
      ...(user.enhancedProfile?.communityGives || []),
      ...(user.enhancedProfile?.communityAsks || []),
    ]
      .join(' ')
      .toLowerCase();

    keywords.forEach((keyword) => {
      if (searchableText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    });

    // Bonus for profile completeness
    if (user.enhancedProfile?.completed) score += 2;
    if (user.enhancedProfile?.linkedin) score += 1;
    if (user.enhancedProfile?.communityGives?.length > 0) score += 1;

    return { user, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((item) => item.user);
}

// AI-enhanced profile rewriting for better presentation
async function enhanceProfilesWithAI(profiles, originalQuery) {
  if (!openai || profiles.length === 0) {
    return profiles;
  }

  try {
    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Rewrite the "about" sections of these alumni profiles to be crisp, professional, and human-like.

Rules:
- Keep it authentic and genuine
- Make it 2-3 sentences max
- Don't exaggerate or oversell
- Focus on expertise and value they can provide
- Maintain professional tone
- Don't change names, emails, or LinkedIn URLs
- Return JSON array with same structure but enhanced "about" field

Format: [{"email": "...", "enhanced_about": "rewritten about section"}, ...]`,
        },
        {
          role: 'user',
          content: `Enhance these profiles for query: "${originalQuery}"

Profiles:
${JSON.stringify(
  profiles.map((profile) => ({
    email: profile.basicProfile?.email,
    name: profile.enhancedProfile?.fullName || profile.basicProfile?.name,
    current_about: profile.basicProfile?.about || '',
    role: profile.enhancedProfile?.professionalRole,
    domain: profile.enhancedProfile?.domain,
  })),
  null,
  2
)}`,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    let aiResponse = response.choices[0].message.content.trim();
    aiResponse = aiResponse
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/`/g, '');

    const enhancements = JSON.parse(aiResponse);
    const duration = Date.now() - startTime;

    logAIOperation('profile_enhancement', response.usage?.total_tokens || 0, 'gpt-4o', duration);

    // Apply enhancements
    const enhancedProfiles = profiles.map((profile) => {
      const enhancement = enhancements.find((e) => e.email === profile.basicProfile?.email);
      if (enhancement && enhancement.enhanced_about) {
        return {
          ...profile,
          basicProfile: {
            ...profile.basicProfile,
            about: enhancement.enhanced_about,
          },
        };
      }
      return profile;
    });

    console.log(`✨ AI enhanced ${enhancements.length} profiles`);
    return enhancedProfiles;
  } catch (error) {
    logError(error, { operation: 'enhanceProfilesWithAI' });
    return profiles; // Return original on error
  }
}

// Generate clean, focused search response with length limit handling
async function generateCleanSearchResponse(results, originalQuery, userWhatsapp = null) {
  try {
    if (results.length === 0) {
      return generateNoResultsResponse(originalQuery);
    }

    const MAX_MESSAGE_LENGTH = 1500; // Leave some buffer for WhatsApp limit
    const INITIAL_PROFILES_TO_SHOW = 2; // Show 2 complete profiles initially
    let response = '';
    let addedProfiles = 0;

    // If more than 2 results, store extras for later
    if (results.length > INITIAL_PROFILES_TO_SHOW && userWhatsapp) {
      const db = getDatabase();
      await db.collection('search_overflow').updateOne(
        { whatsappNumber: userWhatsapp },
        {
          $set: {
            remainingResults: results.slice(INITIAL_PROFILES_TO_SHOW),
            originalQuery,
            timestamp: new Date(),
            totalResults: results.length
          }
        },
        { upsert: true }
      );
    }

    // Show only initial profiles to prevent truncation
    const profilesToShow = results.slice(0, INITIAL_PROFILES_TO_SHOW);

    for (let i = 0; i < profilesToShow.length; i++) {
      const user = results[i];
      const basicProfile = user.basicProfile || {};
      const enhancedProfile = user.enhancedProfile || {};

      // Use unified intelligence to enhance profile display
      const enhancedProfileData = await UnifiedIntelligenceService.enhanceProfileDisplay({
        name: enhancedProfile.fullName || basicProfile.name,
        about: basicProfile.about || enhancedProfile.about,
        skills: enhancedProfile.skills || enhancedProfile.domain,
        company: enhancedProfile.company || enhancedProfile.organization,
        professionalRole: enhancedProfile.professionalRole,
        city: enhancedProfile.city,
        state: enhancedProfile.state,
        email: basicProfile.email || enhancedProfile.primaryEmail,
        primaryEmail: enhancedProfile.primaryEmail,
        linkedin: enhancedProfile.linkedin || basicProfile.linkedin,
      });

      const { name } = enhancedProfileData;
      let about = enhancedProfileData.enhancedAbout || enhancedProfileData.about || '';
      const { email } = enhancedProfileData;
      const { linkedin } = enhancedProfileData;

      // Show complete about section without truncation

      // Build profile string with COMPLETE information
      let profileString = `**${name}**\n`;
      
      // Add professional role and company if available
      if (enhancedProfile.professionalRole) {
        profileString += `💼 ${enhancedProfile.professionalRole}`;
        if (enhancedProfile.company || enhancedProfile.organization) {
          profileString += ` at ${enhancedProfile.company || enhancedProfile.organization}`;
        }
        profileString += '\n';
      }
      
      // Add location if available
      if (enhancedProfile.city || enhancedProfile.state) {
        profileString += `📍 ${enhancedProfile.city || ''}${enhancedProfile.city && enhancedProfile.state ? ', ' : ''}${enhancedProfile.state || ''}\n`;
      }

      // Add complete about section
      if (about && about.length > 10) {
        profileString += `**About:** ${about}\n`;
      }
      
      // Add skills/domain if available
      if (enhancedProfile.domain || enhancedProfile.skills) {
        profileString += `🎯 **Skills:** ${enhancedProfile.domain || enhancedProfile.skills}\n`;
      }
      
      // Add what they can give to community
      if (enhancedProfile.communityGives && enhancedProfile.communityGives.length > 0) {
        profileString += `🤝 **Can help with:** ${enhancedProfile.communityGives.slice(0, 2).join(', ')}\n`;
      }

      // Add complete email
      profileString += `📧 ${email}\n`;

      // Add complete LinkedIn URL
      if (linkedin) {
        // Ensure LinkedIn URL is complete
        const linkedinUrl = linkedin.startsWith('http')
          ? linkedin
          : `https://linkedin.com/in/${linkedin.replace('@', '').replace('linkedin.com/in/', '')}`;
        profileString += `🔗 ${linkedinUrl}`;
      }

      // Add spacing between profiles (except for last one)
      if (i < results.length - 1) {
        profileString += '\n\n';
      }

      // Check if adding this profile would exceed limit
      if (response.length + profileString.length > MAX_MESSAGE_LENGTH) {
        // If we haven't added any profiles yet, add at least one (truncated)
        if (addedProfiles === 0) {
          // Create a very short version
          const shortProfile = `**${name}**\n📧 ${email}\n${linkedin ? `🔗 ${linkedin}` : ''}`;
          if (shortProfile.length <= MAX_MESSAGE_LENGTH) {
            response += shortProfile;
            addedProfiles++;
          }
        }
        break;
      }

      response += profileString;
      addedProfiles++;
    }

    // Store remaining results for "show more" functionality without showing the prompts
    if (results.length > INITIAL_PROFILES_TO_SHOW) {
      // Store overflow results in database for "show more" requests
      try {
        const db = getDatabase();
        await db.collection('search_overflow').replaceOne(
          { whatsappNumber: userWhatsApp },
          {
            whatsappNumber: userWhatsApp,
            remainingResults: results.slice(INITIAL_PROFILES_TO_SHOW),
            originalQuery,
            timestamp: new Date()
          },
          { upsert: true }
        );
      } catch (error) {
        // Fail silently - main search still works
      }
    }

    return response;
  } catch (error) {
    logError(error, { operation: 'generateCleanSearchResponse' });
    return generateErrorResponse('response_generation_failed');
  }
}

// Generate no results response with suggestions
function generateNoResultsResponse(query) {
  return `No exact matches for "${query}" found.

Try:
• Broader terms: "developer", "business", "marketing"
• By role: "entrepreneur", "consultant", "founder"
• By industry: "fintech", "healthtech", "edtech"
• By location: "Mumbai", "Bangalore", "Delhi"

What expertise are you looking for?`;
}

// Generate error responses
function generateErrorResponse(errorType) {
  const responses = {
    database_unavailable: '😔 Database temporarily unavailable. Please try again in a moment.',
    search_failed:
      'I\'m having a technical hiccup! 😅\n\nPlease try again, or try simpler terms like:\n• "web developers"\n• "business mentors"\n• "marketing help"',
    response_generation_failed:
      'I found matches but had trouble formatting the response. Please try again or contact support.',
  };

  return responses[errorType] || 'Something went wrong. Please try again.';
}

// Search analytics and insights
async function getSearchAnalytics(timeframe = '24h') {
  try {
    const db = getDatabase();
    const now = new Date();
    let startTime;

    switch (timeframe) {
      case '1h':
        startTime = new Date(now - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now - 24 * 60 * 60 * 1000);
    }

    const analytics = await db
      .collection('queries')
      .aggregate([
        {
          $match: {
            timestamp: { $gte: startTime },
            queryType: 'alumni_search',
          },
        },
        {
          $group: {
            _id: null,
            totalSearches: { $sum: 1 },
            avgMatches: { $avg: '$totalMatches' },
            avgTopMatches: { $avg: '$topMatches' },
            uniqueUsers: { $addToSet: '$whatsappNumber' },
          },
        },
        {
          $addFields: {
            uniqueUserCount: { $size: '$uniqueUsers' },
          },
        },
      ])
      .toArray();

    return (
      analytics[0] || {
        totalSearches: 0,
        avgMatches: 0,
        avgTopMatches: 0,
        uniqueUserCount: 0,
      }
    );
  } catch (error) {
    logError(error, { operation: 'getSearchAnalytics', timeframe });
    return { error: 'Unable to fetch search analytics' };
  }
}

// Common typo corrections for search terms
function correctCommonTypos(query) {
  const corrections = {
    // Technical terms
    enignerring: 'engineering',
    enginerring: 'engineering',
    engg: 'engineering',
    developement: 'development',
    programing: 'programming',
    desgin: 'design',
    finace: 'finance',
    managment: 'management',
    bussiness: 'business',
    buisness: 'business',
    marketting: 'marketing',
    consultent: 'consultant',
    analysist: 'analyst',
    entrpreneur: 'entrepreneur',
    tecnology: 'technology',
    sofware: 'software',

    // Common domains
    chemcial: 'chemical',
    mecanical: 'mechanical',
    electical: 'electrical',
    compter: 'computer',
    fintec: 'fintech',
    edtec: 'edtech',
    healthtec: 'healthtech',
    agritec: 'agritech',

    // Cities
    mumabi: 'mumbai',
    dehli: 'delhi',
    bangalor: 'bangalore',
    banglaore: 'bangalore',
    hydrabad: 'hyderabad',
    chenai: 'chennai',
    pune: 'pune',
    puna: 'pune',
  };

  let correctedQuery = query.toLowerCase();

  // Apply corrections
  Object.entries(corrections).forEach(([typo, correct]) => {
    const regex = new RegExp(`\\b${typo}\\b`, 'gi');
    correctedQuery = correctedQuery.replace(regex, correct);
  });

  // Fix common patterns
  correctedQuery = correctedQuery.replace(/\b(\w+)n+g\b/g, (match, prefix) => {
    // Fix multiple 'n's in -ing words (e.g., "enginnerring" → "engineering")
    if (corrections[match.toLowerCase()]) {
      return corrections[match.toLowerCase()];
    }
    return match;
  });

  return correctedQuery;
}

module.exports = {
  comprehensiveAlumniSearch,
  extractSearchKeywords,
  performDatabaseSearch,
  selectTopResults,
  enhanceProfilesWithAI,
  generateCleanSearchResponse,
  getSearchAnalytics,
};
