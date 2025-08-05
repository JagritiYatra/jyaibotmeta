# Migration Guide: Twilio to Meta WhatsApp Cloud API

## What's Changed

### 1. New Service File
- Created `src/services/metaWhatsAppService.js` to replace `twilioService.js`
- Compatible function names for easy migration (e.g., `sendTwilioMessage` is aliased)

### 2. New Webhook Handler
- Created `src/routes/webhookMeta.js` to handle Meta webhook format
- Supports webhook verification (GET) and message processing (POST)

### 3. Updated Configuration
- Modified `src/config/environment.js` to use Meta credentials
- Updated `server.js` to use Meta webhook routes

### 4. New Environment Variables
Replace your Twilio variables with these Meta variables in `.env`:

```env
# Remove these Twilio variables:
# TWILIO_ACCOUNT_SID=...
# TWILIO_AUTH_TOKEN=...
# TWILIO_PHONE_NUMBER=...

# Add these Meta variables:
META_APP_ID=1442291730308691
META_APP_SECRET=8c9025fe235ee997f1143c390add0af3
META_PERMANENT_TOKEN=EAAUfwbYZCXlMBPHt63SLMhtMZAfgQBSCnVjDlQlQZBQXKwcBH1gyDmEJLcJh8AjcyKSi4GGjpls5HVJZCpeOcSLNOVm4LRtAXtAQP8ftqwU4erJnWI8WaGmNeguLmgdjn5ReXZBvSKBjJ7D10pV1sFNDCRtNvcdUBVS3tW0o4cEMQtsli5HZAiYbXvbk8i8QZDZD
PHONE_NUMBER_ID=726778371782788
WABA_ID=1466453624509622
WHATSAPP_PHONE_NUMBER=+918522068158
WEBHOOK_VERIFY_TOKEN=JY_ALUMNI_BOT_2024  # Create your own random string
```

## Setup Steps

### 1. Update Your .env File
Copy the Meta variables above into your `.env` file, replacing the Twilio ones.

### 2. Configure Meta Webhook
In your Meta App Dashboard:
1. Go to WhatsApp > Configuration
2. Set Webhook URL: `https://your-domain.com/webhook`
3. Set Verify Token: `JY_ALUMNI_BOT_2024` (or your chosen token)
4. Subscribe to these webhook fields:
   - messages
   - messaging_postbacks
   - message_deliveries
   - message_reads

### 3. Test the Connection
Run this to test your Meta connection:
```bash
node -e "require('./src/services/metaWhatsAppService').testMetaConnection().then(console.log)"
```

### 4. Deploy and Test
1. Deploy your updated code
2. Meta will verify your webhook automatically
3. Send a test message to your WhatsApp number

## Key Differences from Twilio

1. **Message Format**: Meta uses JSON structure instead of Twilio's parameters
2. **Phone Numbers**: No "whatsapp:" prefix needed for Meta
3. **Webhook Format**: Different JSON structure for incoming messages
4. **Status Updates**: Different status names (e.g., "read" instead of "read_receipt")
5. **Rate Limits**: Meta has different rate limiting rules

## Rollback Plan

If you need to switch back to Twilio:
1. Restore original `server.js` webhook route
2. Switch back to Twilio environment variables
3. The code still has `twilioService.js` available

## Testing Checklist

- [ ] Webhook verification works (GET request)
- [ ] Incoming messages are received
- [ ] Outgoing messages are sent
- [ ] Message status updates work
- [ ] Rate limiting still functions
- [ ] User sessions persist
- [ ] All existing features work

## Support

If you encounter issues:
1. Check Meta's error codes in the response
2. Verify your access token is valid
3. Ensure webhook URL is publicly accessible
4. Check that all webhook fields are subscribed