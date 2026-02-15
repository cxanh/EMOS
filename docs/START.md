# 🚀 快速启动指南

## 前置条件

确保已安装：
- ✅ Node.js 18+
- ✅ Python 3.8+
- ✅ Redis (可选，用于数据缓存)
- ✅ InfluxDB (可选，用于历史数据)

---

## 步骤 1: 启动 Redis (可选)

```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Windows
redis-server
```

验证 Redis:
```bash
redis-cli ping
# 应返回: PONG
```

---

## 步骤 2: 启动后端服务

```bash
# 进入后端目录
cd backend

# 安装依赖 (首次运行)
npm install

# 启动开发服务器
npm run dev
```

后端服务将在以下端口启动：
- HTTP API: http://localhost:3000
- WebSocket: ws://localhost:3000/ws/metrics

---

## 步骤 3: 启动 Agent

**新开一个终端窗口**

```bash
# 进入 Agent 目录
cd agent

# 安装依赖 (首次运行)
pip install -r requirements.txt

# 启动 Agent
python agent.py
```

你应该看到类似输出：
```
EOMS Agent starting...
Node ID: node001
Hostname: dev-machine
Agent registered successfully
✓ CPU: 45.2% | MEM: 68.5% | DISK: 72.3%
```

---

## 步骤 4: 启动前端

**新开一个终端窗口**

```bash
# 进入前端目录
cd frontend

# 安装依赖 (首次运行)
npm install

# 启动开发服务器
npm run dev
```

前端将在 http://localhost:5174 启动

---

## 步骤 5: 访问应用

打开浏览器访问: http://localhost:5174

**默认登录账号**:
- 用户名: `admin`
- 密码: `admin`

---

## 🧪 测试 API

### 测试健康检查
```bash
curl http://localhost:3000/health
```

### 测试登录
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

### 测试获取节点列表
```bash
curl http://localhost:3000/api/agent/list
```

### 测试获取最新数据
```bash
curl http://localhost:3000/api/metrics/latest/node001
```

---

## 🐛 常见问题

### Q: Redis 连接失败
**A**: 确保 Redis 服务已启动，或在 `.env` 中禁用 Redis

### Q: Agent 无法连接后端
**A**: 检查后端服务是否启动，检查 `agent/config.yaml` 中的服务器地址

### Q: 前端无法获取数据
**A**: 检查后端服务是否启动，检查浏览器控制台错误信息

---

## 📝 下一步

### ✅ 核心功能已完成

系统已完成阶段一和阶段二的所有开发任务，具备以下功能：

- ✅ 多节点实时监控 (1秒数据采集)
- ✅ WebSocket 实时数据推送 (<2s 延迟)
- ✅ 历史数据查询和导出
- ✅ JWT 认证授权
- ✅ Redis 缓存 + InfluxDB 时序存储
- ✅ ECharts 可视化图表
- ✅ 响应式 UI 设计
- ✅ 跨平台 Python Agent

### 📚 推荐阅读

1. 查看 **[测试指南.md](./测试指南.md)** 进行系统测试
2. 查看 **[开发进度.md](./开发进度.md)** 了解详细进度
3. 查看 **[部署指南.md](./部署指南.md)** 部署到生产环境
4. 查看 **[项目完成报告.md](./项目完成报告.md)** 了解项目成果
5. 查看 **[文档中心](./README.md)** 浏览所有文档

### 🚀 可选功能

如需继续开发高级功能，可参考：
- 阶段三：智能分析功能 (LLM 集成)
- 阶段四：系统完善与优化 (告警、性能优化)

详见 **[任务目录.md](./任务目录.md)**

---

**祝开发顺利！** 🎉
