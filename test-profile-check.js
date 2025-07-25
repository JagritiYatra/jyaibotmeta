// Test profile completion check

require('dotenv').config();
const { connectDatabase, getDatabase } = require('./src/config/database');
const { getIncompleteFields, getProfileCompletionPercentage } = require('./src/models/User');

async function testProfileCheck() {
  try {
    await connectDatabase();
    const db = getDatabase();
    
    // Find a user who has completed their profile via form
    const user = await db.collection('users').findOne({
      'enhancedProfile.completed': true
    });
    
    if (user) {
      console.log('Testing user:', user.basicProfile?.name);
      console.log('\nenhancedProfile.completed:', user.enhancedProfile?.completed);
      
      console.log('\nEnhanced Profile Fields:');
      Object.entries(user.enhancedProfile || {}).forEach(([key, value]) => {
        console.log(`  ${key}: ${Array.isArray(value) ? `[${value.length} items]` : value || '(empty)'}`);
      });
      
      const incompleteFields = getIncompleteFields(user);
      console.log('\nIncomplete fields:', incompleteFields);
      console.log('Number of incomplete fields:', incompleteFields.length);
      
      const percentage = getProfileCompletionPercentage(user);
      console.log('Completion percentage:', percentage + '%');
      
      // Test the controller logic
      const enhancedProfile = user?.enhancedProfile || {};
      const isProfileComplete = enhancedProfile.completed === true || incompleteFields.length === 0;
      console.log('\nProfile complete according to controller?', isProfileComplete);
    } else {
      console.log('No user found with completed profile');
      
      // Check any user
      const anyUser = await db.collection('users').findOne({
        'whatsappNumber': { $exists: true }
      });
      
      if (anyUser) {
        console.log('\nChecking any user:', anyUser.basicProfile?.name);
        console.log('Enhanced profile:', anyUser.enhancedProfile);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testProfileCheck();