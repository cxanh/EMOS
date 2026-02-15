# 🎯 端口更改总结

**日期**: 2026-02-08  
**问题**: Windows 系统端口权限问题  
**解决方案**: 使用高端口号 50001

---

## ✅ 问题已解决！

### 根本原因
Windows 系统（可能是 Hyper-V）保留了低端口范围（包括 3000-3100），导致 Node.js 无法绑定这些端口，即使使用 `127.0.0.1` 也会被拒绝。

### 解决方案
使用高端口号 **50001**，该端口在动态端口范围内（49152-65535），不会被系统保留。

---

## 📝 已修改的文件

### 1. 后端配置
**文件**: `backend/.env`
```env
# 修改前
PORT=3000

# 修改后
PORT=50001
```

### 2. 前端 API 配置
**文件**: `frontend/.env`
```env
# 修改前
VITE_API_BASE_URL=http://localhost:3000/api

# 修改后
VITE_API_BASE_URL=http://localhost:50001/api
```

### 3. 前端代理配置
**文件**: `frontend/vite.config.ts`
```typescript
// 修改前
server: {
  port: 5174,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  }
}

// 修改后
server: {
  port: 5174,
  proxy: {
    '/api': {
      target: 'http://localhost:50001',
      changeOrigin: true
    }
  }
}
```

---

## 🚀 当前服务状态

### 后端服务 ✅ 运行中
- **地址**: http://127.0.0.1:50001
- **健康检查**: http://127.0.0.1:50001/health
- **WebSocket**: ws://127.0.0.1:50001/ws/metrics
- **状态**: 正常运行

**日志输出**:
```
Redis Client Connected
Redis Client Ready
InfluxDB Client Connected
Data Store Service Initialized
info: WebSocket Server initialized
info: EOMS Backend Server running on http://127.0.0.1:50001
info: Environment: development
info: WebSocket available at ws://127.0.0.1:50001/ws/metrics
```

### Agent 服务 ⏸️ 待启动
- **命令**: `cd agent && python agent.py`
- **配置**: 需要确认 Agent 连接到正确的后端地址

### 前端服务 ⏸️ 待启动
- **命令**: `cd frontend && npm run dev`
- **地址**: http://localhost:5174
- **配置**: 已更新为连接到端口 50001

---

## 📋 下一步操作

### 1. 检查 Agent 配置

**文件**: `agent/config.yaml`

确认后端地址配置：
```yaml
backend:
  url: http://localhost:50001/api  # 确认端口是 50001
```

如果不是，需要修改。

### 2. 启动 Agent

```bash
cd agent
python agent.py
```

**预期输出**:
```
Agent started successfully
Connecting to backend: http://localhost:50001/api
Registration successful
```

### 3. 清除前端缓存并启动

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

### 4. 验证系统

#### 测试后端
```bash
curl http://localhost:50001/health
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-08T...",
    "uptime": 123.45,
    "redis": true,
    "websocket": 0
  }
}
```

#### 测试前端
1. 打开浏览器访问 http://localhost:5174
2. 按 `Ctrl + Shift + R` 硬刷新
3. 应该看到登录页面
4. 使用 admin/admin 登录

---

## 🔍 故障排查

### 如果 Agent 无法连接

**检查 `agent/config.yaml`**:
```yaml
backend:
  url: http://localhost:50001/api  # 端口必须是 50001
  timeout: 10
```

### 如果前端无法连接

**检查浏览器控制台**:
- 应该没有 CORS 错误
- API 请求应该指向 `http://localhost:50001/api`

**检查 Network 标签页**:
- API 请求的 URL 应该是 `http://localhost:5174/api/...`
- Vite 代理会自动转发到 `http://localhost:50001/api/...`

---

## 💡 重要提示

### 端口号变更影响

1. **开发环境**: 所有配置已更新，无需额外操作
2. **文档**: 文档中提到的端口 3000 现在应理解为 50001
3. **测试脚本**: 如果有硬编码端口的测试脚本，需要更新

### 为什么选择 50001

- **动态端口范围**: 49152-65535 是 IANA 推荐的动态/私有端口范围
- **不会被保留**: Windows 系统不会保留这些端口
- **无需权限**: 不需要管理员权限
- **稳定可靠**: 适合开发环境使用

### 生产环境建议

生产环境可以使用标准端口（如 80, 443），配合：
- Nginx 反向代理
- 适当的防火墙规则
- SSL/TLS 证书

---

## 📚 相关文档

- [Windows端口权限问题诊断](docs/Windows端口权限问题诊断.md) - 详细的问题分析和多种解决方案
- [后端端口权限问题修复](docs/后端端口权限问题修复.md) - 初始修复尝试
- [NEXT_STEPS.md](NEXT_STEPS.md) - 完整的启动指南

---

## ✅ 验证清单

完成以下检查确认系统正常：

- [x] 后端服务在 50001 端口运行
- [x] 后端配置已更新（.env）
- [x] 前端配置已更新（.env, vite.config.ts）
- [ ] Agent 配置已检查（config.yaml）
- [ ] Agent 服务已启动
- [ ] 前端服务已启动
- [ ] 可以访问登录页面
- [ ] 可以成功登录
- [ ] 可以看到仪表盘

---

**状态**: 后端已启动，等待 Agent 和前端启动  
**下一步**: 检查 Agent 配置并启动所有服务

---

**创建时间**: 2026-02-08  
**最后更新**: 2026-02-08
