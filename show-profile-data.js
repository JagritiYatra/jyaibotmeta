// Script to show actual profile data
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function showProfileData() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(process.env.DB_NAME || 'jagriti_yatra_community');
    const usersCollection = db.collection('users');
    
    // Get different types of profiles
    console.log('=' . repeat(80));
    console.log('SHOWING ACTUAL PROFILE DATA FROM DATABASE');
    console.log('=' . repeat(80));
    
    // 1. Get a fully completed profile
    const completeProfile = await usersCollection.findOne({ 
      'enhancedProfile.completed': true,
      'enhancedProfile.fullName': { $exists: true, $ne: null }
    });
    
    if (completeProfile) {
      console.log('\n📌 COMPLETE PROFILE EXAMPLE:');
      console.log('-' . repeat(80));
      console.log(JSON.stringify(completeProfile, null, 2));
    }
    
    // 2. Get a partially filled profile
    const partialProfile = await usersCollection.findOne({
      'enhancedProfile.fullName': { $exists: true },
      'enhancedProfile.completed': { $ne: true }
    });
    
    if (partialProfile) {
      console.log('\n\n📌 PARTIAL PROFILE EXAMPLE:');
      console.log('-' . repeat(80));
      console.log(JSON.stringify(partialProfile, null, 2));
    }
    
    // 3. Get a profile with minimal data
    const minimalProfile = await usersCollection.findOne({
      'enhancedProfile': { $exists: true },
      'enhancedProfile.fullName': { $exists: false }
    });
    
    if (minimalProfile) {
      console.log('\n\n📌 MINIMAL PROFILE EXAMPLE:');
      console.log('-' . repeat(80));
      console.log(JSON.stringify(minimalProfile, null, 2));
    }
    
    // 4. Show first 5 profiles to see variety
    console.log('\n\n📌 FIRST 5 PROFILES IN DATABASE:');
    console.log('-' . repeat(80));
    
    const firstFive = await usersCollection.find({}).limit(5).toArray();
    firstFive.forEach((profile, index) => {
      console.log(`\n\n--- Profile ${index + 1} ---`);
      console.log(JSON.stringify(profile, null, 2));
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

showProfileData();