// Test Instagram URL and handle validation
require('dotenv').config();

// Test the validation function
function validateInstagramInput(input) {
  if (!input || input.trim() === '') {
    return { valid: true, cleaned: '' };
  }
  
  input = input.trim();
  
  // Check if it's a URL
  if (input.includes('instagram.com/') || input.includes('instagr.am/')) {
    // Extract username from URL
    const urlPattern = /(?:(?:http|https):\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/([A-Za-z0-9._]+)/;
    const match = input.match(urlPattern);
    if (match && match[1]) {
      const username = match[1];
      // Validate the extracted username
      const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
      return { 
        valid: usernameRegex.test(username), 
        cleaned: username 
      };
    }
    return { valid: false, cleaned: '' };
  }
  
  // Otherwise treat as username/handle
  // Remove @ if present at the beginning
  const handle = input.replace(/^@/, '');
  
  // Instagram username rules (simplified):
  // - 1-30 characters
  // - Only letters, numbers, periods, and underscores
  const instagramRegex = /^[a-zA-Z0-9._]{1,30}$/;
  
  return { 
    valid: instagramRegex.test(handle), 
    cleaned: handle 
  };
}

console.log('🧪 TESTING INSTAGRAM URL AND HANDLE VALIDATION');
console.log('==============================================\n');

const testCases = [
  // Valid handles
  { input: 'jagritiyatra', expected: true, expectedClean: 'jagritiyatra' },
  { input: '@jagritiyatra', expected: true, expectedClean: 'jagritiyatra' },
  { input: 'user_name.123', expected: true, expectedClean: 'user_name.123' },
  
  // Valid URLs
  { input: 'https://www.instagram.com/jagritiyatra', expected: true, expectedClean: 'jagritiyatra' },
  { input: 'instagram.com/jagritiyatra', expected: true, expectedClean: 'jagritiyatra' },
  { input: 'http://instagram.com/user_123', expected: true, expectedClean: 'user_123' },
  { input: 'https://instagr.am/shortlink', expected: true, expectedClean: 'shortlink' },
  { input: 'www.instagram.com/profile.name', expected: true, expectedClean: 'profile.name' },
  
  // Invalid inputs
  { input: 'user@name', expected: false, expectedClean: '' },
  { input: 'user name', expected: false, expectedClean: '' },
  { input: 'instagram.com/', expected: false, expectedClean: '' },
  { input: 'https://facebook.com/user', expected: false, expectedClean: '' },
  
  // Empty
  { input: '', expected: true, expectedClean: '' },
  { input: null, expected: true, expectedClean: '' }
];

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  const result = validateInstagramInput(test.input);
  const isValid = result.valid === test.expected;
  const isCleanCorrect = result.cleaned === test.expectedClean;
  const allCorrect = isValid && isCleanCorrect;
  
  if (allCorrect) {
    console.log(`✅ "${test.input || '(empty)'}" → valid: ${result.valid}, cleaned: "${result.cleaned}"`);
    passed++;
  } else {
    console.log(`❌ "${test.input || '(empty)'}" → valid: ${result.valid}, cleaned: "${result.cleaned}"`);
    console.log(`   Expected: valid=${test.expected}, cleaned="${test.expectedClean}"`);
    failed++;
  }
});

console.log('\n📊 RESULTS:');
console.log(`✅ Passed: ${passed}/${testCases.length}`);
console.log(`❌ Failed: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Instagram validation handles both URLs and usernames correctly.');
} else {
  console.log('\n⚠️ Some tests failed. Please check the validation logic.');
}