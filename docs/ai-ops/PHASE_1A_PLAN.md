# AI Ops Phase 1A 实施方案（冻结版）

## 1. 背景与目标

当前 EOMS 的 AI 能力主要是分析与建议（健康检查、趋势分析、优化建议），尚未形成“受控动作闭环”。

Phase 1A 的目标是建立最小可用闭环：

1. AI 分析后给出可执行建议。
2. 用户发起动作请求并先执行 dry-run。
3. 用户确认后执行受控动作（仅平台内动作）。
4. 执行后自动复检。
5. 记录完整审计与时间线。

本阶段明确不引入任意 shell 与节点资源操作。

## 2. Phase 1A 范围

Phase 1A 仅覆盖 `platform_action` 最小闭环，包含：

1. `POST /api/ai/v2/analyze` 返回分析结果与推荐动作。
2. `POST /api/ai/v2/action-requests` 创建动作请求并执行 dry-run。
3. `POST /api/ai/v2/action-requests/:requestId/confirm` 用户确认执行。
4. 后端执行 `platform_action`。
5. 后端自动复检并写入结果。
6. 记录审计事件与执行时间线。
7. 前端展示执行时间线与执行结果（轮询方式）。

## 3. 明确不做的内容（Phase 1A）

1. 不做 `node_action` 的真实执行链路。
2. 不做任意 shell 动作。
3. 不做审批中心与多级审批流。
4. 不做高风险动作与回滚编排。
5. 不做系统级 AI 设置页开发。
6. 不做 WebSocket 动作状态实时推送（先用轮询）。
7. 不做 `trigger_metrics_recheck`（暂移出，见 ADR）。

## 4. `platform_action` / `node_action` 分层说明

### 4.1 platform_action

1. 执行位置：平台后端服务内部。
2. 作用对象：平台数据与运维流程对象（告警事件、事件时间线等）。
3. 鉴权：用户 JWT + RBAC（admin/operator/viewer）。
4. 风险：低风险、可追溯、可在平台侧复检。

### 4.2 node_action（本阶段仅保留分层，不实现）

1. 执行位置：agent/节点侧执行器。
2. 作用对象：节点本地资源（进程、目录、采样任务等）。
3. 鉴权：用户 JWT + 平台下发令牌 + agent 身份校验。
4. 风险：涉及真实资源改动，需后续阶段单独引入审批与隔离策略。

## 5. 当前仅保留的两个动作

1. `acknowledge_alert`
   - 说明：对指定告警事件做“已确认”操作，并写入备注。
   - 风险级别：low
2. `create_incident_timeline_note`
   - 说明：对指定事件写入平台时间线注释。
   - 风险级别：low

## 6. 状态机

Phase 1A 状态机：

`REQUESTED -> DRY_RUN_READY -> CONFIRMED -> EXECUTING -> VERIFYING -> SUCCEEDED | FAILED`

状态说明：

1. `REQUESTED`：请求已创建。
2. `DRY_RUN_READY`：dry-run 完成，允许用户确认。
3. `CONFIRMED`：用户确认执行。
4. `EXECUTING`：动作处理中。
5. `VERIFYING`：动作后复检处理中。
6. `SUCCEEDED`：执行与复检通过（或复检可接受）。
7. `FAILED`：执行失败或复检失败。

## 7. API 草案

### 7.1 `POST /api/ai/v2/analyze`

请求示例：

```json
{
  "scope": "system",
  "question": "检查当前告警并给出可执行建议"
}
```

响应示例：

```json
{
  "success": true,
  "data": {
    "analysisId": "analysis_1740000000_xxx",
    "findings": [],
    "recommendedActions": [
      {
        "actionClass": "platform_action",
        "actionId": "acknowledge_alert",
        "riskLevel": "low",
        "defaultParams": {
          "eventId": "event_123",
          "comment": "AI 建议确认"
        }
      }
    ]
  }
}
```

### 7.2 `POST /api/ai/v2/action-requests`

用途：创建请求并执行 dry-run。

请求示例：

```json
{
  "actionClass": "platform_action",
  "actionId": "create_incident_timeline_note",
  "incidentId": "event_123",
  "params": {
    "incidentId": "event_123",
    "note": "值班同学已接手排查"
  },
  "idempotencyKey": "event_123-note-001"
}
```

响应示例：

```json
{
  "success": true,
  "data": {
    "requestId": "actreq_001",
    "status": "DRY_RUN_READY",
    "dryRun": {
      "allowed": true,
      "riskLevel": "low",
      "warnings": [],
      "impact": {
        "entities": ["incident:timeline:event_123"],
        "estimatedDurationSec": 1,
        "summary": "将新增一条事件时间线记录"
      },
      "resolvedParams": {
        "incidentId": "event_123",
        "note": "值班同学已接手排查",
        "visibility": "internal"
      }
    }
  }
}
```

### 7.3 `POST /api/ai/v2/action-requests/:requestId/confirm`

请求示例：

```json
{
  "confirm": true
}
```

响应示例：

```json
{
  "success": true,
  "data": {
    "requestId": "actreq_001",
    "status": "EXECUTING"
  }
}
```

### 7.4 `GET /api/ai/v2/action-requests/:requestId`

响应示例：

```json
{
  "success": true,
  "data": {
    "requestId": "actreq_001",
    "status": "SUCCEEDED",
    "executionResult": { "ok": true },
    "verificationResult": { "status": "pass", "checks": [] }
  }
}
```

### 7.5 `GET /api/ai/v2/action-requests/:requestId/timeline`

响应示例：

```json
{
  "success": true,
  "data": {
    "requestId": "actreq_001",
    "events": []
  }
}
```

## 8. Redis / 存储键设计

1. `ai:v2:action:request:{requestId}`：动作请求主记录（Hash/JSON 字段）。
2. `ai:v2:action:timeline:{requestId}`：动作时间线事件（List）。
3. `ai:v2:action:requests`：全局请求索引（ZSet）。
4. `ai:v2:action:requests:by_user:{userId}`：用户请求索引（ZSet）。
5. `ai:v2:action:idempotency:{key}`：幂等映射（String + TTL）。
6. `ai:v2:action:lock:{requestId}`：执行锁（String NX EX）。
7. `ai:v2:audit:event:{eventId}`：单条审计事件（Hash）。
8. `ai:v2:audit:events`：审计索引（ZSet）。
9. `incident:timeline:{incidentId}`：事件时间线索引（ZSet）。
10. `incident:timeline:note:{noteId}`：时间线条目详情（Hash）。

## 9. 审计字段

审计事件统一结构（核心字段）：

1. `eventId`
2. `requestId`
3. `traceId`
4. `eventType`
5. `timestamp`
6. `actorType`
7. `actorId`
8. `actorRole`
9. `actionClass`
10. `actionId`
11. `incidentId`
12. `statusFrom`
13. `statusTo`
14. `riskLevel`
15. `dryRunResult`
16. `resolvedParams`
17. `error`

## 10. 测试范围

后端优先自动化测试（`node --test`）：

1. 路由鉴权与角色校验。
2. dry-run 参数校验与权限判定。
3. `acknowledge_alert` 正常/异常路径。
4. `create_incident_timeline_note` 正常/异常路径。
5. 状态机推进与幂等行为。
6. 审计事件完整性与关键字段覆盖。
7. 时间线查询正确性。

前端（Phase 1A）以回归清单为主：

1. dry-run 结果展示。
2. confirm 后状态推进。
3. 时间线与结果展示。

## 11. Phase 1B 延后项

1. `node_action` 执行链路（下发、执行回传、补偿）。
2. 审批中心与审批策略引擎。
3. `trigger_metrics_recheck` 的可验证化定义与落地。
4. 动作结果实时推送（WebSocket）。
5. 系统级 AI 设置页（管理员专属）。
6. 高风险动作与回滚机制。

