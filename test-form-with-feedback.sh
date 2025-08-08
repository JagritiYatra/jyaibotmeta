#!/bin/bash

# Test form submission with feedback field
API_BASE="http://localhost:3000/api"
EMAIL="techakash@jagritiyatra.com"

echo "🔧 Testing form submission with feedback field"
echo "📧 Using email: $EMAIL"

# Step 1: Send OTP
echo -e "\n1️⃣ Sending OTP..."
OTP_RESPONSE=$(curl -s -X POST "$API_BASE/plain-form/send-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\"}")

echo "OTP Response: $OTP_RESPONSE"

# For testing, we'll manually set the OTP in the database
echo -e "\n⚠️  Please manually set OTP to '123456' in MongoDB:"
echo "   db.otps.updateOne({email: \"$EMAIL\"}, {\$set: {otp: \"123456\"}})"
echo "   Press Enter when done..."
read

# Step 2: Verify OTP
echo -e "\n2️⃣ Verifying OTP..."
VERIFY_RESPONSE=$(curl -s -X POST "$API_BASE/plain-form/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"otp\": \"123456\"}")

echo "Verify Response: $VERIFY_RESPONSE"

# Extract session token
SESSION_TOKEN=$(echo $VERIFY_RESPONSE | grep -o '"sessionToken":"[^"]*' | sed 's/"sessionToken":"//')

if [ -z "$SESSION_TOKEN" ]; then
  echo "❌ Failed to get session token"
  exit 1
fi

echo "✅ Got session token: ${SESSION_TOKEN:0:20}..."

# Step 3: Submit form with feedback
echo -e "\n3️⃣ Submitting form with feedback..."
FORM_DATA='{
  "email": "'$EMAIL'",
  "sessionToken": "'$SESSION_TOKEN'",
  "name": "Test User with Feedback",
  "gender": "Male",
  "dateOfBirth": "1990-01-01",
  "professionalRole": "Entrepreneur",
  "country": "India",
  "state": "Karnataka",
  "city": "Bangalore",
  "phoneNumber": "9876543210",
  "additionalEmail": "",
  "linkedInProfile": "https://linkedin.com/in/testuser",
  "instagramProfile": "",
  "industryDomain": "Technology",
  "yatraImpact": ["Started Enterprise Post-Yatra"],
  "communityAsks": ["Mentorship & Guidance"],
  "communityGives": ["Industry Insights & Best Practices"],
  "feedbackSuggestions": "This is test feedback from the script. The bot should collect more information about skills, expertise areas, and past projects. Integration with other social platforms would be valuable."
}'

SUBMIT_RESPONSE=$(curl -s -X POST "$API_BASE/plain-form/submit-plain-form" \
  -H "Content-Type: application/json" \
  -d "$FORM_DATA")

echo "Submit Response: $SUBMIT_RESPONSE"

# Check server logs
echo -e "\n📋 Checking server logs for feedback field..."
echo "Look for: 'Feedback field received:' and 'Saving feedback to enhancedProfile.feedbackSuggestions:'"