const redisClient = require('../config/redis');
const influxClient = require('../config/influxdb');

class DataStoreService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    try {
      await redisClient.connect();
      await influxClient.connect();
      this.initialized = true;
      console.log('Data Store Service Initialized');
    } catch (error) {
      console.error('Failed to initialize Data Store Service:', error);
      throw error;
    }
  }

  async saveMetrics(nodeId, payload) {
    const { hostname, display_name, metrics, timestamp } = payload;

    try {
      const now = timestamp || new Date().toISOString();

      await redisClient.setLatestMetrics(nodeId, {
        ...metrics,
        timestamp: now
      });

      await redisClient.updateHeartbeat(nodeId);
      await redisClient.addOnlineNode(nodeId);

      if (hostname || display_name) {
        await redisClient.setNodeInfo(nodeId, {
          node_id: nodeId,
          hostname: hostname || nodeId,
          display_name: display_name || hostname || nodeId,
          updated_at: now
        });
      }

      await influxClient.writeMetrics(
        nodeId,
        hostname || nodeId,
        metrics,
        now
      );

      return { success: true };
    } catch (error) {
      console.error('Error saving metrics:', error);
      return { success: false, error: error.message };
    }
  }

  async getLatestMetrics(nodeId) {
    try {
      return await redisClient.getLatestMetrics(nodeId);
    } catch (error) {
      console.error('Error getting latest metrics:', error);
      return null;
    }
  }

  async getHistoryMetrics(nodeId, startTime, endTime, interval = '1m') {
    try {
      const data = await influxClient.queryMetrics(nodeId, startTime, endTime, interval);
      return this.formatInfluxData(data);
    } catch (error) {
      console.error('Error getting history metrics:', error);
      return [];
    }
  }

  formatInfluxData(data) {
    const grouped = {};

    data.forEach(row => {
      const time = row._time;
      if (!grouped[time]) {
        grouped[time] = { timestamp: time };
      }
      grouped[time][row._field] = row._value;
    });

    return Object.values(grouped);
  }

  async registerNode(nodeId, payload = {}) {
    const { hostname, ip, display_name } = payload;

    try {
      const now = new Date().toISOString();
      await redisClient.setNodeInfo(nodeId, {
        node_id: nodeId,
        hostname: hostname || nodeId,
        display_name: display_name || hostname || nodeId,
        ip: ip || 'unknown',
        registered_at: now,
        last_heartbeat: now,
        status: 'online'
      });

      await redisClient.addOnlineNode(nodeId);
      return { success: true };
    } catch (error) {
      console.error('Error registering node:', error);
      return { success: false, error: error.message };
    }
  }

  async getNodeInfo(nodeId) {
    try {
      return await redisClient.getNodeInfo(nodeId);
    } catch (error) {
      console.error('Error getting node info:', error);
      return null;
    }
  }

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
          display_name: info?.display_name || info?.hostname || nodeId,
          latest_metrics: metrics
        });
      }

      return nodes;
    } catch (error) {
      console.error('Error getting online nodes:', error);
      return [];
    }
  }

  async removeOfflineNode(nodeId) {
    try {
      await redisClient.removeOnlineNode(nodeId);
      return { success: true };
    } catch (error) {
      console.error('Error removing offline node:', error);
      return { success: false, error: error.message };
    }
  }

  async close() {
    await redisClient.disconnect();
    await influxClient.disconnect();
    this.initialized = false;
    console.log('Data Store Service Closed');
  }
}

module.exports = new DataStoreService();
