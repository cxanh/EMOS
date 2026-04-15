import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ActionRequestInput,
  ActionRequestRecord,
  ActionRequestStatus,
  TimelineEvent
} from '@/api/aiOps'
import * as aiOpsApi from '@/api/aiOps'

const TERMINAL_STATUSES: ActionRequestStatus[] = ['SUCCEEDED', 'FAILED']

export const useAiOpsStore = defineStore('aiOps', () => {
  // State
  const currentRequest = ref<ActionRequestRecord | null>(null)
  const timeline = ref<TimelineEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const polling = ref(false)

  let pollingTimer: ReturnType<typeof setTimeout> | null = null

  // Actions
  const createRequest = async (input: ActionRequestInput) => {
    try {
      loading.value = true
      error.value = null

      const response = await aiOpsApi.createActionRequest(input)
      if (response.success) {
        await fetchRequest(response.data.requestId)
        return response.data
      }
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.message || 'Failed to create request'
      console.error('[AI Ops Store] Error creating request:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const confirmRequest = async (requestId: string) => {
    try {
      loading.value = true
      error.value = null

      const response = await aiOpsApi.confirmActionRequest(requestId)
      if (response.success) {
        await fetchRequest(requestId)
        return response.data
      }
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.message || 'Failed to confirm request'
      console.error('[AI Ops Store] Error confirming request:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchRequest = async (requestId: string) => {
    try {
      loading.value = true
      error.value = null

      const response = await aiOpsApi.getActionRequest(requestId)
      if (response.success) {
        currentRequest.value = response.data
        return response.data
      }
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.message || 'Failed to fetch request'
      console.error('[AI Ops Store] Error fetching request:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchTimeline = async (requestId: string) => {
    try {
      loading.value = true
      error.value = null

      const response = await aiOpsApi.getActionTimeline(requestId)
      if (response.success) {
        timeline.value = response.data.events
        return response.data
      }
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.message || 'Failed to fetch timeline'
      console.error('[AI Ops Store] Error fetching timeline:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const startPolling = (requestId: string) => {
    if (pollingTimer) {
      return
    }

    polling.value = true

    const poll = async () => {
      try {
        await fetchRequest(requestId)
      } catch (err) {
        return stopPolling()
      }

      const status = currentRequest.value?.status
      if (status && !TERMINAL_STATUSES.includes(status)) {
        pollingTimer = setTimeout(poll, 2000)
        return
      }

      stopPolling()
    }

    pollingTimer = setTimeout(poll, 0)
  }

  const stopPolling = () => {
    if (pollingTimer) {
      clearTimeout(pollingTimer)
      pollingTimer = null
    }
    polling.value = false
  }

  const reset = () => {
    stopPolling()
    currentRequest.value = null
    timeline.value = []
    loading.value = false
    error.value = null
  }

  return {
    // State
    currentRequest,
    timeline,
    loading,
    error,
    polling,
    // Actions
    createRequest,
    confirmRequest,
    fetchRequest,
    fetchTimeline,
    startPolling,
    stopPolling,
    reset
  }
})
