<template>
  <div class="timeline">
    <div v-if="loading" class="loading">时间线加载中...</div>
    <div v-else-if="!timeline.length" class="empty">暂无时间线数据</div>

    <div v-else class="timeline-list">
      <div v-for="(event, index) in timeline" :key="index" class="timeline-item">
        <div class="time">{{ formatTime(event.timestamp) }}</div>
        <div class="content">
          <div class="event-type">{{ event.eventType }}</div>
          <div class="meta">
            <span>状态: {{ event.statusTo || '-' }}</span>
            <span>来源: {{ event.actorRole }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TimelineEvent } from '@/api/aiOps'

defineProps<{
  timeline: TimelineEvent[]
  loading?: boolean
}>()

const formatTime = (value: string) => {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}
</script>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty {
  color: #6b7280;
  font-size: 13px;
}

.loading {
  color: #6b7280;
  font-size: 13px;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timeline-item {
  display: flex;
  gap: 12px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}

.time {
  min-width: 140px;
  font-size: 12px;
  color: #6b7280;
}

.event-type {
  font-weight: 600;
  color: #111827;
}

.meta {
  margin-top: 4px;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
}
</style>
