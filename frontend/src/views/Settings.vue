<template>
  <div class="settings-page">
    <div class="page-header">
      <h1>系统设置</h1>
    </div>

    <!-- 用户信息卡片 -->
    <div class="settings-section">
      <div class="section-header">
        <h2>👤 用户信息</h2>
      </div>
      <div class="info-card">
        <div class="info-item">
          <span class="label">用户名：</span>
          <span class="value">{{ userStore.user?.username || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="label">角色：</span>
          <span class="value role-badge">{{ getRoleLabel(userStore.user?.role) }}</span>
        </div>
        <div class="info-item">
          <span class="label">用户ID：</span>
          <span class="value">{{ userStore.user?.id || '-' }}</span>
        </div>
      </div>
    </div>

    <!-- 修改密码卡片 -->
    <div class="settings-section">
      <div class="section-header">
        <h2>🔒 修改密码</h2>
      </div>
      <div class="password-card">
        <form @submit.prevent="handleChangePassword">
          <div class="form-group">
            <label for="oldPassword">当前密码 *</label>
            <div class="password-input-wrapper">
              <input
                :type="showOldPassword ? 'text' : 'password'"
                id="oldPassword"
                v-model="passwordForm.oldPassword"
                placeholder="请输入当前密码"
                required
              />
              <button
                type="button"
                class="toggle-password"
                @click="showOldPassword = !showOldPassword"
              >
                {{ showOldPassword ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="newPassword">新密码 *</label>
            <div class="password-input-wrapper">
              <input
                :type="showNewPassword ? 'text' : 'password'"
                id="newPassword"
                v-model="passwordForm.newPassword"
                placeholder="请输入新密码（至少6位）"
                required
                @input="checkPasswordStrength"
              />
              <button
                type="button"
                class="toggle-password"
                @click="showNewPassword = !showNewPassword"
              >
                {{ showNewPassword ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
            
            <!-- 密码强度提示 -->
            <div v-if="passwordForm.newPassword && passwordStrength" class="password-strength">
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
            <div v-if="passwordForm.newPassword && isWeakPassword" class="weak-password-warning">
              <span class="warning-icon">⚠️</span>
              <span>检测到弱口令！建议使用更强的密码</span>
            </div>
          </div>

          <div class="form-group">
            <label for="confirmPassword">确认新密码 *</label>
            <div class="password-input-wrapper">
              <input
                :type="showConfirmPassword ? 'text' : 'password'"
                id="confirmPassword"
                v-model="passwordForm.confirmPassword"
                placeholder="请再次输入新密码"
                required
              />
              <button
                type="button"
                class="toggle-password"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                {{ showConfirmPassword ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
            <div v-if="passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword" class="error-hint">
              两次输入的密码不一致
            </div>
          </div>

          <div v-if="message" class="message" :class="messageType">
            {{ message }}
          </div>

          <div class="form-actions">
            <button type="button" @click="resetForm" class="btn-secondary">重置</button>
            <button type="submit" class="btn-primary" :disabled="loading || !isFormValid">
              {{ loading ? '修改中...' : '修改密码' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

// 表单数据
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// 显示/隐藏密码
const showOldPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

// 加载状态和消息
const loading = ref(false);
const message = ref('');
const messageType = ref<'success' | 'error'>('success');

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
  if (!passwordForm.value.newPassword) return false;
  
  const pwd = passwordForm.value.newPassword.toLowerCase();
  
  if (weakPasswords.includes(pwd)) return true;
  if (/^\d+$/.test(pwd) && pwd.length < 8) return true;
  if (/^(0123|1234|2345|3456|4567|5678|6789|7890)+$/.test(pwd)) return true;
  if (/^(.)\1+$/.test(pwd)) return true;
  
  return false;
});

// 表单验证
const isFormValid = computed(() => {
  return (
    passwordForm.value.oldPassword &&
    passwordForm.value.newPassword &&
    passwordForm.value.confirmPassword &&
    passwordForm.value.newPassword === passwordForm.value.confirmPassword &&
    passwordForm.value.newPassword.length >= 6
  );
});

// 检查密码强度
const checkPasswordStrength = () => {
  const pwd = passwordForm.value.newPassword;
  
  if (!pwd) {
    passwordStrength.value = null;
    return;
  }
  
  let score = 0;
  
  if (pwd.length >= 8) score += 25;
  if (pwd.length >= 12) score += 15;
  if (pwd.length >= 16) score += 10;
  if (/[a-z]/.test(pwd)) score += 15;
  if (/[A-Z]/.test(pwd)) score += 15;
  if (/\d/.test(pwd)) score += 15;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score += 20;
  
  const types = [
    /[a-z]/.test(pwd),
    /[A-Z]/.test(pwd),
    /\d/.test(pwd),
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)
  ].filter(Boolean).length;
  
  if (types >= 3) score += 10;
  if (types === 4) score += 10;
  
  if (isWeakPassword.value) {
    score = Math.min(score, 30);
  }
  
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

// 处理修改密码
const handleChangePassword = async () => {
  if (!isFormValid.value) {
    return;
  }

  loading.value = true;
  message.value = '';

  try {
    const result = await userStore.changePassword(
      passwordForm.value.oldPassword,
      passwordForm.value.newPassword
    );

    if (result.success) {
      message.value = '密码修改成功！';
      messageType.value = 'success';
      resetForm();
      
      // 3秒后清除消息
      setTimeout(() => {
        message.value = '';
      }, 3000);
    } else {
      message.value = result.message || '密码修改失败';
      messageType.value = 'error';
    }
  } catch (error: any) {
    message.value = error.message || '密码修改失败，请稍后重试';
    messageType.value = 'error';
  } finally {
    loading.value = false;
  }
};

// 重置表单
const resetForm = () => {
  passwordForm.value = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  passwordStrength.value = null;
  showOldPassword.value = false;
  showNewPassword.value = false;
  showConfirmPassword.value = false;
};

// 获取角色标签
const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    admin: '管理员',
    user: '普通用户'
  };
  return labels[role] || role;
};
</script>

<style scoped>
.settings-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
}

.settings-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-header {
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

/* 用户信息卡片 */
.info-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.info-item .label {
  font-weight: 500;
  color: #666;
  min-width: 100px;
}

.info-item .value {
  color: #1a1a1a;
  font-weight: 500;
}

.role-badge {
  padding: 4px 12px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  font-size: 14px;
}

/* 密码表单 */
.password-card {
  max-width: 600px;
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

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper input {
  width: 100%;
  padding: 12px;
  padding-right: 45px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.password-input-wrapper input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}

.toggle-password {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 5px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.toggle-password:hover {
  opacity: 1;
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
}

.warning-icon {
  font-size: 16px;
}

.error-hint {
  margin-top: 6px;
  color: #f44336;
  font-size: 13px;
}

/* 消息提示 */
.message {
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 14px;
  animation: fadeIn 0.3s ease-in;
}

.message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
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

/* 按钮 */
.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-primary,
.btn-secondary {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #1976d2;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1565c0;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(25, 118, 210, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

@media (max-width: 768px) {
  .settings-page {
    padding: 15px;
  }

  .settings-section {
    padding: 16px;
  }

  .password-card {
    max-width: 100%;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>
