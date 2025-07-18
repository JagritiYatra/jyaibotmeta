// Ultra-simple validation functions - accept almost anything
// File: src/utils/simpleValidation.js

// Basic input sanitization - minimal processing
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    // Just trim and limit length, keep everything else
    return input.trim().slice(0, 1000);
}

// City/Town validation - accepts ANYTHING except empty
function validateCityTown(input) {
    const clean = sanitizeInput(input);
    
    // Only check if not empty
    if (!clean || clean.length === 0) {
        return { 
            valid: false, 
            message: 'Please enter your city/town name.'
        };
    }
    
    // Accept EVERYTHING else - no character restrictions
    return { 
        valid: true, 
        value: clean 
    };
}

// LinkedIn validation - accepts ANY text/link
function validateLinkedInURL(input) {
    const clean = sanitizeInput(input);
    
    // Only check if not empty
    if (!clean || clean.length === 0) {
        return { 
            valid: false, 
            message: 'Please enter your LinkedIn profile (URL or username).'
        };
    }
    
    // Accept ANY non-empty input - URL, username, partial link, anything
    return { 
        valid: true, 
        value: clean
    };
}

// Instagram validation - accepts ANY text/link
function validateInstagramURL(input) {
    const clean = sanitizeInput(input);
    
    // Only check if not empty
    if (!clean || clean.length === 0) {
        return { 
            valid: false, 
            message: 'Please enter your Instagram profile (URL or username).'
        };
    }
    
    // Accept ANY non-empty input
    return { 
        valid: true, 
        value: clean
    };
}

// Export all functions
module.exports = {
    sanitizeInput,
    validateCityTown,
    validateLinkedInURL,
    validateInstagramURL
};