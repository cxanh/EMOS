<template>
  <div class="stats-card-widget">
    <div class="stats-grid">
      <div class="stat-card cpu">
        <div class="stat-icon">💻</div>
        <div class="stat-info">
          <div class="stat-label">CPU</div>
          <div class="stat-value">{{ cpuValue }}%</div>
        </div>
        <div class="stat-trend" :class="getTrendClass(cpuTrend)">
          {{ cpuTrend > 0 ? '↑' : cpuTrend < 0 ? '↓' : '→' }}
          {{ Math.abs(cpuTrend).toFixed(1) }}%
        </div>
      </div>

      <div class="stat-card memory">
        <div class="stat-icon">🧠</div>
        <div class="stat-info">
          <div class="stat-label">内存</div>
          <div class="stat-value">{{ memoryValue }}%</div>
        </div>
        <div class="stat-trend" :class="getTrendClass(memoryTrend)">
          {{ memoryTrend > 0 ? '↑' : memoryTrend < 0 ? '↓' : '→' }}
          {{ Math.abs(memoryTrend).toFixed(1) }}%
        </div>
      </div>

      <div class="stat-card disk">
        <div class="stat-icon">💾</div>
        <div class="stat-info">
          <div class="stat-label">磁盘</div>
          <div class="stat-value">{{ diskValue }}%</div>
        </div>
        <div class="stat-trend" :class="getTrendClass(diskTrend)">
          {{ diskTrend > 0 ? '↑' : diskTrend < 0 ? '↓' : '→' }}
          {{ Math.abs(diskTrend).toFixed(1) }}%
        </div>
      </div>

      <div class="stat-card network">
        <div class="stat-icon">🌐</div>
        <div class="stat-info">
          <div class="stat-label">网络</div>
          <div class="stat-value">{{ networkValue }} MB/s</div>
        </div>
        <div class="stat-trend" :class="getTrendClass(networkTrend)">
          {{ networkTrend > 0 ? '↑' : networkTrend < 0 ? '↓' : '→' }}
          {{ Math.abs(networkTrend).toFixed(1) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMetricsStore } from '@/stores/metrics'

const props = defineProps<{
  widget: any
  nodeId?: string
}>()

const metricsStore = useMetricsStore()

const latestMetrics = computed(() => {
  if (!props.nodeId) return null
  return metricsStore.latestMetrics[props.nodeId]
})

const history = computed(() => {
  if (!props.nodeId) return []
  return metricsStore.metricsHistory[props.nodeId] || []
})

const cpuValue = computed(() => {
  return latestMetrics.value?.cpu?.toFixed(1) || 0
})

const memoryValue = computed(() => {
  return latestMetrics.value?.memory?.toFixed(1) || 0
})

const diskValue = computed(() => {
  return latestMetrics.value?.disk?.toFixed(1) || 0
})

const networkValue = computed(() => {
  if (!latestMetrics.value) return 0
  const total = (latestMetrics.value.network_recv + latestMetrics.value.network_sent) / 1024 / 1024
  return total.toFixed(2)
})

// 计算趋势（与前一个数据点比较）
const cpuTrend = computed(() => {
  if (history.value.length < 2) return 0
  const current = history.value[history.value.length - 1].cpu || 0
  const previous = history.value[history.value.length - 2].cpu || 0
  return current - previous
})

const memoryTrend = computed(() => {
  if (history.value.length < 2) return 0
  const current = history.value[history.value.length - 1].memory || 0
  const previous = history.value[history.value.length - 2].memory || 0
  return current - previous
})

const diskTrend = computed(() => {
  if (history.value.length < 2) return 0
  const current = history.value[history.value.length - 1].disk || 0
  const previous = history.value[history.value.length - 2].disk || 0
  return current - previous
})

const networkTrend = computed(() => {
  if (history.value.length < 2) return 0
  const current = (history.value[history.value.length - 1].network_recv + history.value[history.value.length - 1].network_sent) / 1024 / 1024
  const previous = (history.value[history.value.length - 2].network_recv + history.value[history.value.length - 2].network_sent) / 1024 / 1024
  return current - previous
})

const getTrendClass = (trend: number) => {
  if (trend > 0) return 'trend-up'
  if (trend < 0) return 'trend-down'
  return 'trend-stable'
}
</script>

<style scoped>
.stats-card-widget {
  height: 100%;
  padding: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  height: 100%;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: white;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

.stat-card.cpu {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card.memory {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-card.disk {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-card.network {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.9;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.stat-trend {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: inline-block;
  margin-top: 8px;
}

.trend-up {
  background: rgba(245, 108, 108, 0.3);
}

.trend-down {
  background: rgba(103, 194, 58, 0.3);
}

.trend-stable {
  background: rgba(255, 255, 255, 0.2);
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
