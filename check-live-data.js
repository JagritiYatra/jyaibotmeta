// Check current data for cvresumehelpline@gmail.com
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;

async function checkData() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    const user = await db.collection('users').findOne({
      'basicProfile.email': 'cvresumehelpline@gmail.com'
    });
    
    console.log('\n=== CURRENT USER DATA ===');
    console.log('User found:', !!user);
    
    if (user) {
      console.log('\nProfile Data:');
      console.log('  Name (basic):', user.basicProfile?.name || '(none)');
      console.log('  Name (enhanced):', user.enhancedProfile?.fullName || '(none)');
      console.log('  Suggestions (enhanced):', user.enhancedProfile?.suggestions || '(none)');
      console.log('  Suggestions (basic):', user.basicProfile?.suggestions || '(none)');
      console.log('  Professional Role:', user.enhancedProfile?.professionalRole || '(none)');
      console.log('  Location:', user.enhancedProfile?.location?.city || '(none)');
      
      console.log('\nMetadata:');
      console.log('  Last Updated:', user.lastUpdated || '(none)');
      console.log('  Profile Complete:', user.profileComplete ? 'Yes' : 'No');
      console.log('  Session exists:', !!user.plainFormSession);
      if (user.plainFormSession) {
        console.log('  Session expires:', user.plainFormSession.expiresAt);
        console.log('  Session valid:', new Date(user.plainFormSession.expiresAt) > new Date());
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

checkData();