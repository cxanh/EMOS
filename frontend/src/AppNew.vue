<template>
  <div class="app">
    <!-- 登录页面 -->
    <router-view v-if="!userStore.isLoggedIn" />
    
    <!-- 主应用界面 -->
    <div v-else class="main-app">
      <!-- 侧边栏 -->
      <Sidebar />
      
      <!-- 主内容区域 -->
      <main class="main-content" :style="mainContentStyle">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useNodesStore } from '@/stores/nodes';
import Sidebar from '@/components/Sidebar.vue';
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

<style scoped>
.app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
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

@media (max-width: 768px) {
  .main-content {
    margin-left: 0 !important;
    padding: 10px;
  }
}
</style>
