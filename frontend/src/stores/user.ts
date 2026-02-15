import { defineStore } from 'pinia';
import { ref } from 'vue';
import { login as apiLogin, logout as apiLogout, verifyToken, changePassword as apiChangePassword } from '@/api/auth';

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref<string>(localStorage.getItem('token') || '');
  const user = ref<any>(JSON.parse(localStorage.getItem('user') || 'null'));
  const isLoggedIn = ref<boolean>(!!token.value);

  // 登录
  const login = async (username: string, password: string) => {
    try {
      const response = await apiLogin({ username, password });
      
      if (response.success) {
        token.value = response.data.token;
        user.value = response.data.user;
        isLoggedIn.value = true;

        // 保存到 localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        return { success: true };
      } else {
        return { success: false, message: '登录失败' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.error?.message || '登录失败，请检查用户名和密码'
      };
    }
  };

  // 登出
  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // 清除状态
      token.value = '';
      user.value = null;
      isLoggedIn.value = false;

      // 清除 localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  // 验证 token
  const verify = async () => {
    if (!token.value) {
      isLoggedIn.value = false;
      return false;
    }

    try {
      const response = await verifyToken();
      if (response.success && response.data.valid) {
        isLoggedIn.value = true;
        return true;
      } else {
        await logout();
        return false;
      }
    } catch (error) {
      await logout();
      return false;
    }
  };

  // 修改密码
  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      const response = await apiChangePassword({ oldPassword, newPassword });
      if (response.success) {
        return { success: true, message: response.message };
      } else {
        return { success: false, message: '修改密码失败' };
      }
    } catch (error: any) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || '修改密码失败'
      };
    }
  };

  return {
    token,
    user,
    isLoggedIn,
    login,
    logout,
    verify,
    changePassword
  };
});
