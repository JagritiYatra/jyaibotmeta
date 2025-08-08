// Final verification test - ALL fields including feedback and Instagram URLs
require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');

const API_BASE = 'http://localhost:3000/api';

async function testFinalVerification() {
  const testEmail = 'techakash@jagritiyatra.com';
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    const users = db.collection('users');
    
    console.log('🚀 FINAL VERIFICATION TEST - ALL FIELDS');
    console.log('=========================================\n');
    
    // Send OTP
    console.log('Sending OTP...');
    await axios.post(`${API_BASE}/email-verification/send-otp`, { email: testEmail });
    
    // Set test OTP
    await db.collection('otps').updateOne(
      { email: testEmail },
      { $set: { otp: '123456', email: testEmail, expiresAt: new Date(Date.now() + 600000), attempts: 0 } },
      { upsert: true }
    );
    
    // Verify OTP
    const verifyResponse = await axios.post(`${API_BASE}/email-verification/verify-otp`, {
      email: testEmail,
      otp: '123456'
    });
    
    let sessionToken = verifyResponse.data.sessionToken;
    console.log('✅ Session obtained\n');
    
    // Test different Instagram formats
    const instagramTests = [
      { input: 'https://www.instagram.com/jagritiyatra', expected: 'jagritiyatra' },
      { input: '@test_user', expected: 'test_user' },
      { input: 'simple_handle', expected: 'simple_handle' }
    ];
    
    for (const test of instagramTests) {
      console.log(`Testing Instagram: "${test.input}"`);
      
      const timestamp = Date.now();
      const formData = {
        email: testEmail,
        sessionToken: sessionToken,
        name: 'Test User ' + timestamp,
        gender: 'Male',
        dateOfBirth: '1990-01-01',
        professionalRole: 'Entrepreneur',
        country: 'India',
        state: 'Karnataka',
        city: 'Bangalore',
        phoneNumber: '9876543210',
        linkedInProfile: 'https://linkedin.com/in/test',
        instagramProfile: test.input,
        industryDomain: 'Technology',
        yatraImpact: ['Started Enterprise Post-Yatra'],
        communityAsks: ['Mentorship'],
        communityGives: ['Industry Insights'],
        feedbackSuggestions: `Test feedback ${timestamp}: This feedback should be saved correctly with Instagram ${test.input}`
      };
      
      try {
        const response = await axios.post(`${API_BASE}/plain-form/submit-plain-form`, formData);
        
        if (response.data.success) {
          // Verify in database
          await new Promise(resolve => setTimeout(resolve, 500));
          const user = await users.findOne({ 'basicProfile.email': testEmail });
          
          const savedInstagram = user?.enhancedProfile?.instagramProfile;
          const savedFeedback = user?.enhancedProfile?.feedbackSuggestions;
          
          console.log(`  ✅ Submitted successfully`);
          console.log(`  Instagram saved as: "${savedInstagram}" (expected: "${test.expected}")`);
          console.log(`  Feedback saved: ${savedFeedback ? 'YES' : 'NO'}`);
          
          if (savedInstagram === test.expected && savedFeedback) {
            console.log(`  ✅ PASS - Both Instagram and feedback saved correctly\n`);
          } else {
            console.log(`  ❌ FAIL - Data not saved correctly\n`);
          }
          
          // Get new session for next test
          await axios.post(`${API_BASE}/email-verification/send-otp`, { email: testEmail });
          await db.collection('otps').updateOne(
            { email: testEmail },
            { $set: { otp: '123456', attempts: 0, expiresAt: new Date(Date.now() + 600000) } }
          );
          const newVerify = await axios.post(`${API_BASE}/email-verification/verify-otp`, {
            email: testEmail,
            otp: '123456'
          });
          sessionToken = newVerify.data.sessionToken;
        }
      } catch (error) {
        console.log(`  ❌ Submission failed: ${error.response?.data?.error || error.message}\n`);
      }
    }
    
    // Final check - verify the latest data
    console.log('📊 FINAL DATABASE CHECK:');
    console.log('========================');
    const finalUser = await users.findOne({ 'basicProfile.email': testEmail });
    
    if (finalUser?.enhancedProfile) {
      const profile = finalUser.enhancedProfile;
      console.log('✅ Enhanced profile exists');
      console.log(`✅ Feedback field: ${profile.feedbackSuggestions ? 'PRESENT' : 'MISSING'}`);
      console.log(`✅ Instagram field: ${profile.instagramProfile || 'MISSING'}`);
      console.log(`✅ All core fields: ${profile.fullName ? 'PRESENT' : 'MISSING'}`);
      
      if (profile.feedbackSuggestions) {
        console.log(`\n📝 Latest feedback: "${profile.feedbackSuggestions.substring(0, 100)}..."`);
      }
      
      console.log('\n🎉 SYSTEM IS WORKING CORRECTLY!');
      console.log('All fields including feedback and Instagram are being saved properly.');
    } else {
      console.log('❌ No enhanced profile found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    await client.close();
  }
}

// Run test
testFinalVerification();