// Simple Instagram validation test
require('dotenv').config();

// Test the validation function directly
function validateInstagramHandle(handle) {
  if (!handle || handle.trim() === '') {
    return true; // Empty is valid (optional field)
  }
  
  // Remove @ if present at the beginning
  handle = handle.replace(/^@/, '');
  
  // Instagram username rules:
  // - 1-30 characters
  // - Only letters, numbers, periods, and underscores
  // - Cannot start or end with a period
  // - Cannot have consecutive periods
  const instagramRegex = /^(?!.*\.\.)(?!^\.)(?!.*\.$)[a-zA-Z0-9._]{1,30}$/;
  
  return instagramRegex.test(handle);
}

console.log('🧪 TESTING INSTAGRAM VALIDATION FUNCTION');
console.log('=========================================\n');

const testCases = [
  { handle: '@valid_user123', expected: true, description: 'Valid handle with @' },
  { handle: 'user.name_123', expected: true, description: 'Valid handle with periods and underscores' },
  { handle: 'jagritiyatra', expected: true, description: 'Simple valid handle' },
  { handle: '.invalid', expected: false, description: 'Starts with period (invalid)' },
  { handle: 'invalid.', expected: false, description: 'Ends with period (invalid)' },
  { handle: 'in..valid', expected: false, description: 'Consecutive periods (invalid)' },
  { handle: 'user@name', expected: false, description: 'Contains @ in middle (invalid)' },
  { handle: 'user name', expected: false, description: 'Contains space (invalid)' },
  { handle: '', expected: true, description: 'Empty (optional field)' }
];

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  const result = validateInstagramHandle(test.handle);
  const isCorrect = result === test.expected;
  
  if (isCorrect) {
    console.log(`✅ "${test.handle}" - ${test.description}`);
    passed++;
  } else {
    console.log(`❌ "${test.handle}" - ${test.description}`);
    console.log(`   Expected: ${test.expected}, Got: ${result}`);
    failed++;
  }
});

console.log('\n📊 RESULTS:');
console.log(`✅ Passed: ${passed}/${testCases.length}`);
console.log(`❌ Failed: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Instagram validation is working correctly.');
} else {
  console.log('\n⚠️ Some tests failed. Please check the validation logic.');
}