// Test live form on Vercel deployment
const axios = require('axios');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const LIVE_URL = 'https://jyaibot-meta.vercel.app';
const MONGO_URI = process.env.MONGODB_URI;

async function testLiveForm() {
  console.log('\n=== TESTING LIVE FORM ON VERCEL ===\n');
  
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    // Step 1: Request OTP
    console.log('1. Requesting OTP for email verification...');
    try {
      const otpResponse = await axios.post(`${LIVE_URL}/api/email-verification/send-otp-simple`, {
        email: 'cvresumehelpline@gmail.com'
      });
      
      if (otpResponse.data.success) {
        console.log('✅ OTP sent successfully');
        console.log('Session token:', otpResponse.data.sessionToken);
      }
    } catch (error) {
      console.log('⚠️ OTP endpoint error:', error.response?.data || error.message);
    }
    
    // Step 2: Create a test session directly in DB for testing
    console.log('\n2. Creating test session in database...');
    const testToken = 'live-test-' + Date.now();
    await db.collection('users').updateOne(
      { 'basicProfile.email': 'cvresumehelpline@gmail.com' },
      {
        $set: {
          plainFormSession: {
            token: testToken,
            email: 'cvresumehelpline@gmail.com',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 3600000)
          }
        }
      }
    );
    console.log('✅ Session created with token:', testToken);
    
    // Step 3: Submit form to live endpoint
    console.log('\n3. Submitting form to live Vercel deployment...');
    const testTimestamp = new Date().toISOString();
    const formData = {
      email: 'cvresumehelpline@gmail.com',
      sessionToken: testToken,
      name: `Live Test User ${testTimestamp}`,
      gender: 'Male',
      dateOfBirth: '1990-01-01',
      professionalRole: 'Entrepreneur',
      country: 'India',
      state: 'Delhi',
      city: 'New Delhi',
      phoneNumber: '9999888777',
      linkedInProfile: 'https://linkedin.com/in/livetest',
      industryDomain: 'Technology',
      yatraImpact: ['Started Enterprise Post-Yatra'],
      communityAsks: ['Funding & Investment Support'],
      communityGives: ['Technology & Digital Support'],
      suggestions: `Live test suggestion at ${testTimestamp}: Please add fields for alumni achievements and awards`
    };
    
    try {
      const response = await axios.post(
        `${LIVE_URL}/api/plain-form/submit-plain-form`,
        formData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        console.log('✅ Form submitted successfully to live deployment!');
        console.log('Response:', response.data);
      } else {
        console.log('❌ Form submission failed:', response.data);
      }
    } catch (error) {
      console.log('❌ Form submission error:', error.response?.data || error.message);
    }
    
    // Step 4: Verify in database
    console.log('\n4. Verifying data in database...');
    const user = await db.collection('users').findOne({
      'basicProfile.email': 'cvresumehelpline@gmail.com'
    });
    
    if (user) {
      console.log('\n📊 DATABASE VERIFICATION:');
      console.log('Name:', user.enhancedProfile?.fullName || user.basicProfile?.name);
      console.log('Suggestions:', user.enhancedProfile?.suggestions || user.basicProfile?.suggestions || '(none)');
      console.log('Professional Role:', user.enhancedProfile?.professionalRole);
      console.log('Location:', user.enhancedProfile?.location?.city);
      console.log('Last Updated:', user.lastUpdated);
      
      // Check if it's our test data
      if (user.enhancedProfile?.fullName?.includes(testTimestamp) || 
          user.basicProfile?.name?.includes(testTimestamp)) {
        console.log('\n✅ SUCCESS: Live form is working! Data saved correctly!');
      } else {
        console.log('\n⚠️ WARNING: Data in DB doesn\'t match our test submission');
        console.log('Expected timestamp in name:', testTimestamp);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

testLiveForm().then(() => {
  console.log('\n=== LIVE TEST COMPLETE ===\n');
  process.exit(0);
});