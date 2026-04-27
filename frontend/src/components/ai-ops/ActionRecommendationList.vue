<template>
  <div class="action-recommendation-list">
    <div
      v-for="item in items"
      :key="item.actionId"
      class="recommendation-item"
      :class="{ selected: item.actionId === selectedActionId }"
      @click="emit('select', item.actionId)"
    >
      <div class="item-main">
        <div class="item-title">{{ item.title }}</div>
        <div class="item-meta">{{ item.actionId }}</div>
      </div>
      <div class="item-risk">Risk: {{ item.riskLevel }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ActionId } from '@/api/aiOps'

export type ActionRecommendation = {
  title: string
  actionId: ActionId
  riskLevel: string
}

const props = defineProps<{
  items: ActionRecommendation[]
  selectedActionId: ActionId | ''
}>()

const emit = defineEmits<{
  (event: 'select', actionId: ActionId): void
}>()
</script>

<style scoped>
.action-recommendation-list {
  display: grid;
  gap: 12px;
}

.recommendation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  background: #ffffff;
}

.recommendation-item.selected {
  border-color: #1f2937;
  background: #f3f4f6;
}

.item-title {
  font-weight: 600;
  color: #111827;
}

.item-meta {
  font-size: 12px;
  color: #6b7280;
}

.item-risk {
  font-size: 12px;
  color: #374151;
}
</style>
