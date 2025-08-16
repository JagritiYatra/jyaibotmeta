// Script to add a test user to the database
const { connectDatabase } = require('./src/config/database');

async function addTestUser(whatsappNumber) {
    try {
        await connectDatabase();
        
        const db = require('./src/config/database').getDatabase();
        const usersCollection = db.collection('users');
        
        // Check if user exists
        const existingUser = await usersCollection.findOne({ 
            'basicProfile.whatsappNumbers': whatsappNumber 
        });
        
        if (existingUser) {
            console.log('User already exists:', existingUser.basicProfile.name);
            return;
        }
        
        // Create new user
        const newUser = {
            basicProfile: {
                name: 'Test User',
                whatsappNumbers: [whatsappNumber],
                registeredAt: new Date(),
                linkedEmails: []
            },
            enhancedProfile: {
                completed: false
            },
            metadata: {
                createdAt: new Date(),
                lastActive: new Date(),
                source: 'test-script'
            }
        };
        
        const result = await usersCollection.insertOne(newUser);
        console.log('✅ Test user created successfully!');
        console.log('User ID:', result.insertedId);
        console.log('WhatsApp:', whatsappNumber);
        
        process.exit(0);
    } catch (error) {
        console.error('Error creating test user:', error);
        process.exit(1);
    }
}

// Get phone number from command line
const phoneNumber = process.argv[2];
if (!phoneNumber) {
    console.log('Usage: node add-test-user.js +919876543210');
    process.exit(1);
}

addTestUser(phoneNumber);