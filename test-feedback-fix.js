// Test feedback fix - ensure it updates every time
require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');

const API_BASE = 'http://localhost:3000/api';

async function testFeedbackFix() {
  const testEmail = 'techakash@jagritiyatra.com';
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    const users = db.collection('users');
    
    console.log('🔧 TESTING FEEDBACK FIX');
    console.log('========================\n');
    
    // Check current state
    let user = await users.findOne({ 'basicProfile.email': testEmail });
    const oldFeedback = user?.enhancedProfile?.feedbackSuggestions || '(none)';
    const oldTimestamp = user?.enhancedProfile?.feedbackUpdatedAt;
    
    console.log('📊 BEFORE TEST:');
    console.log('Current feedback:', oldFeedback.substring(0, 50) + '...');
    console.log('Last updated:', oldTimestamp);
    console.log('');
    
    // Test 1: Submit with EMPTY feedback
    console.log('TEST 1: Submit with EMPTY feedback');
    console.log('-----------------------------------');
    
    // Get session
    await axios.post(`${API_BASE}/email-verification/send-otp`, { email: testEmail });
    await db.collection('otps').updateOne(
      { email: testEmail },
      { $set: { otp: '123456', email: testEmail, expiresAt: new Date(Date.now() + 600000), attempts: 0 } },
      { upsert: true }
    );
    const verify1 = await axios.post(`${API_BASE}/email-verification/verify-otp`, {
      email: testEmail, otp: '123456'
    });
    
    // Submit with EMPTY feedback
    await axios.post(`${API_BASE}/plain-form/submit-plain-form`, {
      email: testEmail,
      sessionToken: verify1.data.sessionToken,
      name: 'Test Empty Feedback',
      gender: 'Male',
      dateOfBirth: '1990-01-01',
      professionalRole: 'Entrepreneur',
      country: 'India',
      state: 'Karnataka',
      city: 'Bangalore',
      phoneNumber: '9876543210',
      linkedInProfile: 'https://linkedin.com/in/test',
      instagramProfile: 'test',
      industryDomain: 'Technology',
      yatraImpact: ['Started Enterprise Post-Yatra'],
      communityAsks: ['Mentorship'],
      communityGives: ['Networking'],
      feedbackSuggestions: ''  // EMPTY
    });
    
    await new Promise(r => setTimeout(r, 500));
    user = await users.findOne({ 'basicProfile.email': testEmail });
    
    console.log('Result: Feedback is now:', user?.enhancedProfile?.feedbackSuggestions || '(EMPTY - GOOD!)');
    console.log('✅ Empty feedback should clear old data\n');
    
    // Test 2: Submit with NEW feedback
    console.log('TEST 2: Submit with NEW feedback');
    console.log('---------------------------------');
    
    // Get new session
    await axios.post(`${API_BASE}/email-verification/send-otp`, { email: testEmail });
    await db.collection('otps').updateOne(
      { email: testEmail },
      { $set: { otp: '123456', attempts: 0, expiresAt: new Date(Date.now() + 600000) } }
    );
    const verify2 = await axios.post(`${API_BASE}/email-verification/verify-otp`, {
      email: testEmail, otp: '123456'
    });
    
    const newFeedback = 'USER FEEDBACK: Please add dashboard analytics and reporting features.';
    
    // Submit with NEW feedback
    await axios.post(`${API_BASE}/plain-form/submit-plain-form`, {
      email: testEmail,
      sessionToken: verify2.data.sessionToken,
      name: 'Test New Feedback',
      gender: 'Male',
      dateOfBirth: '1990-01-01',
      professionalRole: 'Entrepreneur',
      country: 'India',
      state: 'Karnataka',
      city: 'Bangalore',
      phoneNumber: '9876543210',
      linkedInProfile: 'https://linkedin.com/in/test',
      instagramProfile: 'test',
      industryDomain: 'Technology',
      yatraImpact: ['Started Enterprise Post-Yatra'],
      communityAsks: ['Mentorship'],
      communityGives: ['Networking'],
      feedbackSuggestions: newFeedback
    });
    
    await new Promise(r => setTimeout(r, 500));
    user = await users.findOne({ 'basicProfile.email': testEmail });
    
    const savedFeedback = user?.enhancedProfile?.feedbackSuggestions || '(none)';
    console.log('Result: Feedback is now:', savedFeedback);
    
    if (savedFeedback === newFeedback) {
      console.log('✅ New feedback saved correctly!\n');
    } else {
      console.log('❌ Feedback not saved correctly!\n');
    }
    
    // Final check
    console.log('📊 FINAL STATUS:');
    console.log('================');
    const finalUser = await users.findOne({ 'basicProfile.email': testEmail });
    const finalFeedback = finalUser?.enhancedProfile?.feedbackSuggestions;
    const finalTimestamp = finalUser?.enhancedProfile?.feedbackUpdatedAt;
    
    console.log('Feedback field:', finalFeedback || '(empty)');
    console.log('Updated at:', finalTimestamp);
    console.log('Old timestamp:', oldTimestamp);
    
    if (finalTimestamp > oldTimestamp) {
      console.log('\n✅ SUCCESS! Feedback timestamp updated - field is being updated!');
    } else {
      console.log('\n❌ FAIL! Feedback timestamp not updated - field not being updated!');
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

testFeedbackFix();