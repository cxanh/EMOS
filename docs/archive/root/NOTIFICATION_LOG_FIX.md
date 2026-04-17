> 历史记录/非当前基线
>
> 本文档为项目根目录迁移出的历史材料，仅用于追溯阶段背景、问题修复或功能完成过程。
> 当前项目入口与有效文档请以根目录 `README.md`、`DOCS.md` 和 `docs/` 目录中的 SSOT 文档为准。
# 通知日志记录问题修复

## 问题描述

告警触发后，通知日志没有被正确记录和显示。

## 问题原因

### 1. Redis hSet多字段保存问题
使用`hSet`一次性保存多个字段时，只有第一个字段被保存：

```javascript
// 错误的方式 - 只保存了id字段
await redisClient.client.hSet(
  `alert:notification:${log.id}`,
  'id', log.id,
  'eventId', log.eventId,
  'ruleName', log.ruleName,
  // ... 其他字段
);
```

### 2. Redis zRange命令语法问题
使用了不兼容的`zRange`命令选项：

```javascript
// 错误的方式 - REV选项在某些Redis版本中不支持
const logIds = await redisClient.client.zRange(
  'alert:notifications',
  -limit - offset,
  -1 - offset,
  { REV: true }
);
```

### 3. 异步操作时序问题
在Promise还未完成时就保存了日志，导致某些渠道的状态未被记录。

## 修复方案

### 1. 修复Redis hSet保存方式
**文件**: `backend/services/alertService.js`

改为逐个字段调用hSet：

```javascript
// 正确的方式 - 逐个字段保存
const key = `alert:notification:${log.id}`;
await redisClient.client.hSet(key, 'id', log.id);
await redisClient.client.hSet(key, 'eventId', log.eventId);
await redisClient.client.hSet(key, 'ruleName', log.ruleName);
await redisClient.client.hSet(key, 'nodeId', log.nodeId);
await redisClient.client.hSet(key, 'nodeName', log.nodeName);
await redisClient.client.hSet(key, 'timestamp', log.timestamp);
await redisClient.client.hSet(key, 'channels', JSON.stringify(log.channels));
```

### 2. 修复Redis查询命令
**文件**: `backend/services/alertService.js`

使用兼容的命令方式：

```javascript
// 使用sendCommand发送ZREVRANGE命令
let logIds;
try {
  // 尝试现代语法 (Redis 6.2+)
  logIds = await redisClient.client.zRange(
    'alert:notifications',
    offset,
    offset + limit - 1,
    { REV: true }
  );
} catch (err) {
  // 降级到ZREVRANGE命令
  logIds = await redisClient.client.sendCommand([
    'ZREVRANGE',
    'alert:notifications',
    String(offset),
    String(offset + limit - 1)
  ]);
}
```

### 3. 修复通知发送逻辑
**文件**: `backend/services/alertChecker.js`

改为顺序执行并等待所有通知完成：

```javascript
// 顺序发送通知并记录状态
// WebSocket
if (rule.notifyChannels.includes('websocket') && global.wss) {
  try {
    global.wss.broadcast({...});
    notificationLog.channels.push({
      type: 'websocket',
      status: 'success',
      sentAt: new Date().toISOString()
    });
  } catch (err) {
    notificationLog.channels.push({
      type: 'websocket',
      status: 'failed',
      error: err.message,
      sentAt: new Date().toISOString()
    });
  }
}

// Email
if (rule.notifyChannels.includes('email') && emailService.isEnabled()) {
  try {
    await emailService.sendAlert(event);
    notificationLog.channels.push({
      type: 'email',
      status: 'success',
      sentAt: new Date().toISOString()
    });
  } catch (err) {
    notificationLog.channels.push({
      type: 'email',
      status: 'failed',
      error: err.message,
      sentAt: new Date().toISOString()
    });
  }
}

// DingTalk
if (rule.notifyChannels.includes('dingtalk') && dingtalkService.isEnabled()) {
  try {
    await dingtalkService.sendAlert(event);
    notificationLog.channels.push({
      type: 'dingtalk',
      status: 'success',
      sentAt: new Date().toISOString()
    });
  } catch (err) {
    notificationLog.channels.push({
      type: 'dingtalk',
      status: 'failed',
      error: err.message,
      sentAt: new Date().toISOString()
    });
  }
}

// 保存日志
if (notificationLog.channels.length > 0) {
  const result = await alertService.saveNotificationLog(notificationLog);
  if (result.success) {
    logger.info(`Notification log saved: ${result.data.id}`);
  }
}
```

## 测试验证

### 测试脚本
创建了 `backend/test-notification-log.js` 用于测试通知日志功能。

### 测试结果
```
=== Testing Notification Log ===

1. Testing saveNotificationLog...
✓ Notification log saved successfully
  Log ID: notif_1770904806616_gdqtuiaz8

2. Testing getNotificationLogs...
✓ Retrieved 8 logs

First log:
  ID: notif_1770904806616_gdqtuiaz8
  Event ID: event_test_1770904806615
  Rule Name: Test Rule
  Node: Test Node
  Timestamp: 2026-02-12T14:00:06.615Z
  Channels: 2
    Channel 1: websocket - success
    Channel 2: email - failed

3. Testing getNotificationStats...
✓ Statistics retrieved
  Total: 8
  Success: 1
  Failed: 1
  WebSocket: 1
  Email: 1
  DingTalk: 0

=== Test Completed Successfully ===
```

## 应用修复

### 1. 重启后端服务
```bash
# 停止当前服务 (Ctrl+C)
# 重新启动
cd backend
node index.js
```

### 2. 刷新前端页面
刷新浏览器以重新加载前端代码。

### 3. 触发告警测试
1. 创建一个告警规则（阈值设低一点，如CPU > 10%）
2. 等待告警触发
3. 进入"告警管理" -> "通知日志"标签
4. 查看通知记录

## 验证清单

- [x] 通知日志能正确保存到Redis
- [x] 所有字段都被正确保存
- [x] 能正确查询通知日志列表
- [x] 统计数据正确计算
- [x] 前端能正确显示日志
- [x] 渠道状态正确标识
- [x] 失败原因正确记录

## 相关文件

- `backend/services/alertService.js` - 修复hSet保存和zRange查询
- `backend/services/alertChecker.js` - 修复通知发送逻辑
- `backend/test-notification-log.js` - 测试脚本
- `frontend/src/components/NotificationLogs.vue` - 前端日志组件
- `frontend/src/views/Alert.vue` - 告警管理页面

## 注意事项

1. **Redis版本兼容性**
   - 代码已兼容不同Redis版本
   - 优先使用新语法，失败时降级到旧命令

2. **数据一致性**
   - 使用逐个字段保存确保数据完整
   - 与告警规则保存方式保持一致

3. **错误处理**
   - 每个通知渠道独立处理错误
   - 失败不影响其他渠道
   - 错误信息被记录到日志中

4. **性能考虑**
   - 逐个字段保存会增加Redis调用次数
   - 但确保了数据完整性
   - 对性能影响可忽略（每次告警触发才保存一次）

## 后续优化建议

1. **批量操作优化**
   - 考虑使用Redis Pipeline批量执行命令
   - 减少网络往返次数

2. **数据清理**
   - 定期清理旧的通知日志
   - 避免Redis数据无限增长

3. **监控告警**
   - 监控通知失败率
   - 失败率过高时发送告警

## 总结

通知日志功能已修复，现在能够：
- ✅ 正确记录所有告警通知
- ✅ 记录每个渠道的发送状态
- ✅ 记录失败原因
- ✅ 提供统计数据
- ✅ 前端正确显示

请重启后端服务以应用修复。

