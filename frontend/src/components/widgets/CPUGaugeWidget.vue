<template>
  <div class="cpu-gauge-widget">
    <div ref="chartRef" class="chart-container"></div>
    <div class="stats">
      <div class="stat-item">
        <span class="label">当前</span>
        <span class="value">{{ currentValue }}%</span>
      </div>
      <div class="stat-item">
        <span class="label">平均</span>
        <span class="value">{{ avgValue }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as echarts from 'echarts'
import { useMetricsStore } from '@/stores/metrics'

const props = defineProps<{
  widget: any
  nodeId?: string
}>()

const metricsStore = useMetricsStore()
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

const currentValue = computed(() => {
  if (!props.nodeId) return 0
  const latest = metricsStore.latestMetrics[props.nodeId]
  return latest?.cpu?.toFixed(1) || 0
})

const avgValue = computed(() => {
  if (!props.nodeId) return 0
  const history = metricsStore.metricsHistory[props.nodeId] || []
  if (history.length === 0) return 0
  const sum = history.reduce((acc, m) => acc + (m.cpu || 0), 0)
  return (sum / history.length).toFixed(1)
})

const initChart = () => {
  if (!chartRef.value) return
  
  chart = echarts.init(chartRef.value)
  
  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        splitNumber: 10,
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [0.5, '#67C23A'],
              [0.8, '#E6A23C'],
              [1, '#F56C6C']
            ]
          }
        },
        pointer: {
          itemStyle: {
            color: 'auto'
          }
        },
        axisTick: {
          distance: -20,
          length: 5,
          lineStyle: {
            color: '#fff',
            width: 1
          }
        },
        splitLine: {
          distance: -20,
          length: 20,
          lineStyle: {
            color: '#fff',
            width: 2
          }
        },
        axisLabel: {
          color: 'auto',
          distance: 30,
          fontSize: 12
        },
        detail: {
          valueAnimation: true,
          formatter: '{value}%',
          color: 'auto',
          fontSize: 24,
          offsetCenter: [0, '70%']
        },
        data: [
          {
            value: 0,
            name: 'CPU'
          }
        ]
      }
    ]
  }
  
  chart.setOption(option)
}

const updateChart = () => {
  if (!chart) return
  
  chart.setOption({
    series: [
      {
        data: [
          {
            value: parseFloat(currentValue.value as any) || 0,
            name: 'CPU'
          }
        ]
      }
    ]
  })
}

watch(() => currentValue.value, () => {
  updateChart()
})

onMounted(() => {
  initChart()
  updateChart()
  
  window.addEventListener('resize', () => {
    chart?.resize()
  })
})

onUnmounted(() => {
  chart?.dispose()
})
</script>

<style scoped>
.cpu-gauge-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-container {
  flex: 1;
  min-height: 200px;
}

.stats {
  display: flex;
  justify-content: space-around;
  padding: 12px 0;
  border-top: 1px solid #ecf0f1;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-item .label {
  font-size: 12px;
  color: #7f8c8d;
}

.stat-item .value {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}
</style>
