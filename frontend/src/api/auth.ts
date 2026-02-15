import api from './index';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: string;
      username: string;
      role: string;
    };
  };
}

export interface VerifyResponse {
  success: boolean;
  data: {
    valid: boolean;
    user: {
      user_id: string;
      username: string;
      role: string;
    };
  };
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

// 用户登录
export const login = (data: LoginRequest) => {
  return api.post<any, LoginResponse>('/auth/login', data);
};

// 用户登出
export const logout = () => {
  return api.post('/auth/logout');
};

// 验证 token
export const verifyToken = () => {
  return api.get<any, VerifyResponse>('/auth/verify');
};

// 修改密码
export const changePassword = (data: ChangePasswordRequest) => {
  return api.post<any, { success: boolean; message: string }>('/auth/change-password', data);
};
