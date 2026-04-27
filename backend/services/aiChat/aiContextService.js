const defaultDataStore = require('../dataStore');
const defaultAlertService = require('../alertService');

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function createAiContextService({
  dataStore = defaultDataStore,
  alertService = defaultAlertService,
  now = () => new Date()
} = {}) {
  function getRangeStart(timeRange) {
    const end = new Date(now());
    const start = new Date(end);

    if (timeRange === '24h') {
      start.setHours(start.getHours() - 24);
    } else if (timeRange === '7d') {
      start.setDate(start.getDate() - 7);
    } else {
      start.setDate(start.getDate() - 30);
    }

    return {
      startTime: start.toISOString(),
      endTime: end.toISOString()
    };
  }

  return {
    async buildContextSummary({ nodeId = '', incidentId = '', timeRange }) {
      const context = {
        node: null,
        incident: null,
        metricsSummary: {
          timeRange,
          samples: 0,
          maxCpu: null,
          avgCpu: null,
          trend: 'insufficient_data',
          anomalies: []
        },
        latestAnalysisSummary: null
      };

      const promptSegments = [`timeRange=${timeRange}`];

      if (nodeId) {
        const [nodeInfo, latestMetrics] = await Promise.all([
          dataStore.getNodeInfo(nodeId),
          dataStore.getLatestMetrics(nodeId)
        ]);

        context.node = {
          nodeId,
          displayName: nodeInfo?.display_name || nodeInfo?.hostname || nodeId,
          status: nodeInfo?.status || 'unknown',
          cpu: toNumber(latestMetrics?.cpu_usage),
          memory: toNumber(latestMetrics?.memory_usage),
          disk: toNumber(latestMetrics?.disk_usage),
          timestamp: latestMetrics?.timestamp || ''
        };

        const { startTime, endTime } = getRangeStart(timeRange);
        const history = await dataStore.getHistoryMetrics(nodeId, startTime, endTime, '1h');
        const cpuSeries = history
          .map(item => toNumber(item.cpu_usage))
          .filter(value => value !== null);
        const maxCpu = cpuSeries.length > 0 ? Math.max(...cpuSeries) : null;
        const avgCpu = cpuSeries.length > 0
          ? Number((cpuSeries.reduce((sum, value) => sum + value, 0) / cpuSeries.length).toFixed(1))
          : null;

        context.metricsSummary = {
          timeRange,
          samples: history.length,
          maxCpu,
          avgCpu,
          trend: cpuSeries.length > 1 && cpuSeries[cpuSeries.length - 1] > cpuSeries[0] ? 'up' : 'steady',
          anomalies: maxCpu !== null && maxCpu >= 80 ? ['cpu_spike'] : []
        };

        promptSegments.push(
          `nodeId=${nodeId}`,
          `nodeStatus=${context.node.status}`,
          `maxCpu=${maxCpu ?? 'n/a'}`
        );
      }

      if (incidentId) {
        const incident = await alertService.getEventById(incidentId);
        context.incident = incident ? {
          incidentId,
          status: incident.status || 'unknown',
          severity: incident.severity || 'unknown',
          summary: incident.message || '',
          nodeId: incident.nodeId || '',
          ruleId: incident.ruleId || ''
        } : {
          incidentId,
          status: 'not_found',
          severity: 'unknown',
          summary: '',
          nodeId: '',
          ruleId: ''
        };

        promptSegments.push(
          `incidentId=${incidentId}`,
          `incidentStatus=${context.incident.status}`
        );
      }

      return {
        context,
        promptSummary: promptSegments.join(' | ')
      };
    }
  };
}

module.exports = {
  createAiContextService
};
