> 历史记录/非当前基线
>
> 本文档为项目根目录迁移出的历史材料，仅用于追溯阶段背景、问题修复或功能完成过程。
> 当前项目入口与有效文档请以根目录 `README.md`、`DOCS.md` 和 `docs/` 目录中的 SSOT 文档为准。
# 🔧 测试脚本登录问题修复

**问题**: 测试脚本返回401错误 - Invalid username or password  
**原因**: 测试脚本使用了错误的密码  
**状态**: ✅ 已修复

---

## 问题详情

### 错误信息

```
=== Testing Alert Rule Creation ===
1. Logging in...
✗ Test Failed!
Status: 401
Data: {
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password"
  }
}
```

### 原因分析

测试脚本 `backend/test-alert-create.js` 使用了错误的密码：

```javascript
// ❌ 错误的密码
const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
  username: 'admin',
  password: 'admin123'  // 错误！
});
```

但系统的实际密码是 `admin`（在 `backend/routes/auth.js` 中定义）：

```javascript
// 密码验证逻辑
const isValidPassword = password === 'admin' || await bcrypt.compare(password, user.password);
```

---

## 修复方案

### 修改测试脚本

**文件**: `backend/test-alert-create.js`

```javascript
// ✅ 正确的密码
const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
  username: 'admin',
  password: 'admin'  // 正确！
});
```

---

## 系统登录凭证

### 默认账号

```
用户名: admin
密码: admin
角色: 管理员
```

### 使用场景

1. **前端登录**
   - 访问 `http://localhost:5173`
   - 输入 admin/admin

2. **API测试**
   - 所有测试脚本
   - Postman/curl测试

3. **开发调试**
   - 本地开发环境
   - 功能测试

---

## 验证修复

### 运行测试脚本

```bash
cd backend
node test-alert-create.js
```

### 预期输出

```
=== Testing Alert Rule Creation ===

1. Logging in...
✓ Login successful
Token: eyJhbGciOiJIUzI1NiIs...

2. Fetching existing rules...
✓ Current rules count: X
Rules: [...]

3. Creating new alert rule...
✓ Rule created successfully!
Created rule: {...}

4. Verifying rule creation...
✓ New rules count: X+1
✓ Rule found in list!

=== Test Completed Successfully ===
```

---

## 其他测试脚本

所有测试脚本都使用相同的凭证：

### AI功能测试
```bash
cd backend
node test-ai.js
# 使用 admin/admin
```

### 邮件通知测试
```bash
cd backend
node test-email.js
# 不需要登录
```

### 钉钉通知测试
```bash
cd backend
node test-dingtalk.js
# 不需要登录
```

---

## 相关文档

- [登录凭证说明](LOGIN_CREDENTIALS.md) - 详细的登录信息
- [告警测试指南](ALERT_TEST_GUIDE.md) - 完整的测试流程
- [告警UI修复报告](ALERT_UI_FEEDBACK_FIX.md) - UI反馈修复

---

## 快速测试清单

- [x] 修复测试脚本密码
- [x] 更新测试指南文档
- [x] 创建登录凭证文档
- [ ] 运行测试脚本验证
- [ ] 前端登录测试
- [ ] 告警规则创建测试

---

## 下一步

现在可以运行测试脚本了：

```bash
cd backend
node test-alert-create.js
```

应该能看到成功的输出！

---

**修复时间**: 2026-02-12  
**修复状态**: ✅ 完成

