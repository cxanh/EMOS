import request from './index';

export interface Report {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  nodeIds: string[];
  startTime: string;
  endTime: string;
  metrics: string[];
  statistics: ReportStatistics;
  createdAt: string;
  createdBy: string;
}

export interface ReportStatistics {
  totalNodes: number;
  nodeStatistics: {
    [nodeId: string]: NodeStatistics;
  };
}

export interface NodeStatistics {
  dataPoints?: number;
  cpu?: MetricStats;
  memory?: MetricStats;
  disk?: MetricStats;
  network_in?: MetricStats;
  network_out?: MetricStats;
  error?: string;
}

export interface MetricStats {
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface GenerateReportData {
  nodeIds: string[];
  startTime: string;
  endTime: string;
  metrics?: string[];
}

export interface GeneratePredefinedReportData {
  nodeIds: string[];
}

export interface ReportSummary {
  id: string;
  type: string;
  period: string;
  totalNodes: number;
  createdAt: string;
  overallStats?: {
    avgCpu: number;
    avgMemory: number;
    avgDisk: number;
  };
}

// 获取所有报表
export function getAllReports(limit?: number) {
  return request.get<Report[]>('/reports', {
    params: { limit }
  });
}

// 获取指定报表
export function getReport(reportId: string) {
  return request.get<Report>(`/reports/${reportId}`);
}

// 生成自定义报表
export function generateReport(data: GenerateReportData) {
  return request.post<Report>('/reports/generate', data);
}

// 生成预定义报表（日报、周报、月报）
export function generatePredefinedReport(type: 'daily' | 'weekly' | 'monthly', data: GeneratePredefinedReportData) {
  return request.post<Report>(`/reports/generate/${type}`, data);
}

// 删除报表
export function deleteReport(reportId: string) {
  return request.delete(`/reports/${reportId}`);
}

// 获取报表摘要
export function getReportSummary(reportId: string) {
  return request.get<ReportSummary>(`/reports/${reportId}/summary`);
}

// 获取报表类型列表
export function getReportTypes() {
  return request.get<Array<{ value: string; label: string }>>('/reports/meta/types');
}
