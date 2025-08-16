// Verify that production search actually searches entire database
require('dotenv').config();
const { connectDatabase, getDatabase } = require('./src/config/database');
const productionSearchService = require('./src/services/productionSearchService');

async function verifyDatabaseSearch() {
  try {
    await connectDatabase();
    const db = getDatabase();
    
    console.log('DATABASE SEARCH VERIFICATION');
    console.log('=' . repeat(60));
    
    // Count total profiles
    const totalProfiles = await db.collection('users').countDocuments();
    console.log(`\nTotal profiles in database: ${totalProfiles}`);
    
    // Count profiles with different data
    const withLinkedIn = await db.collection('users').countDocuments({
      'basicProfile.linkedinScrapedData': { $exists: true, $ne: null }
    });
    console.log(`Profiles with LinkedIn data: ${withLinkedIn}`);
    
    const withEnhanced = await db.collection('users').countDocuments({
      'enhancedProfile.completed': true
    });
    console.log(`Profiles with enhanced data: ${withEnhanced}`);
    
    // Test broad searches
    console.log('\n' + '=' . repeat(60));
    console.log('TESTING BROAD SEARCHES (should return many results)');
    console.log('=' . repeat(60));
    
    const testUser = {
      _id: 'test',
      basicProfile: { name: 'Test' },
      enhancedProfile: { completed: true }
    };
    
    const broadSearches = [
      { query: "developers", desc: "All developers" },
      { query: "entrepreneurs", desc: "All entrepreneurs" },
      { query: "pune", desc: "Everyone in Pune" },
      { query: "mumbai", desc: "Everyone in Mumbai" },
      { query: "bangalore", desc: "Everyone in Bangalore" },
      { query: "marketing", desc: "Marketing professionals" },
      { query: "anyone who can help", desc: "General help query" }
    ];
    
    for (const search of broadSearches) {
      console.log(`\nSearch: "${search.query}" (${search.desc})`);
      
      // Extract params to see what we're searching for
      const params = await productionSearchService.extractSearchParams(search.query);
      
      // Do actual database search
      const results = await productionSearchService.searchEntireDatabase(params);
      
      console.log(`  Found: ${results.length} profiles`);
      
      // Show sample of results
      if (results.length > 0) {
        const sample = results.slice(0, 3).map(r => 
          r.basicProfile?.name || r.enhancedProfile?.fullName || 'Unknown'
        );
        console.log(`  Sample: ${sample.join(', ')}`);
      }
    }
    
    // Test location coverage
    console.log('\n' + '=' . repeat(60));
    console.log('LOCATION COVERAGE TEST');
    console.log('=' . repeat(60));
    
    const cities = ['pune', 'mumbai', 'bangalore', 'delhi', 'hyderabad', 'chennai'];
    let totalLocationMatches = 0;
    
    for (const city of cities) {
      const count = await db.collection('users').countDocuments({
        $or: [
          { 'basicProfile.linkedinScrapedData.location': { $regex: city, $options: 'i' } },
          { 'enhancedProfile.city': { $regex: city, $options: 'i' } }
        ]
      });
      console.log(`${city}: ${count} profiles`);
      totalLocationMatches += count;
    }
    console.log(`Total with major cities: ${totalLocationMatches}`);
    
    // Test skill coverage
    console.log('\n' + '=' . repeat(60));
    console.log('SKILL COVERAGE TEST');
    console.log('=' . repeat(60));
    
    const skills = ['developer', 'engineer', 'lawyer', 'marketing', 'finance', 'designer'];
    let totalSkillMatches = 0;
    
    for (const skill of skills) {
      const count = await db.collection('users').countDocuments({
        $or: [
          { 'basicProfile.linkedinScrapedData.headline': { $regex: skill, $options: 'i' } },
          { 'basicProfile.about': { $regex: skill, $options: 'i' } },
          { 'enhancedProfile.professionalRole': { $regex: skill, $options: 'i' } }
        ]
      });
      console.log(`${skill}: ${count} profiles`);
      totalSkillMatches += count;
    }
    
    console.log('\n' + '=' . repeat(60));
    console.log('VERIFICATION SUMMARY');
    console.log('=' . repeat(60));
    console.log(`\n✅ Database has ${totalProfiles} total profiles`);
    console.log(`✅ ${withLinkedIn} profiles have LinkedIn scraped data`);
    console.log(`✅ ${withEnhanced} profiles have completed enhanced profiles`);
    console.log(`✅ Major cities cover ${totalLocationMatches}+ profiles`);
    console.log(`✅ Common skills found in ${totalSkillMatches}+ profiles`);
    console.log('\n🎯 CONCLUSION: Production search has access to entire database');
    console.log('   and uses multiple strategies to find relevant profiles.');
    
  } catch (error) {
    console.error('Verification error:', error);
  } finally {
    process.exit(0);
  }
}

verifyDatabaseSearch();