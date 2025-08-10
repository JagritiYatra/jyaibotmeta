// Test feedback for cvresumehelpline@gmail.com account
const axios = require('axios');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const MONGO_URI = process.env.MONGODB_URI;

async function testFeedback() {
  console.log('\n=== TESTING FEEDBACK FOR cvresumehelpline@gmail.com ===\n');
  
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    // Step 1: Get OTP for email verification
    console.log('1. Requesting OTP for email verification...');
    const otpResponse = await axios.post(`${API_BASE_URL}/api/email-verification/send-otp`, {
      email: 'cvresumehelpline@gmail.com'
    });
    
    if (!otpResponse.data.success) {
      // Try the simple version
      const simpleOtpResponse = await axios.post(`${API_BASE_URL}/api/email-verification/send-otp-simple`, {
        email: 'cvresumehelpline@gmail.com'
      });
      
      if (simpleOtpResponse.data.success) {
        console.log('✅ OTP sent (using simple endpoint)');
      } else {
        console.log('⚠️ OTP sending failed, will use test token');
      }
    } else {
      console.log('✅ OTP sent successfully');
    }
    
    // For testing, we'll create a session directly in the database
    console.log('\n2. Creating test session in database...');
    await db.collection('users').updateOne(
      { 'basicProfile.email': 'cvresumehelpline@gmail.com' },
      {
        $set: {
          plainFormSession: {
            token: 'test-cvresume-token-123',
            email: 'cvresumehelpline@gmail.com',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 3600000) // 1 hour
          }
        }
      }
    );
    console.log('✅ Session created');
    
    // Step 2: Submit form with feedback
    console.log('\n3. Submitting profile form with feedback...');
    const formData = {
      email: 'cvresumehelpline@gmail.com',
      sessionToken: 'test-cvresume-token-123',
      name: 'CV Resume Test User',
      gender: 'Male',
      dateOfBirth: '1995-05-15',
      professionalRole: 'Entrepreneur',
      country: 'India',
      state: 'Karnataka',
      city: 'Bangalore',
      phoneNumber: '9876543210',
      linkedInProfile: 'https://linkedin.com/in/cvresumetest',
      industryDomain: 'Technology',
      yatraImpact: ['Started Enterprise Post-Yatra'],
      communityAsks: ['Funding & Investment Support'],
      communityGives: ['Technology & Digital Support'],
      feedbackSuggestions: 'This is test feedback from cvresumehelpline@gmail.com - The platform should have more networking features and alumni directory with search filters.'
    };
    
    const response = await axios.post(
      `${API_BASE_URL}/api/plain-form/submit-plain-form`,
      formData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Form submitted successfully');
      console.log('   Feedback saved:', response.data.feedbackSaved);
    } else {
      console.log('❌ Form submission failed:', response.data.error);
    }
    
    // Step 3: Verify in database
    console.log('\n4. Verifying feedback in database...');
    const user = await db.collection('users').findOne({
      'basicProfile.email': 'cvresumehelpline@gmail.com'
    });
    
    if (user) {
      console.log('\n📊 USER PROFILE DATA:');
      console.log('   Email:', user.basicProfile?.email);
      console.log('   Name (basic):', user.basicProfile?.name);
      console.log('   Name (enhanced):', user.enhancedProfile?.fullName);
      console.log('\n📝 FEEDBACK DATA:');
      console.log('   Feedback (enhanced):', user.enhancedProfile?.feedbackSuggestions || '(none)');
      console.log('   Feedback (basic):', user.basicProfile?.feedbackSuggestions || '(none)');
      console.log('   Feedback stack:', user.enhancedProfile?.feedbackStack?.length || 0, 'entries');
      console.log('   Latest feedback:', user.enhancedProfile?.latestFeedback || '(none)');
      
      // Check if feedback was saved
      const feedbackSaved = user.enhancedProfile?.feedbackSuggestions || user.basicProfile?.feedbackSuggestions;
      if (feedbackSaved) {
        console.log('\n✅ SUCCESS: Feedback was saved successfully!');
        console.log('   Feedback content:', feedbackSaved);
      } else {
        console.log('\n❌ FAILURE: Feedback was not saved');
      }
    } else {
      console.log('❌ User not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    await client.close();
  }
}

// Wait for server to start
setTimeout(() => {
  testFeedback().then(() => {
    console.log('\n=== TEST COMPLETE ===\n');
    process.exit(0);
  });
}, 3000);