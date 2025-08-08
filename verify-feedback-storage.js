// Verify that feedback is being stored correctly in the database
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function verifyFeedbackStorage() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    const users = db.collection('users');
    
    // Find all users with feedback
    const usersWithFeedback = await users.find({
      'enhancedProfile.feedbackSuggestions': { $exists: true, $ne: '' }
    }).toArray();
    
    console.log('📊 FEEDBACK STORAGE VERIFICATION');
    console.log('=================================\n');
    
    if (usersWithFeedback.length === 0) {
      console.log('❌ No users found with feedback stored.\n');
    } else {
      console.log(`✅ Found ${usersWithFeedback.length} users with feedback stored.\n`);
      
      // Show recent feedback submissions
      const recentUsers = usersWithFeedback
        .filter(u => u.enhancedProfile?.feedbackUpdatedAt)
        .sort((a, b) => new Date(b.enhancedProfile.feedbackUpdatedAt) - new Date(a.enhancedProfile.feedbackUpdatedAt))
        .slice(0, 5);
      
      if (recentUsers.length > 0) {
        console.log('📝 Recent Feedback Submissions:');
        console.log('-------------------------------');
        
        recentUsers.forEach((user, index) => {
          const feedback = user.enhancedProfile.feedbackSuggestions;
          const date = user.enhancedProfile.feedbackUpdatedAt || user.enhancedProfile.formFilledAt;
          const email = user.enhancedProfile.email || user.basicProfile?.email || 'Unknown';
          
          console.log(`\n${index + 1}. User: ${email}`);
          console.log(`   Date: ${date ? new Date(date).toLocaleString() : 'Unknown'}`);
          console.log(`   Feedback: "${feedback.substring(0, 100)}${feedback.length > 100 ? '...' : ''}"`);
        });
      }
      
      // Show statistics
      console.log('\n📈 STATISTICS:');
      console.log('--------------');
      const totalUsers = await users.countDocuments({});
      const usersWithProfile = await users.countDocuments({ 'enhancedProfile': { $exists: true } });
      const percentageWithFeedback = ((usersWithFeedback.length / usersWithProfile) * 100).toFixed(1);
      
      console.log(`Total users in database: ${totalUsers}`);
      console.log(`Users with enhanced profiles: ${usersWithProfile}`);
      console.log(`Users who provided feedback: ${usersWithFeedback.length} (${percentageWithFeedback}%)`);
      
      // Check for the test user
      console.log('\n🔍 TEST USER CHECK:');
      console.log('-------------------');
      const testUser = await users.findOne({ 'basicProfile.email': 'techakash@jagritiyatra.com' });
      if (testUser?.enhancedProfile?.feedbackSuggestions) {
        console.log('✅ Test user has feedback stored:');
        console.log(`   "${testUser.enhancedProfile.feedbackSuggestions}"`);
      } else {
        console.log('❌ Test user does not have feedback stored');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

// Run verification
verifyFeedbackStorage();