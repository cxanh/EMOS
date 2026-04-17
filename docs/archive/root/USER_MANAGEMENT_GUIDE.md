> 历史记录/非当前基线
>
> 本文档为项目根目录迁移出的历史材料，仅用于追溯阶段背景、问题修复或功能完成过程。
> 当前项目入口与有效文档请以根目录 `README.md`、`DOCS.md` 和 `docs/` 目录中的 SSOT 文档为准。
# 用户管理系统使用指南

**创建日期**: 2026-02-22  
**功能状态**: ✅ 已完成

---

## 📋 功能概述

用户管理系统是EOMS的企业级扩展功能，提供完整的多用户管理能力，包括用户创建、编辑、删除、权限管理等功能。

### 核心功能

1. **用户管理** - 创建、编辑、删除用户
2. **角色权限** - 三级权限体系（管理员、操作员、查看者）
3. **状态管理** - 启用/禁用用户账户
4. **密码管理** - 修改密码、密码强度验证
5. **操作审计** - 记录用户操作日志

---

## 👥 角色权限说明

### 管理员 (Admin)
- ✅ 所有系统功能访问权限
- ✅ 用户管理（创建、编辑、删除用户）
- ✅ 系统设置修改
- ✅ 告警规则配置
- ✅ 查看所有监控数据

### 操作员 (Operator)
- ✅ 查看监控数据
- ✅ 配置告警规则
- ✅ 处理告警事件
- ✅ 导出数据
- ❌ 无法管理用户
- ❌ 无法修改系统设置

### 查看者 (Viewer)
- ✅ 查看监控数据
- ✅ 查看告警事件
- ✅ 导出数据
- ❌ 无法配置告警规则
- ❌ 无法管理用户
- ❌ 无法修改系统设置

---

## 🚀 快速开始

### 1. 访问用户管理

管理员登录后，在侧边栏可以看到"用户管理"菜单项（👥图标）。

```
侧边栏 → 用户管理
```

### 2. 创建新用户

1. 点击页面右上角的"创建用户"按钮
2. 填写用户信息：
   - **用户名** (必填): 3-20个字符，仅字母、数字、下划线
   - **密码** (必填): 至少6个字符
   - **姓名** (可选): 用户真实姓名
   - **邮箱** (可选): 用户邮箱地址
   - **角色** (必填): 选择用户角色
3. 点击"确定"创建用户

### 3. 编辑用户

1. 在用户列表中找到要编辑的用户
2. 点击"编辑"按钮（✏️图标）
3. 修改用户信息
4. 点击"确定"保存更改

### 4. 禁用/启用用户

1. 在用户列表中找到目标用户
2. 点击"禁用"按钮（🚫图标）或"启用"按钮（✅图标）
3. 确认操作

**注意**: 禁用的用户无法登录系统

### 5. 删除用户

1. 在用户列表中找到要删除的用户
2. 点击"删除"按钮（🗑️图标）
3. 在确认对话框中点击"确定删除"

**注意**: 
- 无法删除自己的账户
- 无法删除最后一个管理员账户
- 删除操作不可恢复

---

## 🔧 后端API接口

### 认证接口

#### 登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_xxx",
      "username": "admin",
      "role": "admin",
      "email": "admin@example.com",
      "fullName": "System Administrator"
    }
  }
}
```

### 用户管理接口

#### 获取所有用户
```http
GET /api/users
Authorization: Bearer {token}
```

#### 获取当前用户信息
```http
GET /api/users/me
Authorization: Bearer {token}
```

#### 获取指定用户
```http
GET /api/users/{userId}
Authorization: Bearer {token}
```

#### 创建用户
```http
POST /api/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123",
  "fullName": "New User",
  "email": "newuser@example.com",
  "role": "operator"
}
```

#### 更新用户
```http
PUT /api/users/{userId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "fullName": "Updated Name",
  "email": "updated@example.com",
  "role": "viewer",
  "status": "active"
}
```

#### 删除用户
```http
DELETE /api/users/{userId}
Authorization: Bearer {token}
```

#### 修改密码
```http
POST /api/users/{userId}/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "oldPassword": "oldpass123",  // 管理员可选
  "newPassword": "newpass123"
}
```

#### 获取角色列表
```http
GET /api/users/meta/roles
Authorization: Bearer {token}
```

---

## 🧪 测试指南

### 运行测试脚本

```bash
cd backend
node test-user-management.js
```

测试脚本会自动执行以下测试：

1. ✅ 管理员登录
2. ✅ 创建测试用户
3. ✅ 获取所有用户
4. ✅ 获取指定用户
5. ✅ 更新用户信息
6. ✅ 修改用户密码
7. ✅ 使用新密码登录
8. ✅ 禁用用户
9. ✅ 禁用用户尝试登录（应失败）
10. ✅ 启用用户
11. ✅ 删除用户
12. ✅ 获取角色列表

### 手动测试步骤

#### 1. 测试用户创建

```bash
# 登录获取token
curl -X POST http://localhost:50001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# 创建用户
curl -X POST http://localhost:50001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "username": "testuser",
    "password": "test123456",
    "fullName": "Test User",
    "email": "test@example.com",
    "role": "operator"
  }'
```

#### 2. 测试用户列表

```bash
curl -X GET http://localhost:50001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. 测试用户更新

```bash
curl -X PUT http://localhost:50001/api/users/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "fullName": "Updated Name",
    "email": "updated@example.com"
  }'
```

---

## 📊 数据存储

用户数据存储在Redis中，使用以下数据结构：

### 用户信息
```
Key: user:{userId}
Type: Hash
Fields:
  - id: 用户ID
  - username: 用户名
  - password: 加密后的密码
  - role: 角色
  - email: 邮箱
  - fullName: 姓名
  - createdAt: 创建时间
  - updatedAt: 更新时间
  - lastLogin: 最后登录时间
  - status: 状态 (active/disabled)
```

### 用户列表
```
Key: users
Type: Set
Members: 所有用户ID
```

### 用户名映射
```
Key: username:{username}
Type: String
Value: 用户ID
```

### 邮箱映射
```
Key: email:{email}
Type: String
Value: 用户ID
```

---

## 🔒 安全特性

### 1. 密码安全
- ✅ 使用bcrypt加密存储
- ✅ 最小长度6个字符
- ✅ 密码强度验证

### 2. 认证安全
- ✅ JWT Token认证
- ✅ Token过期时间24小时
- ✅ 禁用用户无法登录

### 3. 权限控制
- ✅ 基于角色的访问控制(RBAC)
- ✅ 路由级别权限验证
- ✅ API级别权限验证

### 4. 操作限制
- ✅ 无法删除自己的账户
- ✅ 无法删除最后一个管理员
- ✅ 非管理员无法访问用户管理

---

## ⚠️ 注意事项

### 1. 默认管理员账户

系统初始化时会自动创建默认管理员账户：
- 用户名: `admin`
- 密码: `admin`

**重要**: 首次登录后请立即修改默认密码！

### 2. 用户名规则

- 长度: 3-20个字符
- 允许字符: 字母、数字、下划线
- 不允许: 特殊字符、空格、中文

### 3. 密码规则

- 最小长度: 6个字符
- 建议: 使用字母、数字、特殊字符组合
- 定期更换密码

### 4. 角色变更

- 管理员可以修改任何用户的角色
- 角色变更立即生效
- 用户需要重新登录以获取新权限

### 5. 用户禁用

- 禁用的用户无法登录
- 已登录的用户Token仍然有效（直到过期）
- 建议禁用用户后通知用户

---

## 🐛 常见问题

### Q1: 忘记管理员密码怎么办？

**A**: 可以通过Redis直接重置密码：

```bash
# 连接Redis
redis-cli

# 查找admin用户ID
GET username:admin

# 重置密码为 admin123
# 先生成bcrypt哈希（使用Node.js）
node -e "console.log(require('bcrypt').hashSync('admin123', 10))"

# 更新密码
HSET user:{userId} password {生成的哈希值}
```

### Q2: 无法创建用户，提示"Username already exists"

**A**: 用户名已被使用，请更换其他用户名。

### Q3: 删除用户后能恢复吗？

**A**: 不能。删除操作是永久性的，请谨慎操作。

### Q4: 如何批量创建用户？

**A**: 可以使用API接口编写脚本批量创建：

```javascript
const users = [
  { username: 'user1', password: 'pass1', role: 'viewer' },
  { username: 'user2', password: 'pass2', role: 'operator' }
];

for (const user of users) {
  await axios.post('/api/users', user, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
```

### Q5: 用户角色权限可以自定义吗？

**A**: 当前版本提供三个固定角色。如需自定义权限，需要修改后端代码。

---

## 📝 更新日志

### v1.0.0 (2026-02-22)

**新增功能**:
- ✅ 用户CRUD操作
- ✅ 三级角色权限体系
- ✅ 用户状态管理（启用/禁用）
- ✅ 密码管理和修改
- ✅ 用户管理界面
- ✅ 完整的API接口
- ✅ 测试脚本

**技术实现**:
- 后端: Node.js + Express + Redis
- 前端: Vue 3 + TypeScript
- 认证: JWT Token
- 加密: bcrypt

---

## 🔗 相关文档

- [系统部署指南](./docs/部署指南.md)
- [API接口文档](./docs/技术实施细节.md)
- [测试指南](./docs/测试指南.md)
- [开发路线图](./DEVELOPMENT_ROADMAP.md)

---

**文档维护**: AI Assistant  
**最后更新**: 2026-02-22

