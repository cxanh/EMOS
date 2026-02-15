const express = require('express');
const router = express.Router();
const dataStore = require('../services/dataStore');
const logger = require('../utils/logger');

// 获取最新数据
router.get('/latest/:nodeId', async (req, res, next) => {
  try {
    const { nodeId } = req.params;
    const metrics = await dataStore.getLatestMetrics(nodeId);

    if (!metrics || Object.keys(metrics).length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_DATA',
          message: `No data found for node ${nodeId}`
        }
      });
    }

    res.json({
      success: true,
      data: {
        node_id: nodeId,
        metrics,
        timestamp: metrics.timestamp
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取历史数据
router.get('/history', async (req, res, next) => {
  try {
    const { nodeId, startTime, endTime, interval } = req.query;

    // 验证必填参数
    if (!nodeId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'nodeId, startTime, and endTime are required'
        }
      });
    }

    // 查询历史数据
    const data = await dataStore.getHistoryMetrics(
      nodeId,
      startTime,
      endTime,
      interval || '1m'
    );

    res.json({
      success: true,
      data: {
        node_id: nodeId,
        start_time: startTime,
        end_time: endTime,
        interval: interval || '1m',
        metrics: data,
        count: data.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取所有节点列表
router.get('/nodes', async (req, res, next) => {
  try {
    const nodes = await dataStore.getOnlineNodes();

    res.json({
      success: true,
      data: {
        nodes: nodes.map(node => ({
          node_id: node.node_id,
          hostname: node.hostname,
          ip: node.ip,
          status: 'online',
          last_heartbeat: node.last_heartbeat
        })),
        count: nodes.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取节点统计信息
router.get('/stats/:nodeId', async (req, res, next) => {
  try {
    const { nodeId } = req.params;
    const { period } = req.query; // 1h, 24h, 7d, 30d

    // 计算时间范围
    const endTime = new Date().toISOString();
    let startTime;
    
    switch (period) {
      case '1h':
        startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        break;
      case '24h':
        startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        break;
      case '7d':
        startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30d':
        startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      default:
        startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    }

    const data = await dataStore.getHistoryMetrics(nodeId, startTime, endTime, '5m');

    // 计算统计信息
    const stats = {
      cpu: { avg: 0, max: 0, min: 100 },
      memory: { avg: 0, max: 0, min: 100 },
      disk: { avg: 0, max: 0, min: 100 }
    };

    if (data.length > 0) {
      let cpuSum = 0, memSum = 0, diskSum = 0;

      data.forEach(item => {
        if (item.cpu_usage !== undefined) {
          cpuSum += item.cpu_usage;
          stats.cpu.max = Math.max(stats.cpu.max, item.cpu_usage);
          stats.cpu.min = Math.min(stats.cpu.min, item.cpu_usage);
        }
        if (item.memory_usage !== undefined) {
          memSum += item.memory_usage;
          stats.memory.max = Math.max(stats.memory.max, item.memory_usage);
          stats.memory.min = Math.min(stats.memory.min, item.memory_usage);
        }
        if (item.disk_usage !== undefined) {
          diskSum += item.disk_usage;
          stats.disk.max = Math.max(stats.disk.max, item.disk_usage);
          stats.disk.min = Math.min(stats.disk.min, item.disk_usage);
        }
      });

      stats.cpu.avg = (cpuSum / data.length).toFixed(2);
      stats.memory.avg = (memSum / data.length).toFixed(2);
      stats.disk.avg = (diskSum / data.length).toFixed(2);
    }

    res.json({
      success: true,
      data: {
        node_id: nodeId,
        period,
        stats,
        data_points: data.length
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
