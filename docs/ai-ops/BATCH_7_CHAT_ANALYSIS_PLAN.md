# Batch 7 对话式 AI 分析页实施方案（基线版）

## 1. 背景与目标

在 AI 设置中心完成后，EOMS 已具备系统级 AI 配置能力，也已具备以下现有基础：

1. 结构化 AI 分析入口已存在，页面为 `frontend/src/views/AIAnalysis.vue`。
2. AI Ops 动作闭环入口已存在，页面为 `frontend/src/views/AIOpsAssistant.vue`。
3. 平台受控动作已通过现有 `ai/v2` 闭环与 action registry 管理。

当前缺口在于：

1. 用户只能发起固定结构化分析，无法围绕设备、告警、指标上下文连续追问。
2. `AIAnalysis.vue` 擅长“一次性结构化输出”，但不适合承载多轮上下文解释。
3. 用户在得到 AI 建议后，缺少从“分析结果”安全过渡到“动作执行入口”的中间层。

Batch 7 的目标是交付一个最小可用的“对话式 AI 分析页”，让用户能够基于当前运维上下文提问，并获得：

1. AI 分析回答。
2. 结构化结论。
3. 推荐动作卡片。
4. 跳转到现有 `AIOpsAssistant.vue` 的动作执行入口。

Batch 7 的核心定位不是通用聊天系统，而是“带上下文的运维分析页”。

---

## 2. 范围与边界

### 2.1 本批次范围

Batch 7 仅覆盖以下能力：

1. 新增独立页面 `AIChatAnalysis.vue`。
2. 支持围绕节点、告警、指标时间范围进行短会话追问。
3. AI 回答中固定返回结构化结论。
4. AI 回答中固定返回推荐动作卡片。
5. 推荐动作卡片跳转到现有 `AIOpsAssistant.vue` 预填参数。

### 2.2 必须遵守的边界

1. 不是普通聊天页，而是运维分析页。
2. 不直接执行动作，不绕过 `ai/v2` 的 `dry-run / confirm`。
3. 第一版只做短会话，不做长期 memory / agent。
4. 不做审批流。
5. 不做 Skill Catalog 页面。
6. 不做流式输出。

### 2.3 额外实现约束

1. 上下文摘要必须由后端生成，前端只传 `nodeId / incidentId / timeRange / question`。
2. 推荐动作必须来自现有白名单 action registry，不允许模型自由生成未知 action。
3. 短会话必须有 TTL、消息条数上限、最近会话数量上限。
4. Batch 7 第一版不做流式输出，统一采用请求-响应式接口。

---

## 3. 为什么新增独立 `AIChatAnalysis.vue`，而不是把聊天塞进 `AIAnalysis.vue`

本批次推荐新增独立页面 `AIChatAnalysis.vue`，而不是把聊天功能直接塞进 `AIAnalysis.vue`。

原因如下：

1. `AIAnalysis.vue` 当前承担的是结构化、一键式分析工作台，职责已经清晰。
2. 对话式分析需要消息流、上下文条、推荐动作卡片、短会话状态等新结构，直接塞入现有页面会造成职责混杂。
3. 独立页面更容易保持“结构化分析”和“多轮追问”两个入口的边界。
4. 如果把聊天强塞进 `AIAnalysis.vue`，后续页面状态、交互流程和维护成本都会明显上升。
5. 独立页更利于从节点详情、告警列表、结构化分析结果等不同入口统一承接上下文。

结论：

1. `AIAnalysis.vue` 继续做结构化分析。
2. `AIChatAnalysis.vue` 专门负责多轮运维追问。
3. 两者并存，并通过跳转串联。

---

## 4. 页面结构设计

建议新增页面：`frontend/src/views/AIChatAnalysis.vue`

### 4.1 顶部状态区

顶部区域展示：

1. 页面标题：`AI 对话分析`
2. AI 当前状态：`enabled / provider / model`
3. 当前上下文摘要：节点、告警、时间范围
4. 返回入口：返回 `AIAnalysis.vue`

### 4.2 上下文条

使用 chip 或 badge 展示当前上下文：

1. `nodeId`
2. `incidentId`
3. `timeRange`
4. 可选来源标签：
   - 来自节点详情
   - 来自告警页
   - 来自结构化分析页

### 4.3 对话主区域

主区域按消息流展示：

1. 用户问题
2. AI 回答
3. 每条 AI 回答下方的结构化结论区

### 4.4 结构化结论区

每条 AI 回答的结论区建议固定包含：

1. `summary`
2. `riskLevel`
3. `keyFindings`
4. `affectedEntities`

### 4.5 推荐动作卡片区

在 AI 结论区下方展示推荐动作卡片，卡片包含：

1. 动作名称
2. 风险等级
3. 推荐原因
4. 将要预填的关键参数摘要
5. “去 AI Ops 助手执行”按钮

### 4.6 输入区

底部输入区建议包含：

1. 文本输入框
2. 快捷问题模板
3. 发送按钮

第一版不做：

1. 文件上传
2. 日志附件
3. 流式 token 输出
4. 多栏复杂会话管理器

---

## 5. 上下文模型

Batch 7 的前后端上下文模型必须保持克制。

### 5.1 前端请求模型

前端请求只允许传以下四个字段：

```ts
type ChatAnalysisRequest = {
  nodeId?: string
  incidentId?: string
  timeRange: '24h' | '7d' | '30d'
  question: string
}
```

字段语义如下：

1. `nodeId`
   - 当前分析对象为某个节点或设备。
2. `incidentId`
   - 当前分析对象为某条告警事件或 incident。
3. `timeRange`
   - 指标时间窗口，限定为 `24h / 7d / 30d`。
4. `question`
   - 用户自然语言问题，必填。

### 5.2 后端上下文摘要模型

前端不得自行拼装大段 prompt。上下文摘要必须由后端生成。

后端摘要建议至少包括：

1. 节点当前健康状态摘要。
2. 时间窗口内指标摘要。
3. 关联告警摘要。
4. 可选的最近结构化分析结果摘要。

建议后端内部上下文结构：

```js
{
  node: {
    nodeId,
    status,
    cpu,
    memory,
    disk
  },
  incident: {
    incidentId,
    severity,
    status,
    summary
  },
  metricsSummary: {
    timeRange,
    peaks: [],
    anomalies: [],
    trend: ''
  },
  latestAnalysisSummary: {
    type: '',
    summary: ''
  }
}
```

### 5.3 AI 输出模型

AI 回答建议固定输出以下结构：

```ts
type ChatAnalysisAnswer = {
  answer: string
  conclusion: {
    summary: string
    riskLevel: 'low' | 'medium' | 'high'
    keyFindings: string[]
    affectedEntities: string[]
  }
  recommendedActions: Array<{
    actionClass: 'platform_action'
    actionId: string
    title: string
    reason: string
    riskLevel: 'low' | 'medium' | 'high'
    prefillParams: Record<string, unknown>
  }>
}
```

### 5.4 推荐动作来源约束

推荐动作不能由模型自由生成。

推荐动作的生成必须遵守：

1. 模型只能从后端提供的白名单动作集合中选择。
2. 白名单动作来源于现有 action registry。
3. 若模型输出未知 `actionId`，后端必须过滤或丢弃。
4. 最终返回给前端的 `recommendedActions` 必须全部通过 action registry 校验。

---

## 6. 与 `AIAnalysis.vue` 的关系

结论：并存，不替换。

职责划分如下：

1. `AIAnalysis.vue`
   - 继续承担结构化、一键式分析。
   - 输出健康检查、趋势分析、优化建议等固定形态结果。
2. `AIChatAnalysis.vue`
   - 负责围绕已有上下文做连续追问、解释、归因和建议。

页面联动方式：

1. 在 `AIAnalysis.vue` 的分析结果区增加“继续追问”入口。
2. 跳转到 `AIChatAnalysis.vue` 时，仅传：
   - `nodeId`
   - `incidentId`
   - `timeRange`
   - 可选初始问题
3. 不直接把整个结构化分析结果由前端拼成 prompt。
4. 若需要利用结构化分析结果，仍由后端基于已有数据重新生成摘要。

---

## 7. 与 `AIOpsAssistant.vue` 的联动方式

`AIOpsAssistant.vue` 继续作为唯一动作执行入口。

### 7.1 联动原则

1. 聊天页只负责推荐动作。
2. 实际动作创建、dry-run、confirm、执行与回显仍由 `AIOpsAssistant.vue` 负责。
3. 聊天页不能直接调用动作执行接口。

### 7.2 联动方式

推荐动作卡片点击后跳转到：

`/ai-ops-assistant`

并携带预填参数，建议通过 query 或 store 传递：

1. `actionId`
2. `eventId`
3. `incidentId`
4. `ruleId`
5. `comment`
6. `note`
7. `reason`

### 7.3 交互要求

1. 聊天页卡片文案明确写明“去 AI Ops 助手执行”。
2. 不使用“立即执行”这类误导性措辞。
3. 到达 `AIOpsAssistant.vue` 后，仍由用户执行：
   - 参数确认
   - dry-run
   - confirm
   - 查看结果

---

## 8. backend / frontend 文件级实施方案

本批次建议沿用当前仓库 Batch 6 的命名风格，不重新发明目录层级。

## 8.1 backend 文件清单

### 新增

1. `backend/routes/aiChat.js`
   - 对话分析路由。
2. `backend/services/aiChatService.js`
   - 聊天分析主服务。
3. `backend/services/aiChatStore.js`
   - 短会话与消息存储。
4. `backend/services/aiContextService.js`
   - 上下文摘要构建服务。
5. `backend/tests/aiChat.route.test.js`
   - 路由、鉴权、输入校验测试。
6. `backend/tests/aiChat.service.test.js`
   - 上下文摘要、推荐动作过滤、输出结构测试。

### 修改

1. `backend/index.js`
   - 挂载 `/api/ai/v2/chat` 路由。
2. `backend/services/aiService.js`
   - 复用已有模型调用与运行时设置能力。
3. `backend/services/aiOps/actionRegistry.js`
   - 提供白名单动作查询能力给聊天服务使用。

## 8.2 frontend 文件清单

### 新增

1. `frontend/src/views/AIChatAnalysis.vue`
   - 对话式 AI 分析页。
2. `frontend/src/api/aiChat.ts`
   - 对话分析 API 封装。
3. `frontend/src/stores/aiChat.ts`
   - 对话页状态管理。
4. `frontend/src/components/ai-chat/ChatMessageList.vue`
   - 消息流展示。
5. `frontend/src/components/ai-chat/ChatComposer.vue`
   - 输入区与快捷问题。
6. `frontend/src/components/ai-chat/ConclusionCard.vue`
   - 结构化结论展示。
7. `frontend/src/components/ai-chat/RecommendedActionCards.vue`
   - 推荐动作卡片。
8. `frontend/src/components/ai-chat/ContextBar.vue`
   - 当前上下文条。

### 修改

1. `frontend/src/router/index.ts`
   - 新增 `AIChatAnalysis` 路由。
2. `frontend/src/views/AIAnalysis.vue`
   - 增加“继续追问”入口。
3. `frontend/src/views/AIOpsAssistant.vue`
   - 支持接收预填参数。
4. `frontend/src/components/Sidebar.vue`
   - 可选新增导航入口。

---

## 9. API 草案

Batch 7 建议统一挂载在：

`/api/ai/v2/chat`

### 9.1 创建短会话

`POST /api/ai/v2/chat/sessions`

请求：

```json
{
  "nodeId": "node-001",
  "incidentId": "incident-001",
  "timeRange": "24h",
  "question": "这台机器最近为什么 CPU 持续偏高？"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "sessionId": "chat_001",
    "context": {
      "nodeId": "node-001",
      "incidentId": "incident-001",
      "timeRange": "24h"
    },
    "message": {
      "messageId": "msg_001",
      "role": "assistant",
      "answer": "......",
      "conclusion": {
        "summary": "......",
        "riskLevel": "medium",
        "keyFindings": ["..."],
        "affectedEntities": ["node:node-001"]
      },
      "recommendedActions": []
    }
  }
}
```

### 9.2 获取会话元信息

`GET /api/ai/v2/chat/sessions/:sessionId`

作用：

1. 获取当前会话上下文。
2. 获取消息统计。
3. 获取会话状态。

### 9.3 获取消息列表

`GET /api/ai/v2/chat/sessions/:sessionId/messages`

作用：

1. 恢复当前短会话消息流。

### 9.4 在已有会话中追问

`POST /api/ai/v2/chat/sessions/:sessionId/messages`

请求：

```json
{
  "question": "这个问题和最近告警有没有关系？"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "sessionId": "chat_001",
    "message": {
      "messageId": "msg_002",
      "role": "assistant",
      "answer": "......",
      "conclusion": {
        "summary": "......",
        "riskLevel": "low",
        "keyFindings": ["..."],
        "affectedEntities": ["incident:incident-001"]
      },
      "recommendedActions": [
        {
          "actionClass": "platform_action",
          "actionId": "acknowledge_alert",
          "title": "确认告警事件",
          "reason": "......",
          "riskLevel": "low",
          "prefillParams": {
            "eventId": "incident-001"
          }
        }
      ]
    }
  }
}
```

### 9.5 关闭会话（可选）

`DELETE /api/ai/v2/chat/sessions/:sessionId`

此接口为可选，不是第一优先级。

### 9.6 接口要求

1. 所有接口要求登录态。
2. 第一版不做流式输出，不提供 SSE / WebSocket token stream。
3. 所有 AI 回复必须返回：
   - `answer`
   - `conclusion`
   - `recommendedActions`
4. `recommendedActions` 必须经过 action registry 白名单过滤。

---

## 10. 会话存储建议（短会话）

Batch 7 继续使用 Redis，且只做短会话存储。

### 10.1 Key 设计

1. `ai:chat:session:{sessionId}`
   - 会话元信息。
2. `ai:chat:session:{sessionId}:messages`
   - 会话消息列表。
3. `ai:chat:user:{userId}:sessions`
   - 用户最近会话索引。

### 10.2 会话元信息字段建议

1. `sessionId`
2. `userId`
3. `nodeId`
4. `incidentId`
5. `timeRange`
6. `title`
7. `messageCount`
8. `createdAt`
9. `updatedAt`
10. `status`

### 10.3 消息字段建议

1. `messageId`
2. `role`
3. `question`
4. `answer`
5. `conclusion`
6. `recommendedActions`
7. `createdAt`

### 10.4 短会话约束

短会话必须明确受限：

1. 必须设置 TTL。
2. 必须设置单会话消息条数上限。
3. 必须设置每用户最近会话数量上限。

建议默认值如下：

1. 会话 TTL：`24h` 或 `72h`
2. 单会话消息条数上限：`20`
3. 每用户最近会话数量上限：`5`

### 10.5 明确不做

1. 不做跨会话上下文继承。
2. 不做长期记忆索引。
3. 不做与 agent 任务共享状态。

---

## 11. 测试与验收标准

## 11.1 后端测试

应覆盖以下内容：

1. 路由鉴权测试。
2. 请求参数校验测试：
   - `question` 必填
   - `timeRange` 只允许 `24h / 7d / 30d`
3. 上下文摘要构建测试。
4. 推荐动作白名单过滤测试。
5. 输出结构测试：
   - `answer`
   - `conclusion`
   - `recommendedActions`
6. 会话上限与 TTL 规则测试。

## 11.2 前端测试

应覆盖以下内容：

1. 页面从空上下文启动会话。
2. 页面从 `AIAnalysis.vue` 带上下文跳转进入。
3. AI 回答和结构化结论正确展示。
4. 推荐动作卡片正确展示。
5. 点击卡片后正确跳转到 `AIOpsAssistant.vue` 并预填参数。
6. AI 不可用时的禁用态展示。
7. 达到短会话条数上限时的提示。

## 11.3 验收标准

Batch 7 完成后应满足：

1. 用户可围绕设备、告警、指标上下文发起短会话追问。
2. 每次 AI 回复均包含自然语言回答和结构化结论。
3. 推荐动作只能来自现有 action registry 白名单。
4. 推荐动作只能跳转到 `AIOpsAssistant.vue`，不能在聊天页直接执行。
5. 会话具备 TTL、消息条数上限、最近会话数量上限。
6. 第一版不做流式输出，但页面体验应完整可用。

---

## 12. 明确不做项

Batch 7 第一版明确不做以下内容：

1. 不做通用聊天系统。
2. 不做长期 memory。
3. 不做 agent。
4. 不做流式输出。
5. 不做文件上传。
6. 不做日志附件。
7. 不做审批流。
8. 不做 `node_action`。
9. 不做 Skill Catalog 页面。
10. 不做 Skill 编辑器。
11. 不做聊天页直接执行动作。

---

## 13. 结论

Batch 7 的成功标准应保持克制并聚焦：

“用户能围绕当前运维上下文连续追问，并把 AI 建议安全地导向现有动作闭环。”
