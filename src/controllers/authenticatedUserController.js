// Enhanced authenticated user controller with smart profile resumption for AI-enhanced alumni reconnection
// File: src/controllers/authenticatedUserController.js
// ENHANCED VERSION - Smart hi trigger with profile resumption and streamlined UX

const { getIncompleteFields, updateUserProfile, markProfileCompleted, getProfileCompletionPercentage, hasMinimumProfileCompletion, findUserByWhatsAppNumber, ENHANCED_PROFILE_FIELDS } = require('../models/User');
const { comprehensiveAlumniSearch } = require('../services/searchService');
const { checkDailyLimit } = require('../services/rateLimiter');
const { handleCasualConversation } = require('./conversationController');
const { validateProfileField, getFieldPrompt, generateResumeGreeting } = require('./profileController');
const { logUserActivity, logError } = require('../middleware/logging');
const UserMemoryService = require('../services/userMemoryService');

// Manual canAccessSearch function
function canAccessSearch(user) {
    const incompleteFields = getIncompleteFields(user);
    const completionPercentage = getProfileCompletionPercentage(user);
    const isComplete = incompleteFields.length === 0;
    
    return {
        canAccess: isComplete,
        reason: isComplete ? 'Profile complete' : 'Profile incomplete',
        completionPercentage: completionPercentage,
        incompleteFields: incompleteFields,
        requiredActions: incompleteFields.map(field => `Complete ${field}`)
    };
}

// Main handler for authenticated user interactions with smart profile resumption
async function handleAuthenticatedUser(userMessage, intent, userSession, whatsappNumber) {
    try {
        const user = userSession.user_data;
        const userName = user.basicProfile?.name || user.enhancedProfile?.fullName || 'there';
        
        logUserActivity(whatsappNumber, 'authenticated_user_interaction', {
            intent: intent.type,
            sessionState: userSession.waiting_for,
            profileComplete: !!user.enhancedProfile?.completed,
            userName: userName
        });
        
        // Check profile completion status
        const completionPercentage = getProfileCompletionPercentage(user);
        const incompleteFields = getIncompleteFields(user);
        const isProfileComplete = incompleteFields.length === 0;
        const searchAccess = canAccessSearch(user);
        
        // ENHANCED: Smart "Hi" trigger - resume profile completion with name greeting
        if (intent.type === 'casual' && intent.subtype === 'greeting' && !isProfileComplete) {
            const resumeGreeting = generateResumeGreeting(user);
            
            // Set up session to resume from next incomplete field
            const nextField = incompleteFields[0];
            userSession.waiting_for = `updating_${nextField}`;
            userSession.current_field = nextField;
            userSession.remaining_fields = incompleteFields.slice(1);
            userSession.incomplete_fields = incompleteFields;
            userSession.profile_completion_started = true;
            
            return resumeGreeting;
        }
        
        // PRIORITY 1: Handle profile updates in progress
        if (userSession.waiting_for && userSession.waiting_for.startsWith('updating_')) {
            return await handleProfileFieldUpdate(userMessage, intent, userSession, whatsappNumber);
        }
        
        // PRIORITY 2: Search Intent Detection with profile completion check
        if (intent.type === 'search' || intent.type === 'skip_and_search') {
            if (!searchAccess.canAccess) {
                // Force start profile completion
                const firstField = incompleteFields[0];
                const totalFields = incompleteFields.length;
                
                userSession.waiting_for = `updating_${firstField}`;
                userSession.current_field = firstField;
                userSession.remaining_fields = incompleteFields.slice(1);
                userSession.incomplete_fields = incompleteFields;
                userSession.search_blocked = true;
                
                return `📋 **Profile Completion Needed**

Hi **${userName}**! To connect with 9000+ fellow Yatris, please complete your profile.

Missing ${totalFields} field${totalFields > 1 ? 's' : ''}. Let's continue:

**Step 1 of ${totalFields}:** ${getFieldDisplayName(firstField)}

${await getFieldPrompt(firstField, userSession)}`;
            }
            
            // Profile complete - proceed with search
            return await handleSearchRequest(intent, userSession, whatsappNumber, intent.type === 'skip_and_search');
        }
        
        // PRIORITY 3: Handle profile completion choice
        if (userSession.waiting_for === 'profile_choice') {
            return await handleProfileChoice(userMessage, intent, userSession, whatsappNumber);
        }
        
        // PRIORITY 4: Handle additional email/instagram choices
        if (userSession.waiting_for === 'additional_email_choice') {
            return await handleAdditionalEmailChoice(userMessage, intent, userSession, whatsappNumber);
        }
        
        if (userSession.waiting_for === 'additional_email_input') {
            return await handleAdditionalEmailInput(userMessage, intent, userSession, whatsappNumber);
        }
        
        if (userSession.waiting_for === 'instagram_choice') {
            return await handleInstagramChoice(userMessage, intent, userSession, whatsappNumber);
        }
        
        // PRIORITY 5: Profile update request
        if (intent.type === 'profile_update') {
            if (!isProfileComplete) {
                const firstField = incompleteFields[0];
                const totalFields = incompleteFields.length;
                
                userSession.waiting_for = `updating_${firstField}`;
                userSession.current_field = firstField;
                userSession.remaining_fields = incompleteFields.slice(1);
                userSession.incomplete_fields = incompleteFields;
                
                return `✨ **Profile Completion Required**

Currently: ${completionPercentage}% complete
Missing: ${totalFields} field${totalFields > 1 ? 's' : ''}

**Step 1 of ${totalFields}:** ${getFieldDisplayName(firstField)}

${await getFieldPrompt(firstField, userSession)}`;
            } else {
                return `🎉 **Profile Complete!** 

✅ All fields completed (100%)
🔓 Search is now available!

What expertise are you looking for today?

**Popular Searches:**
• "React developers in Mumbai"
• "fintech entrepreneurs"
• "marketing experts"
• "healthcare professionals"`;
            }
        }
        
        // PRIORITY 6: Casual conversation
        if (intent.type === 'casual') {
            const casualResponse = await handleCasualConversation(userMessage, {
                name: userName,
                profileComplete: isProfileComplete,
                authenticated: true,
                completionPercentage: completionPercentage
            });
            
            if (!isProfileComplete) {
                return `${casualResponse}

📋 **Profile Status:** ${completionPercentage}% complete
🔒 Missing ${incompleteFields.length} field${incompleteFields.length > 1 ? 's' : ''} for search access.

Type "complete profile" to continue.`;
            }
            
            return casualResponse;
        }
        
        // PRIORITY 7: Auto-start profile completion for incomplete profiles
        if (!isProfileComplete && !userSession.profile_completion_started) {
            const firstField = incompleteFields[0];
            const totalFields = incompleteFields.length;
            
            userSession.waiting_for = `updating_${firstField}`;
            userSession.current_field = firstField;
            userSession.remaining_fields = incompleteFields.slice(1);
            userSession.incomplete_fields = incompleteFields;
            userSession.profile_completion_started = true;
            
            return `👋 **Welcome back, ${userName}!**

Your profile: ${completionPercentage}% complete
🔒 **Search requires 100% completion**

Let's complete the remaining ${totalFields} field${totalFields > 1 ? 's' : ''}:

**Step 1 of ${totalFields}:** ${getFieldDisplayName(firstField)}

${await getFieldPrompt(firstField, userSession)}`;
        }
        
        // PRIORITY 8: Profile complete - show search options
        if (isProfileComplete) {
            userSession.ready = true;
            userSession.waiting_for = 'ready';
            
            return `🌟 **Hi ${userName}!**

✅ **Profile Complete**
🔓 **Ready to connect with 9000+ fellow Yatris**

What expertise are you looking for today?

**Popular Searches:**
• "React developers in Bangalore"
• "fintech startup founders" 
• "digital marketing experts"
• "healthcare entrepreneurs"

Or describe what you need help with!`;
        }
        
        // Fallback
        return `Hi **${userName}**! 👋

I'm here to help you connect with our alumni network.`;
        
    } catch (error) {
        logError(error, { operation: 'handleAuthenticatedUser', whatsappNumber, intent: intent.type });
        return "⚠️ I'm experiencing a technical issue. Please try your request again.";
    }
}

// Enhanced search request handling
async function handleSearchRequest(intent, userSession, whatsappNumber, isSkipAndSearch = false) {
    try {
        const withinLimit = await checkDailyLimit(whatsappNumber);
        
        if (!withinLimit) {
            return `🚫 **Daily Search Limit Reached**

You've used all 30 searches for today. Limit resets at midnight.

Meanwhile, you can:
• Update your profile
• Ask general questions
• Come back tomorrow for more searches`;
        }
        
        const searchQuery = intent.query;
        const searchResult = await comprehensiveAlumniSearch(searchQuery, whatsappNumber);
        
        if (isSkipAndSearch) {
            const skipMessage = userSession.waiting_for?.startsWith('updating_') 
                ? "Profile update paused! Here's your search result:"
                : "Here's what I found:";
                
            userSession.waiting_for = 'ready';
            userSession.ready = true;
            userSession.profile_skipped = true;
            
            return `${skipMessage}

${searchResult}

You can complete your profile anytime by saying "update profile".`;
        }
        
        userSession.waiting_for = 'ready';
        userSession.ready = true;
        
        return searchResult;
        
    } catch (error) {
        logError(error, { operation: 'handleSearchRequest', whatsappNumber });
        return "I'm having trouble with the search right now. Please try again or ask for something else.";
    }
}

// Enhanced profile field update with smart validation
async function handleProfileFieldUpdate(userMessage, intent, userSession, whatsappNumber) {
    try {
        const fieldName = userSession.waiting_for.replace('updating_', '');
        
        // Handle stop commands
        if (intent.type === 'skip_profile' || userMessage.toLowerCase().includes('later') || userMessage.toLowerCase().includes('stop')) {
            const remainingFields = userSession.remaining_fields || [];
            const totalFields = userSession.incomplete_fields?.length || 1;
            const currentStep = totalFields - remainingFields.length;
            
            userSession.waiting_for = 'ready';
            userSession.ready = true;
            userSession.profile_skipped = true;
            
            // Clear profile completion session data
            delete userSession.current_field;
            delete userSession.remaining_fields;
            delete userSession.incomplete_fields;
            delete userSession.field_retry_count;
            
            return `⏸️ **Profile Update Paused**

Progress: ${currentStep}/${totalFields} fields completed
📋 **Complete profile to connect with 9000+ fellow Yatris**

When ready to continue, type:
• "complete profile" 
• "update profile"

What can I help you with in the meantime?`;
        }
        
        // Block search during profile updates
        if (intent.type === 'search' || intent.type === 'skip_and_search') {
            const remainingFields = userSession.remaining_fields || [];
            const totalFields = userSession.incomplete_fields?.length || 1;
            const currentStep = totalFields - remainingFields.length + 1;
            
            return `📋 **Profile Completion Needed**

Please complete this field to connect with fellow Yatris.

**Current: Step ${currentStep} of ${totalFields}**
**Field:** ${getFieldDisplayName(fieldName)}

${await getFieldPrompt(fieldName, userSession)}

🔗 *Full access after profile completion.*`;
        }
        
        // Enhanced validation with AI assistance
        const validation = await validateProfileField(fieldName, userMessage, userSession);
        
        if (!validation.valid) {
            const retryCount = userSession.field_retry_count || 0;
            userSession.field_retry_count = retryCount + 1;
            
            let errorMessage = validation.message;
            
            if (userSession.field_retry_count >= 3) {
                errorMessage += `\n\n💡 **Need Help?**
Having trouble with this field? Here are some tips:

${getFieldHelpTips(fieldName)}

Type "help" for more assistance or try again.`;
            }
            
            return errorMessage;
        }
        
        // Show correction message if AI corrected the input
        let correctionMessage = '';
        if (validation.corrected) {
            correctionMessage = `\n\n🔧 *Corrected to: ${validation.corrected}*`;
        }
        
        // Reset retry count on successful validation
        userSession.field_retry_count = 0;
        
        // Update the field in database
        const success = await updateUserProfile(whatsappNumber, fieldName, validation.value);
        
        if (!success) {
            return `❌ **Database Error**

Unable to save your ${getFieldDisplayName(fieldName)}. Please try again.

${await getFieldPrompt(fieldName, userSession)}`;
        }
        
        // Track profile update in user memory
        await UserMemoryService.trackProfileUpdate(
            whatsappNumber,
            fieldName,
            validation.value,
            userSession.field_retry_count || 1
        );
        
        // Get fresh user data and update session
        const updatedUser = await findUserByWhatsAppNumber(whatsappNumber);
        if (updatedUser) {
            userSession.user_data = updatedUser;
        }
        
        // Calculate progress
        const remainingFields = userSession.remaining_fields || [];
        const totalFields = userSession.incomplete_fields?.length || 1;
        const currentStep = totalFields - remainingFields.length;
        const progressPercentage = Math.round((currentStep / totalFields) * 100);
        
        let progressMessage = `✅ **${getFieldDisplayName(fieldName)} Saved!**${correctionMessage}

📊 **Progress:** ${currentStep}/${totalFields} (${progressPercentage}%)`;
        
        // Move to next field or complete
        if (remainingFields.length > 0) {
            const nextField = remainingFields[0];
            
            userSession.waiting_for = `updating_${nextField}`;
            userSession.current_field = nextField;
            userSession.remaining_fields = remainingFields.slice(1);
            
            progressMessage += `\n\n**Step ${currentStep + 1} of ${totalFields}:** ${getFieldDisplayName(nextField)}

${await getFieldPrompt(nextField, userSession)}`;
        } else {
            // Profile completion!
            await markProfileCompleted(whatsappNumber);
            
            progressMessage += `\n\n🎉 **PROFILE COMPLETED!**

✅ **Welcome to JY Alumni Relations Cell!**
🌟 **Ready to connect with 9000+ fellow Yatris**

What expertise are you looking for today?

**Try these searches:**
• "React developers in your city"
• "startup mentors in fintech"
• "marketing strategy experts"`;
            
            userSession.waiting_for = 'ready';
            userSession.ready = true;
            userSession.profile_completed = true;
            
            // Clear profile completion session data
            delete userSession.current_field;
            delete userSession.remaining_fields;
            delete userSession.incomplete_fields;
            delete userSession.field_retry_count;
        }
        
        logUserActivity(whatsappNumber, 'profile_field_updated', {
            field: fieldName,
            progress: `${currentStep}/${totalFields}`,
            completed: remainingFields.length === 0,
            corrected: !!validation.corrected
        });
        
        return progressMessage;
        
    } catch (error) {
        logError(error, { operation: 'handleProfileFieldUpdate', whatsappNumber });
        return `❌ **Technical Error**

Unable to process your input. Please try again.

If this continues, contact support: support@jagritiyatra.com`;
    }
}

// Handle profile completion choice
async function handleProfileChoice(userMessage, intent, userSession, whatsappNumber) {
    try {
        if (intent.type === 'search') {
            const user = userSession.user_data;
            const searchAccess = canAccessSearch(user);
            
            if (!searchAccess.canAccess) {
                const completionPercentage = getProfileCompletionPercentage(user);
                const incompleteFields = getIncompleteFields(user);
                const firstField = incompleteFields[0];
                
                userSession.waiting_for = `updating_${firstField}`;
                userSession.current_field = firstField;
                userSession.remaining_fields = incompleteFields.slice(1);
                userSession.incomplete_fields = incompleteFields;
                
                return `🚫 **Search Blocked - Complete Profile First**

Your profile: ${completionPercentage}% complete
Required: 100% completion

Starting profile completion:

**Step 1 of ${incompleteFields.length}:** ${getFieldDisplayName(firstField)}

${await getFieldPrompt(firstField, userSession)}`;
            }
            
            return await handleSearchRequest(intent, userSession, whatsappNumber);
        }
        
        if (intent.type === 'affirmative' || userMessage.toLowerCase().includes('yes')) {
            const incompleteFields = userSession.incomplete_fields || getIncompleteFields(userSession.user_data);
            
            if (incompleteFields.length === 0) {
                userSession.waiting_for = 'ready';
                userSession.ready = true;
                return `Your profile is already complete! 🎉

What can I help you find today?`;
            }
            
            const firstField = incompleteFields[0];
            const totalFields = incompleteFields.length;
            
            userSession.waiting_for = `updating_${firstField}`;
            userSession.current_field = firstField;
            userSession.remaining_fields = incompleteFields.slice(1);
            userSession.incomplete_fields = incompleteFields;
            
            return `Great! Let's complete your profile with our enhanced system.

**Step 1 of ${totalFields}:** ${getFieldDisplayName(firstField)}

${await getFieldPrompt(firstField, userSession)}`;
        } else {
            const user = userSession.user_data;
            const searchAccess = canAccessSearch(user);
            
            if (!searchAccess.canAccess) {
                const completionPercentage = getProfileCompletionPercentage(user);
                return `⚠️ **Search Requires Complete Profile**

Your profile: ${completionPercentage}% complete
Required: 100% completion

You must complete your profile to access alumni search.

Ready to continue? Reply YES`;
            }
            
            userSession.waiting_for = 'ready';
            userSession.ready = true;
            userSession.profile_skipped = true;
            
            return `Perfect! I'm here to help you connect with amazing alumni. 🌟

What can I help you find today?`;
        }
        
    } catch (error) {
        logError(error, { operation: 'handleProfileChoice', whatsappNumber });
        return "Let's try that again. Would you like to complete your profile now? Reply YES or NO";
    }
}

// Handle additional email linking choice
async function handleAdditionalEmailChoice(userMessage, intent, userSession, whatsappNumber) {
    try {
        if (intent.type === 'affirmative' || userMessage.toLowerCase().includes('yes')) {
            userSession.waiting_for = 'additional_email_input';
            return `Please enter your additional email address:

**Example:** newemail@domain.com

This will be linked to your existing account for better connectivity.`;
        } else {
            return await moveToNextProfileField(userSession, whatsappNumber);
        }
        
    } catch (error) {
        logError(error, { operation: 'handleAdditionalEmailChoice', whatsappNumber });
        return "Let's try that again. Do you want to add an additional email? Reply YES or NO";
    }
}

// Handle additional email input
async function handleAdditionalEmailInput(userMessage, intent, userSession, whatsappNumber) {
    try {
        const { linkAdditionalEmail } = require('../models/User');
        const { validateEmail } = require('../utils/validation');
        
        const emailValidation = validateEmail(userMessage);
        if (!emailValidation.valid) {
            return `${emailValidation.message}

Please enter a valid email address:`;
        }
        
        const linkResult = await linkAdditionalEmail(whatsappNumber, emailValidation.value);
        
        if (!linkResult.success) {
            return `❌ ${linkResult.error}

Please try a different email or type "skip" to continue.`;
        }
        
        const nextMessage = await moveToNextProfileField(userSession, whatsappNumber);
        return `✅ Additional email linked successfully!

${nextMessage}`;
        
    } catch (error) {
        logError(error, { operation: 'handleAdditionalEmailInput', whatsappNumber });
        return "❌ Error linking email. Please try again or type 'skip' to continue.";
    }
}

// Handle Instagram profile choice
async function handleInstagramChoice(userMessage, intent, userSession, whatsappNumber) {
    try {
        if (intent.type === 'affirmative' || userMessage.toLowerCase().includes('yes')) {
            userSession.waiting_for = 'updating_instagram';
            userSession.current_field = 'instagram';
            
            return `Please enter your Instagram profile URL:

**Example:** https://instagram.com/yourprofile

Type "later" to skip this step.`;
        } else {
            return await moveToNextProfileField(userSession, whatsappNumber);
        }
        
    } catch (error) {
        logError(error, { operation: 'handleInstagramChoice', whatsappNumber });
        return "Let's try that again. Do you have an Instagram profile to share? Reply YES or NO";
    }
}

// Helper function to move to next profile field
async function moveToNextProfileField(userSession, whatsappNumber) {
    try {
        const remainingFields = userSession.remaining_fields || [];
        const totalFields = userSession.incomplete_fields?.length || 1;
        const currentStep = totalFields - remainingFields.length;
        
        if (remainingFields.length > 0) {
            const nextField = remainingFields[0];
            
            userSession.waiting_for = `updating_${nextField}`;
            userSession.current_field = nextField;
            userSession.remaining_fields = remainingFields.slice(1);
            
            return `**Step ${currentStep + 1} of ${totalFields}:** ${getFieldDisplayName(nextField)}

${await getFieldPrompt(nextField, userSession)}`;
        } else {
            await markProfileCompleted(whatsappNumber);
            
            userSession.waiting_for = 'ready';
            userSession.ready = true;
            userSession.profile_completed = true;
            
            // Clear profile completion session data
            delete userSession.current_field;
            delete userSession.remaining_fields;
            delete userSession.incomplete_fields;
            
            return `🎉 **Profile Completed!**

You're now fully connected to our enhanced alumni network!

What can I help you find today?`;
        }
        
    } catch (error) {
        logError(error, { operation: 'moveToNextProfileField', whatsappNumber });
        return "Let's continue with your profile. What can I help you find today?";
    }
}

// Helper function for field-specific help tips
function getFieldHelpTips(fieldName) {
    const helpTips = {
        fullName: '• Use your real full name\n• Only letters, spaces, hyphens allowed\n• Example: "Rajesh Kumar Singh"',
        city: '• Enter your current city name\n• I can correct typos automatically\n• Examples: "Mumbai", "New York", "London"',
        state: '• Enter your state/province\n• I can correct typos automatically\n• Examples: "Maharashtra", "California", "Ontario"',
        country: '• Enter your country name\n• I can correct typos automatically\n• Examples: "India", "United States", "Canada"',
        phone: '• Include country code\n• Format: +91 9876543210\n• Or: 919876543210',
        linkedin: '• Full LinkedIn URL or just username\n• I can create the URL for you\n• Examples: "johnsmith" or full URL',
        dateOfBirth: '• Any date format works\n• Examples: 19/07/2000, July 19 2000\n• I will understand and convert it',
        gender: '• Select 1, 2, or 3\n• 1 = Male, 2 = Female, 3 = Others',
        domain: '• Select number from list\n• Choose your primary industry',
        professionalRole: '• Select number from list\n• Choose your current role'
    };
    
    return helpTips[fieldName] || 'Please follow the format shown in the example above.';
}

// Helper function to get display name for fields
function getFieldDisplayName(fieldName) {
    const displayNames = {
        fullName: 'Full Name',
        gender: 'Gender',
        professionalRole: 'Professional Role',
        dateOfBirth: 'Date of Birth',
        country: 'Country',
        city: 'City',
        state: 'State/Province',
        phone: 'Phone Number',
        additionalEmail: 'Additional Email',
        linkedin: 'LinkedIn Profile',
        instagram: 'Instagram Profile',
        domain: 'Industry Domain',
        yatraImpact: 'Yatra Impact',
        communityAsks: 'Community Support Needs',
        communityGives: 'Community Contributions'
    };
    
    return displayNames[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
}

module.exports = {
    handleAuthenticatedUser,
    handleSearchRequest,
    handleProfileFieldUpdate,
    moveToNextProfileField,
    getFieldDisplayName
};