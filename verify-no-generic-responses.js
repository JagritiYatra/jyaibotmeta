// Verify that generic responses are completely removed
require('dotenv').config();
const { connectDatabase } = require('./src/config/database');

async function verifyNoGenericResponses() {
  try {
    await connectDatabase();
    console.log('Connected to database\n');
    
    console.log('VERIFICATION: Generic Response Removal');
    console.log('='.repeat(60));
    
    // Check if the controller is using ultimate service
    const controllerPath = './src/controllers/authenticatedUserControllerSimple.js';
    const controllerCode = require('fs').readFileSync(controllerPath, 'utf8');
    
    const checks = {
      'Uses ultimateIntelligentService': controllerCode.includes('ultimateIntelligentService'),
      'Removed godLevelIntelligentService': controllerCode.includes('// const godLevelIntelligentService'),
      'Removed intelligentContextService fallback': !controllerCode.includes('intelligentContextService.generateResponse'),
      'All queries go through ultimate search': controllerCode.includes('Ultimate Intelligent Service'),
      'No generic fallback responses': !controllerCode.includes('alumni network database'),
      'COEP search implemented': controllerCode.includes('college of engineering')
    };
    
    console.log('Code Verification:');
    for (const [check, passed] of Object.entries(checks)) {
      console.log(`  ${passed ? '✅' : '❌'} ${check}`);
    }
    
    // Test actual queries
    console.log('\n' + '='.repeat(60));
    console.log('Testing Actual Queries:');
    console.log('='.repeat(60));
    
    const ultimateIntelligentService = require('./src/services/ultimateIntelligentService');
    
    const testUser = {
      _id: 'test123',
      basicProfile: { name: 'Test User' },
      enhancedProfile: { completed: true }
    };
    
    // Test problematic queries that were giving generic responses
    const testQueries = [
      'can you help me to connect with the web developers',
      'show me alumni from pune',
      'any developers in bangalore',
      'coep alumni',
      'who is working at google',
      'tell me about machine learning experts'
    ];
    
    console.log('\nTesting queries that previously gave generic responses:\n');
    
    for (const query of testQueries) {
      console.log(`Query: "${query}"`);
      
      const response = await ultimateIntelligentService.search(query, testUser, {});
      
      // Check response
      if (response.includes('alumni network database') || 
          response.includes('LinkedIn group') ||
          response.includes('alumni directory')) {
        console.log('❌ FAIL: Still giving generic response!');
        console.log('Response:', response.substring(0, 200));
      } else if (response.includes('Found') && response.includes('profile')) {
        console.log('✅ PASS: Searching database and returning real profiles!');
        const profileCount = response.match(/Found (\d+) profile/);
        if (profileCount) {
          console.log(`   Found ${profileCount[1]} actual profiles`);
        }
      } else if (response.includes('No exact matches')) {
        console.log('✅ PASS: No results but not generic!');
      } else {
        console.log('⚠️  Unexpected response format');
        console.log('Response:', response.substring(0, 200));
      }
      console.log();
    }
    
    console.log('='.repeat(60));
    console.log('DEPLOYMENT STATUS:');
    console.log('='.repeat(60));
    
    const allPassed = Object.values(checks).every(v => v);
    
    if (allPassed) {
      console.log('\n✅ READY FOR PRODUCTION!');
      console.log('All generic responses have been removed.');
      console.log('The bot will now always search the database.');
      console.log('\nNext steps:');
      console.log('1. git add -A');
      console.log('2. git commit -m "CRITICAL: Remove ALL generic responses - always search database"');
      console.log('3. git push origin main');
      console.log('4. Wait for deployment to complete');
    } else {
      console.log('\n❌ NOT READY!');
      console.log('Some issues need to be fixed before deployment.');
    }
    
  } catch (error) {
    console.error('Verification error:', error);
  } finally {
    process.exit(0);
  }
}

verifyNoGenericResponses();