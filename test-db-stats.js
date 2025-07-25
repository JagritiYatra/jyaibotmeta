// Test database statistics

require('dotenv').config();
const { connectDatabase, getDatabase } = require('./src/config/database');

async function checkDatabase() {
  try {
    await connectDatabase();
    console.log('✅ Connected to database');
    
    const db = getDatabase();
    const users = await db.collection('users').find({}).toArray();
    
    console.log(`\n📊 Database Statistics:`);
    console.log(`Total users: ${users.length}`);
    
    // Check profile completion
    const completeProfiles = users.filter(u => u.enhancedProfile?.completed === true);
    console.log(`Complete profiles: ${completeProfiles.length}`);
    
    // Check LinkedIn data
    const withLinkedIn = users.filter(u => u.basicProfile?.linkedinScrapedData);
    console.log(`Users with LinkedIn data: ${withLinkedIn.length}`);
    
    // Check locations
    const locations = {};
    users.forEach(user => {
      const location = user.basicProfile?.linkedinScrapedData?.location || 
                      user.enhancedProfile?.country || 
                      'Unknown';
      locations[location] = (locations[location] || 0) + 1;
    });
    
    console.log('\n📍 Top locations:');
    Object.entries(locations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([loc, count]) => {
        console.log(`  ${loc}: ${count} users`);
      });
    
    // Check skills
    const allSkills = new Set();
    users.forEach(user => {
      const skills = user.basicProfile?.linkedinScrapedData?.skills || [];
      skills.forEach(skill => allSkills.add(skill));
    });
    console.log(`\n🔧 Total unique skills: ${allSkills.size}`);
    
    // Sample some users with "developer" in their data
    console.log('\n👩‍💻 Sample developers:');
    const developers = users.filter(user => {
      const about = (user.basicProfile?.about || '').toLowerCase();
      const headline = (user.basicProfile?.linkedinScrapedData?.headline || '').toLowerCase();
      const title = (user.basicProfile?.linkedinScrapedData?.currentCompanyTitle || '').toLowerCase();
      
      return about.includes('developer') || 
             headline.includes('developer') || 
             title.includes('developer') ||
             about.includes('software') ||
             headline.includes('software') ||
             title.includes('software');
    });
    
    console.log(`Found ${developers.length} developers`);
    developers.slice(0, 3).forEach(dev => {
      console.log(`  - ${dev.basicProfile?.name}: ${dev.basicProfile?.linkedinScrapedData?.headline || 'No headline'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDatabase();