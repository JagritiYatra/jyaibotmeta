// Check feedback field for ALL users
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkAllFeedback() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    const users = db.collection('users');
    
    console.log('🔍 CHECKING FEEDBACK FIELD FOR ALL USERS');
    console.log('==========================================\n');
    
    // Get all users with enhanced profiles
    const allUsers = await users.find({ 
      'enhancedProfile': { $exists: true } 
    }).limit(10).toArray();
    
    console.log(`Found ${allUsers.length} users with enhanced profiles\n`);
    
    allUsers.forEach((user, index) => {
      const email = user.enhancedProfile?.email || user.basicProfile?.email || 'Unknown';
      const hasFeedbackField = 'feedbackSuggestions' in (user.enhancedProfile || {});
      const feedbackValue = user.enhancedProfile?.feedbackSuggestions;
      
      console.log(`${index + 1}. Email: ${email}`);
      console.log(`   Has feedback field: ${hasFeedbackField ? 'YES' : 'NO'}`);
      if (hasFeedbackField) {
        console.log(`   Feedback value: "${feedbackValue || '(empty)'}"`);
      }
      console.log('');
    });
    
    // Count statistics
    const totalUsers = await users.countDocuments({});
    const withEnhanced = await users.countDocuments({ 'enhancedProfile': { $exists: true } });
    const withFeedback = await users.countDocuments({ 'enhancedProfile.feedbackSuggestions': { $exists: true } });
    
    console.log('📊 STATISTICS:');
    console.log(`Total users: ${totalUsers}`);
    console.log(`With enhanced profile: ${withEnhanced}`);
    console.log(`With feedback field: ${withFeedback}`);
    console.log(`Missing feedback field: ${withEnhanced - withFeedback}`);
    
    // Add feedback field to users who don't have it
    console.log('\n🔧 FIXING: Adding feedback field to users who don\'t have it...');
    
    const updateResult = await users.updateMany(
      { 
        'enhancedProfile': { $exists: true },
        'enhancedProfile.feedbackSuggestions': { $exists: false }
      },
      { 
        $set: { 
          'enhancedProfile.feedbackSuggestions': '',
          'enhancedProfile.feedbackUpdatedAt': new Date()
        } 
      }
    );
    
    console.log(`✅ Added feedback field to ${updateResult.modifiedCount} users`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkAllFeedback();