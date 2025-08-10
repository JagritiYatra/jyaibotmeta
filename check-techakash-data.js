// Check techakash@jagritiyatra.com data in database
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;

async function checkData() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    // Find user by email
    const user = await db.collection('users').findOne({
      $or: [
        { 'basicProfile.email': 'techakash@jagritiyatra.com' },
        { 'enhancedProfile.email': 'techakash@jagritiyatra.com' },
        { 'metadata.email': 'techakash@jagritiyatra.com' }
      ]
    });
    
    if (!user) {
      console.log('User not found with email techakash@jagritiyatra.com');
      return;
    }
    
    console.log('\n=== USER DATA FOR techakash@jagritiyatra.com ===\n');
    console.log('User ID:', user._id);
    console.log('Last Updated:', user.lastUpdated || 'Not set');
    
    console.log('\n📋 BASIC PROFILE:');
    if (user.basicProfile) {
      console.log('  Name:', user.basicProfile.name || '(none)');
      console.log('  Email:', user.basicProfile.email || '(none)');
      console.log('  Gender:', user.basicProfile.gender || '(none)');
      console.log('  Professional Role:', user.basicProfile.professionalRole || '(none)');
      console.log('  Location:', user.basicProfile.location || '(none)');
      console.log('  Suggestions:', user.basicProfile.suggestions || '(none)');
    }
    
    console.log('\n📊 ENHANCED PROFILE:');
    if (user.enhancedProfile) {
      console.log('  Full Name:', user.enhancedProfile.fullName || '(none)');
      console.log('  Email:', user.enhancedProfile.email || '(none)');
      console.log('  Gender:', user.enhancedProfile.gender || '(none)');
      console.log('  Professional Role:', user.enhancedProfile.professionalRole || '(none)');
      console.log('  Phone:', user.enhancedProfile.phoneNumber || '(none)');
      console.log('  LinkedIn:', user.enhancedProfile.linkedInProfile || '(none)');
      console.log('  Instagram:', user.enhancedProfile.instagramProfile || '(none)');
      console.log('  Industry Domain:', user.enhancedProfile.industryDomain || '(none)');
      console.log('  Location:', user.enhancedProfile.location ? 
        `${user.enhancedProfile.location.city}, ${user.enhancedProfile.location.state}, ${user.enhancedProfile.location.country}` : 
        '(none)');
      console.log('  Suggestions:', user.enhancedProfile.suggestions || '(none)');
      console.log('  Yatra Impact:', user.enhancedProfile.yatraImpact || []);
      console.log('  Community Asks:', user.enhancedProfile.communityAsks || []);
      console.log('  Community Gives:', user.enhancedProfile.communityGives || []);
    }
    
    console.log('\n🔄 METADATA:');
    if (user.metadata) {
      console.log('  Created At:', user.metadata.createdAt);
      console.log('  Form Submitted At:', user.metadata.formSubmittedAt);
      console.log('  Profile Completed:', user.metadata.profileCompleted);
    }
    
    console.log('\n✅ Profile Complete:', user.profileComplete ? 'Yes' : 'No');
    console.log('WhatsApp Number:', user.whatsappNumber || '(none)');
    
    // Check if this is the latest update
    console.log('\n🕐 RECENT UPDATE CHECK:');
    const lastHour = new Date(Date.now() - 3600000);
    if (user.lastUpdated && new Date(user.lastUpdated) > lastHour) {
      console.log('✅ Updated within last hour');
      console.log('Update time:', user.lastUpdated);
    } else {
      console.log('⚠️ Not updated recently');
      console.log('Last update was:', user.lastUpdated || 'Never');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

checkData();