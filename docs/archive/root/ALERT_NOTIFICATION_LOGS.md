> 历史记录/非当前基线
>
> 本文档为项目根目录迁移出的历史材料，仅用于追溯阶段背景、问题修复或功能完成过程。
> 当前项目入口与有效文档请以根目录 `README.md`、`DOCS.md` 和 `docs/` 目录中的 SSOT 文档为准。
# 告警通知日志功能

## 功能概述

为告警管理模块添加了完整的通知日志功能，可以记录和查看所有告警通知的发送情况，包括通知时间、通知渠道、发送状态等详细信息。

## 功能特性

### 1. 通知日志记录
- 自动记录每次告警通知
- 记录所有通知渠道（WebSocket、邮件、钉钉）
- 记录发送状态（成功/失败）
- 记录失败原因
- 记录发送时间

### 2. 统计数据展示
- 总通知数统计
- 成功/失败数量统计
- 各渠道通知数量统计
- 按节点统计通知数量

### 3. 日志查询
- 分页加载日志
- 按节点筛选
- 按时间范围筛选
- 实时刷新

### 4. 可视化展示
- 统计卡片展示
- 日志列表展示
- 渠道状态标识
- 时间格式化显示

## 界面展示

### 标签页布局
```
┌─────────────────────────────────────┐
│ 告警管理                             │
│ [活动告警] [告警规则] [通知日志]     │
├─────────────────────────────────────┤
│ 📊 总通知数: 156                     │
│ ✅ 成功: 142  ❌ 失败: 14            │
│ 📱 WebSocket: 156  📧 邮件: 45       │
├─────────────────────────────────────┤
│ 通知日志                    [🔄 刷新] │
│ ┌─────────────────────────────────┐ │
│ │ 🔔 CPU使用率过高                 │ │
│ │ 节点: server-01                  │ │
│ │ 📱 WebSocket ✓                   │ │
│ │ 📧 邮件 ✓                        │ │
│ │ 2024-02-12 15:30:45             │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🔔 内存使用率过高                │ │
│ │ 节点: server-02                  │ │
│ │ 📱 WebSocket ✓                   │ │
│ │ 💬 钉钉 ✗ (发送失败)             │ │
│ │ 2024-02-12 15:25:30             │ │
│ └─────────────────────────────────┘ │
│         [加载更多]                   │
└─────────────────────────────────────┘
```

## 技术实现

### 后端实现

#### 1. 通知日志记录
**文件**: `backend/services/alertChecker.js`

在发送通知时自动记录日志：

```javascript
const notificationLog = {
  eventId: event.id,
  ruleName: rule.name,
  nodeId: event.nodeId,
  nodeName: event.nodeName,
  timestamp: new Date().toISOString(),
  channels: []
};

// 记录每个渠道的发送状态
notificationLog.channels.push({
  type: 'websocket',
  status: 'success',
  sentAt: new Date().toISOString()
});

// 保存日志
await alertService.saveNotificationLog(notificationLog);
```

#### 2. 日志存储
**文件**: `backend/services/alertService.js`

使用Redis存储日志：
- Hash存储日志详情：`alert:notification:{logId}`
- Sorted Set存储日志列表：`alert:notifications`（按时间排序）

```javascript
// 保存日志
async saveNotificationLog(logData) {
  const log = {
    id: this.generateId('notif'),
    eventId: logData.eventId,
    ruleName: logData.ruleName,
    nodeId: logData.nodeId,
    nodeName: logData.nodeName,
    timestamp: logData.timestamp,
    channels: logData.channels
  };

  // 保存到Redis Hash
  await redisClient.client.hSet(`alert:notification:${log.id}`, ...);

  // 添加到Sorted Set（按时间排序）
  await redisClient.client.zAdd('alert:notifications', {
    score: Date.now(),
    value: log.id
  });
}
```

#### 3. 日志查询
**文件**: `backend/services/alertService.js`

支持分页和筛选：

```javascript
async getNotificationLogs(options = {}) {
  const { limit = 100, offset = 0, nodeId, startTime, endTime } = options;

  // 从Sorted Set获取日志ID（最新的在前）
  const logIds = await redisClient.client.zRange(
    'alert:notifications',
    -limit - offset,
    -1 - offset,
    { REV: true }
  );

  // 获取日志详情并筛选
  const logs = [];
  for (const logId of logIds) {
    const logData = await redisClient.client.hGetAll(`alert:notification:${logId}`);
    // 应用筛选条件
    if (nodeId && log.nodeId !== nodeId) continue;
    if (startTime || endTime) { /* 时间筛选 */ }
    logs.push(log);
  }

  return logs;
}
```

#### 4. 统计数据
**文件**: `backend/services/alertService.js`

```javascript
async getNotificationStats(options = {}) {
  const logs = await this.getNotificationLogs({ limit: 1000, ...options });

  const stats = {
    total: logs.length,
    byChannel: { websocket: 0, email: 0, dingtalk: 0 },
    byStatus: { success: 0, failed: 0 },
    byNode: {}
  };

  // 统计各维度数据
  for (const log of logs) {
    for (const channel of log.channels) {
      stats.byChannel[channel.type]++;
      stats.byStatus[channel.status]++;
    }
    // 按节点统计
    if (!stats.byNode[log.nodeId]) {
      stats.byNode[log.nodeId] = { count: 0 };
    }
    stats.byNode[log.nodeId].count++;
  }

  return stats;
}
```

#### 5. API路由
**文件**: `backend/routes/alert.js`

```javascript
// 获取通知日志列表
router.get('/notifications', async (req, res, next) => {
  const { limit, offset, nodeId, startTime, endTime } = req.query;
  const logs = await alertService.getNotificationLogs({...});
  res.json({ success: true, data: { logs, count: logs.length } });
});

// 获取通知统计
router.get('/notifications/stats/summary', async (req, res, next) => {
  const stats = await alertService.getNotificationStats({...});
  res.json({ success: true, data: stats });
});
```

### 前端实现

#### 1. API接口
**文件**: `frontend/src/api/alert.ts`

```typescript
export interface NotificationChannel {
  type: 'websocket' | 'email' | 'dingtalk'
  status: 'success' | 'failed'
  error?: string
  sentAt: string
}

export interface NotificationLog {
  id: string
  eventId: string
  ruleName: string
  nodeId: string
  nodeName: string
  timestamp: string
  channels: NotificationChannel[]
}

export const getNotificationLogs = (params?: {...}) => {
  return request.get('/alert/notifications', { params })
}

export const getNotificationStats = (params?: {...}) => {
  return request.get('/alert/notifications/stats/summary', { params })
}
```

#### 2. 通知日志组件
**文件**: `frontend/src/components/NotificationLogs.vue`

**核心功能**:
- 统计卡片展示
- 日志列表展示
- 分页加载
- 刷新功能
- 状态标识

**关键代码**:
```vue
<template>
  <!-- 统计卡片 -->
  <div class="stats-cards">
    <div class="stat-card">
      <div class="stat-icon">📊</div>
      <div class="stat-value">{{ stats.total }}</div>
      <div class="stat-label">总通知数</div>
    </div>
    <!-- 更多统计卡片 -->
  </div>

  <!-- 日志列表 -->
  <div class="logs-list">
    <div v-for="log in logs" class="log-card">
      <div class="log-header">
        <span>{{ log.ruleName }}</span>
        <span>{{ formatTime(log.timestamp) }}</span>
      </div>
      
      <!-- 通知渠道 -->
      <div class="channel-list">
        <div v-for="channel in log.channels" 
             :class="channel.status">
          <span>{{ getChannelIcon(channel.type) }}</span>
          <span>{{ getChannelLabel(channel.type) }}</span>
          <span>{{ channel.status === 'success' ? '✓' : '✗' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
```

#### 3. 告警页面集成
**文件**: `frontend/src/views/Alert.vue`

添加标签页切换：

```vue
<template>
  <!-- 标签页 -->
  <div class="tabs">
    <button :class="{ active: activeTab === 'alerts' }"
            @click="activeTab = 'alerts'">
      活动告警
    </button>
    <button :class="{ active: activeTab === 'rules' }"
            @click="activeTab = 'rules'">
      告警规则
    </button>
    <button :class="{ active: activeTab === 'logs' }"
            @click="activeTab = 'logs'">
      通知日志
    </button>
  </div>

  <!-- 内容区域 -->
  <div v-show="activeTab === 'alerts'">活动告警内容</div>
  <div v-show="activeTab === 'rules'">告警规则内容</div>
  <div v-show="activeTab === 'logs'">
    <NotificationLogs />
  </div>
</template>
```

## 数据结构

### 通知日志数据结构

```json
{
  "id": "notif_1707734445123_abc123",
  "eventId": "event_1707734400000_xyz789",
  "ruleName": "CPU使用率过高",
  "nodeId": "node001",
  "nodeName": "server-01",
  "timestamp": "2024-02-12T15:30:45.123Z",
  "channels": [
    {
      "type": "websocket",
      "status": "success",
      "sentAt": "2024-02-12T15:30:45.150Z"
    },
    {
      "type": "email",
      "status": "success",
      "sentAt": "2024-02-12T15:30:45.200Z"
    },
    {
      "type": "dingtalk",
      "status": "failed",
      "error": "Connection timeout",
      "sentAt": "2024-02-12T15:30:45.250Z"
    }
  ]
}
```

### 统计数据结构

```json
{
  "total": 156,
  "byChannel": {
    "websocket": 156,
    "email": 45,
    "dingtalk": 32
  },
  "byStatus": {
    "success": 142,
    "failed": 14
  },
  "byNode": {
    "node001": {
      "nodeId": "node001",
      "nodeName": "server-01",
      "count": 78
    },
    "node002": {
      "nodeId": "node002",
      "nodeName": "server-02",
      "count": 78
    }
  }
}
```

## API文档

### 1. 获取通知日志列表

**请求**:
```http
GET /api/alert/notifications?limit=20&offset=0&nodeId=node001
Authorization: Bearer <token>
```

**参数**:
- `limit`: 每页数量（默认100）
- `offset`: 偏移量（默认0）
- `nodeId`: 节点ID筛选（可选）
- `startTime`: 开始时间（可选）
- `endTime`: 结束时间（可选）

**响应**:
```json
{
  "success": true,
  "data": {
    "logs": [...],
    "count": 20
  }
}
```

### 2. 获取通知统计

**请求**:
```http
GET /api/alert/notifications/stats/summary
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "total": 156,
    "byChannel": {...},
    "byStatus": {...},
    "byNode": {...}
  }
}
```

### 3. 获取单个通知日志

**请求**:
```http
GET /api/alert/notifications/:logId
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "notif_...",
    "eventId": "event_...",
    ...
  }
}
```

## 使用场景

### 1. 查看通知历史
- 进入告警管理页面
- 点击"通知日志"标签
- 查看所有通知记录

### 2. 检查通知状态
- 查看每个通知的发送状态
- 识别失败的通知
- 查看失败原因

### 3. 统计分析
- 查看总通知数量
- 分析各渠道使用情况
- 识别通知失败率高的节点

### 4. 故障排查
- 当用户反馈未收到通知时
- 查看通知日志确认是否发送
- 检查发送状态和错误信息

## 性能优化

### 1. 数据存储
- 使用Redis Sorted Set按时间排序
- 支持高效的范围查询
- 自动按时间倒序排列

### 2. 分页加载
- 默认每页20条
- 支持加载更多
- 避免一次加载过多数据

### 3. 数据清理
建议定期清理旧日志：

```javascript
// 清理30天前的日志
const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
await redisClient.client.zRemRangeByScore(
  'alert:notifications',
  0,
  thirtyDaysAgo
);
```

## 后续优化建议

### 功能增强

1. **高级筛选**
   - 按规则名称筛选
   - 按通知渠道筛选
   - 按发送状态筛选

2. **导出功能**
   - 导出为CSV
   - 导出为Excel
   - 导出为PDF报告

3. **图表展示**
   - 通知趋势图
   - 渠道分布饼图
   - 成功率折线图

4. **实时更新**
   - WebSocket推送新日志
   - 自动刷新统计数据

5. **详细信息**
   - 点击查看完整日志
   - 显示通知内容
   - 显示接收者信息

### 性能优化

1. **缓存策略**
   - 缓存统计数据
   - 定时更新缓存

2. **数据归档**
   - 将旧数据移至InfluxDB
   - 保留Redis中的热数据

3. **批量操作**
   - 批量查询日志
   - 批量删除日志

## 相关文件

- `backend/services/alertChecker.js` - 告警检查器（记录日志）
- `backend/services/alertService.js` - 告警服务（日志存储和查询）
- `backend/routes/alert.js` - 告警路由（日志API）
- `frontend/src/api/alert.ts` - 告警API接口
- `frontend/src/components/NotificationLogs.vue` - 通知日志组件
- `frontend/src/views/Alert.vue` - 告警管理页面

## 总结

通知日志功能已完整实现，提供了：
- ✅ 自动记录所有通知
- ✅ 详细的发送状态
- ✅ 统计数据展示
- ✅ 分页查询功能
- ✅ 友好的界面展示
- ✅ 实时刷新支持

用户可以在告警管理页面的"通知日志"标签中查看所有通知记录，了解通知的发送情况和状态。

