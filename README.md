# EOMS（分布式运维监控系统）

> 当前阶段：核心链路可本地联调；已完成部分安全与契约修复；仍处于发布前工程化收口阶段。

## 项目概览

EOMS 由四个模块组成：

- `agent`：Python 采集端，负责节点注册与指标上报
- `backend`：Node.js 服务，提供 API、鉴权与 WebSocket
- `frontend`：Vue 3 控制台，负责监控展示、历史查询、报表、告警、AI 分析入口
- `electron`：桌面壳（当前仍使用 `nodeIntegration: true`，preload 迁移未实施）

## 当前真实状态（发布前）

已完成：

- 前端构建阻塞修复（`frontend` 可构建）
- 报表/AI 调用契约的最小修复与回归测试
- Agent 写入口与 WebSocket 的最小鉴权收口与回归测试

未完成（需人工评估后再发布）：

- Electron 安全整改落地（preload + `contextIsolation`）
- 完整生产部署与运维演练（告警通道、备份、恢复、可观测性）

说明：仓库当前不应宣称“已具备生产部署能力”。

## 端口与地址（默认）

- 前端开发服务：`http://localhost:5174`
- 后端 API：`http://localhost:50001`
- 后端 WebSocket：`ws://localhost:50001/ws/metrics`
- Redis：`localhost:6379`（可选）
- InfluxDB：`http://localhost:8086`（可选）

## 必填环境变量

后端（`backend/.env`）至少需要：

- `JWT_SECRET`：JWT 签名密钥
- `AGENT_API_TOKEN`：Agent 上报鉴权令牌（后端未配置时会拒绝 Agent 请求）

建议同步配置：

- `PORT=50001`
- `HOST=0.0.0.0`
- `ALLOW_DEFAULT_ADMIN_PASSWORD=false`

Agent（`agent/config.yaml`）至少需要：

- `server.url` 指向后端地址（默认应为 `http://localhost:50001`）
- `server.agent_token` 与后端 `AGENT_API_TOKEN` 保持一致

## 快速启动（本地联调）

1. 后端

```bash
cd backend
npm install
cp .env.example .env
# 填写 JWT_SECRET / AGENT_API_TOKEN
npm run dev
```

2. Agent

```bash
cd agent
pip install -r requirements.txt
# 检查 config.yaml 中 server.url 与 server.agent_token
python agent.py
```

3. 前端

```bash
cd frontend
npm install
npm run dev
```

访问：`http://localhost:5174`

## 质量门禁（最小）

- 前端构建：`cd frontend && npm run build`
- 后端测试：`cd backend && npm test`

## 相关文档

- [文档中心](./docs/README.md)
- [快速启动](./docs/START.md)
- [部署指南](./docs/部署指南.md)
- [测试指南](./docs/测试指南.md)
