import api from './index';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  fullName?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  email?: string;
  fullName?: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: AuthUser;
  };
}

export interface RegisterResponse {
  success: boolean;
  data: AuthUser;
  message: string;
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

export const register = (data: RegisterRequest) => {
  return api.post<any, RegisterResponse>('/auth/register', data);
};

export const login = (data: LoginRequest) => {
  return api.post<any, LoginResponse>('/auth/login', data);
};

export const logout = () => {
  return api.post('/auth/logout');
};

export const verifyToken = () => {
  return api.get<any, VerifyResponse>('/auth/verify');
};

export const changePassword = (data: ChangePasswordRequest) => {
  return api.post<any, { success: boolean; message: string }>('/auth/change-password', data);
};
