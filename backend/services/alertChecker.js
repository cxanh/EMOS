const dataStore = require('./dataStore');
const alertService = require('./alertService');
const emailService = require('./emailService');
const dingtalkService = require('./dingtalkService');
const logger = require('../utils/logger');

class AlertChecker {
  constructor() {
    this.checkInterval = 5000; // Check every 5 seconds
    this.intervalId = null;
    this.activeAlerts = new Map(); // Track active alerts
    this.running = false;
  }

  // Start alert checker
  start() {
    if (this.running) {
      logger.warn('Alert checker is already running');
      return;
    }

    this.running = true;
    logger.info('Alert checker started');

    this.intervalId = setInterval(() => {
      this.checkAlerts().catch(error => {
        logger.error('Error in alert checker:', error);
      });
    }, this.checkInterval);
  }

  // Stop alert checker
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.running = false;
      logger.info('Alert checker stopped');
    }
  }

  // Main check function
  async checkAlerts() {
    try {
      // Get all enabled rules
      const rules = await alertService.getEnabledRules();
      if (rules.length === 0) {
        return;
      }

      // Get all online nodes
      const nodes = await dataStore.getOnlineNodes();
      if (nodes.length === 0) {
        return;
      }

      // Check each rule
      for (const rule of rules) {
        const targetNodes = rule.nodeId === '*' 
          ? nodes 
          : nodes.filter(n => n.node_id === rule.nodeId);

        for (const node of targetNodes) {
          await this.checkRule(rule, node);
        }
      }
    } catch (error) {
      logger.error('Error checking alerts:', error);
    }
  }

  // Check a single rule for a node
  async checkRule(rule, node) {
    try {
      // Get latest metrics
      const metrics = node.latest_metrics;
      if (!metrics || !metrics[rule.metric]) {
        return;
      }

      const currentValue = parseFloat(metrics[rule.metric]);
      
      // Evaluate condition
      const triggered = this.evaluateCondition(
        currentValue,
        rule.operator,
        rule.threshold
      );

      const alertKey = `${rule.id}_${node.node_id}`;

      if (triggered) {
        await this.handleTriggered(alertKey, rule, node, currentValue);
      } else {
        await this.handleResolved(alertKey, rule, node, currentValue);
      }
    } catch (error) {
      logger.error(`Error checking rule ${rule.id} for node ${node.node_id}:`, error);
    }
  }

  // Handle triggered alert
  async handleTriggered(alertKey, rule, node, currentValue) {
    if (!this.activeAlerts.has(alertKey)) {
      // New alert
      this.activeAlerts.set(alertKey, {
        triggeredAt: Date.now(),
        notified: false,
        eventId: null
      });
    }

    const alert = this.activeAlerts.get(alertKey);
    const duration = (Date.now() - alert.triggeredAt) / 1000;

    // Check if duration threshold is met
    if (duration >= rule.duration && !alert.notified) {
      // Trigger alert
      const event = await this.triggerAlert(rule, node, currentValue);
      alert.notified = true;
      alert.eventId = event.id;

      // Notify
      await this.notifyAlert(event, rule);
    }
  }

  // Handle resolved alert
  async handleResolved(alertKey, rule, node, currentValue) {
    if (this.activeAlerts.has(alertKey)) {
      const alert = this.activeAlerts.get(alertKey);
      
      if (alert.eventId) {
        // Auto-resolve the event
        await alertService.resolveEvent(alert.eventId, 'Auto-resolved: metric returned to normal');
        
        // Notify recovery
        await this.notifyRecovery(rule, node, currentValue);
      }

      this.activeAlerts.delete(alertKey);
    }
  }

  // Trigger alert
  async triggerAlert(rule, node, currentValue) {
    const event = await alertService.createEvent({
      ruleId: rule.id,
      ruleName: rule.name,
      nodeId: node.node_id,
      nodeName: node.hostname || node.node_id,
      metric: rule.metric,
      currentValue,
      threshold: rule.threshold
    });

    logger.warn(`Alert triggered: ${rule.name} on ${node.node_id} (${currentValue}% > ${rule.threshold}%)`);
    return event;
  }

  // Notify alert
  async notifyAlert(event, rule) {
    try {
      // Mark as notified
      await alertService.markNotified(event.id);

      const notificationLog = {
        eventId: event.id,
        ruleName: rule.name,
        nodeId: event.nodeId,
        nodeName: event.nodeName,
        timestamp: new Date().toISOString(),
        channels: []
      };

      // Send WebSocket notification
      if (rule.notifyChannels.includes('websocket') && global.wss) {
        try {
          global.wss.broadcast({
            type: 'alert',
            action: 'triggered',
            data: event
          });
          notificationLog.channels.push({
            type: 'websocket',
            status: 'success',
            sentAt: new Date().toISOString()
          });
          logger.info(`WebSocket notification sent for event: ${event.id}`);
        } catch (err) {
          logger.error('WebSocket notification failed:', err);
          notificationLog.channels.push({
            type: 'websocket',
            status: 'failed',
            error: err.message,
            sentAt: new Date().toISOString()
          });
        }
      }

      // Send Email notification
      if (rule.notifyChannels.includes('email') && emailService.isEnabled()) {
        try {
          await emailService.sendAlert(event);
          notificationLog.channels.push({
            type: 'email',
            status: 'success',
            sentAt: new Date().toISOString()
          });
          logger.info(`Email notification sent for event: ${event.id}`);
        } catch (err) {
          logger.error('Email notification failed:', err);
          notificationLog.channels.push({
            type: 'email',
            status: 'failed',
            error: err.message,
            sentAt: new Date().toISOString()
          });
        }
      }

      // Send DingTalk notification
      if (rule.notifyChannels.includes('dingtalk') && dingtalkService.isEnabled()) {
        try {
          await dingtalkService.sendAlert(event);
          notificationLog.channels.push({
            type: 'dingtalk',
            status: 'success',
            sentAt: new Date().toISOString()
          });
          logger.info(`DingTalk notification sent for event: ${event.id}`);
        } catch (err) {
          logger.error('DingTalk notification failed:', err);
          notificationLog.channels.push({
            type: 'dingtalk',
            status: 'failed',
            error: err.message,
            sentAt: new Date().toISOString()
          });
        }
      }

      // Save notification log only if there are channels
      if (notificationLog.channels.length > 0) {
        const result = await alertService.saveNotificationLog(notificationLog);
        if (result.success) {
          logger.info(`Notification log saved: ${result.data.id} for event: ${event.id}`);
        } else {
          logger.error(`Failed to save notification log for event: ${event.id}`, result.error);
        }
      } else {
        logger.warn(`No notification channels configured for event: ${event.id}`);
      }

      logger.info(`Alert notification completed for event: ${event.id}`);
    } catch (error) {
      logger.error('Error sending alert notification:', error);
    }
  }

  // Notify recovery
  async notifyRecovery(rule, node, currentValue) {
    try {
      const data = {
        ruleName: rule.name,
        nodeId: node.node_id,
        nodeName: node.hostname || node.node_id,
        metric: rule.metric,
        currentValue,
        threshold: rule.threshold,
        message: `Node ${node.hostname || node.node_id} ${rule.metric} recovered (${currentValue}% <= ${rule.threshold}%)`
      };

      const promises = [];

      // Send WebSocket notification
      if (rule.notifyChannels.includes('websocket') && global.wss) {
        global.wss.broadcast({
          type: 'alert',
          action: 'recovered',
          data
        });
      }

      // Send Email notification
      if (rule.notifyChannels.includes('email') && emailService.isEnabled()) {
        promises.push(
          emailService.sendRecovery(data).catch(err => {
            logger.error('Email recovery notification failed:', err);
          })
        );
      }

      // Send DingTalk notification
      if (rule.notifyChannels.includes('dingtalk') && dingtalkService.isEnabled()) {
        promises.push(
          dingtalkService.sendRecovery(data).catch(err => {
            logger.error('DingTalk recovery notification failed:', err);
          })
        );
      }

      // Wait for all notifications
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }

      logger.info(`Recovery notification sent: ${rule.name} on ${node.node_id}`);
    } catch (error) {
      logger.error('Error sending recovery notification:', error);
    }
  }

  // Evaluate condition
  evaluateCondition(value, operator, threshold) {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  // Get status
  getStatus() {
    return {
      running: this.running,
      activeAlerts: this.activeAlerts.size,
      checkInterval: this.checkInterval
    };
  }
}

module.exports = new AlertChecker();
