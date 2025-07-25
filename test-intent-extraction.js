// Test intent extraction

require('dotenv').config();
const { connectDatabase } = require('./src/config/database');
const enhancedSearchService = require('./src/services/enhancedSearchService');

async function testIntentExtraction() {
  try {
    await connectDatabase();
    console.log('✅ Connected to database\n');
    
    const queries = [
      "web developers in the list",
      "people from COEP college pune",
      "find AI experts",
      "alumni from Bangalore working in tech"
    ];
    
    for (const query of queries) {
      console.log(`\n📝 Query: "${query}"`);
      console.log('─'.repeat(50));
      
      try {
        const intent = await enhancedSearchService.extractSearchIntent(query);
        console.log('Extracted intent:', JSON.stringify(intent, null, 2));
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

testIntentExtraction();