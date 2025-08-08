// Test REAL feedback submission - exactly as a user would do it
require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');

const API_BASE = 'http://localhost:3000/api';

async function testRealFeedback() {
  const testEmail = 'techakash@jagritiyatra.com';
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    const users = db.collection('users');
    
    console.log('🔍 TESTING REAL USER FEEDBACK SUBMISSION');
    console.log('==========================================\n');
    
    // Check current state
    let user = await users.findOne({ 'basicProfile.email': testEmail });
    console.log('📊 CURRENT STATE:');
    console.log('User has profile:', user ? 'YES' : 'NO');
    if (user?.enhancedProfile?.feedbackSuggestions) {
      console.log('Current feedback:', user.enhancedProfile.feedbackSuggestions);
      console.log('This is old test data - should be replaced!\n');
    }
    
    // Step 1: Send OTP (as user would)
    console.log('1️⃣ User requests OTP...');
    await axios.post(`${API_BASE}/email-verification/send-otp`, {
      email: testEmail
    });
    
    // Set test OTP
    await db.collection('otps').updateOne(
      { email: testEmail },
      { 
        $set: { 
          otp: '123456',
          email: testEmail,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          attempts: 0
        }
      },
      { upsert: true }
    );
    console.log('✅ OTP sent\n');
    
    // Step 2: Verify OTP (as user would)
    console.log('2️⃣ User enters OTP...');
    const verifyResponse = await axios.post(`${API_BASE}/email-verification/verify-otp`, {
      email: testEmail,
      otp: '123456'
    });
    
    if (!verifyResponse.data.success) {
      throw new Error('OTP verification failed');
    }
    
    const sessionToken = verifyResponse.data.sessionToken;
    console.log('✅ OTP verified\n');
    
    // Step 3: User fills and submits form with REAL feedback
    console.log('3️⃣ User fills form with REAL feedback...');
    
    const realUserFeedback = `This bot needs better integration with our existing systems. Please add:
1. API access for third-party tools
2. Export functionality for analytics
3. Better search and filter options
4. Mobile app would be great
5. Notification system for important updates`;
    
    console.log('User enters feedback:');
    console.log(`"${realUserFeedback}"\n`);
    
    const formData = {
      email: testEmail,
      sessionToken: sessionToken,
      name: 'Real User Name',
      gender: 'Male',
      dateOfBirth: '1995-03-15',
      professionalRole: 'Entrepreneur',
      country: 'India',
      state: 'Karnataka',
      city: 'Bangalore',
      phoneNumber: '+91 9035304140',
      additionalEmail: 'backup@example.com',
      linkedInProfile: 'https://linkedin.com/in/realuser',
      instagramProfile: 'https://instagram.com/real_user',
      industryDomain: 'Technology',
      yatraImpact: ['Started Enterprise Post-Yatra'],
      communityAsks: ['Mentorship', 'Funding Support'],
      communityGives: ['Industry Insights', 'Networking'],
      feedbackSuggestions: realUserFeedback  // REAL FEEDBACK
    };
    
    console.log('4️⃣ Submitting form...');
    const submitResponse = await axios.post(`${API_BASE}/plain-form/submit-plain-form`, formData);
    
    if (!submitResponse.data.success) {
      throw new Error('Form submission failed: ' + submitResponse.data.error);
    }
    
    console.log('✅ Form submitted\n');
    
    // Step 4: Verify in database
    console.log('5️⃣ Checking database...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    user = await users.findOne({ 'basicProfile.email': testEmail });
    
    console.log('\n📊 RESULT:');
    console.log('==========');
    
    if (user?.enhancedProfile?.feedbackSuggestions) {
      const savedFeedback = user.enhancedProfile.feedbackSuggestions;
      
      if (savedFeedback === realUserFeedback) {
        console.log('✅ SUCCESS! Real feedback saved correctly!');
        console.log(`Feedback in DB: "${savedFeedback.substring(0, 100)}..."`);
      } else if (savedFeedback.includes('Test feedback')) {
        console.log('❌ FAILED! Still showing old test feedback!');
        console.log(`Expected: "${realUserFeedback.substring(0, 50)}..."`);
        console.log(`Got: "${savedFeedback.substring(0, 50)}..."`);
      } else {
        console.log('⚠️ PARTIAL: Feedback saved but different');
        console.log(`Expected: "${realUserFeedback.substring(0, 50)}..."`);
        console.log(`Got: "${savedFeedback.substring(0, 50)}..."`);
      }
    } else {
      console.log('❌ FAILED! No feedback field in database!');
    }
    
    // Check all other fields too
    console.log('\n📋 Other fields check:');
    const profile = user?.enhancedProfile || {};
    console.log(`Name: ${profile.fullName === 'Real User Name' ? '✅' : '❌'} ${profile.fullName}`);
    console.log(`Instagram: ${profile.instagramProfile === 'real_user' ? '✅' : '❌'} ${profile.instagramProfile}`);
    console.log(`LinkedIn: ${profile.linkedInProfile === formData.linkedInProfile ? '✅' : '❌'}`);
    console.log(`Phone: ${profile.phoneNumber === '919035304140' ? '✅' : '❌'} ${profile.phoneNumber}`);
    
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
testRealFeedback();