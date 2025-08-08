const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');
const websocketService = require('../services/websocketService');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');

// Middleware for admin authentication (optional)
const adminAuth = (req, res, next) => {
  // Implement your admin authentication logic here
  // For now, we'll skip authentication for development
  next();
};

// ============= ANALYTICS ENDPOINTS =============

// Real-time metrics
router.get('/analytics/realtime', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    
    const [totalUsers, todayMessages, activeSessions] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('queries').countDocuments({ timestamp: { $gte: todayStart } }),
      db.collection('sessions').countDocuments({ lastActivity: { $gte: new Date(Date.now() - 30 * 60000) } }),
    ]);

    const aiPerformance = {
      score: 92,
      accuracy: 94,
      responseTime: 1.2,
      satisfaction: 88,
    };

    res.json({
      totalUsers,
      messagesToday: todayMessages,
      activeSessions,
      aiPerformance,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching realtime metrics:', error);
    res.status(500).json({ error: 'Failed to fetch realtime metrics' });
  }
});

// User growth analytics
router.get('/analytics/user-growth', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const { timeframe = '7d' } = req.query;
    const days = parseInt(timeframe) || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const growthData = await db.collection('users').aggregate(pipeline).toArray();
    
    const labels = [];
    const totalUsers = [];
    const activeUsers = [];
    let cumulativeTotal = await db.collection('users').countDocuments({ createdAt: { $lt: startDate } });

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      labels.push(date.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
      
      const dayData = growthData.find(d => d._id === dateStr);
      if (dayData) {
        cumulativeTotal += dayData.count;
      }
      totalUsers.push(cumulativeTotal);
      
      // Simulate active users (70-90% of total)
      activeUsers.push(Math.floor(cumulativeTotal * (0.7 + Math.random() * 0.2)));
    }

    res.json({ labels, totalUsers, activeUsers });
  } catch (error) {
    console.error('Error fetching user growth:', error);
    res.status(500).json({ error: 'Failed to fetch user growth data' });
  }
});

// User engagement analytics
router.get('/analytics/user-engagement', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const { timeframe = '7d' } = req.query;
    
    const [totalUsers, activeUsers, sessions] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('users').countDocuments({ lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      db.collection('sessions').find({ lastActivity: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }).toArray(),
    ]);

    const dau = activeUsers;
    const mau = Math.floor(totalUsers * 0.6); // Approximate MAU
    const stickiness = Math.round((dau / mau) * 100);
    
    // Calculate average session length
    const sessionLengths = sessions.map(s => 
      (s.lastActivity - s.createdAt) / (1000 * 60) // in minutes
    );
    const avgSessionLength = sessionLengths.length > 0 
      ? Math.round(sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length)
      : 0;

    // Engagement funnel (simulated)
    const funnel = [
      Math.floor(totalUsers * 1.0),    // Profile views
      Math.floor(totalUsers * 0.8),    // Searches
      Math.floor(totalUsers * 0.6),    // Messages
      Math.floor(totalUsers * 0.4),    // Connections
      Math.floor(totalUsers * 0.2),    // Active
    ];

    res.json({
      dau,
      mau,
      sessionLength: avgSessionLength,
      stickiness,
      churnRate: 3.5, // Simulated
      funnel,
    });
  } catch (error) {
    console.error('Error fetching engagement data:', error);
    res.status(500).json({ error: 'Failed to fetch engagement data' });
  }
});

// User retention analytics
router.get('/analytics/user-retention', adminAuth, async (req, res) => {
  try {
    const { cohort } = req.query;
    
    // Simulated retention data
    const cohorts = ['Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024'];
    const data = cohorts.map(() => {
      const week1 = 100;
      return [
        { x: 'Week 1', y: week1 },
        { x: 'Week 2', y: Math.floor(week1 * 0.8) },
        { x: 'Week 3', y: Math.floor(week1 * 0.65) },
        { x: 'Week 4', y: Math.floor(week1 * 0.55) },
        { x: 'Week 5', y: Math.floor(week1 * 0.48) },
        { x: 'Week 6', y: Math.floor(week1 * 0.42) },
        { x: 'Week 7', y: Math.floor(week1 * 0.38) },
        { x: 'Week 8', y: Math.floor(week1 * 0.35) },
      ];
    });

    res.json({ cohorts, data });
  } catch (error) {
    console.error('Error fetching retention data:', error);
    res.status(500).json({ error: 'Failed to fetch retention data' });
  }
});

// Geographic distribution
router.get('/analytics/geographic', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const users = await db.collection('users').find({}).project({ 
      'enhancedProfile.country': 1, 
      'enhancedProfile.state': 1, 
      'enhancedProfile.city': 1 
    }).toArray();
    
    const countryMap = {};
    const stateMap = {};
    const cityMap = {};

    users.forEach(user => {
      const country = user.enhancedProfile?.country || 'Unknown';
      const state = user.enhancedProfile?.state || 'Unknown';
      const city = user.enhancedProfile?.city || 'Unknown';

      countryMap[country] = (countryMap[country] || 0) + 1;
      stateMap[state] = (stateMap[state] || 0) + 1;
      cityMap[city] = (cityMap[city] || 0) + 1;
    });

    const countries = Object.entries(countryMap)
      .map(([name, value]) => ({ id: name.substring(0, 3).toUpperCase(), value }))
      .sort((a, b) => b.value - a.value);

    const topCountries = Object.entries(countryMap)
      .map(([name, users]) => ({
        name,
        users,
        percentage: Math.round((users / users.length) * 100),
      }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 10);

    const topCities = Object.entries(cityMap)
      .map(([name, users]) => ({
        name,
        users,
        country: 'India', // You'd need to map this properly
      }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 10);

    res.json({
      countries,
      topCountries,
      topCities,
      distribution: countries,
    });
  } catch (error) {
    console.error('Error fetching geographic data:', error);
    res.status(500).json({ error: 'Failed to fetch geographic data' });
  }
});

// Professional domains distribution
router.get('/analytics/professional-domains', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const users = await db.collection('users').find({}).project({
      'enhancedProfile.professionalRole': 1,
      'enhancedProfile.domain': 1
    }).toArray();
    
    const domainMap = {};
    users.forEach(user => {
      const domain = user.enhancedProfile?.domain || 'Other';
      domainMap[domain] = (domainMap[domain] || 0) + 1;
    });

    const domains = Object.entries(domainMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    res.json({ domains });
  } catch (error) {
    console.error('Error fetching professional domains:', error);
    res.status(500).json({ error: 'Failed to fetch professional domains' });
  }
});

// Skills distribution
router.get('/analytics/skills', adminAuth, async (req, res) => {
  try {
    // Simulated skills data
    const skillsData = [
      { name: 'JavaScript', demand: 85, supply: 65, size: 120 },
      { name: 'Python', demand: 90, supply: 70, size: 110 },
      { name: 'React', demand: 80, supply: 60, size: 90 },
      { name: 'Node.js', demand: 75, supply: 55, size: 85 },
      { name: 'Machine Learning', demand: 95, supply: 40, size: 75 },
    ];

    const series = skillsData.map(skill => ({
      name: skill.name,
      data: [[skill.demand, skill.supply, skill.size]],
    }));

    res.json({ data: skillsData, series });
  } catch (error) {
    console.error('Error fetching skills data:', error);
    res.status(500).json({ error: 'Failed to fetch skills data' });
  }
});

// Message volume analytics
router.get('/analytics/message-volume', adminAuth, async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    
    // Create heatmap data for message volume by hour and day
    const heatmapData = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourData = {
        name: `${hour}:00`,
        data: [],
      };
      for (let day = 0; day < 7; day++) {
        // Simulate message volume (higher during business hours)
        const baseVolume = hour >= 9 && hour <= 18 ? 50 : 20;
        const variance = Math.floor(Math.random() * 30);
        hourData.data.push(baseVolume + variance);
      }
      heatmapData.push(hourData);
    }

    res.json({ heatmap: heatmapData });
  } catch (error) {
    console.error('Error fetching message volume:', error);
    res.status(500).json({ error: 'Failed to fetch message volume' });
  }
});

// AI performance metrics
router.get('/analytics/ai-performance', adminAuth, async (req, res) => {
  try {
    // Simulated AI performance metrics
    const metrics = {
      score: 92,
      current: [94, 88, 90, 85, 87], // Intent, Response, Satisfaction, Relevance, Context
      historical: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        accuracy: [92, 93, 91, 94, 95, 93, 92],
        responseTime: [1.2, 1.1, 1.3, 1.0, 1.1, 1.2, 1.3],
      },
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching AI performance:', error);
    res.status(500).json({ error: 'Failed to fetch AI performance' });
  }
});

// Popular queries
router.get('/analytics/popular-queries', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const { limit = 50 } = req.query;
    
    const queries = await db.collection('queries').aggregate([
      {
        $group: {
          _id: '$query',
          count: { $sum: 1 },
          lastQueried: { $max: '$timestamp' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
    ]).toArray();

    const formattedQueries = queries.map(q => ({
      text: q._id,
      count: q.count,
      successRate: Math.floor(70 + Math.random() * 30), // Simulated
      lastQueried: q.lastQueried,
    }));

    const patterns = formattedQueries.slice(0, 20).map(q => ({
      query: q.text,
      count: q.count,
    }));

    res.json({
      top: formattedQueries,
      patterns,
    });
  } catch (error) {
    console.error('Error fetching popular queries:', error);
    res.status(500).json({ error: 'Failed to fetch popular queries' });
  }
});

// Growth forecast
router.get('/analytics/growth-forecast', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const currentUsers = await db.collection('users').countDocuments();
    
    // Generate forecast for next 90 days
    const labels = [];
    const actual = [];
    const predicted = [];
    const confidence = [];
    
    for (let i = -30; i <= 60; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      labels.push(date.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
      
      if (i <= 0) {
        // Historical data
        actual.push(currentUsers + Math.floor(i * 2 + Math.random() * 10));
        predicted.push(null);
        confidence.push(null);
      } else {
        // Predictions
        actual.push(null);
        const growth = currentUsers + Math.floor(i * 3 + Math.random() * 15);
        predicted.push(growth);
        confidence.push(growth + Math.floor(Math.random() * 20));
      }
    }

    res.json({ labels, actual, predicted, confidence });
  } catch (error) {
    console.error('Error fetching growth forecast:', error);
    res.status(500).json({ error: 'Failed to fetch growth forecast' });
  }
});

// System health metrics
router.get('/analytics/system-health', adminAuth, async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      database: {
        connected: true,
        responseTime: 12, // ms
      },
      apis: {
        whatsapp: { status: 'operational', latency: 45 },
        openai: { status: 'operational', latency: 120 },
        email: { status: 'operational', latency: 30 },
      },
    };

    res.json(health);
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

// ============= USER MANAGEMENT ENDPOINTS =============

// Advanced user search
router.post('/users/search', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const { query, filters = {}, sort = '-createdAt', page = 1, limit = 50 } = req.body;
    
    let searchQuery = {};
    
    if (query) {
      searchQuery.$or = [
        { 'basicProfile.fullName': { $regex: query, $options: 'i' } },
        { 'basicProfile.email': { $regex: query, $options: 'i' } },
        { 'whatsappNumber': { $regex: query, $options: 'i' } },
      ];
    }

    // Apply filters
    if (filters.country) {
      searchQuery['enhancedProfile.country'] = filters.country;
    }
    if (filters.domain) {
      searchQuery['enhancedProfile.domain'] = filters.domain;
    }
    if (filters.isComplete !== undefined) {
      searchQuery['metadata.isComplete'] = filters.isComplete;
    }

    const skip = (page - 1) * limit;
    const sortObj = {};
    if (sort.startsWith('-')) {
      sortObj[sort.substring(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }
    
    const [users, total] = await Promise.all([
      db.collection('users').find(searchQuery)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('users').countDocuments(searchQuery),
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Bulk user operations
router.post('/users/bulk-update', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const { userIds, updates } = req.body;
    const { ObjectId } = require('mongodb');
    
    const objectIds = userIds.map(id => new ObjectId(id));
    const result = await db.collection('users').updateMany(
      { _id: { $in: objectIds } },
      { $set: updates }
    );

    // Broadcast updates via WebSocket
    userIds.forEach(userId => {
      websocketService.broadcastUserUpdate(userId, updates);
    });

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error bulk updating users:', error);
    res.status(500).json({ error: 'Failed to bulk update users' });
  }
});

// Get user insights
router.get('/users/:id/insights', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { ObjectId } = require('mongodb');
    
    let userQuery;
    try {
      userQuery = { _id: new ObjectId(id) };
    } catch {
      userQuery = { whatsappNumber: id };
    }
    
    const user = await db.collection('users').findOne(userQuery);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [sessions, queries, connections] = await Promise.all([
      db.collection('sessions').find({ userId: user._id }).sort({ createdAt: -1 }).limit(10).toArray(),
      db.collection('queries').find({ userId: user._id }).sort({ timestamp: -1 }).limit(20).toArray(),
      db.collection('users').find({ 
        'enhancedProfile.city': user.enhancedProfile?.city,
        'enhancedProfile.domain': user.enhancedProfile?.domain,
        _id: { $ne: user._id }
      }).limit(5).toArray(),
    ]);

    const insights = {
      profileCompletion: calculateProfileCompletion(user),
      engagementScore: calculateEngagementScore(sessions, queries),
      lastActive: user.lastActive,
      totalSessions: sessions.length,
      totalQueries: queries.length,
      suggestedConnections: connections,
      activityTimeline: generateActivityTimeline(sessions, queries),
    };

    res.json(insights);
  } catch (error) {
    console.error('Error fetching user insights:', error);
    res.status(500).json({ error: 'Failed to fetch user insights' });
  }
});

// ============= EXPORT ENDPOINTS =============

// Export users
router.post('/export/users', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const { format = 'csv', filters = {} } = req.body;
    
    const users = await db.collection('users').find(filters).toArray();
    
    if (format === 'csv') {
      const fields = [
        'whatsappNumber',
        'basicProfile.fullName',
        'basicProfile.email',
        'enhancedProfile.country',
        'enhancedProfile.city',
        'enhancedProfile.professionalRole',
        'metadata.isComplete',
        'createdAt',
      ];
      
      const parser = new Parser({ fields });
      const csv = parser.parse(users);
      
      res.header('Content-Type', 'text/csv');
      res.attachment('users_export.csv');
      res.send(csv);
    } else if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Users');
      
      worksheet.columns = [
        { header: 'WhatsApp', key: 'whatsapp', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Country', key: 'country', width: 15 },
        { header: 'City', key: 'city', width: 20 },
        { header: 'Role', key: 'role', width: 25 },
        { header: 'Complete', key: 'complete', width: 10 },
        { header: 'Joined', key: 'joined', width: 15 },
      ];

      users.forEach(user => {
        worksheet.addRow({
          whatsapp: user.whatsappNumber,
          name: user.basicProfile?.fullName,
          email: user.basicProfile?.email,
          country: user.enhancedProfile?.country,
          city: user.enhancedProfile?.city,
          role: user.enhancedProfile?.professionalRole,
          complete: user.metadata?.isComplete ? 'Yes' : 'No',
          joined: user.createdAt?.toLocaleDateString(),
        });
      });

      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('users_export.xlsx');
      
      const buffer = await workbook.xlsx.writeBuffer();
      res.send(buffer);
    } else {
      res.json(users);
    }
  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({ error: 'Failed to export users' });
  }
});

// Helper functions
function calculateProfileCompletion(user) {
  const fields = [
    'basicProfile.fullName',
    'basicProfile.email',
    'enhancedProfile.gender',
    'enhancedProfile.dateOfBirth',
    'enhancedProfile.phone',
    'enhancedProfile.professionalRole',
    'enhancedProfile.domain',
    'enhancedProfile.country',
    'enhancedProfile.city',
  ];

  let completed = 0;
  fields.forEach(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], user);
    if (value) completed++;
  });

  return Math.round((completed / fields.length) * 100);
}

function calculateEngagementScore(sessions, queries) {
  const sessionScore = Math.min(sessions.length * 10, 50);
  const queryScore = Math.min(queries.length * 5, 50);
  return sessionScore + queryScore;
}

function generateActivityTimeline(sessions, queries) {
  const timeline = [];
  
  sessions.forEach(session => {
    timeline.push({
      type: 'session',
      timestamp: session.createdAt,
      description: 'Started a session',
    });
  });

  queries.forEach(query => {
    timeline.push({
      type: 'query',
      timestamp: query.timestamp,
      description: `Searched: ${query.query}`,
    });
  });

  return timeline.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
}

module.exports = router;