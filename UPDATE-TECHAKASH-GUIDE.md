# How to Update techakash@jagritiyatra.com Profile

## The Issue
Your form data isn't updating because there's no active session. The data shows it was last updated at 16:27:18 UTC with the old values (name: "bubd").

## Solution - Follow These Steps:

### Step 1: Get a New OTP
1. Go to: https://jyaibot-meta.vercel.app/plain-profile-form.html
2. Enter email: `techakash@jagritiyatra.com`
3. Click "Send OTP"
4. Check your email for the OTP

### Step 2: Verify OTP
1. Enter the OTP you received
2. Click "Verify Email"
3. You should see "Email verified successfully!"

### Step 3: Fill the Form with New Data
Use these values to test:
- **Name**: Akash A jadhav
- **Gender**: Female
- **Date of Birth**: 1983-01-02
- **Professional Role**: NGO Worker
- **Country**: India
- **State**: Maharashtra
- **City**: Ahmadpur
- **Phone**: 9990183737
- **LinkedIn**: https://www.linkedin.com/in/techakash-updated/
- **Instagram**: @techakash_new
- **Industry Domain**: Non Profit
- **Yatra Impact**: Started Enterprise Post-Yatra
- **Community Asks**: Mentorship
- **Community Gives**: Investment
- **Suggestions**: Please add fields for hobbies, interests, and volunteer work

### Step 4: Submit the Form
1. Click "Submit Profile"
2. You should see "Profile updated successfully!"

### Step 5: Verify in CRUD Backend
1. Go to: http://localhost:4000
2. Click on "Users" tab
3. Search for "techakash"
4. You should now see the updated data

## Alternative: Run Test Script
If you want to automate this, I've created a script. Run this command:

```bash
cd "/Users/aramansalunke/Documents/JyAibot meta"
node check-techakash-data.js
```

This will show you the current data in the database.

## Current Status
- **Last Update**: 2025-08-10 16:27:18 UTC
- **Current Name**: bubd (old value)
- **Current Suggestions**: (none)
- **Session Status**: No active session (expired)

## Why It's Not Working
1. The session token "verified" you were using is invalid
2. Sessions expire after 1 hour
3. You need to get a new OTP and create a new session
4. Only then will the form submission work

## Important Notes
- The form is working correctly on Vercel
- The issue was the expired/invalid session
- Always verify OTP before submitting form
- Sessions last for 1 hour only