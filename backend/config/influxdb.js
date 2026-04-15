const { InfluxDB, Point } = require('@influxdata/influxdb-client');
require('dotenv').config();

function shouldEnableInflux(token) {
  if (!token) return false;

  const normalized = String(token).trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === 'your_influx_token_here') return false;

  return true;
}

class InfluxDBClient {
  constructor() {
    this.client = null;
    this.writeApi = null;
    this.queryApi = null;
    this.isConnected = false;
    this.hasLoggedDisable = false;
  }

  async connect() {
    try {
      const url = process.env.INFLUX_URL || 'http://localhost:8086';
      const token = process.env.INFLUX_TOKEN;
      const org = process.env.INFLUX_ORG || 'eoms';
      const bucket = process.env.INFLUX_BUCKET || 'system_monitoring';

      if (!shouldEnableInflux(token)) {
        console.warn('InfluxDB token not configured. InfluxDB features will be disabled.');
        this.isConnected = false;
        return;
      }

      this.client = new InfluxDB({ url, token });
      this.writeApi = this.client.getWriteApi(org, bucket, 'ms');
      this.queryApi = this.client.getQueryApi(org);

      // 设置默认标签
      this.writeApi.useDefaultTags({ app: 'eoms' });

      this.isConnected = true;
      this.hasLoggedDisable = false;
      console.log('InfluxDB Client Connected');
    } catch (error) {
      console.error('Failed to connect to InfluxDB:', error);
      this.isConnected = false;
    }
  }

  // 写入监控数据
  async writeMetrics(nodeId, hostname, metrics, timestamp) {
    if (!this.isConnected || !this.writeApi) {
      console.warn('InfluxDB not connected, skipping write');
      return;
    }

    try {
      const point = new Point('system_metrics')
        .tag('node_id', nodeId)
        .tag('hostname', hostname || nodeId)
        .floatField('cpu_usage', parseFloat(metrics.cpu_usage) || 0)
        .floatField('memory_usage', parseFloat(metrics.memory_usage) || 0)
        .floatField('disk_usage', parseFloat(metrics.disk_usage) || 0)
        .intField('network_rx_bytes', parseInt(metrics.network_rx_bytes) || 0)
        .intField('network_tx_bytes', parseInt(metrics.network_tx_bytes) || 0)
        .timestamp(new Date(timestamp));

      this.writeApi.writePoint(point);
      
      // 每10个点刷新一次
      if (Math.random() < 0.1) {
        await this.writeApi.flush();
      }
    } catch (error) {
      console.error('Error writing to InfluxDB:', error);
      this.isConnected = false;
      if (!this.hasLoggedDisable) {
        console.warn('InfluxDB write failed. InfluxDB features are now disabled until service restart.');
        this.hasLoggedDisable = true;
      }
    }
  }

  // 查询历史数据
  async queryMetrics(nodeId, startTime, endTime, interval = '1m') {
    if (!this.isConnected || !this.queryApi) {
      console.warn('InfluxDB not connected, cannot query');
      return [];
    }

    try {
      const fluxQuery = `
        from(bucket: "${process.env.INFLUX_BUCKET || 'system_monitoring'}")
          |> range(start: ${startTime}, stop: ${endTime})
          |> filter(fn: (r) => r["_measurement"] == "system_metrics")
          |> filter(fn: (r) => r["node_id"] == "${nodeId}")
          |> aggregateWindow(every: ${interval}, fn: mean, createEmpty: false)
          |> yield(name: "mean")
      `;

      const results = [];
      return new Promise((resolve, reject) => {
        this.queryApi.queryRows(fluxQuery, {
          next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            results.push(o);
          },
          error(error) {
            console.error('Query error:', error);
            reject(error);
          },
          complete() {
            resolve(results);
          }
        });
      });
    } catch (error) {
      console.error('Error querying InfluxDB:', error);
      return [];
    }
  }

  // 获取节点列表
  async getNodeList() {
    if (!this.isConnected || !this.queryApi) {
      return [];
    }

    try {
      const fluxQuery = `
        from(bucket: "${process.env.INFLUX_BUCKET || 'system_monitoring'}")
          |> range(start: -24h)
          |> filter(fn: (r) => r["_measurement"] == "system_metrics")
          |> keep(columns: ["node_id", "hostname"])
          |> distinct(column: "node_id")
      `;

      const results = [];
      return new Promise((resolve, reject) => {
        this.queryApi.queryRows(fluxQuery, {
          next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            results.push(o);
          },
          error(error) {
            console.error('Query error:', error);
            reject(error);
          },
          complete() {
            resolve(results);
          }
        });
      });
    } catch (error) {
      console.error('Error querying node list:', error);
      return [];
    }
  }

  // 写入告警事件
  async writeAlertEvent(event) {
    if (!this.isConnected || !this.writeApi) {
      console.warn('InfluxDB not connected, skipping alert event write');
      return;
    }

    try {
      const point = new Point('alert_events')
        .tag('event_id', event.id)
        .tag('rule_id', event.ruleId)
        .tag('node_id', event.nodeId)
        .tag('metric', event.metric)
        .tag('status', event.status)
        .floatField('current_value', event.currentValue)
        .floatField('threshold', event.threshold)
        .stringField('message', event.message)
        .timestamp(new Date(event.triggeredAt));

      this.writeApi.writePoint(point);
      await this.writeApi.flush();
    } catch (error) {
      console.error('Error writing alert event to InfluxDB:', error);
      this.isConnected = false;
      if (!this.hasLoggedDisable) {
        console.warn('InfluxDB write failed. InfluxDB features are now disabled until service restart.');
        this.hasLoggedDisable = true;
      }
    }
  }

  // 查询告警历史
  async queryAlertHistory(options = {}) {
    if (!this.isConnected || !this.queryApi) {
      return [];
    }

    try {
      const { nodeId, startTime, endTime, status } = options;
      
      let fluxQuery = `
        from(bucket: "${process.env.INFLUX_BUCKET || 'system_monitoring'}")
          |> range(start: ${startTime || '-7d'}, stop: ${endTime || 'now()'})
          |> filter(fn: (r) => r["_measurement"] == "alert_events")
      `;

      if (nodeId) {
        fluxQuery += `\n  |> filter(fn: (r) => r["node_id"] == "${nodeId}")`;
      }

      if (status) {
        fluxQuery += `\n  |> filter(fn: (r) => r["status"] == "${status}")`;
      }

      fluxQuery += `\n  |> sort(columns: ["_time"], desc: true)`;

      const results = [];
      return new Promise((resolve, reject) => {
        this.queryApi.queryRows(fluxQuery, {
          next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            results.push(o);
          },
          error(error) {
            console.error('Query error:', error);
            reject(error);
          },
          complete() {
            resolve(results);
          }
        });
      });
    } catch (error) {
      console.error('Error querying alert history:', error);
      return [];
    }
  }

  // 关闭连接
  async disconnect() {
    if (this.writeApi) {
      try {
        await this.writeApi.close();
        console.log('InfluxDB Client Disconnected');
      } catch (error) {
        console.error('Error closing InfluxDB connection:', error);
      }
    }
    this.isConnected = false;
  }
}

const influxClient = new InfluxDBClient();
module.exports = influxClient;
module.exports.shouldEnableInflux = shouldEnableInflux;
