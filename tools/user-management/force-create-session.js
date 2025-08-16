// Force create a session for techakash@jagritiyatra.com for testing
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;

async function forceCreateSession() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    console.log('\n=== FORCE CREATING SESSION FOR TESTING ===\n');
    
    const email = 'techakash@jagritiyatra.com';
    
    // Generate a test session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionData = {
      token: sessionToken,
      email: email,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
    };
    
    // Update user with session
    const result = await db.collection('users').updateOne(
      { 'basicProfile.email': email },
      {
        $set: {
          plainFormSession: sessionData,
          'metadata.sessionCreatedManually': true,
          'metadata.sessionCreatedAt': new Date()
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Session created successfully!');
      console.log('\n📝 SESSION DETAILS:');
      console.log('Email:', email);
      console.log('Token:', sessionToken);
      console.log('Expires:', sessionData.expiresAt);
      
      console.log('\n🚀 YOU CAN NOW USE THIS TO TEST:');
      console.log('1. Go to: https://jyaibot-meta.vercel.app/plain-profile-form.html');
      console.log('2. Open browser console (F12)');
      console.log('3. After verifying email (even with wrong OTP), run this in console:');
      console.log(`   localStorage.setItem('sessionToken', '${sessionToken}');`);
      console.log(`   localStorage.setItem('verifiedEmail', '${email}');`);
      console.log('4. Reload the page');
      console.log('5. Fill and submit the form');
      
      console.log('\n📋 OR USE THIS CURL COMMAND:');
      console.log(`
curl -X POST https://jyaibot-meta.vercel.app/api/plain-form/submit-plain-form \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "${email}",
    "sessionToken": "${sessionToken}",
    "name": "Akash A jadhav",
    "gender": "Female",
    "professionalRole": "NGO Worker",
    "country": "India",
    "state": "Maharashtra",
    "city": "Ahmadpur",
    "phoneNumber": "9990183737",
    "linkedInProfile": "https://linkedin.com/in/akash-new",
    "suggestions": "Test suggestion from force session"
  }'
      `);
      
      // Verify session was created
      const user = await db.collection('users').findOne({ 'basicProfile.email': email });
      if (user.plainFormSession?.token === sessionToken) {
        console.log('\n✅ Session verified in database');
      } else {
        console.log('\n❌ Session creation failed');
      }
      
    } else {
      console.log('❌ Failed to create session - user may not exist');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

forceCreateSession();