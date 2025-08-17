// Direct database test for IIT and COEP alumni
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDatabase } = require('./src/config/database');

async function testEducationSearches() {
  try {
    await connectDatabase();
    console.log('Connected to database');
    
    const User = mongoose.model('User');
    
    // Test 1: Search for IIT alumni
    console.log('\n=== SEARCHING FOR IIT ALUMNI ===');
    const iitQuery = {
      $or: [
        { 'basicProfile.linkedinScrapedData.education': { $regex: /\biit\b/i } },
        { 'basicProfile.linkedinScrapedData.education': { $regex: /indian institute of technology/i } },
        { 'basicProfile.about': { $regex: /\biit\b/i } },
        { 'enhancedProfile.education.institutionName': { $regex: /\biit\b/i } },
        { 'enhancedProfile.education.institutionName': { $regex: /indian institute of technology/i } }
      ]
    };
    
    const iitAlumni = await User.find(iitQuery).limit(5);
    console.log(`Found ${iitAlumni.length} IIT alumni`);
    
    if (iitAlumni.length > 0) {
      console.log('\nSample IIT alumni:');
      iitAlumni.forEach(user => {
        const name = user.basicProfile?.linkedinScrapedData?.fullName || 
                    user.enhancedProfile?.fullName || 
                    user.basicProfile?.name || 'Unknown';
        const education = user.basicProfile?.linkedinScrapedData?.education || 
                         user.enhancedProfile?.education?.[0]?.institutionName || 
                         'No education info';
        console.log(`- ${name}: ${education}`);
      });
    }
    
    // Test 2: Search for COEP alumni
    console.log('\n=== SEARCHING FOR COEP ALUMNI ===');
    const coepQuery = {
      $or: [
        { 'basicProfile.linkedinScrapedData.education': { $regex: /coep/i } },
        { 'basicProfile.linkedinScrapedData.education': { $regex: /college of engineering.*pune/i } },
        { 'basicProfile.about': { $regex: /coep/i } },
        { 'enhancedProfile.education.institutionName': { $regex: /coep/i } },
        { 'enhancedProfile.education.institutionName': { $regex: /college of engineering.*pune/i } }
      ]
    };
    
    const coepAlumni = await User.find(coepQuery).limit(5);
    console.log(`Found ${coepAlumni.length} COEP alumni`);
    
    if (coepAlumni.length > 0) {
      console.log('\nSample COEP alumni:');
      coepAlumni.forEach(user => {
        const name = user.basicProfile?.linkedinScrapedData?.fullName || 
                    user.enhancedProfile?.fullName || 
                    user.basicProfile?.name || 'Unknown';
        const education = user.basicProfile?.linkedinScrapedData?.education || 
                         user.enhancedProfile?.education?.[0]?.institutionName || 
                         'No education info';
        const location = user.basicProfile?.linkedinScrapedData?.location || 
                        user.enhancedProfile?.currentAddress || 
                        'Unknown location';
        console.log(`- ${name} (${location}): ${education}`);
      });
    }
    
    // Test 3: Check total user count
    console.log('\n=== DATABASE STATS ===');
    const totalUsers = await User.countDocuments();
    console.log(`Total users in database: ${totalUsers}`);
    
    // Test 4: Check for users with education field
    const usersWithEducation = await User.countDocuments({
      $or: [
        { 'basicProfile.linkedinScrapedData.education': { $exists: true, $ne: '' } },
        { 'enhancedProfile.education': { $exists: true, $ne: [] } }
      ]
    });
    console.log(`Users with education info: ${usersWithEducation}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase disconnected');
  }
}

// Run the test
testEducationSearches();