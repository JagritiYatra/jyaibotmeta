# Web Profile Form Setup

This web interface allows users to complete their profiles via a web form instead of WhatsApp chat.

## How it Works

1. When a user says "hi" on WhatsApp, they receive two options:
   - Continue profile completion on WhatsApp (step by step)
   - Complete via web form (all at once)

2. A unique token is generated and stored in the database
3. The user receives a unique link like: `https://yourdomain.com/profile-setup?token=abc123`
4. The form validates the token and shows the profile fields
5. Upon submission, data is saved to the user's profile

## Setup Instructions

### 1. Environment Variables

Add to your `.env` file:
```
BASE_URL=https://yourdomain.com  # For production
# or
BASE_URL=http://localhost:3000   # For local development
```

### 2. Deploy on Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard:
   - Add all your existing env variables
   - Set BASE_URL to your Vercel URL

### 3. Features

- **Smooth UI**: Modern, responsive design with Tailwind CSS
- **Country/State/City Dropdowns**: Hierarchical location selection
- **Field Validation**: All required fields are validated
- **Auto-save**: Form data maps directly to user profile
- **Token Security**: 24-hour expiry, one-time use

### 4. Customization

- **Add more countries**: Edit `/web/data/geo-data.json`
- **Change styling**: Modify `/web/public/profile-form.html`
- **Add fields**: Update both the form and the route handler

## File Structure

```
web/
├── public/
│   ├── profile-form.html    # Main form UI
│   ├── js/
│   │   └── profile-form.js  # Form logic
│   └── css/                 # Additional styles
├── routes/
│   └── profileFormRoutes.js # Express routes
└── data/
    └── geo-data.json        # Country/State/City data
```

## Testing

1. Start the server:
   ```bash
   npm start
   ```

2. Generate a test token by sending "hi" to your WhatsApp bot

3. Visit the link provided in WhatsApp

4. Complete and submit the form

5. Verify data is saved in MongoDB