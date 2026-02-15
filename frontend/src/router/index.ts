import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores/user';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/node/:id',
    name: 'NodeDetail',
    component: () => import('@/views/NodeDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/views/History.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/network',
    name: 'Network',
    component: () => import('@/views/Network.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/alert',
    name: 'Alert',
    component: () => import('@/views/Alert.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/ai-analysis',
    name: 'AIAnalysis',
    component: () => import('@/views/AIAnalysis.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/About.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();
  const requiresAuth = to.meta.requiresAuth;

  if (requiresAuth) {
    // 需要认证的路由
    if (userStore.isLoggedIn) {
      next();
    } else {
      // 尝试验证 token
      const isValid = await userStore.verify();
      if (isValid) {
        next();
      } else {
        next('/login');
      }
    }
  } else {
    // 不需要认证的路由
    if (to.path === '/login' && userStore.isLoggedIn) {
      // 已登录用户访问登录页，重定向到首页
      next('/');
    } else {
      next();
    }
  }
});

export default router;
