<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useNodesStore } from '@/stores/nodes';
import Sidebar from './components/Sidebar.vue';
import websocket from '@/utils/websocket';

const userStore = useUserStore();
const nodesStore = useNodesStore();
const sidebarCollapsed = ref(false);



// 计算主内容区域的边距
const mainContentStyle = computed(() => {
  return {
    marginLeft: sidebarCollapsed.value ? '60px' : '240px',
    transition: 'margin-left 0.3s ease'
  };
});

// 侧边栏状态变化处理
const handleSidebarChanged = (event: CustomEvent) => {
  sidebarCollapsed.value = event.detail.collapsed;
};

onMounted(async () => {
  // 验证登录状态
  if (userStore.token) {
    const isValid = await userStore.verify();
    if (isValid) {
      // 连接 WebSocket
      websocket.connect(userStore.token);
      // 加载节点列表
      nodesStore.fetchNodes();
    }
  }
  
  // 监听侧边栏事件
  window.addEventListener('sidebar-changed', handleSidebarChanged as EventListener);
});

onUnmounted(() => {
  // 清理事件监听
  window.removeEventListener('sidebar-changed', handleSidebarChanged as EventListener);
  
  // 断开 WebSocket
  websocket.disconnect();
});
</script>

<template>
  <div class="app">
    <!-- 主应用界面 -->
    <div v-if="userStore.isLoggedIn" class="main-app">
      <!-- 侧边栏 -->
      <Sidebar />
      
      <!-- 主内容区域 -->
      <main class="main-content" :style="mainContentStyle">
        <router-view />
      </main>
    </div>
    
    <!-- 登录页面或其他不需要侧边栏的页面 -->
    <router-view v-else />
  </div>
</template>

<style scoped>
.app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: Arial, sans-serif;
}

.main-app {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: transparent;
}

.dashboard h1,
.settings h1,
.about h1 {
  color: #333;
  margin-bottom: 10px;
  text-align: center;
}

.test-data-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #fff3cd;
  color: #856404;
  padding: 10px 20px;
  border-radius: 6px;
  margin-bottom: 30px;
  font-size: 14px;
  border: 1px solid #ffeaa7;
}

.note-icon {
  font-size: 16px;
}

.system-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.overview-card {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
}

.overview-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
}

.overview-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.overview-value {
  font-size: 24px;
  font-weight: 600;
  color: #667eea;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.chart-container {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s, box-shadow 0.3s;
}

.chart-container:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.chart {
  width: 100%;
  height: 300px;
}

.metrics-info {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.metrics-info p {
  margin: 0;
  color: #333;
  font-size: 14px;
}

.settings-content,
.about-content {
  background: white;
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  text-align: center;
}

/* 首页样式 */
.home-page {
  padding: 40px 20px;
  text-align: center;
}

.home-page h1 {
  color: #333;
  margin-bottom: 40px;
  font-size: 28px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.home-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
  margin-bottom: 50px;
}

.home-card {
  background: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s, box-shadow 0.3s;
  text-align: left;
}

.home-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 30px rgba(102, 126, 234, 0.2);
}

.home-card-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.home-card h3 {
  color: #333;
  margin-bottom: 15px;
  font-size: 20px;
}

.home-card p {
  color: #666;
  margin-bottom: 25px;
  line-height: 1.6;
}

.home-card-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.home-card-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.analysis-suggestions {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 30px;
}

.suggestions-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.suggestions-icon {
  font-size: 24px;
}

.suggestions-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.suggestions-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 15px;
  border-radius: 10px;
  transition: transform 0.2s;
}

.suggestion-item:hover {
  transform: translateX(5px);
}

.suggestion-item.warning {
  background-color: #fff3cd;
  border-left: 4px solid #ffc107;
}

.suggestion-item.info {
  background-color: #d1ecf1;
  border-left: 4px solid #17a2b8;
}

.suggestion-item .suggestion-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.suggestion-text {
  flex: 1;
}

.suggestion-text strong {
  display: block;
  margin-bottom: 5px;
  color: #333;
}

.suggestion-text p {
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.home-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  background: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 40px;
}

.stats-card {
  text-align: center;
}

.stats-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.stats-value {
  font-size: 24px;
  font-weight: 600;
  color: #667eea;
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0 !important;
    padding: 10px;
  }
  
  .system-overview {
    grid-template-columns: 1fr;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .metrics-info {
    grid-template-columns: 1fr;
  }
  
  .home-page {
    padding: 20px 10px;
  }
  
  .home-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .home-stats {
    grid-template-columns: 1fr;
    padding: 20px;
  }
}

</style>

