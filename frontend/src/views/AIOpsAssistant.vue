<template>
  <div class="ai-ops-page">
    <div class="page-header">
      <h1>AI Ops 助手</h1>
      <p class="subtitle">Phase 1A 试运行与执行闭环</p>
    </div>

    <div class="info-card">
      <div class="info-icon">💡</div>
      <div class="info-content">
        <h2 class="info-title">关于 Dry-Run (试运行)</h2>
        <p class="info-desc">
          在真正执行平台动作前，先做一次 <b>“试运行评估”</b>。这能帮你提前感知 <b>风险等级、影响范围</b> 以及系统解析后的参数，以此最大程度降低误操作的概率。
        </p>
        <div class="info-steps">
          <strong>📝 快速上手：</strong>
          <span class="step">选择推荐动作</span>
          <span class="arrow">→</span>
          <span class="step">填写必要参数</span>
          <span class="arrow">→</span>
          <span class="step">运行 Dry-Run</span>
          <span class="arrow">→</span>
          <span class="step">确认无风险后执行</span>
        </div>
      </div>
    </div>

    <div class="page-grid">
      <section class="panel">
        <h2>推荐动作</h2>
        <ActionRecommendationList :items="recommendations" :selected-action-id="selectedActionId"
          @select="selectAction" />
      </section>

      <section class="panel">
        <h2>动作参数</h2>

        <div v-if="selectedActionId" class="form-block">
          <form @submit.prevent="submitDryRun">
            <template v-if="selectedActionId === 'acknowledge_alert'">
              <label class="form-label">
                事件 ID
                <input v-model.trim="ackForm.eventId" required placeholder="alert-123" />
              </label>
              <label class="form-label">
                备注
                <input v-model.trim="ackForm.comment" placeholder="确认原因" />
              </label>
            </template>

            <template v-else-if="selectedActionId === 'create_incident_timeline_note'">
              <label class="form-label">
                事故 ID
                <input v-model.trim="noteForm.incidentId" required placeholder="incident-001" />
              </label>
              <label class="form-label">
                记录内容
                <textarea v-model.trim="noteForm.note" required placeholder="请输入时间线记录"></textarea>
              </label>
            </template>

            <template v-else-if="selectedActionId === 'mute_alert_rule_temporarily'">
              <label class="form-label">
                规则 ID
                <input v-model.trim="muteForm.ruleId" required placeholder="rule-001" />
              </label>
              <label class="form-label">
                持续时间（秒）
                <input type="number" min="1" v-model.number="muteForm.durationSec" required />
              </label>
              <label class="form-label">
                原因
                <input v-model.trim="muteForm.reason" required placeholder="维护窗口" />
              </label>
            </template>

            <button class="btn-primary" type="submit" :disabled="store.loading">
              {{ store.loading ? '提交中...' : '运行 Dry-Run' }}
            </button>
          </form>
        </div>

        <div v-else class="empty">请选择动作后填写参数</div>

        <div v-if="store.error" class="error">{{ store.error }}</div>
      </section>

      <section class="panel">
        <h2>Dry-Run 结果</h2>
        <DryRunResultCard :dry-run="dryRunResult" />
        <div class="status-row" v-if="currentStatus">
          <span>当前状态:</span>
          <strong :class="{ success: isSucceeded, failed: isFailed }">
            {{ statusLabel }}
          </strong>
        </div>
        <div class="actions" v-if="showConfirm">
          <button class="btn-primary" @click="confirmExecution" :disabled="store.loading">
            {{ store.loading ? '确认中...' : '确认执行' }}
          </button>
        </div>
        <div v-if="store.polling" class="polling">正在轮询执行状态...</div>
        <div v-if="store.loading && !store.polling" class="polling">请求处理中...</div>
      </section>

      <section class="panel">
        <h2>执行与验证结果</h2>
        <ExecutionResultCard :status="currentStatus" :execution-result="store.currentRequest?.executionResult || null"
          :verification-result="store.currentRequest?.verificationResult || null"
          :error="store.currentRequest?.error || null" />
      </section>

      <section class="panel">
        <h2>执行时间线</h2>
        <ExecutionTimeline :timeline="store.timeline" :loading="store.polling" />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { ActionId, ActionRequestInput, DryRunResult, ActionRequestStatus } from '@/api/aiOps'
import { useAiOpsStore } from '@/stores/aiOps'
import ActionRecommendationList from '@/components/ai-ops/ActionRecommendationList.vue'
import DryRunResultCard from '@/components/ai-ops/DryRunResultCard.vue'
import ExecutionTimeline from '@/components/ai-ops/ExecutionTimeline.vue'
import ExecutionResultCard from '@/components/ai-ops/ExecutionResultCard.vue'

const store = useAiOpsStore()
const route = useRoute()

const recommendations = ref<Array<{ title: string; actionId: ActionId; riskLevel: string }>>([
  {
    title: '确认告警事件',
    actionId: 'acknowledge_alert',
    riskLevel: 'low'
  },
  {
    title: '创建事故时间线记录',
    actionId: 'create_incident_timeline_note',
    riskLevel: 'medium'
  },
  {
    title: '临时静默告警规则',
    actionId: 'mute_alert_rule_temporarily',
    riskLevel: 'medium'
  }
])

const selectedActionId = ref<ActionId | ''>('')

const ackForm = ref({
  eventId: '',
  comment: ''
})

const noteForm = ref({
  incidentId: '',
  note: ''
})

const muteForm = ref({
  ruleId: '',
  durationSec: 900,
  reason: ''
})

const dryRunResult = computed<DryRunResult | null>(() => {
  const dryRun = store.currentRequest?.dryRunResult
  if (!dryRun) {
    return null
  }
  return {
    ...dryRun,
    resolvedParams: dryRun.resolvedParams ?? store.currentRequest?.resolvedParams ?? {}
  }
})

const currentStatus = computed<ActionRequestStatus | ''>(() => {
  return store.currentRequest?.status || ''
})

const isSucceeded = computed(() => currentStatus.value === 'SUCCEEDED')
const isFailed = computed(() => currentStatus.value === 'FAILED')
const showConfirm = computed(() => currentStatus.value === 'DRY_RUN_READY')

const statusLabel = computed(() => {
  if (!currentStatus.value) {
    return ''
  }
  const mapping: Record<string, string> = {
    REQUESTED: '已提交',
    DRY_RUN_READY: '等待确认',
    CONFIRMED: '已确认',
    EXECUTING: '执行中',
    VERIFYING: '验证中',
    SUCCEEDED: '执行成功',
    FAILED: '执行失败'
  }
  return mapping[currentStatus.value] || currentStatus.value
})

const selectAction = (actionId: ActionId) => {
  selectedActionId.value = actionId
  store.reset()
}

const isActionId = (value: unknown): value is ActionId => {
  return value === 'acknowledge_alert'
    || value === 'create_incident_timeline_note'
    || value === 'mute_alert_rule_temporarily'
}

const applyRoutePrefill = (query: Record<string, unknown>) => {
  if (!isActionId(query.actionId)) {
    return
  }

  selectAction(query.actionId)

  if (query.actionId === 'acknowledge_alert') {
    ackForm.value = {
      eventId: typeof query.eventId === 'string' ? query.eventId : '',
      comment: typeof query.comment === 'string' ? query.comment : ''
    }
    return
  }

  if (query.actionId === 'create_incident_timeline_note') {
    noteForm.value = {
      incidentId: typeof query.incidentId === 'string' ? query.incidentId : '',
      note: typeof query.note === 'string' ? query.note : ''
    }
    return
  }

  muteForm.value = {
    ruleId: typeof query.ruleId === 'string' ? query.ruleId : '',
    durationSec: typeof query.durationSec === 'string' ? Number(query.durationSec) || 900 : 900,
    reason: typeof query.reason === 'string' ? query.reason : ''
  }
}

watch(
  () => route.query,
  (query) => {
    applyRoutePrefill(query as Record<string, unknown>)
  },
  { immediate: true }
)

const buildIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `dryrun_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const buildInput = (): ActionRequestInput | null => {
  const idempotencyKey = buildIdempotencyKey()

  if (selectedActionId.value === 'acknowledge_alert') {
    return {
      actionClass: 'platform_action',
      actionId: 'acknowledge_alert',
      idempotencyKey,
      params: {
        eventId: ackForm.value.eventId,
        comment: ackForm.value.comment || undefined
      },
      eventId: ackForm.value.eventId,
      comment: ackForm.value.comment || undefined
    }
  }

  if (selectedActionId.value === 'create_incident_timeline_note') {
    return {
      actionClass: 'platform_action',
      actionId: 'create_incident_timeline_note',
      idempotencyKey,
      params: {
        incidentId: noteForm.value.incidentId,
        note: noteForm.value.note
      },
      incidentId: noteForm.value.incidentId,
      note: noteForm.value.note
    }
  }

  if (selectedActionId.value === 'mute_alert_rule_temporarily') {
    return {
      actionClass: 'platform_action',
      actionId: 'mute_alert_rule_temporarily',
      idempotencyKey,
      params: {
        ruleId: muteForm.value.ruleId,
        durationSec: muteForm.value.durationSec,
        reason: muteForm.value.reason
      },
      ruleId: muteForm.value.ruleId,
      durationSec: muteForm.value.durationSec,
      reason: muteForm.value.reason
    }
  }

  return null
}

const submitDryRun = async () => {
  const input = buildInput()
  if (!input) {
    return
  }
  try {
    await store.createRequest(input)
  } catch (error) {
    console.error('Dry-run failed:', error)
  }
}

const confirmExecution = async () => {
  const requestId = store.currentRequest?.requestId
  if (!requestId) {
    return
  }
  try {
    await store.confirmRequest(requestId)
    await store.fetchTimeline(requestId)
    store.startPolling(requestId)
  } catch (error) {
    console.error('Confirm execution failed:', error)
  }
}
</script>

<style scoped>
.ai-ops-page {
  padding: 24px;
}

.page-header {
  margin-bottom: 20px;
}

.subtitle {
  color: #6b7280;
  margin-top: 4px;
}

.info-card {
  display: flex;
  gap: 16px;
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 20px;
  align-items: flex-start;
}

.info-icon {
  font-size: 24px;
  line-height: 1;
}

.info-content {
  flex: 1;
}

.info-title {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 600;
  color: #166534;
}

.info-desc {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #15803d;
  line-height: 1.5;
}

.info-steps {
  font-size: 13px;
  color: #166534;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  background-color: #dcfce7;
  padding: 8px 12px;
  border-radius: 6px;
}

.info-steps .step {
  font-weight: 500;
}

.info-steps .arrow {
  color: #4ade80;
}

.page-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px;
  background: #ffffff;
}

.status-row {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  font-size: 14px;
  color: #374151;
}

.status-row strong.success {
  color: #16a34a;
}

.status-row strong.failed {
  color: #dc2626;
}

.actions {
  margin-top: 12px;
}

.polling {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

.form-block {
  display: grid;
  gap: 12px;
}

.form-label {
  display: grid;
  gap: 6px;
  font-size: 14px;
  color: #111827;
}

input,
textarea {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 14px;
}

textarea {
  min-height: 90px;
  resize: vertical;
}

.btn-primary {
  margin-top: 8px;
  padding: 10px 14px;
  border: none;
  border-radius: 6px;
  background: #111827;
  color: #ffffff;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty {
  color: #6b7280;
}

.error {
  margin-top: 12px;
  color: #b91c1c;
}
</style>
