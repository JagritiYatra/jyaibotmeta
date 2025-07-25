// Script to clear user session and reset profile state
const { connectDatabase } = require('./src/config/database');
const { clearUserSession } = require('./src/services/sessionManager');

async function clearSession(whatsappNumber) {
    try {
        await connectDatabase();
        
        // Clear the session
        await clearUserSession(whatsappNumber);
        
        console.log(`✅ Session cleared for ${whatsappNumber}`);
        console.log('User will now get the web form link on next message');
        
        process.exit(0);
    } catch (error) {
        console.error('Error clearing session:', error);
        process.exit(1);
    }
}

// Get phone number from command line
const phoneNumber = process.argv[2];
if (!phoneNumber) {
    console.log('Usage: node clear-user-session.js +919876543210');
    process.exit(1);
}

clearSession(phoneNumber);