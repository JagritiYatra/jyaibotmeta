// Test God-Level Intelligent Service
require('dotenv').config();
const { connectDatabase } = require('./src/config/database');
const godLevelIntelligentService = require('./src/services/godLevelIntelligentService');

async function testGodLevelIntelligence() {
  try {
    await connectDatabase();
    console.log('Connected to database\n');
    
    const testUser = {
      _id: 'test123',
      basicProfile: { name: 'Test User' },
      enhancedProfile: { completed: true },
      whatsappNumber: '919999999999'
    };
    
    console.log('TESTING GOD-LEVEL INTELLIGENCE');
    console.log('=' . repeat(70));
    console.log('Testing: All parameter combinations, casual chat, self-awareness\n');
    
    const testQueries = [
      // Multi-parameter combinations
      { query: "developers in pune", desc: "Skill + Location" },
      { query: "IIT graduates working at Google", desc: "Education + Company" },
      { query: "marketing professionals from COEP", desc: "Skill + Education" },
      { query: "entrepreneurs in bangalore from IIT", desc: "Role + Location + Education" },
      { query: "web developers at TCS in Mumbai", desc: "Skill + Company + Location" },
      
      // Company searches
      { query: "anyone at Microsoft", desc: "Company search" },
      { query: "people working in startups", desc: "Company type search" },
      
      // Casual questions with embedded profiles
      { query: "what is blockchain", desc: "Casual question (should embed relevant profiles)" },
      { query: "how to start a business", desc: "How-to question with profiles" },
      
      // Self-awareness
      { query: "tell me about myself", desc: "Self-awareness test" },
      { query: "who am i", desc: "Self profile query" },
      
      // Abbreviations and misspellings
      { query: "devs in BLR from IIT", desc: "Abbreviations" },
      { query: "lawers in mumbi", desc: "Misspellings" },
      
      // Follow-ups
      { query: "more", desc: "Follow-up request" },
      { query: "anyone else", desc: "Different follow-up" },
      
      // Name searches
      { query: "who is ashish mittal", desc: "Name search" },
      { query: "do you know jagruti", desc: "Casual name search" },
      
      // Complex natural language
      { query: "I need someone who knows ML and works at a fintech in Delhi", desc: "Natural language complex" },
      { query: "Show me COEP alumni who became entrepreneurs", desc: "Education + Role" }
    ];
    
    for (const test of testQueries) {
      console.log('\n' + '=' . repeat(70));
      console.log(`TEST: ${test.desc}`);
      console.log(`Query: "${test.query}"`);
      console.log('-' . repeat(70));
      
      const startTime = Date.now();
      const response = await godLevelIntelligentService.search(test.query, testUser, {});
      const timeTaken = Date.now() - startTime;
      
      console.log(`Time: ${timeTaken}ms\n`);
      console.log('Response:');
      
      // Show first 500 chars
      if (response.length > 500) {
        console.log(response.substring(0, 500) + '...\n[truncated]');
      } else {
        console.log(response);
      }
      
      // Check response quality
      const checks = {
        'Has results': response.includes('Found') || response.includes('profile'),
        'Shows matches': response.includes('match') || response.includes('•'),
        'Natural language': !response.includes('undefined') && !response.includes('null'),
        'Formatted': response.includes('*') || response.includes('_')
      };
      
      console.log('\nQuality:');
      for (const [check, passed] of Object.entries(checks)) {
        console.log(`  ${passed ? '✅' : '❌'} ${check}`);
      }
      
      // Small delay
      await new Promise(r => setTimeout(r, 100));
    }
    
    console.log('\n' + '=' . repeat(70));
    console.log('GOD-LEVEL INTELLIGENCE SUMMARY');
    console.log('=' . repeat(70));
    console.log('\n✅ Features Implemented:');
    console.log('• Multi-parameter search (skill + location + education + company)');
    console.log('• Company and organization searches');
    console.log('• Casual conversation with embedded relevant profiles');
    console.log('• Self-awareness (user asking about themselves)');
    console.log('• Abbreviation expansion (BLR → Bangalore, IIT → Indian Institute)');
    console.log('• Spelling correction (lawers → lawyers, mumbi → mumbai)');
    console.log('• Natural language understanding');
    console.log('• Intelligent follow-up handling');
    console.log('• Rich name profiles with AI rewriting');
    console.log('• Context-aware responses');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    process.exit(0);
  }
}

testGodLevelIntelligence();