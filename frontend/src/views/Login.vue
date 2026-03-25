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
          @keyup.enter="handleLogin"
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
          @keyup.enter="handleLogin"
          @input="checkPasswordStrength"
        />
        
        <!-- 密码强度提示 -->
        <div v-if="form.password && passwordStrength" class="password-strength">
          <div class="strength-bar">
            <div 
              class="strength-fill" 
              :class="passwordStrength.level"
              :style="{ width: passwordStrength.score + '%' }"
            ></div>
          </div>
          <div class="strength-text" :class="passwordStrength.level">
            {{ passwordStrength.text }}
          </div>
        </div>
        
        <!-- 弱口令警告 -->
        <div v-if="form.password && isWeakPassword" class="weak-password-warning">
          <span class="warning-icon">⚠️</span>
          <span>检测到弱口令！建议使用更强的密码</span>
        </div>
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
      
      <div class="login-hint">
        <p>默认账号: admin / admin</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import websocket from '@/utils/websocket';

const router = useRouter();
const userStore = useUserStore();

const form = reactive({
  username: '',
  password: ''
});

const loading = ref(false);
const error = ref('');

// 密码强度状态
const passwordStrength = ref<{
  score: number;
  level: 'weak' | 'medium' | 'strong';
  text: string;
} | null>(null);

// 常见弱口令列表
const weakPasswords = [
  '123456', '123456789', '12345678', '1234567890', '111111', '123123',
  'password', 'password123', 'admin', 'admin123', 'root', 'root123',
  '000000', '666666', '888888', '123321', '654321', 'qwerty',
  'abc123', 'test', 'test123', 'user', 'user123', '1qaz2wsx',
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1q2w3e4r', 'a123456'
];

// 检查是否为弱口令
const isWeakPassword = computed(() => {
  if (!form.password) return false;
  
  const pwd = form.password.toLowerCase();
  
  // 检查是否在弱口令列表中
  if (weakPasswords.includes(pwd)) {
    return true;
  }
  
  // 检查是否为纯数字且长度小于8
  if (/^\d+$/.test(pwd) && pwd.length < 8) {
    return true;
  }
  
  // 检查是否为连续数字
  if (/^(0123|1234|2345|3456|4567|5678|6789|7890)+$/.test(pwd)) {
    return true;
  }
  
  // 检查是否为重复字符
  if (/^(.)\1+$/.test(pwd)) {
    return true;
  }
  
  return false;
});

// 检查密码强度
const checkPasswordStrength = () => {
  const pwd = form.password;
  
  if (!pwd) {
    passwordStrength.value = null;
    return;
  }
  
  let score = 0;
  
  // 长度评分
  if (pwd.length >= 8) score += 25;
  if (pwd.length >= 12) score += 15;
  if (pwd.length >= 16) score += 10;
  
  // 包含小写字母
  if (/[a-z]/.test(pwd)) score += 15;
  
  // 包含大写字母
  if (/[A-Z]/.test(pwd)) score += 15;
  
  // 包含数字
  if (/\d/.test(pwd)) score += 15;
  
  // 包含特殊字符
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score += 20;
  
  // 字符种类多样性
  const types = [
    /[a-z]/.test(pwd),
    /[A-Z]/.test(pwd),
    /\d/.test(pwd),
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)
  ].filter(Boolean).length;
  
  if (types >= 3) score += 10;
  if (types === 4) score += 10;
  
  // 如果是弱口令，强制降低分数
  if (isWeakPassword.value) {
    score = Math.min(score, 30);
  }
  
  // 确定等级
  let level: 'weak' | 'medium' | 'strong';
  let text: string;
  
  if (score < 40) {
    level = 'weak';
    text = '弱密码';
  } else if (score < 70) {
    level = 'medium';
    text = '中等强度';
  } else {
    level = 'strong';
    text = '强密码';
  }
  
  passwordStrength.value = { score, level, text };
};

const handleLogin = async () => {
  if (!form.username || !form.password) {
    error.value = '请输入用户名和密码';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const result = await userStore.login(form.username, form.password);
    
    if (result.success) {
      // 连接 WebSocket
      websocket.connect(userStore.token);
      
      // 跳转到首页
      router.push('/');
    } else {
      error.value = result.message || '登录失败';
    }
  } catch (err: any) {
    error.value = err.message || '登录失败，请稍后重试';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
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
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

/* 密码强度指示器 */
.password-strength {
  margin-top: 8px;
}

.strength-bar {
  height: 4px;
  background-color: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.strength-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
  border-radius: 2px;
}

.strength-fill.weak {
  background-color: #f44336;
}

.strength-fill.medium {
  background-color: #ff9800;
}

.strength-fill.strong {
  background-color: #4caf50;
}

.strength-text {
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
}

.strength-text.weak {
  color: #f44336;
}

.strength-text.medium {
  color: #ff9800;
}

.strength-text.strong {
  color: #4caf50;
}

/* 弱口令警告 */
.weak-password-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
  color: #856404;
  font-size: 13px;
  animation: shake 0.5s ease-in-out;
}

.warning-icon {
  font-size: 16px;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
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

.login-hint {
  margin-top: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

@media (max-width: 768px) {
  .login-form {
    padding: 30px;
    margin: 0 20px;
  }
}
</style>
