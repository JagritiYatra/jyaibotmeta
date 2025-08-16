// Check user data structure

require('dotenv').config();
const { connectDatabase, getDatabase } = require('./src/config/database');

async function checkUserStructure() {
  try {
    await connectDatabase();
    const db = getDatabase();
    
    // Find a user with LinkedIn data
    const user = await db.collection('users').findOne({
      'basicProfile.linkedinScrapedData': { $exists: true }
    });
    
    if (user) {
      console.log('Sample user structure:');
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('No user with LinkedIn data found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserStructure();