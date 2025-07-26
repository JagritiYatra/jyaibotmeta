// Test script for location-specific searches
const enhancedSearchService = require('./src/services/enhancedSearchService');
const intelligentContextService = require('./src/services/intelligentContextService');
const { findUserByWhatsAppNumber } = require('./src/models/User');

async function runTests() {
  try {
    console.log('🧪 Starting JyAibot Search Tests...\n');
    
    // Get a test user
    const testUser = await findUserByWhatsAppNumber('919035304140'); // Replace with test number
    if (!testUser) {
      console.error('❌ Test user not found');
      return;
    }
    
    console.log(`✅ Test user: ${testUser.basicProfile?.name || 'Unknown'}\n`);
    
    // Test 1: Location-specific search
    console.log('📍 Test 1: Location-specific search');
    console.log('Query: "web developers from bengaluru"');
    const result1 = await enhancedSearchService.search('web developers from bengaluru', testUser);
    console.log('Result preview:', result1.substring(0, 200) + '...\n');
    
    // Test 2: General search followed by location filter
    console.log('📍 Test 2: General search + location follow-up');
    console.log('Query 1: "developers"');
    const result2a = await enhancedSearchService.search('developers', testUser);
    console.log('Initial results stored');
    
    console.log('Query 2: "more matches from pune"');
    const result2b = await intelligentContextService.handleFollowUpQuery(
      'more matches from pune', 
      testUser._id, 
      testUser
    );
    console.log('Follow-up result:', result2b.substring(0, 200) + '...\n');
    
    // Test 3: Self-reflection
    console.log('🪞 Test 3: Self-reflection');
    const { handleSelfReflection } = require('./src/controllers/authenticatedUserControllerSimple');
    const selfResult = await handleSelfReflection(testUser);
    console.log('Self-reflection:', selfResult.substring(0, 200) + '...\n');
    
    // Test 4: Intent extraction
    console.log('🧠 Test 4: Intent extraction');
    const intent1 = await enhancedSearchService.extractSearchIntent('web developers from bengaluru');
    console.log('Intent for "web developers from bengaluru":', JSON.stringify(intent1, null, 2));
    
    const intent2 = await enhancedSearchService.extractSearchIntent('AI experts from Mumbai');
    console.log('\nIntent for "AI experts from Mumbai":', JSON.stringify(intent2, null, 2));
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    process.exit(0);
  }
}

// Run tests
runTests();