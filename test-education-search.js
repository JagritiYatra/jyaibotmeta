// Test education/college searches
require('dotenv').config();
const { connectDatabase } = require('./src/config/database');
const intelligentProductionService = require('./src/services/intelligentProductionService');

async function testEducationSearch() {
  try {
    await connectDatabase();
    console.log('Connected to database\n');
    
    const testUser = {
      _id: 'test123',
      basicProfile: { name: 'Test User' },
      enhancedProfile: { completed: true }
    };
    
    console.log('TESTING EDUCATION/COLLEGE SEARCHES');
    console.log('=' . repeat(60));
    
    const queries = [
      "can you connect with them who had education from COEP college pune ?",
      "anyone from COEP",
      "alumni from IIT",
      "people who studied at COEP",
      "COEP graduates",
      "show me people from college of engineering pune"
    ];
    
    for (const query of queries) {
      console.log(`\nQuery: "${query}"`);
      console.log('-' . repeat(50));
      
      const response = await intelligentProductionService.search(query, testUser, {});
      
      // Show first few lines
      const lines = response.split('\n').slice(0, 10);
      console.log('Response:');
      lines.forEach(line => console.log(line));
      
      if (response.includes('No profiles found')) {
        console.log('❌ No results found');
      } else {
        const match = response.match(/Found (\d+) profile/);
        if (match) {
          console.log(`✅ Found ${match[1]} profiles`);
        }
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    process.exit(0);
  }
}

testEducationSearch();
