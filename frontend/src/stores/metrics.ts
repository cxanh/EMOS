import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Metrics } from '@/api/metrics';

export const useMetricsStore = defineStore('metrics', () => {
  // 状态
  const metricsMap = ref<Map<string, Metrics>>(new Map());
  const wsConnected = ref<boolean>(false);
  const wsError = ref<string>('');

  // 更新节点数据
  const updateMetrics = (nodeId: string, data: Metrics) => {
    metricsMap.value.set(nodeId, data);
  };

  // 获取节点数据
  const getMetrics = (nodeId: string) => {
    return metricsMap.value.get(nodeId);
  };

  // 清除节点数据
  const clearMetrics = (nodeId: string) => {
    metricsMap.value.delete(nodeId);
  };

  // 清除所有数据
  const clearAllMetrics = () => {
    metricsMap.value.clear();
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

  return {
    metricsMap,
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
