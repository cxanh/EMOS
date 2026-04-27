import api from '@/api'

export type AIChatTimeRange = '24h' | '7d' | '30d'

export interface AIChatContextInput {
  nodeId?: string
  incidentId?: string
  timeRange: AIChatTimeRange
}

export interface AIChatConclusion {
  summary: string
  riskLevel: 'low' | 'medium' | 'high'
  keyFindings: string[]
  affectedEntities: string[]
}

export interface AIChatRecommendedAction {
  actionClass: 'platform_action'
  actionId: string
  title: string
  reason: string
  riskLevel: 'low' | 'medium' | 'high'
  prefillParams: Record<string, unknown>
}

export interface AIChatAssistantMessage {
  messageId: string
  role: 'assistant'
  question: string
  answer: string
  conclusion: AIChatConclusion
  recommendedActions: AIChatRecommendedAction[]
  createdAt: string
}

export interface AIChatSessionRecord {
  sessionId: string
  userId: string
  nodeId: string
  incidentId: string
  timeRange: AIChatTimeRange
  title: string
  messageCount: number
  createdAt: string
  updatedAt: string
  status: string
}

export interface AIChatSessionContext {
  nodeId: string
  incidentId: string
  timeRange: AIChatTimeRange
  summary: string
}

export interface AIChatCreateSessionPayload extends AIChatContextInput {
  question: string
}

export interface AIChatPostMessagePayload {
  question: string
}

export interface AIChatCreateSessionResponse {
  success: boolean
  data: {
    sessionId: string
    context: AIChatSessionContext
    message: AIChatAssistantMessage
  }
}

export interface AIChatPostMessageResponse {
  success: boolean
  data: {
    sessionId: string
    message: AIChatAssistantMessage
  }
}

export interface AIChatListSessionsResponse {
  success: boolean
  data: {
    sessions: AIChatSessionRecord[]
  }
}

export interface AIChatGetSessionResponse {
  success: boolean
  data: AIChatSessionRecord
}

export interface AIChatGetMessagesResponse {
  success: boolean
  data: {
    sessionId: string
    messages: AIChatAssistantMessage[]
  }
}

export const createAIChatSession = (payload: AIChatCreateSessionPayload) => {
  return api.post<any, AIChatCreateSessionResponse>('/ai/v2/chat/sessions', payload)
}

export const listAIChatSessions = () => {
  return api.get<any, AIChatListSessionsResponse>('/ai/v2/chat/sessions')
}

export const getAIChatSession = (sessionId: string) => {
  return api.get<any, AIChatGetSessionResponse>(`/ai/v2/chat/sessions/${sessionId}`)
}

export const getAIChatMessages = (sessionId: string) => {
  return api.get<any, AIChatGetMessagesResponse>(`/ai/v2/chat/sessions/${sessionId}/messages`)
}

export const postAIChatMessage = (sessionId: string, payload: AIChatPostMessagePayload) => {
  return api.post<any, AIChatPostMessageResponse>(`/ai/v2/chat/sessions/${sessionId}/messages`, payload)
}
