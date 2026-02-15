const redisClient = require('../config/redis');
const influxClient = require('../config/influxdb');
const logger = require('../utils/logger');

class AlertService {
  constructor() {
    this.initialized = false;
  }

  // Initialize alert service
  async initialize() {
    try {
      this.initialized = true;
      logger.info('Alert Service Initialized');
    } catch (error) {
      logger.error('Failed to initialize Alert Service:', error);
      throw error;
    }
  }

  // Generate unique ID
  generateId(prefix = 'alert') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==================== Alert Rules ====================

  // Create alert rule
  async createRule(ruleData) {
    try {
      const rule = {
        id: this.generateId('rule'),
        name: ruleData.name,
        nodeId: ruleData.nodeId || '*',
        metric: ruleData.metric,
        operator: ruleData.operator || 'gt',
        threshold: ruleData.threshold,
        duration: ruleData.duration || 60,
        enabled: ruleData.enabled !== false,
        notifyChannels: ruleData.notifyChannels || ['websocket'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to Redis - use individual hSet calls
      const key = `alert:rule:${rule.id}`;
      await redisClient.client.hSet(key, 'id', rule.id);
      await redisClient.client.hSet(key, 'name', rule.name);
      await redisClient.client.hSet(key, 'nodeId', rule.nodeId);
      await redisClient.client.hSet(key, 'metric', rule.metric);
      await redisClient.client.hSet(key, 'operator', rule.operator);
      await redisClient.client.hSet(key, 'threshold', String(rule.threshold));
      await redisClient.client.hSet(key, 'duration', String(rule.duration));
      await redisClient.client.hSet(key, 'enabled', String(rule.enabled));
      await redisClient.client.hSet(key, 'notifyChannels', JSON.stringify(rule.notifyChannels));
      await redisClient.client.hSet(key, 'createdAt', rule.createdAt);
      await redisClient.client.hSet(key, 'updatedAt', rule.updatedAt);

      // Add to rules set
      await redisClient.client.sAdd('alert:rules', rule.id);

      logger.info(`Alert rule created: ${rule.id}`);
      return { success: true, data: rule };
    } catch (error) {
      logger.error('Error creating alert rule:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all alert rules
  async getRules() {
    try {
      const ruleIds = await redisClient.client.sMembers('alert:rules');
      const rules = [];

      for (const ruleId of ruleIds) {
        const ruleData = await redisClient.client.hGetAll(`alert:rule:${ruleId}`);
        if (ruleData && Object.keys(ruleData).length > 0) {
          rules.push({
            ...ruleData,
            threshold: ruleData.threshold ? parseFloat(ruleData.threshold) : null,
            duration: ruleData.duration ? parseInt(ruleData.duration) : null,
            enabled: ruleData.enabled === 'true',
            notifyChannels: ruleData.notifyChannels ? JSON.parse(ruleData.notifyChannels) : []
          });
        }
      }

      return rules;
    } catch (error) {
      logger.error('Error getting alert rules:', error);
      return [];
    }
  }

  // Get enabled alert rules
  async getEnabledRules() {
    const allRules = await this.getRules();
    return allRules.filter(rule => rule.enabled);
  }

  // Get alert rule by ID
  async getRule(ruleId) {
    try {
      const ruleData = await redisClient.client.hGetAll(`alert:rule:${ruleId}`);
      if (!ruleData || Object.keys(ruleData).length === 0) {
        return null;
      }

      return {
        ...ruleData,
        threshold: ruleData.threshold ? parseFloat(ruleData.threshold) : null,
        duration: ruleData.duration ? parseInt(ruleData.duration) : null,
        enabled: ruleData.enabled === 'true',
        notifyChannels: ruleData.notifyChannels ? JSON.parse(ruleData.notifyChannels) : []
      };
    } catch (error) {
      logger.error('Error getting alert rule:', error);
      return null;
    }
  }

  // Update alert rule
  async updateRule(ruleId, updates) {
    try {
      const existingRule = await this.getRule(ruleId);
      if (!existingRule) {
        return { success: false, error: 'Rule not found' };
      }

      const updatedRule = {
        ...existingRule,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Update in Redis
      const fields = {};
      for (const [key, value] of Object.entries(updatedRule)) {
        if (key === 'notifyChannels') {
          fields[key] = JSON.stringify(value);
        } else {
          fields[key] = String(value);
        }
      }

      for (const [key, value] of Object.entries(fields)) {
        await redisClient.client.hSet(`alert:rule:${ruleId}`, key, value);
      }

      logger.info(`Alert rule updated: ${ruleId}`);
      return { success: true, data: updatedRule };
    } catch (error) {
      logger.error('Error updating alert rule:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete alert rule
  async deleteRule(ruleId) {
    try {
      await redisClient.client.del(`alert:rule:${ruleId}`);
      await redisClient.client.sRem('alert:rules', ruleId);

      logger.info(`Alert rule deleted: ${ruleId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting alert rule:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== Alert Events ====================

  // Create alert event
  async createEvent(eventData) {
    try {
      const event = {
        id: this.generateId('event'),
        ruleId: eventData.ruleId,
        ruleName: eventData.ruleName,
        nodeId: eventData.nodeId,
        nodeName: eventData.nodeName,
        metric: eventData.metric,
        currentValue: eventData.currentValue,
        threshold: eventData.threshold,
        status: 'active',
        triggeredAt: new Date().toISOString(),
        resolvedAt: null,
        notified: false,
        message: `Node ${eventData.nodeName} ${eventData.metric} (${eventData.currentValue}%) exceeds threshold (${eventData.threshold}%)`
      };

      // Save to Redis
      await redisClient.client.hSet(
        `alert:event:${event.id}`,
        'id', event.id,
        'ruleId', event.ruleId,
        'ruleName', event.ruleName,
        'nodeId', event.nodeId,
        'nodeName', event.nodeName,
        'metric', event.metric,
        'currentValue', String(event.currentValue),
        'threshold', String(event.threshold),
        'status', event.status,
        'triggeredAt', event.triggeredAt,
        'resolvedAt', event.resolvedAt || '',
        'notified', String(event.notified),
        'message', event.message
      );

      // Add to active events set
      await redisClient.client.sAdd('alert:events:active', event.id);

      // Write to InfluxDB for history
      try {
        await influxClient.writeAlertEvent(event);
      } catch (influxError) {
        logger.warn('Failed to write alert event to InfluxDB:', influxError.message);
      }

      logger.info(`Alert event created: ${event.id}`);
      return event;
    } catch (error) {
      logger.error('Error creating alert event:', error);
      throw error;
    }
  }

  // Get active alert events
  async getActiveEvents() {
    try {
      const eventIds = await redisClient.client.sMembers('alert:events:active');
      const events = [];

      for (const eventId of eventIds) {
        const eventData = await redisClient.client.hGetAll(`alert:event:${eventId}`);
        if (eventData && Object.keys(eventData).length > 0) {
          events.push({
            ...eventData,
            currentValue: parseFloat(eventData.currentValue),
            threshold: parseFloat(eventData.threshold),
            notified: eventData.notified === 'true'
          });
        }
      }

      return events;
    } catch (error) {
      logger.error('Error getting active events:', error);
      return [];
    }
  }

  // Resolve alert event
  async resolveEvent(eventId, comment = '') {
    try {
      const eventData = await redisClient.client.hGetAll(`alert:event:${eventId}`);
      if (!eventData || Object.keys(eventData).length === 0) {
        return { success: false, error: 'Event not found' };
      }

      // Update status
      await redisClient.client.hSet(
        `alert:event:${eventId}`,
        'status', 'resolved',
        'resolvedAt', new Date().toISOString()
      );

      if (comment) {
        await redisClient.client.hSet(`alert:event:${eventId}`, 'comment', comment);
      }

      // Remove from active events
      await redisClient.client.sRem('alert:events:active', eventId);

      // Add to resolved events
      await redisClient.client.sAdd('alert:events:resolved', eventId);

      logger.info(`Alert event resolved: ${eventId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error resolving alert event:', error);
      return { success: false, error: error.message };
    }
  }

  // Ignore alert event
  async ignoreEvent(eventId) {
    try {
      await redisClient.client.hSet(`alert:event:${eventId}`, 'status', 'ignored');
      await redisClient.client.sRem('alert:events:active', eventId);
      await redisClient.client.sAdd('alert:events:ignored', eventId);

      logger.info(`Alert event ignored: ${eventId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error ignoring alert event:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark event as notified
  async markNotified(eventId) {
    try {
      await redisClient.client.hSet(`alert:event:${eventId}`, 'notified', 'true');
      return { success: true };
    } catch (error) {
      logger.error('Error marking event as notified:', error);
      return { success: false, error: error.message };
    }
  }

  // Get alert history from InfluxDB
  async getHistory(options = {}) {
    try {
      const { nodeId, startTime, endTime, status } = options;
      
      // Query InfluxDB
      const events = await influxClient.queryAlertHistory({
        nodeId,
        startTime,
        endTime,
        status
      });

      return events;
    } catch (error) {
      logger.error('Error getting alert history:', error);
      return [];
    }
  }

  // ==================== Notification Logs ====================

  // Save notification log
  async saveNotificationLog(logData) {
    try {
      const log = {
        id: this.generateId('notif'),
        eventId: logData.eventId,
        ruleName: logData.ruleName,
        nodeId: logData.nodeId,
        nodeName: logData.nodeName,
        timestamp: logData.timestamp,
        channels: logData.channels
      };

      // Save to Redis - use individual hSet calls for each field
      const key = `alert:notification:${log.id}`;
      await redisClient.client.hSet(key, 'id', log.id);
      await redisClient.client.hSet(key, 'eventId', log.eventId);
      await redisClient.client.hSet(key, 'ruleName', log.ruleName);
      await redisClient.client.hSet(key, 'nodeId', log.nodeId);
      await redisClient.client.hSet(key, 'nodeName', log.nodeName);
      await redisClient.client.hSet(key, 'timestamp', log.timestamp);
      await redisClient.client.hSet(key, 'channels', JSON.stringify(log.channels));

      // Add to notifications list (sorted by timestamp)
      await redisClient.client.zAdd('alert:notifications', {
        score: Date.now(),
        value: log.id
      });

      logger.info(`Notification log saved: ${log.id}`);
      return { success: true, data: log };
    } catch (error) {
      logger.error('Error saving notification log:', error);
      return { success: false, error: error.message };
    }
  }

  // Get notification logs
  async getNotificationLogs(options = {}) {
    try {
      const { limit = 100, offset = 0, nodeId, startTime, endTime } = options;

      // Get log IDs from sorted set (newest first)
      // Use ZRANGE with REV option (Redis 6.2+) or ZREVRANGE
      let logIds;
      try {
        // Try modern syntax first (Redis 6.2+)
        logIds = await redisClient.client.zRange(
          'alert:notifications',
          offset,
          offset + limit - 1,
          { REV: true }
        );
      } catch (err) {
        // Fallback to ZREVRANGE for older Redis versions
        logIds = await redisClient.client.sendCommand([
          'ZREVRANGE',
          'alert:notifications',
          String(offset),
          String(offset + limit - 1)
        ]);
      }

      const logs = [];

      for (const logId of logIds) {
        const logData = await redisClient.client.hGetAll(`alert:notification:${logId}`);
        if (logData && Object.keys(logData).length > 0) {
          const log = {
            ...logData,
            channels: logData.channels ? JSON.parse(logData.channels) : []
          };

          // Filter by nodeId if specified
          if (nodeId && log.nodeId !== nodeId) {
            continue;
          }

          // Filter by time range if specified
          if (startTime || endTime) {
            const logTime = new Date(log.timestamp).getTime();
            if (startTime && logTime < new Date(startTime).getTime()) continue;
            if (endTime && logTime > new Date(endTime).getTime()) continue;
          }

          logs.push(log);
        }
      }

      return logs;
    } catch (error) {
      logger.error('Error getting notification logs:', error);
      return [];
    }
  }

  // Get notification log by ID
  async getNotificationLog(logId) {
    try {
      const logData = await redisClient.client.hGetAll(`alert:notification:${logId}`);
      if (!logData || Object.keys(logData).length === 0) {
        return null;
      }

      return {
        ...logData,
        channels: logData.channels ? JSON.parse(logData.channels) : []
      };
    } catch (error) {
      logger.error('Error getting notification log:', error);
      return null;
    }
  }

  // Get notification statistics
  async getNotificationStats(options = {}) {
    try {
      const { startTime, endTime } = options;
      const logs = await this.getNotificationLogs({ limit: 1000, startTime, endTime });

      const stats = {
        total: logs.length,
        byChannel: {
          websocket: 0,
          email: 0,
          dingtalk: 0
        },
        byStatus: {
          success: 0,
          failed: 0
        },
        byNode: {}
      };

      for (const log of logs) {
        // Count by channel
        for (const channel of log.channels) {
          if (stats.byChannel[channel.type] !== undefined) {
            stats.byChannel[channel.type]++;
          }

          // Count by status
          if (channel.status === 'success') {
            stats.byStatus.success++;
          } else if (channel.status === 'failed') {
            stats.byStatus.failed++;
          }
        }

        // Count by node
        if (!stats.byNode[log.nodeId]) {
          stats.byNode[log.nodeId] = {
            nodeId: log.nodeId,
            nodeName: log.nodeName,
            count: 0
          };
        }
        stats.byNode[log.nodeId].count++;
      }

      return stats;
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      return null;
    }
  }
}

module.exports = new AlertService();
