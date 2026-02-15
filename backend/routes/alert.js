const express = require('express');
const router = express.Router();
const alertService = require('../services/alertService');
const alertChecker = require('../services/alertChecker');
const logger = require('../utils/logger');

// ==================== Alert Rules ====================

// Create alert rule
router.post('/rules', async (req, res, next) => {
  try {
    const { name, nodeId, metric, operator, threshold, duration, notifyChannels } = req.body;

    // Validate required fields
    if (!name || !metric || threshold === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'name, metric, and threshold are required'
        }
      });
    }

    // Validate metric
    const validMetrics = ['cpu_usage', 'memory_usage', 'disk_usage'];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_METRIC',
          message: `metric must be one of: ${validMetrics.join(', ')}`
        }
      });
    }

    // Validate operator
    const validOperators = ['gt', 'gte', 'lt', 'lte', 'eq'];
    if (operator && !validOperators.includes(operator)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATOR',
          message: `operator must be one of: ${validOperators.join(', ')}`
        }
      });
    }

    const result = await alertService.createRule({
      name,
      nodeId,
      metric,
      operator,
      threshold,
      duration,
      notifyChannels
    });

    if (result.success) {
      logger.info(`Alert rule created: ${result.data.id}`);
      res.json(result);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    next(error);
  }
});

// Get all alert rules
router.get('/rules', async (req, res, next) => {
  try {
    const rules = await alertService.getRules();

    res.json({
      success: true,
      data: {
        rules,
        count: rules.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get alert rule by ID
router.get('/rules/:ruleId', async (req, res, next) => {
  try {
    const { ruleId } = req.params;
    const rule = await alertService.getRule(ruleId);

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: `Rule ${ruleId} not found`
        }
      });
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    next(error);
  }
});

// Update alert rule
router.put('/rules/:ruleId', async (req, res, next) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;

    const result = await alertService.updateRule(ruleId, updates);

    if (result.success) {
      logger.info(`Alert rule updated: ${ruleId}`);
      res.json(result);
    } else {
      if (result.error === 'Rule not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RULE_NOT_FOUND',
            message: result.error
          }
        });
      }
      throw new Error(result.error);
    }
  } catch (error) {
    next(error);
  }
});

// Delete alert rule
router.delete('/rules/:ruleId', async (req, res, next) => {
  try {
    const { ruleId } = req.params;
    const result = await alertService.deleteRule(ruleId);

    if (result.success) {
      logger.info(`Alert rule deleted: ${ruleId}`);
      res.json({
        success: true,
        message: 'Rule deleted successfully'
      });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    next(error);
  }
});

// ==================== Alert Events ====================

// Get active alert events
router.get('/events/active', async (req, res, next) => {
  try {
    const events = await alertService.getActiveEvents();

    res.json({
      success: true,
      data: {
        events,
        count: events.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get alert history
router.get('/events/history', async (req, res, next) => {
  try {
    const { nodeId, startTime, endTime, status } = req.query;

    const events = await alertService.getHistory({
      nodeId,
      startTime,
      endTime,
      status
    });

    res.json({
      success: true,
      data: {
        events,
        count: events.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Resolve alert event
router.post('/events/:eventId/resolve', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { comment } = req.body;

    const result = await alertService.resolveEvent(eventId, comment);

    if (result.success) {
      logger.info(`Alert event resolved: ${eventId}`);
      
      // Notify via WebSocket
      if (global.wss) {
        global.wss.broadcast({
          type: 'alert',
          action: 'resolved',
          data: { eventId, comment }
        });
      }

      res.json({
        success: true,
        message: 'Event resolved successfully'
      });
    } else {
      if (result.error === 'Event not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'EVENT_NOT_FOUND',
            message: result.error
          }
        });
      }
      throw new Error(result.error);
    }
  } catch (error) {
    next(error);
  }
});

// Ignore alert event
router.post('/events/:eventId/ignore', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await alertService.ignoreEvent(eventId);

    if (result.success) {
      logger.info(`Alert event ignored: ${eventId}`);
      
      // Notify via WebSocket
      if (global.wss) {
        global.wss.broadcast({
          type: 'alert',
          action: 'ignored',
          data: { eventId }
        });
      }

      res.json({
        success: true,
        message: 'Event ignored successfully'
      });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    next(error);
  }
});

// ==================== Alert Checker Status ====================

// Get alert checker status
router.get('/status', async (req, res, next) => {
  try {
    const status = alertChecker.getStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
});

// ==================== Notification Logs ====================

// Get notification logs
router.get('/notifications', async (req, res, next) => {
  try {
    const { limit, offset, nodeId, startTime, endTime } = req.query;

    const logs = await alertService.getNotificationLogs({
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
      nodeId,
      startTime,
      endTime
    });

    res.json({
      success: true,
      data: {
        logs,
        count: logs.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get notification log by ID
router.get('/notifications/:logId', async (req, res, next) => {
  try {
    const { logId } = req.params;
    const log = await alertService.getNotificationLog(logId);

    if (!log) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LOG_NOT_FOUND',
          message: `Notification log ${logId} not found`
        }
      });
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    next(error);
  }
});

// Get notification statistics
router.get('/notifications/stats/summary', async (req, res, next) => {
  try {
    const { startTime, endTime } = req.query;

    const stats = await alertService.getNotificationStats({
      startTime,
      endTime
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
