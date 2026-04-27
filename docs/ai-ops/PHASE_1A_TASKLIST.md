# AI Ops Phase 1A 任务清单（执行准备）

> 目标：仅搭建 Phase 1A 最小闭环，不进入 node_action，不实现前端。

## 1. 后端文件清单

### 新增

1. `backend/routes/aiV2.js`
2. `backend/services/aiOps/aiOpsOrchestrator.js`
3. `backend/services/aiOps/actionRegistry.js`
4. `backend/services/aiOps/actionPolicy.js`
5. `backend/services/aiOps/actionDryRun.js`
6. `backend/services/aiOps/actionExecutor.js`
7. `backend/services/aiOps/actionVerifier.js`
8. `backend/services/aiOps/actionAudit.js`
9. `backend/services/aiOps/actionRequestStore.js`
10. `backend/services/aiOps/incidentTimelineService.js`
11. `backend/actions/platform/acknowledgeAlert.js`
12. `backend/actions/platform/createIncidentTimelineNote.js`

### 修改

1. `backend/index.js`（挂载 `/api/ai/v2` 路由）
2. `backend/middleware/auth.js`（补 `requireRoles`）
3. `backend/services/aiService.js`（增加推荐动作输出）
4. `backend/services/alertService.js`（补告警确认的统一入口）

## 2. 测试文件清单

### 新增测试

1. `backend/tests/aiV2.route.test.js`
2. `backend/tests/aiOps.dryrun.test.js`
3. `backend/tests/aiOps.execution.test.js`
4. `backend/tests/aiOps.audit.test.js`
5. `backend/tests/aiOps.store.test.js`

### 推荐沿用

1. 现有 `backend/tests/*.test.js` 运行方式：`node --test "tests/*.test.js"`

## 3. 推荐开发顺序

### 批次 A：骨架与类型约束

1. 建立 aiOps 目录结构与模块导出。
2. 搭建 `actionRegistry` 与两个动作 definition 注册。
3. 搭建 `actionRequestStore` 接口与基础存取结构。
4. 搭建 `aiV2` 路由空实现与参数解析骨架。

验收标准：

1. 服务可启动。
2. 路由可达并返回占位响应。
3. 测试可加载模块且无语法/导出错误。

### 批次 B：dry-run 与策略骨架

1. 接入 `actionPolicy`（含资源级钩子 stub）。
2. 接入 `actionDryRun` 输出标准结构。
3. 路由 `POST /action-requests` 走通到 `DRY_RUN_READY` 状态。

验收标准：

1. dry-run 响应结构完整（含 `dryRunResult`、`resolvedParams`）。
2. viewer 角色请求被拒绝。
3. 审计中有 `ACTION_REQUESTED`、`ACTION_DRY_RUN_COMPLETED`。

### 批次 C：执行与复检骨架

1. `confirm` 流程接入执行器、复检器与状态机推进。
2. 接入两个动作 handler。
3. 完成时间线查询与审计写入。

验收标准：

1. 状态推进到 `SUCCEEDED/FAILED`。
2. `GET /action-requests/:id` 与 `timeline` 可查询。
3. 审计链条完整（请求、dry-run、确认、执行、复检、结束）。

## 4. 每批验收标准（汇总）

1. API 返回结构稳定、错误码可预期。
2. 状态机无非法跳转。
3. 幂等键重复请求不会重复创建执行记录。
4. 审计事件包含 `dryRunResult` 与 `resolvedParams`。
5. 所有新增测试可在本地通过。

## 5. 当前 stub / mock 点

1. `actionPolicy.canAccessIncident`：先 stub。
2. `actionPolicy.canOperateRule`：先 stub。
3. `incidentTimelineService`：先 stub 写入成功。
4. `alertService` 的确认接口：先 mock 成功/失败分支。
5. `redisClient.client`：测试中统一 mock。
6. `actionVerifier`：先返回可控三态结果用于流程测试。

## 6. 勾选式任务列表

### 6.1 基础结构

- [ ] 创建 `backend/services/aiOps` 目录与模块骨架
- [ ] 创建 `backend/actions/platform` 两个动作文件
- [ ] 创建 `backend/routes/aiV2.js`
- [ ] 在 `backend/index.js` 挂载 v2 路由

### 6.2 策略与 dry-run

- [ ] 增加 `requireRoles` 中间件
- [ ] 完成 `actionPolicy` 接口与资源钩子 stub
- [ ] 完成 `actionDryRun` 接口与标准返回结构
- [ ] 接通 `POST /api/ai/v2/action-requests`

### 6.3 执行与复检

- [ ] 接通 `POST /api/ai/v2/action-requests/:requestId/confirm`
- [ ] 接入 `actionExecutor` 与两个 platform action handler
- [ ] 接入 `actionVerifier`
- [ ] 接通 `GET /api/ai/v2/action-requests/:requestId`
- [ ] 接通 `GET /api/ai/v2/action-requests/:requestId/timeline`

### 6.4 审计与存储

- [ ] 完成 `actionRequestStore` 读写与索引
- [ ] 完成 `actionAudit` 事件写入
- [ ] 审计字段包含 `dryRunResult` 与 `resolvedParams`

### 6.5 测试

- [ ] 新增 `aiV2.route.test.js`
- [ ] 新增 `aiOps.dryrun.test.js`
- [ ] 新增 `aiOps.execution.test.js`
- [ ] 新增 `aiOps.audit.test.js`
- [ ] 新增 `aiOps.store.test.js`
- [ ] `npm test` 全通过

