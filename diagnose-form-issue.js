// Comprehensive diagnosis of form submission issue
const axios = require('axios');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const LIVE_URL = 'https://jyaibot-meta.vercel.app';
const MONGO_URI = process.env.MONGODB_URI;

async function diagnoseIssue() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    console.log('\n========================================');
    console.log('FORM SUBMISSION ISSUE DIAGNOSIS');
    console.log('========================================\n');
    
    const email = 'techakash@jagritiyatra.com';
    
    // Step 1: Check current database state
    console.log('📊 STEP 1: Current Database State');
    console.log('----------------------------------');
    const user = await db.collection('users').findOne({
      'basicProfile.email': email
    });
    
    if (user) {
      console.log('✅ User exists in database');
      console.log('  ID:', user._id);
      console.log('  Name:', user.enhancedProfile?.fullName || user.basicProfile?.name || '(none)');
      console.log('  Last Updated:', user.lastUpdated || '(never)');
      console.log('  Has Session:', user.plainFormSession ? 'YES' : 'NO');
      
      if (user.plainFormSession) {
        const sessionExpired = new Date() > new Date(user.plainFormSession.expiresAt);
        console.log('  Session Status:', sessionExpired ? '❌ EXPIRED' : '✅ ACTIVE');
        console.log('  Session Expires:', user.plainFormSession.expiresAt);
      }
    } else {
      console.log('❌ User not found in database');
    }
    
    // Step 2: Test the endpoints
    console.log('\n🔌 STEP 2: Testing API Endpoints');
    console.log('----------------------------------');
    
    // Test health endpoint
    try {
      const healthRes = await axios.get(`${LIVE_URL}/api/health`);
      console.log('✅ Health endpoint working:', healthRes.data.message || 'OK');
    } catch (e) {
      console.log('❌ Health endpoint failed:', e.message);
    }
    
    // Step 3: Check for recent sessions
    console.log('\n🔐 STEP 3: Recent Session Activity');
    console.log('----------------------------------');
    const recentSessions = await db.collection('users').find({
      'plainFormSession.createdAt': { $gte: new Date(Date.now() - 3600000) } // Last hour
    }).toArray();
    
    console.log(`Found ${recentSessions.length} users with sessions created in last hour`);
    if (recentSessions.length > 0) {
      console.log('Recent sessions for:');
      recentSessions.forEach(u => {
        console.log('  -', u.basicProfile?.email || u.enhancedProfile?.email);
      });
    }
    
    // Step 4: Check for recent form submissions
    console.log('\n📝 STEP 4: Recent Form Submissions');
    console.log('----------------------------------');
    const recentSubmissions = await db.collection('users').find({
      'enhancedProfile.formFilledAt': { $gte: new Date(Date.now() - 3600000) } // Last hour
    }).toArray();
    
    console.log(`Found ${recentSubmissions.length} form submissions in last hour`);
    if (recentSubmissions.length > 0) {
      console.log('Recent submissions:');
      recentSubmissions.forEach(u => {
        console.log('  -', u.enhancedProfile?.email, 'at', u.enhancedProfile?.formFilledAt);
      });
    }
    
    // Step 5: Diagnose the issue
    console.log('\n🔍 STEP 5: DIAGNOSIS');
    console.log('----------------------------------');
    
    if (!user) {
      console.log('❌ ISSUE: User doesn\'t exist in database');
      console.log('   SOLUTION: Need to create user first');
    } else if (!user.plainFormSession) {
      console.log('❌ ISSUE: No session exists for user');
      console.log('   SOLUTION: User needs to verify OTP to create session');
      console.log('\n   STEPS TO FIX:');
      console.log('   1. Go to https://jyaibot-meta.vercel.app/plain-profile-form.html');
      console.log('   2. Enter email: techakash@jagritiyatra.com');
      console.log('   3. Click "Send OTP"');
      console.log('   4. Check email and enter OTP');
      console.log('   5. Click "Verify Email"');
      console.log('   6. Fill and submit form');
    } else if (new Date() > new Date(user.plainFormSession.expiresAt)) {
      console.log('❌ ISSUE: Session has expired');
      console.log('   Expired at:', user.plainFormSession.expiresAt);
      console.log('   SOLUTION: Need to get new OTP and verify again');
    } else {
      console.log('✅ Session is valid');
      console.log('   If form still not updating, possible issues:');
      console.log('   - Form submission endpoint may have error');
      console.log('   - Database write might be failing');
      console.log('   - Check browser console for errors');
    }
    
    // Step 6: Test form submission endpoint directly
    console.log('\n🧪 STEP 6: Testing Form Submission Endpoint');
    console.log('----------------------------------');
    
    if (user?.plainFormSession?.token && new Date() < new Date(user.plainFormSession.expiresAt)) {
      console.log('Testing with existing session token...');
      
      try {
        const testData = {
          email: email,
          sessionToken: user.plainFormSession.token,
          name: 'Test Update ' + new Date().toISOString(),
          gender: 'Male',
          professionalRole: 'Test Role',
          country: 'India',
          state: 'Test State',
          city: 'Test City',
          suggestions: 'Test suggestion at ' + new Date().toISOString()
        };
        
        const submitRes = await axios.post(`${LIVE_URL}/api/plain-form/submit-plain-form`, testData);
        console.log('✅ Form submission succeeded:', submitRes.data);
        
        // Check if update actually happened
        await new Promise(resolve => setTimeout(resolve, 2000));
        const updatedUser = await db.collection('users').findOne({ _id: user._id });
        if (updatedUser.enhancedProfile?.fullName === testData.name) {
          console.log('✅ Database was successfully updated!');
        } else {
          console.log('❌ Form submitted but database not updated');
        }
      } catch (submitError) {
        console.log('❌ Form submission failed:', submitError.response?.data || submitError.message);
      }
    } else {
      console.log('⚠️ Cannot test submission - no valid session');
    }
    
    console.log('\n========================================');
    console.log('DIAGNOSIS COMPLETE');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('Diagnosis error:', error.message);
  } finally {
    await client.close();
  }
}

// Run diagnosis
diagnoseIssue();