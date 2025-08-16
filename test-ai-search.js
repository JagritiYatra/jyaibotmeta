// Test AI-Powered Search Service
require('dotenv').config();
const { connectDatabase } = require('./src/config/database');
const aiPoweredSearchService = require('./src/services/aiPoweredSearchService');

async function testAISearch() {
  try {
    await connectDatabase();
    console.log('Connected to database\n');
    
    console.log('🤖 TESTING AI-POWERED SEARCH SERVICE');
    console.log('='.repeat(60));
    
    const testUser = {
      _id: 'test123',
      basicProfile: { name: 'Test User' },
      enhancedProfile: { completed: true }
    };
    
    const testCases = [
      // Complex natural language queries
      { query: 'I need someone who can help me with web development in pune', type: 'Natural Language' },
      { query: 'looking for data scientists who graduated from IIT and work in bangalore', type: 'Complex Combination' },
      { query: 'find me marketing experts from mumbai who work at startups', type: 'Multi-parameter' },
      
      // Name searches
      { query: 'do you know about pakshik mittal', type: 'Name Search' },
      { query: 'who is ishita khond', type: 'Name Search' },
      
      // Misspellings and variations
      { query: 'web develoeper in bangaluru', type: 'Misspelling' },
      { query: 'lawer from delhi', type: 'Typo' },
      
      // Casual queries
      { query: 'anyone who can help with AI projects', type: 'Casual' },
      { query: 'founders in the edtech space', type: 'Domain Specific' },
      
      // Education focused
      { query: 'COEP alumni working as developers', type: 'Education + Role' },
      { query: 'people from MIT', type: 'Education' },
      
      // Follow-up
      { query: 'more', type: 'Pagination' }
    ];
    
    let session = {};
    
    for (const testCase of testCases) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`📝 Query Type: ${testCase.type}`);
      console.log(`❓ Query: "${testCase.query}"`);
      console.log('─'.repeat(60));
      
      const startTime = Date.now();
      const response = await aiPoweredSearchService.search(testCase.query, testUser, session);
      const timeTaken = Date.now() - startTime;
      
      console.log(`⏱️ Response time: ${timeTaken}ms`);
      
      // Analyze response
      if (response.includes('Found')) {
        const matchCount = response.match(/Found (\d+)/);
        if (matchCount) {
          console.log(`✅ Found ${matchCount[1]} matches`);
        }
        
        // Check for AI features
        if (response.includes('Perfect match:')) {
          console.log('✅ Shows match indicators');
        }
        if (response.includes('Connect:')) {
          console.log('✅ Includes LinkedIn links');
        }
        if (!response.includes('...') || response.includes('Type "more"')) {
          console.log('✅ Complete content or proper pagination');
        }
      } else if (response.includes('No exact matches')) {
        console.log('⚠️ No matches, but showing alternatives');
      } else if (response.includes('Hello')) {
        console.log('✅ Greeting handled');
      } else if (response.includes('Showing') && response.includes('more')) {
        console.log('✅ Pagination working');
      }
      
      // Show first 300 chars
      console.log('\n📄 Response Preview:');
      console.log(response.substring(0, 300) + (response.length > 300 ? '...' : ''));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ AI-POWERED SEARCH TEST COMPLETE');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    process.exit(0);
  }
}

testAISearch();