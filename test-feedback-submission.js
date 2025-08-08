// Test script to submit form with feedback field
require('dotenv').config();
const axios = require('axios');

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://jyaibot-meta.vercel.app/api'
  : 'http://localhost:3000/api';

async function testFeedbackSubmission() {
  try {
    // Test email (must be in authorized list)
    const testEmail = 'techakash@jagritiyatra.com';
    
    console.log('🔧 Testing feedback field submission...');
    console.log(`📧 Using email: ${testEmail}`);
    console.log(`🌐 API Base: ${API_BASE}`);
    
    // Step 1: Send OTP
    console.log('\n1️⃣ Sending OTP...');
    const otpResponse = await axios.post(`${API_BASE}/plain-form/send-otp`, {
      email: testEmail
    });
    
    if (!otpResponse.data.success) {
      throw new Error('Failed to send OTP: ' + otpResponse.data.error);
    }
    
    console.log('✅ OTP sent successfully');
    console.log('⏰ Please check email and enter OTP manually in the database');
    console.log('   Run this MongoDB command to set OTP to "123456":');
    console.log(`   db.otps.updateOne({email: "${testEmail}"}, {$set: {otp: "123456"}})`);
    
    // Wait for manual OTP entry
    console.log('\n⌛ Waiting 10 seconds for manual OTP entry...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Step 2: Verify OTP (using test OTP)
    console.log('\n2️⃣ Verifying OTP...');
    const verifyResponse = await axios.post(`${API_BASE}/plain-form/verify-otp`, {
      email: testEmail,
      otp: '123456'
    });
    
    if (!verifyResponse.data.success) {
      console.log('❌ OTP verification failed. Please manually set OTP in database and try again.');
      return;
    }
    
    const sessionToken = verifyResponse.data.sessionToken;
    console.log('✅ OTP verified, session token received');
    
    // Step 3: Submit form with feedback
    console.log('\n3️⃣ Submitting form with feedback...');
    const formData = {
      email: testEmail,
      sessionToken: sessionToken,
      name: 'Test User with Feedback',
      gender: 'Male',
      dateOfBirth: '1990-01-01',
      professionalRole: 'Entrepreneur',
      country: 'India',
      state: 'Karnataka',
      city: 'Bangalore',
      phoneNumber: '9876543210',
      additionalEmail: '',
      linkedInProfile: 'https://linkedin.com/in/testuser',
      instagramProfile: '',
      industryDomain: 'Technology',
      yatraImpact: ['Started Enterprise Post-Yatra'],
      communityAsks: ['Mentorship & Guidance'],
      communityGives: ['Industry Insights & Best Practices'],
      feedbackSuggestions: 'This is a test feedback submission. The bot could collect more information about professional skills, languages spoken, and areas of expertise. It would be helpful to have a section for sharing success stories and testimonials from the Yatra experience.'
    };
    
    const submitResponse = await axios.post(`${API_BASE}/plain-form/submit-plain-form`, {
      ...formData
    });
    
    if (!submitResponse.data.success) {
      throw new Error('Failed to submit form: ' + submitResponse.data.error);
    }
    
    console.log('✅ Form submitted successfully');
    console.log('📝 Feedback content:', formData.feedbackSuggestions);
    
    // Step 4: Verify in database
    console.log('\n4️⃣ Verifying in database...');
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    const user = await db.collection('users').findOne({
      'basicProfile.email': testEmail
    });
    
    if (user && user.enhancedProfile && user.enhancedProfile.feedbackSuggestions) {
      console.log('✅ Feedback successfully saved in database!');
      console.log('📄 Stored feedback:', user.enhancedProfile.feedbackSuggestions);
    } else {
      console.log('❌ Feedback not found in database');
      console.log('User enhanced profile:', user?.enhancedProfile);
    }
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testFeedbackSubmission().catch(console.error);