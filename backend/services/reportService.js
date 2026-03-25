const redisClient = require('../config/redis');
const influxClient = require('../config/influxdb');
const logger = require('../utils/logger');

class ReportService {
  constructor() {
    this.REPORTS_KEY = 'reports';
    this.REPORT_PREFIX = 'report:';
    this.REPORT_TYPES = {
      DAILY: 'daily',
      WEEKLY: 'weekly',
      MONTHLY: 'monthly',
      CUSTOM: 'custom'
    };
  }

  // 生成报表
  async generateReport(reportConfig) {
    try {
      const { type, nodeIds, startTime, endTime, metrics } = reportConfig;

      logger.info(`Generating ${type} report for nodes: ${nodeIds.join(', ')}`);

      // 获取数据
      const reportData = await this.collectReportData(nodeIds, startTime, endTime, metrics);

      // 计算统计信息
      const statistics = this.calculateStatistics(reportData);

      // 创建报表记录
      const report = {
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        nodeIds,
        startTime,
        endTime,
        metrics: metrics || ['cpu', 'memory', 'disk', 'network'],
        data: reportData,
        statistics,
        createdAt: new Date().toISOString(),
        createdBy: reportConfig.userId || 'system'
      };

      // 保存报表
      await this.saveReport(report);

      logger.info(`Report generated: ${report.id}`);

      return report;
    } catch (error) {
      logger.error('Error generating report:', error);
      throw error;
    }
  }

  // 收集报表数据
  async collectReportData(nodeIds, startTime, endTime, metrics) {
    const reportData = {};

    for (const nodeId of nodeIds) {
      try {
        // 获取节点信息
        const nodeInfo = await redisClient.getNodeInfo(nodeId);
        
        // 获取历史数据
        const historyData = await influxClient.queryMetrics(
          nodeId,
          startTime,
          endTime,
          '1h' // 1小时聚合
        );

        // 格式化数据
        const formattedData = this.formatHistoryData(historyData, metrics);

        reportData[nodeId] = {
          nodeInfo,
          metrics: formattedData
        };
      } catch (error) {
        logger.error(`Error collecting data for node ${nodeId}:`, error);
        reportData[nodeId] = {
          error: error.message
        };
      }
    }

    return reportData;
  }

  // 格式化历史数据
  formatHistoryData(data, metrics) {
    const grouped = {};
    
    data.forEach(row => {
      const timestamp = row._time;
      const field = row._field;
      
      // 只包含请求的指标
      if (!metrics || metrics.includes(field)) {
        if (!grouped[timestamp]) {
          grouped[timestamp] = { timestamp };
        }
        grouped[timestamp][field] = row._value;
      }
    });

    return Object.values(grouped);
  }

  // 计算统计信息
  calculateStatistics(reportData) {
    const statistics = {
      totalNodes: Object.keys(reportData).length,
      nodeStatistics: {}
    };

    for (const [nodeId, nodeData] of Object.entries(reportData)) {
      if (nodeData.error) {
        statistics.nodeStatistics[nodeId] = { error: nodeData.error };
        continue;
      }

      const metrics = nodeData.metrics || [];
      const stats = {
        dataPoints: metrics.length,
        cpu: this.calculateMetricStats(metrics, 'cpu'),
        memory: this.calculateMetricStats(metrics, 'memory'),
        disk: this.calculateMetricStats(metrics, 'disk'),
        network_in: this.calculateMetricStats(metrics, 'network_in'),
        network_out: this.calculateMetricStats(metrics, 'network_out')
      };

      statistics.nodeStatistics[nodeId] = stats;
    }

    return statistics;
  }

  // 计算单个指标的统计信息
  calculateMetricStats(data, metricName) {
    const values = data
      .map(d => d[metricName])
      .filter(v => v !== undefined && v !== null);

    if (values.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      avg: parseFloat(avg.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      count: values.length
    };
  }

  // 保存报表
  async saveReport(report) {
    try {
      // 保存报表数据（不包含详细数据，只保存元数据）
      const metadata = {
        id: report.id,
        type: report.type,
        nodeIds: JSON.stringify(report.nodeIds),
        startTime: report.startTime,
        endTime: report.endTime,
        metrics: JSON.stringify(report.metrics),
        statistics: JSON.stringify(report.statistics),
        createdAt: report.createdAt,
        createdBy: report.createdBy
      };

      await redisClient.client.hSet(
        `${this.REPORT_PREFIX}${report.id}`,
        metadata
      );

      // 添加到报表列表
      await redisClient.client.sAdd(this.REPORTS_KEY, report.id);

      // 设置过期时间（30天）
      await redisClient.client.expire(`${this.REPORT_PREFIX}${report.id}`, 30 * 24 * 60 * 60);

      return true;
    } catch (error) {
      logger.error('Error saving report:', error);
      throw error;
    }
  }

  // 获取报表
  async getReport(reportId) {
    try {
      const metadata = await redisClient.client.hGetAll(`${this.REPORT_PREFIX}${reportId}`);
      
      if (!metadata || Object.keys(metadata).length === 0) {
        return null;
      }

      return {
        id: metadata.id,
        type: metadata.type,
        nodeIds: JSON.parse(metadata.nodeIds),
        startTime: metadata.startTime,
        endTime: metadata.endTime,
        metrics: JSON.parse(metadata.metrics),
        statistics: JSON.parse(metadata.statistics),
        createdAt: metadata.createdAt,
        createdBy: metadata.createdBy
      };
    } catch (error) {
      logger.error('Error getting report:', error);
      return null;
    }
  }

  // 获取所有报表
  async getAllReports(limit = 50) {
    try {
      const reportIds = await redisClient.client.sMembers(this.REPORTS_KEY);
      const reports = [];

      // 获取最近的报表
      const sortedIds = reportIds.sort().reverse().slice(0, limit);

      for (const reportId of sortedIds) {
        const report = await this.getReport(reportId);
        if (report) {
          reports.push(report);
        }
      }

      // 按创建时间排序
      reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return reports;
    } catch (error) {
      logger.error('Error getting all reports:', error);
      return [];
    }
  }

  // 删除报表
  async deleteReport(reportId) {
    try {
      await redisClient.client.del(`${this.REPORT_PREFIX}${reportId}`);
      await redisClient.client.sRem(this.REPORTS_KEY, reportId);
      
      logger.info(`Report deleted: ${reportId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting report:', error);
      throw error;
    }
  }

  // 生成预定义报表
  async generatePredefinedReport(type, nodeIds, userId) {
    const now = new Date();
    let startTime, endTime;

    switch (type) {
      case this.REPORT_TYPES.DAILY:
        // 昨天
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;

      case this.REPORT_TYPES.WEEKLY:
        // 过去7天
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endTime = now;
        break;

      case this.REPORT_TYPES.MONTHLY:
        // 过去30天
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endTime = now;
        break;

      default:
        throw new Error('Invalid report type');
    }

    return await this.generateReport({
      type,
      nodeIds,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      userId
    });
  }

  // 生成报表摘要
  generateReportSummary(report) {
    const summary = {
      id: report.id,
      type: report.type,
      period: `${report.startTime} ~ ${report.endTime}`,
      totalNodes: report.statistics.totalNodes,
      createdAt: report.createdAt
    };

    // 计算整体统计
    const allStats = Object.values(report.statistics.nodeStatistics)
      .filter(s => !s.error);

    if (allStats.length > 0) {
      summary.overallStats = {
        avgCpu: this.calculateAverage(allStats.map(s => s.cpu?.avg)),
        avgMemory: this.calculateAverage(allStats.map(s => s.memory?.avg)),
        avgDisk: this.calculateAverage(allStats.map(s => s.disk?.avg))
      };
    }

    return summary;
  }

  // 计算平均值
  calculateAverage(values) {
    const validValues = values.filter(v => v !== undefined && v !== null);
    if (validValues.length === 0) return 0;
    const sum = validValues.reduce((a, b) => a + b, 0);
    return parseFloat((sum / validValues.length).toFixed(2));
  }

  // 获取报表类型列表
  getReportTypes() {
    return Object.values(this.REPORT_TYPES);
  }
}

module.exports = new ReportService();
