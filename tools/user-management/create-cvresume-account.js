// Create account for cvresumehelpline@gmail.com
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;

async function createAccount() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({
      $or: [
        { 'basicProfile.email': 'cvresumehelpline@gmail.com' },
        { 'enhancedProfile.email': 'cvresumehelpline@gmail.com' }
      ]
    });
    
    if (existingUser) {
      console.log('✅ User already exists with ID:', existingUser._id);
      console.log('Email:', existingUser.basicProfile?.email || existingUser.enhancedProfile?.email);
      return;
    }
    
    // Create new user account
    const newUser = {
      whatsappNumber: '',
      basicProfile: {
        email: 'cvresumehelpline@gmail.com',
        name: '',
        linkedEmails: ['cvresumehelpline@gmail.com']
      },
      enhancedProfile: {
        email: 'cvresumehelpline@gmail.com',
        fullName: '',
        feedbackSuggestions: '',
        feedbackStack: [],
        profileComplete: false,
        completed: false
      },
      metadata: {
        createdAt: new Date(),
        preCreated: true,
        awaitingFormSubmission: true,
        source: 'pre_registration'
      },
      profileComplete: false
    };
    
    const result = await db.collection('users').insertOne(newUser);
    
    console.log('✅ Successfully created account for cvresumehelpline@gmail.com');
    console.log('User ID:', result.insertedId);
    console.log('\n📋 Account Details:');
    console.log('- Email: cvresumehelpline@gmail.com');
    console.log('- Status: Pre-registered, awaiting profile completion');
    console.log('- Authorized: Yes');
    console.log('- Can submit feedback: Yes');
    console.log('\n🔗 The user can now use the profile form at:');
    console.log('https://jyaibot-meta.vercel.app/plain-profile-form.html');
    
  } catch (error) {
    console.error('❌ Error creating account:', error.message);
  } finally {
    await client.close();
  }
}

createAccount();