import api from './index';

export interface Metrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_rx_bytes: number;
  network_tx_bytes: number;
  timestamp: string;
}

export interface LatestMetricsResponse {
  success: boolean;
  data: {
    node_id: string;
    metrics: Metrics;
    timestamp: string;
  };
}

export interface HistoryMetricsResponse {
  success: boolean;
  data: {
    node_id: string;
    start_time: string;
    end_time: string;
    interval: string;
    metrics: Metrics[];
    count: number;
  };
}

export interface NodesResponse {
  success: boolean;
  data: {
    nodes: Array<{
      node_id: string;
      hostname: string;
      ip: string;
      status: string;
      last_heartbeat: string;
    }>;
    count: number;
  };
}

export interface StatsResponse {
  success: boolean;
  data: {
    node_id: string;
    period: string;
    stats: {
      cpu: { avg: number; max: number; min: number };
      memory: { avg: number; max: number; min: number };
      disk: { avg: number; max: number; min: number };
    };
    data_points: number;
  };
}

// 获取最新数据
export const getLatestMetrics = (nodeId: string) => {
  return api.get<any, LatestMetricsResponse>(`/metrics/latest/${nodeId}`);
};

// 获取历史数据
export const getHistoryMetrics = (params: {
  nodeId: string;
  startTime: string;
  endTime: string;
  interval?: string;
}) => {
  return api.get<any, HistoryMetricsResponse>('/metrics/history', { params });
};

// 获取节点列表
export const getNodes = () => {
  return api.get<any, NodesResponse>('/metrics/nodes');
};

// 获取节点统计信息
export const getNodeStats = (nodeId: string, period: string = '1h') => {
  return api.get<any, StatsResponse>(`/metrics/stats/${nodeId}`, {
    params: { period }
  });
};
