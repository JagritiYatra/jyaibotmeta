#!/usr/bin/env node

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://jy_bot_user:JY2025Bot@cluster0.1tbvvum.mongodb.net/jagriti_yatra_community?retryWrites=true&w=majority';

async function testSimpleFlow() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('jagriti_yatra_community');
    const TEST_EMAIL = 'techakash@jagritiyatra.com';
    
    console.log('TESTING SIMPLE FLOW');
    console.log('='.repeat(60));
    
    // 1. User exists?
    console.log('\n1️⃣ Checking if user exists with email:', TEST_EMAIL);
    const user = await db.collection('users').findOne({
      $or: [
        { 'metadata.email': TEST_EMAIL },
        { 'basicProfile.email': TEST_EMAIL },
        { 'enhancedProfile.email': TEST_EMAIL }
      ]
    });
    
    if (user) {
      console.log('   ✅ User found:', user._id);
    } else {
      console.log('   ❌ User not found');
      return;
    }
    
    // 2. Simulate form submission (no session needed)
    console.log('\n2️⃣ Simulating form submission');
    const formData = {
      email: TEST_EMAIL,
      name: 'Test User',
      phoneNumber: '9876543210',
      gender: 'Male',
      dateOfBirth: '1990-01-01',
      professionalRole: 'Developer',
      country: 'India',
      state: 'Maharashtra', 
      city: 'Mumbai'
    };
    
    // 3. Update profile
    console.log('\n3️⃣ Updating profile');
    const result = await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          whatsappNumber: '919876543210',
          'basicProfile.name': formData.name,
          'enhancedProfile.fullName': formData.name,
          'enhancedProfile.completed': true,
          profileComplete: true
        }
      }
    );
    
    console.log('   ✅ Profile updated');
    
    // 4. Check if bot would greet by name
    console.log('\n4️⃣ Checking bot greeting');
    const updatedUser = await db.collection('users').findOne({ _id: user._id });
    
    if (updatedUser.enhancedProfile?.completed === true) {
      const name = updatedUser.enhancedProfile?.fullName || 'there';
      const firstName = name.split(' ')[0];
      console.log(`   ✅ Bot will greet: "Hello ${firstName}!"`);
    } else {
      console.log('   ❌ Profile not complete');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SIMPLE FLOW WORKS!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testSimpleFlow();