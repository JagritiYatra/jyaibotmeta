const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const { isEmailAuthorized } = require('../config/authorizedEmails');

// Get MongoDB connection
async function getDB() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    return client.db('jagriti_yatra_community');
  } catch (error) {
    console.error('DB Connection Error:', error);
    return null;
  }
}

// Simple submit endpoint - matches form data to profile by email
router.post('/submit-plain-form', async (req, res) => {
  console.log('===== PLAIN FORM SUBMISSION =====');
  console.log('Email:', req.body.email);
  console.log('Name:', req.body.name);
  console.log('Phone:', req.body.phoneNumber);
  
  try {
    const { 
      email, 
      sessionToken,
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

    // Step 1: Validate email
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!isEmailAuthorized(normalizedEmail)) {
      console.log('Unauthorized email:', normalizedEmail);
      return res.status(403).json({
        success: false,
        error: 'Unauthorized email'
      });
    }

    // Step 2: Get database
    const db = await getDB();
    if (!db) {
      console.error('Database connection failed');
      return res.status(503).json({
        success: false,
        error: 'Database connection error'
      });
    }

    // Step 3: Find user by email AND valid session
    console.log('Finding user with email:', normalizedEmail);
    console.log('Session token:', sessionToken ? 'provided' : 'missing');
    
    const user = await db.collection('users').findOne({
      $or: [
        { 'metadata.email': normalizedEmail },
        { 'basicProfile.email': normalizedEmail },
        { 'enhancedProfile.email': normalizedEmail }
      ],
      'plainFormSession.token': sessionToken,
      'plainFormSession.email': normalizedEmail
    });

    if (!user) {
      console.log('No user found with valid session');
      
      // Check if user exists without session
      const userExists = await db.collection('users').findOne({
        $or: [
          { 'metadata.email': normalizedEmail },
          { 'basicProfile.email': normalizedEmail },
          { 'enhancedProfile.email': normalizedEmail }
        ]
      });
      
      if (userExists) {
        console.log('User exists but session invalid');
        return res.status(401).json({
          success: false,
          error: 'Session expired. Please verify email again.'
        });
      } else {
        console.log('No user profile found for email');
        return res.status(404).json({
          success: false,
          error: 'No profile found for this email'
        });
      }
    }

    console.log('User found:', user._id);

    // Step 4: Clean phone number
    let cleanedPhone = phoneNumber ? phoneNumber.replace(/[^\d]/g, '') : '';
    if (cleanedPhone.length === 10) {
      cleanedPhone = '91' + cleanedPhone;
    }

    // Step 5: Update profile with ALL data
    console.log('Updating profile...');
    
    const updateData = {
      // WhatsApp number for bot
      whatsappNumber: cleanedPhone,
      
      // Basic profile
      'basicProfile.name': name,
      'basicProfile.email': normalizedEmail,
      'basicProfile.gender': gender,
      'basicProfile.dateOfBirth': dateOfBirth,
      'basicProfile.professionalRole': professionalRole,
      'basicProfile.location': `${city}, ${state}, ${country}`,
      
      // Enhanced profile - COMPLETE DATA
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
      'enhancedProfile.formFilledVia': 'plain_link',
      'enhancedProfile.formFilledAt': new Date(),
      'enhancedProfile.completed': true,  // THIS IS WHAT BOT CHECKS
      'enhancedProfile.profileComplete': true,
      
      // Profile flags
      profileComplete: true,
      lastUpdated: new Date(),
      
      // Metadata
      'metadata.profileCompleted': true,
      'metadata.formSubmittedAt': new Date()
    };

    // Update and clear session in ONE operation
    const result = await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: updateData,
        $unset: { plainFormSession: 1 }  // Clear session
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Profile updated successfully');
      console.log('WhatsApp number set to:', cleanedPhone);
      console.log('Profile marked as completed');
      
      return res.json({
        success: true,
        message: 'Profile updated successfully',
        userId: user._id
      });
    } else {
      console.error('Failed to update profile');
      return res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }

  } catch (error) {
    console.error('ERROR:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
});

module.exports = router;