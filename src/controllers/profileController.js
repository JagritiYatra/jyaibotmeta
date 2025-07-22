// Enhanced profile controller with strict validation and professional messaging
// File: src/controllers/profileController.js
// FIXED VERSION - Uses simple validation for geographic fields

const { ENHANCED_PROFILE_FIELDS } = require('../models/User');
const {
  validateFullName,
  validateGender,
  validateDateOfBirth,
  validateCityInput,
  validateStateInput,
  validateCountryInput,
  validatePhoneNumber,
  validateEmail,
  validateLinkedInURL,
  validateInstagramURL,
  validateMultipleChoice,
  validateYesNo,
  sanitizeInput,
} = require('../utils/validation');
const { validateAddress } = require('../utils/simpleValidation');
const { logError, logSuccess } = require('../middleware/logging');

// Professional field prompts - concise and clear
async function getFieldPrompt(fieldName, userSession = {}) {
  try {
    const prompts = {
      fullName: `Please enter your full name:

Example: Rajesh Kumar Singh`,

      gender: `Select your gender:

1. Male
2. Female  
3. Others

Reply: 1, 2, or 3`,

      professionalRole: `Select your professional role:

1. Entrepreneur
2. Student
3. Working Professional
4. Startup Founder
5. NGO Founder
6. Researcher
7. Freelancer
8. Consultant

Reply: 1-8`,

      dateOfBirth: `Enter your date of birth:

Format: DD MM YYYY
Examples: 19 07 2000, 19/07/2000, 19-07-2000

Any date format works - I'll understand it.`,

      country: `Enter your country:

Example: India`,

      address: `Enter your complete address:

Please include: City, State/Province, Country

Examples:
• Mumbai, Maharashtra, India
• Bangalore, Karnataka, India
• New York, NY, USA
• London, England, UK

Just type your full location details in any format!`,

      phone: `Enter your mobile number with country code:

Examples:
+91 9876543210
+1 2025551234
+44 7911123456`,

      additionalEmail: `Do you have an additional email address?

Reply: YES or NO`,

      linkedin: `Enter your LinkedIn profile URL:

Examples:
- https://linkedin.com/in/yourname
- linkedin.com/in/yourname
- yourname (just your LinkedIn username)

Any format works!`,

      instagram: `Do you have an Instagram profile to share?

Reply: YES or NO`,

      instagramURL: `Enter your Instagram profile URL:

Example: https://instagram.com/yourname`,

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

Reply: 1-20`,

      yatraImpact: `How did Yatra help you personally? (Select multiple)

1. Started Enterprise Post-Yatra
2. Found Clarity in Journey
3. Received Funding / Grant

Examples: 1 or 1,2 or 1,2,3`,

      communityAsks: `What are your primary support needs from community?

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

Select 1-3 options: Example: 1,3,5`,

      communityGives: `What can you give to the community? (Select up to 3)

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

Example: 1,3,7`,
    };

    return prompts[fieldName] || `Please provide your ${fieldName}:`;
  } catch (error) {
    logError(error, { operation: 'getFieldPrompt', fieldName });
    return `Please provide your ${fieldName}:`;
  }
}

// Get progressive error message based on attempt count
function getProgressiveErrorMessage(fieldName, baseMessage, attempt, value = '') {
  const messages = {
    fullName: [
      baseMessage,
      `${baseMessage}\n\n💡 Example: Priya Sharma or Amit Kumar Singh`,
      `${baseMessage}\n\n💡 Examples:\n• Priya Sharma\n• Amit Kumar Singh\n• Dr. Rajesh Verma\n\nJust type your complete name (first & last name).`,
      `I see you're having trouble. Let me help!\n\nYour full name should have:\n✓ First name and last name\n✓ Only letters and spaces\n✗ No numbers or special characters\n\nExample: If your name is Priya, type "Priya Sharma"\n\nOr type "skip" to continue.`
    ],
    phone: [
      baseMessage,
      `${baseMessage}\n\n💡 Examples:\n• +91 9876543210\n• 9876543210`,
      `${baseMessage}\n\n💡 Phone format help:\n• India: +91 9876543210 or 9876543210\n• USA: +1 2025551234\n• UK: +44 7911123456\n\nJust type your number with country code!`,
      `Let me help with your phone number!\n\nFormat: [Country Code] [Number]\n\nFor India: +91 followed by 10 digits\nExample: +91 9876543210\n\nYou entered: "${value}"\n${value.length < 10 ? 'Too short - needs 10 digits' : ''}\n${!/^\+?[0-9\s-]+$/.test(value) ? 'Only numbers allowed' : ''}\n\nOr type "skip" to continue.`
    ],
    email: [
      baseMessage,
      `${baseMessage}\n\n💡 Example: priya.sharma@gmail.com`,
      `${baseMessage}\n\n💡 Email examples:\n• yourname@gmail.com\n• firstname.lastname@company.com\n• name123@yahoo.com\n\nMake sure to include @ and domain!`,
      `I see the issue with your email!\n\nYou entered: "${value}"\n${!value.includes('@') ? '❌ Missing @ symbol' : ''}\n${!value.includes('.') ? '❌ Missing domain (.com, .in, etc)' : ''}\n\nCorrect format: username@domain.com\n\nExamples:\n• priya@gmail.com\n• amit.kumar@company.in\n\nOr type "skip" to continue.`
    ],
    dateOfBirth: [
      baseMessage,
      `${baseMessage}\n\n💡 Examples: 15 08 1995 or 15/08/1995`,
      `${baseMessage}\n\n💡 Date formats accepted:\n• 15 08 1995\n• 15/08/1995\n• 15-08-1995\n• 15-Aug-1995\n\nJust type day, month, and year in any format!`,
      `Let me help with your birth date!\n\nYou entered: "${value}"\n\nAccepted formats:\n✓ DD MM YYYY (15 08 1995)\n✓ DD/MM/YYYY (15/08/1995)\n✓ DD-MM-YYYY (15-08-1995)\n\nMake sure:\n• Day: 1-31\n• Month: 1-12\n• Year: 1950-2010\n\nOr type "skip" to continue.`
    ],
    linkedin: [
      baseMessage,
      `${baseMessage}\n\n💡 Examples:\n• https://linkedin.com/in/johndoe\n• johndoe`,
      `${baseMessage}\n\n💡 LinkedIn format:\n• Full URL: https://linkedin.com/in/yourname\n• Short URL: linkedin.com/in/yourname\n• Just username: yourname\n\nAny format works!`,
      `Let me help with your LinkedIn!\n\nYou entered: "${value}"\n\nAccepted formats:\n✓ https://linkedin.com/in/priya-sharma\n✓ linkedin.com/in/priya-sharma\n✓ priya-sharma\n✓ Just your LinkedIn username\n\nDon't have LinkedIn? Type "skip" to continue.`
    ],
    address: [
      baseMessage,
      `${baseMessage}\n\n💡 Example: Mumbai, Maharashtra, India`,
      `${baseMessage}\n\n💡 Location examples:\n• Mumbai, Maharashtra, India\n• Bangalore, Karnataka\n• New York, USA\n• Just your city and state`,
      `Let me help with your location!\n\nJust type your city, state, and country:\n\nExamples:\n• Mumbai, Maharashtra, India\n• Delhi, India\n• Pune, Maharashtra\n• San Francisco, CA, USA\n\nYou can type it in any format you prefer!\n\nOr type "skip" to continue.`
    ]
  };

  const fieldMessages = messages[fieldName] || [baseMessage];
  const messageIndex = Math.min(attempt - 1, fieldMessages.length - 1);
  return fieldMessages[messageIndex];
}

// Enhanced field validation with progressive error messages
async function validateProfileField(fieldName, value, userSession = {}) {
  try {
    const cleanValue = sanitizeInput(value);

    console.log(`🔍 Validating field "${fieldName}" with value: "${cleanValue}"`);

    // Track attempts
    if (!userSession.attempts) userSession.attempts = {};
    if (!userSession.attempts[fieldName]) userSession.attempts[fieldName] = 0;
    userSession.attempts[fieldName]++;
    
    const attempt = userSession.attempts[fieldName];

    switch (fieldName) {
      case 'fullName':
        const nameResult = await validateFullName(cleanValue);
        if (!nameResult.valid) {
          return {
            valid: false,
            message: getProgressiveErrorMessage('fullName', nameResult.message, attempt, cleanValue),
          };
        }
        return nameResult;

      case 'gender':
        const genderResult = validateGender(cleanValue);
        if (!genderResult.valid) {
          return {
            valid: false,
            message: 'Please select 1, 2, or 3:\n\n1. Male\n2. Female\n3. Others',
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
          message: 'Please select a number from 1-8',
        };

      case 'dateOfBirth':
        const dobResult = await validateDateOfBirth(cleanValue);
        if (!dobResult.valid) {
          return {
            valid: false,
            message: getProgressiveErrorMessage('dateOfBirth', dobResult.message, attempt, cleanValue),
          };
        }
        return dobResult;

      case 'country':
        // Use simple validation - no AI
        const countryResult = validateCountryInput(cleanValue);
        if (!countryResult.valid) {
          return {
            valid: false,
            message: countryResult.message,
          };
        }
        return countryResult;

      case 'address':
        // Use simple address validation from simpleValidation.js
        const addressResult = validateAddress(cleanValue);
        if (!addressResult.valid) {
          return {
            valid: false,
            message: getProgressiveErrorMessage('address', addressResult.message, attempt, cleanValue),
          };
        }
        return addressResult;

      case 'phone':
        const phoneResult = validatePhoneNumber(cleanValue);
        if (!phoneResult.valid) {
          return {
            valid: false,
            message: getProgressiveErrorMessage('phone', phoneResult.message, attempt, cleanValue),
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
          message: 'Please reply: YES or NO',
        };

      case 'additionalEmailInput':
        const emailValidation = validateEmail(cleanValue);
        if (!emailValidation.valid) {
          return {
            valid: false,
            message: getProgressiveErrorMessage('email', emailValidation.message, attempt, cleanValue),
          };
        }
        return emailValidation;

      case 'linkedin':
        const linkedinResult = validateLinkedInURL(cleanValue);
        if (!linkedinResult.valid) {
          return {
            valid: false,
            message: getProgressiveErrorMessage('linkedin', linkedinResult.message, attempt, cleanValue),
          };
        }
        console.log(`✅ LinkedIn validation successful: ${linkedinResult.value}`);
        return linkedinResult;

      case 'instagram':
        const instagramChoice = validateYesNo(cleanValue);
        if (instagramChoice.valid) {
          userSession.needsInstagram = instagramChoice.value;
          return { valid: true, value: instagramChoice.value };
        }
        return {
          valid: false,
          message: 'Please reply: YES or NO',
        };

      case 'instagramURL':
        const instagramResult = validateInstagramURL(cleanValue);
        if (!instagramResult.valid) {
          return {
            valid: false,
            message: instagramResult.message,
          };
        }
        return instagramResult;

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
          message: 'Please select a number from 1-20',
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
          message: 'Please select 1-3 options.\n\nExample: 1,2 or 1,2,3',
        };

      case 'communityAsks':
        const asksValidation = validateMultipleChoice(
          cleanValue,
          ENHANCED_PROFILE_FIELDS.COMMUNITY_ASKS,
          1,
          3
        );
        if (asksValidation.valid) {
          return { valid: true, value: asksValidation.value };
        }
        return {
          valid: false,
          message: 'Please select 1-3 options.\n\nExample: 1,3 or 1,3,5',
        };

      case 'communityGives':
        const givesValidation = validateMultipleChoice(
          cleanValue,
          ENHANCED_PROFILE_FIELDS.COMMUNITY_GIVES,
          1,
          3
        );
        if (givesValidation.valid) {
          return { valid: true, value: givesValidation.value };
        }
        return {
          valid: false,
          message: 'Please select 1-3 options.\n\nExample: 1,3,7',
        };

      default:
        return {
          valid: false,
          message: `Field "${fieldName}" not recognized.`,
        };
    }
  } catch (error) {
    console.error(`❌ Error validating ${fieldName}:`, error);
    logError(error, { operation: 'validateProfileField', fieldName, value });
    return {
      valid: false,
      message: 'Technical error. Please try again.',
    };
  }
}

// Generate greeting with name for profile resumption
function generateResumeGreeting(user) {
  const name = user.enhancedProfile?.fullName || user.basicProfile?.name || 'there';
  const { getIncompleteFields } = require('../models/User');
  const incompleteFields = getIncompleteFields(user);

  if (incompleteFields.length === 0) {
    return `Hi **${name}**! 👋

Your profile is complete. Ready to connect with 9000+ fellow Yatris?

What expertise are you looking for today?`;
  }

  const remainingCount = incompleteFields.length;

  return `Hi **${name}**! 👋

Let's complete your profile to connect with 9000+ fellow Yatris.

${remainingCount} field${remainingCount > 1 ? 's' : ''} remaining.

Ready to continue?`;
}

// Get field display name
function getFieldDisplayName(fieldName) {
  const displayNames = {
    fullName: 'Full Name',
    gender: 'Gender',
    professionalRole: 'Professional Role',
    dateOfBirth: 'Date of Birth',
    country: 'Country',
    address: 'Complete Address',
    phone: 'Mobile Number',
    additionalEmail: 'Additional Email',
    additionalEmailInput: 'Additional Email Address',
    linkedin: 'LinkedIn Profile',
    instagram: 'Instagram Profile',
    instagramURL: 'Instagram Profile URL',
    domain: 'Industry Domain',
    yatraImpact: 'Yatra Impact',
    communityAsks: 'Community Support Needs',
    communityGives: 'Community Contributions',
  };

  return displayNames[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
}

// Get profile completion status
function getProfileCompletionStatus(user) {
  try {
    const { getIncompleteFields, getProfileCompletionPercentage } = require('../models/User');

    const incompleteFields = getIncompleteFields(user);
    const completionPercentage = getProfileCompletionPercentage(user);

    return {
      isComplete: incompleteFields.length === 0,
      completionPercentage,
      incompleteFields,
      totalFields: 13,
      completedFields: 13 - incompleteFields.length,
      searchUnlocked: incompleteFields.length === 0,
    };
  } catch (error) {
    logError(error, { operation: 'getProfileCompletionStatus' });
    return {
      isComplete: false,
      completionPercentage: 0,
      incompleteFields: [],
      totalFields: 13,
      completedFields: 0,
      searchUnlocked: false,
    };
  }
}

// Generate smart help for field validation
async function generateSmartHelp(fieldName, userSession) {
  try {
    const retryCount = userSession.field_retry_count || 0;

    // Provide increasingly helpful messages based on retry count
    if (retryCount >= 3) {
      switch (fieldName) {
        case 'linkedin':
          return `💡 **Need help?**\n\nJust paste any LinkedIn URL or username:\n• https://linkedin.com/in/johndoe\n• johndoe\n• Any LinkedIn link\n\nOr type "skip" to continue without LinkedIn.`;
        case 'address':
          return `💡 **Examples:**\n• Mumbai, Maharashtra, India\n• New York, NY, USA\n• London, UK\n\nJust type your location in any format!`;
        case 'phone':
          return `💡 **Phone format:**\n• For India: +91 9876543210 or 9876543210\n• For USA: +1 2025551234\n• Just enter your number with country code`;
        default:
          return `💡 Type "skip" if you want to continue without this field.`;
      }
    } else if (retryCount >= 2) {
      return `💡 Having trouble? You can type "skip" to move to the next field.`;
    }

    return null; // No help message for first attempt
  } catch (error) {
    logError(error, { operation: 'generateSmartHelp', fieldName });
    return null;
  }
}

module.exports = {
  getFieldPrompt,
  validateProfileField,
  getProfileCompletionStatus,
  getFieldDisplayName,
  generateResumeGreeting,
  generateSmartHelp,
};
