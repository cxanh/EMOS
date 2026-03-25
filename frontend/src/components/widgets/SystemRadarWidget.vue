<template>
  <div class="system-radar-widget">
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

const systemMetrics = computed(() => {
  if (!props.nodeId) return [0, 0, 0, 0]
  const latest = metricsStore.latestMetrics[props.nodeId]
  if (!latest) return [0, 0, 0, 0]
  
  return [
    latest.cpu || 0,
    latest.memory || 0,
    latest.disk || 0,
    Math.min(((latest.network_recv + latest.network_sent) / 1024 / 1024 / 10) * 100, 100) // 网络归一化到0-100
  ]
})

const initChart = () => {
  if (!chartRef.value) return
  
  chart = echarts.init(chartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'item'
    },
    radar: {
      indicator: [
        { name: 'CPU', max: 100 },
        { name: '内存', max: 100 },
        { name: '磁盘', max: 100 },
        { name: '网络', max: 100 }
      ],
      shape: 'circle',
      splitNumber: 5,
      axisName: {
        color: '#2c3e50',
        fontSize: 14
      },
      splitLine: {
        lineStyle: {
          color: [
            'rgba(102, 126, 234, 0.1)',
            'rgba(102, 126, 234, 0.2)',
            'rgba(102, 126, 234, 0.3)',
            'rgba(102, 126, 234, 0.4)',
            'rgba(102, 126, 234, 0.5)'
          ].reverse()
        }
      },
      splitArea: {
        show: false
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(102, 126, 234, 0.5)'
        }
      }
    },
    series: [
      {
        name: '系统指标',
        type: 'radar',
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: {
          color: '#667eea'
        },
        areaStyle: {
          color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
            { offset: 0, color: 'rgba(102, 126, 234, 0.3)' },
            { offset: 1, color: 'rgba(102, 126, 234, 0.1)' }
          ])
        },
        data: [
          {
            value: [0, 0, 0, 0],
            name: '当前状态'
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
            value: systemMetrics.value,
            name: '当前状态'
          }
        ]
      }
    ]
  })
}

watch(() => systemMetrics.value, () => {
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
.system-radar-widget {
  height: 100%;
}

.chart-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
}
</style>
