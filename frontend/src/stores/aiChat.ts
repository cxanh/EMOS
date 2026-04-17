import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AIStatus } from '@/api/ai'
import { getAIStatus } from '@/api/ai'
import type {
  AIChatAssistantMessage,
  AIChatSessionRecord,
  AIChatTimeRange
} from '@/api/aiChat'
import {
  createAIChatSession,
  getAIChatMessages,
  getAIChatSession,
  listAIChatSessions,
  postAIChatMessage
} from '@/api/aiChat'

export interface AIChatContextForm {
  nodeId: string
  incidentId: string
  timeRange: AIChatTimeRange
}

function normalizeErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.error?.message || error?.message || fallback
}

function normalizeQueryString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeTimeRange(value: unknown): AIChatTimeRange {
  return value === '7d' || value === '30d' ? value : '24h'
}

export const useAIChatStore = defineStore('aiChat', () => {
  const aiStatus = ref<AIStatus | null>(null)
  const context = ref<AIChatContextForm>({
    nodeId: '',
    incidentId: '',
    timeRange: '24h'
  })
  const sessions = ref<AIChatSessionRecord[]>([])
  const currentSession = ref<AIChatSessionRecord | null>(null)
  const messages = ref<AIChatAssistantMessage[]>([])
  const loadingStatus = ref(false)
  const loadingSessions = ref(false)
  const loadingMessages = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const bootstrapped = ref(false)

  const hasSession = computed(() => currentSession.value !== null)
  const hasMessages = computed(() => messages.value.length > 0)

  const setContext = (nextContext: Partial<AIChatContextForm>) => {
    context.value = {
      nodeId: nextContext.nodeId ?? context.value.nodeId,
      incidentId: nextContext.incidentId ?? context.value.incidentId,
      timeRange: nextContext.timeRange ?? context.value.timeRange
    }
  }

  const applyRouteContext = (query: Record<string, unknown>) => {
    context.value = {
      nodeId: normalizeQueryString(query.nodeId),
      incidentId: normalizeQueryString(query.incidentId),
      timeRange: normalizeTimeRange(query.timeRange)
    }
  }

  const fetchStatus = async () => {
    loadingStatus.value = true
    try {
      const response = await getAIStatus()
      if (response.success) {
        aiStatus.value = response.data
      }
    } catch (error: any) {
      console.error('[AI Chat Store] Failed to fetch AI status:', error)
    } finally {
      loadingStatus.value = false
    }
  }

  const fetchRecentSessions = async () => {
    loadingSessions.value = true
    error.value = null

    try {
      const response = await listAIChatSessions()
      if (response.success) {
        sessions.value = response.data.sessions
        return response.data.sessions
      }
      return []
    } catch (err: any) {
      const message = normalizeErrorMessage(err, '加载最近会话失败')
      error.value = message
      throw err
    } finally {
      loadingSessions.value = false
    }
  }

  const loadSession = async (sessionId: string) => {
    loadingMessages.value = true
    error.value = null

    try {
      const [sessionResponse, messagesResponse] = await Promise.all([
        getAIChatSession(sessionId),
        getAIChatMessages(sessionId)
      ])

      if (sessionResponse.success) {
        currentSession.value = sessionResponse.data
        context.value = {
          nodeId: sessionResponse.data.nodeId || '',
          incidentId: sessionResponse.data.incidentId || '',
          timeRange: sessionResponse.data.timeRange
        }
      }

      if (messagesResponse.success) {
        messages.value = messagesResponse.data.messages
      }

      return currentSession.value
    } catch (err: any) {
      const message = normalizeErrorMessage(err, '加载会话失败')
      error.value = message
      throw err
    } finally {
      loadingMessages.value = false
    }
  }

  const bootstrap = async (query: Record<string, unknown>) => {
    if (bootstrapped.value) {
      return
    }

    applyRouteContext(query)
    await Promise.all([fetchStatus(), fetchRecentSessions()])

    const sessionId = normalizeQueryString(query.sessionId)
    if (sessionId) {
      try {
        await loadSession(sessionId)
      } catch (error) {
        console.error('[AI Chat Store] Failed to bootstrap session:', error)
      }
    }

    bootstrapped.value = true
  }

  const askQuestion = async (question: string) => {
    const normalizedQuestion = question.trim()
    if (!normalizedQuestion) {
      return { success: false as const, message: '问题不能为空' }
    }

    submitting.value = true
    error.value = null

    try {
      if (!currentSession.value) {
        const response = await createAIChatSession({
          nodeId: context.value.nodeId || undefined,
          incidentId: context.value.incidentId || undefined,
          timeRange: context.value.timeRange,
          question: normalizedQuestion
        })

        if (response.success) {
          await Promise.all([
            loadSession(response.data.sessionId),
            fetchRecentSessions()
          ])
          return {
            success: true as const,
            sessionId: response.data.sessionId
          }
        }
      } else {
        const response = await postAIChatMessage(currentSession.value.sessionId, {
          question: normalizedQuestion
        })

        if (response.success) {
          messages.value = [...messages.value, response.data.message]
          currentSession.value = {
            ...currentSession.value,
            messageCount: messages.value.length,
            updatedAt: response.data.message.createdAt
          }
          sessions.value = sessions.value.map((session) =>
            session.sessionId === currentSession.value?.sessionId
              ? {
                ...session,
                messageCount: messages.value.length,
                updatedAt: response.data.message.createdAt
              }
              : session
          )
          await fetchRecentSessions()

          return {
            success: true as const,
            sessionId: response.data.sessionId
          }
        }
      }

      return { success: false as const, message: '提问失败' }
    } catch (err: any) {
      const message = normalizeErrorMessage(err, '提问失败')
      error.value = message
      return { success: false as const, message }
    } finally {
      submitting.value = false
    }
  }

  const resetConversation = () => {
    currentSession.value = null
    messages.value = []
    error.value = null
  }

  const clearError = () => {
    error.value = null
  }

  return {
    aiStatus,
    context,
    sessions,
    currentSession,
    messages,
    loadingStatus,
    loadingSessions,
    loadingMessages,
    submitting,
    error,
    bootstrapped,
    hasSession,
    hasMessages,
    setContext,
    applyRouteContext,
    fetchStatus,
    fetchRecentSessions,
    loadSession,
    bootstrap,
    askQuestion,
    resetConversation,
    clearError
  }
})
