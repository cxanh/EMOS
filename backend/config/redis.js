const redis = require('redis');
require('dotenv').config();

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379
        },
        password: process.env.REDIS_PASSWORD || undefined,
        database: process.env.REDIS_DB || 0
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('Redis Client Ready');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  // 保存节点信息
  async setNodeInfo(nodeId, nodeInfo) {
    const key = `node:${nodeId}:info`;
    // 逐个字段设置
    for (const [field, value] of Object.entries(nodeInfo)) {
      await this.client.hSet(key, field, String(value));
    }
  }

  // 获取节点信息
  async getNodeInfo(nodeId) {
    const key = `node:${nodeId}:info`;
    return await this.client.hGetAll(key);
  }

  // 保存最新监控数据
  async setLatestMetrics(nodeId, metrics) {
    const key = `node:${nodeId}:latest`;
    // 逐个字段设置
    for (const [field, value] of Object.entries(metrics)) {
      await this.client.hSet(key, field, String(value));
    }
    await this.client.expire(key, 300); // 5分钟过期
  }

  // 获取最新监控数据
  async getLatestMetrics(nodeId) {
    const key = `node:${nodeId}:latest`;
    return await this.client.hGetAll(key);
  }

  // 添加在线节点
  async addOnlineNode(nodeId) {
    await this.client.sAdd('nodes:online', nodeId);
  }

  // 移除在线节点
  async removeOnlineNode(nodeId) {
    await this.client.sRem('nodes:online', nodeId);
  }

  // 获取所有在线节点
  async getOnlineNodes() {
    return await this.client.sMembers('nodes:online');
  }

  // 更新节点心跳
  async updateHeartbeat(nodeId) {
    const key = `node:${nodeId}:info`;
    await this.client.hSet(key, 'last_heartbeat', new Date().toISOString());
  }

  // 关闭连接
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('Redis Client Disconnected');
    }
  }
}

module.exports = new RedisClient();
