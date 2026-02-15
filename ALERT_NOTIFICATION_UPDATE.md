# ✅ 告警通知功能更新

**日期**: 2026-02-09  
**状态**: 已完成

---

## 🎉 更新内容

### 问题修复

✅ **修复规则创建后不刷新的问题**
- 在 `submitRule` 方法中添加了 `await alertStore.fetchRules()`
- 现在创建或编辑规则后会自动刷新列表
- 添加了错误提示

### 新增功能

✅ **邮件通知功能**
- 创建了 `backend/services/emailService.js`
- 支持 SMTP 邮件发送
- 精美的 HTML 邮件模板
- 支持告警触发和恢复通知

✅ **钉钉通知功能**
- 创建了 `backend/services/dingtalkService.js`
- 支持钉钉群机器人
- Markdown 格式消息
- 支持加签安全验证

---

## 📦 新增文件

### 后端文件 (2个)

1. **backend/services/emailService.js** ✅
   - 邮件服务实现
   - SMTP 配置
   - HTML 邮件模板
   - 告警和恢复通知

2. **backend/services/dingtalkService.js** ✅
   - 钉钉服务实现
   - Webhook 调用
   - 签名验证
   - Markdown 消息格式

### 文档文件 (1个)

1. **docs/告警通知配置指南.md** ✅
   - 完整的配置教程
   - Gmail/QQ/163 邮箱配置
   - 钉钉机器人配置
   - 测试脚本
   - 常见问题解决

### 修改文件 (5个)

1. **backend/index.js** - 初始化邮件和钉钉服务
2. **backend/services/alertChecker.js** - 集成邮件和钉钉通知
3. **backend/package.json** - 添加 nodemailer 和 axios 依赖
4. **backend/.env.example** - 添加邮件和钉钉配置示例
5. **frontend/src/views/Alert.vue** - 添加钉钉通知选项，修复刷新问题

---

## 🚀 如何使用

### 1. 安装依赖

```bash
cd backend
npm install
```

这会安装 `nodemailer` 和 `axios`。

### 2. 配置通知渠道

#### 邮件通知（以 Gmail 为例）

编辑 `backend/.env`:

```env
# 邮件通知配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-digit-app-password
ALERT_EMAIL=admin@example.com
```

**重要**: 
- 必须使用应用专用密码，不是邮箱登录密码
- Gmail 需要先启用两步验证，然后生成应用专用密码

#### 钉钉通知

编辑 `backend/.env`:

```env
# 钉钉通知配置
DINGTALK_WEBHOOK=https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN
DINGTALK_SECRET=SECxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. 重启后端

```bash
cd backend
npm run dev
```

**预期输出**:
```
Email Service Initialized
DingTalk Service Initialized
Alert Service Initialized
Alert checker started
```

如果未配置，会显示:
```
Email service not configured
DingTalk service not configured
```

### 4. 创建告警规则

1. 访问前端: http://localhost:5174
2. 进入"告警管理"
3. 点击"新建规则"
4. 在"通知方式"中勾选:
   - ✅ WebSocket推送
   - ✅ 邮件通知
   - ✅ 钉钉通知
5. 创建规则

### 5. 测试通知

#### 测试邮件

创建 `backend/test-email.js`:

```javascript
require('dotenv').config();
const emailService = require('./services/emailService');

async function test() {
  await emailService.initialize();
  
  if (!emailService.isEnabled()) {
    console.log('❌ Email service is not enabled');
    return;
  }
  
  const testEvent = {
    ruleName: '测试告警',
    nodeId: 'test-node',
    nodeName: '测试节点',
    metric: 'cpu_usage',
    currentValue: 85.5,
    threshold: 80,
    triggeredAt: new Date().toISOString(),
    message: '这是一条测试告警消息'
  };
  
  const result = await emailService.sendAlert(testEvent);
  console.log(result.success ? '✅ 邮件发送成功!' : '❌ 邮件发送失败:', result.error);
}

test();
```

运行:
```bash
node backend/test-email.js
```

#### 测试钉钉

创建 `backend/test-dingtalk.js`:

```javascript
require('dotenv').config();
const dingtalkService = require('./services/dingtalkService');

async function test() {
  dingtalkService.initialize();
  
  if (!dingtalkService.isEnabled()) {
    console.log('❌ DingTalk service is not enabled');
    return;
  }
  
  const testEvent = {
    ruleName: '测试告警',
    nodeId: 'test-node',
    nodeName: '测试节点',
    metric: 'cpu_usage',
    currentValue: 85.5,
    threshold: 80,
    triggeredAt: new Date().toISOString(),
    message: '这是一条测试告警消息'
  };
  
  const result = await dingtalkService.sendAlert(testEvent);
  console.log(result.success ? '✅ 钉钉消息发送成功!' : '❌ 钉钉消息发送失败:', result.error);
}

test();
```

运行:
```bash
node backend/test-dingtalk.js
```

---

## 📧 邮件配置快速指南

### Gmail 配置

1. **启用两步验证**
   - 访问: https://myaccount.google.com/security
   - 启用"两步验证"

2. **生成应用专用密码**
   - 在"两步验证"页面找到"应用专用密码"
   - 选择"邮件"和"Windows 计算机"
   - 复制生成的 16 位密码

3. **配置 .env**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=xxxx-xxxx-xxxx-xxxx  # 16位应用密码
   ```

### QQ 邮箱配置

1. **开启 SMTP 服务**
   - 登录 QQ 邮箱 → 设置 → 账户
   - 开启"IMAP/SMTP服务"
   - 生成授权码

2. **配置 .env**
   ```env
   SMTP_HOST=smtp.qq.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-qq-email@qq.com
   SMTP_PASS=your-authorization-code
   ```

### 163 邮箱配置

1. **开启 SMTP 服务**
   - 登录 163 邮箱 → 设置 → POP3/SMTP/IMAP
   - 开启"IMAP/SMTP服务"
   - 设置客户端授权密码

2. **配置 .env**
   ```env
   SMTP_HOST=smtp.163.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=your-email@163.com
   SMTP_PASS=your-authorization-password
   ```

---

## 💬 钉钉配置快速指南

### 创建钉钉机器人

1. **进入群聊**
   - 打开钉钉，进入要接收告警的群

2. **添加机器人**
   - 点击右上角"..." → "群设置"
   - "智能群助手" → "添加机器人"
   - 选择"自定义"机器人

3. **配置机器人**
   - 名称: EOMS告警
   - 安全设置: 选择"加签"（推荐）
   - 复制 Webhook 地址和密钥

4. **配置 .env**
   ```env
   DINGTALK_WEBHOOK=https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN
   DINGTALK_SECRET=SECxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

## 🎯 通知效果

### 邮件通知

- **主题**: [告警] CPU使用率过高
- **内容**: 
  - 精美的 HTML 格式
  - 红色高亮当前值
  - 完整的告警信息
  - 系统登录链接

### 钉钉通知

- **标题**: 🚨 系统告警: CPU使用率过高
- **内容**:
  - Markdown 格式
  - 红色标注当前值
  - 完整的告警信息
  - @所有人（可选）

### WebSocket 通知

- **实时推送**: 无需刷新页面
- **前端弹窗**: 显示告警详情
- **活动告警列表**: 自动更新

---

## 🐛 常见问题

### 问题 1: 规则创建后不显示

**已修复** ✅

现在创建规则后会自动刷新列表。

### 问题 2: 邮件发送失败 - 认证错误

**原因**: 使用了邮箱登录密码而不是应用专用密码

**解决**: 
1. Gmail: 生成应用专用密码
2. QQ/163: 生成授权码
3. 不要使用邮箱登录密码

### 问题 3: 钉钉消息发送失败 - 签名错误

**原因**: DINGTALK_SECRET 配置错误

**解决**:
1. 确认复制了完整的密钥（包括 SEC 前缀）
2. 确认机器人安全设置选择的是"加签"

### 问题 4: 通知服务未启用

**原因**: 未配置或配置错误

**解决**:
1. 检查 .env 文件配置
2. 查看后端启动日志
3. 运行测试脚本验证

---

## 📊 代码统计

### 新增代码

- emailService.js: ~250 行
- dingtalkService.js: ~180 行
- 告警通知配置指南.md: ~600 行
- **总计**: ~1030 行

### 修改代码

- backend/index.js: +4 行
- backend/services/alertChecker.js: +40 行
- backend/package.json: +2 行
- backend/.env.example: +10 行
- frontend/src/views/Alert.vue: +5 行
- **总计**: ~61 行

---

## ✅ 验收标准

### 功能验收

- [x] 规则创建后自动刷新
- [x] 邮件通知功能实现
- [x] 钉钉通知功能实现
- [x] 告警触发时发送通知
- [x] 告警恢复时发送通知
- [x] 支持多种邮箱配置
- [x] 支持钉钉加签验证
- [x] 完整的配置文档

### 代码质量

- [x] 代码结构清晰
- [x] 错误处理完善
- [x] 日志记录完整
- [x] 无语法错误

### 文档完整性

- [x] 配置指南详细
- [x] 测试脚本提供
- [x] 常见问题解答
- [x] 快速开始指南

---

## 🎓 技术要点

### 邮件发送

- 使用 nodemailer 库
- 支持 SMTP 协议
- HTML 邮件模板
- 异步发送，不阻塞主流程

### 钉钉机器人

- 使用 Webhook API
- HMAC-SHA256 签名验证
- Markdown 消息格式
- 异步发送，不阻塞主流程

### 错误处理

- 配置检查
- 连接验证
- 发送失败不影响其他通知
- 完整的日志记录

---

## 🎉 总结

本次更新完成了：

✅ **修复了规则创建后不刷新的问题**  
✅ **实现了邮件通知功能**  
✅ **实现了钉钉通知功能**  
✅ **提供了完整的配置文档**  
✅ **提供了测试脚本**  

现在告警系统支持三种通知方式：
- WebSocket 推送（默认）
- 邮件通知（需配置）
- 钉钉通知（需配置）

用户可以根据需要选择一种或多种通知方式！

---

**创建时间**: 2026-02-09  
**完成时间**: 2026-02-09  
**状态**: ✅ 已完成
