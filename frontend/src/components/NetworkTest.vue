<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import * as echarts from 'echarts';

// 测试状态
const testing = ref(false);
const testPhase = ref(''); // 测试阶段：ping, download, upload
const progress = ref(0); // 测试进度
const testResults = reactive({
  downloadSpeed: 0,
  uploadSpeed: 0,
  ping: 0,
  timestamp: ''
});

// 先定义类型接口
interface SpeedTestRecord {
  downloadSpeed: number;
  uploadSpeed: number;
  ping: number;
  timestamp: string;
}
const history = ref<SpeedTestRecord[]>([]);
// 历史记录

// 测试配置
const autoTest = ref(false);
const testInterval = ref(60); // 分钟

// 图表实例
let speedChart: echarts.ECharts | null = null;
const chartRef = ref<HTMLElement | null>(null);

// 执行网速测试
const runNetworkTest = async () => {
  testing.value = true;
  progress.value = 0;
  
  try {
    // 1. 测试延迟（ping）
    testPhase.value = 'ping';
    progress.value = 20;
    await new Promise(resolve => setTimeout(resolve, 800));
    testResults.ping = Math.floor(Math.random() * 100) + 10; // 10-110ms
    
    // 2. 测试下载速度
    testPhase.value = 'download';
    progress.value = 50;
    // 模拟下载进度
    for (let i = 0; i < 10; i++) {
      progress.value = 50 + i * 3;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    testResults.downloadSpeed = parseFloat((Math.random() * 50 + 10).toFixed(2)); // 10-60 Mbps
    
    // 3. 测试上传速度
    testPhase.value = 'upload';
    progress.value = 80;
    // 模拟上传进度
    for (let i = 0; i < 7; i++) {
      progress.value = 80 + i * 2.8;
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    testResults.uploadSpeed = parseFloat((Math.random() * 20 + 5).toFixed(2)  ); // 5-25 Mbps
    
    progress.value = 100;
    testPhase.value = 'completed';
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testResults.timestamp = new Date().toLocaleString();
    
    // 添加到历史记录
    history.value.unshift({
      downloadSpeed: testResults.downloadSpeed,
      uploadSpeed: testResults.uploadSpeed,
      ping: testResults.ping,
      timestamp: testResults.timestamp
    });
    
    // 限制历史记录数量
    if (history.value.length > 10) {
      history.value = history.value.slice(0, 10);
    }
    
    // 保存历史记录到本地存储
    localStorage.setItem('networkTestHistory', JSON.stringify(history.value));
    
    // 更新图表
    updateChart();
    
  } catch (error) {
    console.error('Network test error:', error);
  } finally {
    testing.value = false;
    testPhase.value = '';
    progress.value = 0;
  }
};

// 初始化图表
const initChart = () => {
  if (chartRef.value) {
    speedChart = echarts.init(chartRef.value);
    updateChart();
  }
};

// 更新图表
const updateChart = () => {
  if (speedChart) {
    const option = {
      title: {
        text: '网络速度测试历史',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['下载速度', '上传速度'],
        bottom: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: history.value.slice(0, 5).reverse().map(item => item.timestamp.substring(11, 19)),
        axisLabel: {
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        name: '速度 (Mbps)'
      },
      series: [
        {
          name: '下载速度',
          type: 'bar',
          data: history.value.slice(0, 5).reverse().map(item => item.downloadSpeed),
          itemStyle: {
            color: '#5470c6'
          }
        },
        {
          name: '上传速度',
          type: 'bar',
          data: history.value.slice(0, 5).reverse().map(item => item.uploadSpeed),
          itemStyle: {
            color: '#91cc75'
          }
        }
      ]
    };
    speedChart.setOption(option);
  }
};

// 加载历史记录
const loadHistory = () => {
  const saved = localStorage.getItem('networkTestHistory');
  if (saved) {
    history.value = JSON.parse(saved);
    updateChart();
  }
};

// 初始化
onMounted(() => {
  loadHistory();
  initChart();
  
  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    speedChart?.resize();
  });
});
</script>

<template>
  <div class="network-test">
    <h2>网速测试</h2>
    
    <!-- 测试控制 -->
    <div class="test-controls">
      <button 
        class="test-button" 
        @click="runNetworkTest"
        :disabled="testing"
      >
        {{ testing ? '测试中...' : '开始测试' }}
      </button>
      
      <div class="auto-test-config">
        <input 
          type="checkbox" 
          id="autoTest" 
          v-model="autoTest"
        />
        <label for="autoTest">自动测试</label>
        <input 
          type="number" 
          v-model.number="testInterval" 
          min="1" 
          max="1440"
          placeholder="间隔（分钟）"
          style="width: 80px; margin-left: 10px;"
        />
      </div>
    </div>
    
    <!-- 测试动画 -->
    <div v-if="testing" class="test-animation">
      <div class="animation-container">
        <div class="test-phase-indicator">
          <div class="phase-icon" :class="testPhase">
            {{ testPhase === 'ping' ? '🌐' : testPhase === 'download' ? '⬇️' : '⬆️' }}
          </div>
          <div class="phase-text">
            {{ testPhase === 'ping' ? '测试网络延迟...' : 
               testPhase === 'download' ? '测试下载速度...' : 
               testPhase === 'upload' ? '测试上传速度...' : '测试完成！' }}
          </div>
        </div>
        
        <div class="progress-bar-container">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <div class="progress-text">{{ Math.round(progress) }}%</div>
        </div>
        
        <!-- 动画效果 -->
        <div class="speed-animation">
          <div class="speed-bars">
            <div class="speed-bar" style="animation-delay: 0ms;"></div>
            <div class="speed-bar" style="animation-delay: 100ms;"></div>
            <div class="speed-bar" style="animation-delay: 200ms;"></div>
            <div class="speed-bar" style="animation-delay: 300ms;"></div>
            <div class="speed-bar" style="animation-delay: 400ms;"></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 测试结果 -->
    <div class="test-results" v-if="testResults.timestamp">
      <h3>测试结果</h3>
      <div class="results-grid">
        <div class="result-card">
          <div class="result-icon">⬇️</div>
          <div class="result-label">下载速度</div>
          <div class="result-value">{{ testResults.downloadSpeed }} Mbps</div>
        </div>
        <div class="result-card">
          <div class="result-icon">⬆️</div>
          <div class="result-label">上传速度</div>
          <div class="result-value">{{ testResults.uploadSpeed }} Mbps</div>
        </div>
        <div class="result-card">
          <div class="result-icon">⏱️</div>
          <div class="result-label">网络延迟</div>
          <div class="result-value">{{ testResults.ping }} ms</div>
        </div>
        <div class="result-card">
          <div class="result-icon">📅</div>
          <div class="result-label">测试时间</div>
          <div class="result-value">{{ testResults.timestamp }}</div>
        </div>
      </div>
    </div>
    
    <!-- 历史记录 -->
    <div class="history-section" v-if="history.length > 0">
      <h3>历史记录</h3>
      <div class="history-chart" v-if="false">
        <div ref="chartRef" style="width: 100%; height: 300px;"></div>
      </div>
      <div class="history-list">
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>下载速度</th>
              <th>上传速度</th>
              <th>延迟</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in history" :key="index">
              <td>{{ item.timestamp }}</td>
              <td>{{ item.downloadSpeed }} Mbps</td>
              <td>{{ item.uploadSpeed }} Mbps</td>
              <td>{{ item.ping }} ms</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else-if="!testing && !testResults.timestamp" class="empty-state">
      <div class="empty-icon">🌐</div>
      <h3>还未进行网速测试</h3>
      <p>点击「开始测试」按钮测试您的网络速度</p>
    </div>
  </div>
</template>

<style scoped>
.network-test {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

h2 {
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

h3 {
  color: #555;
  margin: 20px 0 15px;
}

.test-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.test-button {
  padding: 12px 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
}

.test-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.test-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.auto-test-config {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 测试动画 */
.test-animation {
  margin: 30px 0;
}

.animation-container {
  background: white;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.test-phase-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 25px;
}

.phase-icon {
  font-size: 40px;
  animation: pulse 1.5s infinite;
}

.phase-icon.ping {
  animation-delay: 0s;
}

.phase-icon.download {
  animation-delay: 0.5s;
}

.phase-icon.upload {
  animation-delay: 1s;
}

.phase-text {
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.progress-bar {
  flex: 1;
  height: 12px;
  background: #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 6px;
  transition: width 0.3s ease;
  animation: progress-glow 2s infinite;
}

.progress-text {
  font-size: 16px;
  font-weight: 600;
  color: #667eea;
  min-width: 50px;
}

.speed-animation {
  margin-top: 20px;
}

.speed-bars {
  display: flex;
  justify-content: center;
  align-items: end;
  gap: 8px;
  height: 80px;
}

.speed-bar {
  width: 12px;
  background: linear-gradient(180deg, #667eea, #764ba2);
  border-radius: 6px 6px 0 0;
  animation: speed-wave 1.5s infinite ease-in-out;
}

.speed-bar:nth-child(1) { height: 40px; }
.speed-bar:nth-child(2) { height: 60px; }
.speed-bar:nth-child(3) { height: 80px; }
.speed-bar:nth-child(4) { height: 50px; }
.speed-bar:nth-child(5) { height: 70px; }

.test-results {
  margin-bottom: 30px;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.result-card {
  background: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.result-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
}

.result-icon {
  font-size: 32px;
  margin-bottom: 15px;
}

.result-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.result-value {
  font-size: 28px;
  font-weight: 600;
  color: #667eea;
}

.history-section {
  margin-top: 40px;
}

.history-chart {
  background: white;
  padding: 20px;
  border-radius: 15px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
  margin-bottom: 25px;
}

.history-list {
  background: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 15px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
  text-transform: uppercase;
  font-size: 14px;
  letter-spacing: 0.5px;
}

tr:hover {
  background-color: #f8f9fa;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
  margin-top: 30px;
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 20px;
  animation: float 3s ease-in-out infinite;
}

.empty-state h3 {
  color: #333;
  margin-bottom: 10px;
}

.empty-state p {
  color: #666;
  font-size: 16px;
}

/* 动画 */
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

@keyframes progress-glow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(102, 126, 234, 0.5);
  }
  50% {
    box-shadow: 0 0 15px rgba(102, 126, 234, 0.8);
  }
}

@keyframes speed-wave {
  0%, 100% {
    transform: scaleY(0.5);
  }
  50% {
    transform: scaleY(1);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@media (max-width: 768px) {
  .test-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .results-grid {
    grid-template-columns: 1fr;
  }
  
  .network-test {
    padding: 10px;
  }
  
  .animation-container {
    padding: 20px;
  }
  
  .test-phase-indicator {
    flex-direction: column;
    gap: 10px;
  }
  
  .progress-bar-container {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .progress-text {
    text-align: center;
  }
}
</style>
