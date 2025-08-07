const express = require('express');
const router = express.Router();
const { generateAndSendOTP, verifyOTP } = require('../services/otpService');
const { isEmailAuthorized } = require('../config/authorizedEmails');
const { logError, logSuccess } = require('../middleware/logging');
const { getDatabase } = require('../config/database');

// Send OTP to authorized email
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

    // Check if email is authorized
    if (!isEmailAuthorized(normalizedEmail)) {
      logError(new Error('Unauthorized email attempt'), { email: normalizedEmail });
      return res.status(403).json({
        success: false,
        error: 'This email is not authorized to access the form. Please contact support.'
      });
    }

    // Generate and send OTP
    const result = await generateAndSendOTP(normalizedEmail, {
      expiryMinutes: 10,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    if (result.success) {
      logSuccess('plain_form_otp_sent', { email: normalizedEmail });
      return res.json({
        success: true,
        message: `OTP sent to ${normalizedEmail}`,
        expiryMinutes: result.expiryMinutes
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send OTP'
      });
    }
  } catch (error) {
    logError(error, { operation: 'send_otp_plain_form' });
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Verify OTP
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
      logSuccess('plain_form_otp_verified', { email: normalizedEmail });
      
      // Create a session token for this email
      const crypto = require('crypto');
      const sessionToken = crypto.randomBytes(32).toString('hex');
      
      // Store session token in the user's profile
      const db = getDatabase();
      if (db) {
        const sessionExpiry = new Date();
        sessionExpiry.setHours(sessionExpiry.getHours() + 2); // 2 hour expiry
        
        // Find and update the user profile with this email
        await db.collection('users').updateOne(
          {
            $or: [
              { 'metadata.email': normalizedEmail },
              { 'basicProfile.email': normalizedEmail },
              { 'enhancedProfile.email': normalizedEmail },
              { 'basicProfile.linkedEmails': normalizedEmail }
            ]
          },
          {
            $set: {
              'plainFormSession': {
                token: sessionToken,
                email: normalizedEmail,
                verified: true,
                createdAt: new Date(),
                expiresAt: sessionExpiry
              }
            }
          }
        );
        
        console.log(`Session token stored for email: ${normalizedEmail}`);
      }
      
      return res.json({
        success: true,
        message: 'OTP verified successfully',
        sessionToken,
        email: normalizedEmail
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
        attemptsRemaining: result.attemptsRemaining
      });
    }
  } catch (error) {
    logError(error, { operation: 'verify_otp_plain_form' });
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;