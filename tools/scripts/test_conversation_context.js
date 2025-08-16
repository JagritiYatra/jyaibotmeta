// Test script for conversation context fixes
const axios = require('axios');

const TEST_NUMBER = '+1234567890'; // Test WhatsApp number
const API_URL = 'http://localhost:3000/webhook';

// Helper function to send message
async function sendMessage(message) {
    try {
        const response = await axios.post(API_URL, {
            From: `whatsapp:${TEST_NUMBER}`,
            Body: message,
            ProfileName: 'Test User',
            To: 'whatsapp:+14155238886',
            MessageSid: `SM${Date.now()}`,
            AccountSid: 'ACtest123',
            ApiVersion: '2010-04-01',
            NumMedia: '0'
        });
        
        console.log(`\n📱 User: "${message}"`);
        console.log(`🤖 Bot: ${response.data}`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        return null;
    }
}

// Test scenarios
async function runTests() {
    console.log('🧪 Testing Conversation Context Fixes\n');
    console.log('=====================================\n');
    
    // Wait a bit for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('📍 Test 1: Initial greeting and search');
    await sendMessage('Hi');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Complete profile quickly (assuming test user needs profile completion)
    console.log('\n📍 Completing profile quickly...');
    await sendMessage('skip');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n📍 Test 2: Performing initial search');
    await sendMessage('I need web developers');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n📍 Test 3: Location-based refinement (should work now)');
    await sendMessage('ok now any candidates from pune');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n📍 Test 4: Requesting more results');
    await sendMessage('show me more developers');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n📍 Test 5: Thank you (should not reset conversation)');
    await sendMessage('ok thank you');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n📍 Test 6: Another search after thank you');
    await sendMessage('any react developers?');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n📍 Test 7: More results request');
    await sendMessage('more lawyers in the list');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n✅ Test scenarios completed!');
}

// Run tests
runTests().catch(console.error);