import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Metrics } from '@/api/metrics';

interface WidgetMetricsPoint {
  cpu: number;
  memory: number;
  disk: number;
  network_recv: number;
  network_sent: number;
  timestamp: string;
}

export const useMetricsStore = defineStore('metrics', () => {
  // 状态
  const metricsMap = ref<Map<string, Metrics>>(new Map());
  const metricsHistory = ref<Record<string, WidgetMetricsPoint[]>>({});
  const wsConnected = ref<boolean>(false);
  const wsError = ref<string>('');

  const toWidgetMetricsPoint = (data: Metrics): WidgetMetricsPoint => ({
    cpu: Number(data.cpu_usage || 0),
    memory: Number(data.memory_usage || 0),
    disk: Number(data.disk_usage || 0),
    network_recv: Number(data.network_rx_bytes || 0),
    network_sent: Number(data.network_tx_bytes || 0),
    timestamp: data.timestamp
  });

  // 更新节点数据
  const updateMetrics = (nodeId: string, data: Metrics) => {
    metricsMap.value.set(nodeId, data);
    const point = toWidgetMetricsPoint(data);
    const currentHistory = metricsHistory.value[nodeId] || [];
    metricsHistory.value[nodeId] = [...currentHistory, point].slice(-60);
  };

  // 获取节点数据
  const getMetrics = (nodeId: string) => {
    return metricsMap.value.get(nodeId);
  };

  // 清除节点数据
  const clearMetrics = (nodeId: string) => {
    metricsMap.value.delete(nodeId);
    delete metricsHistory.value[nodeId];
  };

  // 清除所有数据
  const clearAllMetrics = () => {
    metricsMap.value.clear();
    metricsHistory.value = {};
  };

  // 设置 WebSocket 连接状态
  const setWsConnected = (connected: boolean) => {
    wsConnected.value = connected;
  };

  // 设置 WebSocket 错误
  const setWsError = (error: string) => {
    wsError.value = error;
  };

  // 获取所有节点的最新数据
  const allMetrics = computed(() => {
    const result: Record<string, Metrics> = {};
    metricsMap.value.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  });

  // 兼容旧组件字段（用于自定义组件区）
  const latestMetrics = computed<Record<string, WidgetMetricsPoint>>(() => {
    const result: Record<string, WidgetMetricsPoint> = {};
    metricsMap.value.forEach((value, key) => {
      result[key] = toWidgetMetricsPoint(value);
    });
    return result;
  });

  return {
    metricsMap,
    metricsHistory,
    latestMetrics,
    wsConnected,
    wsError,
    updateMetrics,
    getMetrics,
    clearMetrics,
    clearAllMetrics,
    setWsConnected,
    setWsError,
    allMetrics
  };
});
