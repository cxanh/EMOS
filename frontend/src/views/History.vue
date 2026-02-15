<template>
  <div class="history">
    <h1>历史数据查询</h1>
    
    <!-- 节点选择 -->
    <div class="query-section">
      <div class="form-group">
        <label>选择节点:</label>
        <select v-model="selectedNodeId" @change="handleNodeChange">
          <option value="">请选择节点</option>
          <option v-for="node in nodesStore.nodes" :key="node.node_id" :value="node.node_id">
            {{ node.hostname }} ({{ node.node_id }})
          </option>
        </select>
      </div>
      
      <!-- 时间范围选择 -->
      <TimeRangePicker @change="handleTimeRangeChange" />
      
      <!-- 查询按钮 -->
      <div class="query-actions">
        <button @click="queryHistory" :disabled="!selectedNodeId || loading" class="query-btn">
          {{ loading ? '查询中...' : '🔍 查询数据' }}
        </button>
        <button @click="exportData" :disabled="!historyData.length" class="export-btn">
          📥 导出数据
        </button>
      </div>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>正在查询历史数据...</p>
    </div>
    
    <!-- 错误提示 -->
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="queryHistory">重试</button>
    </div>
    
    <!-- 数据展示 -->
    <div v-else-if="historyData.length > 0" class="data-section">
      <!-- 统计信息 -->
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-label">数据点数</div>
          <div class="stat-value">{{ historyData.length }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">平均 CPU</div>
          <div class="stat-value">{{ avgCpu.toFixed(2) }}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">平均内存</div>
          <div class="stat-value">{{ avgMemory.toFixed(2) }}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">平均磁盘</div>
          <div class="stat-value">{{ avgDisk.toFixed(2) }}%</div>
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
        <div class="chart-container">
          <div ref="diskChartRef" class="chart"></div>
        </div>
        <div class="chart-container">
          <div ref="networkChartRef" class="chart"></div>
        </div>
      </div>
      
      <!-- 数据表格 -->
      <div class="table-section">
        <h3>数据详情</h3>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>CPU (%)</th>
                <th>内存 (%)</th>
                <th>磁盘 (%)</th>
                <th>网络接收 (MB)</th>
                <th>网络发送 (MB)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in historyData" :key="index">
                <td>{{ formatTime(item.timestamp) }}</td>
                <td>{{ item.cpu_usage?.toFixed(2) || '-' }}</td>
                <td>{{ item.memory_usage?.toFixed(2) || '-' }}</td>
                <td>{{ item.disk_usage?.toFixed(2) || '-' }}</td>
                <td>{{ (item.network_rx_bytes / 1024 / 1024).toFixed(2) || '-' }}</td>
                <td>{{ (item.network_tx_bytes / 1024 / 1024).toFixed(2) || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="empty">
      <div class="empty-icon">📊</div>
      <h3>暂无数据</h3>
      <p>请选择节点和时间范围，然后点击查询按钮</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useNodesStore } from '@/stores/nodes';
import { getHistoryMetrics, type Metrics } from '@/api/metrics';
import TimeRangePicker from '@/components/TimeRangePicker.vue';
import * as echarts from 'echarts';

const nodesStore = useNodesStore();

const selectedNodeId = ref('');
const timeRange = ref({ startTime: '', endTime: '', label: '' });
const historyData = ref<Metrics[]>([]);
const loading = ref(false);
const error = ref('');

const cpuChartRef = ref<HTMLElement | null>(null);
const memoryChartRef = ref<HTMLElement | null>(null);
const diskChartRef = ref<HTMLElement | null>(null);
const networkChartRef = ref<HTMLElement | null>(null);

let cpuChart: echarts.ECharts | null = null;
let memoryChart: echarts.ECharts | null = null;
let diskChart: echarts.ECharts | null = null;
let networkChart: echarts.ECharts | null = null;

// 计算平均值
const avgCpu = computed(() => {
  if (!historyData.value.length) return 0;
  const sum = historyData.value.reduce((acc, item) => acc + (item.cpu_usage || 0), 0);
  return sum / historyData.value.length;
});

const avgMemory = computed(() => {
  if (!historyData.value.length) return 0;
  const sum = historyData.value.reduce((acc, item) => acc + (item.memory_usage || 0), 0);
  return sum / historyData.value.length;
});

const avgDisk = computed(() => {
  if (!historyData.value.length) return 0;
  const sum = historyData.value.reduce((acc, item) => acc + (item.disk_usage || 0), 0);
  return sum / historyData.value.length;
});

const handleNodeChange = () => {
  historyData.value = [];
  error.value = '';
};

const handleTimeRangeChange = (range: { startTime: string; endTime: string; label: string }) => {
  timeRange.value = range;
  historyData.value = [];
  error.value = '';
};

const queryHistory = async () => {
  if (!selectedNodeId.value) {
    error.value = '请选择节点';
    return;
  }
  
  if (!timeRange.value.startTime || !timeRange.value.endTime) {
    error.value = '请选择时间范围';
    return;
  }
  
  loading.value = true;
  error.value = '';
  
  try {
    const response = await getHistoryMetrics({
      nodeId: selectedNodeId.value,
      startTime: timeRange.value.startTime,
      endTime: timeRange.value.endTime,
      interval: '1m'
    });
    
    if (response.success) {
      historyData.value = response.data.metrics;
      await nextTick();
      initCharts();
    } else {
      error.value = '查询失败，请重试';
    }
  } catch (err: any) {
    console.error('Query error:', err);
    error.value = err.response?.data?.error?.message || '查询失败，请检查网络连接';
  } finally {
    loading.value = false;
  }
};

const initCharts = () => {
  const timeLabels = historyData.value.map(item => formatTime(item.timestamp));
  
  // CPU 图表
  if (cpuChartRef.value) {
    cpuChart = echarts.init(cpuChartRef.value);
    cpuChart.setOption({
      title: { text: 'CPU 使用率历史', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLabel: { rotate: 45 }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%' }
      },
      series: [{
        data: historyData.value.map(item => item.cpu_usage || 0),
        type: 'line',
        smooth: true,
        itemStyle: { color: '#5470c6' },
        areaStyle: { opacity: 0.3 }
      }]
    });
  }
  
  // 内存图表
  if (memoryChartRef.value) {
    memoryChart = echarts.init(memoryChartRef.value);
    memoryChart.setOption({
      title: { text: '内存使用率历史', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLabel: { rotate: 45 }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%' }
      },
      series: [{
        data: historyData.value.map(item => item.memory_usage || 0),
        type: 'line',
        smooth: true,
        itemStyle: { color: '#91cc75' },
        areaStyle: { opacity: 0.3 }
      }]
    });
  }
  
  // 磁盘图表
  if (diskChartRef.value) {
    diskChart = echarts.init(diskChartRef.value);
    diskChart.setOption({
      title: { text: '磁盘使用率历史', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLabel: { rotate: 45 }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%' }
      },
      series: [{
        data: historyData.value.map(item => item.disk_usage || 0),
        type: 'line',
        smooth: true,
        itemStyle: { color: '#fac858' },
        areaStyle: { opacity: 0.3 }
      }]
    });
  }
  
  // 网络图表
  if (networkChartRef.value) {
    networkChart = echarts.init(networkChartRef.value);
    networkChart.setOption({
      title: { text: '网络流量历史', left: 'center' },
      tooltip: { trigger: 'axis' },
      legend: { data: ['接收', '发送'], bottom: 10 },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLabel: { rotate: 45 }
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '{value} MB' }
      },
      series: [
        {
          name: '接收',
          data: historyData.value.map(item => (item.network_rx_bytes / 1024 / 1024).toFixed(2)),
          type: 'line',
          smooth: true,
          itemStyle: { color: '#ee6666' }
        },
        {
          name: '发送',
          data: historyData.value.map(item => (item.network_tx_bytes / 1024 / 1024).toFixed(2)),
          type: 'line',
          smooth: true,
          itemStyle: { color: '#73c0de' }
        }
      ]
    });
  }
};

const formatTime = (timestamp: string) => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const exportData = () => {
  if (!historyData.value.length) return;
  
  // 生成 CSV
  const headers = ['时间', 'CPU(%)', '内存(%)', '磁盘(%)', '网络接收(MB)', '网络发送(MB)'];
  const rows = historyData.value.map(item => [
    new Date(item.timestamp).toLocaleString(),
    item.cpu_usage?.toFixed(2) || '-',
    item.memory_usage?.toFixed(2) || '-',
    item.disk_usage?.toFixed(2) || '-',
    (item.network_rx_bytes / 1024 / 1024).toFixed(2) || '-',
    (item.network_tx_bytes / 1024 / 1024).toFixed(2) || '-'
  ]);
  
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `history_${selectedNodeId.value}_${Date.now()}.csv`;
  link.click();
};

onMounted(() => {
  nodesStore.fetchNodes();
  
  window.addEventListener('resize', () => {
    cpuChart?.resize();
    memoryChart?.resize();
    diskChart?.resize();
    networkChart?.resize();
  });
});

onUnmounted(() => {
  cpuChart?.dispose();
  memoryChart?.dispose();
  diskChart?.dispose();
  networkChart?.dispose();
});
</script>

<style scoped>
.history {
  max-width: 1400px;
  margin: 0 auto;
}

h1 {
  color: #333;
  margin-bottom: 30px;
  text-align: center;
}

h3 {
  color: #333;
  margin: 20px 0;
  font-size: 18px;
}

.query-section {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.query-actions {
  display: flex;
  gap: 15px;
  margin-top: 20px;
}

.query-btn,
.export-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.query-btn {
  background: #667eea;
  color: white;
  flex: 1;
}

.query-btn:hover:not(:disabled) {
  background: #5568d3;
}

.query-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.export-btn {
  background: #52c41a;
  color: white;
}

.export-btn:hover:not(:disabled) {
  background: #45a616;
}

.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  text-align: center;
  padding: 40px 20px;
  background: #fff3cd;
  border-radius: 15px;
  color: #856404;
}

.error button {
  margin-top: 15px;
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.empty {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 20px;
}

.empty h3 {
  color: #333;
  margin-bottom: 10px;
}

.empty p {
  color: #999;
}

.data-section {
  margin-top: 30px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #667eea;
}

.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
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

.table-section {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

td {
  color: #666;
  font-size: 14px;
}

tr:hover {
  background: #f8f9fa;
}

@media (max-width: 768px) {
  .query-actions {
    flex-direction: column;
  }
  
  .stats-cards {
    grid-template-columns: 1fr;
  }
  
  .charts-section {
    grid-template-columns: 1fr;
  }
}
</style>
