const redisClient = require('../config/redis');
const influxClient = require('../config/influxdb');

class DataStoreService {
  constructor() {
    this.initialized = false;
  }

  // 初始化数据存储
  async initialize() {
    try {
      // 连接 Redis
      await redisClient.connect();
      
      // 连接 InfluxDB
      influxClient.connect();
      
      this.initialized = true;
      console.log('Data Store Service Initialized');
    } catch (error) {
      console.error('Failed to initialize Data Store Service:', error);
      throw error;
    }
  }

  // 保存监控数据
  async saveMetrics(nodeId, hostname, metrics, timestamp) {
    try {
      // 1. 保存到 Redis (最新数据)
      await redisClient.setLatestMetrics(nodeId, {
        ...metrics,
        timestamp: timestamp || new Date().toISOString()
      });

      // 2. 更新节点心跳
      await redisClient.updateHeartbeat(nodeId);

      // 3. 添加到在线节点集合
      await redisClient.addOnlineNode(nodeId);

      // 4. 写入 InfluxDB (历史数据)
      await influxClient.writeMetrics(
        nodeId,
        hostname,
        metrics,
        timestamp || new Date().toISOString()
      );

      return { success: true };
    } catch (error) {
      console.error('Error saving metrics:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取最新数据
  async getLatestMetrics(nodeId) {
    try {
      const metrics = await redisClient.getLatestMetrics(nodeId);
      return metrics;
    } catch (error) {
      console.error('Error getting latest metrics:', error);
      return null;
    }
  }

  // 获取历史数据
  async getHistoryMetrics(nodeId, startTime, endTime, interval = '1m') {
    try {
      const data = await influxClient.queryMetrics(nodeId, startTime, endTime, interval);
      
      // 格式化数据
      const formattedData = this.formatInfluxData(data);
      return formattedData;
    } catch (error) {
      console.error('Error getting history metrics:', error);
      return [];
    }
  }

  // 格式化 InfluxDB 数据
  formatInfluxData(data) {
    const grouped = {};
    
    data.forEach(row => {
      const timestamp = row._time;
      if (!grouped[timestamp]) {
        grouped[timestamp] = { timestamp };
      }
      grouped[timestamp][row._field] = row._value;
    });

    return Object.values(grouped);
  }

  // 注册节点
  async registerNode(nodeId, hostname, ip) {
    try {
      await redisClient.setNodeInfo(nodeId, {
        node_id: nodeId,
        hostname: hostname || nodeId,
        ip: ip || 'unknown',
        registered_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString()
      });

      await redisClient.addOnlineNode(nodeId);

      return { success: true };
    } catch (error) {
      console.error('Error registering node:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取节点信息
  async getNodeInfo(nodeId) {
    try {
      return await redisClient.getNodeInfo(nodeId);
    } catch (error) {
      console.error('Error getting node info:', error);
      return null;
    }
  }

  // 获取所有在线节点
  async getOnlineNodes() {
    try {
      const nodeIds = await redisClient.getOnlineNodes();
      const nodes = [];

      for (const nodeId of nodeIds) {
        const info = await redisClient.getNodeInfo(nodeId);
        const metrics = await redisClient.getLatestMetrics(nodeId);
        
        nodes.push({
          node_id: nodeId,
          ...info,
          latest_metrics: metrics
        });
      }

      return nodes;
    } catch (error) {
      console.error('Error getting online nodes:', error);
      return [];
    }
  }

  // 移除离线节点
  async removeOfflineNode(nodeId) {
    try {
      await redisClient.removeOnlineNode(nodeId);
      return { success: true };
    } catch (error) {
      console.error('Error removing offline node:', error);
      return { success: false, error: error.message };
    }
  }

  // 关闭连接
  async close() {
    await redisClient.disconnect();
    await influxClient.disconnect();
    this.initialized = false;
    console.log('Data Store Service Closed');
  }
}

module.exports = new DataStoreService();
