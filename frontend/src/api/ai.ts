import axios from 'axios'

// 创建一个专门用于AI请求的axios实例，超时时间更长
const aiRequest = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:50001/api',
  timeout: 60000, // 60秒超时，因为AI分析需要更长时间
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加token
aiRequest.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 返回data
aiRequest.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

// AI Analysis interfaces
export interface AIStatus {
  enabled: boolean
  provider: string
  model: string
}

export interface HealthAnalysis {
  healthScore: number
  status: string
  summary: string
  issues: Array<{
    severity: string
    node: string
    metric: string
    value: number
    description: string
  }>
  recommendations: string[]
  urgency: string
  analyzedAt: string
}

export interface TrendAnalysis {
  trend: string
  pattern: string
  summary: string
  predictions: Array<{
    metric: string
    current: number
    predicted30d: number
    confidence: string
  }>
  anomalies: any[]
  insights: string[]
  analyzedAt: string
  timeRange: string
  dataPoints: number
}

export interface Recommendations {
  categories: Array<{
    category: string
    priority: string
    recommendations: Array<{
      title: string
      description: string
      impact: string
      effort: string
    }>
  }>
  quickWins: string[]
  longTerm: string[]
  analyzedAt: string
}

export interface FollowUpAnalysis {
  answer: string
  recommendActions?: Array<{
    title: string
    description: string
  }>
  analyzedAt: string
}

export type OverviewNavigateTarget = 'health' | 'trend' | 'recommendations' | 'ai-ops' | 'ai-chat'

export interface OverviewRecommendedAction {
  type: 'navigate'
  target: OverviewNavigateTarget
  label: string
}

export interface OverviewQuestionResult {
  answer: string
  riskPoints: string[]
  nextSteps: string[]
  recommendedActions?: OverviewRecommendedAction[]
  analyzedAt: string
}

export interface OverviewQuestionClientHints {
  nodeId?: string
  timeRange?: string
}

// Get AI service status
export const getAIStatus = () => {
  return aiRequest.get<any, { success: boolean; data: AIStatus }>('/ai/status')
}

// Analyze system health
export const analyzeSystemHealth = () => {
  return aiRequest.post<any, { success: boolean; data: HealthAnalysis }>('/ai/analyze/health')
}

// Analyze performance trend
export const analyzeTrend = (nodeId: string, timeRange: string = '24h') => {
  return aiRequest.post<any, { success: boolean; data: TrendAnalysis }>('/ai/analyze/trend', {
    nodeId,
    timeRange
  })
}

// Get optimization recommendations
export const getRecommendations = () => {
  return aiRequest.post<any, { success: boolean; data: Recommendations }>('/ai/analyze/recommendations')
}

// Ask follow-up question
export const analyzeFollowUp = (question: string, contextSummary: string, analysisType: string) => {
  return aiRequest.post<any, { success: boolean; data: FollowUpAnalysis }>('/ai/analyze/follow-up', {
    question,
    contextSummary,
    analysisType
  })
}

// Ask system overview question on AIAnalysis homepage
export const analyzeOverviewQuestion = (question: string, clientHints?: OverviewQuestionClientHints) => {
  return aiRequest.post<any, { success: boolean; data: OverviewQuestionResult }>('/ai/analyze/overview-question', {
    question,
    contextType: 'system-overview',
    clientHints
  })
}
