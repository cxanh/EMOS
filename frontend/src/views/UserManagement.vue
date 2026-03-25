<template>
  <div class="user-management">
    <div class="page-header">
      <h1>用户管理</h1>
      <button v-if="currentUserRole === 'admin'" class="btn-primary" @click="showCreateDialog = true">
        <span class="icon">+</span>
        创建用户
      </button>
    </div>

    <!-- 用户列表 -->
    <div class="user-list">
      <div v-if="loading" class="loading">加载中...</div>
      
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <button @click="loadUsers" class="btn-secondary">重试</button>
      </div>

      <div v-else-if="users.length === 0" class="empty">
        <p>暂无用户</p>
      </div>

      <table v-else class="user-table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>姓名</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>状态</th>
            <th>最后登录</th>
            <th>创建时间</th>
            <th v-if="currentUserRole === 'admin'">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>
              <span class="username">{{ user.username }}</span>
              <span v-if="user.id === currentUserId" class="badge badge-info">当前用户</span>
            </td>
            <td>{{ user.fullName }}</td>
            <td>{{ user.email || '-' }}</td>
            <td>
              <span class="badge" :class="`badge-${getRoleBadgeClass(user.role)}`">
                {{ getRoleLabel(user.role) }}
              </span>
            </td>
            <td>
              <span class="badge" :class="user.status === 'active' ? 'badge-success' : 'badge-danger'">
                {{ user.status === 'active' ? '正常' : '禁用' }}
              </span>
            </td>
            <td>{{ formatDate(user.lastLogin) }}</td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td v-if="currentUserRole === 'admin'" class="actions">
              <button @click="editUser(user)" class="btn-icon" title="编辑">
                <span>✏️</span>
              </button>
              <button 
                @click="toggleUserStatus(user)" 
                class="btn-icon" 
                :title="user.status === 'active' ? '禁用' : '启用'"
              >
                <span>{{ user.status === 'active' ? '🚫' : '✅' }}</span>
              </button>
              <button 
                @click="confirmDelete(user)" 
                class="btn-icon btn-danger" 
                title="删除"
                :disabled="user.id === currentUserId"
              >
                <span>🗑️</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 创建/编辑用户对话框 -->
    <div v-if="showCreateDialog || showEditDialog" class="modal-overlay" @click.self="closeDialogs">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ showCreateDialog ? '创建用户' : '编辑用户' }}</h2>
          <button class="btn-close" @click="closeDialogs">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>用户名 *</label>
            <input 
              v-model="formData.username" 
              type="text" 
              placeholder="3-20个字符，仅字母数字下划线"
              :disabled="showEditDialog"
            />
          </div>

          <div v-if="showCreateDialog" class="form-group">
            <label>密码 *</label>
            <input 
              v-model="formData.password" 
              type="password" 
              placeholder="至少6个字符"
            />
          </div>

          <div class="form-group">
            <label>姓名</label>
            <input 
              v-model="formData.fullName" 
              type="text" 
              placeholder="用户真实姓名"
            />
          </div>

          <div class="form-group">
            <label>邮箱</label>
            <input 
              v-model="formData.email" 
              type="email" 
              placeholder="user@example.com"
            />
          </div>

          <div class="form-group">
            <label>角色 *</label>
            <select v-model="formData.role">
              <option value="viewer">查看者</option>
              <option value="operator">操作员</option>
              <option value="admin">管理员</option>
            </select>
          </div>

          <div v-if="formError" class="form-error">
            {{ formError }}
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeDialogs" class="btn-secondary">取消</button>
          <button 
            @click="showCreateDialog ? handleCreate() : handleUpdate()" 
            class="btn-primary"
            :disabled="formSubmitting"
          >
            {{ formSubmitting ? '提交中...' : '确定' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteDialog" class="modal-overlay" @click.self="showDeleteDialog = false">
      <div class="modal modal-small">
        <div class="modal-header">
          <h2>确认删除</h2>
          <button class="btn-close" @click="showDeleteDialog = false">×</button>
        </div>
        
        <div class="modal-body">
          <p>确定要删除用户 <strong>{{ userToDelete?.username }}</strong> 吗？</p>
          <p class="warning">此操作不可恢复！</p>
        </div>

        <div class="modal-footer">
          <button @click="showDeleteDialog = false" class="btn-secondary">取消</button>
          <button 
            @click="handleDelete" 
            class="btn-danger"
            :disabled="formSubmitting"
          >
            {{ formSubmitting ? '删除中...' : '确定删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getAllUsers, createUser, updateUser, deleteUser, type User } from '../api/user';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();

const users = ref<User[]>([]);
const loading = ref(false);
const error = ref('');

const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const showDeleteDialog = ref(false);

const formData = ref({
  username: '',
  password: '',
  fullName: '',
  email: '',
  role: 'viewer' as 'admin' | 'operator' | 'viewer'
});

const formError = ref('');
const formSubmitting = ref(false);

const editingUser = ref<User | null>(null);
const userToDelete = ref<User | null>(null);

const currentUserId = computed(() => userStore.user?.id);
const currentUserRole = computed(() => userStore.user?.role);

// 加载用户列表
async function loadUsers() {
  loading.value = true;
  error.value = '';
  
  try {
    const response = await getAllUsers();
    users.value = response.data;
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || '加载用户列表失败';
    console.error('Failed to load users:', err);
  } finally {
    loading.value = false;
  }
}

// 创建用户
async function handleCreate() {
  formError.value = '';
  
  // 验证
  if (!formData.value.username || !formData.value.password) {
    formError.value = '用户名和密码不能为空';
    return;
  }

  if (formData.value.password.length < 6) {
    formError.value = '密码至少6个字符';
    return;
  }

  formSubmitting.value = true;

  try {
    await createUser({
      username: formData.value.username,
      password: formData.value.password,
      fullName: formData.value.fullName || formData.value.username,
      email: formData.value.email,
      role: formData.value.role
    });

    closeDialogs();
    await loadUsers();
  } catch (err: any) {
    formError.value = err.response?.data?.error?.message || '创建用户失败';
    console.error('Failed to create user:', err);
  } finally {
    formSubmitting.value = false;
  }
}

// 编辑用户
function editUser(user: User) {
  editingUser.value = user;
  formData.value = {
    username: user.username,
    password: '',
    fullName: user.fullName,
    email: user.email,
    role: user.role
  };
  showEditDialog.value = true;
}

// 更新用户
async function handleUpdate() {
  if (!editingUser.value) return;

  formError.value = '';
  formSubmitting.value = true;

  try {
    await updateUser(editingUser.value.id, {
      username: formData.value.username,
      fullName: formData.value.fullName,
      email: formData.value.email,
      role: formData.value.role
    });

    closeDialogs();
    await loadUsers();
  } catch (err: any) {
    formError.value = err.response?.data?.error?.message || '更新用户失败';
    console.error('Failed to update user:', err);
  } finally {
    formSubmitting.value = false;
  }
}

// 切换用户状态
async function toggleUserStatus(user: User) {
  const newStatus = user.status === 'active' ? 'disabled' : 'active';
  const action = newStatus === 'disabled' ? '禁用' : '启用';
  
  if (!confirm(`确定要${action}用户 ${user.username} 吗？`)) {
    return;
  }

  try {
    await updateUser(user.id, { status: newStatus });
    await loadUsers();
  } catch (err: any) {
    alert(err.response?.data?.error?.message || `${action}用户失败`);
    console.error('Failed to toggle user status:', err);
  }
}

// 确认删除
function confirmDelete(user: User) {
  userToDelete.value = user;
  showDeleteDialog.value = true;
}

// 删除用户
async function handleDelete() {
  if (!userToDelete.value) return;

  formSubmitting.value = true;

  try {
    await deleteUser(userToDelete.value.id);
    showDeleteDialog.value = false;
    userToDelete.value = null;
    await loadUsers();
  } catch (err: any) {
    alert(err.response?.data?.error?.message || '删除用户失败');
    console.error('Failed to delete user:', err);
  } finally {
    formSubmitting.value = false;
  }
}

// 关闭对话框
function closeDialogs() {
  showCreateDialog.value = false;
  showEditDialog.value = false;
  formData.value = {
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: 'viewer'
  };
  formError.value = '';
  editingUser.value = null;
}

// 格式化日期
function formatDate(dateString: string | null) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN');
}

// 获取角色标签
function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    admin: '管理员',
    operator: '操作员',
    viewer: '查看者'
  };
  return labels[role] || role;
}

// 获取角色徽章样式
function getRoleBadgeClass(role: string) {
  const classes: Record<string, string> = {
    admin: 'danger',
    operator: 'warning',
    viewer: 'info'
  };
  return classes[role] || 'secondary';
}

onMounted(() => {
  loadUsers();
});
</script>

<style scoped>
.user-management {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  color: #333;
}

.user-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.loading, .error, .empty {
  padding: 60px 20px;
  text-align: center;
  color: #666;
}

.error {
  color: #f56c6c;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
}

.user-table th,
.user-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.user-table th {
  background: #f5f7fa;
  font-weight: 600;
  color: #333;
}

.user-table tbody tr:hover {
  background: #f9f9f9;
}

.username {
  font-weight: 500;
  margin-right: 8px;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.badge-info {
  background: #e1f3ff;
  color: #409eff;
}

.badge-success {
  background: #e1f5e1;
  color: #67c23a;
}

.badge-warning {
  background: #fff3e0;
  color: #e6a23c;
}

.badge-danger {
  background: #ffe6e6;
  color: #f56c6c;
}

.badge-secondary {
  background: #f0f0f0;
  color: #666;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  padding: 4px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-icon:hover:not(:disabled) {
  background: #f0f0f0;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon.btn-danger:hover:not(:disabled) {
  background: #ffe6e6;
}

.btn-primary, .btn-secondary, .btn-danger {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background: #409eff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #66b1ff;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-danger {
  background: #f56c6c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #f78989;
}

.btn-primary:disabled,
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icon {
  margin-right: 4px;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: auto;
}

.modal-small {
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
}

.btn-close {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 32px;
  height: 32px;
  line-height: 1;
}

.btn-close:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #eee;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #409eff;
}

.form-group input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.form-error {
  margin-top: 16px;
  padding: 12px;
  background: #ffe6e6;
  color: #f56c6c;
  border-radius: 4px;
  font-size: 14px;
}

.warning {
  color: #e6a23c;
  font-size: 14px;
  margin-top: 8px;
}
</style>
