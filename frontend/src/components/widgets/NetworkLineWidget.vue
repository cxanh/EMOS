<template>
  <div class="network-line-widget">
    <div ref="chartRef" class="chart-container"></div>
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

const networkHistory = computed(() => {
  if (!props.nodeId) return { times: [], recv: [], sent: [] }
  const history = metricsStore.metricsHistory[props.nodeId] || []
  
  return {
    times: history.map(m => new Date(m.timestamp).toLocaleTimeString()),
    recv: history.map(m => (m.network_recv / 1024 / 1024).toFixed(2)),
    sent: history.map(m => (m.network_sent / 1024 / 1024).toFixed(2))
  }
})

const initChart = () => {
  if (!chartRef.value) return
  
  chart = echarts.init(chartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['接收', '发送'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: []
    },
    yAxis: {
      type: 'value',
      name: 'MB/s',
      axisLabel: {
        formatter: '{value}'
      }
    },
    series: [
      {
        name: '接收',
        type: 'line',
        smooth: true,
        symbol: 'none',
        sampling: 'lttb',
        itemStyle: {
          color: '#67C23A'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
            { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
          ])
        },
        data: []
      },
      {
        name: '发送',
        type: 'line',
        smooth: true,
        symbol: 'none',
        sampling: 'lttb',
        itemStyle: {
          color: '#409EFF'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
          ])
        },
        data: []
      }
    ]
  }
  
  chart.setOption(option)
}

const updateChart = () => {
  if (!chart) return
  
  const data = networkHistory.value
  
  chart.setOption({
    xAxis: {
      data: data.times
    },
    series: [
      { data: data.recv },
      { data: data.sent }
    ]
  })
}

watch(() => networkHistory.value, () => {
  updateChart()
}, { deep: true })

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
.network-line-widget {
  height: 100%;
}

.chart-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
}
</style>
