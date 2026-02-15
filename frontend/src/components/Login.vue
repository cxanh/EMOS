<script setup lang="ts">
import { ref, reactive } from 'vue';

// 登录表单数据
const form = reactive({
  username: '',
  password: '',
  rememberMe: false
});

// 登录状态
const loading = ref(false);
const error = ref('');

// 登录验证函数
const handleLogin = () => {
  // 表单验证
  if (!form.username || !form.password) {
    error.value = '请输入用户名和密码';
    return;
  }

  loading.value = true;
  error.value = '';

  // 模拟登录验证过程
  setTimeout(() => {
    // 简单的模拟验证：用户名和密码都为 'admin'
    if (form.username === 'admin' && form.password === 'admin') {
      // 保存登录状态
      if (form.rememberMe) {
        localStorage.setItem('user', JSON.stringify({ username: form.username }));
        localStorage.setItem('rememberMe', 'true');
      } else {
        sessionStorage.setItem('user', JSON.stringify({ username: form.username }));
      }

      // 触发登录成功事件
      window.dispatchEvent(new CustomEvent('login-success', { detail: { username: form.username } }));
    } else {
      error.value = '用户名或密码错误';
    }
    loading.value = false;
  }, 1000);
};
</script>

<template>
  <div class="login-container">
    <div class="login-form">
      <h2>系统登录</h2>
      
      <div class="form-group">
        <label for="username">用户名</label>
        <input
          type="text"
          id="username"
          v-model="form.username"
          placeholder="请输入用户名"
          :disabled="loading"
        />
      </div>

      <div class="form-group">
        <label for="password">密码</label>
        <input
          type="password"
          id="password"
          v-model="form.password"
          placeholder="请输入密码"
          :disabled="loading"
        />
      </div>

      <div class="form-group remember-me">
        <input
          type="checkbox"
          id="rememberMe"
          v-model="form.rememberMe"
          :disabled="loading"
        />
        <label for="rememberMe">记住我</label>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <button
        class="login-button"
        @click="handleLogin"
        :disabled="loading"
      >
        {{ loading ? '登录中...' : '登录' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-form {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  animation: slideIn 0.5s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-form h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
}

.remember-me input {
  width: auto;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 20px;
  text-align: center;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-button {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

@media (max-width: 768px) {
  .login-form {
    padding: 30px;
    margin: 0 20px;
  }
}
</style>
