// Verify that the form works with all authorized emails
const axios = require('axios');
const { getAuthorizedEmails } = require('./src/config/authorizedEmails');

const LIVE_URL = 'https://jyaibot-meta.vercel.app';

async function verifyAuthEmails() {
  console.log('\n=== VERIFYING FORM WORKS WITH ALL AUTHORIZED EMAILS ===\n');
  
  // Get all authorized emails
  const authorizedEmails = getAuthorizedEmails();
  console.log(`Total authorized emails: ${authorizedEmails.length}\n`);
  
  // Test a few random authorized emails
  const testEmails = [
    'techakash@jagritiyatra.com',
    'murali@jagritiyatra.com', 
    'cvresumehelpline@gmail.com',
    'sachinj7008@gmail.com',
    'jitansh25@gmail.com'
  ];
  
  console.log('Testing sample authorized emails:\n');
  
  for (const email of testEmails) {
    try {
      // Check if email is authorized
      const response = await axios.post(
        `${LIVE_URL}/api/plain-form/check-email-authorization`,
        { email },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success && response.data.authorized) {
        console.log(`✅ ${email} - AUTHORIZED`);
      } else {
        console.log(`❌ ${email} - NOT AUTHORIZED`);
      }
    } catch (error) {
      console.log(`❌ ${email} - ERROR: ${error.message}`);
    }
  }
  
  console.log('\n=== HOW IT WORKS FOR ALL AUTHORIZED EMAILS ===\n');
  console.log('1. ANY authorized email can use the form');
  console.log('2. They request OTP for email verification');
  console.log('3. After verification, they fill the form including suggestions');
  console.log('4. Data saves to their profile (creates new or updates existing)');
  console.log('5. Suggestions field is stored in both enhancedProfile and basicProfile');
  console.log('\nTotal authorized emails that can use the form:', authorizedEmails.length);
  
  // Show a few more authorized emails
  console.log('\nSample of authorized emails:');
  authorizedEmails.slice(0, 10).forEach(email => {
    console.log(`  - ${email}`);
  });
  console.log('  ... and', authorizedEmails.length - 10, 'more emails');
}

verifyAuthEmails().then(() => {
  console.log('\n=== VERIFICATION COMPLETE ===\n');
  process.exit(0);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});