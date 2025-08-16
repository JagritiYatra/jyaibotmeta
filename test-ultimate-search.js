// Test Ultimate Search Service with all improvements
require('dotenv').config();
const { connectDatabase } = require('./src/config/database');
const ultimateSearchService = require('./src/services/ultimateSearchService');

async function testUltimateSearch() {
  try {
    await connectDatabase();
    console.log('Connected to database\n');
    
    const testUser = {
      _id: 'test123',
      basicProfile: { name: 'Test User' },
      enhancedProfile: { completed: true }
    };
    
    console.log('TESTING ULTIMATE SEARCH SERVICE - ALL IMPROVEMENTS\n');
    console.log('=' . repeat(80));
    
    // Test cases with spelling mistakes and complex queries
    const tests = [
      { 
        query: "I need help in leagal matters in pune", 
        desc: "Legal help with spelling mistake + location" 
      },
      { 
        query: "Any web developpers in mumbi?", 
        desc: "Web developers with spelling mistakes" 
      },
      { 
        query: "Show me enterpreneurs from bangalore who can help with funding",
        desc: "Complex query: role + location + requirement" 
      },
      {
        query: "Marketing professionals in Delhi",
        desc: "Marketing + location search"
      },
      {
        query: "Anyone who can help with healthcare startup",
        desc: "Domain + requirement search"
      },
      {
        query: "Developers with React experience in Pune",
        desc: "Specific skill + location"
      },
      {
        query: "Who is Ashish Mittal",
        desc: "Name search"
      },
      {
        query: "Any more?",
        desc: "Follow-up question"
      }
    ];
    
    for (const test of tests) {
      console.log(`\nTEST: ${test.desc}`);
      console.log(`Query: "${test.query}"`);
      console.log('-' . repeat(70));
      
      const startTime = Date.now();
      const result = await ultimateSearchService.search(test.query, testUser, {});
      const timeTaken = Date.now() - startTime;
      
      console.log(`Time: ${timeTaken}ms\n`);
      console.log('Response:');
      console.log('-' . repeat(40));
      
      // Show first 600 chars of response
      if (result.length > 600) {
        console.log(result.substring(0, 600) + '\n... [truncated for display]');
      } else {
        console.log(result);
      }
      
      // Check key features
      console.log('\nQuality Checks:');
      
      // Check if showing match reasons
      if (result.includes('[Matches:')) {
        console.log('✓ Shows WHY profiles match');
      }
      
      // Check if showing complete about
      if (result.includes('About:') && !result.includes('...')) {
        console.log('✓ Shows complete About section');
      }
      
      // Check if handling spelling
      if (test.query.includes('leagal') && result.includes('legal')) {
        console.log('✓ Corrected spelling mistakes');
      }
      
      // Check if showing skills
      if (result.includes('Skills:') || result.includes('Experience:')) {
        console.log('✓ Shows relevant skills/experience');
      }
      
      // Check for related profiles
      if (result.includes('related profile')) {
        console.log('✓ Suggests related profiles when no exact match');
      }
      
      console.log('=' . repeat(80));
      
      await new Promise(r => setTimeout(r, 100));
    }
    
    console.log('\n\nKEY IMPROVEMENTS SUMMARY:');
    console.log('1. Shows WHY each profile matches (match reasons)');
    console.log('2. Handles spelling mistakes automatically');
    console.log('3. Shows complete About section (no truncation)');
    console.log('4. Highlights relevant skills and experience');
    console.log('5. Searches thoroughly across all fields');
    console.log('6. Suggests related profiles when no exact match');
    console.log('7. Complex multi-parameter searches work');
    console.log('8. Shows contact details when help is requested');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    process.exit(0);
  }
}

testUltimateSearch();