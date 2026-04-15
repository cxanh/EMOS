require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');

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
const { resolveServerBinding } = require('./config/serverConfig');
const { authenticateToken } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agent');
const metricsRoutes = require('./routes/metrics');
const alertRoutes = require('./routes/alert');
const aiRoutes = require('./routes/ai');
const { createAiV2Router } = require('./routes/aiV2');
const usersRoutes = require('./routes/users');
const reportsRoutes = require('./routes/reports');

function createApp({ skipRequestLogging = false } = {}) {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (!skipRequestLogging) {
    app.use((req, res, next) => {
      logger.info(`${req.method} ${req.url}`);
      next();
    });
  }

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

  app.use('/api/auth', authRoutes);
  app.use('/api/agent', agentRoutes);
  app.use('/api/metrics', metricsRoutes);
  app.use('/api/alert', alertRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/ai/v2', createAiV2Router({
    authenticateRequest: authenticateToken
  }));
  app.use('/api/users', usersRoutes);
  app.use('/api/reports', reportsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

let app;
let server;

function ensureServer() {
  if (!app) {
    app = createApp();
  }

  if (!server) {
    server = http.createServer(app);
  }

  return { app, server };
}

// Initialize services
async function initialize() {
  const current = ensureServer();

  try {
    const fs = require('fs');
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
    }

    await dataStore.initialize();
    await userService.initializeDefaultAdmin();
    metricsWS.initialize(current.server);
    global.wss = metricsWS;
    await alertService.initialize();
    await emailService.initialize();
    dingtalkService.initialize();
    aiService.initialize();
    alertChecker.start();

    const { port, host } = resolveServerBinding(process.env);
    current.server.listen(port, host, () => {
      logger.info(`EOMS Backend Server running on http://${host}:${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`WebSocket available at ws://${host}:${port}/ws/metrics`);
    });
  } catch (error) {
    logger.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  if (!server) {
    process.exit(0);
  }

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
  if (!server) {
    process.exit(0);
  }

  server.close(async () => {
    logger.info('HTTP server closed');
    alertChecker.stop();
    await dataStore.close();
    metricsWS.close();
    process.exit(0);
  });
});

if (require.main === module) {
  initialize();
}

module.exports = {
  createApp,
  initialize
};
