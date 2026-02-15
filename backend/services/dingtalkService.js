const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

class DingTalkService {
  constructor() {
    this.webhook = null;
    this.secret = null;
    this.enabled = false;
  }

  // Initialize DingTalk service
  initialize() {
    try {
      this.webhook = process.env.DINGTALK_WEBHOOK;
      this.secret = process.env.DINGTALK_SECRET;

      if (!this.webhook) {
        logger.warn('DingTalk service not configured. Set DINGTALK_WEBHOOK in .env');
        this.enabled = false;
        return;
      }

      this.enabled = true;
      logger.info('DingTalk Service Initialized');
    } catch (error) {
      logger.error('Failed to initialize DingTalk Service:', error.message);
      this.enabled = false;
    }
  }

  // Generate signature for DingTalk
  generateSignature(timestamp) {
    if (!this.secret) {
      return null;
    }

    const stringToSign = `${timestamp}\n${this.secret}`;
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(stringToSign);
    const sign = encodeURIComponent(hmac.digest('base64'));
    return sign;
  }

  // Send alert to DingTalk
  async sendAlert(event) {
    if (!this.enabled) {
      logger.warn('DingTalk service is not enabled');
      return { success: false, error: 'DingTalk service not enabled' };
    }

    try {
      const timestamp = Date.now();
      const sign = this.generateSignature(timestamp);

      let url = this.webhook;
      if (sign) {
        url += `&timestamp=${timestamp}&sign=${sign}`;
      }

      const message = {
        msgtype: 'markdown',
        markdown: {
          title: `🚨 系统告警: ${event.ruleName}`,
          text: `### 🚨 系统告警通知\n\n` +
                `**告警规则:** ${event.ruleName}\n\n` +
                `**节点:** ${event.nodeName} (${event.nodeId})\n\n` +
                `**监控指标:** ${this.getMetricLabel(event.metric)}\n\n` +
                `**当前值:** <font color=#d32f2f>${event.currentValue.toFixed(1)}%</font>\n\n` +
                `**阈值:** ${event.threshold}%\n\n` +
                `**触发时间:** ${new Date(event.triggeredAt).toLocaleString('zh-CN')}\n\n` +
                `**告警消息:** ${event.message}\n\n` +
                `---\n\n` +
                `请及时处理告警！`
        }
      };

      const response = await axios.post(url, message, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (response.data.errcode === 0) {
        logger.info('Alert sent to DingTalk successfully');
        return { success: true };
      } else {
        logger.error('Failed to send alert to DingTalk:', response.data.errmsg);
        return { success: false, error: response.data.errmsg };
      }
    } catch (error) {
      logger.error('Failed to send alert to DingTalk:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Send recovery to DingTalk
  async sendRecovery(data) {
    if (!this.enabled) {
      return { success: false, error: 'DingTalk service not enabled' };
    }

    try {
      const timestamp = Date.now();
      const sign = this.generateSignature(timestamp);

      let url = this.webhook;
      if (sign) {
        url += `&timestamp=${timestamp}&sign=${sign}`;
      }

      const message = {
        msgtype: 'markdown',
        markdown: {
          title: `✅ 告警恢复: ${data.ruleName}`,
          text: `### ✅ 告警恢复通知\n\n` +
                `**告警规则:** ${data.ruleName}\n\n` +
                `**节点:** ${data.nodeName} (${data.nodeId})\n\n` +
                `**监控指标:** ${this.getMetricLabel(data.metric)}\n\n` +
                `**当前值:** <font color=#4caf50>${data.currentValue.toFixed(1)}%</font>\n\n` +
                `**阈值:** ${data.threshold}%\n\n` +
                `**恢复时间:** ${new Date().toLocaleString('zh-CN')}\n\n` +
                `**恢复消息:** ${data.message}\n\n` +
                `---\n\n` +
                `系统已恢复正常。`
        }
      };

      const response = await axios.post(url, message, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (response.data.errcode === 0) {
        logger.info('Recovery notification sent to DingTalk successfully');
        return { success: true };
      } else {
        logger.error('Failed to send recovery to DingTalk:', response.data.errmsg);
        return { success: false, error: response.data.errmsg };
      }
    } catch (error) {
      logger.error('Failed to send recovery to DingTalk:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Get metric label
  getMetricLabel(metric) {
    const labels = {
      cpu_usage: 'CPU使用率',
      memory_usage: '内存使用率',
      disk_usage: '磁盘使用率'
    };
    return labels[metric] || metric;
  }

  // Check if DingTalk is enabled
  isEnabled() {
    return this.enabled;
  }
}

module.exports = new DingTalkService();
