const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const { isEmailAuthorized } = require('../config/authorizedEmails');

// Direct MongoDB connection
async function getDB() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://jy_bot_user:JY2025Bot@cluster0.1tbvvum.mongodb.net/jagriti_yatra_community?retryWrites=true&w=majority';
    const client = new MongoClient(uri);
    await client.connect();
    return client.db('jagriti_yatra_community');
  } catch (error) {
    console.error('DB Error:', error);
    return null;
  }
}

// SIMPLE SUBMIT - Just match email to profile and update
router.post('/submit-plain-form', async (req, res) => {
  console.log('\n===== PLAIN FORM SUBMISSION =====');
  
  try {
    const { 
      email,
      sessionToken, // We receive it but can ignore if causing issues
      name,
      gender,
      dateOfBirth,
      professionalRole,
      country,
      state,
      city,
      phoneNumber,
      additionalEmail,
      linkedInProfile,
      instagramProfile,
      industryDomain,
      yatraImpact,
      communityAsks,
      communityGives
    } = req.body;

    console.log('Email:', email);
    console.log('Name:', name);
    
    // 1. Check if email is authorized
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!isEmailAuthorized(normalizedEmail)) {
      console.log('❌ Unauthorized email:', normalizedEmail);
      return res.status(403).json({
        success: false,
        error: 'This email is not authorized. Only JY alumni can access this form.'
      });
    }
    
    console.log('✅ Email authorized');

    // 2. Connect to database
    const db = await getDB();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Database connection failed. Please try again.'
      });
    }

    // 3. Find user profile by email (we pre-created profiles for all authorized emails)
    const user = await db.collection('users').findOne({
      $or: [
        { 'metadata.email': normalizedEmail },
        { 'basicProfile.email': normalizedEmail },
        { 'enhancedProfile.email': normalizedEmail },
        { 'basicProfile.linkedEmails': normalizedEmail }
      ]
    });

    if (!user) {
      console.log('❌ No profile found for:', normalizedEmail);
      // This shouldn't happen as we pre-created all profiles
      return res.status(404).json({
        success: false,
        error: 'Profile not found. Please contact support.'
      });
    }

    console.log('✅ Found profile:', user._id);

    // 4. Clean phone number
    let cleanedPhone = phoneNumber ? phoneNumber.replace(/[^\d]/g, '') : '';
    if (cleanedPhone.length === 10) {
      cleanedPhone = '91' + cleanedPhone;
    }

    // 5. UPDATE PROFILE WITH ALL DATA
    const updateResult = await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          // WhatsApp number - IMPORTANT for bot
          whatsappNumber: cleanedPhone,
          
          // Basic profile
          'basicProfile.name': name,
          'basicProfile.email': normalizedEmail,
          'basicProfile.gender': gender,
          'basicProfile.dateOfBirth': dateOfBirth,
          'basicProfile.professionalRole': professionalRole,
          'basicProfile.location': `${city}, ${state}, ${country}`,
          
          // Enhanced profile - ALL DATA
          'enhancedProfile.fullName': name,
          'enhancedProfile.email': normalizedEmail,
          'enhancedProfile.gender': gender,
          'enhancedProfile.dateOfBirth': dateOfBirth,
          'enhancedProfile.professionalRole': professionalRole,
          'enhancedProfile.phoneNumber': cleanedPhone,
          'enhancedProfile.additionalEmail': additionalEmail,
          'enhancedProfile.location': {
            country: country,
            state: state,
            city: city
          },
          'enhancedProfile.linkedInProfile': linkedInProfile,
          'enhancedProfile.instagramProfile': instagramProfile,
          'enhancedProfile.industryDomain': industryDomain,
          'enhancedProfile.yatraImpact': Array.isArray(yatraImpact) ? yatraImpact : [yatraImpact].filter(Boolean),
          'enhancedProfile.communityAsks': Array.isArray(communityAsks) ? communityAsks : [communityAsks].filter(Boolean),
          'enhancedProfile.communityGives': Array.isArray(communityGives) ? communityGives : [communityGives].filter(Boolean),
          
          // MARK AS COMPLETED - This is what bot checks!
          'enhancedProfile.completed': true,
          'enhancedProfile.profileComplete': true,
          'enhancedProfile.formFilledVia': 'plain_form',
          'enhancedProfile.formFilledAt': new Date(),
          
          // Profile flags
          profileComplete: true,
          lastUpdated: new Date(),
          
          // Metadata
          'metadata.profileCompleted': true,
          'metadata.formSubmittedAt': new Date(),
          'metadata.awaitingFormSubmission': false
        },
        $addToSet: {
          'basicProfile.linkedEmails': normalizedEmail
        }
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log('✅ Profile updated successfully');
      console.log('   Name:', name);
      console.log('   WhatsApp:', cleanedPhone);
      console.log('   Profile marked as COMPLETED');
      
      return res.json({
        success: true,
        message: 'Profile updated successfully! You can now message the WhatsApp bot.',
        userId: user._id
      });
    } else {
      console.log('⚠️ No changes made to profile');
      return res.json({
        success: true,
        message: 'Profile already up to date',
        userId: user._id
      });
    }

  } catch (error) {
    console.error('❌ ERROR:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error. Please try again.'
    });
  }
});

module.exports = router;