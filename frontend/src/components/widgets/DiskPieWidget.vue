<template>
  <div class="disk-pie-widget">
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

const diskUsage = computed(() => {
  if (!props.nodeId) return 0
  const latest = metricsStore.latestMetrics[props.nodeId]
  return latest?.disk || 0
})

const initChart = () => {
  if (!chartRef.value) return
  
  chart = echarts.init(chartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}% ({d}%)'
    },
    legend: {
      bottom: '5%',
      left: 'center'
    },
    series: [
      {
        name: '磁盘使用',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { 
            value: 0, 
            name: '已使用',
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#667eea' },
                { offset: 1, color: '#764ba2' }
              ])
            }
          },
          { 
            value: 100, 
            name: '可用',
            itemStyle: {
              color: '#ecf0f1'
            }
          }
        ]
      }
    ]
  }
  
  chart.setOption(option)
}

const updateChart = () => {
  if (!chart) return
  
  const used = parseFloat(diskUsage.value as any) || 0
  const free = 100 - used
  
  chart.setOption({
    series: [
      {
        data: [
          { value: used, name: '已使用' },
          { value: free, name: '可用' }
        ]
      }
    ]
  })
}

watch(() => diskUsage.value, () => {
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
.disk-pie-widget {
  height: 100%;
}

.chart-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
}
</style>
