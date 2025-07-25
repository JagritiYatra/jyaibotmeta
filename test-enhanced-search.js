// Test script for enhanced search functionality

require('dotenv').config();
const { connectDatabase } = require('./src/config/database');
const enhancedSearchService = require('./src/services/enhancedSearchService');

async function testSearch() {
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database');
    
    // Test queries
    const testQueries = [
      "anyone from pune",
      "web developers in the list",
      "people from COEP college pune",
      "show me entrepreneurs in Mumbai",
      "find AI experts",
      "alumni from Bangalore working in tech"
    ];
    
    console.log('\n🔍 Testing Enhanced Search Service...\n');
    
    for (const query of testQueries) {
      console.log(`\n📝 Query: "${query}"`);
      console.log('─'.repeat(50));
      
      try {
        const results = await enhancedSearchService.search(query, null);
        
        // Show first 200 chars of results
        if (results.length > 200) {
          console.log(results.substring(0, 200) + '...');
        } else {
          console.log(results);
        }
      } catch (error) {
        console.error(`❌ Error: ${error.message}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testSearch();