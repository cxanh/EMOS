import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AlertRule, AlertEvent as ApiAlertEvent, CreateRuleRequest, UpdateRuleRequest, AlertHistoryQuery } from '@/api/alert'
import * as alertApi from '@/api/alert'

type AlertEvent = Omit<ApiAlertEvent, 'currentValue' | 'threshold' | 'triggeredAt'> & {
  currentValue: number | null
  threshold: number | null
  triggeredAt: string | null
}

export const useAlertStore = defineStore('alert', () => {
  // State
  const rules = ref<AlertRule[]>([])
  const activeEvents = ref<AlertEvent[]>([])
  const historyEvents = ref<AlertEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activeAlertCount = computed(() => activeEvents.value.length)
  const enabledRules = computed(() => rules.value.filter(r => r.enabled))
  const disabledRules = computed(() => rules.value.filter(r => !r.enabled))

  const normalizeFiniteNumber = (value: unknown): number | null => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return null

      const numericValue = Number(trimmed)
      return Number.isFinite(numericValue) ? numericValue : null
    }

    return null
  }

  const normalizeTimestamp = (value: unknown): string | null => {
    if (typeof value !== 'string') return null

    const trimmed = value.trim()
    if (!trimmed) return null

    return Number.isNaN(new Date(trimmed).getTime()) ? null : trimmed
  }

  const normalizeAlertEvent = (event: any): AlertEvent => ({
    ...event,
    currentValue: normalizeFiniteNumber(event.currentValue),
    threshold: normalizeFiniteNumber(event.threshold),
    triggeredAt: normalizeTimestamp(event.triggeredAt),
    resolvedAt: typeof event.resolvedAt === 'string' && event.resolvedAt.trim()
      ? event.resolvedAt
      : null
  })

  // Actions - Rules
  const fetchRules = async () => {
    try {
      loading.value = true
      error.value = null
      console.log('[Alert Store] Fetching rules...')
      const response = await alertApi.getAlertRules()
      console.log('[Alert Store] Fetch rules response:', response)
      
      // axios拦截器已经返回了response.data，所以这里直接访问response
      if (response.success && response.data?.rules) {
        rules.value = [...response.data.rules]
        console.log('[Alert Store] Rules fetched:', rules.value.length, 'rules')
      } else {
        console.error('[Alert Store] Invalid response structure:', response)
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch alert rules'
      console.error('[Alert Store] Error fetching alert rules:', err)
    } finally {
      loading.value = false
    }
  }

  const createRule = async (data: CreateRuleRequest) => {
    try {
      loading.value = true
      error.value = null
      
      console.log('[Alert Store] Creating rule:', data)
      const response = await alertApi.createAlertRule(data)
      console.log('[Alert Store] Create response:', response)
      
      // axios拦截器已经返回了response.data
      if (response.success) {
        // 重新获取所有规则以确保数据同步
        console.log('[Alert Store] Fetching rules after create...')
        const fetchResponse = await alertApi.getAlertRules()
        console.log('[Alert Store] Fetch response:', fetchResponse)
        
        if (fetchResponse.success && fetchResponse.data?.rules) {
          // 强制更新 rules 数组
          rules.value = [...fetchResponse.data.rules]
          console.log('[Alert Store] Rules updated:', rules.value.length, 'rules')
        } else {
          console.error('[Alert Store] Invalid fetch response structure')
        }
        return response.data
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to create alert rule'
      console.error('[Alert Store] Error creating alert rule:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateRule = async (ruleId: string, data: UpdateRuleRequest) => {
    try {
      loading.value = true
      error.value = null
      const response = await alertApi.updateAlertRule(ruleId, data)
      if (response.success) {
        // 重新获取所有规则以确保数据同步
        const fetchResponse = await alertApi.getAlertRules()
        if (fetchResponse.success && fetchResponse.data?.rules) {
          rules.value = [...fetchResponse.data.rules]
        }
        return response.data
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to update alert rule'
      console.error('Error updating alert rule:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteRule = async (ruleId: string) => {
    try {
      loading.value = true
      error.value = null
      const response = await alertApi.deleteAlertRule(ruleId)
      if (response.success) {
        // 重新获取所有规则以确保数据同步
        const fetchResponse = await alertApi.getAlertRules()
        if (fetchResponse.success && fetchResponse.data?.rules) {
          rules.value = [...fetchResponse.data.rules]
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to delete alert rule'
      console.error('Error deleting alert rule:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    return updateRule(ruleId, { enabled })
  }

  // Actions - Events
  const fetchActiveEvents = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await alertApi.getActiveAlerts()
      if (response.success && response.data?.events) {
        activeEvents.value = response.data.events.map(normalizeAlertEvent)
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch active alerts'
      console.error('Error fetching active alerts:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchHistory = async (query: AlertHistoryQuery) => {
    try {
      loading.value = true
      error.value = null
      const response = await alertApi.getAlertHistory(query)
      if (response.success && response.data?.events) {
        historyEvents.value = response.data.events.map(normalizeAlertEvent)
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch alert history'
      console.error('Error fetching alert history:', err)
    } finally {
      loading.value = false
    }
  }

  const resolveEvent = async (eventId: string, comment?: string) => {
    try {
      loading.value = true
      error.value = null
      const response = await alertApi.resolveAlert(eventId, comment)
      if (response.success) {
        activeEvents.value = activeEvents.value.filter(e => e.id !== eventId)
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to resolve alert'
      console.error('Error resolving alert:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const ignoreEvent = async (eventId: string) => {
    try {
      loading.value = true
      error.value = null
      const response = await alertApi.ignoreAlert(eventId)
      if (response.success) {
        activeEvents.value = activeEvents.value.filter(e => e.id !== eventId)
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to ignore alert'
      console.error('Error ignoring alert:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // WebSocket handler
  const handleAlertMessage = (data: any) => {
    if (data.action === 'triggered') {
      // New alert triggered
      activeEvents.value.push(normalizeAlertEvent(data.data))
    } else if (data.action === 'resolved') {
      // Alert resolved
      activeEvents.value = activeEvents.value.filter(e => e.id !== data.data.eventId)
    } else if (data.action === 'ignored') {
      // Alert ignored
      activeEvents.value = activeEvents.value.filter(e => e.id !== data.data.eventId)
    } else if (data.action === 'recovered') {
      // Alert recovered (auto-resolved)
      console.log('Alert recovered:', data.data)
    }
  }

  return {
    // State
    rules,
    activeEvents,
    historyEvents,
    loading,
    error,
    // Computed
    activeAlertCount,
    enabledRules,
    disabledRules,
    // Actions
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    fetchActiveEvents,
    fetchHistory,
    resolveEvent,
    ignoreEvent,
    handleAlertMessage
  }
})
