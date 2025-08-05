// Meta WhatsApp Cloud API service for JY Alumni Bot
// Handles message sending, webhook verification, and delivery with Meta's API

const axios = require('axios');
const { getConfig } = require('../config/environment');
const { logError, logSuccess } = require('../middleware/logging');

const META_API_VERSION = 'v21.0';
const META_API_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Send message via Meta WhatsApp API
async function sendMetaMessage(whatsappNumber, messageText, options = {}) {
  const config = getConfig();
  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 2000;

  // Clean phone number (remove whatsapp: prefix and any non-digits)
  let cleanNumber = whatsappNumber.replace(/[^\d]/g, '');
  
  // If number is too short, it's likely just the last digits - prepend country code
  if (cleanNumber.length < 10) {
    // Assuming Indian number, prepend 91
    cleanNumber = '91' + cleanNumber.padStart(10, '0');
  }
  
  const sanitizedNumber = cleanNumber.slice(-4);

  // Validate message length for WhatsApp
  if (messageText.length > 4096) {
    console.warn(`⚠️ Message too long (${messageText.length} chars), truncating...`);
    messageText = `${messageText.substring(0, 4000)}\n\n...Message truncated due to length limit.`;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 Sending message to ***${sanitizedNumber} (Attempt ${attempt}/${maxRetries})`);

      const response = await axios.post(
        `${META_API_URL}/${config.meta.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanNumber,
          type: 'text',
          text: {
            preview_url: false,
            body: messageText,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${config.meta.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logSuccess('meta_message_sent', {
        messageId: response.data.messages[0].id,
        to: sanitizedNumber,
        messageLength: messageText.length,
        attempt,
      });

      console.log(`✅ Message sent successfully: ${response.data.messages[0].id}`);
      return {
        success: true,
        messageId: response.data.messages[0].id,
        attempt,
      };
    } catch (error) {
      const errorInfo = handleMetaError(error, sanitizedNumber);
      
      console.error(
        `❌ Meta attempt ${attempt} failed for ***${sanitizedNumber}:`,
        errorInfo.message
      );

      // Check if error is retryable
      const isRetryable = isRetryableMetaError(error);

      if (attempt === maxRetries || !isRetryable) {
        logError(error, {
          operation: 'meta_send_final_failure',
          whatsappNumber: sanitizedNumber,
          attempts: attempt,
          isRetryable,
        });

        return {
          success: false,
          error: errorInfo.message,
          errorCode: errorInfo.code,
          attempts: attempt,
          isRetryable,
        };
      }

      // Wait before retry with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt - 1);
      console.log(`🔄 Waiting ${delay}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: 'All retry attempts failed',
    attempts: maxRetries,
  };
}

// Handle Meta API errors
function handleMetaError(error, phoneNumber) {
  if (error.response?.data?.error) {
    const metaError = error.response.data.error;
    
    // Common Meta error codes
    const errorMessages = {
      100: 'Invalid parameter - check phone number format',
      190: 'Invalid OAuth access token',
      200: 'Permission error - check app permissions',
      368: 'Message failed to send - user may have blocked the number',
      130497: 'Rate limit exceeded',
      131000: 'Something went wrong with the message',
      131026: 'Message undeliverable - recipient not on WhatsApp',
      131047: 'Re-engagement message - more than 24 hours have passed',
      131051: 'Message type unknown',
      131052: 'Media download error',
    };

    const message = errorMessages[metaError.code] || metaError.message || 'Unknown Meta API error';
    
    return {
      code: metaError.code,
      message: message,
      type: metaError.type || 'GraphMethodException',
      details: metaError,
    };
  }

  // Network or other errors
  return {
    code: error.code || 'UNKNOWN',
    message: error.message || 'Failed to send message',
    type: 'NetworkError',
  };
}

// Check if Meta error is retryable
function isRetryableMetaError(error) {
  const retryableCodes = [
    130497, // Rate limit
    131000, // Something went wrong
    131052, // Media download error
  ];

  const nonRetryableCodes = [
    100,    // Invalid parameter
    190,    // Invalid token
    200,    // Permission error
    131026, // Not on WhatsApp
    131047, // 24 hour window passed
  ];

  const errorCode = error.response?.data?.error?.code;

  if (nonRetryableCodes.includes(errorCode)) {
    return false;
  }

  return (
    retryableCodes.includes(errorCode) ||
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENOTFOUND' ||
    error.message?.includes('timeout') ||
    error.message?.includes('network')
  );
}

// Send bulk messages with rate limiting
async function sendBulkMessages(recipients, messageText, options = {}) {
  const results = [];
  const rateLimit = options.rateLimit || 1000; // ms between messages
  const batchSize = options.batchSize || 5;

  console.log(`📨 Starting bulk message send to ${recipients.length} recipients`);

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const batchPromises = batch.map(async (recipient, index) => {
      // Add delay to respect rate limits
      if (index > 0) {
        await new Promise((resolve) => setTimeout(resolve, rateLimit));
      }

      const result = await sendMetaMessage(recipient, messageText, options);
      return { recipient, ...result };
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    console.log(
      `📊 Batch ${Math.floor(i / batchSize) + 1} completed: ${
        batchResults.filter((r) => r.success).length
      }/${batchResults.length} successful`
    );
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.length - successful;

  logSuccess('bulk_message_completed', {
    total: recipients.length,
    successful,
    failed,
    successRate: Math.round((successful / recipients.length) * 100),
  });

  return {
    total: recipients.length,
    successful,
    failed,
    results,
    successRate: Math.round((successful / recipients.length) * 100),
  };
}

// Verify webhook callback from Meta
function verifyWebhook(mode, token, challenge) {
  const config = getConfig();
  
  if (mode === 'subscribe' && token === config.meta.webhookVerifyToken) {
    console.log('✅ Webhook verified successfully');
    return challenge;
  }
  
  console.error('❌ Webhook verification failed');
  return null;
}

// Parse incoming Meta webhook message
function parseMetaWebhookMessage(body) {
  try {
    // Meta sends messages in a specific structure
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    if (!value || changes?.field !== 'messages') {
      return null;
    }

    // Extract message data
    const message = value.messages?.[0];
    const contact = value.contacts?.[0];
    
    if (!message) {
      // Could be a status update
      const status = value.statuses?.[0];
      if (status) {
        return {
          type: 'status',
          messageId: status.id,
          status: status.status,
          timestamp: status.timestamp,
          recipientId: status.recipient_id,
        };
      }
      return null;
    }

    // Parse different message types
    let messageText = '';
    let messageType = message.type;

    switch (messageType) {
      case 'text':
        messageText = message.text.body;
        break;
      case 'button':
        messageText = message.button.text;
        break;
      case 'interactive':
        if (message.interactive.type === 'button_reply') {
          messageText = message.interactive.button_reply.title;
        } else if (message.interactive.type === 'list_reply') {
          messageText = message.interactive.list_reply.title;
        }
        break;
      default:
        console.log(`📎 Received ${messageType} message type`);
        messageText = `[${messageType} message received]`;
    }

    // Use the full phone number from contact.wa_id, not message.from
    const fullPhoneNumber = contact?.wa_id || message.from;

    return {
      type: 'message',
      messageId: message.id,
      from: fullPhoneNumber,  // Use full number here
      timestamp: message.timestamp,
      messageType,
      text: messageText,
      profileName: contact?.profile?.name || 'User',
    };
  } catch (error) {
    logError(error, { operation: 'parse_meta_webhook', body });
    return null;
  }
}


// Mark message as read with optional typing indicator
async function markMessageAsRead(messageId, showTyping = false) {
  const config = getConfig();

  try {
    const payload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    };

    // Add typing indicator if requested
    if (showTyping) {
      payload.typing_indicator = {
        type: 'text'
      };
    }

    await axios.post(
      `${META_API_URL}/${config.meta.phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${config.meta.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✓ Message marked as read${showTyping ? ' with typing indicator' : ''}: ${messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to mark message as read:', error.message);
    return false;
  }
}

// Test Meta WhatsApp connection
async function testMetaConnection() {
  const config = getConfig();

  try {
    const response = await axios.get(
      `${META_API_URL}/${config.meta.phoneNumberId}`,
      {
        headers: {
          Authorization: `Bearer ${config.meta.accessToken}`,
        },
      }
    );

    return {
      success: true,
      phoneNumber: response.data.display_phone_number,
      verifiedName: response.data.verified_name,
      qualityRating: response.data.quality_rating,
      platformType: response.data.platform_type,
      status: 'connected',
      message: 'Meta WhatsApp API connection successful',
    };
  } catch (error) {
    const errorInfo = handleMetaError(error);
    logError(error, { operation: 'meta_connection_test' });
    
    return {
      success: false,
      error: errorInfo.message,
      code: errorInfo.code,
    };
  }
}

// Get message template status (if using templates)
async function getMessageTemplates() {
  const config = getConfig();

  try {
    const response = await axios.get(
      `${META_API_URL}/${config.meta.wabaId}/message_templates`,
      {
        headers: {
          Authorization: `Bearer ${config.meta.accessToken}`,
        },
      }
    );

    return {
      success: true,
      templates: response.data.data,
      count: response.data.data.length,
    };
  } catch (error) {
    const errorInfo = handleMetaError(error);
    return {
      success: false,
      error: errorInfo.message,
    };
  }
}

// Validate WhatsApp number format for Meta
function validateWhatsAppNumber(phoneNumber) {
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/[^\d]/g, '');

  // Check length (should be 10-15 digits)
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return {
      valid: false,
      error: 'Phone number must be 10-15 digits long',
    };
  }

  // For Meta, we don't need the 'whatsapp:' prefix
  return {
    valid: true,
    formatted: digitsOnly,
    digits: digitsOnly,
  };
}

module.exports = {
  sendMetaMessage,
  sendBulkMessages,
  verifyWebhook,
  parseMetaWebhookMessage,
  markMessageAsRead,
  testMetaConnection,
  getMessageTemplates,
  validateWhatsAppNumber,
  // Aliases for compatibility
  sendTwilioMessage: sendMetaMessage, // Keep same function name for easier migration
};