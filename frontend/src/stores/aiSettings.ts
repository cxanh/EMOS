import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  AISettingsPayload,
  UpdateSystemAISettingsPayload,
  UpdateUserAISettingsPayload
} from '@/api/aiSettings'
import * as aiSettingsApi from '@/api/aiSettings'

export interface UserAISettingsForm {
  language: string
  responseStyle: string
  defaultAnalysisScope: string
  showActionRecommendations: boolean
}

export interface SystemAISettingsForm {
  enabled: boolean
  provider: string
  model: string
  baseUrl: string
  timeoutMs: number
  allowActionRecommendations: boolean
  apiKey: string
}

function normalizeErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.error?.message || error?.message || fallback
}

export const useAISettingsStore = defineStore('aiSettings', () => {
  const settings = ref<AISettingsPayload | null>(null)
  const loading = ref(false)
  const savingUser = ref(false)
  const savingSystem = ref(false)
  const error = ref<string | null>(null)
  const hasFetched = ref(false)

  const systemSettings = computed(() => settings.value?.system ?? null)
  const userSettings = computed(() => settings.value?.user ?? null)
  const loaded = computed(() => settings.value !== null)

  const applySettings = (nextSettings: AISettingsPayload) => {
    settings.value = nextSettings
    error.value = null
    hasFetched.value = true
  }

  const fetchSettings = async ({ force = false }: { force?: boolean } = {}) => {
    if (hasFetched.value && !force) {
      return { success: true as const, data: settings.value }
    }

    loading.value = true
    error.value = null

    try {
      const response = await aiSettingsApi.getAISettings()
      if (response.success) {
        applySettings(response.data)
        return { success: true as const, data: response.data }
      }

      const message = '加载 AI 设置失败'
      error.value = message
      hasFetched.value = true
      return { success: false as const, message }
    } catch (err: any) {
      const message = normalizeErrorMessage(err, '加载 AI 设置失败')
      error.value = message
      hasFetched.value = true
      return { success: false as const, message }
    } finally {
      loading.value = false
    }
  }

  const saveUserSettings = async (form: UserAISettingsForm) => {
    if (!userSettings.value) {
      return { success: false as const, message: 'AI 设置尚未加载' }
    }

    const payload: UpdateUserAISettingsPayload = {}

    if (form.language !== userSettings.value.language.value) {
      payload.language = form.language
    }
    if (form.responseStyle !== userSettings.value.responseStyle.value) {
      payload.responseStyle = form.responseStyle
    }
    if (form.defaultAnalysisScope !== userSettings.value.defaultAnalysisScope.value) {
      payload.defaultAnalysisScope = form.defaultAnalysisScope
    }
    if (form.showActionRecommendations !== userSettings.value.showActionRecommendations.value) {
      payload.showActionRecommendations = form.showActionRecommendations
    }

    if (Object.keys(payload).length === 0) {
      return { success: true as const, skipped: true as const, message: '个人偏好无变更' }
    }

    savingUser.value = true
    error.value = null

    try {
      const response = await aiSettingsApi.updateUserAISettings(payload)
      if (response.success) {
        applySettings(response.data)
        return { success: true as const, data: response.data }
      }

      const message = '保存个人偏好失败'
      error.value = message
      return { success: false as const, message }
    } catch (err: any) {
      const message = normalizeErrorMessage(err, '保存个人偏好失败')
      error.value = message
      return { success: false as const, message }
    } finally {
      savingUser.value = false
    }
  }

  const saveSystemSettings = async (form: SystemAISettingsForm) => {
    if (!systemSettings.value) {
      return { success: false as const, message: 'AI 设置尚未加载' }
    }

    const payload: UpdateSystemAISettingsPayload = {}
    const fields = systemSettings.value
    const normalizedModel = form.model.trim()
    const normalizedBaseUrl = form.baseUrl.trim()

    if (!Number.isFinite(form.timeoutMs) || form.timeoutMs <= 0) {
      return { success: false as const, message: '超时时间必须为正整数' }
    }

    if (fields.enabled.editable && form.enabled !== fields.enabled.value) {
      payload.enabled = form.enabled
    }
    if (fields.provider.editable && form.provider !== fields.provider.value) {
      payload.provider = form.provider
    }
    if (fields.model.editable && normalizedModel !== fields.model.value) {
      payload.model = normalizedModel
    }
    if (fields.baseUrl.editable && normalizedBaseUrl !== fields.baseUrl.value) {
      payload.baseUrl = normalizedBaseUrl
    }
    if (fields.timeoutMs.editable && form.timeoutMs !== fields.timeoutMs.value) {
      payload.timeoutMs = form.timeoutMs
    }
    if (
      fields.allowActionRecommendations.editable &&
      form.allowActionRecommendations !== fields.allowActionRecommendations.value
    ) {
      payload.allowActionRecommendations = form.allowActionRecommendations
    }
    if (fields.apiKey.editable && form.apiKey.trim()) {
      payload.apiKey = form.apiKey.trim()
    }

    if (Object.keys(payload).length === 0) {
      return { success: true as const, skipped: true as const, message: '系统设置无变更' }
    }

    savingSystem.value = true
    error.value = null

    try {
      const response = await aiSettingsApi.updateSystemAISettings(payload)
      if (response.success) {
        applySettings(response.data)
        return { success: true as const, data: response.data }
      }

      const message = '保存系统设置失败'
      error.value = message
      return { success: false as const, message }
    } catch (err: any) {
      const message = normalizeErrorMessage(err, '保存系统设置失败')
      error.value = message
      return { success: false as const, message }
    } finally {
      savingSystem.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    settings,
    systemSettings,
    userSettings,
    loaded,
    loading,
    savingUser,
    savingSystem,
    error,
    hasFetched,
    fetchSettings,
    saveUserSettings,
    saveSystemSettings,
    clearError
  }
})
