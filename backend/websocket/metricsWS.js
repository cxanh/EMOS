const WebSocket = require('ws');
const url = require('url');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class MetricsWebSocketServer {
  constructor() {
    this.wss = null;
    this.clients = new Map();
  }

  initialize(server) {
    this.wss = new WebSocket.Server({
      server,
      path: '/ws/metrics'
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.startHeartbeat();
    logger.info('WebSocket Server initialized');
  }

  handleConnection(ws, req) {
    const authResult = this.authenticateRequest(req);
    if (!authResult.success) {
      logger.warn(`WebSocket authentication failed: ${authResult.code}`);
      ws.close(1008, authResult.message);
      return;
    }

    ws.user = authResult.user;

    const clientId = this.generateClientId();
    this.clients.set(clientId, {
      ws,
      subscriptions: new Set(),
      isAlive: true
    });

    ws.clientId = clientId;

    logger.info(`WebSocket client connected with auth: ${authResult.user.username || authResult.user.id || 'unknown-user'}`);

    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      message: 'Connected to EOMS WebSocket Server'
    }));

    ws.on('message', (message) => {
      this.handleMessage(clientId, message);
    });

    ws.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.isAlive = true;
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket error for client ${clientId}:`, error);
    });
  }

  authenticateRequest(req) {
    const jwtSecret = String(process.env.JWT_SECRET || '').trim();
    if (!jwtSecret) {
      return {
        success: false,
        code: 'JWT_SECRET_NOT_CONFIGURED',
        message: 'Server authentication is not configured'
      };
    }

    const token = this.extractTokenFromRequest(req);
    if (!token) {
      return {
        success: false,
        code: 'NO_TOKEN',
        message: 'Authentication token is required'
      };
    }

    try {
      const user = jwt.verify(token, jwtSecret);
      return {
        success: true,
        user
      };
    } catch (error) {
      return {
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      };
    }
  }

  extractTokenFromRequest(req) {
    const query = url.parse(req.url, true).query || {};
    if (query.token) {
      return String(query.token).trim();
    }

    const authHeader = req.headers?.authorization;
    if (!authHeader) {
      return '';
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme && scheme.toLowerCase() === 'bearer' && token) {
      return token.trim();
    }

    return '';
  }

  handleMessage(clientId, message) {
    try {
      const data = JSON.parse(message);
      const client = this.clients.get(clientId);

      if (!client) return;

      switch (data.type) {
        case 'ping':
          client.ws.send(JSON.stringify({ type: 'pong' }));
          break;

        case 'subscribe':
          if (data.node_id) {
            client.subscriptions.add(data.node_id);
            client.ws.send(JSON.stringify({
              type: 'subscribed',
              node_id: data.node_id
            }));
            logger.info(`Client ${clientId} subscribed to node ${data.node_id}`);
          }
          break;

        case 'unsubscribe':
          if (data.node_id) {
            client.subscriptions.delete(data.node_id);
            client.ws.send(JSON.stringify({
              type: 'unsubscribed',
              node_id: data.node_id
            }));
            logger.info(`Client ${clientId} unsubscribed from node ${data.node_id}`);
          }
          break;

        case 'subscribe_all':
          client.subscriptions.add('*');
          client.ws.send(JSON.stringify({
            type: 'subscribed',
            node_id: '*',
            message: 'Subscribed to all nodes'
          }));
          break;

        default:
          logger.warn(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
    }
  }

  handleDisconnect(clientId) {
    this.clients.delete(clientId);
    logger.info(`WebSocket client disconnected: ${clientId}`);
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    const nodeId = data.node_id;

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        if (client.subscriptions.has('*') || client.subscriptions.has(nodeId)) {
          client.ws.send(message);
        }
      }
    });
  }

  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  startHeartbeat() {
    setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          logger.info(`Terminating inactive client: ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000);
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConnectionCount() {
    return this.clients.size;
  }

  close() {
    if (this.wss) {
      this.wss.close(() => {
        logger.info('WebSocket Server closed');
      });
    }
  }
}

module.exports = new MetricsWebSocketServer();