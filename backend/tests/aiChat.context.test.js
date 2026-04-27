const test = require('node:test');
const assert = require('node:assert/strict');

let createAiContextService;

try {
  ({ createAiContextService } = require('../services/aiChat/aiContextService'));
} catch (error) {
  // The assertions below intentionally fail until the implementation exists.
}

test('aiContextService builds backend-owned context summaries from node and incident inputs', async () => {
  assert.equal(typeof createAiContextService, 'function');

  const contextService = createAiContextService({
    dataStore: {
      async getNodeInfo(nodeId) {
        return {
          node_id: nodeId,
          hostname: 'worker-01',
          display_name: 'Worker 01',
          status: 'online'
        };
      },
      async getLatestMetrics() {
        return {
          cpu_usage: '82.5',
          memory_usage: '71.3',
          disk_usage: '63.8',
          timestamp: '2026-04-17T07:55:00.000Z'
        };
      },
      async getHistoryMetrics() {
        return [
          { cpu_usage: 55, memory_usage: 61, disk_usage: 62 },
          { cpu_usage: 87, memory_usage: 73, disk_usage: 64 },
          { cpu_usage: 79, memory_usage: 71, disk_usage: 65 }
        ];
      }
    },
    alertService: {
      async getEventById(incidentId) {
        return {
          id: incidentId,
          status: 'active',
          severity: 'high',
          message: 'CPU usage exceeded threshold',
          nodeId: 'node-ctx-1',
          ruleId: 'rule-77'
        };
      }
    }
  });

  const summary = await contextService.buildContextSummary({
    nodeId: 'node-ctx-1',
    incidentId: 'incident-ctx-1',
    timeRange: '24h'
  });

  assert.equal(summary.context.node.nodeId, 'node-ctx-1');
  assert.equal(summary.context.node.displayName, 'Worker 01');
  assert.equal(summary.context.incident.incidentId, 'incident-ctx-1');
  assert.equal(summary.context.incident.status, 'active');
  assert.equal(summary.context.metricsSummary.timeRange, '24h');
  assert.equal(summary.context.metricsSummary.samples, 3);
  assert.match(summary.promptSummary, /node-ctx-1/i);
  assert.match(summary.promptSummary, /incident-ctx-1/i);
  assert.equal(summary.promptSummary.includes('question'), false);
});
