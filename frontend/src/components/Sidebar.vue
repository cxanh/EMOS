<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import websocket from '@/utils/websocket';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

// 侧边栏状态
const collapsed = ref(false);
const activeItem = ref('home');

// 定义退出登录方法
const handleLogout = async () => {
  await userStore.logout();
  websocket.disconnect();
  router.push('/login');
};

// 导航菜单项
const navItems = [
  {
    id: 'home',
    label: '首页',
    icon: '🏠',
    path: '/'
  },
  {
    id: 'dashboard',
    label: '系统监控',
    icon: '📊',
    path: '/dashboard'
  },
  {
    id: 'alert',
    label: '告警管理',
    icon: '🔔',
    path: '/alert'
  },
  {
    id: 'ai-analysis',
    label: 'AI智能分析',
    icon: '🤖',
    path: '/ai-analysis'
  },
  {
    id: 'network',
    label: '网速测试',
    icon: '🌐',
    path: '/network'
  },
  {
    id: 'settings',
    label: '设置',
    icon: '⚙️',
    path: '/settings'
  },
  {
    id: 'about',
    label: '关于',
    icon: 'ℹ️',
    path: '/about'
  }
];

// 切换侧边栏状态
const toggleSidebar = () => {
  collapsed.value = !collapsed.value;
  // 保存状态到本地存储
  localStorage.setItem('sidebarCollapsed', collapsed.value.toString());
};

// 切换导航项
const selectNavItem = (item: any) => {
  activeItem.value = item.id;
  router.push(item.path);
};

// 监听路由变化更新激活项
watch(() => route.path, (newPath) => {
  const item = navItems.find(item => item.path === newPath);
  if (item) {
    activeItem.value = item.id;
  }
}, { immediate: true });

// 生命周期钩子
onMounted(() => {
  // 从本地存储加载侧边栏状态
  const savedState = localStorage.getItem('sidebarCollapsed');
  if (savedState !== null) {
    collapsed.value = savedState === 'true';
  }
});

// 监听侧边栏状态变化
watch(collapsed, (newValue) => {
  // 触发侧边栏状态变化事件
  window.dispatchEvent(new CustomEvent('sidebar-changed', { detail: { collapsed: newValue } }));
});
</script>

<template>
  <div class="sidebar" :class="{ collapsed }">
    <!-- 侧边栏头部 -->
    <div class="sidebar-header">
      <div class="logo" v-if="!collapsed">
        <h3>EOMS检测系统</h3>
      </div>
      <button class="toggle-btn" @click="toggleSidebar" aria-label="Toggle sidebar">
        {{ collapsed ? '▶' : '◀' }}
      </button>
    </div>

    <!-- 导航菜单 -->
    <nav class="sidebar-nav">
      <ul>
        <li
          v-for="item in navItems"
          :key="item.id"
          class="nav-item"
          :class="{ active: activeItem === item.id }"
          @click="selectNavItem(item)"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
        </li>
      </ul>
    </nav>

    <!-- 侧边栏底部 -->
    <div class="sidebar-footer" v-if="!collapsed">
      <button class="logout-btn" @click="handleLogout">
        <span class="nav-icon">🚪</span>
        <span class="nav-label">退出登录</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 240px;
  height: 100vh;
  background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%);
  color: white;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #667eea;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.toggle-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.sidebar-nav {
  flex: 1;
  padding: 20px 0;
}

.sidebar-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.2s;
  border-radius: 0 20px 20px 0;
  margin: 5px 0;
}

.nav-item:hover {
  background-color: rgba(102, 126, 234, 0.2);
  transform: translateX(5px);
}

.nav-item.active {
  background-color: rgba(102, 126, 234, 0.3);
  border-left: 3px solid #667eea;
}

.nav-icon {
  font-size: 20px;
  margin-right: 12px;
  min-width: 20px;
}

.nav-label {
  font-size: 14px;
  font-weight: 400;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  background: transparent;
  border: none;
  color: white;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.logout-btn:hover {
  background-color: rgba(255, 87, 87, 0.2);
}

.logout-btn .nav-icon {
  margin-right: 12px;
}

@media (max-width: 768px) {
  .sidebar {
    width: 200px;
  }

  .sidebar.collapsed {
    width: 50px;
  }

  .nav-icon {
    font-size: 18px;
  }

  .nav-label {
    font-size: 13px;
  }
}
</style>
