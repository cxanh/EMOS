<template>
  <div class="home-page">
    <h1>欢迎使用 EOMS 分布式感知运维系统</h1>
    
    <!-- 系统状态 -->
    <div class="system-status">
      <div class="status-card">
        <div class="status-icon">🖥️</div>
        <div class="status-info">
          <div class="status-label">在线节点</div>
          <div class="status-value">{{ nodesStore.nodes.length }}</div>
        </div>
      </div>
      
      <div class="status-card">
        <div class="status-icon">📡</div>
        <div class="status-info">
          <div class="status-label">WebSocket</div>
          <div class="status-value" :class="{ connected: metricsStore.wsConnected }">
            {{ metricsStore.wsConnected ? '已连接' : '未连接' }}
          </div>
        </div>
      </div>
      
      <div class="status-card">
        <div class="status-icon">👤</div>
        <div class="status-info">
          <div class="status-label">当前用户</div>
          <div class="status-value">{{ userStore.user?.username || 'Guest' }}</div>
        </div>
      </div>
    </div>
    
    <!-- 快捷入口 -->
    <div class="quick-actions">
      <div class="action-card" @click="router.push('/dashboard')">
        <div class="action-icon">📊</div>
        <h3>系统监控</h3>
        <p>实时监控系统资源使用情况</p>
      </div>
      
      <div class="action-card" @click="router.push('/history')">
        <div class="action-icon">📈</div>
        <h3>历史数据</h3>
        <p>查询和分析历史监控数据</p>
      </div>
      
      <div class="action-card" @click="router.push('/network')">
        <div class="action-icon">🌐</div>
        <h3>网速测试</h3>
        <p>测试网络连接速度和质量</p>
      </div>
      
      <div class="action-card" @click="router.push('/settings')">
        <div class="action-icon">⚙️</div>
        <h3>系统设置</h3>
        <p>配置系统参数和选项</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useNodesStore } from '@/stores/nodes';
import { useMetricsStore } from '@/stores/metrics';

const router = useRouter();
const userStore = useUserStore();
const nodesStore = useNodesStore();
const metricsStore = useMetricsStore();

onMounted(() => {
  // 加载节点列表
  nodesStore.fetchNodes();
});
</script>

<style scoped>
.home-page {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 40px;
  font-size: 28px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.system-status {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.status-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 20px;
  transition: transform 0.3s;
}

.status-card:hover {
  transform: translateY(-5px);
}

.status-icon {
  font-size: 40px;
}

.status-info {
  flex: 1;
}

.status-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.status-value {
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.status-value.connected {
  color: #52c41a;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 25px;
}

.action-card {
  background: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.action-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 30px rgba(102, 126, 234, 0.2);
}

.action-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.action-card h3 {
  color: #333;
  margin-bottom: 10px;
  font-size: 18px;
}

.action-card p {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .home-page {
    padding: 20px;
  }
  
  .system-status,
  .quick-actions {
    grid-template-columns: 1fr;
  }
}
</style>
