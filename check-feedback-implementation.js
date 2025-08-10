// Check feedback implementation and compare with name field
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;

async function checkImplementation() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    // Find a real user with feedback
    const usersWithFeedback = await db.collection('users').find({
      $or: [
        { 'enhancedProfile.feedbackSuggestions': { $exists: true, $ne: '' } },
        { 'enhancedProfile.feedbackStack': { $exists: true, $ne: [] } }
      ]
    }).limit(5).toArray();
    
    console.log('\n=== USERS WITH FEEDBACK ===');
    console.log(`Found ${usersWithFeedback.length} users with feedback\n`);
    
    usersWithFeedback.forEach((user, index) => {
      console.log(`\nUser ${index + 1}: ${user.basicProfile?.email || user.enhancedProfile?.email}`);
      console.log('Name fields:');
      console.log('  - basicProfile.name:', user.basicProfile?.name);
      console.log('  - enhancedProfile.fullName:', user.enhancedProfile?.fullName);
      console.log('Feedback fields:');
      console.log('  - enhancedProfile.feedbackSuggestions:', user.enhancedProfile?.feedbackSuggestions);
      console.log('  - enhancedProfile.feedbackStack:', user.enhancedProfile?.feedbackStack?.length || 0, 'entries');
      console.log('  - enhancedProfile.latestFeedback:', user.enhancedProfile?.latestFeedback);
    });
    
    // Check how name is stored across all users
    console.log('\n\n=== NAME FIELD STORAGE ANALYSIS ===');
    const nameFieldAnalysis = await db.collection('users').aggregate([
      { $limit: 10 },
      { $project: {
        email: { $ifNull: ['$basicProfile.email', '$enhancedProfile.email'] },
        hasBasicName: { $cond: { if: { $gt: ['$basicProfile.name', null] }, then: true, else: false } },
        hasEnhancedName: { $cond: { if: { $gt: ['$enhancedProfile.fullName', null] }, then: true, else: false } },
        basicName: '$basicProfile.name',
        enhancedName: '$enhancedProfile.fullName'
      }}
    ]).toArray();
    
    console.log('Name field presence in first 10 users:');
    nameFieldAnalysis.forEach(user => {
      console.log(`  ${user.email}: basicName=${user.hasBasicName}, enhancedName=${user.hasEnhancedName}`);
    });
    
    // Check the structure of enhancedProfile
    console.log('\n\n=== ENHANCED PROFILE STRUCTURE ===');
    const sampleUser = await db.collection('users').findOne({
      'enhancedProfile': { $exists: true }
    });
    
    if (sampleUser && sampleUser.enhancedProfile) {
      console.log('Fields in enhancedProfile:');
      Object.keys(sampleUser.enhancedProfile).forEach(key => {
        const value = sampleUser.enhancedProfile[key];
        const type = Array.isArray(value) ? 'array' : typeof value;
        console.log(`  - ${key}: ${type}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkImplementation();