// Complete form submission test for techakash@jagritiyatra.com
const axios = require('axios');
const readline = require('readline');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const LIVE_URL = 'https://jyaibot-meta.vercel.app';
const MONGO_URI = process.env.MONGODB_URI;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function submitForm() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    console.log('\n=== FORM SUBMISSION TEST FOR techakash@jagritiyatra.com ===\n');
    
    // Step 1: Request OTP
    console.log('📧 Step 1: Requesting OTP...');
    const otpResponse = await axios.post(`${LIVE_URL}/api/email-verification/send-otp`, {
      email: 'techakash@jagritiyatra.com'
    });
    
    if (otpResponse.data.success) {
      console.log('✅ OTP sent successfully!');
      console.log('📬 Check email for techakash@jagritiyatra.com');
      console.log('\n');
      
      // Step 2: Get OTP from user
      const otp = await askQuestion('Enter the OTP you received: ');
      
      // Step 3: Verify OTP
      console.log('\n🔐 Step 2: Verifying OTP...');
      const verifyResponse = await axios.post(`${LIVE_URL}/api/email-verification/verify-otp`, {
        email: 'techakash@jagritiyatra.com',
        otp: otp
      });
      
      if (verifyResponse.data.success) {
        console.log('✅ OTP verified successfully!');
        console.log('🎫 Session Token:', verifyResponse.data.sessionToken.substring(0, 20) + '...');
        
        // Step 4: Submit the form with new data
        console.log('\n📝 Step 3: Submitting form with new data...');
        
        const formData = {
          email: 'techakash@jagritiyatra.com',
          sessionToken: verifyResponse.data.sessionToken,
          name: 'Akash A jadhav',
          gender: 'Female',
          dateOfBirth: '1983-01-02',
          professionalRole: 'NGO Worker',
          country: 'India',
          state: 'Maharasthrae',
          city: 'Ahmadpur',
          phoneNumber: '99901883737',
          additionalEmail: '',
          linkedInProfile: 'https://www.linkedin.com/in/techakash-updated/',
          instagramProfile: '@techakash_new',
          industryDomain: 'Non Profit',
          yatraImpact: ['Started Enterprise Post-Yatra', 'Career Pivot'],
          communityAsks: ['Mentorship', 'Job Opportunities'],
          communityGives: ['Investment', 'Mentorship'],
          suggestions: 'Please add fields for hobbies, interests, and volunteer work. Also would be great to have a section for showcasing projects and achievements.'
        };
        
        console.log('\n📋 Submitting with data:');
        console.log('  Name:', formData.name);
        console.log('  Gender:', formData.gender);
        console.log('  City:', formData.city);
        console.log('  Suggestions:', formData.suggestions.substring(0, 50) + '...');
        
        const submitResponse = await axios.post(`${LIVE_URL}/api/plain-form/submit-plain-form`, formData);
        
        if (submitResponse.data.success) {
          console.log('\n✅ FORM SUBMITTED SUCCESSFULLY!');
          console.log('Response:', submitResponse.data);
          
          // Step 5: Verify the update in database
          console.log('\n🔍 Step 4: Verifying database update...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          
          const updatedUser = await db.collection('users').findOne({
            'basicProfile.email': 'techakash@jagritiyatra.com'
          });
          
          if (updatedUser) {
            console.log('\n📊 DATABASE VERIFICATION:');
            console.log('  Current Name:', updatedUser.enhancedProfile?.fullName);
            console.log('  Current Gender:', updatedUser.enhancedProfile?.gender);
            console.log('  Current City:', updatedUser.enhancedProfile?.location?.city);
            console.log('  Current Suggestions:', updatedUser.enhancedProfile?.suggestions ? 
              updatedUser.enhancedProfile.suggestions.substring(0, 50) + '...' : '(none)');
            console.log('  Last Updated:', updatedUser.lastUpdated);
            
            if (updatedUser.enhancedProfile?.fullName === 'Akash A jadhav') {
              console.log('\n🎉 SUCCESS! Data has been updated correctly!');
              console.log('\n📌 NEXT STEPS:');
              console.log('1. Refresh CRUD interface at http://localhost:4000');
              console.log('2. Search for "techakash" or navigate to the Users tab');
              console.log('3. You should now see the updated data');
            } else {
              console.log('\n⚠️ WARNING: Data doesn\'t match expected values');
              console.log('Expected name: "Akash A jadhav"');
              console.log('Got name: "' + (updatedUser.enhancedProfile?.fullName || 'none') + '"');
            }
          }
        } else {
          console.log('\n❌ Form submission failed:', submitResponse.data);
        }
      } else {
        console.log('\n❌ OTP verification failed:', verifyResponse.data);
      }
    } else {
      console.log('\n❌ Failed to send OTP:', otpResponse.data);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n💡 TIP: The session has expired. Please run this script again to get a new OTP.');
    }
  } finally {
    rl.close();
    await client.close();
  }
}

// Run the test
console.log('=====================================');
console.log('COMPLETE FORM SUBMISSION TEST');
console.log('=====================================');
console.log('\nThis script will:');
console.log('1. Send OTP to techakash@jagritiyatra.com');
console.log('2. Verify the OTP you enter');
console.log('3. Submit the form with new data');
console.log('4. Verify the update in database');
console.log('\nStarting...\n');

submitForm();