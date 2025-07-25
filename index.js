// Vercel serverless function entry point
// This file is specifically for Vercel deployment

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import only the routes needed for profile form
const profileFormRoutes = require('./web/routes/profileFormRoutes');
const { connectDatabase } = require('./src/config/database');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Serve static files from web/public
app.use(express.static(path.join(__dirname, 'web/public')));

// Session middleware for profile form
app.use((req, res, next) => {
    req.session = req.session || {};
    next();
});

// Connect to database when needed
let dbConnected = false;
let dbConnectionPromise = null;

app.use(async (req, res, next) => {
    if (!dbConnected && (req.path.startsWith('/api/') || req.method === 'POST')) {
        try {
            // Use a single connection promise to avoid multiple connections
            if (!dbConnectionPromise) {
                console.log('Initiating database connection...');
                console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
                console.log('DB_NAME:', process.env.DB_NAME);
                dbConnectionPromise = connectDatabase();
            }
            await dbConnectionPromise;
            dbConnected = true;
            console.log('Database connected successfully');
        } catch (error) {
            console.error('Database connection error:', error.message);
            // For critical endpoints, return error
            if (req.path === '/api/submit-profile' || req.path === '/api/user-data') {
                return res.status(503).json({ 
                    error: 'Database connection failed. Please try again later.',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
            // Continue anyway for other routes
        }
    }
    next();
});

// Mount profile form routes AFTER database middleware
app.use('/', profileFormRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
    const { isDbConnected } = require('./src/config/database');
    res.json({ 
        status: 'ok', 
        service: 'JyAibot Profile Form',
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Export for Vercel
module.exports = app;

// For local testing
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Profile form server running on http://localhost:${PORT}`);
        console.log(`Test the form at: http://localhost:${PORT}/profile-setup?token=test123&wa=+919876543210`);
    });
}