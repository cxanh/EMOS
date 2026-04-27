# EOMS 快速启动（与当前代码一致）

## 1. 前置条件

- Node.js 18+
- Python 3.8+
- 可选：Redis（6379）、InfluxDB（8086）

## 2. 后端启动

```bash
cd backend
npm install
cp .env.example .env
```

必须确认 `backend/.env` 至少包含：

- `PORT=50001`
- `JWT_SECRET=<your-secret>`
- `AGENT_API_TOKEN=<your-agent-token>`

启动后端：

```bash
npm run dev
```

健康检查：

```bash
curl http://localhost:50001/health
```

## 3. Agent 启动

编辑 `agent/config.yaml`：

- `server.url: http://localhost:50001`
- `server.agent_token` 必须与后端 `AGENT_API_TOKEN` 一致

运行：

```bash
cd agent
pip install -r requirements.txt
python agent.py
```

## 4. 前端启动

```bash
cd frontend
npm install
npm run dev
```

访问：`http://localhost:5174`

## 5. 最小发布前检查

```bash
cd frontend && npm run build
cd ../backend && npm test
```

## 6. 已知限制

- Electron 预加载安全迁移（preload / `contextIsolation`）尚未实施
- 本地可联调不等同于“已完成生产部署”
