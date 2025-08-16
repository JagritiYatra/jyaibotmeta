// Proper Search Service - Actually finds the RIGHT profiles
// No more returning random irrelevant results

const { getDatabase } = require('../config/database');
const { logError, logSuccess } = require('../middleware/logging');
const OpenAI = require('openai');
const { getConfig } = require('../config/environment');

// Initialize OpenAI
let openai;
const config = getConfig();
if (config.ai?.apiKey) {
  openai = new OpenAI({ apiKey: config.ai.apiKey });
}

class ProperSearchService {
  constructor() {
    this.lastSearchResults = new Map();
  }

  // Main search function that ACTUALLY WORKS
  async searchProperly(query, user, context) {
    try {
      console.log('🔍 Proper Search for:', query);
      
      // Check if it's a general knowledge question
      if (this.isGeneralKnowledge(query)) {
        return await this.handleGeneralKnowledge(query);
      }
      
      // Extract what user is ACTUALLY looking for
      const searchIntent = await this.extractRealIntent(query);
      console.log('📊 Search Intent:', JSON.stringify(searchIntent));
      
      // Build PROPER database query
      const dbQuery = this.buildProperQuery(searchIntent);
      console.log('🔨 DB Query:', JSON.stringify(dbQuery));
      
      // Execute search
      const results = await this.executeSearch(dbQuery);
      console.log(`📦 Found ${results.length} results`);
      
      // Filter to get ONLY relevant results
      const relevantResults = this.filterRelevantResults(results, searchIntent);
      console.log(`✅ ${relevantResults.length} relevant results after filtering`);
      
      // Store for follow-up questions
      if (user?._id) {
        this.lastSearchResults.set(user._id.toString(), relevantResults);
      }
      
      // Format response
      return this.formatProperResponse(relevantResults, searchIntent, query);
      
    } catch (error) {
      console.error('Search error:', error);
      return "I'm having trouble searching. Please try again with specific criteria like 'web developers in Pune' or 'lawyers in Mumbai'.";
    }
  }

  // Check if it's a general knowledge question
  isGeneralKnowledge(query) {
    const patterns = [
      /^what is/i,
      /^define/i,
      /^explain/i,
      /^how (does|do|to)/i,
      /^why/i,
      /scope of/i,
      /difference between/i,
      /^tell me about(?! people| alumni| someone)/i
    ];
    return patterns.some(p => p.test(query));
  }

  // Handle general knowledge questions
  async handleGeneralKnowledge(query) {
    try {
      const prompt = `Answer this question concisely and informatively:
"${query}"

Provide a clear, helpful answer in 2-3 paragraphs. Format for WhatsApp.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 400
      });

      return completion.choices[0].message.content;
    } catch (error) {
      return `I understand you're asking about "${query}". While I specialize in connecting alumni, I can help with general questions too. Could you be more specific?`;
    }
  }

  // Extract REAL search intent
  async extractRealIntent(query) {
    const lower = query.toLowerCase();
    const intent = {
      skills: [],
      locations: [],
      roles: [],
      needsHelp: false,
      specific: []
    };
    
    // Web developer variations
    if (lower.includes('web') || lower.includes('developer')) {
      intent.skills.push('web', 'developer', 'javascript', 'react', 'frontend', 'backend', 'html', 'css', 'node');
      intent.roles.push('developer', 'engineer', 'programmer');
    }
    
    // Legal/Law variations
    if (lower.includes('legal') || lower.includes('law')) {
      intent.skills.push('law', 'legal');
      intent.roles.push('lawyer', 'advocate', 'legal advisor', 'attorney');
      intent.needsHelp = lower.includes('help');
    }
    
    // HTTP/Technical problems
    if (lower.includes('http') || lower.includes('technical')) {
      intent.skills.push('network', 'http', 'technical', 'backend', 'devops', 'infrastructure');
      intent.roles.push('developer', 'engineer', 'devops', 'architect');
    }
    
    // Locations
    const cities = ['pune', 'mumbai', 'bangalore', 'delhi', 'chennai', 'kolkata', 'hyderabad', 
                   'ahmedabad', 'jaipur', 'noida', 'gurgaon', 'gurugram'];
    cities.forEach(city => {
      if (lower.includes(city)) {
        intent.locations.push(city);
      }
    });
    
    // Specific names
    const nameMatch = query.match(/who is (\w+)/i);
    if (nameMatch) {
      intent.specific.push(nameMatch[1]);
    }
    
    return intent;
  }

  // Build PROPER MongoDB query
  buildProperQuery(intent) {
    const conditions = [];
    
    // If searching for specific person
    if (intent.specific.length > 0) {
      const nameConditions = [];
      intent.specific.forEach(name => {
        nameConditions.push(
          { 'basicProfile.name': { $regex: name, $options: 'i' } },
          { 'enhancedProfile.fullName': { $regex: name, $options: 'i' } },
          { 'basicProfile.linkedinScrapedData.fullName': { $regex: name, $options: 'i' } }
        );
      });
      return { $or: nameConditions };
    }
    
    // Location filter (MUST match if specified)
    if (intent.locations.length > 0) {
      const locConditions = [];
      intent.locations.forEach(loc => {
        locConditions.push(
          { 'basicProfile.linkedinScrapedData.location': { $regex: loc, $options: 'i' } },
          { 'enhancedProfile.city': { $regex: loc, $options: 'i' } },
          { 'enhancedProfile.state': { $regex: loc, $options: 'i' } },
          { 'enhancedProfile.currentAddress': { $regex: loc, $options: 'i' } }
        );
      });
      conditions.push({ $or: locConditions });
    }
    
    // Skills/Role filter
    if (intent.skills.length > 0 || intent.roles.length > 0) {
      const skillConditions = [];
      
      [...intent.skills, ...intent.roles].forEach(term => {
        // Check in headline (most reliable)
        skillConditions.push(
          { 'basicProfile.linkedinScrapedData.headline': { $regex: term, $options: 'i' } }
        );
        
        // Check in experience titles
        skillConditions.push(
          { 'basicProfile.linkedinScrapedData.experience.title': { $regex: term, $options: 'i' } }
        );
        
        // Check in about section
        skillConditions.push(
          { 'basicProfile.about': { $regex: term, $options: 'i' } }
        );
        
        // Check professional role
        if (intent.roles.includes(term)) {
          skillConditions.push(
            { 'enhancedProfile.professionalRole': { $regex: term, $options: 'i' } }
          );
        }
      });
      
      if (skillConditions.length > 0) {
        conditions.push({ $or: skillConditions });
      }
    }
    
    // Must have some data
    conditions.push({
      $or: [
        { 'basicProfile.name': { $exists: true, $ne: null, $ne: '' } },
        { 'enhancedProfile.fullName': { $exists: true, $ne: null, $ne: '' } }
      ]
    });
    
    return conditions.length > 0 ? { $and: conditions } : {};
  }

  // Execute search
  async executeSearch(query) {
    const db = getDatabase();
    return await db.collection('users')
      .find(query)
      .limit(50)
      .toArray();
  }

  // Filter to get ONLY relevant results
  filterRelevantResults(results, intent) {
    if (results.length === 0) return [];
    
    // Score each result
    const scored = results.map(user => {
      let score = 0;
      let matches = [];
      
      const userData = JSON.stringify(user).toLowerCase();
      
      // Location matching (HIGH priority)
      if (intent.locations.length > 0) {
        const hasLocation = intent.locations.some(loc => userData.includes(loc.toLowerCase()));
        if (hasLocation) {
          score += 20;
          matches.push('location');
        } else {
          // If location specified but doesn't match, penalize heavily
          score -= 30;
        }
      }
      
      // Skills matching
      if (intent.skills.length > 0) {
        const headline = (user.basicProfile?.linkedinScrapedData?.headline || '').toLowerCase();
        const about = (user.basicProfile?.about || '').toLowerCase();
        const experience = JSON.stringify(user.basicProfile?.linkedinScrapedData?.experience || []).toLowerCase();
        
        intent.skills.forEach(skill => {
          if (headline.includes(skill) || experience.includes(skill)) {
            score += 10;
            matches.push(skill);
          } else if (about.includes(skill)) {
            score += 5;
            matches.push(skill);
          }
        });
      }
      
      // Role matching
      if (intent.roles.length > 0) {
        const headline = (user.basicProfile?.linkedinScrapedData?.headline || '').toLowerCase();
        const role = (user.enhancedProfile?.professionalRole || '').toLowerCase();
        
        intent.roles.forEach(r => {
          if (headline.includes(r) || role.includes(r)) {
            score += 15;
            matches.push('role');
          }
        });
      }
      
      // Penalize students if looking for professionals
      if (intent.needsHelp) {
        if (userData.includes('student')) {
          score -= 20;
        }
        if (userData.includes('professional') || userData.includes('expert')) {
          score += 10;
        }
      }
      
      return { ...user, relevanceScore: score, matches };
    });
    
    // Sort by score
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Return only positive scores, max 3
    return scored.filter(r => r.relevanceScore > 0).slice(0, 3);
  }

  // Format PROPER response
  formatProperResponse(results, intent, query) {
    if (results.length === 0) {
      return this.getNoResultsMessage(intent, query);
    }
    
    let response = `Found ${results.length} relevant ${results.length === 1 ? 'match' : 'matches'}:\n\n`;
    
    results.forEach((user, index) => {
      const name = user.enhancedProfile?.fullName || 
                  user.basicProfile?.linkedinScrapedData?.fullName || 
                  user.basicProfile?.name || 'Unknown';
      
      const headline = user.basicProfile?.linkedinScrapedData?.headline || 
                      user.enhancedProfile?.professionalRole || 
                      'Professional';
      
      const location = user.basicProfile?.linkedinScrapedData?.location || 
                      user.enhancedProfile?.city || 
                      'Location not specified';
      
      const company = user.basicProfile?.linkedinScrapedData?.currentCompany || '';
      
      response += `*${index + 1}. ${name}*\n`;
      response += `💼 ${headline}\n`;
      if (company) response += `🏢 ${company}\n`;
      response += `📍 ${location}\n`;
      
      // Add relevant experience if searching for skills
      if (intent.skills.length > 0) {
        const experience = user.basicProfile?.linkedinScrapedData?.experience || [];
        const relevantExp = experience.find(exp => 
          intent.skills.some(skill => 
            (exp.title || '').toLowerCase().includes(skill.toLowerCase())
          )
        );
        if (relevantExp) {
          response += `📋 ${relevantExp.title} at ${relevantExp.company}\n`;
        }
      }
      
      // LinkedIn
      const linkedin = user.basicProfile?.linkedin || user.enhancedProfile?.linkedin;
      if (linkedin) {
        response += `🔗 ${linkedin}\n`;
      }
      
      if (index < results.length - 1) {
        response += '\n';
      }
    });
    
    return response;
  }

  // No results message
  getNoResultsMessage(intent, query) {
    let message = `No matches found for "${query}"\n\n`;
    
    if (intent.locations.length > 0) {
      message += `❌ No alumni found in ${intent.locations.join(', ')}\n`;
      message += `Try searching without location filter or in different cities.\n\n`;
    }
    
    if (intent.skills.length > 0) {
      const skills = intent.skills.slice(0, 3).join(', ');
      message += `❌ No one with ${skills} skills found\n`;
      message += `Try broader terms or different skills.\n\n`;
    }
    
    message += `💡 Try searching for:\n`;
    message += `• "entrepreneurs" (without location)\n`;
    message += `• "people in Mumbai" (just location)\n`;
    message += `• "founders" or "students"\n`;
    
    return message;
  }
}

module.exports = new ProperSearchService();