// Debug why search is returning wrong results
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function debugSearch() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'jagriti_yatra_community');
    const users = db.collection('users');
    
    console.log('🔍 DEBUGGING SEARCH ISSUES\n');
    console.log('=' . repeat(80));
    
    // 1. Check for actual web developers
    console.log('\n1️⃣ SEARCHING FOR WEB DEVELOPERS:');
    console.log('-' . repeat(40));
    
    const webDevQuery = {
      $or: [
        { 'basicProfile.linkedinScrapedData.skills': { $regex: 'web|javascript|react|frontend|backend|html|css', $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.headline': { $regex: 'web developer|frontend|backend|full stack', $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.experience.title': { $regex: 'web developer|frontend|backend', $options: 'i' } },
        { 'basicProfile.about': { $regex: 'web developer|javascript|react', $options: 'i' } },
        { 'enhancedProfile.professionalRole': { $regex: 'developer', $options: 'i' } }
      ]
    };
    
    const webDevs = await users.find(webDevQuery).limit(5).toArray();
    console.log(`Found ${webDevs.length} web developers:`);
    
    webDevs.forEach(dev => {
      const name = dev.enhancedProfile?.fullName || dev.basicProfile?.name;
      const headline = dev.basicProfile?.linkedinScrapedData?.headline || dev.enhancedProfile?.professionalRole;
      const location = dev.basicProfile?.linkedinScrapedData?.location || dev.enhancedProfile?.city;
      const skills = dev.basicProfile?.linkedinScrapedData?.skills?.slice(0, 3).join(', ') || 'No skills listed';
      
      console.log(`\n✅ ${name}`);
      console.log(`   Role: ${headline || 'Not specified'}`);
      console.log(`   Location: ${location || 'Not specified'}`);
      console.log(`   Skills: ${skills}`);
    });
    
    // 2. Check for people in Pune
    console.log('\n\n2️⃣ SEARCHING FOR PEOPLE IN PUNE:');
    console.log('-' . repeat(40));
    
    const puneQuery = {
      $or: [
        { 'basicProfile.linkedinScrapedData.location': { $regex: 'pune', $options: 'i' } },
        { 'enhancedProfile.city': { $regex: 'pune', $options: 'i' } },
        { 'enhancedProfile.currentAddress': { $regex: 'pune', $options: 'i' } }
      ]
    };
    
    const punePeople = await users.find(puneQuery).limit(5).toArray();
    console.log(`Found ${punePeople.length} people in Pune:`);
    
    punePeople.forEach(person => {
      const name = person.enhancedProfile?.fullName || person.basicProfile?.name;
      const location = person.basicProfile?.linkedinScrapedData?.location || 
                      person.enhancedProfile?.city || 
                      person.enhancedProfile?.currentAddress;
      const role = person.basicProfile?.linkedinScrapedData?.headline || person.enhancedProfile?.professionalRole;
      
      console.log(`\n✅ ${name}`);
      console.log(`   Location: ${location}`);
      console.log(`   Role: ${role || 'Not specified'}`);
    });
    
    // 3. Check for legal professionals
    console.log('\n\n3️⃣ SEARCHING FOR LEGAL PROFESSIONALS:');
    console.log('-' . repeat(40));
    
    const legalQuery = {
      $or: [
        { 'basicProfile.linkedinScrapedData.headline': { $regex: 'lawyer|legal|advocate|law', $options: 'i' } },
        { 'basicProfile.linkedinScrapedData.experience.title': { $regex: 'lawyer|legal|advocate', $options: 'i' } },
        { 'basicProfile.about': { $regex: 'lawyer|legal advisor|advocate', $options: 'i' } },
        { 'enhancedProfile.professionalRole': { $regex: 'lawyer|legal', $options: 'i' } },
        { 'enhancedProfile.domain': { $regex: 'legal|law', $options: 'i' } }
      ]
    };
    
    const legalPros = await users.find(legalQuery).limit(5).toArray();
    console.log(`Found ${legalPros.length} legal professionals:`);
    
    legalPros.forEach(pro => {
      const name = pro.enhancedProfile?.fullName || pro.basicProfile?.name;
      const headline = pro.basicProfile?.linkedinScrapedData?.headline || pro.enhancedProfile?.professionalRole;
      const location = pro.basicProfile?.linkedinScrapedData?.location || pro.enhancedProfile?.city;
      
      console.log(`\n✅ ${name}`);
      console.log(`   Role: ${headline || 'Not specified'}`);
      console.log(`   Location: ${location || 'Not specified'}`);
    });
    
    // 4. Check why Khushi Agarwal keeps appearing
    console.log('\n\n4️⃣ CHECKING KHUSHI AGARWAL PROFILE:');
    console.log('-' . repeat(40));
    
    const khushi = await users.findOne({
      $or: [
        { 'basicProfile.name': { $regex: 'khushi agarwal', $options: 'i' } },
        { 'enhancedProfile.fullName': { $regex: 'khushi agarwal', $options: 'i' } }
      ]
    });
    
    if (khushi) {
      console.log('Profile details:');
      console.log(`Name: ${khushi.enhancedProfile?.fullName || khushi.basicProfile?.name}`);
      console.log(`Headline: ${khushi.basicProfile?.linkedinScrapedData?.headline}`);
      console.log(`Location: ${khushi.basicProfile?.linkedinScrapedData?.location}`);
      console.log(`Skills: ${JSON.stringify(khushi.basicProfile?.linkedinScrapedData?.skills)}`);
      console.log(`Professional Role: ${khushi.enhancedProfile?.professionalRole}`);
      console.log(`Domain: ${khushi.enhancedProfile?.domain}`);
      console.log(`\nWhy she appears for every search:`);
      console.log(`- Has "CS aspirant" in headline (matches "developer" searches)`);
      console.log(`- Has "Law student" in headline (matches "legal" searches)`);
      console.log(`- But she is NOT a web developer or lawyer!`);
    }
    
    // 5. Count profiles with actual skills data
    console.log('\n\n5️⃣ DATABASE STATISTICS:');
    console.log('-' . repeat(40));
    
    const totalUsers = await users.countDocuments();
    const withSkills = await users.countDocuments({ 'basicProfile.linkedinScrapedData.skills': { $exists: true, $ne: [] } });
    const withHeadline = await users.countDocuments({ 'basicProfile.linkedinScrapedData.headline': { $exists: true, $ne: '' } });
    const withLocation = await users.countDocuments({ 
      $or: [
        { 'basicProfile.linkedinScrapedData.location': { $exists: true, $ne: '' } },
        { 'enhancedProfile.city': { $exists: true, $ne: '' } }
      ]
    });
    
    console.log(`Total users: ${totalUsers}`);
    console.log(`Users with skills data: ${withSkills}`);
    console.log(`Users with headline: ${withHeadline}`);
    console.log(`Users with location: ${withLocation}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

debugSearch();