<template>
  <div class="result-card">
    <div v-if="!hasData" class="empty">暂无执行/验证结果</div>

    <div v-else class="content">
      <div class="row" v-if="status">
        <span class="label">当前状态</span>
        <span class="value" :class="statusClass">{{ status }}</span>
      </div>

      <div class="section">
        <div class="section-title">执行结果</div>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">ok</span>
            <span class="summary-value" :class="executionOkClass">{{ executionOkText }}</span>
          </div>
          <div class="summary-item" v-if="executionDetails.length">
            <span class="summary-label">详情</span>
            <span class="summary-value">
              {{ executionDetailsText }}
            </span>
          </div>
          <div class="summary-item" v-if="error">
            <span class="summary-label">错误</span>
            <span class="summary-value error-text">{{ error.code }} - {{ error.message }}</span>
          </div>
        </div>
        <pre v-if="executionRawText" class="code">{{ executionRawText }}</pre>
      </div>

      <div class="section">
        <div class="section-title">验证结果</div>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">status</span>
            <span class="summary-value" :class="verificationStatusClass">{{ verificationStatusText }}</span>
          </div>
        </div>
        <div class="checks">
          <div class="checks-title">校验项</div>
          <div v-if="verificationChecks.length" class="checks-list">
            <div v-for="(check, index) in verificationChecks" :key="index" class="check-item">
              <span class="check-name">{{ check.name }}</span>
              <span class="check-status" :class="check.status === 'pass' ? 'ok' : 'fail'">
                {{ check.status }}
              </span>
            </div>
          </div>
          <div v-else class="muted">无</div>
        </div>
        <pre v-if="verificationRawText" class="code">{{ verificationRawText }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ActionRequestStatus, ExecutionResult, VerificationResult } from '@/api/aiOps'

type ErrorPayload = {
  code: string
  message: string
}

const props = defineProps<{
  executionResult: ExecutionResult | null
  verificationResult: VerificationResult | null
  status: ActionRequestStatus | ''
  error: ErrorPayload | null
}>()

const hasData = computed(() => {
  return Boolean(props.executionResult || props.verificationResult || props.error || props.status)
})

const statusClass = computed(() => {
  if (props.status === 'SUCCEEDED') {
    return 'ok'
  }
  if (props.status === 'FAILED') {
    return 'fail'
  }
  return ''
})

const executionOkText = computed(() => {
  if (props.executionResult && typeof props.executionResult.ok === 'boolean') {
    return String(props.executionResult.ok)
  }
  if (props.error) {
    return 'false'
  }
  return '-'
})

const executionOkClass = computed(() => {
  if (executionOkText.value === 'true') {
    return 'ok'
  }
  if (executionOkText.value === 'false') {
    return 'fail'
  }
  return ''
})

const executionDetails = computed(() => {
  if (!props.executionResult) {
    return [] as Array<{ label: string; value: string }>
  }

  const mappings: Array<[keyof ExecutionResult, string]> = [
    ['eventId', 'eventId'],
    ['noteId', 'noteId'],
    ['incidentId', 'incidentId'],
    ['ruleId', 'ruleId']
  ]

  return mappings
    .map(([key, label]) => {
      const value = props.executionResult?.[key]
      return value ? { label, value: String(value) } : null
    })
    .filter((item): item is { label: string; value: string } => Boolean(item))
})

const executionDetailsText = computed(() => {
  if (!executionDetails.value.length) {
    return '-'
  }
  return executionDetails.value.map(item => `${item.label}: ${item.value}`).join(' / ')
})

const executionRawText = computed(() => {
  if (!props.executionResult) {
    return ''
  }
  return JSON.stringify(props.executionResult, null, 2)
})

const verificationStatusText = computed(() => {
  return props.verificationResult?.status || '-'
})

const verificationStatusClass = computed(() => {
  if (verificationStatusText.value === 'pass') {
    return 'ok'
  }
  if (verificationStatusText.value === 'fail') {
    return 'fail'
  }
  return ''
})

const verificationChecks = computed(() => {
  return props.verificationResult?.checks || []
})

const verificationRawText = computed(() => {
  if (!props.verificationResult) {
    return ''
  }
  return JSON.stringify(props.verificationResult, null, 2)
})
</script>

<style scoped>
.result-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  background: #fafafa;
}

.empty {
  color: #6b7280;
  font-size: 13px;
}

.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.label {
  color: #6b7280;
}

.value {
  font-weight: 600;
  color: #111827;
}

.value.ok {
  color: #16a34a;
}

.value.fail {
  color: #dc2626;
}

.summary-grid {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: #111827;
}

.summary-item {
  display: flex;
  gap: 8px;
}

.summary-label {
  min-width: 70px;
  color: #6b7280;
}

.summary-value {
  color: #111827;
}

.summary-value.ok {
  color: #16a34a;
}

.summary-value.fail {
  color: #dc2626;
}

.error-text {
  color: #b91c1c;
}

.section {
  margin-top: 10px;
}

.section-title {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.checks {
  margin-top: 8px;
}

.checks-title {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.checks-list {
  display: grid;
  gap: 6px;
}

.check-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #111827;
}

.check-status.ok {
  color: #16a34a;
}

.check-status.fail {
  color: #dc2626;
}

.error {
  color: #b91c1c;
  background: #fdecea;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
}

.code {
  background: #ffffff;
  border-radius: 8px;
  padding: 8px;
  font-size: 12px;
  color: #111827;
  border: 1px solid #e5e7eb;
  overflow-x: auto;
}

.muted {
  font-size: 12px;
  color: #6b7280;
}
</style>
