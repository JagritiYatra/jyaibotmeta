// Test script to verify field validations
// Run with: node scripts/test-field-validation.js

const { validateAddress, validateLinkedInURL, validateInstagramURL } = require('../src/utils/simpleValidation');

console.log('🧪 Testing Field Validations\n');

// Test Address validation
console.log('📍 Testing Address Validation:');
const addressTests = [
    'Mumbai, Maharashtra, India',
    'Bangalore, Karnataka, India',
    'New York, NY, USA',
    'London, England, UK',
    'Tokyo Japan',
    'मुंबई महाराष्ट्र भारत',
    '123 Main St, City, State, Country',
    'Just a city name',
    'X',     // Too short - should fail
    '',      // Empty - should fail
];

addressTests.forEach(test => {
    const result = validateAddress(test);
    console.log(`  "${test}" => ${result.valid ? '✅ Valid' : '❌ Invalid'} ${result.valid ? `(Accepted)` : `(${result.message})`}`);
});

// Test LinkedIn validation
console.log('\n🔗 Testing LinkedIn Validation:');
const linkedinTests = [
    'https://linkedin.com/in/johndoe',
    'linkedin.com/in/johndoe',
    'www.linkedin.com/in/johndoe',
    'johndoe',
    'my linkedin profile',
    'linkedin/johndoe',
    'https://www.linkedin.com/company/example',
    '@johndoe',
    '',  // Should fail
];

linkedinTests.forEach(test => {
    const result = validateLinkedInURL(test);
    console.log(`  "${test}" => ${result.valid ? '✅ Valid' : '❌ Invalid'} ${result.valid ? `(${result.value})` : `(${result.message})`}`);
});

// Test Instagram validation
console.log('\n📸 Testing Instagram Validation:');
const instagramTests = [
    'https://instagram.com/johndoe',
    'instagram.com/johndoe',
    '@johndoe',
    'johndoe',
    'my insta profile',
    'insta.com/johndoe',
    'https://www.instagram.com/p/ABC123/',
    '',  // Should fail
];

instagramTests.forEach(test => {
    const result = validateInstagramURL(test);
    console.log(`  "${test}" => ${result.valid ? '✅ Valid' : '❌ Invalid'} ${result.valid ? `(${result.value})` : `(${result.message})`}`);
});

console.log('\n✅ All tests completed!');