// Test MongoDB connection from Vercel
module.exports = async (req, res) => {
  const { MongoClient } = require('mongodb');
  
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    const DB_NAME = process.env.DB_NAME || 'jagriti_yatra_community';
    
    if (!MONGODB_URI) {
      return res.status(500).json({ 
        error: 'MONGODB_URI not set',
        hasEnv: false 
      });
    }
    
    // Try to connect
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Count documents
    const userCount = await db.collection('users').countDocuments();
    
    // Find test users
    const testUsers = await db.collection('users').find({
      $or: [
        { 'basicProfile.email': 'techakash@jagritiyatra.com' },
        { 'basicProfile.email': 'cvresumehelpline@gmail.com' }
      ]
    }).toArray();
    
    const result = {
      connected: true,
      database: DB_NAME,
      mongoUri: MONGODB_URI.substring(0, 30) + '...',
      userCount: userCount,
      testUsers: testUsers.map(u => ({
        email: u.basicProfile?.email,
        name: u.enhancedProfile?.fullName || u.basicProfile?.name,
        hasSession: !!u.plainFormSession,
        sessionToken: u.plainFormSession?.token ? u.plainFormSession.token.substring(0, 20) + '...' : null
      })),
      timestamp: new Date().toISOString()
    };
    
    await client.close();
    return res.status(200).json(result);
    
  } catch (error) {
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack,
      connected: false 
    });
  }
};