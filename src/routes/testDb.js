const express = require('express');
const router = express.Router();
const { getDatabase, isDbConnected } = require('../config/database');

router.get('/test-db', async (req, res) => {
  try {
    const isConnected = isDbConnected();
    
    if (!isConnected) {
      return res.json({
        connected: false,
        message: 'Database not connected'
      });
    }
    
    const db = getDatabase();
    
    // Test query
    const userCount = await db.collection('users').countDocuments();
    
    // Find test users
    const testUsers = await db.collection('users').find({
      $or: [
        { 'basicProfile.email': 'techakash@jagritiyatra.com' },
        { 'basicProfile.email': 'cvresumehelpline@gmail.com' }
      ]
    }).toArray();
    
    return res.json({
      connected: true,
      database: 'jagriti_yatra_community',
      userCount: userCount,
      testUsers: testUsers.map(u => ({
        email: u.basicProfile?.email,
        name: u.enhancedProfile?.fullName || u.basicProfile?.name,
        hasSession: !!u.plainFormSession,
        lastUpdated: u.lastUpdated
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      connected: false
    });
  }
});

module.exports = router;