<template>
  <div class="settings-page">
    <div class="page-header">
      <div>
        <h1>系统设置</h1>
        <p>管理账户安全与 AI 设置。</p>
      </div>
    </div>

    <div class="settings-tabs">
      <button
        class="tab-button"
        :class="{ active: activeTab === 'account' }"
        type="button"
        @click="activeTab = 'account'"
      >
        账户安全
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'ai' }"
        type="button"
        @click="activeTab = 'ai'"
      >
        AI 设置
      </button>
    </div>

    <template v-if="activeTab === 'account'">
      <div class="settings-section">
        <div class="section-header">
          <h2>用户信息</h2>
          <p>查看当前登录账号的基础身份信息。</p>
        </div>

        <div class="info-card">
          <div class="info-item">
            <span class="label">用户名</span>
            <span class="value">{{ userStore.user?.username || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">角色</span>
            <span class="value role-badge">{{ getRoleLabel(userStore.user?.role) }}</span>
          </div>
          <div class="info-item">
            <span class="label">用户 ID</span>
            <span class="value">{{ userStore.user?.id || '-' }}</span>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <h2>修改密码</h2>
          <p>修改当前登录账号的密码。</p>
        </div>

        <div class="password-card">
          <form @submit.prevent="handleChangePassword">
            <div class="form-group">
              <label for="oldPassword">当前密码 *</label>
              <div class="password-input-wrapper">
                <input
                  id="oldPassword"
                  v-model="passwordForm.oldPassword"
                  :type="showOldPassword ? 'text' : 'password'"
                  placeholder="请输入当前密码"
                  required
                />
                <button
                  type="button"
                  class="toggle-password"
                  @click="showOldPassword = !showOldPassword"
                >
                  {{ showOldPassword ? '隐藏' : '显示' }}
                </button>
              </div>
            </div>

            <div class="form-group">
              <label for="newPassword">新密码 *</label>
              <div class="password-input-wrapper">
                <input
                  id="newPassword"
                  v-model="passwordForm.newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  placeholder="请输入新密码（至少 6 位）"
                  required
                  @input="checkPasswordStrength"
                />
                <button
                  type="button"
                  class="toggle-password"
                  @click="showNewPassword = !showNewPassword"
                >
                  {{ showNewPassword ? '隐藏' : '显示' }}
                </button>
              </div>

              <div v-if="passwordForm.newPassword && passwordStrength" class="password-strength">
                <div class="strength-bar">
                  <div
                    class="strength-fill"
                    :class="passwordStrength.level"
                    :style="{ width: `${passwordStrength.score}%` }"
                  />
                </div>
                <div class="strength-text" :class="passwordStrength.level">
                  {{ passwordStrength.text }}
                </div>
              </div>

              <div v-if="passwordForm.newPassword && isWeakPassword" class="inline-banner warning">
                检测到弱密码，建议使用更强的密码组合。
              </div>
            </div>

            <div class="form-group">
              <label for="confirmPassword">确认新密码 *</label>
              <div class="password-input-wrapper">
                <input
                  id="confirmPassword"
                  v-model="passwordForm.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  placeholder="请再次输入新密码"
                  required
                />
                <button
                  type="button"
                  class="toggle-password"
                  @click="showConfirmPassword = !showConfirmPassword"
                >
                  {{ showConfirmPassword ? '隐藏' : '显示' }}
                </button>
              </div>
              <div
                v-if="passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword"
                class="error-hint"
              >
                两次输入的密码不一致。
              </div>
            </div>

            <div v-if="accountMessage" class="inline-banner" :class="accountMessage.type">
              {{ accountMessage.text }}
            </div>

            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="resetPasswordForm">重置</button>
              <button type="submit" class="btn-primary" :disabled="loading || !isPasswordFormValid">
                {{ loading ? '修改中...' : '修改密码' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="settings-section">
        <div class="section-header with-actions">
          <div>
            <h2>AI 设置</h2>
            <p>按角色查看和维护当前 AI 运行配置与个人偏好。</p>
          </div>
          <button
            type="button"
            class="btn-secondary"
            :disabled="aiSettingsStore.loading"
            @click="refreshAISettings"
          >
            {{ aiSettingsStore.loading ? '加载中...' : aiSettingsStore.hasFetched ? '重新加载' : '加载设置' }}
          </button>
        </div>

        <div v-if="aiSettingsStore.loading && !aiSettingsStore.loaded" class="empty-panel">
          正在加载 AI 设置...
        </div>

        <div v-else-if="!aiSettingsStore.loaded" class="empty-panel">
          <p>{{ aiSettingsStore.error || 'AI 设置尚未加载。' }}</p>
          <button type="button" class="btn-primary" @click="refreshAISettings">重试</button>
        </div>

        <template v-else>
          <div class="ai-grid">
            <section class="panel-card">
              <div class="panel-header">
                <div>
                  <h3>个人偏好设置</h3>
                  <p>所有登录用户都可以保存自己的 AI 交互偏好。</p>
                </div>
                <span class="panel-badge">User</span>
              </div>

              <div v-if="userMessage" class="inline-banner" :class="userMessage.type">
                {{ userMessage.text }}
              </div>

              <form class="settings-form" @submit.prevent="handleSaveUserSettings">
                <div class="form-group">
                  <label for="ai-language">输出语言</label>
                  <select id="ai-language" v-model="userForm.language">
                    <option value="zh-CN">简体中文</option>
                    <option value="en-US">English</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="ai-response-style">回答风格</label>
                  <select id="ai-response-style" v-model="userForm.responseStyle">
                    <option value="concise">简洁</option>
                    <option value="standard">标准</option>
                    <option value="detailed">详细</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="ai-analysis-scope">默认分析范围</label>
                  <select id="ai-analysis-scope" v-model="userForm.defaultAnalysisScope">
                    <option value="24h">24h</option>
                    <option value="7d">7d</option>
                    <option value="30d">30d</option>
                  </select>
                </div>

                <label class="toggle-field">
                  <input v-model="userForm.showActionRecommendations" type="checkbox" />
                  <span>默认显示动作建议</span>
                </label>

                <div class="form-actions">
                  <button type="submit" class="btn-primary" :disabled="aiSettingsStore.savingUser">
                    {{ aiSettingsStore.savingUser ? '保存中...' : '保存个人偏好' }}
                  </button>
                </div>
              </form>
            </section>

            <section class="panel-card system-panel">
              <div class="panel-header">
                <div>
                  <h3>系统级 AI 设置</h3>
                  <p>展示当前系统级 AI 配置来源和可编辑状态。</p>
                </div>
                <span class="panel-badge admin">Admin</span>
              </div>

              <div v-if="!isAdmin" class="inline-banner info">
                系统级 AI 设置仅管理员可见/可修改。
              </div>

              <template v-else>
                <div v-if="systemMessage" class="inline-banner" :class="systemMessage.type">
                  {{ systemMessage.text }}
                </div>

                <form class="settings-form" @submit.prevent="handleSaveSystemSettings">
                  <div class="field-card">
                    <div class="field-head">
                      <div>
                        <label class="field-title" for="system-enabled">启用 AI</label>
                        <div class="field-current">
                          当前值：{{ formatBoolean(systemSettings?.enabled.value) }}
                        </div>
                      </div>
                      <div class="field-meta">
                        <span class="meta-badge source">{{ formatSource(systemSettings?.enabled.source) }}</span>
                        <span class="meta-badge" :class="systemSettings?.enabled.editable ? 'editable' : 'readonly'">
                          {{ formatEditable(systemSettings?.enabled.editable) }}
                        </span>
                      </div>
                    </div>
                    <label class="toggle-field">
                      <input
                        id="system-enabled"
                        v-model="systemForm.enabled"
                        type="checkbox"
                        :disabled="!systemSettings?.enabled.editable"
                      />
                      <span>允许系统使用 AI 能力</span>
                    </label>
                  </div>

                  <div class="field-card">
                    <div class="field-head">
                      <div>
                        <label class="field-title" for="system-provider">Provider</label>
                        <div class="field-current">当前值：{{ systemSettings?.provider.value || '-' }}</div>
                      </div>
                      <div class="field-meta">
                        <span class="meta-badge source">{{ formatSource(systemSettings?.provider.source) }}</span>
                        <span class="meta-badge" :class="systemSettings?.provider.editable ? 'editable' : 'readonly'">
                          {{ formatEditable(systemSettings?.provider.editable) }}
                        </span>
                      </div>
                    </div>
                    <select
                      id="system-provider"
                      v-model="systemForm.provider"
                      :disabled="!systemSettings?.provider.editable"
                    >
                      <option v-for="provider in providerOptions" :key="provider" :value="provider">
                        {{ provider }}
                      </option>
                    </select>
                  </div>

                  <div class="field-card">
                    <div class="field-head">
                      <div>
                        <label class="field-title" for="system-model">Model</label>
                        <div class="field-current">当前值：{{ systemSettings?.model.value || '-' }}</div>
                      </div>
                      <div class="field-meta">
                        <span class="meta-badge source">{{ formatSource(systemSettings?.model.source) }}</span>
                        <span class="meta-badge" :class="systemSettings?.model.editable ? 'editable' : 'readonly'">
                          {{ formatEditable(systemSettings?.model.editable) }}
                        </span>
                      </div>
                    </div>
                    <input
                      id="system-model"
                      v-model.trim="systemForm.model"
                      type="text"
                      :disabled="!systemSettings?.model.editable"
                    />
                  </div>

                  <div class="field-card">
                    <div class="field-head">
                      <div>
                        <label class="field-title" for="system-base-url">Base URL</label>
                        <div class="field-current">当前值：{{ systemSettings?.baseUrl.value || '-' }}</div>
                      </div>
                      <div class="field-meta">
                        <span class="meta-badge source">{{ formatSource(systemSettings?.baseUrl.source) }}</span>
                        <span class="meta-badge" :class="systemSettings?.baseUrl.editable ? 'editable' : 'readonly'">
                          {{ formatEditable(systemSettings?.baseUrl.editable) }}
                        </span>
                      </div>
                    </div>
                    <input
                      id="system-base-url"
                      v-model.trim="systemForm.baseUrl"
                      type="text"
                      :disabled="!systemSettings?.baseUrl.editable"
                    />
                  </div>

                  <div class="field-card">
                    <div class="field-head">
                      <div>
                        <label class="field-title" for="system-timeout">超时（ms）</label>
                        <div class="field-current">当前值：{{ formatTimeout(systemSettings?.timeoutMs.value) }}</div>
                      </div>
                      <div class="field-meta">
                        <span class="meta-badge source">{{ formatSource(systemSettings?.timeoutMs.source) }}</span>
                        <span class="meta-badge" :class="systemSettings?.timeoutMs.editable ? 'editable' : 'readonly'">
                          {{ formatEditable(systemSettings?.timeoutMs.editable) }}
                        </span>
                      </div>
                    </div>
                    <input
                      id="system-timeout"
                      v-model.number="systemForm.timeoutMs"
                      type="number"
                      min="1"
                      step="1000"
                      :disabled="!systemSettings?.timeoutMs.editable"
                    />
                  </div>

                  <div class="field-card">
                    <div class="field-head">
                      <div>
                        <label class="field-title" for="system-allow-actions">动作建议</label>
                        <div class="field-current">
                          当前值：{{ formatBoolean(systemSettings?.allowActionRecommendations.value) }}
                        </div>
                      </div>
                      <div class="field-meta">
                        <span class="meta-badge source">
                          {{ formatSource(systemSettings?.allowActionRecommendations.source) }}
                        </span>
                        <span
                          class="meta-badge"
                          :class="systemSettings?.allowActionRecommendations.editable ? 'editable' : 'readonly'"
                        >
                          {{ formatEditable(systemSettings?.allowActionRecommendations.editable) }}
                        </span>
                      </div>
                    </div>
                    <label class="toggle-field">
                      <input
                        id="system-allow-actions"
                        v-model="systemForm.allowActionRecommendations"
                        type="checkbox"
                        :disabled="!systemSettings?.allowActionRecommendations.editable"
                      />
                      <span>允许返回动作建议</span>
                    </label>
                  </div>

                  <div class="field-card">
                    <div class="field-head">
                      <div>
                        <label class="field-title" for="system-api-key">API Key 状态</label>
                        <div class="field-current">
                          当前值：{{ systemSettings?.apiKey.configured ? '已配置' : '未配置' }}
                        </div>
                      </div>
                      <div class="field-meta">
                        <span class="meta-badge source">{{ formatSource(systemSettings?.apiKey.source) }}</span>
                        <span class="meta-badge" :class="systemSettings?.apiKey.editable ? 'editable' : 'readonly'">
                          {{ formatEditable(systemSettings?.apiKey.editable) }}
                        </span>
                      </div>
                    </div>
                    <input
                      id="system-api-key"
                      v-model.trim="systemForm.apiKey"
                      type="password"
                      :disabled="!systemSettings?.apiKey.editable"
                      autocomplete="new-password"
                      placeholder="留空表示不更新；输入新值后才会提交"
                    />
                    <p class="field-hint">不会回显旧值，也不会在页面展示明文密钥。</p>
                  </div>

                  <div class="form-actions">
                    <button type="submit" class="btn-primary" :disabled="aiSettingsStore.savingSystem">
                      {{ aiSettingsStore.savingSystem ? '保存中...' : '保存系统设置' }}
                    </button>
                  </div>
                </form>
              </template>
            </section>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useAISettingsStore, type SystemAISettingsForm, type UserAISettingsForm } from '@/stores/aiSettings'

type TabKey = 'account' | 'ai'
type BannerType = 'success' | 'error' | 'info' | 'warning'

const userStore = useUserStore()
const aiSettingsStore = useAISettingsStore()

const activeTab = ref<TabKey>('account')

const { systemSettings, userSettings } = storeToRefs(aiSettingsStore)

const isAdmin = computed(() => userStore.user?.role === 'admin')

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const showOldPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)

const passwordStrength = ref<{
  score: number
  level: 'weak' | 'medium' | 'strong'
  text: string
} | null>(null)

const accountMessage = ref<{ type: BannerType; text: string } | null>(null)
const userMessage = ref<{ type: BannerType; text: string } | null>(null)
const systemMessage = ref<{ type: BannerType; text: string } | null>(null)

const providerOptions = [
  'openai',
  'qwen',
  'deepseek',
  'zhipu',
  'kimi',
  'moonshot',
  'groq',
  'together',
  'siliconflow',
  'ollama'
]

const defaultUserForm = (): UserAISettingsForm => ({
  language: 'zh-CN',
  responseStyle: 'standard',
  defaultAnalysisScope: '24h',
  showActionRecommendations: true
})

const defaultSystemForm = (): SystemAISettingsForm => ({
  enabled: false,
  provider: 'openai',
  model: '',
  baseUrl: '',
  timeoutMs: 120000,
  allowActionRecommendations: true,
  apiKey: ''
})

const userForm = ref<UserAISettingsForm>(defaultUserForm())
const systemForm = ref<SystemAISettingsForm>(defaultSystemForm())

const weakPasswords = [
  '123456', '123456789', '12345678', '1234567890', '111111', '123123',
  'password', 'password123', 'admin', 'admin123', 'root', 'root123',
  '000000', '666666', '888888', '123321', '654321', 'qwerty',
  'abc123', 'test', 'test123', 'user', 'user123', '1qaz2wsx',
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1q2w3e4r', 'a123456'
]

const isWeakPassword = computed(() => {
  if (!passwordForm.value.newPassword) return false

  const pwd = passwordForm.value.newPassword.toLowerCase()

  if (weakPasswords.includes(pwd)) return true
  if (/^\d+$/.test(pwd) && pwd.length < 8) return true
  if (/^(0123|1234|2345|3456|4567|5678|6789|7890)+$/.test(pwd)) return true
  if (/^(.)\1+$/.test(pwd)) return true

  return false
})

const isPasswordFormValid = computed(() => (
  Boolean(passwordForm.value.oldPassword) &&
  Boolean(passwordForm.value.newPassword) &&
  Boolean(passwordForm.value.confirmPassword) &&
  passwordForm.value.newPassword === passwordForm.value.confirmPassword &&
  passwordForm.value.newPassword.length >= 6
))

const syncFormsFromSettings = () => {
  if (userSettings.value) {
    userForm.value = {
      language: userSettings.value.language.value,
      responseStyle: userSettings.value.responseStyle.value,
      defaultAnalysisScope: userSettings.value.defaultAnalysisScope.value,
      showActionRecommendations: userSettings.value.showActionRecommendations.value
    }
  }

  if (systemSettings.value) {
    systemForm.value = {
      enabled: systemSettings.value.enabled.value,
      provider: systemSettings.value.provider.value,
      model: systemSettings.value.model.value,
      baseUrl: systemSettings.value.baseUrl.value,
      timeoutMs: systemSettings.value.timeoutMs.value,
      allowActionRecommendations: systemSettings.value.allowActionRecommendations.value,
      apiKey: ''
    }
  }
}

const loadAISettingsIfNeeded = async () => {
  if (aiSettingsStore.hasFetched) {
    return
  }

  const result = await aiSettingsStore.fetchSettings()
  if (result.success && aiSettingsStore.loaded) {
    syncFormsFromSettings()
  }
}

const refreshAISettings = async () => {
  userMessage.value = null
  systemMessage.value = null

  const result = await aiSettingsStore.fetchSettings({ force: true })
  if (result.success && aiSettingsStore.loaded) {
    syncFormsFromSettings()
  }
}

watch(activeTab, async (tab) => {
  if (tab === 'ai') {
    await loadAISettingsIfNeeded()
  }
})

const checkPasswordStrength = () => {
  const pwd = passwordForm.value.newPassword

  if (!pwd) {
    passwordStrength.value = null
    return
  }

  let score = 0

  if (pwd.length >= 8) score += 25
  if (pwd.length >= 12) score += 15
  if (pwd.length >= 16) score += 10
  if (/[a-z]/.test(pwd)) score += 15
  if (/[A-Z]/.test(pwd)) score += 15
  if (/\d/.test(pwd)) score += 15
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)) score += 20

  const types = [
    /[a-z]/.test(pwd),
    /[A-Z]/.test(pwd),
    /\d/.test(pwd),
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)
  ].filter(Boolean).length

  if (types >= 3) score += 10
  if (types === 4) score += 10

  if (isWeakPassword.value) {
    score = Math.min(score, 30)
  }

  let level: 'weak' | 'medium' | 'strong'
  let text: string

  if (score < 40) {
    level = 'weak'
    text = '弱密码'
  } else if (score < 70) {
    level = 'medium'
    text = '中等强度'
  } else {
    level = 'strong'
    text = '强密码'
  }

  passwordStrength.value = { score, level, text }
}

const handleChangePassword = async () => {
  if (!isPasswordFormValid.value) {
    return
  }

  loading.value = true
  accountMessage.value = null

  try {
    const result = await userStore.changePassword(
      passwordForm.value.oldPassword,
      passwordForm.value.newPassword
    )

    if (result.success) {
      accountMessage.value = {
        type: 'success',
        text: '密码修改成功。'
      }
      resetPasswordForm()

      setTimeout(() => {
        accountMessage.value = null
      }, 3000)
    } else {
      accountMessage.value = {
        type: 'error',
        text: result.message || '密码修改失败。'
      }
    }
  } catch (error: any) {
    accountMessage.value = {
      type: 'error',
      text: error.message || '密码修改失败，请稍后重试。'
    }
  } finally {
    loading.value = false
  }
}

const handleSaveUserSettings = async () => {
  userMessage.value = null
  aiSettingsStore.clearError()

  const result = await aiSettingsStore.saveUserSettings(userForm.value)

  if (result.success) {
    if (aiSettingsStore.loaded) {
      syncFormsFromSettings()
    }

    userMessage.value = {
      type: result.skipped ? 'info' : 'success',
      text: result.message || (result.skipped ? '个人偏好无变更。' : '个人偏好已保存。')
    }
    return
  }

  userMessage.value = {
    type: 'error',
    text: result.message
  }
}

const handleSaveSystemSettings = async () => {
  systemMessage.value = null
  aiSettingsStore.clearError()

  const result = await aiSettingsStore.saveSystemSettings(systemForm.value)

  if (result.success) {
    if (aiSettingsStore.loaded) {
      syncFormsFromSettings()
    }

    systemMessage.value = {
      type: result.skipped ? 'info' : 'success',
      text: result.message || (result.skipped ? '系统设置无变更。' : '系统设置已保存。')
    }
    return
  }

  systemMessage.value = {
    type: 'error',
    text: result.message
  }
}

const resetPasswordForm = () => {
  passwordForm.value = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  passwordStrength.value = null
  showOldPassword.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false
}

const formatSource = (source?: string) => {
  if (!source) return '-'

  const labels: Record<string, string> = {
    env: 'env',
    persisted: 'persisted',
    fallback: 'fallback'
  }

  return labels[source] || source
}

const formatEditable = (editable?: boolean) => editable ? '可编辑' : '只读'

const formatBoolean = (value?: boolean) => {
  if (value === undefined) return '-'
  return value ? '开启' : '关闭'
}

const formatTimeout = (value?: number) => {
  if (value === undefined || value === null) return '-'
  return `${value} ms`
}

const getRoleLabel = (role?: string) => {
  const labels: Record<string, string> = {
    admin: '管理员',
    operator: '运维',
    viewer: '查看者'
  }

  return role ? (labels[role] || role) : '-'
}
</script>

<style scoped>
.settings-page {
  padding: 20px;
  max-width: 1280px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  color: #172033;
}

.page-header p {
  margin: 8px 0 0;
  color: #5e6b85;
}

.settings-tabs {
  display: inline-flex;
  gap: 8px;
  padding: 6px;
  margin-bottom: 24px;
  background: #eef3fb;
  border-radius: 16px;
}

.tab-button {
  border: none;
  background: transparent;
  color: #4a5876;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button.active {
  background: #ffffff;
  color: #1a4fd8;
  box-shadow: 0 10px 30px rgba(26, 79, 216, 0.12);
}

.settings-section {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e7ecf4;
  box-shadow: 0 18px 40px rgba(19, 32, 64, 0.06);
}

.section-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eef2f8;
}

.section-header.with-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.section-header h2,
.panel-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #172033;
}

.section-header p,
.panel-header p {
  margin: 8px 0 0;
  color: #61708b;
}

.info-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: linear-gradient(180deg, #f8fbff 0%, #f1f5fb 100%);
  border: 1px solid #e6edf8;
  border-radius: 14px;
}

.info-item .label {
  font-size: 13px;
  color: #6a7894;
}

.info-item .value {
  color: #172033;
  font-weight: 600;
  word-break: break-word;
}

.role-badge,
.panel-badge,
.meta-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.role-badge {
  width: fit-content;
  padding: 6px 12px;
  background: #dceafe;
  color: #1d4ed8;
}

.password-card {
  max-width: 640px;
}

.ai-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.panel-card {
  padding: 20px;
  border: 1px solid #e8edf6;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
}

.system-panel {
  min-width: 0;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-badge {
  padding: 6px 10px;
  background: #e6f4ea;
  color: #1f7a3d;
}

.panel-badge.admin {
  background: #efe8ff;
  color: #6d28d9;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-card {
  padding: 16px;
  border: 1px solid #e8edf6;
  border-radius: 16px;
  background: #f9fbff;
}

.field-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.field-title,
.form-group label {
  display: block;
  font-weight: 600;
  color: #24324b;
}

.field-current {
  margin-top: 6px;
  font-size: 13px;
  color: #61708b;
  word-break: break-word;
}

.field-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-badge {
  padding: 6px 10px;
}

.meta-badge.source {
  background: #eef2ff;
  color: #4338ca;
}

.meta-badge.editable {
  background: #e8f7ee;
  color: #1f7a3d;
}

.meta-badge.readonly {
  background: #f3f4f6;
  color: #6b7280;
}

input,
select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d3dceb;
  border-radius: 12px;
  font-size: 14px;
  color: #172033;
  background: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus,
select:focus {
  outline: none;
  border-color: #1a4fd8;
  box-shadow: 0 0 0 4px rgba(26, 79, 216, 0.12);
}

input:disabled,
select:disabled {
  background: #f5f7fb;
  color: #8a96ad;
  cursor: not-allowed;
}

.toggle-field {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #24324b;
  font-weight: 500;
}

.toggle-field input {
  width: 16px;
  height: 16px;
  margin: 0;
}

.password-input-wrapper {
  position: relative;
}

.password-input-wrapper input {
  padding-right: 72px;
}

.toggle-password {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: #4f5f7b;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.password-strength {
  margin-top: 8px;
}

.strength-bar {
  height: 6px;
  background: #e3e8f2;
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 6px;
}

.strength-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.strength-fill.weak,
.strength-text.weak {
  background: #dc2626;
  color: #dc2626;
}

.strength-fill.medium,
.strength-text.medium {
  background: #d97706;
  color: #d97706;
}

.strength-fill.strong,
.strength-text.strong {
  background: #15803d;
  color: #15803d;
}

.strength-text {
  font-size: 12px;
  font-weight: 700;
}

.inline-banner {
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 14px;
  border: 1px solid transparent;
}

.inline-banner.success {
  background: #ecfdf3;
  border-color: #b7ebc6;
  color: #166534;
}

.inline-banner.error {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}

.inline-banner.info {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.inline-banner.warning {
  background: #fffbeb;
  border-color: #fde68a;
  color: #b45309;
}

.empty-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 18px;
  border-radius: 16px;
  background: #f8fbff;
  border: 1px dashed #c8d4ea;
  color: #51617f;
}

.field-hint,
.error-hint {
  margin: 8px 0 0;
  font-size: 13px;
}

.field-hint {
  color: #61708b;
}

.error-hint {
  color: #dc2626;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-primary,
.btn-secondary {
  border: none;
  border-radius: 12px;
  padding: 11px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.btn-primary {
  background: #1a4fd8;
  color: #ffffff;
  box-shadow: 0 14px 30px rgba(26, 79, 216, 0.18);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn-secondary {
  background: #eef3fb;
  color: #23314d;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

@media (max-width: 960px) {
  .ai-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .settings-page {
    padding: 16px;
  }

  .settings-section {
    padding: 18px;
  }

  .settings-tabs {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .section-header.with-actions,
  .panel-header,
  .field-head {
    flex-direction: column;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>
