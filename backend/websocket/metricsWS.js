const WebSocket = require('ws');
const url = require('url');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class MetricsWebSocketServer {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // 存储客户端订阅信息
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/metrics'
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // 心跳检测
    this.startHeartbeat();

    logger.info('WebSocket Server initialized');
  }

  handleConnection(ws, req) {
    const clientId = this.generateClientId();
    const query = url.parse(req.url, true).query;
    
    // 可选的 Token 验证
    if (query.token) {
      try {
        const decoded = jwt.verify(query.token, process.env.JWT_SECRET);
        ws.user = decoded;
        logger.info(`WebSocket client connected with auth: ${decoded.username}`);
      } catch (error) {
        logger.warn('WebSocket connection with invalid token');
      }
    } else {
      logger.info('WebSocket client connected without auth');
    }

    // 初始化客户端信息
    this.clients.set(clientId, {
      ws,
      subscriptions: new Set(),
      isAlive: true
    });

    ws.clientId = clientId;

    // 发送欢迎消息
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      message: 'Connected to EOMS WebSocket Server'
    }));

    // 处理消息
    ws.on('message', (message) => {
      this.handleMessage(clientId, message);
    });

    // 处理 pong
    ws.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.isAlive = true;
      }
    });

    // 处理断开连接
    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    // 处理错误
    ws.on('error', (error) => {
      logger.error(`WebSocket error for client ${clientId}:`, error);
    });
  }

  handleMessage(clientId, message) {
    try {
      const data = JSON.parse(message);
      const client = this.clients.get(clientId);

      if (!client) return;

      switch (data.type) {
        case 'ping':
          // 响应心跳
          client.ws.send(JSON.stringify({ type: 'pong' }));
          break;

        case 'subscribe':
          // 订阅节点数据
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
          // 取消订阅
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
          // 订阅所有节点
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

  // 广播消息给所有客户端
  broadcast(data) {
    const message = JSON.stringify(data);
    const nodeId = data.node_id;

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        // 检查客户端是否订阅了该节点
        if (client.subscriptions.has('*') || client.subscriptions.has(nodeId)) {
          client.ws.send(message);
        }
      }
    });
  }

  // 发送消息给特定客户端
  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  // 心跳检测
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
    }, 30000); // 30秒
  }

  // 生成客户端 ID
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 获取连接数
  getConnectionCount() {
    return this.clients.size;
  }

  // 关闭服务器
  close() {
    if (this.wss) {
      this.wss.close(() => {
        logger.info('WebSocket Server closed');
      });
    }
  }
}

module.exports = new MetricsWebSocketServer();
