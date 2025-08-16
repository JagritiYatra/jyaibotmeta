// Profile form controller with WebView support
const crypto = require('crypto');
const { logError, logSuccess } = require('../middleware/logging');
const { sendWebViewButton } = require('../services/metaWhatsAppService');

// Generate simple profile form link
function generateProfileFormLink(whatsappNumber) {
  try {
    // Generate a simple token based on timestamp and random bytes
    const token = crypto.randomBytes(16).toString('hex') + Date.now();
    const baseUrl = process.env.PROFILE_FORM_URL || 'https://jyaibot-profile-form.vercel.app';
    const formUrl = `${baseUrl}/profile-setup?token=${token}&wa=${encodeURIComponent(whatsappNumber)}`;
    
    logSuccess('profile_form_link_generated', { whatsappNumber, token });
    
    return {
      token,
      url: formUrl,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };
  } catch (error) {
    logError(error, { operation: 'generateProfileFormLink', whatsappNumber });
    return null;
  }
}

// Send WebView button for profile completion
async function sendProfileFormWebView(whatsappNumber, user, incompleteFields) {
  try {
    const linkData = generateProfileFormLink(whatsappNumber);
    
    if (!linkData) {
      return { 
        success: false, 
        message: `Hello! There was an error generating your profile form. Please try again.` 
      };
    }
    
    const firstName = user?.enhancedProfile?.fullName?.split(' ')[0] || 
                     user?.basicProfile?.name?.split(' ')[0] || 
                     'there';
    
    const title = '📋 Complete Your Profile';
    const body = `Hello ${firstName}! 👋

To access our alumni network and search features, please complete your profile using the form below.

✨ Quick form with:
• Personal & professional details
• Location dropdowns  
• Contact information
• Community preferences

Once completed, you'll have full access to connect with 9000+ alumni!`;

    const result = await sendWebViewButton(
      whatsappNumber,
      title,
      body,
      'Complete Profile',
      linkData.url
    );

    if (result.success) {
      logSuccess('profile_webview_sent', { 
        whatsappNumber, 
        messageId: result.messageId,
        token: linkData.token 
      });
      return { success: true, messageId: result.messageId };
    } else {
      // Fallback to text message if WebView fails
      return {
        success: false,
        fallbackMessage: `Hello ${firstName}! 👋

📋 **Complete Your Profile**

Complete your profile here: ${linkData.url}

⏱️ Link expires in 15 minutes`
      };
    }
  } catch (error) {
    logError(error, { operation: 'sendProfileFormWebView', whatsappNumber });
    return { 
      success: false, 
      message: `Hello! Please complete your profile by saying "profile" again.` 
    };
  }
}

// Handle greeting and send form link (legacy support)
async function handleGreetingWithFormLink(user, incompleteFields, whatsappNumber) {
  const result = await sendProfileFormWebView(whatsappNumber, user, incompleteFields);
  
  if (result.success) {
    return null; // WebView button sent successfully
  } else {
    return result.fallbackMessage || result.message;
  }
}

module.exports = {
  generateProfileFormLink,
  handleGreetingWithFormLink,
  sendProfileFormWebView
};