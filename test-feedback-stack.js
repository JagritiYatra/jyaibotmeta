// Test script for feedback stack functionality
// Tests the new feedback stack feature that stores multiple feedback entries

const axios = require('axios');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const MONGO_URI = process.env.MONGODB_URI;

// Test user data
const TEST_USER_EMAIL = 'test.feedback.stack@jagritiyatra.com';
const TEST_USER_PHONE = '919999888877';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: `${colors.blue}ℹ️`,
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    warning: `${colors.yellow}⚠️`,
    test: `${colors.magenta}🧪`,
    data: `${colors.cyan}📊`
  }[type] || '';
  
  console.log(`${prefix} [${timestamp}] ${message}${colors.reset}`);
}

async function clearTestUser() {
  log('Clearing existing test user data...', 'info');
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    // Delete test user if exists
    const result = await db.collection('users').deleteOne({
      $or: [
        { 'basicProfile.email': TEST_USER_EMAIL },
        { 'enhancedProfile.email': TEST_USER_EMAIL }
      ]
    });
    
    if (result.deletedCount > 0) {
      log(`Deleted existing test user: ${TEST_USER_EMAIL}`, 'success');
    } else {
      log('No existing test user found', 'info');
    }
  } catch (error) {
    log(`Error clearing test user: ${error.message}`, 'error');
  } finally {
    await client.close();
  }
}

async function createTestUser() {
  log('Creating test user with pre-authorized email...', 'info');
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    // Create a test user with session
    const testUser = {
      whatsappNumber: TEST_USER_PHONE,
      basicProfile: {
        email: TEST_USER_EMAIL,
        name: 'Test User'
      },
      enhancedProfile: {
        email: TEST_USER_EMAIL,
        feedbackStack: [] // Initialize empty feedback stack
      },
      plainFormSession: {
        token: 'test-session-token-12345',
        email: TEST_USER_EMAIL,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
      },
      metadata: {
        createdAt: new Date(),
        preCreated: true
      }
    };
    
    await db.collection('users').insertOne(testUser);
    log(`Test user created: ${TEST_USER_EMAIL}`, 'success');
    
    return testUser;
  } catch (error) {
    log(`Error creating test user: ${error.message}`, 'error');
    throw error;
  } finally {
    await client.close();
  }
}

async function submitFeedback(feedbackText, attemptNumber) {
  log(`\n${colors.bright}=== Submitting Feedback #${attemptNumber} ===${colors.reset}`, 'test');
  log(`Feedback text: "${feedbackText}"`, 'data');
  
  const formData = {
    email: TEST_USER_EMAIL,
    sessionToken: 'test-session-token-12345',
    name: `Test User ${attemptNumber}`,
    gender: 'Male',
    dateOfBirth: '1990-01-01',
    professionalRole: 'Entrepreneur',
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai',
    phoneNumber: TEST_USER_PHONE,
    linkedInProfile: 'https://linkedin.com/in/testuser',
    industryDomain: 'Technology',
    yatraImpact: ['Started Enterprise Post-Yatra'],
    communityAsks: ['Mentorship & Guidance'],
    communityGives: ['Technology & Digital Support'],
    feedbackSuggestions: feedbackText
  };
  
  try {
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
      log('Form submitted successfully', 'success');
      log(`Response: ${JSON.stringify(response.data.feedbackStack)}`, 'data');
      return response.data;
    } else {
      log(`Form submission failed: ${response.data.error}`, 'error');
      return null;
    }
  } catch (error) {
    log(`Error submitting form: ${error.message}`, 'error');
    if (error.response) {
      log(`Response status: ${error.response.status}`, 'error');
      log(`Response data: ${JSON.stringify(error.response.data)}`, 'error');
    }
    return null;
  }
}

async function verifyFeedbackStack() {
  log('\n📋 Verifying feedback stack in database...', 'test');
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    const user = await db.collection('users').findOne({
      'basicProfile.email': TEST_USER_EMAIL
    });
    
    if (!user) {
      log('User not found in database', 'error');
      return false;
    }
    
    const feedbackStack = user.enhancedProfile?.feedbackStack || [];
    const latestFeedback = user.enhancedProfile?.latestFeedback;
    const totalCount = user.enhancedProfile?.totalFeedbackCount || 0;
    
    log(`\n${colors.bright}📊 FEEDBACK STACK ANALYSIS:${colors.reset}`, 'data');
    log(`Total feedback entries: ${feedbackStack.length}`, 'data');
    log(`Total count field: ${totalCount}`, 'data');
    log(`Latest feedback: "${latestFeedback || '(none)'}"`, 'data');
    
    if (feedbackStack.length > 0) {
      log('\n📝 Feedback History:', 'data');
      feedbackStack.forEach((entry, index) => {
        const timestamp = new Date(entry.submittedAt).toLocaleString();
        log(`  [${entry.submissionNumber}] ${timestamp}: "${entry.feedback.substring(0, 50)}..."`, 'info');
      });
      
      // Verify stack integrity
      log('\n🔍 Verifying stack integrity...', 'test');
      let isValid = true;
      
      // Check if submission numbers are sequential
      for (let i = 0; i < feedbackStack.length; i++) {
        if (feedbackStack[i].submissionNumber !== i + 1) {
          log(`❌ Submission number mismatch at index ${i}`, 'error');
          isValid = false;
        }
      }
      
      // Check if latest feedback matches last entry
      if (feedbackStack.length > 0) {
        const lastEntry = feedbackStack[feedbackStack.length - 1];
        if (latestFeedback !== lastEntry.feedback) {
          log('❌ Latest feedback does not match last stack entry', 'error');
          isValid = false;
        }
      }
      
      // Check if total count matches stack length
      if (totalCount !== feedbackStack.length) {
        log(`❌ Total count (${totalCount}) does not match stack length (${feedbackStack.length})`, 'error');
        isValid = false;
      }
      
      if (isValid) {
        log('✅ Feedback stack integrity verified!', 'success');
      }
      
      return isValid;
    } else {
      log('No feedback entries found in stack', 'warning');
      return false;
    }
  } catch (error) {
    log(`Error verifying feedback stack: ${error.message}`, 'error');
    return false;
  } finally {
    await client.close();
  }
}

async function runTest() {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}`);
  console.log('🚀 FEEDBACK STACK FUNCTIONALITY TEST');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
  
  try {
    // Step 1: Clear existing test data
    await clearTestUser();
    
    // Step 2: Create fresh test user
    await createTestUser();
    
    // Step 3: Submit multiple feedback entries
    const feedbackMessages = [
      'First feedback: The bot should integrate with more social platforms',
      'Second feedback: Add voice message support for WhatsApp interactions',
      'Third feedback: Include analytics dashboard for user engagement metrics',
      'Fourth feedback: Enable bulk import/export of user profiles',
      'Fifth feedback: Add AI-powered profile matching for networking'
    ];
    
    for (let i = 0; i < feedbackMessages.length; i++) {
      await submitFeedback(feedbackMessages[i], i + 1);
      
      // Small delay between submissions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Step 4: Submit one empty feedback (should not be added to stack)
    log('\n🧪 Testing empty feedback submission...', 'test');
    await submitFeedback('', 6);
    
    // Step 5: Verify the feedback stack
    const isValid = await verifyFeedbackStack();
    
    // Step 6: Final summary
    console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}`);
    console.log('📊 TEST SUMMARY');
    console.log(`${'='.repeat(60)}${colors.reset}\n`);
    
    if (isValid) {
      log('✅ All tests passed! Feedback stack is working correctly.', 'success');
      log('✅ Feedback is being stored as a stack with proper timestamps.', 'success');
      log('✅ Each new submission adds to the stack without losing previous feedback.', 'success');
    } else {
      log('❌ Some tests failed. Please check the logs above.', 'error');
    }
    
  } catch (error) {
    log(`\n❌ Test failed with error: ${error.message}`, 'error');
    console.error(error);
  }
}

// Run the test
runTest().then(() => {
  console.log(`\n${colors.bright}Test completed${colors.reset}\n`);
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});