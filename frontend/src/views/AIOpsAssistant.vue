<template>
  <div class="ai-ops-page">
    <div class="page-header">
      <div>
        <h1>AI Ops Assistant</h1>
        <p class="page-subtitle">选择推荐动作并提交 dry-run</p>
      </div>
    </div>

    <div class="page-grid">
      <section class="panel">
        <h2>推荐动作</h2>
        <ActionRecommendationList
          :items="recommendations"
          :selectedActionId="selectedActionId"
          @select="handleSelectAction"
        />
      </section>

      <section class="panel">
        <h2>参数输入</h2>
        <form class="form" @submit.prevent="submitDryRun">
          <div class="form-row">
            <label>Action ID</label>
            <input type="text" :value="selectedActionId" disabled />
          </div>

          <template v-if="selectedActionId === 'acknowledge_alert'">
            <div class="form-row">
              <label>eventId</label>
              <input v-model.trim="form.eventId" type="text" placeholder="alert-123" />
            </div>
            <div class="form-row">
              <label>comment</label>
              <input v-model.trim="form.comment" type="text" placeholder="Acknowledge reason" />
            </div>
          </template>

          <template v-else-if="selectedActionId === 'create_incident_timeline_note'">
            <div class="form-row">
              <label>incidentId</label>
              <input v-model.trim="form.incidentId" type="text" placeholder="incident-001" />
            </div>
            <div class="form-row">
              <label>note</label>
              <textarea v-model.trim="form.note" rows="3" placeholder="Timeline note"></textarea>
            </div>
          </template>

          <template v-else-if="selectedActionId === 'mute_alert_rule_temporarily'">
            <div class="form-row">
              <label>ruleId</label>
              <input v-model.trim="form.ruleId" type="text" placeholder="rule-001" />
            </div>
            <div class="form-row">
              <label>durationSec</label>
              <input v-model.number="form.durationSec" type="number" min="1" step="1" />
            </div>
            <div class="form-row">
              <label>reason</label>
              <input v-model.trim="form.reason" type="text" placeholder="Maintenance window" />
            </div>
          </template>

          <div class="form-actions">
            <button type="submit" :disabled="aiOpsStore.loading || !canSubmit">
              {{ aiOpsStore.loading ? 'Submitting...' : 'Run Dry-Run' }}
            </button>
            <button type="button" class="btn-secondary" @click="resetForm">Reset</button>
          </div>
        </form>
      </section>
    </div>

    <section class="panel">
      <h2>Dry-Run 结果</h2>
      <div v-if="aiOpsStore.error" class="error">{{ aiOpsStore.error }}</div>
      <DryRunResultCard :dryRun="aiOpsStore.currentRequest?.dryRunResult || null" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useAiOpsStore } from '@/stores/aiOps'
import type { ActionId, ActionRequestInput } from '@/api/aiOps'
import ActionRecommendationList from '@/components/ai-ops/ActionRecommendationList.vue'
import DryRunResultCard from '@/components/ai-ops/DryRunResultCard.vue'

interface RecommendationItem {
  title: string
  actionId: ActionId
  riskLevel: string
  description: string
}

const aiOpsStore = useAiOpsStore()

const recommendations: RecommendationItem[] = [
  {
    title: '确认告警并添加备注',
    actionId: 'acknowledge_alert',
    riskLevel: 'low',
    description: '将告警标记为已确认并补充备注。'
  },
  {
    title: '新增事故时间线记录',
    actionId: 'create_incident_timeline_note',
    riskLevel: 'low',
    description: '在事故时间线中写入新的记录。'
  },
  {
    title: '临时静默告警规则',
    actionId: 'mute_alert_rule_temporarily',
    riskLevel: 'low',
    description: '在指定时间内暂停规则触发。'
  }
]

const selectedActionId = ref<ActionId>('acknowledge_alert')

const form = reactive({
  eventId: '',
  comment: '',
  incidentId: '',
  note: '',
  ruleId: '',
  durationSec: 3600,
  reason: ''
})

const canSubmit = computed(() => {
  if (selectedActionId.value === 'acknowledge_alert') {
    return Boolean(form.eventId)
  }
  if (selectedActionId.value === 'create_incident_timeline_note') {
    return Boolean(form.incidentId && form.note)
  }
  if (selectedActionId.value === 'mute_alert_rule_temporarily') {
    return Boolean(form.ruleId && form.durationSec > 0 && form.reason)
  }
  return false
})

const handleSelectAction = (actionId: ActionId) => {
  selectedActionId.value = actionId
}

const resetForm = () => {
  form.eventId = ''
  form.comment = ''
  form.incidentId = ''
  form.note = ''
  form.ruleId = ''
  form.durationSec = 3600
  form.reason = ''
  aiOpsStore.reset()
}

const buildRequestInput = (): ActionRequestInput => {
  const idempotencyKey = `${selectedActionId.value}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`

  if (selectedActionId.value === 'acknowledge_alert') {
    return {
      actionClass: 'platform_action',
      actionId: 'acknowledge_alert',
      idempotencyKey,
      params: {
        eventId: form.eventId,
        comment: form.comment
      }
    }
  }

  if (selectedActionId.value === 'create_incident_timeline_note') {
    return {
      actionClass: 'platform_action',
      actionId: 'create_incident_timeline_note',
      idempotencyKey,
      params: {
        incidentId: form.incidentId,
        note: form.note
      }
    }
  }

  return {
    actionClass: 'platform_action',
    actionId: 'mute_alert_rule_temporarily',
    idempotencyKey,
    params: {
      ruleId: form.ruleId,
      durationSec: form.durationSec,
      reason: form.reason
    }
  }
}

const submitDryRun = async () => {
  if (!canSubmit.value) {
    return
  }

  const input = buildRequestInput()
  await aiOpsStore.createRequest(input)
}

watch(selectedActionId, () => {
  aiOpsStore.reset()
})
</script>

<style scoped>
.ai-ops-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
}

.page-subtitle {
  margin: 6px 0 0 0;
  color: #7f8c8d;
  font-size: 14px;
}

.page-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.panel {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.panel h2 {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: #2c3e50;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row label {
  font-size: 13px;
  color: #555;
}

.form-row input,
.form-row textarea {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
}

.form-actions {
  display: flex;
  gap: 12px;
}

.form-actions button {
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  background: #667eea;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.form-actions button:disabled {
  background: #c5cbe3;
  cursor: not-allowed;
}

.form-actions .btn-secondary {
  background: #ecf0f1;
  color: #2c3e50;
}

.error {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #fdecea;
  color: #b71c1c;
  border-radius: 8px;
  font-size: 13px;
}

@media (max-width: 1024px) {
  .page-grid {
    grid-template-columns: 1fr;
  }
}
</style>
