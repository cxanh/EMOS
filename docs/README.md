# EOMS 文档中心

> 文档目标：反映当前仓库真实状态，不夸大“生产可用”。

## 快速入口

- [快速启动](./START.md)
- [测试指南](./测试指南.md)
- [部署指南](./部署指南.md)
- [当前状态总结](./当前状态总结.md)
- [AI Ops Phase 1A 方案](./ai-ops/PHASE_1A_PLAN.md)
- [AI Ops Phase 1A 任务清单](./ai-ops/PHASE_1A_TASKLIST.md)
- [ADR-001: AI Ops Phase 1A 边界](./adr/ADR-001-ai-ops-phase-1a-boundary.md)

## 当前状态（摘要）

已完成：

- 前端构建链路可通过
- 报表/AI 关键契约已补回归测试
- Agent 写入口与 WebSocket 已做最小鉴权收口

待完成：

- Electron preload 安全迁移
- 生产环境发布流程与运维演练

## 本仓库最小门禁命令

- 前端构建：`cd frontend && npm run build`
- 后端测试：`cd backend && npm test`

## 端口约定

- Frontend: `5174`
- Backend API/WebSocket: `50001`
- Redis: `6379`（可选）
- InfluxDB: `8086`（可选）

## 关键环境变量

- `JWT_SECRET`
- `AGENT_API_TOKEN`
