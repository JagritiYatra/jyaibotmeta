// Test live feedback submission
require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');

const API_BASE = 'http://localhost:3000/api';

async function testLiveFeedback() {
  const testEmail = 'techakash@jagritiyatra.com';
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    // Connect to DB
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    const users = db.collection('users');
    
    // Get current state
    let user = await users.findOne({ 'basicProfile.email': testEmail });
    console.log('📊 BEFORE TEST:');
    console.log(`Current feedback: "${user?.enhancedProfile?.feedbackSuggestions || 'None'}"`);
    
    // Step 1: Send OTP
    console.log('\n1️⃣ Sending OTP...');
    const otpResponse = await axios.post(`${API_BASE}/email-verification/send-otp`, {
      email: testEmail
    });
    
    if (!otpResponse.data.success) {
      throw new Error('Failed to send OTP');
    }
    console.log('✅ OTP sent');
    
    // Step 2: Set OTP manually in DB for testing
    console.log('\n2️⃣ Setting test OTP...');
    await db.collection('otps').updateOne(
      { email: testEmail },
      { 
        $set: { 
          otp: '123456',
          email: testEmail,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        }
      },
      { upsert: true }
    );
    console.log('✅ Test OTP set to 123456');
    
    // Step 3: Verify OTP
    console.log('\n3️⃣ Verifying OTP...');
    const verifyResponse = await axios.post(`${API_BASE}/email-verification/verify-otp`, {
      email: testEmail,
      otp: '123456'
    });
    
    if (!verifyResponse.data.success) {
      throw new Error('OTP verification failed');
    }
    
    const sessionToken = verifyResponse.data.sessionToken;
    console.log('✅ OTP verified, got session token');
    
    // Step 4: Submit form with NEW feedback
    console.log('\n4️⃣ Submitting form with NEW feedback...');
    const testFeedback = `NEW TEST FEEDBACK ${Date.now()}: Please add integration with LinkedIn API, automated skill matching, and multi-language support for global alumni.`;
    
    const formData = {
      email: testEmail,
      sessionToken: sessionToken,
      name: 'Test User',
      gender: 'Male',
      dateOfBirth: '1990-01-01',
      professionalRole: 'Entrepreneur',
      country: 'India',
      state: 'Karnataka',
      city: 'Bangalore',
      phoneNumber: '9035304140',
      additionalEmail: '',
      linkedInProfile: 'https://linkedin.com/in/test',
      instagramProfile: '',
      industryDomain: 'Technology',
      yatraImpact: ['Started Enterprise Post-Yatra'],
      communityAsks: ['Mentorship & Guidance'],
      communityGives: ['Industry Insights & Best Practices'],
      feedbackSuggestions: testFeedback
    };
    
    console.log('📝 Sending feedback:', testFeedback);
    
    const submitResponse = await axios.post(`${API_BASE}/plain-form/submit-plain-form`, formData);
    
    if (!submitResponse.data.success) {
      throw new Error('Form submission failed: ' + submitResponse.data.error);
    }
    
    console.log('✅ Form submitted successfully');
    
    // Step 5: Verify in database
    console.log('\n5️⃣ Verifying in database...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    user = await users.findOne({ 'basicProfile.email': testEmail });
    
    console.log('\n📊 AFTER TEST:');
    console.log(`New feedback: "${user?.enhancedProfile?.feedbackSuggestions || 'None'}"`);
    
    if (user?.enhancedProfile?.feedbackSuggestions === testFeedback) {
      console.log('\n✅ SUCCESS! Feedback was updated correctly!');
    } else {
      console.log('\n❌ FAILED! Feedback was not updated!');
      console.log('Expected:', testFeedback);
      console.log('Got:', user?.enhancedProfile?.feedbackSuggestions);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    await client.close();
  }
}

// Run test
console.log('🧪 TESTING LIVE FEEDBACK SUBMISSION');
console.log('====================================\n');
testLiveFeedback();