# Profile Capture - Web Form Only Implementation

## Overview

Profile capture is now **ONLY via web form**. WhatsApp step-by-step profile capture has been completely removed.

## How It Works

### 1. **User Interaction Flow**

When ANY authenticated user with incomplete profile sends ANY message on WhatsApp:

```
User: hi
Bot: Hello [Name]! 👋

📋 **Complete Your Profile First**

Your profile is 20% complete. Please finish it using our web form:

🔗 **Profile Form:** http://localhost:3000/profile-setup?token=abc123&wa=+919876543210
⏱️ Link expires in 15 minutes

✨ Features:
• All fields in one place
• Easy dropdown for location (Country → State → City)
• Takes only 5 minutes

Once complete, you can search for alumni and access all features!
```

### 2. **Web Form Features**

The form at `/profile-setup` includes:

- **Personal Information**
  - Full Name
  - Gender (dropdown)
  - Professional Role (dropdown)
  - Date of Birth (date picker)

- **Location** (with API dropdowns)
  - Country → Shows all countries
  - State → Shows states based on selected country
  - City → Shows cities based on selected state
  - Combined into single address: "City, State, Country"

- **Contact Information**
  - Phone Number
  - LinkedIn Profile URL
  - Instagram Profile (optional)
  - Additional Email (optional)

- **Professional Information**
  - Industry Domain (dropdown)
  - Yatra Impact (checkboxes)
  - Community Asks (max 3)
  - Community Gives (max 3)

### 3. **Technical Implementation**

#### Files Changed:
1. **Removed WhatsApp profile capture**:
   - Created `/src/controllers/authenticatedUserControllerSimple.js` - Clean version without profile updates
   - Updated webhook to use simplified controller

2. **Profile Form Controller**:
   - `/src/controllers/profileFormController.js` - Generates simple links without database dependency

3. **Web Routes**:
   - `/web/routes/profileFormRoutes.js` - Handles form serving and submission
   - Uses Country State City API for location dropdowns

4. **Frontend**:
   - `/web/public/profile-form.html` - Beautiful form with Tailwind CSS
   - `/web/public/js/profile-form.js` - Handles dynamic dropdowns and submission

### 4. **Key Changes**

- **No more step-by-step on WhatsApp** - Users can't update profile via chat
- **Single response for incomplete profiles** - Always sends web form link
- **Simplified token** - Just timestamp-based, no database validation
- **15-minute expiry** - Checked when form loads

### 5. **Testing**

1. Start your main server:
   ```bash
   npm start
   ```

2. Send any message on WhatsApp when profile is incomplete

3. Click the link received

4. Fill the form (location has dropdowns)

5. Submit - data saves to user profile

### 6. **Benefits**

- **Simpler code** - No complex state management for profile fields
- **Better UX** - Users fill everything at once
- **Structured data** - Location dropdowns ensure consistency
- **Faster completion** - 5 minutes vs 15+ minutes on WhatsApp
- **No session issues** - Web form doesn't depend on WhatsApp session

## Deployment

For production:
1. Set `BASE_URL` in environment variables
2. Deploy web files to same server
3. Ensure Country State City API key is configured
4. Test with real WhatsApp number

The web form is now the ONLY way to complete profiles!