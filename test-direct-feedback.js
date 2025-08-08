// Direct test to check if feedback field is being saved
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testDirectFeedback() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('jagriti_yatra_community');
    const users = db.collection('users');
    
    // Find a test user
    const testEmail = 'techakash@jagritiyatra.com';
    const user = await users.findOne({ 'basicProfile.email': testEmail });
    
    if (!user) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log('📧 Found user:', testEmail);
    console.log('🆔 User ID:', user._id);
    
    // Add feedback directly
    const testFeedback = `Test feedback added at ${new Date().toISOString()}: The bot should collect information about professional skills, past projects, and areas where users can mentor others. Also, integration with LinkedIn API would be helpful.`;
    
    const result = await users.updateOne(
      { _id: user._id },
      { 
        $set: { 
          'enhancedProfile.feedbackSuggestions': testFeedback,
          'enhancedProfile.feedbackAddedAt': new Date()
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Feedback added successfully');
      
      // Verify it was saved
      const updatedUser = await users.findOne({ _id: user._id });
      console.log('\n📝 Verified feedback in database:');
      console.log(updatedUser.enhancedProfile.feedbackSuggestions);
    } else {
      console.log('❌ Failed to add feedback');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the test
testDirectFeedback().catch(console.error);