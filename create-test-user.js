require('dotenv').config();
const { connectDatabase, getDatabase } = require('./src/config/database');
const { findUserByWhatsAppNumber } = require('./src/models/User');

async function createTestUser() {
  try {
    await connectDatabase();
    
    // Test different number formats for the test number
    const testNumbers = [
      '+919876543210',
      '919876543210',
      '9876543210'
    ];
    
    for (const num of testNumbers) {
      const user = await findUserByWhatsAppNumber(num);
      console.log(`Format '${num}': ${user ? 'Found user: ' + (user.basicProfile?.name || user.enhancedProfile?.fullName || 'No name') : 'Not found'}`);
    }
    
    // Create a test user
    const db = getDatabase();
    const existingUser = await db.collection('users').findOne({
      $or: [
        { whatsappNumber: { $regex: '9876543210', $options: 'i' } },
        { whatsappNumbers: { $elemMatch: { $regex: '9876543210', $options: 'i' } } }
      ]
    });
    
    if (!existingUser) {
      console.log('\nCreating test user...');
      const result = await db.collection('users').insertOne({
        basicProfile: {
          name: 'Test User',
          whatsappNumbers: ['+919876543210'],
          registeredAt: new Date(),
          linkedEmails: []
        },
        whatsappNumber: '+919876543210',
        whatsappNumbers: ['+919876543210'],
        enhancedProfile: {
          completed: false
        },
        metadata: {
          createdAt: new Date(),
          lastActive: new Date(),
          source: 'profile-form-test'
        }
      });
      console.log('Test user created with ID:', result.insertedId);
    } else {
      console.log('\nTest user already exists');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createTestUser();