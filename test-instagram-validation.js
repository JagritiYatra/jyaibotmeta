// Test Instagram validation
require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');

const API_BASE = 'http://localhost:3000/api';

async function testInstagramValidation() {
  const testEmail = 'techakash@jagritiyatra.com';
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    console.log('🧪 TESTING INSTAGRAM VALIDATION');
    console.log('================================\n');
    
    // Test cases for Instagram handles
    const testCases = [
      { handle: '@valid_user123', expected: true, description: 'Valid handle with @' },
      { handle: 'user.name_123', expected: true, description: 'Valid handle with periods and underscores' },
      { handle: 'a', expected: true, description: 'Single character (valid)' },
      { handle: '30characterslong1234567890abcd', expected: true, description: '30 characters (max length)' },
      { handle: '.invalid', expected: false, description: 'Starts with period (invalid)' },
      { handle: 'invalid.', expected: false, description: 'Ends with period (invalid)' },
      { handle: 'in..valid', expected: false, description: 'Consecutive periods (invalid)' },
      { handle: 'user@name', expected: false, description: 'Contains @ in middle (invalid)' },
      { handle: 'user name', expected: false, description: 'Contains space (invalid)' },
      { handle: '31characterslong1234567890abcde', expected: false, description: '31 characters (too long)' },
      { handle: '', expected: true, description: 'Empty (optional field)' }
    ];
    
    // Step 1: Get session token
    console.log('1️⃣ Getting session token...');
    
    // Send OTP first
    await axios.post(`${API_BASE}/email-verification/send-otp`, {
      email: testEmail
    });
    
    // Then set test OTP to override the real one
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
    
    // Verify OTP
    const verifyResponse = await axios.post(`${API_BASE}/email-verification/verify-otp`, {
      email: testEmail,
      otp: '123456'
    });
    
    const sessionToken = verifyResponse.data.sessionToken;
    console.log('✅ Got session token\n');
    
    // Test each Instagram handle
    console.log('2️⃣ Testing Instagram handles:');
    console.log('--------------------------------');
    
    for (const testCase of testCases) {
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
        linkedInProfile: 'https://linkedin.com/in/test',
        instagramProfile: testCase.handle,
        industryDomain: 'Technology',
        yatraImpact: ['Started Enterprise Post-Yatra'],
        communityAsks: ['Mentorship & Guidance'],
        communityGives: ['Industry Insights & Best Practices'],
        feedbackSuggestions: 'Test feedback'
      };
      
      try {
        const response = await axios.post(`${API_BASE}/plain-form/submit-plain-form`, formData);
        const success = response.data.success;
        const passed = success === testCase.expected;
        
        console.log(`${passed ? '✅' : '❌'} "${testCase.handle}" - ${testCase.description}`);
        if (!passed) {
          console.log(`   Expected: ${testCase.expected ? 'valid' : 'invalid'}, Got: ${success ? 'valid' : 'invalid'}`);
        }
        
        // Reset session for next test
        if (success) {
          await db.collection('otps').updateOne(
            { email: testEmail },
            { $set: { otp: '123456', expiresAt: new Date(Date.now() + 10 * 60 * 1000) } }
          );
          await axios.post(`${API_BASE}/email-verification/send-otp`, { email: testEmail });
          const newVerify = await axios.post(`${API_BASE}/email-verification/verify-otp`, {
            email: testEmail,
            otp: '123456'
          });
          sessionToken = newVerify.data.sessionToken;
        }
      } catch (error) {
        const isValidationError = error.response?.data?.error?.includes('Instagram');
        const passed = !testCase.expected && isValidationError;
        
        console.log(`${passed ? '✅' : '❌'} "${testCase.handle}" - ${testCase.description}`);
        if (!passed && !isValidationError) {
          console.log(`   Error: ${error.response?.data?.error || error.message}`);
        }
      }
    }
    
    // Check stored Instagram handle
    console.log('\n3️⃣ Checking stored Instagram handle:');
    const user = await db.collection('users').findOne({ 'basicProfile.email': testEmail });
    const storedHandle = user?.enhancedProfile?.instagramProfile;
    console.log(`Stored handle: "${storedHandle || 'None'}"`);
    
    // Should be cleaned (no @ symbol)
    if (storedHandle && !storedHandle.startsWith('@')) {
      console.log('✅ Instagram handle stored without @ symbol');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    await client.close();
  }
}

// Run test
testInstagramValidation();