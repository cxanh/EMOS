import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { HealthAnalysis, TrendAnalysis, Recommendations, AIStatus } from '@/api/ai'
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

  // Actions
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
    // Actions
    fetchStatus,
    analyzeHealth,
    analyzeTrend,
    getRecommendations,
    clearError
  }
})
