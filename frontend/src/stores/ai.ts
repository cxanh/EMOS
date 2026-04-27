import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  HealthAnalysis,
  TrendAnalysis,
  Recommendations,
  AIStatus,
  FollowUpAnalysis,
  OverviewQuestionResult,
  OverviewQuestionClientHints
} from '@/api/ai'
import * as aiApi from '@/api/ai'

export const useAIStore = defineStore('ai', () => {
  // State
  const status = ref<AIStatus | null>(null)
  const analyzing = ref(false)
  const healthAnalysis = ref<HealthAnalysis | null>(null)
  const trendAnalysis = ref<TrendAnalysis | null>(null)
  const recommendations = ref<Recommendations | null>(null)
  const error = ref<string | null>(null)
  const history = ref<any[]>([])

  // Follow up state
  const followUpLoading = ref(false)
  const followUpResult = ref<FollowUpAnalysis | null>(null)
  const followUpError = ref<string | null>(null)
  const activeAnalysisType = ref<string | null>(null)

  // Homepage overview question state
  const overviewQuestionLoading = ref(false)
  const overviewQuestionResult = ref<OverviewQuestionResult | null>(null)
  const overviewQuestionError = ref<string | null>(null)

  // Actions
  const clearFollowUp = () => {
    followUpResult.value = null
    followUpError.value = null
  }

  const clearOverviewQuestion = () => {
    overviewQuestionResult.value = null
    overviewQuestionError.value = null
  }

  const fetchStatus = async () => {
    try {
      const response = await aiApi.getAIStatus()
      if (response.success) {
        status.value = response.data
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch AI status'
      console.error('Error fetching AI status:', err)
    }
  }

  const analyzeHealth = async () => {
    try {
      clearFollowUp()
      analyzing.value = true
      error.value = null

      const response = await aiApi.analyzeSystemHealth()

      if (response.success) {
        healthAnalysis.value = response.data

        // Add to history
        history.value.unshift({
          type: 'health',
          timestamp: new Date(),
          result: response.data
        })
        activeAnalysisType.value = 'health'

        // Keep only last 10 items
        if (history.value.length > 10) {
          history.value = history.value.slice(0, 10)
        }
      }
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.message || 'Failed to analyze system health'
      console.error('Error analyzing health:', err)
      throw err
    } finally {
      analyzing.value = false
    }
  }

  const analyzeTrend = async (nodeId: string, timeRange: string = '24h') => {
    try {
      clearFollowUp()
      analyzing.value = true
      error.value = null

      const response = await aiApi.analyzeTrend(nodeId, timeRange)

      if (response.success) {
        trendAnalysis.value = response.data

        // Add to history
        history.value.unshift({
          type: 'trend',
          timestamp: new Date(),
          nodeId,
          timeRange,
          result: response.data
        })
        activeAnalysisType.value = 'trend'

        if (history.value.length > 10) {
          history.value = history.value.slice(0, 10)
        }
      }
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.message || 'Failed to analyze trend'
      console.error('Error analyzing trend:', err)
      throw err
    } finally {
      analyzing.value = false
    }
  }

  const getRecommendations = async () => {
    try {
      clearFollowUp()
      analyzing.value = true
      error.value = null

      const response = await aiApi.getRecommendations()

      if (response.success) {
        recommendations.value = response.data

        // Add to history
        history.value.unshift({
          type: 'recommendations',
          timestamp: new Date(),
          result: response.data
        })
        activeAnalysisType.value = 'recommendations'

        if (history.value.length > 10) {
          history.value = history.value.slice(0, 10)
        }
      }
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.message || 'Failed to get recommendations'
      console.error('Error getting recommendations:', err)
      throw err
    } finally {
      analyzing.value = false
    }
  }

  const askFollowUp = async (question: string, contextSummary: string, analysisType: string) => {
    try {
      followUpLoading.value = true
      followUpError.value = null

      const response = await aiApi.analyzeFollowUp(question, contextSummary, analysisType)

      if (response.success) {
        followUpResult.value = response.data
      }
    } catch (err: any) {
      followUpError.value = err.response?.data?.error?.message || err.message || 'Failed to analyze follow-up'
      console.error('Error in follow-up:', err)
      throw err
    } finally {
      followUpLoading.value = false
    }
  }

  const askOverviewQuestion = async (question: string, clientHints?: OverviewQuestionClientHints) => {
    try {
      overviewQuestionLoading.value = true
      overviewQuestionError.value = null

      const response = await aiApi.analyzeOverviewQuestion(question, clientHints)

      if (response.success) {
        overviewQuestionResult.value = response.data
      }
    } catch (err: any) {
      overviewQuestionError.value = err.response?.data?.error?.message || err.message || 'Failed to analyze overview question'
      console.error('Error in overview question:', err)
      throw err
    } finally {
      overviewQuestionLoading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // State
    status,
    analyzing,
    healthAnalysis,
    trendAnalysis,
    recommendations,
    error,
    history,
    followUpLoading,
    followUpResult,
    followUpError,
    activeAnalysisType,
    overviewQuestionLoading,
    overviewQuestionResult,
    overviewQuestionError,
    // Actions
    fetchStatus,
    analyzeHealth,
    analyzeTrend,
    getRecommendations,
    askFollowUp,
    askOverviewQuestion,
    clearFollowUp,
    clearOverviewQuestion,
    clearError
  }
})
