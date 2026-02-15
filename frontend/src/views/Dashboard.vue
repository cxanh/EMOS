<template>
  <div class="dashboard">
    <h1>系统监控面板</h1>
    
    <!-- 节点列表 -->
    <NodeList />
    
    <!-- 实时数据展示 -->
    <div v-if="currentMetrics" class="metrics-section">
      <h2>实时监控数据</h2>
      
      <div class="metrics-display">
        <div class="metric-card">
          <div class="metric-icon">💻</div>
          <div class="metric-info">
            <div class="metric-label">CPU 使用率</div>
            <div class="metric-value">{{ currentMetrics.cpu_usage?.toFixed(2) }}%</div>
            <div class="metric-bar">
              <div class="metric-bar-fill" :style="{ width: currentMetrics.cpu_usage + '%' }"></div>
            </div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon">🧠</div>
          <div class="metric-info">
            <div class="metric-label">内存使用率</div>
            <div class="metric-value">{{ currentMetrics.memory_usage?.toFixed(2) }}%</div>
            <div class="metric-bar">
              <div class="metric-bar-fill" :style="{ width: currentMetrics.memory_usage + '%' }"></div>
            </div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon">💾</div>
          <div class="metric-info">
            <div class="metric-label">磁盘使用率</div>
            <div class="metric-value">{{ currentMetrics.disk_usage?.toFixed(2) }}%</div>
            <div class="metric-bar">
              <div class="metric-bar-fill" :style="{ width: currentMetrics.disk_usage + '%' }"></div>
            </div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon">🌐</div>
          <div class="metric-info">
            <div class="metric-label">网络流量</div>
            <div class="metric-value small">
              ↓ {{ formatBytes(currentMetrics.network_rx_bytes) }}<br>
              ↑ {{ formatBytes(currentMetrics.network_tx_bytes) }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 图表展示 -->
      <div class="charts-section">
        <div class="chart-container">
          <div ref="cpuChartRef" class="chart"></div>
        </div>
        <div class="chart-container">
          <div ref="memoryChartRef" class="chart"></div>
        </div>
      </div>
    </div>
    
    <div v-else class="no-data">
      <p>{{ selectedNodeId ? '暂无数据，等待 Agent 上报...' : '请选择一个节点' }}</p>
    </div>
    
    <!-- WebSocket 状态 -->
    <div class="ws-status" :class="{ connected: metricsStore.wsConnected }">
      {{ metricsStore.wsConnected ? '✅ 实时连接' : '❌ 未连接' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useNodesStore } from '@/stores/nodes';
import { useMetricsStore } from '@/stores/metrics';
import NodeList from '@/components/NodeList.vue';
import * as echarts from 'echarts';

const nodesStore = useNodesStore();
const metricsStore = useMetricsStore();

const selectedNodeId = computed(() => nodesStore.currentNodeId);
const cpuChartRef = ref<HTMLElement | null>(null);
const memoryChartRef = ref<HTMLElement | null>(null);

let cpuChart: echarts.ECharts | null = null;
let memoryChart: echarts.ECharts | null = null;
const cpuHistory = ref<number[]>([]);
const memoryHistory = ref<number[]>([]);
const timeLabels = ref<string[]>([]);
const maxDataPoints = 20;

// 当前节点的实时数据
const currentMetrics = computed(() => {
  if (!selectedNodeId.value) return null;
  return metricsStore.getMetrics(selectedNodeId.value);
});

// 格式化字节数
const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
};

// 初始化图表
const initCharts = async () => {
  await nextTick();
  
  if (cpuChartRef.value && !cpuChart) {
    cpuChart = echarts.init(cpuChartRef.value);
    cpuChart.setOption({
      title: { text: 'CPU 使用率趋势', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: timeLabels.value,
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%' }
      },
      series: [{
        data: cpuHistory.value,
        type: 'line',
        smooth: true,
        itemStyle: { color: '#5470c6' },
        areaStyle: { opacity: 0.3 }
      }]
    });
  }
  
  if (memoryChartRef.value && !memoryChart) {
    memoryChart = echarts.init(memoryChartRef.value);
    memoryChart.setOption({
      title: { text: '内存使用率趋势', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: timeLabels.value,
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%' }
      },
      series: [{
        data: memoryHistory.value,
        type: 'line',
        smooth: true,
        itemStyle: { color: '#91cc75' },
        areaStyle: { opacity: 0.3 }
      }]
    });
  }
};

// 更新图表数据
const updateCharts = () => {
  if (!currentMetrics.value) return;
  
  const now = new Date();
  const timeLabel = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  // 添加新数据
  cpuHistory.value.push(currentMetrics.value.cpu_usage || 0);
  memoryHistory.value.push(currentMetrics.value.memory_usage || 0);
  timeLabels.value.push(timeLabel);
  
  // 限制数据点数量
  if (cpuHistory.value.length > maxDataPoints) {
    cpuHistory.value.shift();
    memoryHistory.value.shift();
    timeLabels.value.shift();
  }
  
  // 更新图表
  if (cpuChart) {
    cpuChart.setOption({
      xAxis: { data: timeLabels.value },
      series: [{ data: cpuHistory.value }]
    });
  }
  
  if (memoryChart) {
    memoryChart.setOption({
      xAxis: { data: timeLabels.value },
      series: [{ data: memoryHistory.value }]
    });
  }
};

// 监听数据变化
watch(currentMetrics, (newMetrics) => {
  if (newMetrics) {
    updateCharts();
  }
}, { deep: true });

// 监听节点切换
watch(selectedNodeId, () => {
  // 清空历史数据
  cpuHistory.value = [];
  memoryHistory.value = [];
  timeLabels.value = [];
});

onMounted(() => {
  nodesStore.fetchNodes();
  initCharts();
  
  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    cpuChart?.resize();
    memoryChart?.resize();
  });
});

onUnmounted(() => {
  cpuChart?.dispose();
  memoryChart?.dispose();
});
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

h1 {
  color: #333;
  margin-bottom: 30px;
  text-align: center;
}

h2 {
  color: #333;
  margin: 30px 0 20px;
  font-size: 20px;
}

.metrics-section {
  margin-top: 30px;
}

.metrics-display {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: flex-start;
  gap: 20px;
  transition: transform 0.3s;
}

.metric-card:hover {
  transform: translateY(-5px);
}

.metric-icon {
  font-size: 40px;
  flex-shrink: 0;
}

.metric-info {
  flex: 1;
}

.metric-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 28px;
  font-weight: 600;
  color: #667eea;
  margin-bottom: 10px;
}

.metric-value.small {
  font-size: 16px;
  line-height: 1.5;
}

.metric-bar {
  width: 100%;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.metric-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.chart-container {
  background: white;
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
}

.chart {
  width: 100%;
  height: 300px;
}

.no-data {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
  color: #999;
  margin-top: 30px;
}

.ws-status {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 10px 20px;
  background: #ff4d4f;
  color: white;
  border-radius: 20px;
  font-size: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.ws-status.connected {
  background: #52c41a;
}

@media (max-width: 768px) {
  .metrics-display {
    grid-template-columns: 1fr;
  }
  
  .charts-section {
    grid-template-columns: 1fr;
  }
}
</style>
