#!/usr/bin/env node

const { MongoClient } = require('mongodb');
const { getAuthorizedEmails } = require('../src/config/authorizedEmails');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://classictechno:uGjAsSnJ8Ct3BQxG@cluster0.fzby8.mongodb.net/jagritiyatra?retryWrites=true&w=majority&appName=Cluster0';

async function verifyProfileFlow() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('jagritiyatra');
    const usersCollection = db.collection('users');
    
    // Get statistics
    const totalUsers = await usersCollection.countDocuments({});
    const usersWithEmail = await usersCollection.countDocuments({
      $or: [
        { 'metadata.email': { $exists: true, $ne: null } },
        { 'basicProfile.email': { $exists: true, $ne: null } },
        { 'enhancedProfile.email': { $exists: true, $ne: null } }
      ]
    });
    
    const usersWithWhatsApp = await usersCollection.countDocuments({
      whatsappNumber: { $exists: true, $ne: null }
    });
    
    const preCreatedProfiles = await usersCollection.countDocuments({
      'metadata.preCreated': true
    });
    
    const awaitingFormSubmission = await usersCollection.countDocuments({
      'metadata.awaitingFormSubmission': true
    });
    
    const completedProfiles = await usersCollection.countDocuments({
      $or: [
        { 'enhancedProfile.completed': true },
        { profileComplete: true }
      ]
    });
    
    const filledViaPlainForm = await usersCollection.countDocuments({
      'enhancedProfile.formFilledVia': 'plain_link'
    });
    
    // Print overall statistics
    console.log('📊 DATABASE OVERVIEW');
    console.log('='.repeat(60));
    console.log(`Total users: ${totalUsers}`);
    console.log(`Users with email: ${usersWithEmail}`);
    console.log(`Users with WhatsApp: ${usersWithWhatsApp}`);
    console.log(`Pre-created profiles: ${preCreatedProfiles}`);
    console.log(`Awaiting form submission: ${awaitingFormSubmission}`);
    console.log(`Completed profiles: ${completedProfiles}`);
    console.log(`Filled via plain form: ${filledViaPlainForm}`);
    console.log('='.repeat(60));
    
    // Check authorized emails status
    const authorizedEmails = getAuthorizedEmails();
    console.log(`\n📧 AUTHORIZED EMAILS STATUS (Total: ${authorizedEmails.length})`);
    console.log('='.repeat(60));
    
    let emailsWithProfiles = 0;
    let emailsWithCompletedProfiles = 0;
    let emailsWithWhatsApp = 0;
    let emailsNotInDB = [];
    
    for (const email of authorizedEmails) {
      const normalizedEmail = email.toLowerCase().trim();
      
      const user = await usersCollection.findOne({
        $or: [
          { 'enhancedProfile.email': normalizedEmail },
          { 'metadata.email': normalizedEmail },
          { 'basicProfile.email': normalizedEmail },
          { 'basicProfile.linkedEmails': normalizedEmail }
        ]
      });
      
      if (user) {
        emailsWithProfiles++;
        
        if (user.profileComplete || user.enhancedProfile?.completed) {
          emailsWithCompletedProfiles++;
        }
        
        if (user.whatsappNumber) {
          emailsWithWhatsApp++;
        }
      } else {
        emailsNotInDB.push(normalizedEmail);
      }
    }
    
    console.log(`Emails with profiles: ${emailsWithProfiles}/${authorizedEmails.length}`);
    console.log(`Emails with completed profiles: ${emailsWithCompletedProfiles}/${authorizedEmails.length}`);
    console.log(`Emails with WhatsApp linked: ${emailsWithWhatsApp}/${authorizedEmails.length}`);
    
    if (emailsNotInDB.length > 0) {
      console.log(`\n⚠️  Emails NOT in database (${emailsNotInDB.length}):`);
      emailsNotInDB.forEach(email => console.log(`  - ${email}`));
    }
    
    // Sample some pre-created profiles
    console.log('\n📝 SAMPLE PRE-CREATED PROFILES');
    console.log('='.repeat(60));
    
    const samplePreCreated = await usersCollection.find({
      'metadata.preCreated': true,
      'metadata.awaitingFormSubmission': true
    }).limit(5).toArray();
    
    if (samplePreCreated.length > 0) {
      samplePreCreated.forEach(user => {
        console.log(`\nEmail: ${user.metadata?.email || user.basicProfile?.email}`);
        console.log(`  - ID: ${user._id}`);
        console.log(`  - WhatsApp: ${user.whatsappNumber || 'Not set'}`);
        console.log(`  - Profile Complete: ${user.profileComplete || false}`);
        console.log(`  - Created: ${user.createdAt}`);
      });
    } else {
      console.log('No pre-created profiles awaiting form submission found.');
    }
    
    // Sample completed profiles
    console.log('\n✅ SAMPLE COMPLETED PROFILES');
    console.log('='.repeat(60));
    
    const sampleCompleted = await usersCollection.find({
      $or: [
        { 'enhancedProfile.completed': true },
        { profileComplete: true }
      ]
    }).limit(5).toArray();
    
    if (sampleCompleted.length > 0) {
      sampleCompleted.forEach(user => {
        console.log(`\nEmail: ${user.enhancedProfile?.email || user.metadata?.email || user.basicProfile?.email}`);
        console.log(`  - ID: ${user._id}`);
        console.log(`  - Name: ${user.enhancedProfile?.fullName || user.basicProfile?.name}`);
        console.log(`  - WhatsApp: ${user.whatsappNumber}`);
        console.log(`  - Form Via: ${user.enhancedProfile?.formFilledVia || 'unknown'}`);
        console.log(`  - Updated: ${user.lastUpdated || user.enhancedProfile?.formFilledAt}`);
      });
    } else {
      console.log('No completed profiles found.');
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('='.repeat(60));
    
    if (emailsNotInDB.length > 0) {
      console.log(`1. Run 'node scripts/pre-create-user-profiles.js' to create profiles for ${emailsNotInDB.length} missing emails`);
    }
    
    if (awaitingFormSubmission > 0) {
      console.log(`2. ${awaitingFormSubmission} profiles are waiting for users to fill the plain form`);
    }
    
    const percentageComplete = Math.round((emailsWithCompletedProfiles / authorizedEmails.length) * 100);
    console.log(`3. Profile completion rate: ${percentageComplete}% (${emailsWithCompletedProfiles}/${authorizedEmails.length})`);
    
    if (emailsWithProfiles < authorizedEmails.length) {
      console.log(`4. ${authorizedEmails.length - emailsWithProfiles} authorized emails don't have profiles yet`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the verification
console.log('🔍 PROFILE FLOW VERIFICATION');
console.log('='.repeat(60));
verifyProfileFlow()
  .then(() => {
    console.log('\n✅ Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });