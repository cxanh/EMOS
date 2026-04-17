# EOMS 文档中心

> 目标：以当前仓库真实状态为准，提供面向开发、测试、部署与 AI Ops 实施的统一入口。

---

## 当前有效文档

以下文档建议作为当前阶段的主入口：

- [根 README](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/README.md)
- [快速启动](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/docs/START.md)
- [快速开始指南](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/docs/快速开始指南.md)
- [测试指南](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/docs/测试指南.md)
- [部署指南](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/docs/部署指南.md)
- [当前状态总结](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/docs/当前状态总结.md)
- [开发进度](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/docs/开发进度.md)
- [技术实施细节](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/docs/技术实施细节.md)
- [历史归档](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/docs/archive/README.md)

---

## 当前项目状态

基于当前代码仓库在 `2026-04-17` 的核查结果，项目处于：

**开发中后期，进入发布前工程化收口阶段**

当前已确认：

- 前端构建可通过
- 后端测试可运行
- Agent 语法检查可运行
- 告警、用户管理、报表、AI 分析与 AI Ops Phase 1A 均已有实现基础

当前仍需持续收口：

- Electron 安全迁移
- 鉴权边界统一审查
- 生产部署与运维演练
- AI Ops Phase 2 文档基线落地后的分批实施

---

## AI Ops 文档入口

当前 AI Ops 相关实施基线文档如下：

- [AI Ops Phase 1A 实施方案](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/docs/ai-ops/PHASE_1A_PLAN.md)
- [AI Ops Phase 1A 任务清单](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/docs/ai-ops/PHASE_1A_TASKLIST.md)
- [AI Ops Phase 2 实施方案](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/docs/ai-ops/PHASE_2_PLAN.md)
- [AI Ops Phase 2 任务清单](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/docs/ai-ops/PHASE_2_TASKLIST.md)
- [Batch 7 对话式 AI 分析页实施方案](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/docs/ai-ops/BATCH_7_CHAT_ANALYSIS_PLAN.md)
- [ADR-001: AI Ops Phase 1A 边界决策](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/docs/adr/ADR-001-ai-ops-phase-1a-boundary.md)
- [ADR-002: Phase 2 设置、对话、Catalog 顺序决策](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/docs/adr/ADR-002-phase-2-ai-settings-chat-catalog.md)
- [ADR-003: Batch 7 对话分析边界决策](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/docs/adr/ADR-003-batch-7-chat-analysis-boundary.md)

Phase 2 / Batch 7 文档使用说明：

1. `PHASE_2_PLAN.md` 用于固定 Phase 2 的范围、边界、架构落点与批次顺序。
2. `ADR-002` 用于固定关键取舍，避免后续实现过程中发生范围漂移。
3. `PHASE_2_TASKLIST.md` 用于 Batch 5 / 6 / 7 / 8 的执行拆分、文件清单与验收对照。
4. `BATCH_7_CHAT_ANALYSIS_PLAN.md` 用于固定 Batch 7 对话式 AI 分析页的页面、接口、上下文与短会话边界。
5. `ADR-003` 用于固定 Batch 7 的独立页、短会话、跳转执行与非流式输出边界。

---

## 端口约定

当前默认端口以 [backend/.env.example](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/backend/.env.example) 为准：

- Frontend：`5174`
- Backend API：`50001`
- WebSocket：`50001`
- Redis：`6379`
- InfluxDB：`8086`

---

## 最小验证命令

前端构建：

```bash
cd frontend
npm run build
```

后端测试：

```bash
cd backend
npm test
```

Agent 语法检查：

```bash
cd agent
python -m py_compile agent.py
```

---

## 关键环境变量

- `JWT_SECRET`
- `AGENT_API_TOKEN`
- `PORT=50001`
- `HOST=0.0.0.0`
- `ALLOW_DEFAULT_ADMIN_PASSWORD=false`
- `LLM_PROVIDER`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`

---

## 文档维护规则

- 单一事实源：运行与发布状态以根 [README](/C:/Users/ASUS/Desktop/01_学习资料/毕设/EOMS/README.md) 和本页为准
- 面向启动、测试、部署的文档必须与当前代码一致
- AI Ops 的范围、边界与批次实施以 `docs/ai-ops/` 与 `docs/adr/` 下的基线文档为准
- 历史修复报告、排障说明默认视为历史记录，不作为当前配置基线
- 若文档与代码冲突，应优先修正文档，避免继续沿用旧口径

---

## 文档整理结果

当前已形成以下文档层级：

- 通用项目入口文档：`docs/`
- AI Ops 实施基线：`docs/ai-ops/`
- 关键架构决策：`docs/adr/`
- 历史归档：`docs/archive/`

建议后续继续处理：

1. 将零散历史修复报告持续迁入 `docs/archive/`
2. 为保留文档补充“历史记录”标识
3. 对仍引用旧端口或旧流程的历史文档逐步归档
