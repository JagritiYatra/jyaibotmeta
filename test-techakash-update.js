// Test update for techakash@jagritiyatra.com
const axios = require('axios');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const LIVE_URL = 'https://jyaibot-meta.vercel.app';
const MONGO_URI = process.env.MONGODB_URI;

async function testUpdate() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    console.log('\n=== TESTING UPDATE FOR techakash@jagritiyatra.com ===\n');
    
    // Step 1: Request OTP
    console.log('1. Requesting OTP...');
    const otpResponse = await axios.post(`${LIVE_URL}/api/email-verification/send-otp`, {
      email: 'techakash@jagritiyatra.com'
    });
    
    if (otpResponse.data.success) {
      console.log('✅ OTP sent to techakash@jagritiyatra.com');
      console.log('⏰ Please check email and enter OTP within 10 minutes');
      console.log('\n📝 After you verify OTP on the form, the data should update with:');
      console.log('  - Name: Akash A jadhav');
      console.log('  - Gender: Female');
      console.log('  - Professional Role: NGO Worker');
      console.log('  - City: Ahmadpur');
      console.log('  - Suggestions: work ago maraya');
      console.log('  - And all other fields from your payload');
      
      // Check current data
      console.log('\n📊 CURRENT DATA IN DATABASE:');
      const currentUser = await db.collection('users').findOne({
        'basicProfile.email': 'techakash@jagritiyatra.com'
      });
      
      if (currentUser) {
        console.log('  - Current Name:', currentUser.enhancedProfile?.fullName || currentUser.basicProfile?.name);
        console.log('  - Current Gender:', currentUser.enhancedProfile?.gender || currentUser.basicProfile?.gender);
        console.log('  - Current Suggestions:', currentUser.enhancedProfile?.suggestions || currentUser.basicProfile?.suggestions || '(none)');
        console.log('  - Last Updated:', currentUser.lastUpdated);
      }
      
      console.log('\n🔗 GO TO: https://jyaibot-meta.vercel.app/plain-profile-form.html');
      console.log('📧 Enter Email: techakash@jagritiyatra.com');
      console.log('🔑 Enter the OTP you received');
      console.log('📝 Fill the form with your data');
      console.log('✅ Submit');
      
      // Wait a bit then check if data updated
      console.log('\n⏳ Waiting 30 seconds, then will check if data updated...');
      
      setTimeout(async () => {
        const updatedUser = await db.collection('users').findOne({
          'basicProfile.email': 'techakash@jagritiyatra.com'
        });
        
        console.log('\n📊 CHECKING FOR UPDATES:');
        if (updatedUser) {
          const nameChanged = updatedUser.enhancedProfile?.fullName !== currentUser?.enhancedProfile?.fullName;
          const suggestionsChanged = updatedUser.enhancedProfile?.suggestions !== currentUser?.enhancedProfile?.suggestions;
          
          if (nameChanged || suggestionsChanged) {
            console.log('✅ DATA UPDATED!');
            console.log('  - New Name:', updatedUser.enhancedProfile?.fullName || updatedUser.basicProfile?.name);
            console.log('  - New Gender:', updatedUser.enhancedProfile?.gender || updatedUser.basicProfile?.gender);
            console.log('  - New Suggestions:', updatedUser.enhancedProfile?.suggestions || updatedUser.basicProfile?.suggestions || '(none)');
            console.log('  - Updated At:', updatedUser.lastUpdated);
          } else {
            console.log('⚠️ No changes detected yet');
            console.log('Try refreshing the CRUD interface at http://localhost:4000');
          }
        }
        
        await client.close();
        process.exit(0);
      }, 30000);
      
    } else {
      console.log('❌ Failed to send OTP');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    await client.close();
    process.exit(1);
  }
}

testUpdate();