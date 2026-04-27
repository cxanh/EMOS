const test = require('node:test');
const assert = require('node:assert/strict');

const reportService = require('../services/reportService');
const aiService = require('../services/aiService');
const influxClient = require('../config/influxdb');

test('report statistics should read *_usage metric fields', () => {
  const reportData = {
    nodeA: {
      metrics: [
        { cpu_usage: 10, memory_usage: 40, disk_usage: 70 },
        { cpu_usage: 30, memory_usage: 60, disk_usage: 80 }
      ]
    }
  };

  const stats = reportService.calculateStatistics(reportData);
  const nodeStats = stats.nodeStatistics.nodeA;

  assert.equal(nodeStats.cpu.avg, 20);
  assert.equal(nodeStats.cpu.min, 10);
  assert.equal(nodeStats.cpu.max, 30);
  assert.equal(nodeStats.cpu.count, 2);

  assert.equal(nodeStats.memory.avg, 50);
  assert.equal(nodeStats.memory.min, 40);
  assert.equal(nodeStats.memory.max, 60);
  assert.equal(nodeStats.memory.count, 2);

  assert.equal(nodeStats.disk.avg, 75);
  assert.equal(nodeStats.disk.min, 70);
  assert.equal(nodeStats.disk.max, 80);
  assert.equal(nodeStats.disk.count, 2);
});

test('AI trend analysis should call influx query with positional arguments', async () => {
  const originalEnabled = aiService.enabled;
  const originalQueryMetrics = influxClient.queryMetrics;
  const originalCallLLM = aiService.callLLM;

  const capturedCalls = [];

  try {
    aiService.enabled = true;

    influxClient.queryMetrics = async (...args) => {
      capturedCalls.push(args);
      return [
        { cpu_usage: 30, memory_usage: 50, disk_usage: 70 },
        { cpu_usage: 40, memory_usage: 55, disk_usage: 75 }
      ];
    };

    aiService.callLLM = async () =>
      JSON.stringify({
        trend: 'stable',
        pattern: 'none',
        summary: 'ok',
        predictions: [],
        anomalies: [],
        insights: []
      });

    const result = await aiService.analyzeTrend('node-001', '24h');

    assert.equal(result.success, true);
    assert.equal(capturedCalls.length, 1);
    assert.equal(capturedCalls[0][0], 'node-001');
    assert.equal(typeof capturedCalls[0][1], 'string');
    assert.equal(typeof capturedCalls[0][2], 'string');
    assert.notEqual(capturedCalls[0][1], 'undefined');
    assert.notEqual(capturedCalls[0][2], 'undefined');
  } finally {
    aiService.enabled = originalEnabled;
    influxClient.queryMetrics = originalQueryMetrics;
    aiService.callLLM = originalCallLLM;
  }
});
