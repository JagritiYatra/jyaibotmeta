// Enhanced validation utilities with strict rules and professional messaging
// File: src/utils/validation.js
// FIXED VERSION - Removed AI validation for city/state/country and fixed LinkedIn

const OpenAI = require('openai');
const { getConfig } = require('../config/environment');
const { logError, logAIOperation } = require('../middleware/logging');

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
  console.warn('⚠️ OpenAI not initialized for validation');
}

// Basic input sanitization
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 1000).replace(/[<>]/g, '');
}

// Smart full name validation - flexible but secure
async function validateFullName(name) {
  const cleanName = sanitizeInput(name);

  if (cleanName.length < 2 || cleanName.length > 100) {
    return {
      valid: false,
      message: 'Name must be 2-100 characters long.\n\nExample: Akash Jadhav or Rajesh Kumar Singh',
    };
  }

  // Only letters, spaces, hyphens, apostrophes, and dots allowed
  if (!/^[a-zA-Z\s\-.']+$/.test(cleanName)) {
    return {
      valid: false,
      message: 'Name can only contain letters and spaces.\n\nExample: Akash Jadhav',
    };
  }

  // Check for obviously fake names
  const fakePatterns = [
    /^(test|example|sample|dummy|user|admin|null|undefined|demo|xyz|abc|aaa|bbb|ccc)/i,
    /^(.)\1{3,}$/, // Repeated characters like "aaaa" (but allow "aa" or "aaa")
    /^[0-9]/, // Starts with number
    /^\W/, // Starts with special character
  ];

  // Don't reject short names like "Ak" or "Om" - they could be real nicknames
  if (fakePatterns.some((pattern) => pattern.test(cleanName))) {
    return {
      valid: false,
      message: 'Please enter your real name.\n\nExample: Akash or Akash Jadhav',
    };
  }

  return { valid: true, value: cleanName };
}

// Smart gender validation - accepts numbers, text, and partial matches
function validateGender(input) {
  const cleanInput = sanitizeInput(input).toLowerCase();

  // Direct number mapping
  const genderMap = {
    1: 'Male',
    2: 'Female',
    3: 'Others',
  };

  // Text variations mapping
  const textMap = {
    male: 'Male',
    m: 'Male',
    man: 'Male',
    boy: 'Male',
    female: 'Female',
    f: 'Female',
    woman: 'Female',
    girl: 'Female',
    lady: 'Female',
    other: 'Others',
    others: 'Others',
    transgender: 'Others',
    trans: 'Others',
    'non-binary': 'Others',
    nonbinary: 'Others',
    nb: 'Others',
  };

  // Check number input first
  if (genderMap[cleanInput]) {
    return { valid: true, value: genderMap[cleanInput] };
  }

  // Check text input
  if (textMap[cleanInput]) {
    return { valid: true, value: textMap[cleanInput] };
  }

  // Check partial matches (e.g., "mal" for "male")
  for (const [key, value] of Object.entries(textMap)) {
    if (key.length > 2 && (key.startsWith(cleanInput) || cleanInput.startsWith(key))) {
      return { valid: true, value };
    }
  }

  return {
    valid: false,
    message:
      'Please select:\n\n1. Male\n2. Female\n3. Others\n\nYou can type the number or the text (e.g., "1" or "male")',
  };
}

// AI-enhanced date validation with flexible parsing
async function validateDateOfBirth(dateStr) {
  const cleanDate = sanitizeInput(dateStr);

  if (!cleanDate || cleanDate.length < 6) {
    return {
      valid: false,
      message: 'Please enter your date of birth.\n\nFormat: DD MM YYYY\nExample: 19 07 2000',
    };
  }

  if (!openai) {
    return validateDateFallback(cleanDate);
  }

  try {
    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Parse date of birth from user input and convert to DD-MM-YYYY format.

Rules:
- Accept any readable date format (DD MM YYYY, DD/MM/YYYY, DD-MM-YYYY, etc.)
- Year must be between 1960-2010
- Return JSON: {"valid": true/false, "date": "DD-MM-YYYY" or null, "error": "message" or null}
- Be flexible with input formats but strict with validation

Examples:
"19 07 2000" → {"valid": true, "date": "19-07-2000", "error": null}
"19/07/2000" → {"valid": true, "date": "19-07-2000", "error": null}
"July 19 2000" → {"valid": true, "date": "19-07-2000", "error": null}
"2025-01-01" → {"valid": false, "date": null, "error": "Year must be between 1960-2010"}
"invalid" → {"valid": false, "date": null, "error": "Invalid date format"}`,
        },
        {
          role: 'user',
          content: `Parse date: "${cleanDate}"`,
        },
      ],
      max_tokens: 150,
      temperature: 0.1,
    });

    let aiResponse = response.choices[0].message.content.trim();
    aiResponse = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    const result = JSON.parse(aiResponse);
    const duration = Date.now() - startTime;

    logAIOperation('date_validation', response.usage?.total_tokens || 0, 'gpt-4o-mini', duration);

    if (result.valid) {
      return { valid: true, value: result.date };
    }
    return {
      valid: false,
      message: result.error || 'Invalid date format.\n\nFormat: DD MM YYYY\nExample: 19 07 2000',
    };
  } catch (error) {
    logError(error, { operation: 'ai_date_validation', input: cleanDate });
    return validateDateFallback(cleanDate);
  }
}

// Fallback date validation
function validateDateFallback(dateStr) {
  const formats = [
    /^(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{4})$/, // DD/MM/YYYY
    /^(\d{4})[\/\-.\s](\d{1,2})[\/\-.\s](\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})\s+(\d{1,2})\s+(\d{4})$/, // DD MM YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const [, part1, part2, part3] = match;
      let day;
      let month;
      let year;

      // Determine format
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
          message: 'Year must be between 1960-2010.\n\nFormat: DD MM YYYY\nExample: 19 07 2000',
        };
      }

      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return {
          valid: false,
          message: 'Invalid date values.\n\nFormat: DD MM YYYY\nExample: 19 07 2000',
        };
      }

      // Format as DD-MM-YYYY
      const formattedDate = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;

      return { valid: true, value: formattedDate };
    }
  }

  return {
    valid: false,
    message: 'Invalid date format.\n\nFormat: DD MM YYYY\nExample: 19 07 2000',
  };
}

// FIXED: Simple city validation - no AI, just basic checks
function validateCityInput(city) {
  const clean = sanitizeInput(city);

  if (clean.length < 2 || clean.length > 50) {
    return {
      valid: false,
      message: 'City name must be 2-50 characters long.\n\nExample: Mumbai',
    };
  }

  // Check if contains only digits
  if (/^\d+$/.test(clean)) {
    return {
      valid: false,
      message: 'City name cannot be only numbers.\n\nExample: Mumbai',
    };
  }

  // Basic check for letters (allow spaces, hyphens, dots, apostrophes)
  if (!/[a-zA-Z]/.test(clean)) {
    return {
      valid: false,
      message: 'City name must contain letters.\n\nExample: Mumbai',
    };
  }

  return { valid: true, value: clean };
}

// FIXED: Simple state validation - no AI
function validateStateInput(state) {
  const clean = sanitizeInput(state);

  if (clean.length < 2 || clean.length > 50) {
    return {
      valid: false,
      message: 'State name must be 2-50 characters long.\n\nExample: Maharashtra',
    };
  }

  // Check if contains only digits
  if (/^\d+$/.test(clean)) {
    return {
      valid: false,
      message: 'State name cannot be only numbers.\n\nExample: Maharashtra',
    };
  }

  // Basic check for letters
  if (!/[a-zA-Z]/.test(clean)) {
    return {
      valid: false,
      message: 'State name must contain letters.\n\nExample: Maharashtra',
    };
  }

  return { valid: true, value: clean };
}

// FIXED: Simple country validation - no AI
function validateCountryInput(country) {
  const clean = sanitizeInput(country);

  if (clean.length < 2 || clean.length > 50) {
    return {
      valid: false,
      message: 'Country name must be 2-50 characters long.\n\nExample: India',
    };
  }

  // Check if contains only digits
  if (/^\d+$/.test(clean)) {
    return {
      valid: false,
      message: 'Country name cannot be only numbers.\n\nExample: India',
    };
  }

  // Basic check for letters
  if (!/[a-zA-Z]/.test(clean)) {
    return {
      valid: false,
      message: 'Country name must contain letters.\n\nExample: India',
    };
  }

  return { valid: true, value: clean };
}

// REMOVED AI validation - now just redirects to simple validators
async function validateGeographicInput(input, type = 'city') {
  switch (type.toLowerCase()) {
    case 'city':
      return validateCityInput(input);
    case 'state':
      return validateStateInput(input);
    case 'country':
      return validateCountryInput(input);
    default:
      return validateCityInput(input);
  }
}

// Enhanced phone number validation with country code
function validatePhoneNumber(phone) {
  const cleanPhone = sanitizeInput(phone);

  if (!cleanPhone || cleanPhone.length < 8) {
    return {
      valid: false,
      message:
        'Please enter your mobile number with country code.\n\nExamples:\n+91 9876543210\n+1 2025551234',
    };
  }

  // Extract digits only
  const digitsOnly = cleanPhone.replace(/[^\d]/g, '');

  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return {
      valid: false,
      message: 'Phone number must be 10-15 digits.\n\nExamples:\n+91 9876543210\n+1 2025551234',
    };
  }

  // Format phone number
  let formattedPhone = cleanPhone;
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = `+${digitsOnly}`;
  }

  return { valid: true, value: formattedPhone };
}

// Enhanced email validation
function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const cleanEmail = sanitizeInput(email);

  if (!emailRegex.test(cleanEmail)) {
    return {
      valid: false,
      message: 'Invalid email format.\n\nExample: yourname@gmail.com',
    };
  }

  return { valid: true, value: cleanEmail.toLowerCase() };
}

// FIXED: LinkedIn URL validation - much more flexible
function validateLinkedInURL(url) {
  const cleanURL = sanitizeInput(url);

  if (!cleanURL || cleanURL.length === 0) {
    return {
      valid: false,
      message:
        'Please enter your LinkedIn profile URL.\n\nExample: https://linkedin.com/in/yourname',
    };
  }

  // If it's just a username, convert to full URL
  if (!cleanURL.includes('http') && !cleanURL.includes('linkedin')) {
    // Check if it looks like a username (alphanumeric, hyphens, underscores)
    if (/^[a-zA-Z0-9\-_]+$/.test(cleanURL) && cleanURL.length > 2) {
      const fullURL = `https://linkedin.com/in/${cleanURL}`;
      return {
        valid: true,
        value: fullURL,
        corrected: fullURL,
      };
    }
  }

  // If it contains linkedin somewhere, consider it valid
  if (cleanURL.toLowerCase().includes('linkedin')) {
    // Clean up the URL
    let finalURL = cleanURL;
    if (!finalURL.startsWith('http')) {
      finalURL = `https://${finalURL}`;
    }
    return { valid: true, value: finalURL };
  }

  // If it starts with http/https, accept it as valid
  if (cleanURL.startsWith('http://') || cleanURL.startsWith('https://')) {
    return { valid: true, value: cleanURL };
  }

  // If none of the above, try to make it a valid URL
  if (cleanURL.includes('.')) {
    // Looks like a domain
    const finalURL = cleanURL.startsWith('http') ? cleanURL : `https://${cleanURL}`;
    return { valid: true, value: finalURL };
  }

  // Default: accept any non-empty input
  return { valid: true, value: cleanURL };
}

// Instagram URL validation
function validateInstagramURL(url) {
  const cleanURL = sanitizeInput(url);

  if (!cleanURL || cleanURL.length === 0) {
    return {
      valid: false,
      message:
        'Please enter your Instagram profile URL.\n\nExample: https://instagram.com/yourname',
    };
  }

  // Handle username-only input
  if (!cleanURL.includes('http') && !cleanURL.includes('instagram.com')) {
    if (cleanURL.length > 1 && cleanURL.length < 50 && /^[a-zA-Z0-9._]+$/.test(cleanURL)) {
      const suggestedURL = `https://instagram.com/${cleanURL}`;
      return {
        valid: true,
        value: suggestedURL,
        corrected: suggestedURL,
      };
    }
  }

  try {
    let urlToValidate = cleanURL;
    if (!urlToValidate.startsWith('http')) {
      urlToValidate = `https://${urlToValidate}`;
    }

    return { valid: true, value: urlToValidate.split('?')[0] };
  } catch {
    return {
      valid: false,
      message: 'Invalid URL format.\n\nExample: https://instagram.com/yourname',
    };
  }
}

// Enhanced multiple choice validation
function validateMultipleChoice(input, options, minSelections = 1, maxSelections = null) {
  const cleanInput = sanitizeInput(input).toLowerCase();

  if (!cleanInput || cleanInput.trim() === '') {
    return {
      valid: false,
      message: `Please select ${minSelections === maxSelections ? 'exactly' : 'at least'} ${minSelections} option${minSelections > 1 ? 's' : ''}.\n\nExample: 1,3,5`,
    };
  }

  // Split by comma or space
  const inputs = cleanInput.split(/[,\s]+/).filter((n) => n);
  const selected = [];
  const selectedIndices = new Set();

  for (const item of inputs) {
    let matched = false;

    // Try number match first
    const num = parseInt(item);
    if (!isNaN(num) && num >= 1 && num <= options.length) {
      const index = num - 1;
      if (!selectedIndices.has(index)) {
        selected.push(options[index]);
        selectedIndices.add(index);
        matched = true;
      }
    }

    // Try text match if number didn't work
    if (!matched) {
      for (let i = 0; i < options.length; i++) {
        const optionLower = options[i].toLowerCase();
        // Exact match or partial match (minimum 3 characters)
        if (
          optionLower === item ||
          (item.length >= 3 && optionLower.includes(item)) ||
          (item.length >= 3 && item.includes(optionLower.split(' ')[0].toLowerCase()))
        ) {
          if (!selectedIndices.has(i)) {
            selected.push(options[i]);
            selectedIndices.add(i);
            matched = true;
            break;
          }
        }
      }
    }
  }

  // If nothing matched, check if it's all numbers
  if (selected.length === 0) {
    const numbers = inputs.map((n) => parseInt(n)).filter((n) => !isNaN(n));
    if (numbers.length > 0) {
      return {
        valid: false,
        message: `Invalid selection. Please use numbers 1-${options.length}`,
      };
    }
    return {
      valid: false,
      message: 'Please use numbers or type the option name.\n\nExample: 1,3 or "entrepreneur"',
    };
  }

  // Check minimum selections
  if (selected.length < minSelections) {
    return {
      valid: false,
      message: `Please select ${minSelections === maxSelections ? 'exactly' : 'at least'} ${minSelections} option${minSelections > 1 ? 's' : ''}.\n\nYou selected ${selected.length}`,
    };
  }

  // Check maximum selections
  if (maxSelections && selected.length > maxSelections) {
    return {
      valid: false,
      message: `Please select maximum ${maxSelections} option${maxSelections > 1 ? 's' : ''}.\n\nYou selected ${selected.length}`,
    };
  }

  return { valid: true, value: selected };
}

// Smart Yes/No validation - accepts various formats
function validateYesNo(input) {
  const cleanInput = sanitizeInput(input).toLowerCase();

  // Expanded yes values including Indian languages
  const yesValues = [
    'yes',
    'y',
    '1',
    'true',
    'ok',
    'okay',
    'sure',
    'yep',
    'yeah',
    'definitely',
    'absolutely',
    'certainly',
    'affirmative',
    'positive',
    'si',
    'hai',
    'haan',
    'ji',
    'ya',
    'yup',
    'ofcourse',
    'of course',
  ];

  // Expanded no values including Indian languages
  const noValues = [
    'no',
    'n',
    '2',
    '0',
    'false',
    'nope',
    'nah',
    'cancel',
    'never',
    'none',
    'nothing',
    'negative',
    'not',
    'nahi',
    'na',
    'nhi',
    'nai',
  ];

  if (yesValues.includes(cleanInput)) {
    return { valid: true, value: true };
  }
  if (noValues.includes(cleanInput)) {
    return { valid: true, value: false };
  }

  // Check partial matches for longer words
  for (const pattern of yesValues) {
    if (pattern.length > 2 && cleanInput.startsWith(pattern)) {
      return { valid: true, value: true };
    }
  }

  for (const pattern of noValues) {
    if (pattern.length > 2 && cleanInput.startsWith(pattern)) {
      return { valid: true, value: false };
    }
  }

  return {
    valid: false,
    message: 'Please reply: YES or NO\n\nYou can type: Y, N, 1, 0, Sure, Nope, etc.',
  };
}

// WhatsApp number validation
function validateWhatsAppNumber(phoneNumber) {
  const digitsOnly = phoneNumber.replace(/[^\d]/g, '');

  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return {
      valid: false,
      error: 'Phone number must be 10-15 digits long',
    };
  }

  const formattedNumber = `whatsapp:+${digitsOnly}`;

  return {
    valid: true,
    formatted: formattedNumber,
    digits: digitsOnly,
  };
}

module.exports = {
  sanitizeInput,
  validateEmail,
  validateLinkedInURL,
  validateInstagramURL,
  validateGeographicInput,
  validateCityInput,
  validateStateInput,
  validateCountryInput,
  validateFullName,
  validateDateOfBirth,
  validatePhoneNumber,
  validateMultipleChoice,
  validateGender,
  validateYesNo,
  validateWhatsAppNumber,
};
