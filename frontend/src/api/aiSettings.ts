import api from '@/api'

export type SettingSource = 'env' | 'persisted' | 'fallback'

export interface SettingField<T> {
  value: T
  source: SettingSource
  editable: boolean
}

export interface ApiKeyStatusField {
  configured: boolean
  source: SettingSource
  editable: boolean
}

export interface AISettingsSystemSection {
  enabled: SettingField<boolean>
  provider: SettingField<string>
  model: SettingField<string>
  baseUrl: SettingField<string>
  timeoutMs: SettingField<number>
  allowActionRecommendations: SettingField<boolean>
  apiKey: ApiKeyStatusField
}

export interface AISettingsUserSection {
  language: SettingField<string>
  responseStyle: SettingField<string>
  defaultAnalysisScope: SettingField<string>
  showActionRecommendations: SettingField<boolean>
}

export interface AISettingsPayload {
  system: AISettingsSystemSection
  user: AISettingsUserSection
}

export interface AISettingsResponse {
  success: boolean
  data: AISettingsPayload
}

export interface UpdateUserAISettingsPayload {
  language?: string
  responseStyle?: string
  defaultAnalysisScope?: string
  showActionRecommendations?: boolean
}

export interface UpdateSystemAISettingsPayload {
  enabled?: boolean
  provider?: string
  model?: string
  baseUrl?: string
  timeoutMs?: number
  allowActionRecommendations?: boolean
  apiKey?: string
}

export const getAISettings = () => {
  return api.get<any, AISettingsResponse>('/ai/v2/settings')
}

export const updateUserAISettings = (payload: UpdateUserAISettingsPayload) => {
  return api.put<any, AISettingsResponse>('/ai/v2/settings/user', payload)
}

export const updateSystemAISettings = (payload: UpdateSystemAISettingsPayload) => {
  return api.put<any, AISettingsResponse>('/ai/v2/settings/system', payload)
}
