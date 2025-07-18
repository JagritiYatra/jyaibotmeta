// Test script to verify field validations
// Run with: node scripts/test-field-validation.js

const { validateCityTown, validateLinkedInURL, validateInstagramURL } = require('../src/utils/simpleValidation');

console.log('🧪 Testing Field Validations\n');

// Test City/Town validation
console.log('📍 Testing City/Town Validation:');
const cityTests = [
    'Mumbai',
    'New York',
    'São Paulo',
    'मुंबई',
    'North-West City',
    'City@123',
    '123CityTown',
    'My Home Town!!!',
    '',  // Should fail
];

cityTests.forEach(test => {
    const result = validateCityTown(test);
    console.log(`  "${test}" => ${result.valid ? '✅ Valid' : '❌ Invalid'} ${result.valid ? `(${result.value})` : `(${result.message})`}`);
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