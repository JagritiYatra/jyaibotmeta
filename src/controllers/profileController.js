// Enhanced profile controller optimized for AI-enhanced alumni reconnection system
// File: src/controllers/profileController.js
// ENHANCED VERSION - AI-powered data capture with smart validation and reconnection intelligence

const { ENHANCED_PROFILE_FIELDS } = require('../models/User');
const { 
    validateFullName, 
    validateGender, 
    validateDateOfBirth, 
    validateGeographicInput,
    validatePhoneNumber,
    validateEmail,
    validateMultipleChoice,
    validateYesNo,
    sanitizeInput
} = require('../utils/validation');

// Import simple validations for city, LinkedIn, Instagram
const {
    validateCityTown,
    validateLinkedInURL,
    validateInstagramURL
} = require('../utils/simpleValidation');
const { logError, logSuccess } = require('../middleware/logging');

// AI-enhanced field prompts - concise and intelligent
async function getFieldPrompt(fieldName, userSession = {}) {
    try {
        const prompts = {
            fullName: `Please enter your full name:

Example: Rajesh Kumar Singh
(2-100 characters, real name only)`,

            gender: `Select your gender:

1. Male
2. Female  
3. Others

Reply with: 1, 2, or 3`,

            professionalRole: `Select your professional role:

1. Entrepreneur
2. Student
3. Working Professional
4. Startup Founder
5. NGO Founder
6. Researcher
7. Freelancer
8. Consultant

Reply with: 1-8`,

            dateOfBirth: `Enter your date of birth:

Any format works:
• 19/07/2000
• July 19 2000
• 19-07-2000
• 2000-07-19

I'll understand and save it correctly.`,

            country: `Enter your country:

Example: India`,

            city: `Enter your city/town:

Just type your city or town name - we accept any location!`,

            state: `Enter your state/province:

Example: Maharashtra`,

            phone: `Enter your phone number with country code:

Examples:
+91 9876543210
+1 2025551234
+44 7911123456

Format: +[code] [number]`,

            linkedin: `Enter your LinkedIn profile:

Examples:
• https://linkedin.com/in/yourname
• linkedin.com/in/yourname  
• yourlinkedinusername
• Any LinkedIn URL

Just paste whatever LinkedIn link/username you have.`,

            instagram: `Do you have Instagram to share?

Reply: YES or NO

(This helps with networking)`,

            domain: `Select your industry domain:

1. Agriculture
2. Technology
3. Healthcare
4. Education
5. Finance
6. Manufacturing
7. Energy & Sustainability
8. Transportation & Logistics
9. Retail & E-commerce
10. Media & Entertainment
11. Real Estate & Construction
12. Telecommunications
13. Automotive
14. Aerospace & Defense
15. Tourism & Hospitality
16. Food & Beverage
17. Legal & Compliance
18. Human Resources & Workforce Development
19. Social Impact & Nonprofit
20. Cybersecurity

Reply with: 1-20`,

            yatraImpact: `How did Jagriti Yatra help you? (Select 1-3)

1. Started Enterprise Post-Yatra
2. Found Clarity in Journey
3. Received Funding / Grant

Examples:
• Single: 1
• Multiple: 1,2
• All: 1,2,3`,

            communityAsks: `What support do you need from community?
(Select 1 or more)

1. Mentorship & Guidance
2. Funding & Investment Support
3. Business Partnerships
4. Job & Hiring Support
5. Product Feedback & Testing
6. Market & Customer Insights
7. Legal & Compliance Help
8. Technology Development & Support
9. Publicity & Storytelling Help
10. Emotional & Peer Support
11. Other

Example: 1,3,5 (select any number you need)`,

            communityGives: `What can you contribute to community?
(Select multiple)

1. Mentorship & Guidance
2. Industry Insights & Best Practices
3. Community Building & Networking
4. Legal & Compliance Advice
5. Technology & Digital Support
6. Amplification of Ideas & Stories
7. Market Access & Collaborations
8. Skill Development Workshops
9. Job & Internship Opportunities
10. Investment & Funding Opportunities

Example: 1,3,5,7`,

            additionalEmail: `Add another email address?

Reply: YES or NO

(Helps other alumni find you)`
        };

        return prompts[fieldName] || `Please provide your ${fieldName}:`;

    } catch (error) {
        logError(error, { operation: 'getFieldPrompt', fieldName });
        return `Please provide your ${fieldName}:`;
    }
}

// Enhanced field validation with AI assistance and smart corrections
async function validateProfileField(fieldName, value, userSession = {}) {
    try {
        const cleanValue = sanitizeInput(value);
        
        // Store user's attempt to avoid re-asking
        if (!userSession.attempts) userSession.attempts = {};
        if (!userSession.attempts[fieldName]) userSession.attempts[fieldName] = 0;
        userSession.attempts[fieldName]++;
        
        logSuccess('profile_field_validation_started', { 
            field: fieldName, 
            attempt: userSession.attempts[fieldName],
            valueLength: cleanValue.length 
        });

        switch (fieldName) {
            case 'fullName':
                const nameResult = validateFullName(cleanValue);
                if (!nameResult.valid && userSession.attempts[fieldName] > 1) {
                    return {
                        valid: false,
                        message: 'Name should be 2-100 characters, letters only.\n\nExample: John Smith'
                    };
                }
                return nameResult;

            case 'gender':
                const genderResult = validateGender(cleanValue);
                if (!genderResult.valid && userSession.attempts[fieldName] > 1) {
                    return {
                        valid: false,
                        message: 'Please reply with: 1, 2, or 3'
                    };
                }
                return genderResult;

            case 'professionalRole':
                const roleValidation = validateMultipleChoice(
                    cleanValue, 
                    ENHANCED_PROFILE_FIELDS.PROFESSIONAL_ROLES, 
                    1, 
                    1
                );
                if (roleValidation.valid) {
                    return { valid: true, value: roleValidation.value[0] };
                }
                return { 
                    valid: false, 
                    message: userSession.attempts[fieldName] > 1 ? 
                        'Please reply with a number from 1-8' : 
                        `Please select from 1-${ENHANCED_PROFILE_FIELDS.PROFESSIONAL_ROLES.length}`
                };

            case 'dateOfBirth':
                // AI-enhanced date validation with flexible parsing
                const dobResult = await validateDateOfBirth(cleanValue);
                if (!dobResult.valid && userSession.attempts[fieldName] > 1) {
                    return {
                        valid: false,
                        message: 'Please enter a valid date in any format:\n• 19/07/2000\n• July 19 2000\n• 19-07-2000'
                    };
                }
                return dobResult;

            case 'country':
                // AI-enhanced with typo correction
                return await validateGeographicInput(cleanValue, 'country');

            case 'city':
                // Use simple validation - accept ANY text
                return validateCityTown(cleanValue);

            case 'state':
                // AI-enhanced with typo correction
                return await validateGeographicInput(cleanValue, 'state');

            case 'phone':
                const phoneResult = validatePhoneNumber(cleanValue);
                if (!phoneResult.valid && userSession.attempts[fieldName] > 1) {
                    return {
                        valid: false,
                        message: 'Format: +[country code] [number]\n\nExample: +91 9876543210'
                    };
                }
                return phoneResult;

            case 'additionalEmail':
                const emailChoice = validateYesNo(cleanValue);
                if (emailChoice.valid) {
                    userSession.needsAdditionalEmail = emailChoice.value;
                    return { valid: true, value: emailChoice.value };
                }
                return { 
                    valid: false, 
                    message: userSession.attempts[fieldName] > 1 ? 
                        'Please reply: YES or NO' : 
                        'Please reply with YES or NO'
                };

            case 'linkedin':
                // Use simple validation - accept ANY text/link
                const linkedinResult = validateLinkedInURL(cleanValue);
                return linkedinResult;

            case 'instagram':
                if (userSession.instagramChoice === undefined) {
                    const instagramChoice = validateYesNo(cleanValue);
                    if (instagramChoice.valid) {
                        if (instagramChoice.value) {
                            userSession.instagramChoice = true;
                            return { 
                                valid: false, 
                                needsInstagramURL: true,
                                message: 'Enter your Instagram profile URL:\n\nExample: https://instagram.com/yourprofile' 
                            };
                        } else {
                            return { valid: true, value: null };
                        }
                    }
                    return { 
                        valid: false, 
                        message: userSession.attempts[fieldName] > 1 ? 
                            'Please reply: YES or NO' : 
                            'Please reply with YES or NO'
                    };
                } else {
                    // Use simple validation - accept ANY text/link
                    const instagramResult = validateInstagramURL(cleanValue);
                    return instagramResult;
                }

            case 'domain':
                const domainValidation = validateMultipleChoice(
                    cleanValue, 
                    ENHANCED_PROFILE_FIELDS.DOMAINS, 
                    1, 
                    1
                );
                if (domainValidation.valid) {
                    return { valid: true, value: domainValidation.value[0] };
                }
                return { 
                    valid: false, 
                    message: userSession.attempts[fieldName] > 1 ? 
                        'Please reply with a number from 1-20' : 
                        `Please select from 1-${ENHANCED_PROFILE_FIELDS.DOMAINS.length}`
                };

            case 'yatraImpact':
                const impactValidation = validateMultipleChoice(
                    cleanValue, 
                    ENHANCED_PROFILE_FIELDS.YATRA_IMPACT, 
                    1, 
                    3
                );
                if (impactValidation.valid) {
                    return { valid: true, value: impactValidation.value };
                }
                return { 
                    valid: false, 
                    message: userSession.attempts[fieldName] > 1 ? 
                        'Select 1-3 options\n\nExample: 1,2' : 
                        'Please select 1-3 options from the list'
                };

            case 'communityAsks':
                // CHANGED: Allow 1 or more selections, not fixed at 3
                const asksValidation = validateMultipleChoice(
                    cleanValue, 
                    ENHANCED_PROFILE_FIELDS.COMMUNITY_ASKS, 
                    1, 
                    null  // No maximum limit
                );
                if (asksValidation.valid) {
                    return { valid: true, value: asksValidation.value };
                }
                return { 
                    valid: false, 
                    message: userSession.attempts[fieldName] > 1 ? 
                        'Select 1 or more options\n\nExample: 1,3,5' : 
                        'Please select 1 or more options'
                };

            case 'communityGives':
                const givesValidation = validateMultipleChoice(
                    cleanValue, 
                    ENHANCED_PROFILE_FIELDS.COMMUNITY_GIVES, 
                    1, 
                    null
                );
                if (givesValidation.valid) {
                    return { valid: true, value: givesValidation.value };
                }
                return { 
                    valid: false, 
                    message: userSession.attempts[fieldName] > 1 ? 
                        'Select at least 1 option\n\nExample: 1,3,5' : 
                        'Please select at least 1 option'
                };

            default:
                return { 
                    valid: false, 
                    message: `Field "${fieldName}" not recognized. Please contact support.` 
                };
        }

    } catch (error) {
        logError(error, { operation: 'validateProfileField', fieldName, value });
        return { 
            valid: false, 
            message: 'Technical error. Please try again or contact support.' 
        };
    }
}

// Concise profile completion status
function getProfileCompletionStatus(user) {
    try {
        const { getIncompleteFields, getProfileCompletionPercentage } = require('../models/User');
        
        const incompleteFields = getIncompleteFields(user);
        const completionPercentage = getProfileCompletionPercentage(user);
        
        return {
            isComplete: incompleteFields.length === 0,
            completionPercentage: completionPercentage,
            incompleteFields: incompleteFields,
            totalFields: 13,
            completedFields: 13 - incompleteFields.length,
            searchUnlocked: incompleteFields.length === 0
        };

    } catch (error) {
        logError(error, { operation: 'getProfileCompletionStatus' });
        return {
            isComplete: false,
            completionPercentage: 0,
            incompleteFields: [],
            totalFields: 13,
            completedFields: 0,
            searchUnlocked: false
        };
    }
}

// Generate greeting with name for verified users with incomplete profiles
function generateResumeGreeting(user) {
    const name = user.enhancedProfile?.fullName || user.basicProfile?.name || 'there';
    const { getIncompleteFields } = require('../models/User');
    const incompleteFields = getIncompleteFields(user);
    
    if (incompleteFields.length === 0) {
        return `Hi **${name}**! 👋

Your profile is complete. Ready to connect with 9000+ fellow Yatris?

What expertise are you looking for today?`;
    }
    
    const nextField = incompleteFields[0];
    const remainingCount = incompleteFields.length;
    
    return `Hi **${name}**! 👋

Let's complete your profile to connect with 9000+ fellow Yatris.

**Remaining:** ${remainingCount} field${remainingCount > 1 ? 's' : ''}

**Next:** ${getFieldDisplayName(nextField)}

${getFieldPrompt(nextField)}`;
}

// Concise profile summary for WhatsApp
function generateProfileSummary(user) {
    try {
        const enhanced = user.enhancedProfile || {};
        const basic = user.basicProfile || {};
        
        let summary = `Profile Summary:\n\n`;
        
        // Basic Information
        if (enhanced.fullName) summary += `Name: ${enhanced.fullName}\n`;
        if (enhanced.gender) summary += `Gender: ${enhanced.gender}\n`;
        if (enhanced.professionalRole) summary += `Role: ${enhanced.professionalRole}\n`;
        if (enhanced.domain) summary += `Domain: ${enhanced.domain}\n`;
        
        // Location
        if (enhanced.city && enhanced.state && enhanced.country) {
            summary += `Location: ${enhanced.city}, ${enhanced.state}, ${enhanced.country}\n`;
        }
        
        // Contact
        if (enhanced.phone) summary += `Phone: ${enhanced.phone}\n`;
        if (basic.email) summary += `Email: ${basic.email}\n`;
        
        // Social
        if (enhanced.linkedin) summary += `LinkedIn: Added\n`;
        if (enhanced.instagram) summary += `Instagram: Added\n`;
        
        // Community
        if (enhanced.yatraImpact && enhanced.yatraImpact.length > 0) {
            summary += `Yatra Impact: ${enhanced.yatraImpact.length} selected\n`;
        }
        if (enhanced.communityAsks && enhanced.communityAsks.length > 0) {
            summary += `Support Needs: ${enhanced.communityAsks.length} areas\n`;
        }
        if (enhanced.communityGives && enhanced.communityGives.length > 0) {
            summary += `Contributions: ${enhanced.communityGives.length} offerings\n`;
        }
        
        const status = getProfileCompletionStatus(user);
        summary += `\nCompletion: ${status.completionPercentage}% (${status.completedFields}/${status.totalFields})\n`;
        summary += `Search Access: ${status.searchUnlocked ? 'Unlocked' : 'Locked (100% required)'}`;
        
        return summary;
        
    } catch (error) {
        logError(error, { operation: 'generateProfileSummary' });
        return 'Unable to generate profile summary.';
    }
}

// Progress indicator for user motivation
function getProgressMessage(user) {
    try {
        const status = getProfileCompletionStatus(user);
        const remaining = status.totalFields - status.completedFields;
        
        if (status.isComplete) {
            return `Profile Complete! Search feature unlocked.`;
        }
        
        if (remaining === 1) {
            return `Almost done! Just 1 more field to unlock search.`;
        }
        
        if (remaining <= 3) {
            return `Great progress! ${remaining} fields left to unlock search.`;
        }
        
        return `Progress: ${status.completedFields}/${status.totalFields} fields completed`;
        
    } catch (error) {
        logError(error, { operation: 'getProgressMessage' });
        return 'Profile in progress...';
    }
}

// Get next field to fill
function getNextIncompleteField(user) {
    try {
        const { getIncompleteFields } = require('../models/User');
        const incompleteFields = getIncompleteFields(user);
        
        if (incompleteFields.length === 0) {
            return null;
        }
        
        // Priority order for better UX
        const fieldOrder = [
            'fullName', 'gender', 'professionalRole', 'dateOfBirth',
            'country', 'city', 'state', 'phone', 'linkedin',
            'domain', 'yatraImpact', 'communityAsks', 'communityGives',
            'additionalEmail', 'instagram'
        ];
        
        for (const field of fieldOrder) {
            if (incompleteFields.includes(field)) {
                return field;
            }
        }
        
        return incompleteFields[0];
        
    } catch (error) {
        logError(error, { operation: 'getNextIncompleteField' });
        return null;
    }
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

// Get validation statistics for monitoring
function getValidationStatistics() {
    return {
        totalFields: 13,
        requiredFields: 13,
        optionalFields: 0,
        aiValidatedFields: ['city', 'state', 'country', 'dateOfBirth', 'linkedin'],
        formatValidatedFields: ['phone', 'linkedin', 'dateOfBirth', 'email', 'fullName'],
        multipleChoiceFields: ['gender', 'professionalRole', 'domain', 'yatraImpact', 'communityAsks', 'communityGives'],
        arrayFields: ['yatraImpact', 'communityAsks', 'communityGives'],
        strictValidationEnabled: true,
        completionRequirement: '100%',
        aiEnhancedFields: ['dateOfBirth', 'city', 'state', 'country', 'linkedin']
    };
}

module.exports = {
    getFieldPrompt,
    validateProfileField,
    getProfileCompletionStatus,
    generateProfileSummary,
    getProgressMessage,
    getNextIncompleteField,
    getFieldDisplayName,
    getValidationStatistics,
    generateResumeGreeting
};