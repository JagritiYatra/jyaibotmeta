const crypto = require('crypto');
const { getDatabase } = require('../config/database');
const { logSuccess, logError } = require('../middleware/logging');

// Generate unique token for profile form
async function generateProfileToken(whatsappNumber) {
  try {
    const db = getDatabase();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minute expiry
    
    // Update user with token
    const result = await db.collection('users').updateOne(
      {
        $or: [
          { whatsappNumber: { $regex: whatsappNumber.replace(/[^\d]/g, ''), $options: 'i' } },
          { whatsappNumbers: { $elemMatch: { $regex: whatsappNumber.replace(/[^\d]/g, ''), $options: 'i' } } },
        ],
      },
      {
        $set: {
          profileToken: {
            token,
            expiresAt,
            used: false,
            createdAt: new Date()
          }
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      logSuccess('profile_token_generated', { whatsappNumber, tokenLength: token.length });
      return token;
    }
    
    return null;
  } catch (error) {
    logError(error, { operation: 'generateProfileToken', whatsappNumber });
    return null;
  }
}

// Validate profile token
async function validateProfileToken(token) {
  try {
    const db = getDatabase();
    const user = await db.collection('users').findOne({
      'profileToken.token': token,
      'profileToken.expiresAt': { $gt: new Date() },
      'profileToken.used': false
    });
    
    return user;
  } catch (error) {
    logError(error, { operation: 'validateProfileToken' });
    return null;
  }
}

module.exports = {
  generateProfileToken,
  validateProfileToken
};