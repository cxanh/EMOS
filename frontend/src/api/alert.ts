import request from './index'

// Alert Rule interfaces
export interface AlertRule {
  id: string
  name: string
  nodeId: string
  metric: 'cpu_usage' | 'memory_usage' | 'disk_usage'
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  threshold: number
  duration: number
  enabled: boolean
  notifyChannels: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateRuleRequest {
  name: string
  nodeId?: string
  metric: 'cpu_usage' | 'memory_usage' | 'disk_usage'
  operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  threshold: number
  duration?: number
  notifyChannels?: string[]
}

export interface UpdateRuleRequest {
  name?: string
  nodeId?: string
  metric?: 'cpu_usage' | 'memory_usage' | 'disk_usage'
  operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  threshold?: number
  duration?: number
  enabled?: boolean
  notifyChannels?: string[]
}

// Alert Event interfaces
export interface AlertEvent {
  id: string
  ruleId: string
  ruleName: string
  nodeId: string
  nodeName: string
  metric: string
  currentValue: number
  threshold: number
  status: 'active' | 'resolved' | 'ignored'
  triggeredAt: string
  resolvedAt: string | null
  notified: boolean
  message: string
}

export interface AlertHistoryQuery {
  nodeId?: string
  startTime?: string
  endTime?: string
  status?: string
}

// Alert Rules API
export const createAlertRule = (data: CreateRuleRequest) => {
  return request.post<{ success: boolean; data: AlertRule }>('/alert/rules', data)
}

export const getAlertRules = () => {
  return request.get<{ success: boolean; data: { rules: AlertRule[]; count: number } }>('/alert/rules')
}

export const getAlertRule = (ruleId: string) => {
  return request.get<{ success: boolean; data: AlertRule }>(`/alert/rules/${ruleId}`)
}

export const updateAlertRule = (ruleId: string, data: UpdateRuleRequest) => {
  return request.put<{ success: boolean; data: AlertRule }>(`/alert/rules/${ruleId}`, data)
}

export const deleteAlertRule = (ruleId: string) => {
  return request.delete<{ success: boolean; message: string }>(`/alert/rules/${ruleId}`)
}

// Alert Events API
export const getActiveAlerts = () => {
  return request.get<{ success: boolean; data: { events: AlertEvent[]; count: number } }>('/alert/events/active')
}

export const getAlertHistory = (params: AlertHistoryQuery) => {
  return request.get<{ success: boolean; data: { events: AlertEvent[]; count: number } }>('/alert/events/history', { params })
}

export const resolveAlert = (eventId: string, comment?: string) => {
  return request.post<{ success: boolean; message: string }>(`/alert/events/${eventId}/resolve`, { comment })
}

export const ignoreAlert = (eventId: string) => {
  return request.post<{ success: boolean; message: string }>(`/alert/events/${eventId}/ignore`)
}

// Alert Checker Status API
export const getAlertCheckerStatus = () => {
  return request.get<{ success: boolean; data: { running: boolean; activeAlerts: number; checkInterval: number } }>('/alert/status')
}

// Notification Logs interfaces
export interface NotificationChannel {
  type: 'websocket' | 'email' | 'dingtalk'
  status: 'success' | 'failed'
  error?: string
  sentAt: string
}

export interface NotificationLog {
  id: string
  eventId: string
  ruleName: string
  nodeId: string
  nodeName: string
  timestamp: string
  channels: NotificationChannel[]
}

export interface NotificationStats {
  total: number
  byChannel: {
    websocket: number
    email: number
    dingtalk: number
  }
  byStatus: {
    success: number
    failed: number
  }
  byNode: Record<string, {
    nodeId: string
    nodeName: string
    count: number
  }>
}

// Notification Logs API
export const getNotificationLogs = (params?: {
  limit?: number
  offset?: number
  nodeId?: string
  startTime?: string
  endTime?: string
}) => {
  return request.get<{ success: boolean; data: { logs: NotificationLog[]; count: number } }>('/alert/notifications', { params })
}

export const getNotificationLog = (logId: string) => {
  return request.get<{ success: boolean; data: NotificationLog }>(`/alert/notifications/${logId}`)
}

export const getNotificationStats = (params?: {
  startTime?: string
  endTime?: string
}) => {
  return request.get<{ success: boolean; data: NotificationStats }>('/alert/notifications/stats/summary', { params })
}
