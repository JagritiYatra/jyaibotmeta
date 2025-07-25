// Test direct MongoDB search

require('dotenv').config();
const { connectDatabase, getDatabase } = require('./src/config/database');

async function testDirectSearch() {
  try {
    await connectDatabase();
    const db = getDatabase();
    console.log('✅ Connected to database\n');
    
    // Test 1: Search for "developer" in various fields
    console.log('🔍 Searching for "developer" in various fields...\n');
    
    const developerQuery = {
      $or: [
        { 'basicProfile.linkedinScrapedData.headline': { $regex: 'developer', $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.currentCompanyTitle': { $regex: 'developer', $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.about': { $regex: 'developer', $options: 'i' } },
        { 'basicProfile.about': { $regex: 'developer', $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.experience.title': { $regex: 'developer', $options: 'i' } }
      ]
    };
    
    const developers = await db.collection('users').find(developerQuery).limit(5).toArray();
    console.log(`Found ${developers.length} developers:`);
    developers.forEach(dev => {
      console.log(`- ${dev.basicProfile?.name}: ${dev.basicProfile?.linkedinScrapedData?.headline || 'No headline'}`);
    });
    
    // Test 2: Search for COEP
    console.log('\n🔍 Searching for "COEP"...\n');
    const coepQuery = {
      $or: [
        { 'basicProfile.linkedinScrapedData.education.title': { $regex: 'COEP', $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.about': { $regex: 'COEP', $options: 'i' } },
        { 'basicProfile.about': { $regex: 'COEP', $options: 'i' } }
      ]
    };
    
    const coepAlumni = await db.collection('users').find(coepQuery).toArray();
    console.log(`Found ${coepAlumni.length} COEP alumni`);
    
    // Test 3: Search for AI
    console.log('\n🔍 Searching for "AI" experts...\n');
    const aiQuery = {
      $or: [
        { 'basicProfile.linkedinScrapedData.headline': { $regex: '\\bAI\\b|artificial intelligence|machine learning', $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.about': { $regex: '\\bAI\\b|artificial intelligence|machine learning', $options: 'i' } },
        { 'basicProfile.about': { $regex: '\\bAI\\b|artificial intelligence|machine learning', $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.skills': { $regex: '\\bAI\\b|artificial intelligence|machine learning', $options: 'i' } }
      ]
    };
    
    const aiExperts = await db.collection('users').find(aiQuery).limit(5).toArray();
    console.log(`Found ${aiExperts.length} AI experts:`);
    aiExperts.forEach(expert => {
      console.log(`- ${expert.basicProfile?.name}: ${expert.basicProfile?.linkedinScrapedData?.headline || 'No headline'}`);
    });
    
    // Test 4: Bangalore tech
    console.log('\n🔍 Searching for Bangalore tech professionals...\n');
    const bangaloreTechQuery = {
      $and: [
        { 'basicProfile.linkedinScrapedData.location': { $regex: 'Bangalore|Bengaluru', $options: 'i' } },
        {
          $or: [
            { 'basicProfile.linkedinScrapedData.headline': { $regex: 'tech|software|engineer|developer', $options: 'i' } },
            { 'basicProfile.linkedinScrapedData.currentCompanyTitle': { $regex: 'tech|software|engineer|developer', $options: 'i' } }
          ]
        }
      ]
    };
    
    const bangaloreTech = await db.collection('users').find(bangaloreTechQuery).limit(5).toArray();
    console.log(`Found ${bangaloreTech.length} Bangalore tech professionals:`);
    bangaloreTech.forEach(person => {
      console.log(`- ${person.basicProfile?.name}: ${person.basicProfile?.linkedinScrapedData?.location}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testDirectSearch();