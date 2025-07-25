# Web Form Implementation for Profile Capture

## Overview

When a user says "hi" on WhatsApp after authentication, they receive:
1. Option to continue profile capture on WhatsApp (step-by-step)
2. A unique link to complete their profile via web form (all at once)

## Key Features

### 1. **Token Generation**
- Unique token generated when user says "hi"
- **Expires in 15 minutes** for security
- One-time use only
- Token stored in user's database record

### 2. **Web Form URL Format**
```
Local: http://localhost:3000/profile-setup?token=abc123...
Production: https://yourdomain.com/profile-setup?token=abc123...
```

### 3. **Form Fields** (Same as WhatsApp)
- Full Name
- Gender (Male/Female/Others)
- Professional Role
- Date of Birth
- Country
- Address (with Country/State/City dropdowns using API)
- Phone Number
- LinkedIn Profile
- Instagram Profile (optional)
- Additional Email (optional)
- Industry Domain
- Yatra Impact (checkboxes)
- Community Asks (max 3)
- Community Gives (max 3)

### 4. **Address Field Enhancement**
- Uses Country State City API
- Hierarchical dropdowns:
  - Select Country → Shows States
  - Select State → Shows Cities
- Combines into single address string: "City, State, Country"

### 5. **Data Mapping**
All form data maps exactly to the WhatsApp profile structure:
```javascript
enhancedProfile: {
  fullName: "User Name",
  gender: "Male",
  professionalRole: "Entrepreneur",
  dateOfBirth: "2000-07-19",
  country: "India",
  address: "Mumbai, Maharashtra, India",  // Combined from dropdowns
  phone: "+919876543210",
  linkedin: "linkedin.com/in/username",
  instagram: "@username",
  domain: "Technology",
  yatraImpact: ["Started Enterprise Post-Yatra"],
  communityAsks: ["Mentorship", "Funding Support"],
  communityGives: ["Industry Insights", "Networking"]
}
```

## User Flow

1. **User says "hi" on WhatsApp**
   ```
   Bot: Welcome back! 
   
   You have two options to complete your profile:
   
   1️⃣ Continue here on WhatsApp - I'll guide you step by step
   
   2️⃣ Complete via Web Form - Fill everything at once
   
   🔗 Click here: https://yoursite.com/profile-setup?token=abc123
   ⏱️ Link expires in 15 minutes
   
   To continue on WhatsApp, let's start with:
   Full Name
   ```

2. **If user clicks the link**:
   - Opens beautiful form with all fields
   - Address uses API dropdowns
   - Validates all required fields
   - Submits and saves to profile

3. **After submission**:
   - Profile marked as complete
   - Token marked as used
   - Redirects to WhatsApp with success message

## Technical Implementation

### Backend Routes (`/web/routes/profileFormRoutes.js`)
- `GET /profile-setup` - Serves form page
- `GET /api/countries` - Gets countries from API
- `GET /api/states/:countryCode` - Gets states
- `GET /api/cities/:countryCode/:stateCode` - Gets cities
- `POST /api/submit-profile` - Saves profile data

### Frontend (`/web/public/profile-form.html`)
- Responsive design with Tailwind CSS
- Dynamic country/state/city dropdowns
- Form validation
- Loading states
- Success/error handling

### Environment Variables
```
BASE_URL=https://yourdomain.com
CSC_API_KEY=your_api_key_here
```

## Benefits

1. **User Choice**: Can complete profile quickly via web or conversationally on WhatsApp
2. **Better UX**: Web form is faster for users who prefer filling everything at once
3. **Structured Address**: API dropdowns ensure consistent location data
4. **Security**: 15-minute expiry and one-time use tokens
5. **Same Data**: Both methods save to same profile structure

## Testing

1. Send "hi" to WhatsApp bot
2. Click the generated link
3. Fill the form (address will have dropdowns)
4. Submit
5. Check profile is complete in database