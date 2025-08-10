// Fix session issue for techakash@jagritiyatra.com
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;

async function fixSession() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    console.log('\n=== FIXING SESSION FOR techakash@jagritiyatra.com ===\n');
    
    // First, check if user exists
    const user = await db.collection('users').findOne({
      $or: [
        { 'basicProfile.email': 'techakash@jagritiyatra.com' },
        { 'enhancedProfile.email': 'techakash@jagritiyatra.com' },
        { 'metadata.email': 'techakash@jagritiyatra.com' }
      ]
    });
    
    if (!user) {
      console.log('User not found. Creating new user...');
      
      // Create user
      const newUser = {
        basicProfile: {
          email: 'techakash@jagritiyatra.com',
          name: '',
          linkedEmails: ['techakash@jagritiyatra.com']
        },
        enhancedProfile: {
          email: 'techakash@jagritiyatra.com',
          fullName: '',
          suggestions: ''
        },
        metadata: {
          createdAt: new Date(),
          preCreated: true,
          awaitingFormSubmission: true,
          source: 'manual_fix'
        },
        profileComplete: false
      };
      
      const result = await db.collection('users').insertOne(newUser);
      console.log('✅ User created with ID:', result.insertedId);
    } else {
      console.log('✅ User found with ID:', user._id);
      console.log('Current data:');
      console.log('  - Name:', user.basicProfile?.name || user.enhancedProfile?.fullName || '(none)');
      console.log('  - Email:', user.basicProfile?.email || user.enhancedProfile?.email);
      console.log('  - Has session:', !!user.plainFormSession);
      console.log('  - Profile complete:', user.profileComplete);
    }
    
    // Clear any existing session to force new OTP
    const clearResult = await db.collection('users').updateOne(
      {
        $or: [
          { 'basicProfile.email': 'techakash@jagritiyatra.com' },
          { 'enhancedProfile.email': 'techakash@jagritiyatra.com' },
          { 'metadata.email': 'techakash@jagritiyatra.com' }
        ]
      },
      {
        $unset: { plainFormSession: 1 },
        $set: {
          'metadata.sessionCleared': new Date(),
          'metadata.readyForNewSession': true
        }
      }
    );
    
    console.log('\n✅ Session cleared. User can now:');
    console.log('1. Go to: https://jyaibot-meta.vercel.app/plain-profile-form.html');
    console.log('2. Enter email: techakash@jagritiyatra.com');
    console.log('3. Click "Send OTP" to get a new verification code');
    console.log('4. Enter the OTP from email');
    console.log('5. Fill and submit the form with suggestions');
    
    if (clearResult.modifiedCount > 0) {
      console.log('\n✅ Session successfully cleared!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

fixSession();