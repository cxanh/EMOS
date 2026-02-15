const express = require('express');
const router = express.Router();
const dataStore = require('../services/dataStore');
const logger = require('../utils/logger');

// Agent 注册
router.post('/register', async (req, res, next) => {
  try {
    const { node_id, hostname, ip } = req.body;

    if (!node_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_NODE_ID',
          message: 'node_id is required'
        }
      });
    }

    const result = await dataStore.registerNode(node_id, hostname, ip);

    if (result.success) {
      logger.info(`Agent registered: ${node_id}`);
      res.json({
        success: true,
        data: {
          node_id,
          registered: true,
          message: 'Agent registered successfully'
        }
      });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    next(error);
  }
});

// 接收监控数据
router.post('/metrics', async (req, res, next) => {
  try {
    const { node_id, hostname, metrics, timestamp } = req.body;

    // 验证必填字段
    if (!node_id || !metrics) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'node_id and metrics are required'
        }
      });
    }

    // 验证 metrics 字段
    const requiredFields = ['cpu_usage', 'memory_usage', 'disk_usage'];
    const missingFields = requiredFields.filter(field => metrics[field] === undefined);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: `Missing required fields: ${missingFields.join(', ')}`
        }
      });
    }

    // 保存数据
    const result = await dataStore.saveMetrics(
      node_id,
      hostname || node_id,
      metrics,
      timestamp
    );

    if (result.success) {
      // 通过 WebSocket 推送给前端（如果 WebSocket 服务已启动）
      if (global.wss) {
        global.wss.broadcast({
          type: 'metrics',
          node_id,
          data: metrics,
          timestamp: timestamp || new Date().toISOString()
        });
      }

      res.json({
        success: true,
        message: 'Metrics received successfully'
      });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    next(error);
  }
});

// 获取 Agent 列表
router.get('/list', async (req, res, next) => {
  try {
    const nodes = await dataStore.getOnlineNodes();

    res.json({
      success: true,
      data: {
        agents: nodes,
        count: nodes.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取单个 Agent 信息
router.get('/:nodeId', async (req, res, next) => {
  try {
    const { nodeId } = req.params;
    const info = await dataStore.getNodeInfo(nodeId);

    if (!info || Object.keys(info).length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NODE_NOT_FOUND',
          message: `Node ${nodeId} not found`
        }
      });
    }

    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    next(error);
  }
});

// 移除 Agent
router.delete('/:nodeId', async (req, res, next) => {
  try {
    const { nodeId } = req.params;
    const result = await dataStore.removeOfflineNode(nodeId);

    if (result.success) {
      logger.info(`Agent removed: ${nodeId}`);
      res.json({
        success: true,
        message: 'Agent removed successfully'
      });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
