#!/usr/bin/env node

const { MongoClient } = require('mongodb');
const { getAuthorizedEmails } = require('../src/config/authorizedEmails');
const { logError, logSuccess } = require('../src/middleware/logging');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jy_bot_user:JY2025Bot@cluster0.1tbvvum.mongodb.net/jagriti_yatra_community?retryWrites=true&w=majority';

async function preCreateUserProfiles() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('jagriti_yatra_community');
    const usersCollection = db.collection('users');
    
    // Get all authorized emails
    const authorizedEmails = getAuthorizedEmails();
    console.log(`\n📧 Found ${authorizedEmails.length} authorized emails`);
    
    // Statistics
    let existingProfiles = 0;
    let newProfilesCreated = 0;
    let errors = 0;
    
    console.log('\n🔄 Processing emails...\n');
    
    for (const email of authorizedEmails) {
      const normalizedEmail = email.toLowerCase().trim();
      
      try {
        // Check if user already exists with this email
        const existingUser = await usersCollection.findOne({
          $or: [
            { 'enhancedProfile.email': normalizedEmail },
            { 'metadata.email': normalizedEmail },
            { 'basicProfile.email': normalizedEmail },
            { 'basicProfile.linkedEmails': normalizedEmail }
          ]
        });
        
        if (existingUser) {
          existingProfiles++;
          console.log(`✓ Profile exists for: ${normalizedEmail} (ID: ${existingUser._id})`);
          
          // Update to ensure email is properly stored
          await usersCollection.updateOne(
            { _id: existingUser._id },
            {
              $set: {
                'metadata.email': normalizedEmail,
                'metadata.hasAuthenticatedEmail': true,
                'metadata.lastVerified': new Date()
              },
              $addToSet: {
                'basicProfile.linkedEmails': normalizedEmail
              }
            }
          );
        } else {
          // Create new user profile
          const newUser = {
            // No WhatsApp number yet - will be added when form is filled
            createdAt: new Date(),
            lastActive: new Date(),
            basicProfile: {
              email: normalizedEmail,
              linkedEmails: [normalizedEmail],
              // These will be filled from the plain form
              name: null,
              dateOfBirth: null,
              gender: null,
              professionalRole: null,
              location: null
            },
            enhancedProfile: {
              email: normalizedEmail,
              formFilledVia: null,
              profileComplete: false,
              completed: false
            },
            profileComplete: false,
            conversationHistory: [],
            preferences: {
              language: 'en',
              notificationsEnabled: true
            },
            metadata: {
              source: 'pre_authorized',
              registeredVia: 'email_pre_creation',
              email: normalizedEmail,
              hasAuthenticatedEmail: true,
              preCreated: true,
              preCreatedAt: new Date(),
              awaitingFormSubmission: true
            }
          };
          
          const result = await usersCollection.insertOne(newUser);
          newProfilesCreated++;
          console.log(`✅ Created profile for: ${normalizedEmail} (ID: ${result.insertedId})`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error processing ${normalizedEmail}:`, error.message);
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total emails processed: ${authorizedEmails.length}`);
    console.log(`Existing profiles found: ${existingProfiles}`);
    console.log(`New profiles created: ${newProfilesCreated}`);
    console.log(`Errors encountered: ${errors}`);
    console.log('='.repeat(60));
    
    // Verify the database state
    const totalUsers = await usersCollection.countDocuments({});
    const usersWithEmail = await usersCollection.countDocuments({
      $or: [
        { 'metadata.email': { $exists: true } },
        { 'basicProfile.email': { $exists: true } }
      ]
    });
    const preCreatedUsers = await usersCollection.countDocuments({
      'metadata.preCreated': true
    });
    const completedProfiles = await usersCollection.countDocuments({
      'enhancedProfile.completed': true
    });
    
    console.log('\n📈 DATABASE STATISTICS');
    console.log('='.repeat(60));
    console.log(`Total users in database: ${totalUsers}`);
    console.log(`Users with email: ${usersWithEmail}`);
    console.log(`Pre-created profiles awaiting form: ${preCreatedUsers}`);
    console.log(`Completed profiles: ${completedProfiles}`);
    console.log('='.repeat(60));
    
    logSuccess('pre_create_profiles_completed', {
      totalEmails: authorizedEmails.length,
      existingProfiles,
      newProfilesCreated,
      errors
    });
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    logError(error, { operation: 'pre_create_user_profiles' });
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the script
console.log('🚀 Starting User Profile Pre-Creation Script');
console.log('='.repeat(60));
preCreateUserProfiles()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });