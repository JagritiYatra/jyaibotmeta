// General Question Service
// Handles general knowledge queries with concise 5-line responses
// Includes intelligent profile suggestions based on query context

const { getDatabase } = require('../config/database');
const { logError } = require('../middleware/logging');
const UnifiedIntelligenceService = require('./unifiedIntelligenceService');

class GeneralQuestionService {
  // Process general knowledge questions with profile suggestions
  static async processGeneralQuestion(message, whatsappNumber) {
    try {
      // First check if structured response is available
      const profiles = await this.getAvailableProfiles();
      const structuredResponse = await this.generateStructuredResponse(message, profiles);
      
      if (structuredResponse) {
        return structuredResponse;
      }

      // Otherwise use unified intelligence to generate response
      const response = await UnifiedIntelligenceService.generateKnowledgeResponse(
        message,
        { whatsappNumber: whatsappNumber || 'system' }
      );

      return response;
    } catch (error) {
      logError('General question processing error:', error);
      return this.getFallbackResponse(message);
    }
  }

  // Get profiles from database for potential matching
  static async getAvailableProfiles() {
    try {
      const db = getDatabase();

      // Get random sample of verified profiles
      const profiles = await db
        .collection('users')
        .aggregate([
          {
            $match: {
              'enhancedProfile.completed': true,
              'enhancedProfile.skills': { $exists: true },
            },
          },
          { $sample: { size: 100 } },
          {
            $project: {
              name: { $ifNull: ['$enhancedProfile.fullName', '$basicProfile.name'] },
              skills: '$enhancedProfile.skills',
              company: '$enhancedProfile.company',
              professionalRole: '$enhancedProfile.professionalRole',
              about: '$enhancedProfile.about',
              city: '$enhancedProfile.city',
              email: { $ifNull: ['$primaryEmail', '$email'] },
              linkedin: '$enhancedProfile.linkedin',
              _id: 1,
            },
          },
        ])
        .toArray();

      return profiles;
    } catch (error) {
      logError('Get available profiles error:', error);
      return [];
    }
  }

  // Generate structured response for common topics
  static async generateStructuredResponse(topic, profiles = []) {
    const topicLower = topic.toLowerCase();

    // Common topic handlers
    if (topicLower.includes('artificial intelligence') || topicLower.includes('ai')) {
      return this.generateAIResponse(profiles);
    }

    if (topicLower.includes('startup') || topicLower.includes('entrepreneur')) {
      return this.generateStartupResponse(profiles);
    }

    if (topicLower.includes('marketing') || topicLower.includes('sales')) {
      return this.generateMarketingResponse(profiles);
    }

    if (topicLower.includes('technology') || topicLower.includes('software')) {
      return this.generateTechnologyResponse(profiles);
    }

    if (topicLower.includes('agriculture') || topicLower.includes('farming')) {
      return this.generateAgricultureResponse(profiles);
    }

    // Default to AI-generated response
    return null;
  }

  // AI topic response
  static generateAIResponse(profiles) {
    let response = `Artificial Intelligence is revolutionizing how we work and live.
AI includes machine learning, natural language processing, and computer vision.
It powers everything from chatbots to self-driving cars and medical diagnostics.
Key skills include Python, TensorFlow, data science, and problem-solving.
The future involves ethical AI, AGI research, and human-AI collaboration.`;

    const aiProfiles = profiles
      .filter(
        (p) =>
          (p.skills && p.skills.toLowerCase().includes('ai')) ||
          (p.skills && p.skills.toLowerCase().includes('machine learning')) ||
          (p.professionalRole && p.professionalRole.toLowerCase().includes('data'))
      )
      .slice(0, 2);

    if (aiProfiles.length > 0) {
      response += '\n\n**AI Professionals:**';
      aiProfiles.forEach((p) => {
        const name = p.name || 'Alumni Member';
        const role = p.professionalRole || 'AI Professional';
        const company = p.company || 'Tech Company';
        const email = p.email || 'Contact via network';
        const linkedin = p.linkedin 
          ? (p.linkedin.startsWith('http') ? p.linkedin : `https://linkedin.com/in/${p.linkedin}`)
          : null;
        
        response += `\n\n👤 **${name}**\n${role} at ${company}\n📧 ${email}`;
        if (linkedin) response += `\n🔗 ${linkedin}`;
      });
    }

    return response;
  }

  // Startup topic response
  static generateStartupResponse(profiles) {
    let response = `Startups are ventures designed to grow fast and solve real problems.
Key elements include finding product-market fit, building MVP, and scaling.
Funding stages: bootstrapping, angel investment, VC rounds, and IPO.
Success requires resilience, customer focus, and continuous innovation.
India's startup ecosystem is thriving with 100+ unicorns and growing.`;

    const startupProfiles = profiles
      .filter(
        (p) =>
          (p.company && p.company.toLowerCase().includes('founder')) ||
          (p.professionalRole && p.professionalRole.toLowerCase().includes('founder')) ||
          (p.professionalRole && p.professionalRole.toLowerCase().includes('entrepreneur'))
      )
      .slice(0, 2);

    if (startupProfiles.length > 0) {
      response += '\n\n**Entrepreneurs:**';
      startupProfiles.forEach((p) => {
        const name = p.name || 'Alumni Member';
        const role = p.professionalRole || 'Entrepreneur';
        const company = p.company || 'Startup';
        const email = p.email || 'Contact via network';
        const linkedin = p.linkedin 
          ? (p.linkedin.startsWith('http') ? p.linkedin : `https://linkedin.com/in/${p.linkedin}`)
          : null;
        
        response += `\n\n👤 **${name}**\n${role} at ${company}\n📧 ${email}`;
        if (linkedin) response += `\n🔗 ${linkedin}`;
      });
    }

    return response;
  }

  // Marketing topic response
  static generateMarketingResponse(profiles) {
    let response = `Marketing connects products with customers through strategic communication.
Modern marketing spans digital, content, social media, and data analytics.
Key skills: SEO/SEM, content creation, analytics, branding, and storytelling.
Trends include AI-powered personalization, influencer marketing, and video content.
Success requires understanding consumer psychology and market dynamics.`;

    const marketingProfiles = profiles
      .filter(
        (p) =>
          (p.skills && p.skills.toLowerCase().includes('marketing')) ||
          (p.professionalRole && p.professionalRole.toLowerCase().includes('marketing'))
      )
      .slice(0, 2);

    if (marketingProfiles.length > 0) {
      response += '\n\n**Marketing Experts:**';
      marketingProfiles.forEach((p) => {
        const name = p.name || 'Alumni Member';
        const role = p.professionalRole || 'Marketing Professional';
        const company = p.company || 'Company';
        const email = p.email || 'Contact via network';
        const linkedin = p.linkedin 
          ? (p.linkedin.startsWith('http') ? p.linkedin : `https://linkedin.com/in/${p.linkedin}`)
          : null;
        
        response += `\n\n👤 **${name}**\n${role} at ${company}\n📧 ${email}`;
        if (linkedin) response += `\n🔗 ${linkedin}`;
      });
    }

    return response;
  }

  // Technology topic response
  static generateTechnologyResponse(profiles) {
    let response = `Technology is the backbone of modern innovation and digital transformation.
Key areas include cloud computing, cybersecurity, mobile apps, and IoT.
Programming languages like Python, JavaScript, and Java dominate the field.
Emerging tech includes blockchain, quantum computing, and edge computing.
Continuous learning is essential as technology evolves rapidly.`;

    const techProfiles = profiles
      .filter(
        (p) =>
          (p.skills &&
            (p.skills.toLowerCase().includes('developer') ||
              p.skills.toLowerCase().includes('engineer'))) ||
          (p.professionalRole && p.professionalRole.toLowerCase().includes('tech'))
      )
      .slice(0, 2);

    if (techProfiles.length > 0) {
      response += '\n\n**Tech Professionals:**';
      techProfiles.forEach((p) => {
        const name = p.name || 'Alumni Member';
        const role = p.professionalRole || 'Tech Professional';
        const company = p.company || 'Tech Company';
        const email = p.email || 'Contact via network';
        const linkedin = p.linkedin 
          ? (p.linkedin.startsWith('http') ? p.linkedin : `https://linkedin.com/in/${p.linkedin}`)
          : null;
        
        response += `\n\n👤 **${name}**\n${role} at ${company}\n📧 ${email}`;
        if (linkedin) response += `\n🔗 ${linkedin}`;
      });
    }

    return response;
  }

  // Agriculture topic response
  static generateAgricultureResponse(profiles) {
    let response = `Agriculture feeds the world and is transforming through technology.
Modern farming uses precision agriculture, drones, and IoT sensors.
Sustainable practices include organic farming, crop rotation, and water conservation.
Agritech startups are revolutionizing supply chains and farmer incomes.
India's agricultural sector employs 44% of the workforce and drives rural economy.`;

    const agriProfiles = profiles
      .filter(
        (p) =>
          (p.skills && p.skills.toLowerCase().includes('agri')) ||
          (p.professionalRole && p.professionalRole.toLowerCase().includes('agri')) ||
          (p.company && p.company.toLowerCase().includes('farm'))
      )
      .slice(0, 2);

    if (agriProfiles.length > 0) {
      response += '\n\n**Agriculture Innovators:**';
      agriProfiles.forEach((p) => {
        const name = p.name || 'Alumni Member';
        const role = p.professionalRole || 'Agriculture Professional';
        const company = p.company || 'AgriTech';
        const email = p.email || 'Contact via network';
        const linkedin = p.linkedin 
          ? (p.linkedin.startsWith('http') ? p.linkedin : `https://linkedin.com/in/${p.linkedin}`)
          : null;
        
        response += `\n\n👤 **${name}**\n${role} at ${company}\n📧 ${email}`;
        if (linkedin) response += `\n🔗 ${linkedin}`;
      });
    }

    return response;
  }

  // Get fallback response for unknown topics
  static getFallbackResponse(message) {
    const messageLower = message.toLowerCase();

    if (messageLower.includes('what is') || messageLower.includes('tell me about')) {
      return `That's an interesting topic! Let me help you understand it better.
This subject involves multiple aspects and perspectives to consider.
It's important to look at both theoretical and practical applications.
Many professionals in our network have expertise in this area.
Would you like me to connect you with alumni who can share deeper insights?`;
    }

    if (messageLower.includes('how to') || messageLower.includes('how do')) {
      return `Great question! Here's a general approach to consider:
Start by understanding the fundamentals and core concepts involved.
Practice regularly and learn from both successes and failures.
Connect with experienced practitioners who can guide your journey.
Our alumni network has experts who've successfully navigated this path.`;
    }

    return `Thanks for your question! This is an area worth exploring.
Consider researching current trends and best practices in this field.
Learning from experts and real-world examples accelerates understanding.
Our alumni network includes professionals with relevant experience.
Would you like to connect with someone who can provide detailed insights?`;
  }

  // Format profile for display
  static formatProfileForDisplay(profile) {
    const enhancedProfile = {
      name: profile.name || 'Alumni Member',
      role: profile.professionalRole || 'Professional',
      company: profile.company || 'Organization',
      location: profile.city || 'India',
      skills: profile.skills || 'Various skills',
      email: profile.email || 'Contact via network',
      linkedin: profile.linkedin
        ? profile.linkedin.startsWith('http')
          ? profile.linkedin
          : `https://linkedin.com/in/${profile.linkedin}`
        : 'LinkedIn not available',
    };

    return `**${enhancedProfile.name}**
${enhancedProfile.role} at ${enhancedProfile.company}
📍 ${enhancedProfile.location}
💼 ${enhancedProfile.skills}
📧 ${enhancedProfile.email}
🔗 ${enhancedProfile.linkedin}`;
  }
}

module.exports = GeneralQuestionService;
