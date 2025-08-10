const express = require('express');
const router = express.Router();
const { generateAndSendOTP, verifyOTP } = require('../services/otpService');
const { isEmailAuthorized } = require('../config/authorizedEmails');

// Send OTP - SIMPLE
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email is authorized (only JY alumni)
    if (!isEmailAuthorized(normalizedEmail)) {
      console.log('Unauthorized email attempt:', normalizedEmail);
      return res.status(403).json({
        success: false,
        error: 'This email is not authorized. Only JY alumni can access this form.'
      });
    }

    // Send OTP
    const result = await generateAndSendOTP(normalizedEmail, {
      expiryMinutes: 10
    });

    if (result.success) {
      console.log('OTP sent to:', normalizedEmail);
      return res.json({
        success: true,
        message: `OTP sent to ${normalizedEmail}`,
        expiryMinutes: 10
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send OTP'
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send OTP'
    });
  }
});

// Verify OTP - SIMPLE
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify if email is authorized
    if (!isEmailAuthorized(normalizedEmail)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized email'
      });
    }

    // Verify OTP
    const result = await verifyOTP(normalizedEmail, otp);

    if (result.valid) {
      console.log('OTP verified for:', normalizedEmail);
      
      try {
        // Create a proper session in database
        const { getDatabase, isDbConnected } = require('../config/database');
        
        // Check if database is connected
        if (!isDbConnected()) {
          console.error('Database not connected, attempting to connect...');
          const { connectDatabase } = require('../config/database');
          await connectDatabase();
        }
        
        const db = getDatabase();
        const crypto = require('crypto');
        
        // Generate unique session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sessionData = {
          token: sessionToken,
          email: normalizedEmail,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000) // 1 hour
        };
        
        console.log('Creating session with token:', sessionToken.substring(0, 20) + '...');
        
        // Update or create user with session
        const updateResult = await db.collection('users').updateOne(
          {
            $or: [
              { 'basicProfile.email': normalizedEmail },
              { 'enhancedProfile.email': normalizedEmail },
              { 'metadata.email': normalizedEmail }
            ]
          },
          {
            $set: {
              plainFormSession: sessionData,
              'basicProfile.email': normalizedEmail,
              'metadata.sessionUpdatedAt': new Date()
            },
            $setOnInsert: {
              'metadata.createdAt': new Date(),
              'metadata.preCreated': true,
              'metadata.awaitingFormSubmission': true,
              'metadata.source': 'otp_verification'
            }
          },
          { upsert: true }
        );
        
        console.log('Session update result:', {
          matched: updateResult.matchedCount,
          modified: updateResult.modifiedCount,
          upserted: updateResult.upsertedCount
        });
        
        // Verify session was created
        const verifyUser = await db.collection('users').findOne({
          'basicProfile.email': normalizedEmail,
          'plainFormSession.token': sessionToken
        });
        
        if (verifyUser) {
          console.log('✅ Session verified in database for:', normalizedEmail);
        } else {
          console.error('⚠️ Session creation may have failed for:', normalizedEmail);
        }
        
        return res.json({
          success: true,
          message: 'Email verified successfully!',
          email: normalizedEmail,
          sessionToken: sessionToken // Return the actual token
        });
      } catch (dbError) {
        console.error('Database error during session creation:', dbError);
        // Still return success but with a warning
        return res.json({
          success: true,
          message: 'Email verified but session creation had issues. Please try again.',
          email: normalizedEmail,
          sessionToken: 'error',
          warning: 'Session creation failed - ' + dbError.message
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Invalid OTP',
        attemptsRemaining: result.attemptsRemaining
      });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify OTP'
    });
  }
});

module.exports = router;