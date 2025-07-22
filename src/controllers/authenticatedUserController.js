// God-level authenticated user controller with perfect UX flow
// File: src/controllers/authenticatedUserController.js
// PERFECT VERSION - Amazing user experience with smart flows

const {
  getIncompleteFields,
  updateUserProfile,
  markProfileCompleted,
  getProfileCompletionPercentage,
  findUserByWhatsAppNumber,
  linkAdditionalEmail,
} = require('../models/User');
const { comprehensiveAlumniSearch } = require('../services/searchService');
const ContextAwareSearchService = require('../services/contextAwareSearchService');
const EnhancedMemoryService = require('../services/enhancedMemoryService');
const { checkDailyLimit } = require('../services/rateLimiter');
const { handleCasualConversation } = require('./conversationController');
const {
  validateProfileField,
  getFieldPrompt,
  generateResumeGreeting,
  getFieldDisplayName,
  generateSmartHelp,
} = require('./profileController');
const { logUserActivity, logError } = require('../middleware/logging');
const UnifiedIntelligenceService = require('../services/unifiedIntelligenceService');
const { JagritiYatraKnowledgeService } = require('../services/jagritiYatraKnowledge');
const GeneralQuestionService = require('../services/generalQuestionService');

// God-level main handler
async function handleAuthenticatedUser(userMessage, intent, userSession, whatsappNumber) {
  try {
    // Always get fresh user data from database
    const freshUser = await findUserByWhatsAppNumber(whatsappNumber);
    const user = freshUser || userSession.user_data;

    // Update session with fresh user data
    if (freshUser) {
      userSession.user_data = freshUser;
    }

    const userName = user.enhancedProfile?.fullName || user.basicProfile?.name || 'there';
    const firstName = userName.split(' ')[0];

    logUserActivity(whatsappNumber, 'authenticated_user_interaction', {
      intent: intent.type,
      sessionState: userSession.waiting_for,
      profileComplete: !!user.enhancedProfile?.completed,
      userName,
    });

    // Check profile completion status
    const completionPercentage = getProfileCompletionPercentage(user);
    const incompleteFields = getIncompleteFields(user);
    const isProfileComplete =
      user.enhancedProfile?.completed === true || incompleteFields.length === 0;

    // PRIORITY 1: Handle profile updates FIRST (before AI intents)
    if (userSession.waiting_for && userSession.waiting_for.startsWith('updating_')) {
      return await handleProfileFieldUpdate(userMessage, intent, userSession, whatsappNumber);
    }

    // PRIORITY 1.5: Handle profile input intent
    if (intent.type === 'profile_input' && userSession.waiting_for) {
      return await handleProfileFieldUpdate(userMessage, intent, userSession, whatsappNumber);
    }

    // PRIORITY 2: Handle additional email input
    if (userSession.waiting_for === 'additional_email_input') {
      return await handleAdditionalEmailInput(userMessage, intent, userSession, whatsappNumber);
    }

    // PRIORITY 3: Handle Instagram URL input
    if (userSession.waiting_for === 'instagram_url_input') {
      return await handleInstagramURLInput(userMessage, intent, userSession, whatsappNumber);
    }

    // PRIORITY 4: Handle AI-detected intents (casual chat, Jagriti info, general knowledge)
    if (
      intent.type === 'casual_chat' ||
      intent.type === 'jagriti_info' ||
      intent.type === 'general_knowledge'
    ) {
      // Don't handle casual chat if we're waiting for profile input
      if (userSession.waiting_for && userSession.waiting_for.includes('updating_')) {
        return await handleProfileFieldUpdate(userMessage, intent, userSession, whatsappNumber);
      }

      if (intent.type === 'casual_chat') {
        const aiResponse = await UnifiedIntelligenceService.generateResponse(
          userMessage,
          intent,
          whatsappNumber
        );
        if (!isProfileComplete) {
          return `${aiResponse}

📊 **BTW:** Your profile is ${completionPercentage}% complete. Type "hi" to finish it!`;
        }
        return aiResponse;
      }

      if (intent.type === 'jagriti_info') {
        const jagritiResponse = JagritiYatraKnowledgeService.getFormattedResponse(userMessage);
        return jagritiResponse;
      }

      if (intent.type === 'general_knowledge') {
        const knowledgeResponse = await GeneralQuestionService.processGeneralQuestion(
          userMessage,
          whatsappNumber
        );
        return knowledgeResponse;
      }
    }

    // PRIORITY 5: Smart "Hi" trigger with perfect UX
    if ((intent.type === 'casual' || intent.type === 'casual_chat') && !isProfileComplete) {
      // Check if it's specifically a greeting
      const greetingWords = [
        'hi',
        'hello',
        'hey',
        'hola',
        'namaste',
        'good morning',
        'good evening',
        'good afternoon',
      ];
      const isGreeting = greetingWords.some((word) => userMessage.toLowerCase().includes(word));

      if (isGreeting && !userSession.profile_completion_started) {
        const resumeGreeting = generateResumeGreeting(user);

        // Set up session to resume from next incomplete field
        const nextField = incompleteFields[0];
        userSession.waiting_for = `updating_${nextField}`;
        userSession.current_field = nextField;
        userSession.remaining_fields = incompleteFields.slice(1);
        userSession.incomplete_fields = incompleteFields;
        userSession.profile_completion_started = true;

        return `${resumeGreeting}

Let's start with:

**${getFieldDisplayName(nextField)}**

${await getFieldPrompt(nextField, userSession)}`;
      }
    }

    // Already handled above, so this section can be removed

    // PRIORITY 5: Search Intent with helpful guidance
    if (
      intent.type === 'search' ||
      intent.type === 'skip_and_search' ||
      intent.type === 'profile_search' ||
      intent.type === 'location_search' ||
      intent.type === 'follow_up_search'
    ) {
      if (!isProfileComplete) {
        const firstField = incompleteFields[0];
        const totalFields = incompleteFields.length;
        const timeEstimate = totalFields * 1; // 1 minute per field

        userSession.waiting_for = `updating_${firstField}`;
        userSession.current_field = firstField;
        userSession.remaining_fields = incompleteFields.slice(1);
        userSession.incomplete_fields = incompleteFields;
        userSession.search_blocked = true;

        return `🔒 **Search Access Locked**

Hi ${firstName}! To protect our alumni privacy, we need verified profiles.

📊 **Your Progress:** ${completionPercentage}%
⏱️ **Time to Complete:** ~${timeEstimate} minutes
🎯 **Fields Remaining:** ${totalFields}

Let's quickly complete your profile:

**${getFieldDisplayName(firstField)}**

${await getFieldPrompt(firstField, userSession)}

💡 Type "skip" anytime to pause`;
      }

      // Profile complete - proceed with context-aware search
      // For AI-detected search intents, use the extracted search terms
      const searchQuery = intent.searchTerms || intent.query || userMessage;
      const searchIntent = {
        ...intent,
        type: 'search',
        query: searchQuery,
      };
      const searchResponse = await handleContextualSearchRequest(
        searchQuery,
        searchIntent,
        userSession,
        whatsappNumber
      );

      // Mark that we just provided search results
      userSession.lastActivity = 'search_results';
      userSession.lastSearchTime = new Date().toISOString();
      userSession.lastSearchQuery = intent.query || userMessage;

      return searchResponse;
    }

    // PRIORITY 5.5: Handle follow-up search queries (like "from pune", "more lawyers")
    if (intent.type === 'follow_up_search' && isProfileComplete) {
      const followUpResponse = await handleFollowUpSearch(
        userMessage,
        intent,
        userSession,
        whatsappNumber
      );

      if (followUpResponse) {
        userSession.lastActivity = 'search_results';
        userSession.lastSearchTime = new Date().toISOString();
        return followUpResponse;
      }
    }

    // PRIORITY 5.6: Handle acknowledgments (like "thank you" after search)
    if (intent.type === 'acknowledgment' && intent.subtype === 'thanks') {
      const responses = [
        "You're welcome! 😊 Let me know if you need help finding anyone else.",
        'Happy to help! Feel free to search for more alumni anytime.',
        'Glad I could help! Need to connect with anyone else?',
        "You're welcome! The network has 9000+ alumni if you need more connections.",
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      // Don't reset the session state, just acknowledge
      return randomResponse;
    }

    // PRIORITY 6: Profile update request with motivation
    if (intent.type === 'profile_update') {
      if (!isProfileComplete) {
        const firstField = incompleteFields[0];
        const totalFields = incompleteFields.length;

        userSession.waiting_for = `updating_${firstField}`;
        userSession.current_field = firstField;
        userSession.remaining_fields = incompleteFields.slice(1);
        userSession.incomplete_fields = incompleteFields;

        const progressBar = generateProgressBar(completionPercentage);

        return `📋 **Profile Completion Journey**

${progressBar}
**${completionPercentage}% Complete**

⭐ **Next Step:** ${getFieldDisplayName(firstField)}

${await getFieldPrompt(firstField, userSession)}`;
      }
      return `✅ **Profile Status: COMPLETE**

Congratulations ${firstName}! 🎉

Your profile is 100% verified and ready.

🔍 **What can you search:**
• "React developers in Mumbai"
• "Fintech entrepreneurs"
• "Marketing mentors"
• "Startup founders in Bangalore"

What expertise are you looking for?`;
    }

    // PRIORITY 7: Enhanced casual conversation
    if (intent.type === 'casual') {
      // If we just showed search results, don't show the full welcome again
      if (
        userSession.lastActivity === 'search_results' &&
        Date.now() - new Date(userSession.lastSearchTime || 0).getTime() < 300000
      ) {
        // 5 minutes

        // Simple acknowledgment instead of full welcome
        const simpleResponses = [
          `What else can I help you find, ${firstName}?`,
          `Need to search for anyone else?`,
          `Looking for more connections?`,
          `Any other expertise you need?`,
        ];

        return simpleResponses[Math.floor(Math.random() * simpleResponses.length)];
      }

      const casualResponse = await handleCasualConversation(userMessage, {
        name: userName,
        profileComplete: isProfileComplete,
        authenticated: true,
        completionPercentage,
      });

      if (!isProfileComplete) {
        const motivationalTip = getMotivationalTip(completionPercentage);
        return `${casualResponse}

${motivationalTip}

📊 **Profile:** ${completionPercentage}% complete
🔓 **Unlock search** by completing profile`;
      }

      return casualResponse;
    }

    // PRIORITY 8: Smart profile completion start
    if (!isProfileComplete && !userSession.profile_completion_started) {
      const firstField = incompleteFields[0];
      const totalFields = incompleteFields.length;

      userSession.waiting_for = `updating_${firstField}`;
      userSession.current_field = firstField;
      userSession.remaining_fields = incompleteFields.slice(1);
      userSession.incomplete_fields = incompleteFields;
      userSession.profile_completion_started = true;

      const welcomeEmoji = getTimeBasedEmoji();

      return `${welcomeEmoji} **Welcome back, ${firstName}!**

I notice your profile needs completion to access our alumni network.

📊 **Current Status**
• Profile: ${completionPercentage}% complete
• Remaining: ${totalFields} fields
• Time needed: ~${totalFields} minutes

Ready to unlock 9000+ alumni connections?

**${getFieldDisplayName(firstField)}**

${await getFieldPrompt(firstField, userSession)}`;
    }

    // PRIORITY 9: Profile complete - show welcome ONLY for actual greetings
    if (isProfileComplete && (intent.type === 'casual' || intent.type === 'casual_chat')) {
      const greetingWords = ['hi', 'hello', 'hey', 'good morning', 'good evening'];
      const isActualGreeting = greetingWords.some(
        (word) => userMessage.toLowerCase().trim() === word
      );

      if (isActualGreeting) {
        userSession.ready = true;
        userSession.waiting_for = 'ready';

        const searchSuggestions = generateSearchSuggestions(user);

        return `🌟 **Welcome ${firstName}!**

✅ **Verified Alumni Member**
🔓 **Full Network Access**
🚀 **9000+ Connections Available**

${searchSuggestions}

What expertise are you looking for today?`;
      }
    }

    // Fallback - try to understand unmatched queries
    if (isProfileComplete) {
      // For profile-complete users, assume they might be searching
      const searchKeywords = [
        'find',
        'looking',
        'need',
        'help',
        'someone',
        'anyone',
        'expert',
        'professional',
      ];
      const mightBeSearching = searchKeywords.some((keyword) =>
        userMessage.toLowerCase().includes(keyword)
      );

      if (mightBeSearching || userMessage.includes('?')) {
        // Treat as potential search query
        const searchIntent = {
          type: 'search',
          query: userMessage,
          confidence: 'low',
        };
        return await handleContextualSearchRequest(
          userMessage,
          searchIntent,
          userSession,
          whatsappNumber
        );
      }
    }

    // Final fallback
    return `Hi ${firstName}! 👋

I didn't quite understand that. ${
      isProfileComplete
        ? 'Try searching for alumni by skills, location, or expertise.'
        : 'Type "hi" to complete your profile and unlock search.'
    }`;
  } catch (error) {
    logError(error, { operation: 'handleAuthenticatedUser', whatsappNumber, intent: intent.type });
    return "⚠️ Technical hiccup! Please try again or type 'help'.";
  }
}

// Context-aware search handler with follow-up capabilities
async function handleContextualSearchRequest(userMessage, intent, userSession, whatsappNumber) {
  try {
    const withinLimit = await checkDailyLimit(whatsappNumber);

    if (!withinLimit) {
      const resetTime = new Date();
      resetTime.setHours(24, 0, 0, 0);
      const hoursLeft = Math.ceil((resetTime - new Date()) / (1000 * 60 * 60));

      return `🚫 **Daily Search Limit Reached**

You've used all 30 searches for today.

⏰ **Resets in:** ${hoursLeft} hours
🌙 **Reset time:** Midnight

**Meanwhile, you can:**
• 💬 Chat with me about anything
• 📋 Update your profile details
• 📚 Learn about other alumni
• 🔄 Come back tomorrow

💡 Pro tip: Save important connections!`;
    }

    // Use context-aware search service
    const searchResult = await ContextAwareSearchService.processContextualSearch(
      whatsappNumber,
      userMessage,
      intent
    );

    userSession.waiting_for = 'ready';
    userSession.ready = true;
    userSession.last_search_query = intent.query || userMessage;

    return searchResult;
  } catch (error) {
    logError(error, { operation: 'handleContextualSearchRequest', whatsappNumber });
    return `❌ Search temporarily unavailable.

Please try:
• Simpler search terms
• "Help" for assistance
• Try again in a moment`;
  }
}

// Handle follow-up search queries with context
async function handleFollowUpSearch(userMessage, intent, userSession, whatsappNumber) {
  try {
    const { refinementType, refinementValue } = intent;
    const lastQuery = userSession.lastSearchQuery || '';

    let enhancedQuery = lastQuery;

    switch (refinementType) {
      case 'location':
        // Add location to previous search
        enhancedQuery = `${lastQuery} in ${refinementValue}`;
        break;

      case 'more_results':
        // Request for more results - add exclusion context
        enhancedQuery = `more ${lastQuery}`;
        break;

      case 'experience':
        // Add experience level
        enhancedQuery = `${refinementValue} ${lastQuery}`;
        break;

      case 'skill_refinement':
        // Refine with additional skills
        enhancedQuery = `${lastQuery} ${refinementValue}`;
        break;

      default:
        enhancedQuery = userMessage;
    }

    // Create a new search intent with the enhanced query
    const enhancedIntent = {
      type: 'search',
      query: enhancedQuery,
      isFollowUp: true,
      originalQuery: lastQuery,
      refinement: { type: refinementType, value: refinementValue },
    };

    // Use the existing search handler with enhanced query
    const searchResponse = await handleContextualSearchRequest(
      enhancedQuery,
      enhancedIntent,
      userSession,
      whatsappNumber
    );

    // Add context about this being a refined search
    if (refinementType === 'location' && searchResponse) {
      const prefix = `Here are ${lastQuery} from ${refinementValue}:\n\n`;
      return prefix + searchResponse;
    }
    if (refinementType === 'more_results' && searchResponse) {
      const prefix = `Here are more results for "${lastQuery}":\n\n`;
      return prefix + searchResponse;
    }

    return searchResponse;
  } catch (error) {
    logError(error, { operation: 'handleFollowUpSearch', whatsappNumber });
    return "I couldn't refine your search. Please try a new search query.";
  }
}

// Legacy search handler (kept for backwards compatibility)
async function handleSearchRequest(intent, userSession, whatsappNumber) {
  return handleContextualSearchRequest(intent.query, intent, userSession, whatsappNumber);
}

// God-level profile field update handler
async function handleProfileFieldUpdate(userMessage, intent, userSession, whatsappNumber) {
  try {
    const fieldName = userSession.waiting_for.replace('updating_', '');

    // Handle stop/skip commands gracefully
    if (
      intent.type === 'skip_profile' ||
      ['later', 'stop', 'pause', 'skip'].includes(userMessage.toLowerCase())
    ) {
      const remainingFields = userSession.remaining_fields || [];
      const totalFields = userSession.incomplete_fields?.length || 1;
      const completedFields = totalFields - remainingFields.length - 1;

      userSession.waiting_for = 'ready';
      userSession.ready = true;
      userSession.profile_skipped = true;

      const encouragement =
        completedFields > 0
          ? `Great job completing ${completedFields} field${completedFields > 1 ? 's' : ''}! 🎉`
          : 'No problem! Come back anytime. 😊';

      return `⏸️ **Profile Update Paused**

${encouragement}

**Progress Saved:** ${completedFields}/${totalFields} fields

**Quick Actions:**
• Type "update profile" to resume
• Type "help" for assistance
• Ask me anything!

How can I help you today?`;
    }

    // Block search during profile updates with helpful message
    if (intent.type === 'search' || intent.type === 'skip_and_search') {
      const remainingFields = userSession.remaining_fields || [];
      const totalFields = userSession.incomplete_fields?.length || 1;
      const currentStep = totalFields - remainingFields.length;

      return `🔒 **Search Paused During Profile Update**

Let's finish this field first (${currentStep}/${totalFields} done).

**Current field:** ${getFieldDisplayName(fieldName)}

${await getFieldPrompt(fieldName, userSession)}

💡 Type "skip" to pause profile update`;
    }

    // Handle additional email choice with clear flow
    if (fieldName === 'additionalEmail') {
      const validation = await validateProfileField(fieldName, userMessage, userSession);

      if (!validation.valid) {
        const smartHelp = await generateSmartHelp(fieldName, userSession);
        return `${validation.message}${smartHelp ? `\n\n${smartHelp}` : ''}`;
      }

      const success = await updateUserProfile(whatsappNumber, 'additionalEmail', validation.value);

      if (!success) {
        return `❌ Oops! Couldn't save. Please try again.`;
      }

      if (validation.value === true) {
        userSession.waiting_for = 'additional_email_input';
        return `Great! Let's add your additional email.

📧 **Additional Email Address**

Please enter your other email address:

✅ Example: work.email@company.com

💡 This helps if you change jobs/universities`;
      }
      return await moveToNextProfileField(
        userSession,
        whatsappNumber,
        fieldName,
        '\n✅ Choice saved!'
      );
    }

    // Handle Instagram choice with clear flow
    if (fieldName === 'instagram') {
      const validation = await validateProfileField(fieldName, userMessage, userSession);

      if (!validation.valid) {
        const smartHelp = await generateSmartHelp(fieldName, userSession);
        return `${validation.message}${smartHelp ? `\n\n${smartHelp}` : ''}`;
      }

      const success = await updateUserProfile(whatsappNumber, 'instagram', validation.value);

      if (!success) {
        return `❌ Oops! Couldn't save. Please try again.`;
      }

      if (validation.value === true) {
        userSession.waiting_for = 'instagram_url_input';
        return `Perfect! Let's add your Instagram.

📸 **Instagram Profile**

Enter your Instagram in any format:

✅ Examples:
• yourname
• @yourname
• instagram.com/yourname

💡 Just your username works too!`;
      }
      return await moveToNextProfileField(
        userSession,
        whatsappNumber,
        fieldName,
        '\n✅ Choice saved!'
      );
    }

    // Regular field validation with smart help
    const validation = await validateProfileField(fieldName, userMessage, userSession);

    if (!validation.valid) {
      const retryCount = userSession.field_retry_count || 0;
      userSession.field_retry_count = retryCount + 1;

      const smartHelp = await generateSmartHelp(fieldName, userSession);
      return `${validation.message}${smartHelp ? `\n\n${smartHelp}` : ''}`;
    }

    // Show formatted value if changed
    let successMessage = '';
    if (validation.formatted) {
      successMessage = `\n${validation.formatted}`;
    }

    // Reset retry count
    userSession.field_retry_count = 0;

    // Update the field in database
    const success = await updateUserProfile(whatsappNumber, fieldName, validation.value);

    if (!success) {
      return `❌ **Save Failed**

Sorry, couldn't save your ${getFieldDisplayName(fieldName)}.

Please try again or type "skip".`;
    }

    // Move to next field with celebration
    return await moveToNextProfileField(userSession, whatsappNumber, fieldName, successMessage);
  } catch (error) {
    logError(error, { operation: 'handleProfileFieldUpdate', whatsappNumber });
    return `❌ Technical issue. Please try again or type "skip".`;
  }
}

// Perfect additional email handler
async function handleAdditionalEmailInput(userMessage, intent, userSession, whatsappNumber) {
  try {
    if (['skip', 'no', 'cancel', 'later'].includes(userMessage.toLowerCase())) {
      return await moveToNextProfileField(
        userSession,
        whatsappNumber,
        'additionalEmail',
        '\n✅ Skipped additional email'
      );
    }

    const validation = await validateProfileField('additionalEmailInput', userMessage, userSession);

    if (!validation.valid) {
      return `${validation.message}

💡 Or type "skip" to continue without adding`;
    }

    const linkResult = await linkAdditionalEmail(whatsappNumber, validation.value);

    if (!linkResult.success) {
      return `❌ ${linkResult.error}

Try a different email or type "skip".`;
    }

    return await moveToNextProfileField(
      userSession,
      whatsappNumber,
      'additionalEmail',
      '\n✅ Email linked successfully!'
    );
  } catch (error) {
    logError(error, { operation: 'handleAdditionalEmailInput', whatsappNumber });
    return "❌ Error linking email. Type 'skip' to continue.";
  }
}

// Perfect Instagram URL handler
async function handleInstagramURLInput(userMessage, intent, userSession, whatsappNumber) {
  try {
    if (['skip', 'no', 'cancel', 'later'].includes(userMessage.toLowerCase())) {
      return await moveToNextProfileField(
        userSession,
        whatsappNumber,
        'instagram',
        '\n✅ Skipped Instagram'
      );
    }

    const validation = await validateProfileField('instagramURL', userMessage, userSession);

    if (!validation.valid) {
      return `${validation.message}

💡 Or type "skip" to continue without adding`;
    }

    const success = await updateUserProfile(whatsappNumber, 'instagram', validation.value);

    if (!success) {
      return `❌ Couldn't save Instagram. Please try again or type "skip".`;
    }

    let successMsg = '\n✅ Instagram saved!';
    if (validation.formatted) {
      successMsg = `\n${validation.formatted}`;
    }

    return await moveToNextProfileField(userSession, whatsappNumber, 'instagram', successMsg);
  } catch (error) {
    logError(error, { operation: 'handleInstagramURLInput', whatsappNumber });
    return "❌ Error saving Instagram. Type 'skip' to continue.";
  }
}

// Perfect field progression with celebrations
async function moveToNextProfileField(
  userSession,
  whatsappNumber,
  completedField,
  successMessage = ''
) {
  try {
    const remainingFields = userSession.remaining_fields || [];
    const totalFields = userSession.incomplete_fields?.length || 1;
    const currentStep = totalFields - remainingFields.length;

    // Generate celebration based on progress
    const celebration = getCelebrationMessage(currentStep, totalFields);

    if (remainingFields.length > 0) {
      const nextField = remainingFields[0];

      userSession.waiting_for = `updating_${nextField}`;
      userSession.current_field = nextField;
      userSession.remaining_fields = remainingFields.slice(1);

      // Save session
      const { saveUserSession } = require('../services/sessionManager');
      await saveUserSession(whatsappNumber, userSession);

      const progressBar = generateFieldProgressBar(currentStep + 1, totalFields);

      return `✅ **${getFieldDisplayName(completedField)} Saved!**${successMessage}

${celebration}

${progressBar}
**Progress:** ${currentStep + 1}/${totalFields}

**${getFieldDisplayName(nextField)}**

${await getFieldPrompt(nextField, userSession)}`;
    }
    // Profile completion celebration!
    await markProfileCompleted(whatsappNumber);

    userSession.waiting_for = 'ready';
    userSession.ready = true;
    userSession.profile_completed = true;

    // Clear session data
    delete userSession.current_field;
    delete userSession.remaining_fields;
    delete userSession.incomplete_fields;

    // Save final session
    const { saveUserSession } = require('../services/sessionManager');
    await saveUserSession(whatsappNumber, userSession);

    const user = await findUserByWhatsAppNumber(whatsappNumber);
    const firstName = (
      user?.enhancedProfile?.fullName ||
      user?.basicProfile?.name ||
      'Alumni'
    ).split(' ')[0];

    return `✅ **${getFieldDisplayName(completedField)} Saved!**${successMessage}

${generateCompletionCelebration(firstName)}`;
  } catch (error) {
    logError(error, { operation: 'moveToNextProfileField', whatsappNumber });
    return "Let's continue! What expertise are you looking for?";
  }
}

// UI/UX Helper Functions

function generateProgressBar(percentage) {
  const filled = Math.floor(percentage / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function generateFieldProgressBar(current, total) {
  const percentage = Math.floor((current / total) * 100);
  const filled = Math.floor(percentage / 10);
  const empty = 10 - filled;
  return '🟩'.repeat(filled) + '⬜'.repeat(empty);
}

function getTimeBasedEmoji() {
  const hour = new Date().getHours();
  if (hour < 12) return '🌅';
  if (hour < 17) return '☀️';
  return '🌙';
}

function getCelebrationMessage(currentStep, totalSteps) {
  const percentage = Math.floor((currentStep / totalSteps) * 100);

  if (percentage >= 90) return '🎯 Almost there! Final stretch!';
  if (percentage >= 75) return '🔥 On fire! Keep it up!';
  if (percentage >= 50) return '💪 Halfway champion!';
  if (percentage >= 25) return '🚀 Great momentum!';
  return '✨ Excellent start!';
}

function getMotivationalTip(percentage) {
  if (percentage >= 80) return '💡 So close! Just a few more fields to unlock 9000+ connections!';
  if (percentage >= 60) return "🌟 You're doing great! Each field helps alumni find you better.";
  if (percentage >= 40) return '🎯 Keep going! Your complete profile attracts better connections.';
  if (percentage >= 20) return '🚀 Building your professional presence step by step!';
  return '✨ Every field you complete makes your profile stronger!';
}

function generateSearchingMessage(query) {
  const messages = [
    `🔍 Searching for "${query}"...`,
    `🎯 Finding best matches for "${query}"...`,
    `🌟 Connecting you with experts in "${query}"...`,
    `🚀 Discovering alumni for "${query}"...`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function generateSearchSuggestions(user) {
  const city = user.enhancedProfile?.city || 'your city';
  const domain = user.enhancedProfile?.domain || 'your industry';

  return `**🔥 Popular Searches:**
• "${domain} experts"
• "Mentors in ${city}"
• "Startup founders"
• "Tech professionals"

**💡 Try specific searches like:**
• "React developers with 5+ years"
• "Marketing consultants in Mumbai"
• "Fintech entrepreneurs seeking co-founders"`;
}

function generateCompletionCelebration(firstName) {
  return `🎉 **PROFILE COMPLETED!**

🎊 Congratulations, ${firstName}! 🎊

You've unlocked:
✅ Full access to 9000+ alumni
✅ Enhanced search capabilities
✅ Priority in search results
✅ Complete networking features

🚀 **You're now part of an exclusive network of changemakers!**

Ready to make your first connection?

**Try searching for:**
• Your industry experts
• Mentors in your field
• Potential collaborators
• Alumni in your city

What expertise are you looking for today?`;
}

module.exports = {
  handleAuthenticatedUser,
  handleSearchRequest,
  handleContextualSearchRequest,
  handleProfileFieldUpdate,
  moveToNextProfileField,
  getFieldDisplayName,
};
