import request from './index';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  email: string;
  fullName: string;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  status: 'active' | 'disabled';
}

export interface CreateUserData {
  username: string;
  password: string;
  role?: 'admin' | 'operator' | 'viewer';
  email?: string;
  fullName?: string;
}

export interface UpdateUserData {
  username?: string;
  role?: 'admin' | 'operator' | 'viewer';
  email?: string;
  fullName?: string;
  status?: 'active' | 'disabled';
}

export interface ChangePasswordData {
  oldPassword?: string;
  newPassword: string;
}

// 获取所有用户
export function getAllUsers() {
  return request.get<User[]>('/users');
}

// 获取当前用户信息
export function getCurrentUser() {
  return request.get<User>('/users/me');
}

// 获取指定用户信息
export function getUserById(userId: string) {
  return request.get<User>(`/users/${userId}`);
}

// 创建用户
export function createUser(data: CreateUserData) {
  return request.post<User>('/users', data);
}

// 更新用户信息
export function updateUser(userId: string, data: UpdateUserData) {
  return request.put<User>(`/users/${userId}`, data);
}

// 删除用户
export function deleteUser(userId: string) {
  return request.delete(`/users/${userId}`);
}

// 修改密码
export function changePassword(userId: string, data: ChangePasswordData) {
  return request.post(`/users/${userId}/change-password`, data);
}

// 获取角色列表
export function getRoles() {
  return request.get<Array<{ value: string; label: string }>>('/users/meta/roles');
}
