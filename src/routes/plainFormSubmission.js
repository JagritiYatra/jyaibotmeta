const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');
const { isEmailAuthorized } = require('../config/authorizedEmails');
const { logError, logSuccess } = require('../middleware/logging');

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
    
    // Clean phone number - remove spaces and special chars, keep only digits
    let cleanedPhone = phoneNumber.replace(/[\s\-\(\)\.]/g, '');
    if (!cleanedPhone.startsWith('91') && cleanedPhone.length === 10) {
      cleanedPhone = '91' + cleanedPhone;
    }
    
    // Check if user exists with this email
    let existingUser = await db.collection('users').findOne({ 
      'enhancedProfile.email': normalizedEmail 
    });

    if (!existingUser) {
      // Check if user exists with this phone number
      existingUser = await db.collection('users').findOne({ 
        whatsappNumber: cleanedPhone 
      });
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
      profileComplete: true
    };

    if (existingUser) {
      // Update existing user
      await db.collection('users').updateOne(
        { _id: existingUser._id },
        {
          $set: {
            enhancedProfile: profileData,
            'basicProfile.name': name,
            'basicProfile.dateOfBirth': dateOfBirth,
            'basicProfile.gender': gender,
            'basicProfile.professionalRole': professionalRole,
            'basicProfile.location': `${city}, ${state}, ${country}`,
            profileComplete: true,
            lastUpdated: new Date()
          }
        }
      );

      logSuccess('plain_form_profile_updated', { 
        userId: existingUser._id,
        email: normalizedEmail,
        whatsappNumber: existingUser.whatsappNumber
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