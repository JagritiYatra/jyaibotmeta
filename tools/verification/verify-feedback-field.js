// Final verification script for feedback field
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function verifyFeedbackField() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('jagriti_yatra_community');
    const users = db.collection('users');
    
    // Check for any users with feedback
    const usersWithFeedback = await users.find({
      'enhancedProfile.feedbackSuggestions': { $exists: true, $ne: '' }
    }).toArray();
    
    console.log('📊 FEEDBACK FIELD STATUS');
    console.log('========================');
    console.log(`Total users with feedback: ${usersWithFeedback.length}`);
    
    if (usersWithFeedback.length > 0) {
      console.log('\n📝 Users with feedback:\n');
      usersWithFeedback.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.basicProfile?.email || user.metadata?.email || 'Unknown'}`);
        console.log(`   Name: ${user.enhancedProfile?.fullName || user.basicProfile?.name || 'Unknown'}`);
        console.log(`   Feedback: "${user.enhancedProfile.feedbackSuggestions}"`);
        console.log(`   Submitted: ${user.enhancedProfile?.formFilledAt || 'Unknown'}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️  No users have provided feedback yet');
      console.log('   The feedback field has been added but no one has submitted it yet');
    }
    
    // Check recent submissions
    const recentSubmissions = await users.find({
      'enhancedProfile.formFilledAt': { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).sort({ 'enhancedProfile.formFilledAt': -1 }).limit(5).toArray();
    
    console.log('\n📅 RECENT FORM SUBMISSIONS (Last 7 days)');
    console.log('=========================================');
    console.log(`Found ${recentSubmissions.length} recent submissions\n`);
    
    recentSubmissions.forEach((user, index) => {
      const hasFeedback = user.enhancedProfile?.feedbackSuggestions ? '✅' : '❌';
      console.log(`${index + 1}. ${user.basicProfile?.email || 'Unknown'} - Feedback: ${hasFeedback}`);
    });
    
    // Instructions for testing
    console.log('\n📋 HOW TO TEST THE FEEDBACK FIELD:');
    console.log('===================================');
    console.log('1. Go to: https://jyaibot-meta.vercel.app/plain-profile-form.html');
    console.log('2. Enter an authorized email (from the authorized list)');
    console.log('3. Complete the OTP verification');
    console.log('4. Fill the form including the "Help Us Improve" section');
    console.log('5. Submit the form');
    console.log('6. Run this script again to verify the feedback was saved');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run verification
verifyFeedbackField().catch(console.error);