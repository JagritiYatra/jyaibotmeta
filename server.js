// Main server entry point - Express.js server with enhanced JY Alumni Bot
// Handles initialization, middleware setup, and route mounting

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

// Import configurations and services
const { connectDatabase } = require('./src/config/database');
const { validateEnvironment } = require('./src/config/environment');
const webhookMetaRoutes = require('./src/routes/webhookMeta');
const healthRoutes = require('./src/routes/health');
const adminRoutes = require('./src/routes/admin');
const adminEnhancedRoutes = require('./src/routes/adminEnhancedRoutes');
const profileFormRoutes = require('./web/routes/profileFormRoutes');
const emailVerificationRoutes = require('./src/routes/emailVerification');
const plainFormRoutes = require('./src/routes/plainFormSubmission');
const websocketService = require('./src/services/websocketService');
const { requestLogger } = require('./src/middleware/logging');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandlers');

const app = express();
const server = http.createServer(app);

// Validate environment variables on startup
validateEnvironment();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://jyaibot-profile-form.vercel.app',
    'https://jyaibot-meta.vercel.app',
    /\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware setup
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors(corsOptions));
app.use(requestLogger);

// Serve static files for admin dashboard
app.use('/admin', express.static('admin-dashboard/build'));

// Serve static files for profile form
app.use(express.static('web/public'));

// Routes
app.use('/webhook', webhookMetaRoutes);
app.use('/health', healthRoutes);
app.use('/api/admin', require('./src/routes/adminRealDataRoutes')); // Use REAL data routes
app.use('/api/admin/enhanced', adminEnhancedRoutes); // Keep enhanced routes as backup
app.use('/api/admin/legacy', adminRoutes); // Keep legacy routes for backward compatibility
app.use('/api/email-verification', emailVerificationRoutes);
app.use('/api/plain-form', plainFormRoutes);
app.use('/', profileFormRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database connection
connectDatabase();

// Initialize WebSocket service
websocketService.initialize(server);

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received - shutting down gracefully...');
  websocketService.cleanup();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received - shutting down gracefully...');
  websocketService.cleanup();
  server.close(() => {
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🎉 ===============================================');
  console.log('🌟 JY ALUMNI NETWORK BOT v3.0 - ENHANCED PROFILE SYSTEM');
  console.log('🎉 ===============================================\n');

  console.log('🔧 NEW ENHANCED FEATURES:');
  console.log('   ✅ Comprehensive Profile Data Collection');
  console.log('   ✅ AI-Powered Input Validation');
  console.log('   ✅ Multiple Email Support & Linking');
  console.log('   ✅ Enhanced Professional Domains');
  console.log('   ✅ Community Give & Ask System');
  console.log('   ✅ Modular Architecture for Easy Maintenance');
  console.log('   🚀 Real-time WebSocket Dashboard Updates');
  console.log('   📊 Advanced Analytics & Visualizations');
  console.log('   🎨 Futuristic UI/UX with Dark Mode\n');

  console.log('📊 Profile Fields Enhanced:');
  console.log('   📝 20+ Comprehensive Profile Fields');
  console.log('   🤖 AI Validation for Each Input');
  console.log('   📧 Multiple Email Linking Support');
  console.log('   🌍 Geographic Data Validation');
  console.log('   🎯 Community Contribution Mapping\n');

  console.log('🎮 Admin Dashboard Features:');
  console.log('   📈 Real-time Metrics & KPIs');
  console.log('   🗺️ Geographic Heat Maps');
  console.log('   🔍 Advanced User Search & Filters');
  console.log('   💬 Conversation Analytics');
  console.log('   🤖 AI Performance Monitoring');
  console.log('   📊 Predictive Analytics');
  console.log('   📥 Data Export (CSV/Excel/JSON)');
  console.log('   🌓 Dark/Light Theme Support\n');

  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`🔌 WebSocket server active on same port`);
  console.log(`👁️  Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log('🎯 Ready for enhanced user profile collection! 🎯\n');
});

module.exports = app;
