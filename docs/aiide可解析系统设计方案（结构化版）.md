# AIIDE 可解析系统设计方案（Structured Design Spec）

> 本文档用于提供给 AI IDE / AI Code Assistant 作为系统级设计约束与实现指导。内容强调**可实现性、模块边界清晰、技术选型明确**，避免抽象或不可落地描述。

---

## 1. 项目基本信息（Project Meta）

- **项目名称**：分布式感知运维系统
- **项目类型**：前后端分离的分布式监控系统
- **部署模式**：支持本地化部署（单机 / 局域网），不强制云端
- **目标用户**：运维人员、系统管理员
- **核心目标**：
  - 多节点系统资源监控
  - 多端数据互通
  - 实时展示 + 历史分析
  - 大模型辅助运维分析（非核心链路）

---

## 2. 总体架构约束（Architecture Constraints）

系统必须采用以下分层架构，各层职责不可混用：

1. **采集层（Agent Layer）**
2. **中心服务层（Service Layer）**
3. **数据支撑层（Data Layer）**
4. **多端访问层（Client Layer）**
5. **智能分析扩展层（LLM Extension Layer）**

核心约束：
- LLM 层不得参与实时监控主链路
- Agent 与前端不得直接通信
- 所有终端仅通过中心服务层访问数据

---

## 3. 采集层（Agent Layer）设计规范

### 3.1 职责

- 运行在被监控节点
- 周期性采集系统资源数据
- 将数据通过 HTTP 或 WebSocket 上报至中心服务

### 3.2 采集指标（必须实现）

```json
{
  "cpu_usage": "float (0-100)",
  "memory_usage": "float (0-100)",
  "disk_usage": "float (0-100)",
  "network_io": "int (bytes/sec)",
  "timestamp": "ISO8601"
}
```

### 3.3 技术约束

- 语言：Python
- 库：psutil
- 采集频率：1s（可配置）
- 不允许在 Agent 中实现业务逻辑或分析逻辑

---

## 4. 中心服务层（Service Layer）设计规范

### 4.1 技术栈

- Node.js
- Express
- WebSocket（ws）

### 4.2 模块划分

- **Agent 接入模块**：接收采集数据
- **数据处理模块**：校验、封装、转发
- **实时推送模块**：向前端推送最新数据
- **REST API 模块**：提供历史查询与管理接口

### 4.3 接口约束

- Agent → Service：HTTP POST /api/metrics
- Client → Service：
  - REST：/api/metrics/latest
  - REST：/api/metrics/history
  - WS：/ws/metrics

---

## 5. 数据支撑层（Data Layer）设计规范

### 5.1 存储策略

- **Redis**：
  - 存储最新监控数据
  - Key：node_id:latest

- **InfluxDB**：
  - 存储历史时序数据
  - Measurement：system_metrics

### 5.2 数据流约束

- 所有原始数据必须先进入 Redis
- 按时间批量写入 InfluxDB

---

## 6. 多端访问层（Client Layer）设计规范

### 6.1 支持终端

- Web 管理端（PC 浏览器）
- 移动端（H5，自适应）

### 6.2 技术栈

- Vue 3
- TypeScript
- ECharts

### 6.3 行为约束

- 实时数据必须通过 WebSocket 获取
- 历史数据仅通过 REST API 获取
- 前端不进行任何数据分析逻辑

---

## 7. 智能分析扩展层（LLM Extension Layer）规范

### 7.1 模块定位

- 非核心模块
- 仅用于辅助分析与文本生成

### 7.2 输入格式（示例）

```json
{
  "node_id": "string",
  "current_metrics": { ... },
  "recent_history": [ ... ]
}
```

### 7.3 输出格式（示例）

```json
{
  "status_summary": "string",
  "possible_causes": ["string"],
  "suggestions": ["string"]
}
```

### 7.4 约束

- 不允许阻塞主线程
- LLM 调用失败不得影响系统正常运行

---

## 8. 非功能性约束（Non-Functional Requirements）

- 系统可在无公网环境运行（不依赖云资源）
- 单节点部署即可完成系统功能验证
- 所有模块需可独立调试

---

## 9. 实现优先级（Implementation Priority）

1. Agent → Service 数据通路
2. 实时 WebSocket 展示
3. Redis / InfluxDB 数据存储
4. 多端访问适配
5. LLM 分析接口接入

---

## 10. 设计完成度声明

该设计方案以“**可实现、可验证、可扩展**”为首要目标，适用于本科毕业设计实现阶段，可作为 AI IDE 自动代码生成、模块拆分与架构约束的输入文档。

