> 历史记录/非当前基线
>
> 本文档为项目根目录迁移出的历史材料，仅用于追溯阶段背景、问题修复或功能完成过程。
> 当前项目入口与有效文档请以根目录 `README.md`、`DOCS.md` 和 `docs/` 目录中的 SSOT 文档为准。
# 🚀 服务启动指南

**更新日期**: 2026-02-08  
**端口变更**: 后端从 3000 改为 50001

---

## ✅ 当前状态

| 服务 | 状态 | 地址 | 说明 |
|------|------|------|------|
| 后端 | ✅ 运行中 | http://127.0.0.1:50001 | 已启动并正常运行 |
| Agent | ⏸️ 待启动 | - | 配置已更新 |
| 前端 | ⏸️ 待启动 | http://localhost:5174 | 配置已更新 |

---

## 🎯 快速启动（三步走）

### 步骤 1: 后端（已启动）✅

后端服务已经在运行，无需操作。

**验证**:
```bash
curl http://localhost:50001/health
```

### 步骤 2: 启动 Agent

**打开新终端**，运行：
```bash
cd agent
python agent.py
```

**预期输出**:
```
[INFO] Agent Configuration Loaded
[INFO] Node ID: node001
[INFO] Hostname: dev-machine
[INFO] Backend URL: http://localhost:50001
[INFO] Registering with backend...
[INFO] Registration successful
[INFO] Starting metrics collection...
[INFO] Collection interval: 1 seconds
```

**如果看到错误**:
- 确认 Python 已安装
- 确认依赖已安装：`pip install -r requirements.txt`
- 确认后端服务正在运行

### 步骤 3: 启动前端

**打开新终端**，运行：
```bash
cd frontend
rmdir /s /q node_modules\.vite
npm run dev
```

或使用脚本：
```bash
cd frontend
restart-dev.bat
```

**预期输出**:
```
VITE v7.2.4  ready in 1234 ms

➜  Local:   http://localhost:5174/
➜  Network: use --host to expose
➜  press h + enter to show help
```

---

## 🌐 访问系统

### 1. 打开浏览器

访问: http://localhost:5174

### 2. 硬刷新浏览器

按 `Ctrl + Shift + R` 清除缓存

### 3. 登录系统

- **用户名**: admin
- **密码**: admin

### 4. 验证功能

登录后应该看到：
- ✅ 侧边栏正常显示
- ✅ 仪表盘显示节点信息
- ✅ 可以查看实时数据
- ✅ 图表正常渲染

---

## 🔍 验证清单

### 后端验证

```bash
# 健康检查
curl http://localhost:50001/health

# 预期响应
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "...",
    "uptime": 123.45,
    "redis": true,
    "websocket": 0
  }
}
```

### Agent 验证

**检查终端输出**:
- [ ] 看到 "Registration successful"
- [ ] 看到 "Starting metrics collection"
- [ ] 每秒输出采集日志
- [ ] 无错误信息

**检查日志文件**:
```bash
cd agent
type agent.log
```

### 前端验证

**浏览器控制台（F12）**:
- [ ] Console 标签页无红色错误
- [ ] Network 标签页所有请求成功
- [ ] Elements 标签页 `<div id="app">` 有内容

**页面功能**:
- [ ] 登录页面正常显示
- [ ] 可以输入用户名密码
- [ ] 登录成功后跳转到主界面
- [ ] 侧边栏可以展开/收起
- [ ] 可以切换不同页面

---

## 🐛 故障排查

### 问题 1: Agent 无法连接后端

**错误信息**:
```
[ERROR] Failed to register with backend
[ERROR] Connection refused
```

**解决方案**:
1. 确认后端正在运行：`curl http://localhost:50001/health`
2. 检查 `agent/config.yaml` 中的 URL 是否为 `http://localhost:50001`
3. 检查防火墙是否阻止连接

### 问题 2: 前端页面空白

**解决方案**:
1. 打开浏览器开发者工具（F12）
2. 查看 Console 标签页的错误信息
3. 查看 Network 标签页的请求状态
4. 参考 `docs/前端空白页面问题排查.md`

### 问题 3: 前端无法连接后端

**错误信息**:
```
Network Error
Failed to fetch
```

**解决方案**:
1. 确认后端正在运行
2. 检查 `frontend/.env` 中的 API 地址
3. 检查 `frontend/vite.config.ts` 中的代理配置
4. 清除浏览器缓存并硬刷新

### 问题 4: WebSocket 连接失败

**错误信息**:
```
WebSocket connection failed
```

**解决方案**:
1. 确认后端 WebSocket 服务正常
2. 检查浏览器控制台的 WebSocket 错误
3. 确认没有代理或防火墙阻止 WebSocket

---

## 📊 服务端口总览

| 服务 | 端口 | 协议 | 用途 |
|------|------|------|------|
| 后端 API | 50001 | HTTP | REST API |
| 后端 WebSocket | 50001 | WebSocket | 实时数据推送 |
| 前端开发服务器 | 5174 | HTTP | 前端页面 |
| Redis | 6379 | TCP | 缓存和会话 |
| InfluxDB | 8086 | HTTP | 时序数据库 |

---

## 💡 开发提示

### 热重载

- **后端**: nodemon 自动检测文件变化并重启
- **前端**: Vite 自动热重载，无需刷新浏览器
- **Agent**: 需要手动重启

### 日志查看

**后端日志**:
```bash
# 实时查看
cd backend
type logs\combined.log

# 错误日志
type logs\error.log
```

**Agent 日志**:
```bash
cd agent
type agent.log
```

**前端日志**:
- 浏览器开发者工具 Console 标签页

### 停止服务

**停止所有服务**:
- 在每个终端按 `Ctrl + C`

**停止特定服务**:
- 切换到对应终端
- 按 `Ctrl + C`

---

## 🎉 成功标志

当所有服务正常运行时，你应该看到：

### 终端 1 - 后端
```
info: EOMS Backend Server running on http://127.0.0.1:50001
info: Environment: development
info: WebSocket available at ws://127.0.0.1:50001/ws/metrics
```

### 终端 2 - Agent
```
[INFO] Registration successful
[INFO] Starting metrics collection...
[INFO] Metrics sent successfully
```

### 终端 3 - 前端
```
➜  Local:   http://localhost:5174/
➜  Network: use --host to expose
```

### 浏览器
- 登录页面正常显示
- 可以成功登录
- 仪表盘显示节点数据
- 图表实时更新

---

## 📚 相关文档

- [PORT_CHANGE_SUMMARY.md](PORT_CHANGE_SUMMARY.md) - 端口变更详情
- [NEXT_STEPS.md](NEXT_STEPS.md) - 完整操作指南
- [docs/Windows端口权限问题诊断.md](docs/Windows端口权限问题诊断.md) - 问题诊断
- [docs/快速开始指南.md](docs/快速开始指南.md) - 环境搭建

---

## ✅ 最终检查清单

启动完成后，验证以下项目：

- [ ] 后端服务运行在 50001 端口
- [ ] 后端健康检查返回正常
- [ ] Agent 成功注册到后端
- [ ] Agent 正在采集和发送数据
- [ ] 前端服务运行在 5174 端口
- [ ] 可以访问登录页面
- [ ] 可以成功登录（admin/admin）
- [ ] 仪表盘显示节点信息
- [ ] 可以看到实时数据更新
- [ ] 浏览器控制台无错误

---

**祝你使用愉快！** 🎊

如有任何问题，请查看相关文档或检查日志文件。

