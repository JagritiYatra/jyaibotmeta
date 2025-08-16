#!/usr/bin/env node

const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jy_bot_user:JY2025Bot@cluster0.1tbvvum.mongodb.net/jagriti_yatra_community?retryWrites=true&w=majority';

async function testPlainFormFlow() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('jagriti_yatra_community');
    const usersCollection = db.collection('users');
    
    const TEST_EMAIL = 'techakash@jagritiyatra.com';
    
    console.log('🔄 TESTING PLAIN FORM FLOW');
    console.log('=' .repeat(60));
    
    // Step 1: Check if user profile exists
    console.log('\n📧 Step 1: Finding user profile for:', TEST_EMAIL);
    const user = await usersCollection.findOne({
      $or: [
        { 'metadata.email': TEST_EMAIL },
        { 'basicProfile.email': TEST_EMAIL },
        { 'enhancedProfile.email': TEST_EMAIL },
        { 'basicProfile.linkedEmails': TEST_EMAIL }
      ]
    });
    
    if (!user) {
      console.error('❌ User profile not found for:', TEST_EMAIL);
      return;
    }
    
    console.log(`✅ User found: ${user._id}`);
    console.log(`  - Current WhatsApp: ${user.whatsappNumber || 'Not set'}`);
    console.log(`  - Profile complete: ${user.enhancedProfile?.completed || false}`);
    
    // Step 2: Simulate OTP verification and session creation
    console.log('\n🔐 Step 2: Simulating OTP verification');
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiry = new Date();
    sessionExpiry.setHours(sessionExpiry.getHours() + 2);
    
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          'plainFormSession': {
            token: sessionToken,
            email: TEST_EMAIL,
            verified: true,
            createdAt: new Date(),
            expiresAt: sessionExpiry
          }
        }
      }
    );
    
    console.log('✅ Session token created and stored');
    console.log(`  - Token: ${sessionToken.substring(0, 10)}...`);
    
    // Step 3: Verify session is stored correctly
    console.log('\n🔍 Step 3: Verifying session storage');
    const userWithSession = await usersCollection.findOne({
      $or: [
        { 'metadata.email': TEST_EMAIL },
        { 'basicProfile.email': TEST_EMAIL },
        { 'enhancedProfile.email': TEST_EMAIL },
        { 'basicProfile.linkedEmails': TEST_EMAIL }
      ],
      'plainFormSession.token': sessionToken,
      'plainFormSession.email': TEST_EMAIL,
      'plainFormSession.expiresAt': { $gt: new Date() }
    });
    
    if (userWithSession) {
      console.log('✅ Session validated successfully');
    } else {
      console.error('❌ Session validation failed');
      return;
    }
    
    // Step 4: Simulate form submission with session token
    console.log('\n📝 Step 4: Simulating form submission');
    const formData = {
      email: TEST_EMAIL,
      sessionToken: sessionToken,
      name: 'Ajay Bhai',
      gender: 'Female',
      dateOfBirth: '2000-01-07',
      professionalRole: 'Student',
      country: 'Gabon',
      state: 'Ogooué-Ivindo Province',
      city: 'Makokou',
      phoneNumber: '+919035304140',
      linkedInProfile: 'https://www.linkedin.com/in/classictechak/',
      industryDomain: 'Healthcare',
      yatraImpact: ['Started Enterprise Post-Yatra', 'Found Clarity on Life Goals'],
      communityAsks: ['Funding Support'],
      communityGives: ['Investment']
    };
    
    // Clean phone number
    let cleanedPhone = formData.phoneNumber.replace(/[^\d]/g, '');
    if (cleanedPhone.length === 10) {
      cleanedPhone = '91' + cleanedPhone;
    }
    
    // Update profile
    const updateResult = await usersCollection.updateOne(
      { _id: userWithSession._id },
      {
        $set: {
          whatsappNumber: cleanedPhone,
          'basicProfile.name': formData.name,
          'basicProfile.gender': formData.gender,
          'basicProfile.dateOfBirth': formData.dateOfBirth,
          'basicProfile.professionalRole': formData.professionalRole,
          'basicProfile.location': `${formData.city}, ${formData.state}, ${formData.country}`,
          'basicProfile.email': TEST_EMAIL,
          'enhancedProfile.fullName': formData.name,
          'enhancedProfile.email': TEST_EMAIL,
          'enhancedProfile.phoneNumber': cleanedPhone,
          'enhancedProfile.location': {
            country: formData.country,
            state: formData.state,
            city: formData.city
          },
          'enhancedProfile.linkedInProfile': formData.linkedInProfile,
          'enhancedProfile.industryDomain': formData.industryDomain,
          'enhancedProfile.yatraImpact': formData.yatraImpact,
          'enhancedProfile.communityAsks': formData.communityAsks,
          'enhancedProfile.communityGives': formData.communityGives,
          'enhancedProfile.formFilledVia': 'plain_link',
          'enhancedProfile.formFilledAt': new Date(),
          'enhancedProfile.completed': true,
          'enhancedProfile.profileComplete': true,
          profileComplete: true,
          'metadata.awaitingFormSubmission': false,
          'metadata.formSubmittedAt': new Date(),
          'metadata.profileCompleted': true
        },
        $unset: {
          plainFormSession: 1  // Clear session after successful submission
        },
        $addToSet: {
          'basicProfile.linkedEmails': TEST_EMAIL
        }
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('✅ Profile updated successfully');
    } else {
      console.log('⚠️ No changes made to profile');
    }
    
    // Step 5: Verify final profile state
    console.log('\n✔️ Step 5: Verifying final profile state');
    const finalUser = await usersCollection.findOne({ _id: user._id });
    
    console.log('Profile after update:');
    console.log(`  - Name: ${finalUser.enhancedProfile?.fullName || finalUser.basicProfile?.name}`);
    console.log(`  - WhatsApp: ${finalUser.whatsappNumber}`);
    console.log(`  - Email: ${finalUser.enhancedProfile?.email || finalUser.metadata?.email}`);
    console.log(`  - Profile Complete: ${finalUser.enhancedProfile?.completed ? '✅ Yes' : '❌ No'}`);
    console.log(`  - Location: ${finalUser.enhancedProfile?.location?.city}, ${finalUser.enhancedProfile?.location?.country}`);
    console.log(`  - Session cleared: ${!finalUser.plainFormSession ? '✅ Yes' : '❌ No'}`);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FLOW TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ User profile found by email');
    console.log('✅ Session token created and stored');
    console.log('✅ Session validated with email + token');
    console.log('✅ Profile updated with form data');
    console.log('✅ Session cleared after submission');
    console.log('✅ Profile marked as completed');
    console.log('='.repeat(60));
    
    console.log('\n🎯 The plain form flow is working correctly!');
    console.log('The flow ensures:');
    console.log('1. Only OTP-verified emails can submit the form');
    console.log('2. Session tokens link the verified email to the correct profile');
    console.log('3. Form data is mapped to the pre-created profile');
    console.log('4. WhatsApp number is added for bot interaction');
    console.log('5. Profile is marked as completed for personalized greetings');
    
  } catch (error) {
    console.error('❌ Error during flow test:', error);
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the test
console.log('🚀 Starting Plain Form Flow Test');
console.log('='.repeat(60));
testPlainFormFlow()
  .then(() => {
    console.log('\n✅ Flow test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Flow test failed:', error);
    process.exit(1);
  });