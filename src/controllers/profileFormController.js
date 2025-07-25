// Simple controller for profile form link generation
const crypto = require('crypto');
const { logError, logSuccess } = require('../middleware/logging');

// Generate simple profile form link
function generateProfileFormLink(whatsappNumber) {
  try {
    // Generate a simple token based on timestamp and random bytes
    const token = crypto.randomBytes(16).toString('hex') + Date.now();
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
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

// Handle greeting and send form link
async function handleGreetingWithFormLink(user, incompleteFields, whatsappNumber) {
  const linkData = generateProfileFormLink(whatsappNumber);
  
  if (!linkData) {
    return `Hello! There was an error generating your profile form link. Please try again.`;
  }
  
  const firstName = user?.enhancedProfile?.fullName?.split(' ')[0] || 
                   user?.basicProfile?.name?.split(' ')[0] || 
                   'there';
  
  return `Hello ${firstName}! 👋

📋 **Complete Your Profile**

I notice your profile needs some information. You can complete it quickly using our web form:

🔗 **Profile Form Link:**
${linkData.url}

⏱️ This link expires in 15 minutes

✨ The form includes all fields:
• Personal details (Name, DOB, Gender)
• Professional information
• Location (with easy dropdowns)
• Contact details
• Community preferences

Click the link above to get started!`;
}

module.exports = {
  generateProfileFormLink,
  handleGreetingWithFormLink
};