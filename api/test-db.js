// Test database connection endpoint
const { MongoClient } = require('mongodb');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      return res.status(500).json({ 
        error: 'MONGODB_URI not configured',
        hasEnv: false 
      });
    }
    
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('jagriti_yatra_community');
    
    // Check if techakash user exists and has session
    const user = await db.collection('users').findOne({
      'basicProfile.email': 'techakash@jagritiyatra.com'
    });
    
    const result = {
      connected: true,
      database: 'jagriti_yatra_community',
      userFound: !!user,
      hasSession: !!user?.plainFormSession,
      sessionToken: user?.plainFormSession?.token ? 
        user.plainFormSession.token.substring(0, 20) + '...' : 
        null,
      sessionExpired: user?.plainFormSession?.expiresAt ? 
        new Date() > new Date(user.plainFormSession.expiresAt) : 
        null,
      lastUpdated: user?.lastUpdated,
      currentName: user?.enhancedProfile?.fullName || user?.basicProfile?.name,
      timestamp: new Date().toISOString()
    };
    
    await client.close();
    
    return res.status(200).json(result);
    
  } catch (error) {
    return res.status(500).json({ 
      error: error.message,
      connected: false 
    });
  }
};