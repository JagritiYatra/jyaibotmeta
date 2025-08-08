// Test script to verify feedback field storage in database
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testFeedbackField() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('jagriti_yatra_community');
    const users = db.collection('users');
    
    // Find users with feedback field
    const usersWithFeedback = await users.find({
      'enhancedProfile.feedbackSuggestions': { $exists: true, $ne: '' }
    }).toArray();
    
    console.log(`\n📊 Found ${usersWithFeedback.length} users with feedback`);
    
    if (usersWithFeedback.length > 0) {
      console.log('\n📝 Sample feedback entries:');
      usersWithFeedback.slice(0, 3).forEach((user, index) => {
        console.log(`\n${index + 1}. User: ${user.basicProfile?.email || user.metadata?.email || 'Unknown'}`);
        console.log(`   Feedback: ${user.enhancedProfile.feedbackSuggestions}`);
      });
    }
    
    // Check recently updated profiles
    const recentProfiles = await users.find({
      'enhancedProfile.formFilledAt': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ 'enhancedProfile.formFilledAt': -1 }).limit(5).toArray();
    
    console.log(`\n📅 Recent profile submissions (last 24 hours): ${recentProfiles.length}`);
    
    recentProfiles.forEach((user, index) => {
      console.log(`\n${index + 1}. Email: ${user.basicProfile?.email || user.metadata?.email || 'Unknown'}`);
      console.log(`   Has feedback field: ${user.enhancedProfile?.feedbackSuggestions ? 'Yes' : 'No'}`);
      if (user.enhancedProfile?.feedbackSuggestions) {
        console.log(`   Feedback: ${user.enhancedProfile.feedbackSuggestions}`);
      }
      console.log(`   Submitted at: ${user.enhancedProfile?.formFilledAt || 'Unknown'}`);
    });
    
    // Test adding feedback to a test user
    console.log('\n🧪 Testing feedback field update...');
    const testEmail = 'test-feedback@example.com';
    
    const testUpdate = await users.updateOne(
      { 'basicProfile.email': testEmail },
      { 
        $set: { 
          'enhancedProfile.feedbackSuggestions': 'Test feedback: This is a test to verify the field is working correctly',
          'enhancedProfile.feedbackTestTimestamp': new Date()
        }
      },
      { upsert: false }
    );
    
    if (testUpdate.modifiedCount > 0) {
      console.log('✅ Successfully updated test user with feedback');
    } else {
      console.log('⚠️  No test user found to update');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the test
testFeedbackField().catch(console.error);