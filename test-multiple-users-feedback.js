// Test feedback with multiple users
require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');

const API_BASE = 'http://localhost:3000/api';

async function testMultipleUsers() {
  const testUsers = [
    { email: 'techakash@jagritiyatra.com', feedback: 'First user feedback test' },
    { email: 'arjun@jagritiyatra.com', feedback: 'Second user wants better UI' }
  ];
  
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    const users = db.collection('users');
    
    console.log('🧪 TESTING FEEDBACK WITH MULTIPLE USERS');
    console.log('========================================\n');
    
    for (const testUser of testUsers) {
      console.log(`\n📧 Testing with: ${testUser.email}`);
      console.log('-----------------------------------');
      
      try {
        // Send OTP
        await axios.post(`${API_BASE}/email-verification/send-otp`, {
          email: testUser.email
        });
        
        // Set test OTP
        await db.collection('otps').updateOne(
          { email: testUser.email },
          { 
            $set: { 
              otp: '123456',
              email: testUser.email,
              expiresAt: new Date(Date.now() + 600000),
              attempts: 0
            }
          },
          { upsert: true }
        );
        
        // Verify OTP
        const verifyResp = await axios.post(`${API_BASE}/email-verification/verify-otp`, {
          email: testUser.email,
          otp: '123456'
        });
        
        const sessionToken = verifyResp.data.sessionToken;
        console.log('✅ Got session token');
        
        // Submit form with feedback
        const formData = {
          email: testUser.email,
          sessionToken: sessionToken,
          name: 'Test User',
          gender: 'Male',
          dateOfBirth: '1990-01-01',
          professionalRole: 'Entrepreneur',
          country: 'India',
          state: 'Karnataka',
          city: 'Bangalore',
          phoneNumber: '9876543210',
          linkedInProfile: 'https://linkedin.com/in/test',
          instagramProfile: 'test',
          industryDomain: 'Technology',
          yatraImpact: ['Started Enterprise Post-Yatra'],
          communityAsks: ['Mentorship'],
          communityGives: ['Networking'],
          feedbackSuggestions: testUser.feedback  // User-specific feedback
        };
        
        console.log(`📝 Submitting with feedback: "${testUser.feedback}"`);
        
        const submitResp = await axios.post(`${API_BASE}/plain-form/submit-plain-form`, formData);
        
        if (submitResp.data.success) {
          console.log('✅ Form submitted successfully');
          console.log('Server says feedback saved as:', submitResp.data.feedbackSaved);
          
          // Verify in database
          await new Promise(r => setTimeout(r, 500));
          const user = await users.findOne({ 
            $or: [
              { 'basicProfile.email': testUser.email },
              { 'enhancedProfile.email': testUser.email }
            ]
          });
          
          const savedFeedback = user?.enhancedProfile?.feedbackSuggestions;
          
          if (savedFeedback === testUser.feedback) {
            console.log('✅ VERIFIED: Feedback saved correctly in DB!');
          } else {
            console.log('❌ FAILED: Feedback mismatch!');
            console.log('   Expected:', testUser.feedback);
            console.log('   Got:', savedFeedback);
          }
        }
        
      } catch (error) {
        console.log('❌ Error for', testUser.email, ':', error.response?.data?.error || error.message);
      }
    }
    
    console.log('\n\n📊 FINAL CHECK - All Users:');
    console.log('============================');
    
    for (const testUser of testUsers) {
      const user = await users.findOne({ 
        $or: [
          { 'basicProfile.email': testUser.email },
          { 'enhancedProfile.email': testUser.email }
        ]
      });
      
      const savedFeedback = user?.enhancedProfile?.feedbackSuggestions;
      console.log(`${testUser.email}: "${savedFeedback || '(not found)'}"`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await client.close();
  }
}

testMultipleUsers();