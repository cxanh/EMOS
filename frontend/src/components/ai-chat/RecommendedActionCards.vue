<template>
  <div v-if="actions.length" class="recommended-actions">
    <div class="section-title">推荐动作</div>
    <div class="action-grid">
      <router-link
        v-for="action in actions"
        :key="`${action.actionClass}:${action.actionId}`"
        class="action-card"
        :to="buildAssistantRoute(action)"
      >
        <div class="card-top">
          <h4>{{ action.title }}</h4>
          <span class="risk-pill" :class="action.riskLevel">{{ action.riskLevel }}</span>
        </div>
        <p class="reason">{{ action.reason || '建议在 AI Ops 助手中继续确认和执行。' }}</p>
        <div class="param-list" v-if="serializedPrefill(action).length">
          <span v-for="item in serializedPrefill(action)" :key="`${action.actionId}-${item.key}`" class="param-chip">
            {{ item.key }}={{ item.value }}
          </span>
        </div>
        <div class="cta">去 AI Ops 助手执行</div>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { AIChatRecommendedAction } from '@/api/aiChat'

const props = defineProps<{
  actions: AIChatRecommendedAction[]
}>()

const toQueryRecord = (prefillParams: Record<string, unknown>) => {
  const query: Record<string, string> = {}

  Object.entries(prefillParams || {}).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      query[key] = String(value)
    }
  })

  return query
}

const serializedPrefill = (action: AIChatRecommendedAction) => {
  return Object.entries(toQueryRecord(action.prefillParams)).map(([key, value]) => ({
    key,
    value
  }))
}

const buildAssistantRoute = (action: AIChatRecommendedAction): RouteLocationRaw => {
  return {
    name: 'AIOpsAssistant',
    query: {
      actionId: action.actionId,
      ...toQueryRecord(action.prefillParams)
    }
  }
}
</script>

<style scoped>
.recommended-actions {
  display: grid;
  gap: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #0f766e;
}

.action-grid {
  display: grid;
  gap: 12px;
}

.action-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.action-card:hover {
  border-color: #0f766e;
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(15, 118, 110, 0.08);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.card-top h4 {
  margin: 0;
  font-size: 15px;
  color: #0f172a;
}

.risk-pill {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.risk-pill.low {
  background: #dcfce7;
  color: #166534;
}

.risk-pill.medium {
  background: #fef3c7;
  color: #92400e;
}

.risk-pill.high {
  background: #fee2e2;
  color: #991b1b;
}

.reason {
  margin: 0;
  color: #334155;
  line-height: 1.5;
}

.param-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.param-chip {
  padding: 4px 8px;
  border-radius: 999px;
  background: #e2e8f0;
  font-size: 12px;
  color: #334155;
}

.cta {
  font-size: 13px;
  font-weight: 600;
  color: #0f766e;
}
</style>
