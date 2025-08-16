// Test script for God-Level Search Service
require('dotenv').config();
const { connectDatabase } = require('./src/config/database');
const { findUserByWhatsAppNumber } = require('./src/models/User');
const godLevelSearchService = require('./src/services/godLevelSearchService');

async function testGodLevelSearch() {
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database\n');
    
    // Test user (you can change this to any valid WhatsApp number in your DB)
    const testUserNumber = '919999999999'; // Change this to a real user number if needed
    const testUser = await findUserByWhatsAppNumber(testUserNumber) || {
      _id: 'test-user',
      basicProfile: { name: 'Test User' },
      enhancedProfile: { completed: true }
    };
    
    // Test queries
    const testQueries = [
      "Show me all developers from Bangalore",
      "Find entrepreneurs in Technology domain",
      "List alumni from COEP",
      "Who are the AI experts?",
      "People working at Google",
      "Female founders in Mumbai",
      "Show me startup founders",
      "Alumni who can help with funding",
      "People offering mentorship",
      "Web developers from Pune",
      "Anyone from IIT",
      "Marketing professionals",
      "Show me people in Healthcare",
      "Entrepreneurs from Delhi",
      "Contact details for Shivam Porwal"
    ];
    
    console.log('🚀 Starting God-Level Search Tests\n');
    console.log('=' . repeat(80));
    
    for (const query of testQueries) {
      console.log(`\n📝 TEST QUERY: "${query}"`);
      console.log('-' . repeat(80));
      
      try {
        const startTime = Date.now();
        
        const result = await godLevelSearchService.performGodLevelSearch(
          query,
          testUser,
          { lastActivity: null }
        );
        
        const timeTaken = Date.now() - startTime;
        
        console.log(`⏱️  Response time: ${timeTaken}ms`);
        console.log(`📊 Response length: ${result.length} characters`);
        console.log('\n📤 RESPONSE:');
        console.log('-' . repeat(40));
        
        // Show first 500 chars of response
        if (result.length > 500) {
          console.log(result.substring(0, 500) + '...\n[Response truncated for display]');
        } else {
          console.log(result);
        }
        
        console.log('\n✅ Test passed for this query');
        
      } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
      }
      
      console.log('=' . repeat(80));
      
      // Wait a bit between queries to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Test follow-up questions
    console.log('\n\n🔄 TESTING FOLLOW-UP QUESTIONS');
    console.log('=' . repeat(80));
    
    // First query
    const firstQuery = "Show me developers from Mumbai";
    console.log(`\n📝 INITIAL QUERY: "${firstQuery}"`);
    
    const firstResult = await godLevelSearchService.performGodLevelSearch(
      firstQuery,
      testUser,
      { lastActivity: 'search_results' }
    );
    
    console.log('✅ Initial search completed');
    console.log(`Found results: ${firstResult.includes('Found') ? 'Yes' : 'No'}`);
    
    // Follow-up query
    const followUpQuery = "Show me their contact details";
    console.log(`\n📝 FOLLOW-UP QUERY: "${followUpQuery}"`);
    
    const followUpResult = await godLevelSearchService.performGodLevelSearch(
      followUpQuery,
      testUser,
      { lastActivity: 'search_results' }
    );
    
    console.log('📤 FOLLOW-UP RESPONSE:');
    console.log(followUpResult.substring(0, 500));
    
    console.log('\n\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the tests
testGodLevelSearch();