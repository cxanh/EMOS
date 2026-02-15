const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.enabled = false;
  }

  // Initialize email service
  async initialize() {
    try {
      // Check if email is configured
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        logger.warn('Email service not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
        this.enabled = false;
        return;
      }

      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Verify connection
      await this.transporter.verify();
      
      this.initialized = true;
      this.enabled = true;
      logger.info('Email Service Initialized');
    } catch (error) {
      logger.error('Failed to initialize Email Service:', error.message);
      this.enabled = false;
    }
  }

  // Send alert email
  async sendAlert(event) {
    if (!this.enabled) {
      logger.warn('Email service is not enabled');
      return { success: false, error: 'Email service not enabled' };
    }

    try {
      const to = process.env.ALERT_EMAIL || process.env.SMTP_USER;
      
      const subject = `[告警] ${event.ruleName}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #d32f2f; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background: #f5f5f5; padding: 20px; border-radius: 0 0 5px 5px; }
            .info-row { margin: 10px 0; padding: 10px; background: white; border-radius: 3px; }
            .label { font-weight: bold; color: #666; }
            .value { color: #333; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🚨 系统告警通知</h2>
            </div>
            <div class="content">
              <div class="info-row">
                <span class="label">告警规则:</span>
                <span class="value">${event.ruleName}</span>
              </div>
              <div class="info-row">
                <span class="label">节点:</span>
                <span class="value">${event.nodeName} (${event.nodeId})</span>
              </div>
              <div class="info-row">
                <span class="label">监控指标:</span>
                <span class="value">${this.getMetricLabel(event.metric)}</span>
              </div>
              <div class="info-row">
                <span class="label">当前值:</span>
                <span class="value" style="color: #d32f2f; font-weight: bold;">${event.currentValue.toFixed(1)}%</span>
              </div>
              <div class="info-row">
                <span class="label">阈值:</span>
                <span class="value">${event.threshold}%</span>
              </div>
              <div class="info-row">
                <span class="label">触发时间:</span>
                <span class="value">${new Date(event.triggeredAt).toLocaleString('zh-CN')}</span>
              </div>
              <div class="info-row">
                <span class="label">告警消息:</span>
                <span class="value">${event.message}</span>
              </div>
              <div class="footer">
                <p>此邮件由 EOMS 监控系统自动发送，请勿回复。</p>
                <p>如需处理告警，请登录系统: <a href="http://localhost:5174">http://localhost:5174</a></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const info = await this.transporter.sendMail({
        from: `"EOMS监控系统" <${process.env.SMTP_USER}>`,
        to: to,
        subject: subject,
        html: html
      });

      logger.info(`Alert email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send alert email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send recovery email
  async sendRecovery(data) {
    if (!this.enabled) {
      return { success: false, error: 'Email service not enabled' };
    }

    try {
      const to = process.env.ALERT_EMAIL || process.env.SMTP_USER;
      
      const subject = `[恢复] ${data.ruleName}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4caf50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background: #f5f5f5; padding: 20px; border-radius: 0 0 5px 5px; }
            .info-row { margin: 10px 0; padding: 10px; background: white; border-radius: 3px; }
            .label { font-weight: bold; color: #666; }
            .value { color: #333; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>✅ 告警恢复通知</h2>
            </div>
            <div class="content">
              <div class="info-row">
                <span class="label">告警规则:</span>
                <span class="value">${data.ruleName}</span>
              </div>
              <div class="info-row">
                <span class="label">节点:</span>
                <span class="value">${data.nodeName} (${data.nodeId})</span>
              </div>
              <div class="info-row">
                <span class="label">监控指标:</span>
                <span class="value">${this.getMetricLabel(data.metric)}</span>
              </div>
              <div class="info-row">
                <span class="label">当前值:</span>
                <span class="value" style="color: #4caf50; font-weight: bold;">${data.currentValue.toFixed(1)}%</span>
              </div>
              <div class="info-row">
                <span class="label">阈值:</span>
                <span class="value">${data.threshold}%</span>
              </div>
              <div class="info-row">
                <span class="label">恢复时间:</span>
                <span class="value">${new Date().toLocaleString('zh-CN')}</span>
              </div>
              <div class="info-row">
                <span class="label">恢复消息:</span>
                <span class="value">${data.message}</span>
              </div>
              <div class="footer">
                <p>此邮件由 EOMS 监控系统自动发送，请勿回复。</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const info = await this.transporter.sendMail({
        from: `"EOMS监控系统" <${process.env.SMTP_USER}>`,
        to: to,
        subject: subject,
        html: html
      });

      logger.info(`Recovery email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send recovery email:', error);
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

  // Check if email is enabled
  isEnabled() {
    return this.enabled;
  }
}

module.exports = new EmailService();
