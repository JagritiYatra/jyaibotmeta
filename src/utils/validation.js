// Enhanced validation utilities with AI-powered validation and intelligent data capture
// File: src/utils/validation.js
// AI-ENHANCED VERSION - Smart date parsing, typo correction, and SUPER SIMPLE LinkedIn handling

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
            message: 'Invalid email format. Please enter a valid email address:\n\nExample: yourname@gmail.com' 
        };
    }
    
    return { valid: true, value: cleanEmail.toLowerCase() };
}

// AI-enhanced date validation with flexible parsing
async function validateDateOfBirth(dateStr) {
    const cleanDate = sanitizeInput(dateStr);
    
    if (!openai) {
        return validateDateFallback(cleanDate);
    }
    
    try {
        const startTime = Date.now();
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{
                role: "system",
                content: `Parse date of birth from user input and convert to YYYY-MM-DD format.

Rules:
- Accept any human-readable date format
- Year must be between 1960-2010
- Return JSON: {"valid": true/false, "date": "YYYY-MM-DD" or null, "error": "message" or null}
- Be lenient with formats but strict with validation

Examples:
"19/07/2000" → {"valid": true, "date": "2000-07-19", "error": null}
"July 19 2000" → {"valid": true, "date": "2000-07-19", "error": null}
"2025-01-01" → {"valid": false, "date": null, "error": "Year must be between 1960-2010"}
"invalid" → {"valid": false, "date": null, "error": "Invalid date format"}`
            }, {
                role: "user",
                content: `Parse date: "${cleanDate}"`
            }],
            max_tokens: 150,
            temperature: 0.1
        });
        
        let aiResponse = response.choices[0].message.content.trim();
        aiResponse = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        const result = JSON.parse(aiResponse);
        const duration = Date.now() - startTime;
        
        logAIOperation('date_validation', response.usage?.total_tokens || 0, 'gpt-4o-mini', duration);
        
        if (result.valid) {
            return { valid: true, value: result.date };
        } else {
            return { 
                valid: false, 
                message: result.error || 'Invalid date format. Please try again.'
            };
        }
        
    } catch (error) {
        logError(error, { operation: 'ai_date_validation', input: cleanDate });
        return validateDateFallback(cleanDate);
    }
}

// Fallback date validation
function validateDateFallback(dateStr) {
    const formats = [
        /^(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})$/,  // DD/MM/YYYY
        /^(\d{4})[\/\-.](\d{2})[\/\-.](\d{2})$/,  // YYYY-MM-DD
        /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/, // D/M/YYYY
    ];
    
    for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
            let [, part1, part2, part3] = match;
            let day, month, year;
            
            // Determine if it's DD/MM/YYYY or YYYY-MM-DD
            if (part3.length === 4) {
                day = parseInt(part1, 10);
                month = parseInt(part2, 10);
                year = parseInt(part3, 10);
            } else {
                year = parseInt(part1, 10);
                month = parseInt(part2, 10);
                day = parseInt(part3, 10);
            }
            
            // Validate ranges
            if (year < 1960 || year > 2010) {
                return { 
                    valid: false, 
                    message: 'Year must be between 1960-2010'
                };
            }
            
            if (month < 1 || month > 12 || day < 1 || day > 31) {
                return { 
                    valid: false, 
                    message: 'Invalid date values'
                };
            }
            
            // Format as YYYY-MM-DD
            const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
            // Validate actual date
            const testDate = new Date(formattedDate);
            if (testDate.getFullYear() !== year || 
                testDate.getMonth() !== month - 1 || 
                testDate.getDate() !== day) {
                return { 
                    valid: false, 
                    message: 'Invalid date'
                };
            }
            
            return { valid: true, value: formattedDate };
        }
    }
    
    return { 
        valid: false, 
        message: 'Invalid date format. Please try again.'
    };
}

// AI-enhanced geographic validation with typo correction
async function validateGeographicInput(input, type = 'city') {
    const cleanInput = sanitizeInput(input);
    
    if (cleanInput.length < 2 || cleanInput.length > 50) {
        return { 
            valid: false, 
            message: `${type.charAt(0).toUpperCase() + type.slice(1)} must be 2-50 characters long.`
        };
    }
    
    if (!/^[a-zA-Z\s\-.'()]+$/.test(cleanInput)) {
        return { 
            valid: false, 
            message: `${type.charAt(0).toUpperCase() + type.slice(1)} should only contain letters, spaces, hyphens, and apostrophes.`
        };
    }
    
    if (!openai) {
        return { valid: true, value: cleanInput };
    }
    
    try {
        const startTime = Date.now();
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{
                role: "system",
                content: `Validate and correct geographic names with typo correction.

Rules:
- Fix common typos and return standard name
- Return JSON: {"valid": true/false, "corrected": "standard name" or null, "error": "message" or null}
- Accept valid variations and return standard form
- Reject obviously fake/invalid names

Examples:
"mum" → {"valid": true, "corrected": "Mumbai", "error": null}
"bangalor" → {"valid": true, "corrected": "Bangalore", "error": null}
"asdfgh" → {"valid": false, "corrected": null, "error": "Invalid name"}
"New York" → {"valid": true, "corrected": "New York", "error": null}`
            }, {
                role: "user",
                content: `Validate ${type}: "${cleanInput}"`
            }],
            max_tokens: 100,
            temperature: 0.1
        });
        
        let aiResponse = response.choices[0].message.content.trim();
        aiResponse = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        const result = JSON.parse(aiResponse);
        const duration = Date.now() - startTime;
        
        logAIOperation(`geographic_validation_${type}`, response.usage?.total_tokens || 0, 'gpt-4o-mini', duration);
        
        if (result.valid) {
            return { 
                valid: true, 
                value: result.corrected || cleanInput,
                corrected: result.corrected !== cleanInput ? result.corrected : null
            };
        } else {
            return { 
                valid: false, 
                message: result.error || `Invalid ${type} name`
            };
        }
        
    } catch (error) {
        logError(error, { operation: 'ai_geographic_validation', input: cleanInput, type });
        return { valid: true, value: cleanInput }; // Allow on AI failure
    }
}

// SUPER SIMPLE LinkedIn validation - accepts almost anything
async function validateLinkedInURL(url, userContext = {}) {
    const cleanURL = sanitizeInput(url);
    
    // Only reject if completely empty or obvious rejection words
    if (!cleanURL || cleanURL.length < 2) {
        return { 
            valid: false, 
            message: 'Please enter your LinkedIn URL or username.'
        };
    }
    
    // Reject only obvious non-answers
    const rejectWords = ['no', 'none', 'skip', 'later', 'pass'];
    if (rejectWords.includes(cleanURL.toLowerCase())) {
        return { 
            valid: false, 
            message: 'Please enter your LinkedIn URL or username.\n\nExample: https://linkedin.com/in/yourname'
        };
    }
    
    // Accept EVERYTHING else - just store whatever they give us
    return { 
        valid: true, 
        value: cleanURL
    };
}

// Enhanced name validation
async function validateFullName(name) {
    const cleanName = sanitizeInput(name);
    
    if (cleanName.length < 2 || cleanName.length > 100) {
        return { 
            valid: false, 
            message: 'Name should be 2-100 characters long.\n\nExample: Rajesh Kumar Singh'
        };
    }
    
    if (!/^[a-zA-Z\s\-.']+$/.test(cleanName)) {
        return { 
            valid: false, 
            message: 'Name should only contain letters, spaces, hyphens, and apostrophes.'
        };
    }
    
    // Check for obviously fake names
    if (/^(test|example|sample|dummy|user|admin)/i.test(cleanName)) {
        return { 
            valid: false, 
            message: 'Please enter your real full name.'
        };
    }
    
    return { valid: true, value: cleanName };
}

// Enhanced phone number validation
function validatePhoneNumber(phone) {
    const cleanPhone = sanitizeInput(phone);
    const digitsOnly = cleanPhone.replace(/[^\d]/g, '');
    
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return { 
            valid: false, 
            message: 'Phone number must be 10-15 digits\n\nExample: +91 9876543210'
        };
    }
    
    // Format phone number
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
            message: `Please select ${minSelections === maxSelections ? 'exactly' : 'at least'} ${minSelections} option${minSelections > 1 ? 's' : ''}.\n\nFormat: 1,3,5`
        };
    }
    
    // Parse numbers more flexibly
    const numbers = cleanInput.split(/[,\s]+/)
        .map(n => parseInt(n.trim()))
        .filter(n => !isNaN(n) && n > 0);
    
    if (numbers.length === 0) {
        return { 
            valid: false, 
            message: 'Please use numbers separated by commas.\n\nExample: 1,4,7'
        };
    }
    
    if (numbers.length < minSelections) {
        return { 
            valid: false, 
            message: `Please select ${minSelections === maxSelections ? 'exactly' : 'at least'} ${minSelections} option${minSelections > 1 ? 's' : ''}.\n\nExample: ${Array.from({length: minSelections}, (_, i) => i + 1).join(',')}`
        };
    }
    
    if (maxSelections && numbers.length > maxSelections) {
        return { 
            valid: false, 
            message: `Please select maximum ${maxSelections} option${maxSelections > 1 ? 's' : ''}.\n\nExample: ${Array.from({length: maxSelections}, (_, i) => i + 1).join(',')}`
        };
    }
    
    // Remove duplicates
    const uniqueNumbers = [...new Set(numbers)];
    
    // Check valid range
    const invalidNumbers = uniqueNumbers.filter(n => n < 1 || n > options.length);
    if (invalidNumbers.length > 0) {
        return { 
            valid: false, 
            message: `Invalid option${invalidNumbers.length > 1 ? 's' : ''}: ${invalidNumbers.join(', ')}\nValid range: 1 to ${options.length}`
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
            message: 'Please select:\n\n1. Male\n2. Female\n3. Others'
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
        message: 'Please reply with YES or NO'
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
                message: `Instagram URL created: ${suggestedURL}`
            };
        }
    }
    
    if (!cleanURL.toLowerCase().includes('instagram.com')) {
        return { 
            valid: false, 
            message: 'Please enter your Instagram URL or username'
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
                message: 'URL must be from instagram.com'
            };
        }
        
        return { valid: true, value: urlToValidate.split('?')[0] };
        
    } catch {
        return { 
            valid: false, 
            message: 'Invalid URL format'
        };
    }
}

// WhatsApp number validation
function validateWhatsAppNumber(phoneNumber) {
    const digitsOnly = phoneNumber.replace(/[^\d]/g, '');
    
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return {
            valid: false,
            error: 'Phone number must be 10-15 digits long'
        };
    }
    
    const formattedNumber = `whatsapp:+${digitsOnly}`;
    
    return {
        valid: true,
        formatted: formattedNumber,
        digits: digitsOnly
    };
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
    validateWhatsAppNumber
};