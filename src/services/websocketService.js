const { Server } = require('socket.io');
const os = require('os');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connections = new Map();
    this.metrics = {
      activeUsers: 0,
      messagesPerMinute: 0,
      apiLatency: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      dbConnections: 0,
    };
    this.messageCounter = [];
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3001',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    this.startMetricsCollection();
    
    console.log('WebSocket service initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`New WebSocket connection: ${socket.id}`);
      
      // Store connection
      this.connections.set(socket.id, {
        connectedAt: new Date(),
        userId: null,
      });

      // Authentication (simplified for now - you can add JWT later)
      socket.on('authenticate', (token) => {
        // For now, just mark as authenticated
        this.connections.get(socket.id).userId = token;
        socket.join('authenticated');
        socket.emit('authenticated', { success: true });
      });

      // Join rooms
      socket.on('join:room', (room) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
      });

      // Leave rooms
      socket.on('leave:room', (room) => {
        socket.leave(room);
        console.log(`Socket ${socket.id} left room: ${room}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`WebSocket disconnected: ${socket.id}`);
        this.connections.delete(socket.id);
      });

      // Custom events
      socket.on('request:metrics', () => {
        socket.emit('metrics:update', this.metrics);
      });

      socket.on('request:analytics', (type) => {
        this.emitAnalytics(socket, type);
      });
    });
  }

  startMetricsCollection() {
    // Collect system metrics every 5 seconds
    setInterval(() => {
      this.collectSystemMetrics();
      this.broadcastMetrics();
    }, 5000);

    // Calculate messages per minute
    setInterval(() => {
      const now = Date.now();
      this.messageCounter = this.messageCounter.filter(
        timestamp => now - timestamp < 60000
      );
      this.metrics.messagesPerMinute = this.messageCounter.length;
    }, 1000);
  }

  collectSystemMetrics() {
    // CPU usage
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    this.metrics.cpuUsage = usage;

    // Memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    this.metrics.memoryUsage = Math.round((usedMem / totalMem) * 100);

    // Active connections
    this.metrics.activeUsers = this.connections.size;

    // Database connections (placeholder - integrate with your DB)
    this.metrics.dbConnections = Math.floor(Math.random() * 20) + 10;

    // API latency (placeholder - integrate with your monitoring)
    this.metrics.apiLatency = Math.floor(Math.random() * 50) + 20;
  }

  broadcastMetrics() {
    this.io.emit('metrics:update', this.metrics);
  }

  // Emit events to specific rooms or all clients
  emit(event, data, room = null) {
    if (room) {
      this.io.to(room).emit(event, data);
    } else {
      this.io.emit(event, data);
    }
  }

  // Emit to specific socket
  emitToSocket(socketId, event, data) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  // Broadcast user updates
  broadcastUserUpdate(userId, data) {
    this.emit('user:update', { userId, ...data }, 'authenticated');
  }

  // Broadcast session updates
  broadcastSessionUpdate(sessionId, data) {
    this.emit('session:update', { sessionId, ...data }, 'authenticated');
  }

  // Broadcast new message
  broadcastNewMessage(message) {
    this.messageCounter.push(Date.now());
    this.emit('message:new', message, 'authenticated');
  }

  // Broadcast analytics update
  broadcastAnalyticsUpdate(type, data) {
    this.emit('analytics:update', { type, data }, 'authenticated');
  }

  // Send notification
  sendNotification(notification) {
    this.emit('notification:new', {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...notification,
    }, 'authenticated');
  }

  // Send alert
  sendAlert(alert) {
    this.emit('metrics:alert', {
      timestamp: new Date(),
      ...alert,
    }, 'authenticated');
  }

  // Emit analytics data
  emitAnalytics(socket, type) {
    // This would fetch real analytics data from your database
    const mockData = {
      userGrowth: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        totalUsers: [100, 150, 200, 280, 350, 420],
        activeUsers: [80, 120, 160, 220, 280, 340],
      },
      engagement: {
        dau: 340,
        mau: 420,
        sessionLength: 12.5,
        stickiness: 81,
        churnRate: 3.2,
      },
      geographic: {
        countries: [
          { id: 'IND', value: 450 },
          { id: 'USA', value: 200 },
          { id: 'GBR', value: 100 },
          { id: 'CAN', value: 80 },
          { id: 'AUS', value: 60 },
        ],
        topCountries: [
          { name: 'India', users: 450, percentage: 45 },
          { name: 'United States', users: 200, percentage: 20 },
          { name: 'United Kingdom', users: 100, percentage: 10 },
          { name: 'Canada', users: 80, percentage: 8 },
          { name: 'Australia', users: 60, percentage: 6 },
        ],
        topCities: [
          { name: 'Bangalore', users: 120, country: 'India' },
          { name: 'Delhi', users: 100, country: 'India' },
          { name: 'Mumbai', users: 80, country: 'India' },
          { name: 'New York', users: 60, country: 'USA' },
          { name: 'London', users: 50, country: 'UK' },
        ],
      },
    };

    socket.emit(`analytics:${type}`, mockData[type] || {});
  }

  // Get connection stats
  getConnectionStats() {
    const stats = {
      totalConnections: this.connections.size,
      authenticatedConnections: 0,
      averageConnectionTime: 0,
    };

    let totalTime = 0;
    const now = new Date();

    this.connections.forEach(conn => {
      if (conn.userId) {
        stats.authenticatedConnections++;
      }
      totalTime += (now - conn.connectedAt) / 1000; // in seconds
    });

    if (stats.totalConnections > 0) {
      stats.averageConnectionTime = Math.round(totalTime / stats.totalConnections);
    }

    return stats;
  }

  // Cleanup
  cleanup() {
    if (this.io) {
      this.io.close();
    }
    this.connections.clear();
  }
}

module.exports = new WebSocketService();