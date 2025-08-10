// Test suggestions field implementation
const axios = require('axios');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const MONGO_URI = process.env.MONGODB_URI;

async function testSuggestionsField() {
  console.log('\n=== TESTING SUGGESTIONS FIELD ===\n');
  
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    // Step 1: Create/update session for cvresumehelpline@gmail.com
    console.log('1. Setting up test session...');
    await db.collection('users').updateOne(
      { 'basicProfile.email': 'cvresumehelpline@gmail.com' },
      {
        $set: {
          plainFormSession: {
            token: 'test-suggestions-token-456',
            email: 'cvresumehelpline@gmail.com',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 3600000) // 1 hour
          }
        }
      }
    );
    console.log('✅ Session created');
    
    // Step 2: Submit form with suggestions
    console.log('\n2. Submitting form with suggestions...');
    const testSuggestions = 'I suggest adding these fields: 1) Year of Yatra participation, 2) Current company/organization name, 3) Skills and expertise areas, 4) Mentorship availability status';
    
    const formData = {
      email: 'cvresumehelpline@gmail.com',
      sessionToken: 'test-suggestions-token-456',
      name: 'Test User With Suggestions',
      gender: 'Female',
      dateOfBirth: '1992-08-20',
      professionalRole: 'Working Professional',
      country: 'India',
      state: 'Maharashtra',
      city: 'Mumbai',
      phoneNumber: '9876543210',
      linkedInProfile: 'https://linkedin.com/in/testsuggestions',
      industryDomain: 'Education',
      yatraImpact: ['Found Clarity in Journey'],
      communityAsks: ['Mentorship & Guidance'],
      communityGives: ['Industry Insights & Best Practices'],
      suggestions: testSuggestions
    };
    
    console.log('Sending suggestions:', testSuggestions.substring(0, 60) + '...');
    
    const response = await axios.post(
      `${API_BASE_URL}/api/plain-form/submit-plain-form`,
      formData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Form submitted successfully');
    } else {
      console.log('❌ Form submission failed:', response.data.error);
      return;
    }
    
    // Step 3: Verify in database
    console.log('\n3. Verifying suggestions in database...');
    const user = await db.collection('users').findOne({
      'basicProfile.email': 'cvresumehelpline@gmail.com'
    });
    
    if (user) {
      console.log('\n📊 DATABASE VERIFICATION:');
      console.log('User ID:', user._id);
      console.log('Email:', user.basicProfile?.email);
      console.log('Name:', user.enhancedProfile?.fullName || user.basicProfile?.name);
      
      console.log('\n📝 SUGGESTIONS FIELD:');
      const enhancedSuggestions = user.enhancedProfile?.suggestions;
      const basicSuggestions = user.basicProfile?.suggestions;
      
      console.log('Enhanced Profile suggestions:', enhancedSuggestions ? `"${enhancedSuggestions.substring(0, 60)}..."` : '(none)');
      console.log('Basic Profile suggestions:', basicSuggestions ? `"${basicSuggestions.substring(0, 60)}..."` : '(none)');
      console.log('Suggestions Updated At:', user.enhancedProfile?.suggestionsUpdatedAt);
      
      // Verify suggestions saved correctly
      if (enhancedSuggestions === testSuggestions && basicSuggestions === testSuggestions) {
        console.log('\n✅ SUCCESS: Suggestions saved correctly in BOTH profiles!');
        console.log('✅ Field is properly mapped to user profile');
      } else if (enhancedSuggestions || basicSuggestions) {
        console.log('\n⚠️ PARTIAL: Suggestions saved but not in both places');
      } else {
        console.log('\n❌ FAILURE: Suggestions were not saved');
      }
      
      // Check other fields to ensure profile is complete
      console.log('\n📋 OTHER PROFILE FIELDS:');
      console.log('Professional Role:', user.enhancedProfile?.professionalRole);
      console.log('Location:', user.enhancedProfile?.location?.city);
      console.log('Industry Domain:', user.enhancedProfile?.industryDomain);
      console.log('Profile Complete:', user.profileComplete ? 'Yes' : 'No');
      
    } else {
      console.log('❌ User not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    await client.close();
  }
}

// Wait for server to start
setTimeout(() => {
  testSuggestionsField().then(() => {
    console.log('\n=== TEST COMPLETE ===\n');
    process.exit(0);
  });
}, 3000);