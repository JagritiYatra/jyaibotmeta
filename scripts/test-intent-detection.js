// Test intent detection for LinkedIn URLs
const { detectUserIntent } = require('../src/services/intentDetection');

console.log('🧪 Testing Intent Detection for LinkedIn URLs\n');

// Test cases
const testCases = [
    {
        message: 'https://www.linkedin.com/in/classictechak/',
        context: {
            waiting_for: 'updating_linkedin',
            authenticated: true,
            user_data: { enhancedProfile: { completed: false } }
        },
        expected: 'profile_input'
    },
    {
        message: 'https://linkedin.com/in/johndoe',
        context: {
            waiting_for: 'updating_linkedin',
            authenticated: true,
            user_data: { enhancedProfile: { completed: false } }
        },
        expected: 'profile_input'
    },
    {
        message: 'johndoe',
        context: {
            waiting_for: 'updating_linkedin',
            authenticated: true,
            user_data: { enhancedProfile: { completed: false } }
        },
        expected: 'profile_input'
    },
    {
        message: 'https://www.linkedin.com/in/classictechak/',
        context: {
            waiting_for: 'ready',
            authenticated: true,
            user_data: { enhancedProfile: { completed: true } }
        },
        expected: 'search'
    },
    {
        message: 'Mumbai, Maharashtra, India',
        context: {
            waiting_for: 'updating_address',
            authenticated: true,
            user_data: { enhancedProfile: { completed: false } }
        },
        expected: 'profile_input'
    }
];

// Run tests
testCases.forEach((test, index) => {
    console.log(`Test ${index + 1}: "${test.message}" with state: ${test.context.waiting_for}`);
    
    const intent = detectUserIntent(test.message, test.context);
    const passed = intent.type === test.expected;
    
    console.log(`  Intent detected: ${intent.type}`);
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (intent.field) {
        console.log(`  Field: ${intent.field}`);
    }
    if (intent.blocked) {
        console.log(`  Blocked: ${intent.blocked} (${intent.blockReason})`);
    }
    
    console.log('');
});

console.log('✅ All tests completed!');