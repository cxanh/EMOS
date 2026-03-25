const express = require('express');
const router = express.Router();
const dataStore = require('../services/dataStore');
const logger = require('../utils/logger');

router.post('/register', async (req, res, next) => {
  try {
    const { node_id, hostname, ip, display_name } = req.body;

    if (!node_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_NODE_ID',
          message: 'node_id is required'
        }
      });
    }

    const result = await dataStore.registerNode(node_id, {
      hostname,
      ip,
      display_name
    });

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

router.post('/metrics', async (req, res, next) => {
  try {
    const { node_id, hostname, display_name, metrics, timestamp } = req.body;

    if (!node_id || !metrics) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'node_id and metrics are required'
        }
      });
    }

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

    const result = await dataStore.saveMetrics(node_id, {
      hostname,
      display_name,
      metrics,
      timestamp
    });

    if (result.success) {
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
