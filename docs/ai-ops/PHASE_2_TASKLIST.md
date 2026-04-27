# AI Ops Phase 2 任务清单（执行基线）

> 目标：把 Phase 2 拆分为可执行的 Batch 5 / 6 / 7 / 8，作为后续开发、联调与验收的统一任务清单。

## 1. 总体实施顺序

1. Batch 5：AI 设置中心
2. Batch 6：对话式 AI 分析页
3. Batch 7：Skill Catalog
4. Batch 8：整合与硬化

## 2. 当前依赖与风险

### 当前依赖

1. 后端基于 `Express + Redis + InfluxDB`。
2. 前端基于 `Vue 3 + Pinia + Vue Router`。
3. 现有结构化分析入口为 `frontend/src/views/AIAnalysis.vue`。
4. 现有受控动作入口为 `frontend/src/views/AIOpsAssistant.vue`。
5. 现有 `platform_action` 注册中心为 `backend/services/aiOps/actionRegistry.js`。

### 当前风险

1. AI 配置仍主要依赖环境变量。
2. 平台托管密钥需要额外加密主密钥支持。
3. 聊天上下文若不做摘要，容易导致 token 和响应质量问题。
4. `docs/README.md` 当前工作区已有修改，更新时必须避免覆盖其他内容。

---

## 3. Batch 5：AI 设置中心

### 3.1 目标

建立系统级 AI 设置、用户级 AI 偏好，以及统一的运行时配置解析能力。

### 3.2 后端文件清单

#### 新增

- [ ] `backend/services/ai/configStore.js`
- [ ] `backend/services/ai/userPreferenceStore.js`
- [ ] `backend/services/ai/runtimeConfigResolver.js`
- [ ] `backend/services/ai/secretCrypto.js`
- [ ] `backend/services/ai/connectionTestService.js`
- [ ] `backend/routes/aiSettings.js`
- [ ] `backend/tests/aiSettings.route.test.js`

#### 修改

- [ ] `backend/services/aiService.js`
- [ ] `backend/routes/ai.js`
- [ ] `backend/index.js`

### 3.3 前端文件清单

#### 新增

- [ ] `frontend/src/views/AISettings.vue`
- [ ] `frontend/src/api/aiSettings.ts`
- [ ] `frontend/src/stores/aiSettings.ts`
- [ ] `frontend/src/components/ai-settings/SystemAISettingsPanel.vue`
- [ ] `frontend/src/components/ai-settings/UserAIPreferencesPanel.vue`

#### 修改

- [ ] `frontend/src/router/index.ts`
- [ ] `frontend/src/components/Sidebar.vue`

### 3.4 核心任务

- [ ] 定义系统级 AI 配置 schema。
- [ ] 定义用户 AI 偏好 schema。
- [ ] 明确运行时配置字段的 `env | persisted | fallback` 来源输出。
- [ ] 建立系统级设置读写接口。
- [ ] 建立用户偏好读写接口。
- [ ] 建立连接测试接口。
- [ ] 让结构化 AI 分析改为依赖统一 runtime resolver。
- [ ] 完成 AI 设置中心页面与权限显示。

### 3.5 验收标准

1. `admin` 可在产品内查看并保存系统级 AI 设置。
2. 运行时状态接口能明确显示 `env | persisted | fallback` 来源语义。
3. 非 `admin` 用户无法修改系统级设置。
4. 用户可修改个人 AI 偏好。
5. `AIAnalysis.vue` 新请求能正确使用最新生效配置。

---

## 4. Batch 6：对话式 AI 分析页

### 4.1 目标

建立短会话 AI 对话分析页，支持上下文挂载与结果追问。

### 4.2 后端文件清单

#### 新增

- [ ] `backend/services/ai/chatContextBuilder.js`
- [ ] `backend/services/ai/chatService.js`
- [ ] `backend/services/ai/chatSessionStore.js`
- [ ] `backend/routes/aiChat.js`
- [ ] `backend/tests/aiChat.route.test.js`

#### 修改

- [ ] `backend/index.js`

### 4.3 前端文件清单

#### 新增

- [ ] `frontend/src/views/AIChatAnalysis.vue`
- [ ] `frontend/src/api/aiChat.ts`
- [ ] `frontend/src/stores/aiChat.ts`
- [ ] `frontend/src/components/ai-chat/ChatMessageList.vue`
- [ ] `frontend/src/components/ai-chat/ChatComposer.vue`
- [ ] `frontend/src/components/ai-chat/ContextChipBar.vue`
- [ ] `frontend/src/components/ai-chat/InsightCard.vue`

#### 修改

- [ ] `frontend/src/views/AIAnalysis.vue`
- [ ] `frontend/src/router/index.ts`
- [ ] `frontend/src/components/Sidebar.vue`

### 4.4 核心任务

- [ ] 建立短会话创建接口。
- [ ] 建立消息发送与消息读取接口。
- [ ] 建立上下文预览与摘要构建能力。
- [ ] 约束聊天页第一版只做短会话，不做长期 memory / agent。
- [ ] 在 `AIAnalysis.vue` 中增加“继续追问”入口。
- [ ] 在聊天页中展示建议动作卡片，但只允许跳转，不允许直接执行。

### 4.5 验收标准

1. 用户可创建短会话并连续追问。
2. 聊天页能挂载节点、告警、时间范围、最近分析结果等上下文。
3. 聊天页不会直接执行平台动作。
4. 建议动作可跳转至 `AIOpsAssistant.vue` 使用。
5. AI 不可用时，聊天页能展示统一的禁用原因。

---

## 5. Batch 7：Skill Catalog

### 5.1 目标

把现有 AI 能力沉淀为只读、可发现、可跳转使用的目录。

### 5.2 后端文件清单

#### 新增

- [ ] `backend/services/ai/catalogService.js`
- [ ] `backend/services/ai/builtinSkillCatalog.js`
- [ ] `backend/routes/aiCatalog.js`
- [ ] `backend/tests/aiCatalog.route.test.js`

#### 修改

- [ ] `backend/services/aiOps/actionRegistry.js`
- [ ] `backend/actions/platform/acknowledgeAlert.js`
- [ ] `backend/actions/platform/createIncidentTimelineNote.js`
- [ ] `backend/actions/platform/muteAlertRuleTemporarily.js`
- [ ] `backend/index.js`

### 5.3 前端文件清单

#### 新增

- [ ] `frontend/src/views/SkillCatalog.vue`
- [ ] `frontend/src/api/aiCatalog.ts`
- [ ] `frontend/src/stores/skillCatalog.ts`
- [ ] `frontend/src/components/skill-catalog/SkillCatalogList.vue`
- [ ] `frontend/src/components/skill-catalog/SkillDetailDrawer.vue`

#### 修改

- [ ] `frontend/src/router/index.ts`
- [ ] `frontend/src/components/Sidebar.vue`

### 5.4 核心任务

- [ ] 明确 Skill 类型至少分为 `analysis_skill` 与 `platform_action_skill`。
- [ ] 为 action registry 扩展 `listActions()`。
- [ ] 为三个现有 `platform_action` 补齐 catalog 元数据。
- [ ] 建立只读 Catalog 列表接口与详情接口。
- [ ] 完成 Catalog 页面、搜索、分类筛选与详情抽屉。
- [ ] 打通“去聊天页使用”和“去 AI Ops 助手使用”入口。

### 5.5 验收标准

1. Catalog 至少包含 `analysis_skill` 与 `platform_action_skill` 两类。
2. 三个现有 `platform_action` 可在 Catalog 中浏览。
3. 首批内置 `analysis_skill` 可在 Catalog 中浏览。
4. Catalog 为只读，不提供新增、编辑、删除入口。
5. 用户可从 Catalog 跳转到对应使用入口。

---

## 6. Batch 8：整合与硬化

### 6.1 目标

完成权限、错误态、状态一致性与测试硬化，保证三类入口形成统一产品体验。

### 6.2 后端文件清单

#### 修改

- [ ] `backend/routes/ai.js`
- [ ] `backend/routes/aiSettings.js`
- [ ] `backend/routes/aiChat.js`
- [ ] `backend/routes/aiCatalog.js`
- [ ] `backend/services/ai/runtimeConfigResolver.js`
- [ ] `backend/tests/aiSettings.route.test.js`
- [ ] `backend/tests/aiChat.route.test.js`
- [ ] `backend/tests/aiCatalog.route.test.js`

### 6.3 前端文件清单

#### 修改

- [ ] `frontend/src/views/AISettings.vue`
- [ ] `frontend/src/views/AIChatAnalysis.vue`
- [ ] `frontend/src/views/SkillCatalog.vue`
- [ ] `frontend/src/views/AIAnalysis.vue`
- [ ] `frontend/src/stores/aiSettings.ts`
- [ ] `frontend/src/stores/aiChat.ts`
- [ ] `frontend/src/stores/skillCatalog.ts`

### 6.4 核心任务

- [ ] 统一 AI 禁用态与错误提示。
- [ ] 统一系统级 AI 运行状态显示。
- [ ] 补齐权限与只读边界。
- [ ] 补齐关键接口自动化测试。
- [ ] 验证页面之间的跳转链路与参数预填。

### 6.5 验收标准

1. 三个页面看到的是同一套 AI 运行时状态。
2. AI 被禁用时，设置页、结构化分析页、聊天页、Catalog 页表现一致。
3. 聊天页推荐动作到 AI Ops 助手的跳转可用。
4. Catalog 到聊天页或 AI Ops 助手的跳转可用。
5. Phase 2 核心后端路由具备自动化测试覆盖。

---

## 7. 勾选式任务总表

### 7.1 文档与基线

- [x] 固化 `docs/ai-ops/PHASE_2_PLAN.md`
- [x] 固化 `docs/adr/ADR-002-phase-2-ai-settings-chat-catalog.md`
- [x] 固化 `docs/ai-ops/PHASE_2_TASKLIST.md`
- [x] 在 `docs/README.md` 增加 Phase 2 入口

### 7.2 Batch 5

- [ ] 完成系统级 AI 设置存储
- [ ] 完成用户 AI 偏好存储
- [ ] 完成运行时配置来源解析
- [ ] 完成连接测试
- [ ] 完成 AI 设置中心前端页面

### 7.3 Batch 6

- [ ] 完成短会话存储与接口
- [ ] 完成聊天上下文构建
- [ ] 完成对话式 AI 分析页
- [ ] 完成 `AIAnalysis.vue` 到聊天页的联动

### 7.4 Batch 7

- [ ] 完成 Catalog 服务与路由
- [ ] 完成 action registry 元数据扩展
- [ ] 完成 Skill Catalog 页面

### 7.5 Batch 8

- [ ] 完成统一错误态与禁用态
- [ ] 完成权限硬化
- [ ] 完成页面联动硬化
- [ ] 完成关键自动化测试补齐
