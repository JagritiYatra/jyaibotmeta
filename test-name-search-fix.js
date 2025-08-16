// Test name search fix for "pakshik mittal" issue
require('dotenv').config();
const { connectDatabase } = require('./src/config/database');
const perfectMatchService = require('./src/services/perfectMatchService');

async function testNameSearchFix() {
  try {
    await connectDatabase();
    console.log('Connected to database\n');
    
    console.log('🔍 TESTING NAME SEARCH FIX');
    console.log('='.repeat(60));
    
    const testUser = {
      _id: 'test123',
      basicProfile: { name: 'Test User' },
      enhancedProfile: { completed: true }
    };
    
    const testCases = [
      // The problematic query
      'do you know about pakshik mittal',
      'do you know pakshik mittal',
      'who is pakshik mittal',
      
      // Other name patterns that were breaking
      'do you know about amit kumar',
      'tell me about priya sharma',
      'who is rahul kumar',
      
      // Test that MIT still works when standalone
      'alumni from mit',
      'people from iit',
      
      // Complex names
      'do you know about john smith',
      'who is mary jane watson',
    ];
    
    for (const query of testCases) {
      console.log(`\nQuery: "${query}"`);
      console.log('-'.repeat(40));
      
      const response = await perfectMatchService.search(query, testUser, {});
      
      // Analyze what happened
      if (query.includes('do you know') || query.includes('who is') || query.includes('tell me about')) {
        // Should be name search
        if (response.includes('Yes, I know') || response.includes('No exact matches found')) {
          console.log('✅ Correctly identified as NAME SEARCH');
        } else if (response.includes('Found') && response.includes('people named')) {
          console.log('✅ Correctly searched for the NAME');
        } else if (response.includes('perfect match') && response.includes('mit')) {
          console.log('❌ WRONG: Searched for MIT instead of name!');
        } else {
          console.log('⚠️ Unexpected response type');
        }
      } else if (query.includes('mit') || query.includes('iit')) {
        // Should be education search
        if (response.includes('from mit') || response.includes('from iit')) {
          console.log('✅ Correctly identified as EDUCATION SEARCH');
        } else {
          console.log('❌ Did not search for education');
        }
      }
      
      // Show first 150 chars
      console.log('Response:', response.substring(0, 150) + '...');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Name search fix test complete');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    process.exit(0);
  }
}

testNameSearchFix();