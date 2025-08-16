#!/usr/bin/env node

const { MongoClient } = require('mongodb');
const axios = require('axios');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://classictechno:uGjAsSnJ8Ct3BQxG@cluster0.fzby8.mongodb.net/jagritiyatra?retryWrites=true&w=majority&appName=Cluster0';
const API_URL = process.env.API_URL || 'http://localhost:3001';

// Test data
const TEST_EMAIL = 'techakash@jagritiyatra.com'; // Using an authorized email
const TEST_PHONE = '919876543210';
const TEST_PROFILE = {
  name: 'Test User',
  gender: 'Male',
  dateOfBirth: '1995-01-15',
  professionalRole: 'Entrepreneur',
  country: 'India',
  state: 'Maharashtra',
  city: 'Mumbai',
  phoneNumber: TEST_PHONE,
  additionalEmail: 'test.additional@example.com',
  linkedInProfile: 'https://linkedin.com/in/testuser',
  instagramProfile: '@testuser',
  industryDomain: 'Technology',
  yatraImpact: ['Started Enterprise Post-Yatra', 'Found Clarity on Life Goals'],
  communityAsks: ['Mentorship', 'Funding Support'],
  communityGives: ['Industry Insights', 'Networking']
};

async function testCompleteFlow() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🧪 TESTING COMPLETE PROFILE FLOW');
    console.log('='.repeat(60));
    
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('jagritiyatra');
    const usersCollection = db.collection('users');
    
    // Step 1: Check if profile exists for test email
    console.log('📋 Step 1: Checking existing profile status');
    console.log('-'.repeat(40));
    
    let user = await usersCollection.findOne({
      $or: [
        { 'metadata.email': TEST_EMAIL },
        { 'basicProfile.email': TEST_EMAIL },
        { 'enhancedProfile.email': TEST_EMAIL }
      ]
    });
    
    if (user) {
      console.log(`✓ Found existing profile for ${TEST_EMAIL}`);
      console.log(`  - User ID: ${user._id}`);
      console.log(`  - Has WhatsApp: ${!!user.whatsappNumber}`);
      console.log(`  - Profile Complete: ${user.profileComplete || false}`);
      console.log(`  - Pre-created: ${user.metadata?.preCreated || false}`);
      
      // Clean up for testing - reset to pre-created state
      if (process.argv.includes('--reset')) {
        console.log('\n🔄 Resetting profile to pre-created state...');
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              whatsappNumber: null,
              profileComplete: false,
              'enhancedProfile.completed': false,
              'metadata.awaitingFormSubmission': true,
              'basicProfile.name': null,
              'basicProfile.dateOfBirth': null,
              'basicProfile.gender': null,
              'basicProfile.professionalRole': null,
              'basicProfile.location': null
            },
            $unset: {
              'enhancedProfile.fullName': '',
              'enhancedProfile.formFilledAt': '',
              'metadata.formSubmittedAt': ''
            }
          }
        );
        console.log('✓ Profile reset to pre-created state');
      }
    } else {
      console.log(`⚠️  No profile found for ${TEST_EMAIL}`);
      console.log('Creating pre-created profile...');
      
      const newUser = {
        createdAt: new Date(),
        lastActive: new Date(),
        basicProfile: {
          email: TEST_EMAIL,
          linkedEmails: [TEST_EMAIL]
        },
        enhancedProfile: {
          email: TEST_EMAIL,
          profileComplete: false,
          completed: false
        },
        profileComplete: false,
        metadata: {
          source: 'test_pre_authorized',
          email: TEST_EMAIL,
          hasAuthenticatedEmail: true,
          preCreated: true,
          preCreatedAt: new Date(),
          awaitingFormSubmission: true
        }
      };
      
      const result = await usersCollection.insertOne(newUser);
      console.log(`✓ Created profile with ID: ${result.insertedId}`);
      user = { ...newUser, _id: result.insertedId };
    }
    
    // Step 2: Simulate form submission
    console.log('\n📝 Step 2: Simulating plain form submission');
    console.log('-'.repeat(40));
    
    const formData = {
      email: TEST_EMAIL,
      sessionToken: 'test-session-token',
      ...TEST_PROFILE
    };
    
    console.log('Submitting form with:');
    console.log(`  - Email: ${TEST_EMAIL}`);
    console.log(`  - Phone: ${TEST_PHONE}`);
    console.log(`  - Name: ${TEST_PROFILE.name}`);
    
    try {
      const response = await axios.post(`${API_URL}/api/plain-form/submit-plain-form`, formData);
      
      if (response.data.success) {
        console.log('✅ Form submitted successfully!');
        console.log(`  - User ID: ${response.data.userId}`);
        console.log(`  - Is New User: ${response.data.isNewUser}`);
        console.log(`  - Message: ${response.data.message}`);
      } else {
        console.log('❌ Form submission failed:', response.data.error);
        return;
      }
    } catch (error) {
      if (error.response) {
        console.log('❌ API Error:', error.response.data);
      } else if (error.code === 'ECONNREFUSED') {
        console.log('❌ Could not connect to API. Make sure the server is running on port 3001');
        console.log('   Run: npm start');
      } else {
        console.log('❌ Error submitting form:', error.message);
      }
      return;
    }
    
    // Step 3: Verify profile update
    console.log('\n✅ Step 3: Verifying profile update');
    console.log('-'.repeat(40));
    
    const updatedUser = await usersCollection.findOne({ _id: user._id });
    
    if (updatedUser) {
      console.log('Profile after update:');
      console.log(`  - WhatsApp: ${updatedUser.whatsappNumber}`);
      console.log(`  - Name: ${updatedUser.enhancedProfile?.fullName || updatedUser.basicProfile?.name}`);
      console.log(`  - Profile Complete: ${updatedUser.profileComplete}`);
      console.log(`  - Enhanced Complete: ${updatedUser.enhancedProfile?.completed}`);
      console.log(`  - Location: ${updatedUser.basicProfile?.location}`);
      console.log(`  - Form Filled Via: ${updatedUser.enhancedProfile?.formFilledVia}`);
      console.log(`  - Awaiting Submission: ${updatedUser.metadata?.awaitingFormSubmission}`);
      
      // Verify the user can now use the bot
      if (updatedUser.whatsappNumber && updatedUser.profileComplete) {
        console.log('\n✅ SUCCESS: User profile is ready for WhatsApp bot usage!');
        console.log(`   WhatsApp number ${updatedUser.whatsappNumber} can now use the bot.`);
      } else {
        console.log('\n⚠️  WARNING: Profile may not be ready for bot usage');
        if (!updatedUser.whatsappNumber) {
          console.log('   - Missing WhatsApp number');
        }
        if (!updatedUser.profileComplete) {
          console.log('   - Profile not marked as complete');
        }
      }
    } else {
      console.log('❌ Could not find updated user profile');
    }
    
    // Step 4: Test WhatsApp lookup
    console.log('\n🔍 Step 4: Testing WhatsApp number lookup');
    console.log('-'.repeat(40));
    
    const cleanPhone = TEST_PHONE.replace(/[^\d]/g, '');
    const userByPhone = await usersCollection.findOne({
      $or: [
        { whatsappNumber: cleanPhone },
        { whatsappNumber: { $regex: cleanPhone, $options: 'i' } }
      ]
    });
    
    if (userByPhone) {
      console.log(`✅ User can be found by WhatsApp number ${cleanPhone}`);
      console.log(`   User ID: ${userByPhone._id}`);
    } else {
      console.log(`❌ User cannot be found by WhatsApp number ${cleanPhone}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

// Display usage
if (process.argv.includes('--help')) {
  console.log('Usage: node test-complete-flow.js [options]');
  console.log('\nOptions:');
  console.log('  --reset    Reset test user to pre-created state before testing');
  console.log('  --help     Show this help message');
  process.exit(0);
}

// Run the test
console.log('🚀 Starting Complete Flow Test\n');
testCompleteFlow()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });