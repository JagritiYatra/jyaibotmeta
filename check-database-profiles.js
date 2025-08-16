// Script to analyze database profiles and their structure
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function analyzeProfiles() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(process.env.DB_NAME || 'jagriti_yatra_community');
    const usersCollection = db.collection('users');
    
    // Get total count
    const totalUsers = await usersCollection.countDocuments();
    console.log(`\n📊 Total Profiles: ${totalUsers}`);
    
    // Get profile completion stats
    const completedProfiles = await usersCollection.countDocuments({ 'enhancedProfile.completed': true });
    const profilesWithBasicInfo = await usersCollection.countDocuments({ 'basicProfile': { $exists: true } });
    const profilesWithEnhancedInfo = await usersCollection.countDocuments({ 'enhancedProfile': { $exists: true } });
    
    console.log(`\n📈 Profile Statistics:`);
    console.log(`   - Completed profiles: ${completedProfiles}`);
    console.log(`   - Profiles with basic info: ${profilesWithBasicInfo}`);
    console.log(`   - Profiles with enhanced info: ${profilesWithEnhancedInfo}`);
    
    // Get sample profiles to understand structure
    console.log('\n🔍 Sample Profile Structures:\n');
    
    // Get one complete profile
    const completeProfile = await usersCollection.findOne({ 'enhancedProfile.completed': true });
    if (completeProfile) {
      console.log('✨ Complete Profile Example:');
      console.log('================================');
      console.log(JSON.stringify({
        _id: completeProfile._id,
        whatsappNumber: completeProfile.whatsappNumber ? '***' + completeProfile.whatsappNumber.slice(-4) : 'N/A',
        basicProfile: completeProfile.basicProfile ? {
          name: completeProfile.basicProfile.name || 'N/A',
          email: completeProfile.basicProfile.email || 'N/A',
          linkedEmails: completeProfile.basicProfile.linkedEmails?.length || 0,
          batch: completeProfile.basicProfile.batch || 'N/A',
          profession: completeProfile.basicProfile.profession || 'N/A',
        } : 'Not available',
        enhancedProfile: completeProfile.enhancedProfile ? {
          fullName: completeProfile.enhancedProfile.fullName || 'N/A',
          gender: completeProfile.enhancedProfile.gender || 'N/A',
          professionalRole: completeProfile.enhancedProfile.professionalRole || 'N/A',
          domain: completeProfile.enhancedProfile.domain || 'N/A',
          country: completeProfile.enhancedProfile.country || 'N/A',
          state: completeProfile.enhancedProfile.state || 'N/A',
          city: completeProfile.enhancedProfile.city || 'N/A',
          linkedin: completeProfile.enhancedProfile.linkedin ? 'Present' : 'N/A',
          instagram: completeProfile.enhancedProfile.instagram ? 'Present' : 'N/A',
          yatraImpact: completeProfile.enhancedProfile.yatraImpact || [],
          communityAsks: completeProfile.enhancedProfile.communityAsks || [],
          communityGives: completeProfile.enhancedProfile.communityGives || [],
          completed: completeProfile.enhancedProfile.completed || false,
        } : 'Not available',
        metadata: completeProfile.metadata ? {
          createdAt: completeProfile.metadata.createdAt || 'N/A',
          updatedAt: completeProfile.metadata.updatedAt || 'N/A',
          lastActive: completeProfile.metadata.lastActive || 'N/A',
          profileCompletedAt: completeProfile.metadata.profileCompletedAt || 'N/A',
        } : 'Not available'
      }, null, 2));
    }
    
    // Get one incomplete profile
    const incompleteProfile = await usersCollection.findOne({ 
      'enhancedProfile.completed': { $ne: true },
      'enhancedProfile': { $exists: true }
    });
    
    if (incompleteProfile) {
      console.log('\n\n📝 Incomplete Profile Example:');
      console.log('================================');
      console.log(JSON.stringify({
        _id: incompleteProfile._id,
        whatsappNumber: incompleteProfile.whatsappNumber ? '***' + incompleteProfile.whatsappNumber.slice(-4) : 'N/A',
        enhancedProfile: incompleteProfile.enhancedProfile ? Object.keys(incompleteProfile.enhancedProfile) : [],
        fieldsPresent: incompleteProfile.enhancedProfile ? Object.keys(incompleteProfile.enhancedProfile).filter(k => incompleteProfile.enhancedProfile[k]) : []
      }, null, 2));
    }
    
    // Field completion analysis
    console.log('\n\n📊 Field Completion Analysis:');
    console.log('================================');
    
    const fieldStats = {};
    const enhancedFields = [
      'fullName', 'gender', 'professionalRole', 'dateOfBirth',
      'country', 'state', 'city', 'address', 'phone', 'linkedin',
      'instagram', 'domain', 'yatraImpact', 'communityAsks', 'communityGives'
    ];
    
    for (const field of enhancedFields) {
      const count = await usersCollection.countDocuments({
        [`enhancedProfile.${field}`]: { $exists: true, $ne: null, $ne: '' }
      });
      fieldStats[field] = count;
    }
    
    console.log('Field completion counts:');
    Object.entries(fieldStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([field, count]) => {
        const percentage = totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(1) : 0;
        console.log(`   ${field}: ${count} profiles (${percentage}%)`);
      });
    
    // Professional role distribution
    console.log('\n\n💼 Professional Role Distribution:');
    console.log('================================');
    const roleDistribution = await usersCollection.aggregate([
      { $match: { 'enhancedProfile.professionalRole': { $exists: true } } },
      { $group: { _id: '$enhancedProfile.professionalRole', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    roleDistribution.forEach(role => {
      console.log(`   ${role._id}: ${role.count} users`);
    });
    
    // Domain distribution
    console.log('\n\n🎯 Domain Distribution:');
    console.log('================================');
    const domainDistribution = await usersCollection.aggregate([
      { $match: { 'enhancedProfile.domain': { $exists: true } } },
      { $group: { _id: '$enhancedProfile.domain', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    domainDistribution.forEach(domain => {
      console.log(`   ${domain._id}: ${domain.count} users`);
    });
    
    // Geographic distribution
    console.log('\n\n🌍 Geographic Distribution (Top 10 Countries):');
    console.log('================================');
    const countryDistribution = await usersCollection.aggregate([
      { $match: { 'enhancedProfile.country': { $exists: true } } },
      { $group: { _id: '$enhancedProfile.country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    countryDistribution.forEach(country => {
      console.log(`   ${country._id}: ${country.count} users`);
    });
    
    // Recent activity
    console.log('\n\n⏰ Recent Activity:');
    console.log('================================');
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const activeLastWeek = await usersCollection.countDocuments({
      'metadata.lastActive': { $gte: lastWeek }
    });
    
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const activeLastMonth = await usersCollection.countDocuments({
      'metadata.lastActive': { $gte: lastMonth }
    });
    
    console.log(`   Active in last 7 days: ${activeLastWeek}`);
    console.log(`   Active in last 30 days: ${activeLastMonth}`);
    
    // Check for duplicate emails or phone numbers
    console.log('\n\n🔍 Data Quality Checks:');
    console.log('================================');
    
    const emailDuplicates = await usersCollection.aggregate([
      { $match: { 'basicProfile.email': { $exists: true, $ne: null } } },
      { $group: { _id: '$basicProfile.email', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    console.log(`   Duplicate emails found: ${emailDuplicates.length}`);
    if (emailDuplicates.length > 0 && emailDuplicates.length <= 5) {
      emailDuplicates.forEach(dup => {
        console.log(`      - ${dup._id}: ${dup.count} occurrences`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error analyzing profiles:', error.message);
  } finally {
    await client.close();
    console.log('\n\n✅ Analysis complete');
  }
}

// Run the analysis
analyzeProfiles();