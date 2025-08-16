// CRUD Backend Server for JY Alumni Bot Database Management
// File: crud-server.js
// Run this separately from your main bot to access database management interface

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.CRUD_PORT || 4000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
let db;
let client;

async function connectToDatabase() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        const dbName = process.env.DB_NAME || 'jagriti_yatra_community';
        
        if (!mongoUri) {
            console.error('❌ MONGODB_URI not found in environment variables');
            process.exit(1);
        }

        client = new MongoClient(mongoUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: 'majority',
            readPreference: 'primary',
            readConcern: { level: 'majority' },
            directConnection: false
        });

        await client.connect();
        db = client.db(dbName);
        
        console.log('✅ Connected to MongoDB for CRUD operations');
        console.log(`📁 Database: ${dbName}`);
        
        // Test connection
        const collections = await db.listCollections().toArray();
        console.log(`📋 Available collections: ${collections.map(c => c.name).join(', ')}`);
        
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        return false;
    }
}

// Serve the CRUD interface HTML
app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'crud-interface.html');
    
    // If the HTML file doesn't exist, create it
    if (!fs.existsSync(htmlPath)) {
        console.log('📝 Creating CRUD interface HTML file...');
        // You would copy the HTML content from the artifact here
        // For now, we'll serve a simple message
        res.send(`
            <h1>JY Alumni Bot CRUD Interface</h1>
            <p>Please create 'crud-interface.html' file with the interface content.</p>
            <p>Or access the API directly at:</p>
            <ul>
                <li><a href="/api/stats">/api/stats</a> - Database statistics</li>
                <li><a href="/api/users">/api/users</a> - Users collection</li>
                <li><a href="/api/sessions">/api/sessions</a> - Sessions collection</li>
                <li><a href="/api/health">/api/health</a> - Health check</li>
            </ul>
        `);
        return;
    }
    
    res.sendFile(htmlPath);
});

// Force refresh endpoint - creates new connection
app.get('/api/refresh', async (req, res) => {
    try {
        console.log('Force refreshing database connection...');
        
        // Close existing connection
        if (client) {
            await client.close();
            console.log('Closed existing connection');
        }
        
        // Create new connection
        const mongoUri = process.env.MONGODB_URI;
        client = new MongoClient(mongoUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: 'majority',
            readPreference: 'primaryPreferred',
            readConcern: { level: 'local' }
        });
        
        await client.connect();
        db = client.db(process.env.DB_NAME || 'jagriti_yatra_community');
        
        console.log('✅ Database connection refreshed');
        
        // Test query to verify
        const testUsers = await db.collection('users').find({
            $or: [
                { 'basicProfile.email': 'techakash@jagritiyatra.com' },
                { 'basicProfile.email': 'cvresumehelpline@gmail.com' }
            ]
        }).toArray();
        
        res.json({
            status: 'refreshed',
            timestamp: new Date().toISOString(),
            testUsers: testUsers.map(u => ({
                email: u.basicProfile?.email,
                name: u.enhancedProfile?.fullName || u.basicProfile?.name,
                lastUpdated: u.lastUpdated
            }))
        });
        
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ status: 'error', message: 'Database not connected' });
        }
        
        await db.admin().ping();
        res.json({ 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            database: 'connected',
            server: 'running'
        });
    } catch (error) {
        res.status(503).json({ 
            status: 'error', 
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Database statistics endpoint
app.get('/api/stats', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const stats = {};
        const collections = ['users', 'sessions', 'queries', 'otps', 'cooldowns', 'user_stats'];
        
        for (const collection of collections) {
            try {
                stats[collection] = await db.collection(collection).countDocuments();
            } catch (error) {
                stats[collection] = 0;
            }
        }

        res.json(stats);
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generic collection endpoints
const collections = ['users', 'sessions', 'queries', 'otps', 'cooldowns', 'user_stats'];

collections.forEach(collectionName => {
    // GET collection with search, pagination, and filtering
    app.get(`/api/${collectionName}`, async (req, res) => {
        try {
            if (!db) {
                return res.status(503).json({ error: 'Database not connected' });
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;
            const search = req.query.search || '';
            
            let query = {};
            
            // Build search query
            if (search) {
                query = buildSearchQuery(collectionName, search);
            }
            
            // Apply filters
            const filters = applyCollectionFilters(collectionName, req.query);
            query = { ...query, ...filters };
            
            const collection = db.collection(collectionName);
            
            // Get total count
            const total = await collection.countDocuments(query);
            
            // Get paginated data
            const data = await collection
                .find(query)
                .sort({ _id: -1 }) // Most recent first
                .skip(skip)
                .limit(limit)
                .toArray();
            
            res.json({
                data,
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            });
            
        } catch (error) {
            console.error(`Error fetching ${collectionName}:`, error);
            res.status(500).json({ error: error.message });
        }
    });
    
    // GET single document
    app.get(`/api/${collectionName}/:id`, async (req, res) => {
        try {
            if (!db) {
                return res.status(503).json({ error: 'Database not connected' });
            }

            const collection = db.collection(collectionName);
            const doc = await collection.findOne({ _id: new ObjectId(req.params.id) });
            
            if (!doc) {
                return res.status(404).json({ error: 'Document not found' });
            }
            
            res.json(doc);
        } catch (error) {
            console.error(`Error fetching ${collectionName} document:`, error);
            res.status(500).json({ error: error.message });
        }
    });
    
    // POST new document
    app.post(`/api/${collectionName}`, async (req, res) => {
        try {
            if (!db) {
                return res.status(503).json({ error: 'Database not connected' });
            }

            const collection = db.collection(collectionName);
            const doc = req.body;
            
            // Add metadata
            doc.createdAt = new Date();
            doc.updatedAt = new Date();
            
            const result = await collection.insertOne(doc);
            
            res.status(201).json({
                _id: result.insertedId,
                message: 'Document created successfully'
            });
            
        } catch (error) {
            console.error(`Error creating ${collectionName} document:`, error);
            res.status(500).json({ error: error.message });
        }
    });
    
    // PUT update document
    app.put(`/api/${collectionName}/:id`, async (req, res) => {
        try {
            if (!db) {
                return res.status(503).json({ error: 'Database not connected' });
            }

            const collection = db.collection(collectionName);
            const doc = req.body;
            
            // Remove _id from update data if present
            delete doc._id;
            
            // Add update metadata
            doc.updatedAt = new Date();
            
            const result = await collection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: doc }
            );
            
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Document not found' });
            }
            
            res.json({ message: 'Document updated successfully' });
            
        } catch (error) {
            console.error(`Error updating ${collectionName} document:`, error);
            res.status(500).json({ error: error.message });
        }
    });
    
    // DELETE document
    app.delete(`/api/${collectionName}/:id`, async (req, res) => {
        try {
            if (!db) {
                return res.status(503).json({ error: 'Database not connected' });
            }

            const collection = db.collection(collectionName);
            const result = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
            
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Document not found' });
            }
            
            res.json({ message: 'Document deleted successfully' });
            
        } catch (error) {
            console.error(`Error deleting ${collectionName} document:`, error);
            res.status(500).json({ error: error.message });
        }
    });
    
    // Export collection to CSV
    app.get(`/api/${collectionName}/export`, async (req, res) => {
        try {
            if (!db) {
                return res.status(503).json({ error: 'Database not connected' });
            }

            const collection = db.collection(collectionName);
            const data = await collection.find({}).limit(1000).toArray(); // Limit for performance
            
            if (data.length === 0) {
                return res.status(404).json({ error: 'No data to export' });
            }
            
            const csv = convertToCSV(data);
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${collectionName}_export.csv"`);
            res.send(csv);
            
        } catch (error) {
            console.error(`Error exporting ${collectionName}:`, error);
            res.status(500).json({ error: error.message });
        }
    });
});

// Cleanup endpoints
app.post('/api/sessions/cleanup', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - 48); // 48 hours ago
        
        const result = await db.collection('sessions').deleteMany({
            lastActivity: { $lt: cutoffTime }
        });
        
        res.json({
            message: 'Expired sessions cleaned',
            deletedCount: result.deletedCount
        });
        
    } catch (error) {
        console.error('Error cleaning sessions:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/otps/cleanup', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const now = new Date();
        const result = await db.collection('otps').deleteMany({
            expiresAt: { $lt: now }
        });
        
        res.json({
            message: 'Expired OTPs cleaned',
            deletedCount: result.deletedCount
        });
        
    } catch (error) {
        console.error('Error cleaning OTPs:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cooldowns/cleanup', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const now = new Date();
        const result = await db.collection('cooldowns').deleteMany({
            expiresAt: { $lt: now }
        });
        
        res.json({
            message: 'Expired cooldowns cleaned',
            deletedCount: result.deletedCount
        });
        
    } catch (error) {
        console.error('Error cleaning cooldowns:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bulk operations
app.post('/api/:collection/bulk-delete', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const { collection: collectionName } = req.params;
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: 'Invalid IDs array' });
        }
        
        const objectIds = ids.map(id => new ObjectId(id));
        const result = await db.collection(collectionName).deleteMany({
            _id: { $in: objectIds }
        });
        
        res.json({
            message: 'Bulk delete completed',
            deletedCount: result.deletedCount
        });
        
    } catch (error) {
        console.error('Error in bulk delete:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper functions
function buildSearchQuery(collectionName, searchTerm) {
    const searchRegex = { $regex: searchTerm, $options: 'i' };
    
    switch (collectionName) {
        case 'users':
            return {
                $or: [
                    { 'basicProfile.name': searchRegex },
                    { 'basicProfile.email': searchRegex },
                    { 'enhancedProfile.fullName': searchRegex },
                    { 'enhancedProfile.city': searchRegex },
                    { 'enhancedProfile.professionalRole': searchRegex },
                    { 'whatsappNumber': searchRegex }
                ]
            };
            
        case 'sessions':
            return {
                $or: [
                    { 'whatsappNumber': searchRegex },
                    { 'sessionData.waiting_for': searchRegex }
                ]
            };
            
        case 'queries':
            return {
                $or: [
                    { 'query': searchRegex },
                    { 'whatsappNumber': searchRegex },
                    { 'queryType': searchRegex }
                ]
            };
            
        case 'otps':
            return {
                $or: [
                    { 'email': searchRegex }
                ]
            };
            
        case 'cooldowns':
            return {
                $or: [
                    { 'whatsappNumber': searchRegex },
                    { 'reason': searchRegex }
                ]
            };
            
        case 'user_stats':
            return {
                $or: [
                    { 'whatsappNumber': searchRegex }
                ]
            };
            
        default:
            return {};
    }
}

function applyCollectionFilters(collectionName, queryParams) {
    const filters = {};
    
    switch (collectionName) {
        case 'users':
            if (queryParams.profileComplete !== undefined) {
                filters['enhancedProfile.completed'] = queryParams.profileComplete === 'true';
            }
            if (queryParams.role) {
                filters['enhancedProfile.professionalRole'] = queryParams.role;
            }
            break;
            
        case 'queries':
            if (queryParams.queryType) {
                filters.queryType = queryParams.queryType;
            }
            if (queryParams.dateRange) {
                const now = new Date();
                let startDate;
                
                switch (queryParams.dateRange) {
                    case 'today':
                        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        break;
                    case 'week':
                        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case 'month':
                        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
                        break;
                }
                
                if (startDate) {
                    filters.timestamp = { $gte: startDate };
                }
            }
            break;
            
    }
    
    return filters;
}

function convertToCSV(data) {
    if (!data.length) return '';
    
    const headers = new Set();
    
    // Collect all possible headers
    data.forEach(item => {
        const flattened = flattenObject(item);
        Object.keys(flattened).forEach(key => headers.add(key));
    });
    
    const headerArray = Array.from(headers);
    const csvRows = [headerArray.join(',')];
    
    data.forEach(item => {
        const flattened = flattenObject(item);
        const values = headerArray.map(header => {
            const value = flattened[header] || '';
            // Escape quotes and wrap in quotes
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
}

function flattenObject(obj, prefix = '') {
    const flattened = {};
    
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
                Object.assign(flattened, flattenObject(obj[key], newKey));
            } else {
                flattened[newKey] = obj[key];
            }
        }
    }
    
    return flattened;
}

// Plain Form Submissions endpoint
app.get('/api/plain-form-submissions', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        
        let query = {
            'enhancedProfile.formFilledVia': 'plain_link'  // Changed from 'plain_form' to 'plain_link'
        };
        
        // Build search query
        if (search) {
            query.$or = [
                { 'enhancedProfile.fullName': { $regex: search, $options: 'i' } },
                { 'enhancedProfile.email': { $regex: search, $options: 'i' } },
                { 'enhancedProfile.linkedInProfile': { $regex: search, $options: 'i' } }
            ];
        }
        
        const collection = db.collection('users');
        
        // Get total count
        const total = await collection.countDocuments(query);
        
        // Get paginated data with only form-filled profiles
        const data = await collection
            .find(query)
            .sort({ 'enhancedProfile.formFilledAt': -1 }) // Most recent submissions first
            .skip(skip)
            .limit(limit)
            .toArray();
        
        res.json({
            data,
            total,
            page,
            pages: Math.ceil(total / limit),
            limit
        });
        
    } catch (error) {
        console.error('Error fetching plain form submissions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get recent profiles with suggestions highlighting
app.get('/api/recent-profiles-with-suggestions', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const daysAgo = parseInt(req.query.daysAgo) || 7; // Default to last 7 days
        
        // Calculate date filter
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        
        let query = {
            'enhancedProfile.formFilledVia': 'plain_link',  // Changed from 'plain_form' to 'plain_link'
            'enhancedProfile.formFilledAt': { $gte: cutoffDate },
            'enhancedProfile.suggestions': { $exists: true, $ne: '' }
        };
        
        // Build search query
        if (search) {
            query.$or = [
                { 'enhancedProfile.fullName': { $regex: search, $options: 'i' } },
                { 'enhancedProfile.email': { $regex: search, $options: 'i' } },
                { 'enhancedProfile.suggestions': { $regex: search, $options: 'i' } }
            ];
        }
        
        const collection = db.collection('users');
        
        // Get total count
        const total = await collection.countDocuments(query);
        
        // Get paginated data with suggestions highlighted
        const data = await collection
            .find(query)
            .sort({ 'enhancedProfile.formFilledAt': -1 }) // Most recent first
            .skip(skip)
            .limit(limit)
            .project({
                'whatsappNumber': 1,
                'enhancedProfile.fullName': 1,
                'enhancedProfile.email': 1,
                'enhancedProfile.phone': 1,
                'enhancedProfile.linkedInProfile': 1,
                'enhancedProfile.instagramProfile': 1,
                'enhancedProfile.professionalRole': 1,
                'enhancedProfile.city': 1,
                'enhancedProfile.industry': 1,
                'enhancedProfile.suggestions': 1,
                'enhancedProfile.formFilledAt': 1,
                'enhancedProfile.formFilledVia': 1
            })
            .toArray();
        
        res.json({
            data,
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
            daysAgo
        });
        
    } catch (error) {
        console.error('Error fetching recent profiles with suggestions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Export suggestions to CSV
app.get('/api/export-suggestions', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const daysAgo = parseInt(req.query.daysAgo) || 30; // Default to last 30 days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        
        const collection = db.collection('users');
        
        // Find all users with suggestions
        const users = await collection
            .find({ 
                'enhancedProfile.suggestions': { $exists: true, $ne: '' },
                'enhancedProfile.formFilledAt': { $gte: cutoffDate }
            })
            .project({
                'whatsappNumber': 1,
                'enhancedProfile.fullName': 1,
                'enhancedProfile.email': 1,
                'enhancedProfile.phone': 1,
                'enhancedProfile.linkedInProfile': 1,
                'enhancedProfile.instagramProfile': 1,
                'enhancedProfile.professionalRole': 1,
                'enhancedProfile.city': 1,
                'enhancedProfile.industry': 1,
                'enhancedProfile.suggestions': 1,
                'enhancedProfile.formFilledAt': 1
            })
            .sort({ 'enhancedProfile.formFilledAt': -1 })
            .toArray();
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'No profiles with suggestions found' });
        }
        
        // Create CSV format with suggestions prominently displayed
        let csv = 'Name,Email,Phone,Role,City,Industry,Suggestions/Feedback,LinkedIn,Instagram,Submitted Date\n';
        
        users.forEach(user => {
            const profile = user.enhancedProfile || {};
            const row = [
                profile.fullName || '',
                profile.email || '',
                profile.phone || user.whatsappNumber || '',
                profile.professionalRole || '',
                profile.city || '',
                profile.industry || '',
                profile.suggestions || 'No suggestions provided',
                profile.linkedInProfile || '',
                profile.instagramProfile || '',
                profile.formFilledAt ? new Date(profile.formFilledAt).toISOString() : ''
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
            csv += row + '\n';
        });
        
        const timestamp = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="profile_suggestions_${timestamp}.csv"`);
        res.send(csv);
        
    } catch (error) {
        console.error('Error exporting suggestions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Export LinkedIn IDs endpoint
app.get('/api/export-linkedin-ids', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const collection = db.collection('users');
        
        // Find all users with LinkedIn profiles
        const users = await collection
            .find({ 
                'enhancedProfile.linkedInProfile': { $exists: true, $ne: '' }
            })
            .project({
                'enhancedProfile.fullName': 1,
                'enhancedProfile.email': 1,
                'enhancedProfile.linkedInProfile': 1,
                'enhancedProfile.professionalRole': 1,
                'enhancedProfile.city': 1,
                'enhancedProfile.formFilledAt': 1
            })
            .toArray();
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'No LinkedIn profiles found' });
        }
        
        // Create CSV format
        let csv = 'Name,Email,LinkedIn URL,Role,City,Form Submitted Date\n';
        
        users.forEach(user => {
            const profile = user.enhancedProfile || {};
            const row = [
                profile.fullName || '',
                profile.email || '',
                profile.linkedInProfile || '',
                profile.professionalRole || '',
                profile.city || '',
                profile.formFilledAt ? new Date(profile.formFilledAt).toISOString() : ''
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
            csv += row + '\n';
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="linkedin_profiles_export.csv"');
        res.send(csv);
        
    } catch (error) {
        console.error('Error exporting LinkedIn IDs:', error);
        res.status(500).json({ error: error.message });
    }
});

// Analytics endpoints
app.get('/api/analytics/dashboard', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const timeframe = req.query.timeframe || '24h';
        let startTime;
        const now = new Date();
        
        switch (timeframe) {
            case '1h':
                startTime = new Date(now - 60 * 60 * 1000);
                break;
            case '24h':
                startTime = new Date(now - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
                break;
            default:
                startTime = new Date(now - 24 * 60 * 60 * 1000);
        }
        
        const [userCount, sessionCount, queryCount, activeOTPs] = await Promise.all([
            db.collection('users').countDocuments(),
            db.collection('sessions').countDocuments({
                lastActivity: { $gte: startTime }
            }),
            db.collection('queries').countDocuments({
                timestamp: { $gte: startTime }
            }),
            db.collection('otps').countDocuments({
                expiresAt: { $gt: now }
            })
        ]);
        
        const analytics = {
            timeframe,
            period: {
                start: startTime.toISOString(),
                end: now.toISOString()
            },
            stats: {
                totalUsers: userCount,
                activeSessions: sessionCount,
                recentQueries: queryCount,
                activeOTPs: activeOTPs
            }
        };
        
        res.json(analytics);
        
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔄 SIGTERM received - shutting down gracefully...');
    if (client) {
        await client.close();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🔄 SIGINT received - shutting down gracefully...');
    if (client) {
        await client.close();
    }
    process.exit(0);
});

// Start server
async function startServer() {
    const connected = await connectToDatabase();
    
    if (!connected) {
        console.log('⚠️ Starting server without database connection (some features will be limited)');
    }
    
    app.listen(PORT, () => {
        console.log('\n🎉 ===============================================');
        console.log('🌟 JY ALUMNI BOT - DATABASE CRUD MANAGER');
        console.log('🎉 ===============================================\n');
        
        console.log('🔧 CRUD FEATURES:');
        console.log('   ✅ View all database collections');
        console.log('   ✅ Search and filter data');
        console.log('   ✅ Add, edit, delete documents');
        console.log('   ✅ Export data to CSV');
        console.log('   ✅ Database statistics and analytics');
        console.log('   ✅ Cleanup expired records\n');
        
        console.log('📊 Available Collections:');
        console.log('   👥 Users - Alumni profiles and data');
        console.log('   🔐 Sessions - User session management');
        console.log('   🔍 Queries - Search queries and analytics');
        console.log('   📧 OTPs - Email verification codes');
        console.log('   ⏸️ Cooldowns - Rate limiting records');
        console.log('   📋 System Logs - Application logs');
        console.log('   📊 User Stats - Usage statistics\n');
        
        console.log(`🌐 CRUD Interface running on: http://localhost:${PORT}`);
        console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
        console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
        console.log(`📊 Database Stats: http://localhost:${PORT}/api/stats\n`);
        
        console.log('🔗 Quick API Endpoints:');
        console.log(`   GET  /api/users - List all users`);
        console.log(`   GET  /api/sessions - List all sessions`);
        console.log(`   GET  /api/queries - List all queries`);
        console.log(`   POST /api/sessions/cleanup - Clean expired sessions`);
        console.log(`   GET  /api/users/export - Export users to CSV\n`);
        
        console.log('🎯 Ready for database management! 🎯\n');
    });
}

startServer();