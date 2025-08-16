// Test Perfect Matching Service
require('dotenv').config();
const { connectDatabase } = require('./src/config/database');
const perfectMatchService = require('./src/services/perfectMatchService');

async function testPerfectMatching() {
  try {
    await connectDatabase();
    console.log('Connected to database\n');
    
    console.log('🎯 TESTING PERFECT MATCH SERVICE');
    console.log('='.repeat(60));
    
    const testUser = {
      _id: 'test123',
      basicProfile: { name: 'Test User' },
      enhancedProfile: { completed: true }
    };
    
    const testCases = [
      // Name searches
      { query: 'do you know ishita', type: 'Name Search' },
      { query: 'who is kirtana', type: 'Name Search' },
      { query: 'tell me about akash', type: 'Name Search' },
      { query: 'priya ?', type: 'Name Search' },
      
      // Skill + Location
      { query: 'web developers in pune', type: 'Skill + Location' },
      { query: 'data scientists in bangalore', type: 'Skill + Location' },
      { query: 'marketing professionals in mumbai', type: 'Skill + Location' },
      
      // Education searches
      { query: 'coep alumni', type: 'Education' },
      { query: 'people from iit', type: 'Education' },
      { query: 'nit graduates', type: 'Education' },
      
      // Company searches
      { query: 'who is working at google', type: 'Company' },
      { query: 'people at infosys', type: 'Company' },
      { query: 'microsoft employees', type: 'Company' },
      
      // Complex searches
      { query: 'senior developers from coep in pune', type: 'Complex' },
      { query: 'machine learning experts at google', type: 'Complex' },
      { query: 'founders in bangalore', type: 'Complex' },
      
      // More requests
      { query: 'more', type: 'Pagination' },
      { query: 'show more', type: 'Pagination' }
    ];
    
    let session = {};
    
    for (const testCase of testCases) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`📝 Test Type: ${testCase.type}`);
      console.log(`❓ Query: "${testCase.query}"`);
      console.log('─'.repeat(60));
      
      const response = await perfectMatchService.search(testCase.query, testUser, session);
      
      // Analyze response
      console.log('\n📊 Response Analysis:');
      
      if (response.includes('Found') && response.includes('match')) {
        const matchCount = response.match(/Found (\d+)/);
        console.log(`✅ Perfect matching worked!`);
        if (matchCount) {
          console.log(`   - Found ${matchCount[1]} profiles`);
        }
        
        // Check for relevance indicators
        if (response.includes('Perfect match:')) {
          console.log('   - Shows relevance indicators ✅');
        }
        if (response.includes('About:') && !response.includes('...')) {
          console.log('   - Shows complete about section ✅');
        }
        if (response.includes('Skills:')) {
          console.log('   - Shows skills ✅');
        }
        if (response.includes('Connect:')) {
          console.log('   - Shows LinkedIn link ✅');
        }
      } else if (response.includes('No exact matches')) {
        console.log('⚠️ No exact matches, but showing similar profiles');
        if (response.includes('closely related')) {
          console.log('   - Shows related profiles ✅');
        }
      } else if (response.includes('Yes, I know')) {
        console.log('✅ Name search successful!');
        console.log('   - Detailed profile shown');
      } else if (response.includes('Showing') && response.includes('more')) {
        console.log('✅ Pagination working!');
      } else {
        console.log('❓ Unexpected response format');
      }
      
      // Show first 200 chars of response
      console.log('\n📄 Response Preview:');
      console.log(response.substring(0, 300) + (response.length > 300 ? '...' : ''));
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ PERFECT MATCH SERVICE TEST COMPLETE');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    process.exit(0);
  }
}

testPerfectMatching();