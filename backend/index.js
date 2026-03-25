require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');

// Import configuration and services
const dataStore = require('./services/dataStore');
const userService = require('./services/userService');
const metricsWS = require('./websocket/metricsWS');
const alertService = require('./services/alertService');
const alertChecker = require('./services/alertChecker');
const emailService = require('./services/emailService');
const dingtalkService = require('./services/dingtalkService');
const aiService = require('./services/aiService');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agent');
const metricsRoutes = require('./routes/metrics');
const alertRoutes = require('./routes/alert');
const aiRoutes = require('./routes/ai');
const usersRoutes = require('./routes/users');
const reportsRoutes = require('./routes/reports');

// Create Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      redis: dataStore.initialized,
      websocket: metricsWS.getConnectionCount()
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/alert', alertRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reports', reportsRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Initialize services
async function initialize() {
  try {
    // Create logs directory
    const fs = require('fs');
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
    }

    // Initialize data store
    await dataStore.initialize();
    
    // Initialize default admin user
    await userService.initializeDefaultAdmin();

    // Initialize WebSocket
    metricsWS.initialize(server);
    
    // Mount WebSocket server globally for routes
    global.wss = metricsWS;

    // Initialize alert service
    await alertService.initialize();
    
    // Initialize email service
    await emailService.initialize();
    
    // Initialize DingTalk service
    dingtalkService.initialize();
    
    // Initialize AI service
    aiService.initialize();
    
    // Start alert checker
    alertChecker.start();

    // Start server
    const PORT = process.env.PORT || 3000;
    const HOST = process.env.HOST || '127.0.0.1';
    server.listen(PORT, HOST, () => {
      logger.info(`EOMS Backend Server running on http://${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`WebSocket available at ws://${HOST}:${PORT}/ws/metrics`);
    });

  } catch (error) {
    logger.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    logger.info('HTTP server closed');
    alertChecker.stop();
    await dataStore.close();
    metricsWS.close();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    logger.info('HTTP server closed');
    alertChecker.stop();
    await dataStore.close();
    metricsWS.close();
    process.exit(0);
  });
});

// Start application
initialize();
