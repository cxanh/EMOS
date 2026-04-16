<template>
  <div class="recommendation-list">
    <button
      v-for="item in items"
      :key="item.actionId"
      class="recommendation-item"
      :class="{ active: item.actionId === selectedActionId }"
      @click="emit('select', item.actionId)"
    >
      <div class="item-header">
        <span class="title">{{ item.title }}</span>
        <span class="risk">{{ item.riskLevel }}</span>
      </div>
      <div class="meta">
        <span class="action-id">{{ item.actionId }}</span>
      </div>
      <p class="description">{{ item.description }}</p>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ActionId } from '@/api/aiOps'

interface RecommendationItem {
  title: string
  actionId: ActionId
  riskLevel: string
  description: string
}

defineProps<{
  items: RecommendationItem[]
  selectedActionId: ActionId
}>()

const emit = defineEmits<{
  (event: 'select', actionId: ActionId): void
}>()
</script>

<style scoped>
.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recommendation-item {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 12px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: border 0.2s ease, box-shadow 0.2s ease;
}

.recommendation-item.active {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.title {
  font-weight: 600;
  color: #2c3e50;
}

.risk {
  font-size: 12px;
  padding: 2px 6px;
  background: #f2f4ff;
  color: #4c5bd4;
  border-radius: 6px;
}

.meta {
  margin-top: 4px;
  font-size: 12px;
  color: #7f8c8d;
}

.description {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: #555;
}
</style>
