# 🔐 系统登录凭证

**测试账号信息**

---

## 默认账号

```
用户名: admin
密码: admin
角色: 管理员
```

---

## 使用说明

### 前端登录

1. 访问 `http://localhost:5173`
2. 输入用户名: `admin`
3. 输入密码: `admin`
4. 点击登录

### API测试

```javascript
// 登录请求
POST http://localhost:50001/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin"
}

// 响应
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user001",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

### 测试脚本

所有测试脚本都使用这个账号：

```bash
# 告警规则测试
cd backend
node test-alert-create.js

# AI功能测试
node test-ai.js

# 邮件通知测试
node test-email.js

# 钉钉通知测试
node test-dingtalk.js
```

---

## 密码验证逻辑

在 `backend/routes/auth.js` 中：

```javascript
// 简单密码验证（开发环境）
const isValidPassword = password === 'admin' || await bcrypt.compare(password, user.password);
```

支持两种验证方式：
1. 明文密码 `admin`（开发环境）
2. bcrypt加密密码（生产环境）

---

## 安全提示

⚠️ **重要**: 这是开发/测试环境的默认账号

在生产环境中，请务必：
1. 修改默认密码
2. 使用强密码
3. 启用密码加密
4. 实施密码策略
5. 添加多因素认证

---

## 修改密码

### 方法1: 修改代码

编辑 `backend/routes/auth.js`:

```javascript
const users = [
  {
    id: 'user001',
    username: 'admin',
    password: '$2b$10$...',  // 使用bcrypt加密的密码
    role: 'admin'
  }
];
```

### 方法2: 生成加密密码

```javascript
const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  console.log('Hashed password:', hash);
}

hashPassword('your-new-password');
```

---

## Token使用

### 获取Token

登录成功后，从响应中获取token：

```javascript
const response = await axios.post('/api/auth/login', {
  username: 'admin',
  password: 'admin'
});

const token = response.data.data.token;
```

### 使用Token

在后续请求中添加Authorization头：

```javascript
const response = await axios.get('/api/alert/rules', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Token验证

验证token是否有效：

```javascript
GET /api/auth/verify
Authorization: Bearer <token>

// 响应
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "user_id": "user001",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

---

## 常见问题

### Q: 为什么密码是 `admin` 而不是 `admin123`？

A: 这是系统的默认设置。在 `backend/routes/auth.js` 中，密码验证逻辑允许使用明文密码 `admin`。

### Q: 如何添加新用户？

A: 编辑 `backend/routes/auth.js` 中的 `users` 数组：

```javascript
const users = [
  {
    id: 'user001',
    username: 'admin',
    password: 'admin',
    role: 'admin'
  },
  {
    id: 'user002',
    username: 'test',
    password: 'test123',
    role: 'user'
  }
];
```

### Q: Token过期时间是多久？

A: 在 `backend/middleware/auth.js` 中配置：

```javascript
const token = jwt.sign(payload, process.env.JWT_SECRET, {
  expiresIn: '24h'  // 24小时
});
```

### Q: 忘记密码怎么办？

A: 开发环境中，密码硬编码在代码中。如果需要重置：
1. 修改 `backend/routes/auth.js` 中的密码
2. 重启后端服务

---

## 测试账号清单

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin | 管理员 | 默认管理员账号 |

---

**创建时间**: 2026-02-12  
**最后更新**: 2026-02-12
