# AI Ops Phase 2 实施方案（基线版）

## 1. 背景与目标

当前仓库的 AI Ops Phase 1A 已基本完成，系统已经具备以下能力：

1. 后端已具备基础 AI 分析能力，入口集中在 `backend/routes/ai.js` 与 `backend/services/aiService.js`。
2. 前端已具备结构化 AI 分析入口，页面为 `frontend/src/views/AIAnalysis.vue`。
3. 前端已具备受控动作闭环入口，页面为 `frontend/src/views/AIOpsAssistant.vue`。
4. 后端已具备最小 `platform_action` 注册与执行框架，注册中心位于 `backend/services/aiOps/actionRegistry.js`。

Phase 1A 的不足也已经明确：

1. 系统级 AI 配置仍主要依赖环境变量，缺少产品内配置入口。
2. 现有 AI 能力主要是结构化分析，缺少对话式解释与追问入口。
3. 已有 action registry 只服务于执行闭环，尚未沉淀为用户可理解的能力目录。

Phase 2 的目标是把 AI 能力从“可调用的后端能力”升级为“可配置、可对话、可发现的产品能力层”，并作为后续 Batch 5 / 6 / 7 / 8 的统一实施基线。

Phase 2 优先级如下：

1. P1：AI 设置中心
2. P1.5：对话式 AI 分析页
3. P2：Skill Catalog（内置只读）

---

## 2. 为什么优先做 AI 设置中心

AI 设置中心是 Phase 2 的控制面，而不是普通设置页。其优先级高于对话页和 Catalog，原因如下：

1. 当前 `backend/services/aiService.js` 主要在启动期从环境变量读取 `provider / apiKey / model / baseURL`，缺少运行时配置管理能力。
2. 没有系统级设置中心，就无法稳定支撑新的 AI 对话页与 Catalog，容易出现“不同入口命中不同配置语义”的问题。
3. 当前前端只能感知 AI 是否可用，无法判断配置来源、失败原因、功能开关状态，也无法完成配置测试与定位。
4. 后续对话页和 Catalog 都依赖统一的运行时配置视图，否则用户在不同页面中会看到不一致的 AI 状态。
5. Phase 2 需要把“环境变量能力”升级为“系统级可治理能力”，这是后续演进的前置条件。

结论：
Phase 2 必须先建立 AI 设置中心，再建设对话式 AI 分析页，最后建设 Skill Catalog。

---

## 3. Phase 2 能力边界

### 3.1 本阶段范围

Phase 2 仅覆盖以下能力：

1. 系统级 AI 设置中心。
2. 用户级 AI 偏好设置。
3. 对话式 AI 分析页。
4. 内置只读 Skill Catalog。
5. 基于现有 `platform_action` 与分析能力的能力编目与跳转。

### 3.2 明确不做的内容

Phase 2 明确不做以下内容：

1. 不做审批中心。
2. 不做 `node_action`。
3. 不做聊天页直接执行动作。
4. 不做长期 memory、agent、自主任务编排。
5. 不做用户可自由编辑 skill 平台。
6. 不做 skill prompt 编辑器。
7. 不做 skill marketplace、安装/卸载机制。
8. 不做多 provider 负载均衡、成本路由、模型治理平台。

### 3.3 系统级 AI 设置的配置来源语义

系统级 AI 设置在运行时必须统一输出配置来源语义，且必须固定为以下三类：

1. `env`
   - 配置直接来自环境变量。
   - 适用于未启用平台持久化配置，或平台明确配置为“环境变量托管”时。
2. `persisted`
   - 配置来自平台持久化存储，建议落 Redis。
   - 适用于管理员通过产品内设置中心保存后的运行时配置。
3. `fallback`
   - 配置未显式提供时，系统按 provider 预设或默认值回退得到的值。
   - 常见于 `baseURL`、`model` 等字段的缺省场景。

运行时状态接口必须能够清晰返回每个关键字段的来源语义，避免“字段存在但来源不明”的灰区。

---

## 4. AI 设置中心设计

### 4.1 页面定位

建议新增独立页面 `AISettings.vue`，不要继续复用现有 `Settings.vue`。

职责分工如下：

1. `Settings.vue`
   - 保持为账号信息与密码安全页。
2. `AISettings.vue`
   - 作为 AI 系统能力控制面。
   - 承担系统级配置、个人偏好、连接测试、运行时状态展示。

### 4.2 admin 系统级设置

管理员可见并可编辑的系统级设置建议包括：

1. `AI 总开关`
   - 是否启用整个 AI 能力。
2. `Provider`
   - 支持 `openai / qwen / deepseek / zhipu / kimi / groq / together / siliconflow / ollama`。
3. `凭据托管模式`
   - `env托管` 或 `平台托管`。
4. `API Key`
   - 页面仅展示掩码，不回显明文。
5. `Base URL`
6. `Model`
7. `请求超时`
8. `默认分析温度`
9. `功能开关`
   - 结构化分析
   - 对话分析
   - Skill Catalog
10. `连接测试`
   - 支持保存前测试或保存后测试。
11. `运行时状态`
   - 展示当前生效的 provider、model、baseURL、enabled、配置来源。
12. `变更审计信息`
   - 最后修改人
   - 最后修改时间
   - 最后一次连接测试结果

### 4.3 user 个人偏好设置

所有登录用户可见的个人偏好设置建议包括：

1. `默认 AI 入口`
   - 结构化分析
   - 对话分析
2. `默认时间范围`
   - `24h / 7d / 30d`
3. `默认回答风格`
   - 简洁
   - 标准
   - 详细
4. `默认输出语言`
   - 第一版默认中文，可预留扩展能力。
5. `默认上下文附带项`
   - 当前节点
   - 当前告警
   - 最近分析结果
6. `结果展示偏好`
   - 是否展示结构化摘要卡片
   - 是否展示引用上下文摘要

### 4.4 权限边界

1. `admin`
   - 可读写系统级 AI 设置。
   - 可执行连接测试。
2. `operator / viewer`
   - 只读系统级 AI 运行状态。
   - 可读写个人偏好设置。

### 4.5 产品行为要求

1. AI 设置保存后，应立即影响新请求的运行时配置解析。
2. AI 设置页面必须向用户解释“当前为何可用/不可用”。
3. 当系统级 AI 被关闭时，对话页与结构化分析页都应展示统一的禁用原因。

---

## 5. 对话式 AI 分析页设计

### 5.1 页面定位

对话式 AI 分析页用于承载解释、追问、对比、归因与下一步建议，不替代现有结构化分析工作台。

建议新增页面：`frontend/src/views/AIChatAnalysis.vue`

### 5.2 第一版目标

第一版只做短会话分析页，不做长期 memory、不做 agent。

第一版能力边界：

1. 支持围绕当前系统状态发起连续追问。
2. 支持挂载节点、告警、时间范围等上下文。
3. 支持读取最近一次结构化分析结果作为上下文。
4. 支持推荐下一步动作，但不直接执行动作。

### 5.3 页面结构

建议页面结构如下：

1. 顶部状态栏
   - 当前 AI 是否可用
   - provider / model
   - 当前时间范围
2. 快捷模板区
   - 总结当前系统风险
   - 分析某节点异常
   - 解释某条告警
   - 结合最近分析给出建议
3. 上下文条
   - 以 chip 形式展示当前挂载上下文。
4. 对话主区域
   - 消息流
   - 用户提问
   - AI 回答
5. 结构化侧栏或下方结果卡片
   - 结论摘要
   - 风险等级
   - 涉及实体
   - 推荐动作
   - 推荐 Skill
6. 底部输入区
   - 文本输入框
   - 发送按钮
   - 快捷追问按钮

### 5.4 上下文来源

对话页的上下文来源建议统一由后端构建，前端只传引用，不直接拼大块 prompt。第一版上下文来源包括：

1. `系统摘要`
   - 在线节点数
   - 活跃告警数
   - 高负载节点摘要
2. `节点上下文`
   - 从节点详情页跳转传入
   - 或在页面中选择节点
3. `告警上下文`
   - 从告警页跳转传入
   - 或按 eventId 选择
4. `时间范围`
   - `24h / 7d / 30d`
5. `最近结构化分析结果`
   - 健康检查
   - 趋势分析
   - 优化建议
6. `最近动作结果`
   - 仅作为解释上下文使用
   - 不作为直接执行入口

### 5.5 与现有 `AIAnalysis.vue` 的关系

结论为“并存，不替换”。

职责建议如下：

1. `AIAnalysis.vue`
   - 保持为结构化、一键式分析工作台。
   - 继续承载系统健康检查、趋势分析、优化建议。
2. `AIChatAnalysis.vue`
   - 负责解释、追问、补充上下文与建议下一步。
3. 页面联动
   - `AIAnalysis.vue` 中每个分析结果块增加“继续追问”入口。
   - 对话页中提供“生成结构化分析”快捷入口，可回跳或直接触发现有分析接口。

### 5.6 动作边界

聊天页可以给出建议动作卡片，但不能直接执行动作。

聊天页允许的行为：

1. 展示推荐动作。
2. 跳转到 `AIOpsAssistant.vue`。
3. 带上 actionId、相关实体、推荐参数做预填。

聊天页明确不允许：

1. 绕过 dry-run。
2. 绕过 confirm。
3. 绕过现有 `ai/v2` 闭环直接执行平台动作。

---

## 6. Skill Catalog 设计

### 6.1 页面定位

Skill Catalog 是 AI 能力目录，而不是技能开发平台。

建议新增页面：`frontend/src/views/SkillCatalog.vue`

### 6.2 Skill 类型划分

Skill Catalog 第一版至少分为以下两类：

1. `analysis_skill`
   - 面向分析、解释、诊断、建议的内置能力。
2. `platform_action_skill`
   - 面向平台动作的内置能力描述，底层复用现有 action registry。

### 6.3 如何复用现有 action registry

当前 `backend/services/aiOps/actionRegistry.js` 已经是平台动作的真实注册中心，Phase 2 应在此基础上扩展为可读 catalog 描述源。

建议 action registry 增加以下能力：

1. `getAction(actionClass, actionId)`
   - 保持现有行为。
2. `listActions()`
   - 返回所有已注册动作的 descriptor。

每个 action descriptor 至少补充以下元数据：

1. `title`
2. `summary`
3. `category`
4. `riskLevel`
5. `tags`
6. `paramSchema`
7. `examples`
8. `entryPoint`

### 6.4 只读 Catalog 的产品形态

Catalog 第一版只做以下能力：

1. 列表浏览
2. 搜索
3. 分类筛选
4. 风险等级展示
5. 详情查看
6. 跳转到聊天页使用
7. 跳转到 AI Ops 助手使用

### 6.5 analysis skill 的来源

`analysis_skill` 第一版建议由静态内置清单提供，形成统一的只读目录，例如：

1. `system_health_review`
2. `trend_diagnosis`
3. `optimization_review`
4. `alert_explainer`

### 6.6 明确不做项

Skill Catalog 第一版明确不做：

1. 不做编辑器。
2. 不做用户自定义 skill。
3. 不做发布与版本管理。
4. 不做 marketplace。
5. 不做安装/卸载。
6. 不做 `node_action_skill`。

---

## 7. backend / frontend 文件级实施方案

## 7.1 backend 文件清单

### 新增

1. `backend/services/ai/configStore.js`
   - 系统级 AI 配置读写。
2. `backend/services/ai/userPreferenceStore.js`
   - 用户 AI 偏好读写。
3. `backend/services/ai/runtimeConfigResolver.js`
   - 统一解析 `env | persisted | fallback` 配置来源。
4. `backend/services/ai/secretCrypto.js`
   - 平台托管密钥的加解密。
5. `backend/services/ai/connectionTestService.js`
   - Provider 连通性测试。
6. `backend/services/ai/chatContextBuilder.js`
   - 构建聊天所需上下文摘要。
7. `backend/services/ai/chatService.js`
   - 对话式分析能力入口。
8. `backend/services/ai/chatSessionStore.js`
   - 短会话与消息存储。
9. `backend/services/ai/catalogService.js`
   - Skill Catalog 聚合服务。
10. `backend/services/ai/builtinSkillCatalog.js`
    - 内置 `analysis_skill` 描述表。
11. `backend/routes/aiSettings.js`
    - AI 设置相关路由。
12. `backend/routes/aiChat.js`
    - 对话式 AI 分析路由。
13. `backend/routes/aiCatalog.js`
    - Skill Catalog 路由。
14. `backend/tests/aiSettings.route.test.js`
15. `backend/tests/aiChat.route.test.js`
16. `backend/tests/aiCatalog.route.test.js`

### 修改

1. `backend/services/aiService.js`
   - 改为依赖统一 runtime 配置解析，而非只依赖启动期环境变量。
2. `backend/routes/ai.js`
   - 保留结构化分析接口，同时接入新的运行时配置解析与禁用语义。
3. `backend/services/aiOps/actionRegistry.js`
   - 扩展 `listActions()` 与 descriptor 输出能力。
4. `backend/actions/platform/acknowledgeAlert.js`
   - 补充 Catalog 元数据。
5. `backend/actions/platform/createIncidentTimelineNote.js`
   - 补充 Catalog 元数据。
6. `backend/actions/platform/muteAlertRuleTemporarily.js`
   - 补充 Catalog 元数据。
7. `backend/index.js`
   - 挂载 AI Settings / Chat / Catalog 路由。

## 7.2 frontend 文件清单

### 新增

1. `frontend/src/views/AISettings.vue`
   - AI 设置中心主页面。
2. `frontend/src/views/AIChatAnalysis.vue`
   - 对话式 AI 分析页。
3. `frontend/src/views/SkillCatalog.vue`
   - Skill Catalog 页面。
4. `frontend/src/api/aiSettings.ts`
   - AI 设置 API。
5. `frontend/src/api/aiChat.ts`
   - 聊天 API。
6. `frontend/src/api/aiCatalog.ts`
   - Catalog API。
7. `frontend/src/stores/aiSettings.ts`
   - AI 设置状态管理。
8. `frontend/src/stores/aiChat.ts`
   - 聊天状态管理。
9. `frontend/src/stores/skillCatalog.ts`
   - Catalog 状态管理。
10. `frontend/src/components/ai-settings/SystemAISettingsPanel.vue`
11. `frontend/src/components/ai-settings/UserAIPreferencesPanel.vue`
12. `frontend/src/components/ai-chat/ChatMessageList.vue`
13. `frontend/src/components/ai-chat/ChatComposer.vue`
14. `frontend/src/components/ai-chat/ContextChipBar.vue`
15. `frontend/src/components/ai-chat/InsightCard.vue`
16. `frontend/src/components/skill-catalog/SkillCatalogList.vue`
17. `frontend/src/components/skill-catalog/SkillDetailDrawer.vue`

### 修改

1. `frontend/src/views/AIAnalysis.vue`
   - 增加“继续追问”或“进入对话分析”入口。
2. `frontend/src/router/index.ts`
   - 新增路由入口。
3. `frontend/src/components/Sidebar.vue`
   - 新增导航项：AI 设置、AI 对话分析、Skill Catalog。

---

## 8. API 草案

### 8.1 AI 设置

1. `GET /api/ai/settings/runtime`
   - 返回当前运行时状态与字段来源。
2. `GET /api/ai/settings/system`
   - 获取系统级 AI 设置，管理员可见。
3. `PUT /api/ai/settings/system`
   - 保存系统级 AI 设置，管理员可写。
4. `POST /api/ai/settings/system/test`
   - 测试系统级配置连通性，管理员可用。
5. `GET /api/ai/settings/me`
   - 获取当前用户 AI 偏好。
6. `PUT /api/ai/settings/me`
   - 更新当前用户 AI 偏好。

### 8.2 AI 对话

1. `POST /api/ai/chat/sessions`
   - 创建短会话。
2. `GET /api/ai/chat/sessions`
   - 获取当前用户会话列表。
3. `GET /api/ai/chat/sessions/:sessionId`
   - 获取会话元信息。
4. `GET /api/ai/chat/sessions/:sessionId/messages`
   - 获取消息列表。
5. `POST /api/ai/chat/sessions/:sessionId/messages`
   - 发送消息并获取回答。
6. `POST /api/ai/chat/context/preview`
   - 根据上下文引用生成预览摘要。

### 8.3 Skill Catalog

1. `GET /api/ai/catalog`
   - 获取 Skill 列表，支持筛选与搜索。
2. `GET /api/ai/catalog/:skillId`
   - 获取 Skill 详情。

### 8.4 响应要求

AI 设置运行时状态建议至少返回：

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "provider": {
      "value": "openai",
      "source": "persisted"
    },
    "model": {
      "value": "gpt-4o-mini",
      "source": "persisted"
    },
    "baseURL": {
      "value": "https://api.openai.com/v1",
      "source": "fallback"
    }
  }
}
```

聊天发送消息响应建议至少返回：

```json
{
  "success": true,
  "data": {
    "sessionId": "chat_001",
    "message": {
      "role": "assistant",
      "content": "......"
    },
    "summary": "......",
    "suggestedFollowUps": [],
    "suggestedActions": [],
    "relatedSkills": []
  }
}
```

Catalog 条目建议至少返回：

```json
{
  "skillId": "acknowledge_alert",
  "skillType": "platform_action_skill",
  "title": "确认告警事件",
  "summary": "对指定告警进行确认并写入备注",
  "category": "incident_response",
  "riskLevel": "low"
}
```

---

## 9. Redis 存储建议

Phase 2 继续沿用 Redis 作为主要配置与会话存储，不新增关系型数据库。

建议 key 设计如下：

1. `ai:settings:system`
   - 系统级 AI 设置。
2. `ai:settings:system:audit`
   - 系统级 AI 设置审计索引。
3. `ai:settings:user:{userId}`
   - 用户 AI 偏好。
4. `ai:chat:session:{sessionId}`
   - 聊天会话元信息。
5. `ai:chat:messages:{sessionId}`
   - 会话消息列表。
6. `ai:chat:user_sessions:{userId}`
   - 用户会话索引，按最近访问时间排序。
7. `ai:catalog:cache`
   - 可选的聚合缓存。

### 9.1 密钥存储建议

如果系统支持“平台托管” API Key，则：

1. 必须加密后再写 Redis。
2. 加密主密钥仍放环境变量，例如 `AI_SETTINGS_ENCRYPTION_KEY`。
3. 若缺少加密主密钥，则系统应禁止保存明文密钥，并退回 `env` 托管模式。

### 9.2 会话边界建议

聊天页第一版只做短会话，因此建议：

1. 每用户会话数做上限控制。
2. 每会话消息数做上限控制。
3. 对话记录可设置 TTL，例如 30 天。
4. 不为会话构建长期记忆索引，不与 agent 任务共享状态。

---

## 10. Batch 5 / 6 / 7 / 8 实施顺序

### 10.1 Batch 5：AI 设置中心

目标：
建立统一的 AI 配置中心与运行时解析能力。

主要交付：

1. 系统级 AI 设置接口。
2. 用户级 AI 偏好接口。
3. 连接测试能力。
4. 运行时配置解析与来源语义输出。
5. 前端 AI 设置页面。

### 10.2 Batch 6：对话式 AI 分析页

目标：
建立短会话分析入口，并支持从结构化分析页承接上下文。

主要交付：

1. 聊天短会话接口。
2. 上下文构建与预览。
3. 对话分析页。
4. `AIAnalysis.vue` 到聊天页的跳转联动。

### 10.3 Batch 7：Skill Catalog

目标：
沉淀内置能力目录，并将现有 action registry 产品化展示。

主要交付：

1. `analysis_skill` 静态内置目录。
2. `platform_action_skill` 从 action registry 聚合输出。
3. Catalog 列表与详情页。
4. 跳转到聊天页或 AI Ops 助手页的使用入口。

### 10.4 Batch 8：整合与硬化

目标：
完成权限、统一状态、错误处理与测试硬化。

主要交付：

1. 权限边界补齐。
2. 统一禁用与错误态。
3. 关键路由自动化测试补齐。
4. 三页联动一致性验证。

---

## 11. 风险点与明确不做项

### 11.1 风险点

1. `AI Key 存储安全`
   - 如果没有独立加密主密钥，不能实现真正的平台托管密钥。
2. `运行时配置一致性`
   - 保存设置后，必须保证后续请求使用新配置而不是旧缓存。
3. `聊天上下文膨胀`
   - 不能把全量时序数据直接传给模型，必须由后端做摘要。
4. `权限边界回归`
   - 新增 AI 设置、聊天、Catalog 接口后，需要统一登录态与 RBAC。
5. `产品边界漂移`
   - 如果聊天页直接执行动作，会破坏 Phase 1A 已确立的 dry-run / confirm 安全边界。

### 11.2 明确不做项

1. 不做审批中心。
2. 不做 `node_action`。
3. 不做长期 memory / agent。
4. 不做聊天页直接执行动作。
5. 不做用户可编辑 skill 平台。
6. 不做 skill 编辑器。
7. 不做 marketplace。
8. 不做 `node_action_skill`。

---

## 12. 结论

Phase 2 的推荐实施顺序固定为：

1. 先做 AI 设置中心。
2. 再做对话式 AI 分析页。
3. 最后做 Skill Catalog。

其核心原则如下：

1. 先建立统一控制面，再扩展交互面。
2. 先保证边界清晰，再提高可用性与可发现性。
3. 继续复用 Phase 1A 已形成的受控执行闭环，不重新发明架构。
