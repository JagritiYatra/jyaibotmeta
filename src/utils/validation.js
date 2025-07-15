// Enhanced validation utilities with AI-powered validation and smooth user experience
// File: src/utils/validation.js
// ENHANCED VERSION - Better AI validation, smoother LinkedIn capture, and intelligent responses

const OpenAI = require('openai');
const { getConfig } = require('../config/environment');
const { logError, logAIOperation } = require('../middleware/logging');

let openai;
try {
    const config = getConfig();
    if (config.ai.apiKey) {
        openai = new OpenAI({ 
            apiKey: config.ai.apiKey,
            timeout: 30000
        });
    }
} catch (error) {
    console.warn('⚠️ OpenAI not initialized for validation');
}

// Enhanced geographic database with more flexible matching
const GEOGRAPHIC_DATABASE = {
    countries: [
        'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
        'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Cambodia',
        'Cameroon', 'Canada', 'Chile', 'China', 'Colombia', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark',
        'Ecuador', 'Egypt', 'Estonia', 'Ethiopia', 'Finland', 'France', 'Georgia', 'Germany', 'Ghana', 'Greece',
        'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan',
        'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Latvia', 'Lebanon', 'Lithuania', 'Malaysia', 'Mexico', 'Morocco',
        'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania',
        'Russia', 'Saudi Arabia', 'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland',
        'Thailand', 'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Vietnam', 'Zimbabwe'
    ],
    cities: [
        'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Surat', 'Jaipur',
        'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego',
        'London', 'Paris', 'Tokyo', 'Sydney', 'Toronto', 'Singapore', 'Dubai', 'Hong Kong', 'Berlin', 'Madrid',
        'Rome', 'Amsterdam', 'Stockholm', 'Copenhagen', 'Oslo', 'Helsinki', 'Zurich', 'Vienna', 'Brussels'
    ],
    states: [
        'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'West Bengal',
        'California', 'Texas', 'Florida', 'New York', 'Pennsylvania', 'Illinois', 'Ohio', 'Georgia',
        'Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba', 'Saskatchewan'
    ]
};

// Basic input sanitization
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, 1000).replace(/[<>]/g, '');
}

// Enhanced email validation
function validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const cleanEmail = sanitizeInput(email);
    
    if (!emailRegex.test(cleanEmail)) {
        return { 
            valid: false, 
            message: '❌ **Invalid Email Format**\n\nPlease enter a valid email address:\n\n**Examples:**\n• yourname@gmail.com\n• user@company.com' 
        };
    }
    
    return { valid: true, value: cleanEmail.toLowerCase() };
}

// AI-powered intelligent validation with context understanding
async function validateWithAI(input, fieldType, userContext = {}) {
    if (!openai) {
        return { aiValidated: false, suggestion: null };
    }
    
    try {
        const startTime = Date.now();
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{
                role: "system",
                content: `You are a helpful validation assistant for a professional networking platform. Your job is to:

1. Validate if the input is appropriate for the field type
2. Provide helpful suggestions if the input seems incorrect
3. Understand user intent and provide context-aware responses

Field Type: ${fieldType}

Validation Rules:
- Be lenient but helpful
- Understand common variations and spellings
- Provide constructive feedback
- If unsure, lean towards acceptance with suggestions

Response Format:
{
  "valid": true/false,
  "suggestion": "helpful message or null",
  "confidence": "high/medium/low",
  "corrected_value": "corrected value or null"
}`
            }, {
                role: "user",
                content: `Field: ${fieldType}
User Input: "${input}"
User Context: ${JSON.stringify(userContext)}

Please validate this input and provide helpful feedback.`
            }],
            max_tokens: 200,
            temperature: 0.3
        });
        
        const aiResponse = JSON.parse(response.choices[0].message.content);
        const duration = Date.now() - startTime;
        
        logAIOperation(`ai_validation_${fieldType}`, response.usage?.total_tokens || 0, 'gpt-4o-mini', duration);
        
        return {
            aiValidated: true,
            valid: aiResponse.valid,
            suggestion: aiResponse.suggestion,
            confidence: aiResponse.confidence,
            correctedValue: aiResponse.corrected_value
        };
        
    } catch (error) {
        logError(error, { operation: 'ai_validation', fieldType, input });
        return { aiValidated: false, suggestion: null };
    }
}

// Enhanced LinkedIn URL validation with better user experience
async function validateLinkedInURL(url, userContext = {}) {
    const cleanURL = sanitizeInput(url);
    
    // Check if user is just providing a username/handle
    if (!cleanURL.includes('http') && !cleanURL.includes('linkedin.com')) {
        // User might have just entered their LinkedIn username
        if (cleanURL.length > 2 && cleanURL.length < 100 && /^[a-zA-Z0-9\-_]+$/.test(cleanURL)) {
            const suggestedURL = `https://linkedin.com/in/${cleanURL}`;
            return { 
                valid: true, 
                value: suggestedURL,
                message: `✅ **LinkedIn URL Created**\n\nConverted "${cleanURL}" to:\n${suggestedURL}\n\n💡 Next time, you can paste the full URL from your LinkedIn profile.`
            };
        }
    }
    
    // Check for common LinkedIn URL patterns
    if (cleanURL.includes('linkedin') && !cleanURL.includes('linkedin.com')) {
        return { 
            valid: false, 
            message: '❌ **Incomplete LinkedIn URL**\n\nPlease use the full LinkedIn URL:\n\n**Examples:**\n• https://linkedin.com/in/yourname\n• https://www.linkedin.com/in/john-smith-123\n\n**Or just enter your LinkedIn username:**\n• yourname\n• john-smith-123' 
        };
    }
    
    if (!cleanURL.toLowerCase().includes('linkedin.com')) {
        return { 
            valid: false, 
            message: '❌ **Not a LinkedIn URL**\n\nPlease enter either:\n\n**Full URL:**\n• https://linkedin.com/in/yourname\n• https://www.linkedin.com/in/john-smith-123\n\n**Or just your LinkedIn username:**\n• yourname\n• john-smith-123' 
        };
    }
    
    // Try to parse and validate URL
    try {
        let urlToValidate = cleanURL;
        
        // Add https:// if missing
        if (!urlToValidate.startsWith('http')) {
            urlToValidate = 'https://' + urlToValidate;
        }
        
        const urlObj = new URL(urlToValidate);
        
        if (!urlObj.hostname.includes('linkedin.com')) {
            return { 
                valid: false, 
                message: '❌ **Invalid LinkedIn Domain**\n\nURL must be from linkedin.com\n\n**Example:** https://linkedin.com/in/yourprofile' 
            };
        }
        
        // Check for profile URL pattern
        if (!urlObj.pathname.includes('/in/')) {
            return { 
                valid: false, 
                message: '❌ **Invalid LinkedIn Profile URL**\n\nPlease use your LinkedIn profile URL that contains "/in/":\n\n**Examples:**\n• https://linkedin.com/in/yourname\n• https://www.linkedin.com/in/john-smith-123\n\n**How to find it:**\n1. Go to your LinkedIn profile\n2. Copy the URL from the address bar\n3. Paste it here' 
            };
        }
        
        // Clean up the URL
        const cleanedURL = urlToValidate.split('?')[0]; // Remove query parameters
        
        return { 
            valid: true, 
            value: cleanedURL,
            message: '✅ **LinkedIn URL Validated**\n\nGreat! Your LinkedIn profile URL has been saved.' 
        };
        
    } catch (error) {
        return { 
            valid: false, 
            message: '❌ **Invalid URL Format**\n\nPlease enter a valid LinkedIn URL:\n\n**Examples:**\n• https://linkedin.com/in/yourname\n• https://www.linkedin.com/in/john-smith-123\n\n**Tips:**\n• Copy the URL from your LinkedIn profile\n• Make sure it starts with https://\n• Or just enter your LinkedIn username' 
        };
    }
}

// Enhanced geographic validation with AI assistance
async function validateGeographicInput(input, type = 'city') {
    const cleanInput = sanitizeInput(input);
    
    // Basic validation
    if (cleanInput.length < 2 || cleanInput.length > 50) {
        return { 
            valid: false, 
            message: `❌ **Invalid ${type} Length**\n\n${type.charAt(0).toUpperCase() + type.slice(1)} must be 2-50 characters long.\n\n**Examples:**\n${getExamplesForType(type)}` 
        };
    }
    
    if (!/^[a-zA-Z\s\-.'()]+$/.test(cleanInput)) {
        return { 
            valid: false, 
            message: `❌ **Invalid Characters**\n\n${type.charAt(0).toUpperCase() + type.slice(1)} should only contain letters, spaces, hyphens, and apostrophes.\n\n**Examples:**\n${getExamplesForType(type)}` 
        };
    }
    
    // Check against known database first
    const knownEntries = GEOGRAPHIC_DATABASE[type === 'country' ? 'countries' : type === 'state' ? 'states' : 'cities'];
    const isKnown = knownEntries.some(entry => 
        entry.toLowerCase() === cleanInput.toLowerCase() ||
        entry.toLowerCase().includes(cleanInput.toLowerCase())
    );
    
    if (isKnown) {
        return { valid: true, value: cleanInput };
    }
    
    // AI validation for unknown entries
    const aiResult = await validateWithAI(cleanInput, type);
    
    if (aiResult.aiValidated) {
        if (aiResult.valid) {
            return { 
                valid: true, 
                value: aiResult.correctedValue || cleanInput,
                message: aiResult.suggestion ? `ℹ️ ${aiResult.suggestion}` : null
            };
        } else {
            return { 
                valid: false, 
                message: `❌ **"${cleanInput}" doesn't appear to be a valid ${type}**\n\n${aiResult.suggestion || 'Please enter a real ' + type + ' name.'}\n\n**Examples:**\n${getExamplesForType(type)}` 
            };
        }
    }
    
    // Fallback validation
    if (isProbablyPersonName(cleanInput) || isProbablyInvalid(cleanInput)) {
        return { 
            valid: false, 
            message: `❌ **"${cleanInput}" doesn't appear to be a valid ${type}**\n\nPlease enter a real ${type} name.\n\n**Examples:**\n${getExamplesForType(type)}` 
        };
    }
    
    return { valid: true, value: cleanInput };
}

// Enhanced name validation with AI assistance
async function validateFullName(name) {
    const cleanName = sanitizeInput(name);
    
    if (cleanName.length < 2 || cleanName.length > 100) {
        return { 
            valid: false, 
            message: '❌ **Invalid Name Length**\n\nName should be 2-100 characters long.\n\n**Example:** Rajesh Kumar Singh' 
        };
    }
    
    if (!/^[a-zA-Z\s\-.']+$/.test(cleanName)) {
        return { 
            valid: false, 
            message: '❌ **Invalid Characters**\n\nName should only contain letters, spaces, hyphens, and apostrophes.\n\n**Example:** Mary O\'Connor-Smith' 
        };
    }
    
    // Check for obviously fake names
    if (/^(test|example|sample|dummy|user|admin)/i.test(cleanName)) {
        return { 
            valid: false, 
            message: '❌ **Please Enter Real Name**\n\nTest names are not allowed.\n\n**Example:** Your actual full name' 
        };
    }
    
    // AI validation for name quality
    const aiResult = await validateWithAI(cleanName, 'fullName');
    
    if (aiResult.aiValidated && !aiResult.valid) {
        return { 
            valid: false, 
            message: `❌ **Name Validation Issue**\n\n${aiResult.suggestion || 'Please enter your real full name.'}\n\n**Example:** Rajesh Kumar Singh` 
        };
    }
    
    return { valid: true, value: cleanName };
}

// Enhanced date validation with better user experience
function validateDateOfBirth(dateStr) {
    const cleanDate = sanitizeInput(dateStr);
    
    // Try to parse different date formats
    const formats = [
        /^(\d{2})-(\d{2})-(\d{4})$/,  // DD-MM-YYYY
        /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
        /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // D-M-YYYY or DD-M-YYYY
    ];
    
    let match = null;
    let day, month, year;
    
    for (const format of formats) {
        match = cleanDate.match(format);
        if (match) {
            [, day, month, year] = match;
            break;
        }
    }
    
    if (!match) {
        return { 
            valid: false, 
            message: '❌ **Invalid Date Format**\n\nPlease use: DD-MM-YYYY\n\n**Examples:**\n• 15-08-1995\n• 03-12-1988\n• 25-06-1992\n\n**Also accepted:**\n• 15/08/1995\n• 15.08.1995' 
        };
    }
    
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    // Validate ranges
    if (yearNum < 1960 || yearNum > 2010) {
        return { 
            valid: false, 
            message: '❌ **Invalid Birth Year**\n\nYear must be between 1960-2010\n\n**Example:** 15-08-1995' 
        };
    }
    
    if (monthNum < 1 || monthNum > 12) {
        return { 
            valid: false, 
            message: '❌ **Invalid Month**\n\nMonth must be between 01-12\n\n**Examples:**\n• 15-01-1995 (January)\n• 15-12-1995 (December)' 
        };
    }
    
    if (dayNum < 1 || dayNum > 31) {
        return { 
            valid: false, 
            message: '❌ **Invalid Day**\n\nDay must be between 01-31\n\n**Examples:**\n• 01-08-1995\n• 31-12-1995' 
        };
    }
    
    // Validate actual date
    const testDate = new Date(yearNum, monthNum - 1, dayNum);
    if (testDate.getFullYear() !== yearNum || 
        testDate.getMonth() !== monthNum - 1 || 
        testDate.getDate() !== dayNum) {
        return { 
            valid: false, 
            message: '❌ **Invalid Date**\n\nThis date doesn\'t exist.\n\n**Valid examples:**\n• 28-02-1995\n• 29-02-1996 (leap year)\n• 30-04-1995' 
        };
    }
    
    // Format as DD-MM-YYYY for consistency
    const formattedDate = `${dayNum.toString().padStart(2, '0')}-${monthNum.toString().padStart(2, '0')}-${yearNum}`;
    
    return { valid: true, value: formattedDate };
}

// Enhanced phone number validation
function validatePhoneNumber(phone) {
    const cleanPhone = sanitizeInput(phone);
    const digitsOnly = cleanPhone.replace(/[^\d]/g, '');
    
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return { 
            valid: false, 
            message: '❌ **Invalid Phone Number Length**\n\nPhone number must be 10-15 digits\n\n**Examples:**\n• +91 9876543210 (India)\n• +1 2025551234 (USA)\n• +44 7911123456 (UK)\n\n**You can also enter without + sign:**\n• 919876543210\n• 12025551234' 
        };
    }
    
    // Format phone number for better presentation
    let formattedPhone = cleanPhone;
    if (!formattedPhone.startsWith('+') && digitsOnly.length > 10) {
        formattedPhone = '+' + digitsOnly;
    }
    
    return { valid: true, value: formattedPhone };
}

// Enhanced multiple choice validation
function validateMultipleChoice(input, options, minSelections = 1, maxSelections = null) {
    const cleanInput = sanitizeInput(input);
    
    if (!cleanInput || cleanInput.trim() === '') {
        return { 
            valid: false, 
            message: `❌ **No Selection Made**\n\nPlease select ${minSelections === maxSelections ? 'exactly' : 'at least'} ${minSelections} option${minSelections > 1 ? 's' : ''}.\n\n**Format:** 1,3,5 (numbers separated by commas)` 
        };
    }
    
    // Parse numbers more flexibly
    const numbers = cleanInput.split(/[,\s]+/)
        .map(n => parseInt(n.trim()))
        .filter(n => !isNaN(n) && n > 0);
    
    if (numbers.length === 0) {
        return { 
            valid: false, 
            message: `❌ **Invalid Format**\n\nPlease use numbers separated by commas or spaces.\n\n**Examples:**\n• Single: 3\n• Multiple: 1,4,7\n• With spaces: 1 3 5` 
        };
    }
    
    if (numbers.length < minSelections) {
        return { 
            valid: false, 
            message: `❌ **Too Few Selections**\n\nPlease select ${minSelections === maxSelections ? 'exactly' : 'at least'} ${minSelections} option${minSelections > 1 ? 's' : ''}.\n\nYou selected: ${numbers.length}\nRequired: ${minSelections}${maxSelections ? ` to ${maxSelections}` : '+'}\n\n**Example:** ${Array.from({length: minSelections}, (_, i) => i + 1).join(',')}` 
        };
    }
    
    if (maxSelections && numbers.length > maxSelections) {
        return { 
            valid: false, 
            message: `❌ **Too Many Selections**\n\nPlease select maximum ${maxSelections} option${maxSelections > 1 ? 's' : ''}.\n\nYou selected: ${numbers.length}\nMaximum: ${maxSelections}\n\n**Example:** ${Array.from({length: maxSelections}, (_, i) => i + 1).join(',')}` 
        };
    }
    
    // Remove duplicates
    const uniqueNumbers = [...new Set(numbers)];
    
    // Check valid range
    const invalidNumbers = uniqueNumbers.filter(n => n < 1 || n > options.length);
    if (invalidNumbers.length > 0) {
        return { 
            valid: false, 
            message: `❌ **Invalid Option${invalidNumbers.length > 1 ? 's' : ''}**\n\nInvalid: ${invalidNumbers.join(', ')}\nValid range: 1 to ${options.length}` 
        };
    }
    
    const selectedOptions = uniqueNumbers.map(n => options[n - 1]);
    return { valid: true, value: selectedOptions, numbers: uniqueNumbers };
}

// Gender validation
function validateGender(input) {
    const cleanInput = sanitizeInput(input);
    const genderMap = {
        '1': 'Male',
        '2': 'Female', 
        '3': 'Others',
        'male': 'Male',
        'female': 'Female',
        'other': 'Others',
        'others': 'Others',
        'm': 'Male',
        'f': 'Female',
        'o': 'Others'
    };
    
    const normalizedInput = cleanInput.toLowerCase();
    
    if (!genderMap[normalizedInput]) {
        return { 
            valid: false, 
            message: '❌ **Invalid Selection**\n\nPlease select:\n\n1️⃣ Male\n2️⃣ Female\n3️⃣ Others\n\n**You can also type:** Male, Female, Others' 
        };
    }
    
    return { valid: true, value: genderMap[normalizedInput] };
}

// Yes/No validation
function validateYesNo(input) {
    const cleanInput = sanitizeInput(input).toLowerCase();
    
    const yesValues = ['yes', 'y', '1', 'true', 'ok', 'okay', 'sure', 'yep', 'yeah'];
    const noValues = ['no', 'n', '2', 'false', 'nope', 'nah', 'cancel'];
    
    if (yesValues.includes(cleanInput)) {
        return { valid: true, value: true };
    } else if (noValues.includes(cleanInput)) {
        return { valid: true, value: false };
    }
    
    return { 
        valid: false, 
        message: '❌ **Invalid Response**\n\nPlease reply with:\n• YES or NO\n• Y or N\n• 1 or 2\n\n**Also accepted:** Sure, Okay, Nope, Cancel' 
    };
}

// Instagram URL validation
function validateInstagramURL(url) {
    const cleanURL = sanitizeInput(url);
    
    // Handle username-only input
    if (!cleanURL.includes('http') && !cleanURL.includes('instagram.com')) {
        if (cleanURL.length > 1 && cleanURL.length < 50 && /^[a-zA-Z0-9._]+$/.test(cleanURL)) {
            const suggestedURL = `https://instagram.com/${cleanURL}`;
            return { 
                valid: true, 
                value: suggestedURL,
                message: `✅ **Instagram URL Created**\n\nConverted "${cleanURL}" to:\n${suggestedURL}`
            };
        }
    }
    
    if (!cleanURL.toLowerCase().includes('instagram.com')) {
        return { 
            valid: false, 
            message: '❌ **Not an Instagram URL**\n\nPlease enter:\n• Full URL: https://instagram.com/username\n• Or just username: username' 
        };
    }
    
    try {
        let urlToValidate = cleanURL;
        if (!urlToValidate.startsWith('http')) {
            urlToValidate = 'https://' + urlToValidate;
        }
        
        const urlObj = new URL(urlToValidate);
        
        if (!urlObj.hostname.includes('instagram.com')) {
            return { 
                valid: false, 
                message: '❌ **Invalid Instagram Domain**\n\nURL must be from instagram.com' 
            };
        }
        
        return { valid: true, value: urlToValidate.split('?')[0] };
        
    } catch {
        return { 
            valid: false, 
            message: '❌ **Invalid URL Format**\n\nPlease enter:\n• https://instagram.com/username\n• Or just: username' 
        };
    }
}

// Helper functions
function isProbablyPersonName(input) {
    const personNamePatterns = [
        /^[A-Z][a-z]+ [A-Z][a-z]+$/,
        /^Mr\.?\s|Ms\.?\s|Mrs\.?\s|Dr\.?\s/,
    ];
    
    const commonFirstNames = [
        'john', 'jane', 'michael', 'sarah', 'david', 'lisa', 'robert', 'mary',
        'raj', 'priya', 'amit', 'neha', 'rohit', 'kavya', 'rahul', 'anjali'
    ];
    
    const words = input.toLowerCase().split(' ');
    
    return personNamePatterns.some(pattern => pattern.test(input)) ||
           commonFirstNames.some(name => words.includes(name));
}

function isProbablyInvalid(input) {
    const invalidPatterns = [
        /^(test|example|sample|dummy)$/i,
        /^[0-9]+$/,
        /^[^a-zA-Z]*$/,
        /^.{1}$/,
        /^(na|n\/a|nil|none|null)$/i,
        /^(abc|xyz|def|asdf|qwerty|1234)$/i
    ];
    
    return invalidPatterns.some(pattern => pattern.test(input.trim()));
}

function getExamplesForType(type) {
    const examples = {
        city: '• Mumbai, Delhi, Bangalore\n• New York, London, Toronto\n• Singapore, Dubai, Sydney',
        state: '• Maharashtra, California, Ontario\n• Texas, Victoria, Queensland\n• Bavaria, New South Wales',
        country: '• India, United States, Canada\n• United Kingdom, Australia\n• Germany, France, Japan'
    };
    
    return examples[type] || 'Valid geographic name';
}

// Main validation function with AI assistance
async function validateWithAIAssistance(fieldName, value, userSession = {}) {
    const validationFunctions = {
        fullName: validateFullName,
        email: validateEmail,
        phone: validatePhoneNumber,
        linkedin: validateLinkedInURL,
        instagram: validateInstagramURL,
        gender: validateGender,
        dateOfBirth: validateDateOfBirth,
        city: (val) => validateGeographicInput(val, 'city'),
        state: (val) => validateGeographicInput(val, 'state'),
        country: (val) => validateGeographicInput(val, 'country')
    };
    
    const validator = validationFunctions[fieldName];
    if (!validator) {
        return { valid: false, message: 'Unknown field type' };
    }
    
    try {
        const result = await validator(value, userSession);
        return result;
    } catch (error) {
        logError(error, { operation: 'validation', fieldName, value });
        return { valid: false, message: 'Validation error occurred' };
    }
}

module.exports = {
    sanitizeInput,
    validateEmail,
    validateLinkedInURL,
    validateGeographicInput,
    validateFullName,
    validateDateOfBirth,
    validatePhoneNumber,
    validateInstagramURL,
    validateMultipleChoice,
    validateGender,
    validateYesNo,
    validateWithAI,
    validateWithAIAssistance,
    isProbablyPersonName,
    isProbablyInvalid,
    getExamplesForType,
    GEOGRAPHIC_DATABASE
};