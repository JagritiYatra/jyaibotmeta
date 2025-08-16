// Meta WhatsApp webhook handler for JY Alumni Bot
// Handles incoming messages and status updates from Meta WhatsApp Cloud API

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandlers');
const { logUserActivity, logError } = require('../middleware/logging');
const { sanitizeInput } = require('../utils/validation');
const { detectUserIntent, validateIntentForUserState } = require('../services/intentDetection');
const UnifiedIntelligenceService = require('../services/unifiedIntelligenceService');
const { findUserByWhatsAppNumber } = require('../models/User');
const { loadUserSession, saveUserSession } = require('../services/sessionManager');
const { 
  sendMetaMessage, 
  verifyWebhook, 
  parseMetaWebhookMessage,
  markMessageAsRead
} = require('../services/metaWhatsAppService');
const { handleAuthenticatedUser } = require('../controllers/authenticatedUserControllerSimple');
const { handleNewUser } = require('../controllers/newUserController');
const { checkAdvancedRateLimit } = require('../services/rateLimiter');
const MongoMemoryService = require('../services/mongoMemoryService');
const { logUserQuery } = require('../services/analyticsService');

// Message deduplication cache (in-memory for performance)
const processedMessages = new Map();
const recentResponses = new Map(); // Track recent responses to prevent duplicate sends
const MAX_CACHE_SIZE = 1000;
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESPONSE_DUPLICATE_WINDOW = 10 * 1000; // 10 seconds

// Clean expired messages from cache
function cleanMessageCache() {
  const now = Date.now();
  
  // Clean processed messages
  for (const [messageId, timestamp] of processedMessages.entries()) {
    if (now - timestamp > CACHE_EXPIRY_MS) {
      processedMessages.delete(messageId);
    }
  }
  
  // Clean recent responses
  for (const [responseKey, timestamp] of recentResponses.entries()) {
    if (now - timestamp > RESPONSE_DUPLICATE_WINDOW) {
      recentResponses.delete(responseKey);
    }
  }
  
  // Limit cache size
  if (processedMessages.size > MAX_CACHE_SIZE) {
    const entries = Array.from(processedMessages.entries());
    const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    toDelete.forEach(([messageId]) => processedMessages.delete(messageId));
  }
}

// Check if message was already processed
function isMessageProcessed(messageId) {
  cleanMessageCache();
  return processedMessages.has(messageId);
}

// Mark message as processed
function markMessageProcessed(messageId) {
  processedMessages.set(messageId, Date.now());
}

// Check if similar response was recently sent
function isDuplicateResponse(whatsappNumber, responseMessage) {
  cleanMessageCache();
  const responseKey = `${whatsappNumber}:${responseMessage.substring(0, 100)}`; // First 100 chars as key
  return recentResponses.has(responseKey);
}

// Mark response as sent
function markResponseSent(whatsappNumber, responseMessage) {
  const responseKey = `${whatsappNumber}:${responseMessage.substring(0, 100)}`;
  recentResponses.set(responseKey, Date.now());
}

// Webhook verification endpoint (GET request from Meta)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const result = verifyWebhook(mode, token, challenge);
  
  if (result) {
    res.status(200).send(result);
  } else {
    res.sendStatus(403);
  }
});

// Main webhook endpoint for Meta WhatsApp messages (POST request)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    // Meta requires immediate 200 response
    res.sendStatus(200);

    // Debug log the raw webhook data
    console.log('📥 Raw webhook data:', JSON.stringify(req.body, null, 2));

    // Parse the webhook data
    const parsedData = parseMetaWebhookMessage(req.body);
    
    if (!parsedData) {
      console.log('⚠️ Unable to parse webhook data');
      return;
    }

    // Handle status updates
    if (parsedData.type === 'status') {
      const { messageId, status, recipientId } = parsedData;
      console.log(`📊 Message status update: ${messageId} - ${status} (${recipientId})`);
      
      // Log status update for analytics
      await logUserQuery(recipientId, '', 'message_status', 0, 0, {
        messageId,
        status,
        statusType: 'delivery_status',
      });
      
      return;
    }

    // Handle incoming messages
    if (parsedData.type !== 'message') {
      return;
    }

    const { 
      messageId, 
      from: whatsappNumber, 
      text: userMessage, 
      profileName: userName,
      messageType 
    } = parsedData;

    // Check for duplicate messages
    if (isMessageProcessed(messageId)) {
      console.log(`🔄 Duplicate message ignored: ${messageId} from ${whatsappNumber.slice(-4)}`);
      return;
    }

    // Mark this message as processed
    markMessageProcessed(messageId);

    // Mark message as read with typing indicator
    await markMessageAsRead(messageId, true);

    // Skip non-text messages for now
    if (messageType !== 'text' && messageType !== 'button' && messageType !== 'interactive') {
      console.log(`📎 Skipping ${messageType} message from ${whatsappNumber}`);
      await sendMetaMessage(
        whatsappNumber, 
        'I can only process text messages at this time. Please send your message as text.'
      );
      return;
    }

    // Sanitize and validate message
    const sanitizedMessage = sanitizeInput(userMessage);
    if (!sanitizedMessage || sanitizedMessage.length === 0) {
      console.log(`⚠️ Empty message received from ${whatsappNumber}`);
      return;
    }

    // Rate limiting check
    try {
      const rateLimitResult = await checkAdvancedRateLimit(whatsappNumber, 'message');
      if (!rateLimitResult.allowed) {
        const rateLimitMessage = generateRateLimitMessage(rateLimitResult);
        await sendMetaMessage(whatsappNumber, rateLimitMessage);
        return;
      }
    } catch (rateLimitError) {
      console.log('⚠️ Rate limiting check failed, allowing request:', rateLimitError.message);
    }

    // Log user activity
    logUserActivity(whatsappNumber, 'message_received', {
      messageLength: sanitizedMessage.length,
      profileName: userName,
      messageId,
      messageType,
    });

    console.log(
      `📱 Processing message from ${whatsappNumber.slice(-4)} (${userName}): ${
        sanitizedMessage.substring(0, 100)
      }${sanitizedMessage.length > 100 ? '...' : ''}`
    );

    try {
      // Load user session
      let userSession = await loadUserSession(whatsappNumber);
      if (!userSession) {
        console.log(`🆕 Creating new session for ${whatsappNumber.slice(-4)}`);
        userSession = createEmergencySession();
      }

      // Detect user intent using AI
      const aiIntent = await UnifiedIntelligenceService.analyzeMessage(sanitizedMessage, whatsappNumber);
      console.log(`🤖 AI intent detected: ${aiIntent.intent} (confidence: ${aiIntent.confidence})`);

      // Fallback to rule-based detection if AI fails
      const rawIntent =
        aiIntent.intent !== 'unknown'
          ? {
              type: aiIntent.intent,
              query: aiIntent.searchTerms || aiIntent.topic,
              confidence: aiIntent.confidence,
            }
          : detectUserIntent(sanitizedMessage, userSession);

      // Validate intent against current user state
      const intent = validateIntentForUserState(rawIntent, userSession);
      console.log(`✅ Final intent: ${intent.type}${intent.blocked ? ' (BLOCKED)' : ''}`);

      // Check if user exists in database
      const existingUser = await findUserByWhatsAppNumber(whatsappNumber);

      let responseMessage = '';

      if (existingUser) {
        // Handle existing authenticated user
        console.log(`👤 Existing user found: ${existingUser.basicProfile?.name || 'Unknown'}`);

        userSession.authenticated = true;
        userSession.user_data = existingUser;
        userSession.whatsappNumber = whatsappNumber;

        console.log(
          `🔍 Profile completion: ${existingUser.enhancedProfile?.completed ? 'COMPLETE' : 'INCOMPLETE'}`
        );

        // Check if profile was just completed (within last 30 seconds)
        const profileJustCompleted = existingUser.metadata?.profileCompletedAt &&
          (Date.now() - new Date(existingUser.metadata.profileCompletedAt).getTime()) < 30000;
        
        if (profileJustCompleted && (sanitizedMessage.toLowerCase().includes('profile') || 
                                    sanitizedMessage.toLowerCase().includes('completed') ||
                                    sanitizedMessage.toLowerCase().includes('successfully'))) {
          console.log(`🔄 Ignoring profile completion echo message from ${whatsappNumber.slice(-4)}`);
          return; // Skip processing this message
        }

        responseMessage = await handleAuthenticatedUser(
          sanitizedMessage,
          intent,
          userSession,
          whatsappNumber
        );
      } else {
        // Handle new user registration flow
        console.log(`🆕 New user detected: ${whatsappNumber.slice(-4)}`);
        responseMessage = await handleNewUser(sanitizedMessage, intent, userSession, whatsappNumber);
      }

      // Check if response is null (webview button was sent)
      if (responseMessage === null) {
        console.log(`📱 WebView button sent for ${whatsappNumber.slice(-4)}, no text response needed`);
        // Save session and return early
        await saveUserSession(whatsappNumber, userSession);
        return;
      }

      // Validate response
      if (!responseMessage || responseMessage.trim().length === 0) {
        console.log(`⚠️ Empty response generated for ${whatsappNumber.slice(-4)}`);
        responseMessage = generateFallbackResponse(userSession);
      }

      // Save updated session
      const sessionSaved = await saveUserSession(whatsappNumber, userSession);
      if (!sessionSaved) {
        console.log(`⚠️ Failed to save session for ${whatsappNumber.slice(-4)}`);
      }

      // Send response via Meta WhatsApp
      if (responseMessage) {
        // Check for duplicate response
        if (isDuplicateResponse(whatsappNumber, responseMessage)) {
          console.log(`🔄 Duplicate response prevented for ${whatsappNumber.slice(-4)}: ${responseMessage.substring(0, 50)}...`);
          return;
        }

        // Mark response as being sent
        markResponseSent(whatsappNumber, responseMessage);

        const messageSent = await sendMetaMessage(whatsappNumber, responseMessage, {
          maxRetries: 3,
          retryDelay: 1000,
        });

        if (messageSent && messageSent.success) {
          console.log(`✅ Response sent successfully to ${whatsappNumber.slice(-4)}`);

          // Track conversation in MongoDB memory
          await MongoMemoryService.addConversation(whatsappNumber, sanitizedMessage, responseMessage, {
            intent: intent.type,
            topic: intent.query || intent.type,
            searchQuery: intent.query,
            isFollowUp:
              intent.type === 'follow_up' ||
              (await MongoMemoryService.isFollowUp(whatsappNumber, sanitizedMessage)),
          });

          // Initialize memory session if needed
          await MongoMemoryService.initializeSession(whatsappNumber);

          logUserActivity(whatsappNumber, 'response_sent', {
            responseLength: responseMessage.length,
            intent: intent.type,
            messageId: messageSent.messageId || 'unknown',
          });
        } else {
          console.log(
            `❌ Failed to send response to ${whatsappNumber.slice(-4)}: ${
              messageSent?.error || 'Unknown error'
            }`
          );
          logUserActivity(whatsappNumber, 'response_failed', {
            intent: intent.type,
            error: messageSent?.error || 'Unknown error',
            attempts: messageSent?.attempts || 1,
          });
        }
      }
    } catch (error) {
      console.error('❌ Webhook processing error:', error);

      // Enhanced error logging
      logError(error, {
        operation: 'webhook_processing',
        whatsappNumber: whatsappNumber.slice(-4),
        userMessage: sanitizedMessage.substring(0, 100),
        messageId,
        userName,
        timestamp: new Date().toISOString(),
      });

      // Send error message to user
      try {
        const errorMessage = generateErrorResponse(error, sanitizedMessage);
        await sendMetaMessage(whatsappNumber, errorMessage, { maxRetries: 1 });
      } catch (sendError) {
        console.error('❌ Failed to send error message:', sendError);
      }

      logUserActivity(whatsappNumber, 'processing_error', {
        error: error.message,
        intent: 'unknown',
        userMessage: sanitizedMessage.substring(0, 50),
      });
    }
  })
);

// Status endpoint
router.get('/status', (req, res) => {
  const response = {
    status: 'webhook_active',
    service: 'JY Alumni Network Bot - Meta WhatsApp',
    version: 'v1.0.0-meta',
    platform: 'Meta WhatsApp Cloud API',
    capabilities: [
      'Text message processing',
      'Button responses',
      'Interactive messages',
      'Message read receipts',
      'Delivery status tracking',
    ],
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  res.json(response);
});

// Helper functions (reuse from original webhook.js)
function generateRateLimitMessage(rateLimitResult) {
  switch (rateLimitResult.reason) {
    case 'daily_limit_exceeded':
      return `🚫 **Daily Limit Reached**

You've used all 30 searches today. Limit resets at midnight.

Meanwhile, you can:
• Update your profile
• Ask general questions
• Come back tomorrow for more searches

Need help? Contact support@jagritiyatra.com`;

    case 'user_cooldown':
      const minutes = rateLimitResult.remainingMinutes;
      return `⏸️ **Account Temporarily Restricted**

Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.

This helps maintain fair access for all alumni.`;

    case 'suspicious_activity':
      return `🔒 **Unusual Activity Detected**

Your account has been temporarily restricted for security.

Wait ${rateLimitResult.cooldownMinutes} minutes and try again.

Contact support if this continues: support@jagritiyatra.com`;

    default:
      return `⚠️ **Request Temporarily Blocked**

Please try again in a few minutes.

Contact support if issues persist: support@jagritiyatra.com`;
  }
}

function generateErrorResponse(error, userMessage) {
  if (error.message.includes('database') || error.message.includes('MongoDB')) {
    return `⚠️ **Temporary Database Issue**

I'm having trouble accessing user data right now.

Please try again in a moment.`;
  }

  if (error.message.includes('OpenAI') || error.message.includes('AI')) {
    return `⚠️ **AI Service Temporarily Unavailable**

I'm using fallback processing for your request.

Please try again or rephrase your message.`;
  }

  return `⚠️ **Technical Issue**

I'm experiencing a temporary problem.

Please try again or contact support: support@jagritiyatra.com`;
}

function createEmergencySession() {
  return {
    conversation_start: new Date().toISOString(),
    waiting_for: null,
    authenticated: false,
    ready: false,
    profile_asked: false,
    profile_skipped: false,
    profile_completed: false,
    totalInteractions: 0,
    version: 'v1.0-meta-emergency',
    emergency_session: true,
    created_at: new Date().toISOString(),
  };
}

function generateFallbackResponse(userSession) {
  if (userSession.authenticated) {
    const userName = userSession.user_data?.basicProfile?.name || 'there';
    return `Hi ${userName}! 👋

I'm here to help you connect with our alumni network.

What can I help you with today?`;
  }
  return `Hi there! 👋

Welcome to JY Alumni Network. I help connect you with 500+ changemakers and entrepreneurs.

To get started, please share your registered email address.`;
}

module.exports = router;