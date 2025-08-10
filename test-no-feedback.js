// Test form submission without feedback field
const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function testWithoutFeedback() {
  console.log('\n=== TESTING FORM WITHOUT FEEDBACK FIELD ===\n');
  
  try {
    // Simulate form submission
    const formData = {
      email: 'cvresumehelpline@gmail.com',
      sessionToken: 'test-cvresume-token-123',
      name: 'Test User Without Feedback',
      gender: 'Male',
      dateOfBirth: '1995-05-15',
      professionalRole: 'Entrepreneur',
      country: 'India',
      state: 'Karnataka',
      city: 'Bangalore',
      phoneNumber: '9876543210',
      linkedInProfile: 'https://linkedin.com/in/testuser',
      industryDomain: 'Technology',
      yatraImpact: ['Started Enterprise Post-Yatra'],
      communityAsks: ['Funding & Investment Support'],
      communityGives: ['Technology & Digital Support']
      // Note: No feedbackSuggestions field
    };
    
    console.log('Submitting form data without feedback field...');
    console.log('Fields being sent:', Object.keys(formData).join(', '));
    
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
      console.log('\n✅ SUCCESS: Form submitted successfully without feedback field!');
      console.log('Response:', response.data);
      
      // Check that response doesn't contain feedback fields
      if (!response.data.feedbackSaved && !response.data.feedbackStack) {
        console.log('✅ Confirmed: No feedback fields in response');
      }
    } else {
      console.log('❌ Form submission failed:', response.data.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Wait for server to start
setTimeout(() => {
  testWithoutFeedback().then(() => {
    console.log('\n=== TEST COMPLETE ===\n');
    process.exit(0);
  });
}, 3000);