import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  verifyToken,
  changePassword as apiChangePassword
} from '@/api/auth';

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') || '');
  const user = ref<any>(JSON.parse(localStorage.getItem('user') || 'null'));
  const isLoggedIn = ref<boolean>(!!token.value);

  const login = async (username: string, password: string) => {
    try {
      const response = await apiLogin({ username, password });

      if (response.success) {
        token.value = response.data.token;
        user.value = response.data.user;
        isLoggedIn.value = true;

        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        return { success: true as const };
      }

      return { success: false as const, message: 'Login failed' };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false as const,
        message: error.response?.data?.error?.message || 'Login failed, please check username and password'
      };
    }
  };

  const register = async (payload: {
    username: string;
    password: string;
    email?: string;
    fullName?: string;
  }) => {
    try {
      const response = await apiRegister(payload);
      if (response.success) {
        return {
          success: true as const,
          message: response.message || 'Account created successfully'
        };
      }
      return { success: false as const, message: 'Register failed' };
    } catch (error: any) {
      console.error('Register error:', error);
      return {
        success: false as const,
        message: error.response?.data?.error?.message || 'Register failed'
      };
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      token.value = '';
      user.value = null;
      isLoggedIn.value = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

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
      }
      await logout();
      return false;
    } catch (_error) {
      await logout();
      return false;
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      const response = await apiChangePassword({ oldPassword, newPassword });
      if (response.success) {
        return { success: true as const, message: response.message };
      }
      return { success: false as const, message: 'Change password failed' };
    } catch (error: any) {
      console.error('Change password error:', error);
      return {
        success: false as const,
        message: error.response?.data?.error?.message || 'Change password failed'
      };
    }
  };

  return {
    token,
    user,
    isLoggedIn,
    login,
    register,
    logout,
    verify,
    changePassword
  };
});
