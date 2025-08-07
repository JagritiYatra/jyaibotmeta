const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');
const { isEmailAuthorized } = require('../config/authorizedEmails');

// Simple logging functions that don't depend on environment config
const logError = (error, context = {}) => {
  console.error('Error:', error.message, context);
};

const logSuccess = (operation, details = {}) => {
  console.log('Success:', operation, details);
};

// Submit plain form data
router.post('/submit-plain-form', async (req, res) => {
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

    // Validate required fields
    if (!email || !sessionToken) {
      return res.status(400).json({
        success: false,
        error: 'Email and session token are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify email is authorized
    if (!isEmailAuthorized(normalizedEmail)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized email'
      });
    }

    // TODO: Verify session token (for now, we'll skip this)

    const db = getDatabase();
    
    if (!db) {
      console.error('Database not connected');
      return res.status(503).json({
        success: false,
        error: 'Database connection error. Please try again.'
      });
    }
    
    // Clean phone number - remove all non-digit characters
    let cleanedPhone = phoneNumber ? phoneNumber.replace(/[^\d]/g, '') : '';
    
    // If number doesn't have country code and is 10 digits (Indian number), add 91
    if (cleanedPhone.length === 10) {
      cleanedPhone = '91' + cleanedPhone;
    }
    
    // Ensure the phone number starts with a valid country code
    // If user entered +91 or 91 already, it should be preserved
    console.log(`Processing phone number: ${phoneNumber} -> ${cleanedPhone}`);
    
    // First, try to find user by email (since we pre-created profiles with emails)
    let existingUser = await db.collection('users').findOne({ 
      $or: [
        { 'enhancedProfile.email': normalizedEmail },
        { 'metadata.email': normalizedEmail },
        { 'basicProfile.email': normalizedEmail },
        { 'basicProfile.linkedEmails': normalizedEmail }
      ]
    });
    
    // If not found by email, check by phone number
    if (!existingUser) {
      existingUser = await db.collection('users').findOne({
        $or: [
          { whatsappNumber: cleanedPhone },
          { whatsappNumber: { $regex: cleanedPhone, $options: 'i' } },
          { 'enhancedProfile.phoneNumber': cleanedPhone }
        ]
      });
    }
    
    if (existingUser) {
      console.log(`Found existing user: ${existingUser._id} with email: ${existingUser.metadata?.email || existingUser.basicProfile?.email} and whatsappNumber: ${existingUser.whatsappNumber}`);
    } else {
      console.log(`No existing user found for email: ${normalizedEmail} or phone: ${cleanedPhone}`);
    }

    const profileData = {
      fullName: name,
      gender,
      dateOfBirth,
      professionalRole,
      location: {
        country,
        state,
        city
      },
      phoneNumber: cleanedPhone,
      email: normalizedEmail,
      additionalEmail,
      linkedInProfile,
      instagramProfile,
      industryDomain,
      yatraImpact: Array.isArray(yatraImpact) ? yatraImpact : [yatraImpact].filter(Boolean),
      communityAsks: Array.isArray(communityAsks) ? communityAsks : [communityAsks].filter(Boolean),
      communityGives: Array.isArray(communityGives) ? communityGives : [communityGives].filter(Boolean),
      formFilledVia: 'plain_link',
      formFilledAt: new Date(),
      profileComplete: true,
      completed: true // This is the flag the bot checks
    };

    if (existingUser) {
      // Update existing user - also update WhatsApp number if it changed
      const updateData = {
        enhancedProfile: profileData,
        'basicProfile.name': name,
        'basicProfile.dateOfBirth': dateOfBirth,
        'basicProfile.gender': gender,
        'basicProfile.professionalRole': professionalRole,
        'basicProfile.location': `${city}, ${state}, ${country}`,
        'basicProfile.email': normalizedEmail,
        profileComplete: true,
        lastUpdated: new Date(),
        // Clear pre-creation flags
        'metadata.awaitingFormSubmission': false,
        'metadata.formSubmittedAt': new Date(),
        'metadata.profileCompleted': true
      };
      
      // Always update WhatsApp number from the form
      updateData.whatsappNumber = cleanedPhone;
      if (!existingUser.whatsappNumber || existingUser.whatsappNumber !== cleanedPhone) {
        console.log(`Setting/Updating WhatsApp number from ${existingUser.whatsappNumber || 'none'} to ${cleanedPhone}`);
      }
      
      // Ensure email is in linkedEmails
      updateData.$addToSet = {
        'basicProfile.linkedEmails': normalizedEmail
      };
      
      await db.collection('users').updateOne(
        { _id: existingUser._id },
        { 
          $set: updateData,
          $addToSet: { 'basicProfile.linkedEmails': normalizedEmail }
        }
      );

      logSuccess('plain_form_profile_updated', { 
        userId: existingUser._id,
        email: normalizedEmail,
        whatsappNumber: cleanedPhone,
        wasPreCreated: existingUser.metadata?.preCreated || false
      });

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        userId: existingUser._id,
        isNewUser: false
      });
    } else {
      // Create new user
      const newUser = {
        whatsappNumber: cleanedPhone,
        createdAt: new Date(),
        lastActive: new Date(),
        basicProfile: {
          name,
          dateOfBirth,
          gender,
          professionalRole,
          location: `${city}, ${state}, ${country}`
        },
        enhancedProfile: profileData,
        profileComplete: true,
        conversationHistory: [],
        preferences: {
          language: 'en',
          notificationsEnabled: true
        },
        metadata: {
          source: 'plain_form',
          registeredVia: 'email_form',
          email: normalizedEmail
        }
      };

      const result = await db.collection('users').insertOne(newUser);

      logSuccess('plain_form_new_user_created', { 
        userId: result.insertedId,
        email: normalizedEmail,
        whatsappNumber: cleanedPhone
      });

      return res.json({
        success: true,
        message: 'Profile created successfully',
        userId: result.insertedId,
        isNewUser: true
      });
    }
  } catch (error) {
    logError(error, { operation: 'submit_plain_form' });
    return res.status(500).json({
      success: false,
      error: 'Failed to submit form'
    });
  }
});

// Check if email is authorized
router.post('/check-email-authorization', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isAuthorized = isEmailAuthorized(normalizedEmail);

    return res.json({
      success: true,
      authorized: isAuthorized
    });
  } catch (error) {
    logError(error, { operation: 'check_email_authorization' });
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;