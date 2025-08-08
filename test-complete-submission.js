// Test complete form submission with ALL fields including feedback
require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');

const API_BASE = 'http://localhost:3000/api';

async function testCompleteSubmission() {
  const testEmail = 'techakash@jagritiyatra.com'; // Using authorized test email
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    const users = db.collection('users');
    
    console.log('🧪 TESTING COMPLETE FORM SUBMISSION WITH FEEDBACK');
    console.log('================================================\n');
    
    // Check initial state
    let user = await users.findOne({ 
      $or: [
        { 'basicProfile.email': testEmail },
        { 'enhancedProfile.email': testEmail }
      ]
    });
    console.log('📊 INITIAL STATE:');
    console.log(`User exists: ${user ? 'Yes' : 'No'}`);
    if (user?.enhancedProfile?.feedbackSuggestions) {
      console.log(`Existing feedback: "${user.enhancedProfile.feedbackSuggestions}"`);
    }
    console.log('');
    
    // Step 1: Send OTP
    console.log('1️⃣ Sending OTP...');
    await axios.post(`${API_BASE}/email-verification/send-otp`, {
      email: testEmail
    });
    console.log('✅ OTP sent');
    
    // Step 2: Set test OTP
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
    console.log('✅ Test OTP set\n');
    
    // Step 3: Verify OTP
    console.log('2️⃣ Verifying OTP...');
    const verifyResponse = await axios.post(`${API_BASE}/email-verification/verify-otp`, {
      email: testEmail,
      otp: '123456'
    });
    
    if (!verifyResponse.data.success) {
      throw new Error('OTP verification failed');
    }
    
    const sessionToken = verifyResponse.data.sessionToken;
    console.log('✅ OTP verified, got session token\n');
    
    // Step 4: Submit COMPLETE form with ALL fields
    console.log('3️⃣ Submitting COMPLETE form with ALL fields...');
    
    const timestamp = Date.now();
    const testFeedback = `COMPREHENSIVE TEST ${timestamp}: This is a detailed feedback submission. We should add more analytics features, AI-powered matching, and integration with career platforms. Also consider adding mentorship matching based on skills and interests.`;
    
    const formData = {
      email: testEmail,
      sessionToken: sessionToken,
      
      // Basic Information
      name: 'Arjun Test User',
      gender: 'Male',
      dateOfBirth: '1995-06-15',
      professionalRole: 'Entrepreneur',
      
      // Location
      country: 'India',
      state: 'Maharashtra',
      city: 'Mumbai',
      
      // Contact Information
      phoneNumber: '+91 9876543210',
      additionalEmail: 'arjun.backup@example.com',
      linkedInProfile: 'https://linkedin.com/in/arjun-test',
      instagramProfile: '@arjun_test_123', // Testing with @ symbol
      
      // Professional & Community
      industryDomain: 'Technology',
      yatraImpact: ['Started Enterprise Post-Yatra', 'Found Clarity on Life Goals'],
      communityAsks: ['Mentorship', 'Funding Support', 'Business Partnerships'],
      communityGives: ['Mentorship', 'Industry Insights', 'Networking'],
      
      // FEEDBACK - The critical field
      feedbackSuggestions: testFeedback
    };
    
    console.log('\n📝 Form Data Summary:');
    console.log('- Name:', formData.name);
    console.log('- Email:', formData.email);
    console.log('- Phone:', formData.phoneNumber);
    console.log('- LinkedIn:', formData.linkedInProfile);
    console.log('- Instagram:', formData.instagramProfile);
    console.log('- Industry:', formData.industryDomain);
    console.log('- Feedback Length:', formData.feedbackSuggestions.length, 'characters');
    console.log('- Feedback Preview:', formData.feedbackSuggestions.substring(0, 50) + '...\n');
    
    const submitResponse = await axios.post(`${API_BASE}/plain-form/submit-plain-form`, formData);
    
    if (!submitResponse.data.success) {
      throw new Error('Form submission failed: ' + submitResponse.data.error);
    }
    
    console.log('✅ Form submitted successfully\n');
    
    // Step 5: Verify ALL data in database
    console.log('4️⃣ Verifying data in database...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    user = await users.findOne({ 
      $or: [
        { 'basicProfile.email': testEmail },
        { 'enhancedProfile.email': testEmail }
      ]
    });
    
    if (!user) {
      throw new Error('User not found in database after submission!');
    }
    
    console.log('\n📊 DATABASE VERIFICATION:');
    console.log('=======================');
    
    const profile = user.enhancedProfile || {};
    const checks = [
      { field: 'fullName', expected: formData.name, actual: profile.fullName },
      { field: 'email', expected: formData.email, actual: profile.email },
      { field: 'gender', expected: formData.gender, actual: profile.gender },
      { field: 'dateOfBirth', expected: formData.dateOfBirth, actual: profile.dateOfBirth },
      { field: 'professionalRole', expected: formData.professionalRole, actual: profile.professionalRole },
      { field: 'phoneNumber', expected: formData.phoneNumber.replace(/[^\d]/g, ''), actual: profile.phoneNumber },
      { field: 'linkedInProfile', expected: formData.linkedInProfile, actual: profile.linkedInProfile },
      { field: 'instagramProfile', expected: 'arjun_test_123', actual: profile.instagramProfile }, // Should be without @
      { field: 'industryDomain', expected: formData.industryDomain, actual: profile.industryDomain },
      { field: 'feedbackSuggestions', expected: testFeedback, actual: profile.feedbackSuggestions }
    ];
    
    let allPassed = true;
    checks.forEach(check => {
      const passed = check.actual === check.expected;
      console.log(`${passed ? '✅' : '❌'} ${check.field}: ${passed ? 'Saved correctly' : 'MISMATCH'}`);
      if (!passed) {
        console.log(`   Expected: "${check.expected}"`);
        console.log(`   Actual: "${check.actual || 'NOT FOUND'}"`);
        allPassed = false;
      }
    });
    
    // Check arrays
    console.log(`${profile.yatraImpact?.length === 2 ? '✅' : '❌'} yatraImpact: ${profile.yatraImpact?.length || 0} items`);
    console.log(`${profile.communityAsks?.length === 3 ? '✅' : '❌'} communityAsks: ${profile.communityAsks?.length || 0} items`);
    console.log(`${profile.communityGives?.length === 3 ? '✅' : '❌'} communityGives: ${profile.communityGives?.length || 0} items`);
    
    // Location check
    const locationCorrect = profile.location?.country === 'India' && 
                           profile.location?.state === 'Maharashtra' && 
                           profile.location?.city === 'Mumbai';
    console.log(`${locationCorrect ? '✅' : '❌'} location: ${locationCorrect ? 'Saved correctly' : 'MISMATCH'}`);
    
    console.log('\n📝 FEEDBACK FIELD ANALYSIS:');
    console.log('========================');
    if (profile.feedbackSuggestions) {
      console.log('✅ Feedback field EXISTS in database');
      console.log(`✅ Feedback length: ${profile.feedbackSuggestions.length} characters`);
      console.log(`✅ Feedback matches: ${profile.feedbackSuggestions === testFeedback}`);
      console.log(`✅ Feedback content: "${profile.feedbackSuggestions.substring(0, 100)}..."`);
    } else {
      console.log('❌ FEEDBACK FIELD NOT FOUND IN DATABASE!');
      console.log('Available fields in enhancedProfile:');
      console.log(Object.keys(profile).join(', '));
    }
    
    if (allPassed && profile.feedbackSuggestions === testFeedback) {
      console.log('\n🎉 SUCCESS! All fields including feedback saved correctly!');
    } else {
      console.log('\n⚠️ WARNING: Some fields did not save correctly!');
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
testCompleteSubmission();