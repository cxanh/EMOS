<template>
  <section class="context-bar">
    <div class="context-header">
      <div>
        <h2>上下文栏</h2>
        <p>只传 `nodeId / incidentId / timeRange`，上下文摘要由后端生成。</p>
      </div>
      <div class="status-box" :class="{ enabled: !!status?.enabled }">
        <span class="status-dot"></span>
        <span v-if="status">{{ status.enabled ? `${status.provider} / ${status.model}` : 'AI 未启用' }}</span>
        <span v-else>{{ loadingStatus ? '状态加载中...' : '状态未知' }}</span>
      </div>
    </div>

    <div class="context-grid">
      <label class="field">
        <span>Node ID</span>
        <ComboBox :model-value="context.nodeId" :options="nodeOptions" placeholder="可选择或输入 node-001"
          @update:model-value="updateField('nodeId', $event)" />
      </label>
      <label class="field">
        <span>Incident ID</span>
        <ComboBox :model-value="context.incidentId" :options="incidentOptions" placeholder="可选择或输入 event-001"
          @update:model-value="updateField('incidentId', $event)" />
      </label>
      <label class="field">
        <span>Time Range</span>
        <ComboBox :model-value="context.timeRange" :options="timeRangeOptions" placeholder="可选择预置或自定义"
          @update:model-value="updateField('timeRange', $event)" />
      </label>
    </div>

    <div class="context-chips">
      <span class="chip" :class="{ empty: !context.nodeId }">nodeId: {{ context.nodeId || '未设置' }}</span>
      <span class="chip" :class="{ empty: !context.incidentId }">incidentId: {{ context.incidentId || '未设置' }}</span>
      <span class="chip">timeRange: {{ context.timeRange }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AIStatus } from '@/api/ai'
import type { AIChatContextForm } from '@/stores/aiChat'
import { useNodesStore } from '@/stores/nodes'
import ComboBox, { type ComboOption } from './ComboBox.vue'

const props = defineProps<{
  context: AIChatContextForm
  status: AIStatus | null
  loadingStatus?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:context', value: AIChatContextForm): void
}>()

const updateField = (field: keyof AIChatContextForm, value: string) => {
  emit('update:context', {
    ...props.context,
    [field]: value
  })
}

// 统一数据源：Nodes (真实 Store)
const nodesStore = useNodesStore()
const nodeOptions = computed<ComboOption[]>(() => {
  if (!nodesStore.nodes || nodesStore.nodes.length === 0) return []
  return nodesStore.nodes.map(node => ({
    value: node.node_id,
    label: node.display_name || node.node_id,
    description: `${node.hostname} / ${node.ip}`
  }))
})

// 统一数据源：Incidents (Mock，后期可接 AlertStore)
const incidentOptions = computed<ComboOption[]>(() => [
  { value: 'event-001', label: 'event-001', description: 'CPU 负载过高' },
  { value: 'event-002', label: 'event-002', description: '内存泄漏告警' },
  { value: 'event-003', label: 'event-003', description: '磁盘空间不足' }
])

// 统一数据源：TimeRange
const timeRangeOptions = computed<ComboOption[]>(() => [
  { value: '1h', label: '1h', description: '过去一小时' },
  { value: '24h', label: '24h', description: '过去二十四小时' },
  { value: '7d', label: '7d', description: '过去七天' },
  { value: '30d', label: '30d', description: '过去三十天' }
])
</script>

<style scoped>
.context-bar {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.context-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.context-header h2 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #f8fafc;
}

.context-header p {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
}

.status-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-box.enabled {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f87171;
  box-shadow: 0 0 8px #f87171;
}

.status-box.enabled .status-dot {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.context-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.field {
  display: grid;
  gap: 8px;
  font-size: 13px;
  color: #cbd5e1;
}

/* 移除原有的 input 和 select 样式，因为已使用 ComboBox */

.context-chips {
  display: flex;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.chip {
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
  color: #cbd5e1;
}

.chip.empty {
  color: #64748b;
  border-color: transparent;
}

@media (max-width: 768px) {
  .context-header {
    flex-direction: column;
  }

  .context-grid {
    grid-template-columns: 1fr;
  }
}
</style>
