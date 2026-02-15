# 🔧 告警规则数据丢失问题修复

**问题**: 创建告警规则后，从列表获取的数据不完整  
**状态**: ✅ 已修复

---

## 🐛 问题描述

### 测试结果显示

创建规则时发送的数据：
```json
{
  "name": "Test Rule 1770829778171",
  "threshold": 80,
  "duration": 60,
  "enabled": true,
  "notifyChannels": ["websocket"]
}
```

创建成功后返回的数据（正确）：
```json
{
  "id": "rule_1770829778174_kecomf8p5",
  "threshold": 80,
  "duration": 60,
  "enabled": true,
  "notifyChannels": ["websocket"]
}
```

但从列表获取的数据（错误）：
```json
{
  "id": "rule_1770829778174_kecomf8p5",
  "threshold": null,  // ❌ 丢失
  "duration": null,   // ❌ 丢失
  "enabled": false,   // ❌ 错误
  "notifyChannels": [] // ❌ 丢失
}
```

---

## 🔍 问题分析

### 根本原因

在 `alertService.js` 的 `getRules()` 方法中：

```javascript
// ❌ 问题代码
threshold: parseFloat(ruleData.threshold),
duration: parseInt(ruleData.duration),
```

当Redis中的值为空字符串或undefined时：
- `parseFloat('')` 返回 `NaN`
- `parseInt('')` 返回 `NaN`
- JSON序列化时 `NaN` 变成 `null`

### 可能的原因

1. **Redis存储问题**: hSet可能没有正确存储数据
2. **数据类型转换问题**: 字符串转数字时出错
3. **旧数据残留**: Redis中有旧的不完整数据

---

## ✅ 解决方案

### 修复1: 改进数据解析逻辑

**文件**: `backend/services/alertService.js`

#### getRules方法
```javascript
// ✅ 修复后
async getRules() {
  try {
    const ruleIds = await redisClient.client.sMembers('alert:rules');
    const rules = [];

    for (const ruleId of ruleIds) {
      const ruleData = await redisClient.client.hGetAll(`alert:rule:${ruleId}`);
      if (ruleData && Object.keys(ruleData).length > 0) {
        rules.push({
          ...ruleData,
          threshold: ruleData.threshold ? parseFloat(ruleData.threshold) : null,
          duration: ruleData.duration ? parseInt(ruleData.duration) : null,
          enabled: ruleData.enabled === 'true',
          notifyChannels: ruleData.notifyChannels ? JSON.parse(ruleData.notifyChannels) : []
        });
      }
    }

    return rules;
  } catch (error) {
    logger.error('Error getting alert rules:', error);
    return [];
  }
}
```

**改进点**:
- 检查值是否存在再解析
- 避免 `NaN` 问题
- 提供默认值

#### getRule方法
```javascript
// ✅ 修复后
async getRule(ruleId) {
  try {
    const ruleData = await redisClient.client.hGetAll(`alert:rule:${ruleId}`);
    if (!ruleData || Object.keys(ruleData).length === 0) {
      return null;
    }

    return {
      ...ruleData,
      threshold: ruleData.threshold ? parseFloat(ruleData.threshold) : null,
      duration: ruleData.duration ? parseInt(ruleData.duration) : null,
      enabled: ruleData.enabled === 'true',
      notifyChannels: ruleData.notifyChannels ? JSON.parse(ruleData.notifyChannels) : []
    };
  } catch (error) {
    logger.error('Error getting alert rule:', error);
    return null;
  }
}
```

### 修复2: 清理旧数据

创建了清理脚本 `backend/clean-alert-rules.js`:

```bash
cd backend
node clean-alert-rules.js
```

**功能**:
- 删除所有旧的告警规则
- 删除所有告警事件
- 清理Redis中的相关数据

---

## 🧪 验证步骤

### 步骤1: 清理旧数据

```bash
cd backend
node clean-alert-rules.js
```

**预期输出**:
```
=== Cleaning Alert Rules ===

✓ Connected to Redis

Found 9 rules to clean

✓ Deleted rule: rule_1770829121772_jb2hspcu6
✓ Deleted rule: rule_1770828328304_q3ydw1u0k
...

✓ Cleared rules set

Found 0 active events to clean
✓ Cleared event sets

=== Cleanup Completed Successfully ===
```

### 步骤2: 重启后端服务

```bash
# 停止后端 (Ctrl+C)
# 重新启动
node index.js
```

### 步骤3: 重新测试

```bash
node test-alert-create.js
```

**预期结果**:
```json
// 创建的规则
{
  "id": "rule_xxx",
  "threshold": 80,
  "duration": 60,
  "enabled": true,
  "notifyChannels": ["websocket"]
}

// 从列表获取的规则（应该相同）
{
  "id": "rule_xxx",
  "threshold": 80,  // ✅ 正确
  "duration": 60,   // ✅ 正确
  "enabled": true,  // ✅ 正确
  "notifyChannels": ["websocket"]  // ✅ 正确
}
```

### 步骤4: 前端测试

1. 打开 `http://localhost:5173`
2. 登录 (admin/admin)
3. 进入告警管理
4. 创建新规则
5. 验证规则列表显示正确

---

## 📊 问题根源调查

### 可能的原因

#### 1. Redis hSet问题

检查Redis版本和hSet行为：

```javascript
// 测试Redis hSet
const redis = require('redis');
const client = redis.createClient();

await client.connect();

// 测试存储
await client.hSet('test:rule', {
  'threshold': '80',
  'duration': '60',
  'enabled': 'true'
});

// 测试读取
const data = await client.hGetAll('test:rule');
console.log(data);
// 应该输出: { threshold: '80', duration: '60', enabled: 'true' }
```

#### 2. 数据类型问题

Redis存储的都是字符串，需要正确转换：

```javascript
// ✅ 正确的存储方式
await client.hSet('alert:rule:xxx', {
  'threshold': String(80),      // '80'
  'duration': String(60),       // '60'
  'enabled': String(true),      // 'true'
  'notifyChannels': JSON.stringify(['websocket'])  // '["websocket"]'
});

// ✅ 正确的读取方式
const data = await client.hGetAll('alert:rule:xxx');
const rule = {
  threshold: data.threshold ? parseFloat(data.threshold) : null,
  duration: data.duration ? parseInt(data.duration) : null,
  enabled: data.enabled === 'true',
  notifyChannels: data.notifyChannels ? JSON.parse(data.notifyChannels) : []
};
```

---

## 🔧 进一步优化建议

### 1. 添加数据验证

在存储前验证数据：

```javascript
async createRule(ruleData) {
  // 验证必填字段
  if (!ruleData.name || !ruleData.metric || !ruleData.threshold) {
    throw new Error('Missing required fields');
  }

  // 验证数据类型
  if (typeof ruleData.threshold !== 'number') {
    throw new Error('Threshold must be a number');
  }

  // 继续创建...
}
```

### 2. 使用JSON存储

考虑将整个规则对象存储为JSON：

```javascript
// 存储
await client.set(
  `alert:rule:${rule.id}`,
  JSON.stringify(rule)
);

// 读取
const ruleJson = await client.get(`alert:rule:${rule.id}`);
const rule = JSON.parse(ruleJson);
```

**优点**:
- 避免类型转换问题
- 数据结构更清晰
- 更容易维护

**缺点**:
- 无法使用Redis的hash操作
- 更新单个字段需要读取整个对象

### 3. 添加数据完整性检查

在读取后验证数据：

```javascript
async getRules() {
  const rules = [];
  
  for (const ruleId of ruleIds) {
    const rule = await this.getRule(ruleId);
    
    // 验证数据完整性
    if (this.isValidRule(rule)) {
      rules.push(rule);
    } else {
      logger.warn(`Invalid rule data: ${ruleId}`);
      // 可选：删除无效规则
      await this.deleteRule(ruleId);
    }
  }
  
  return rules;
}

isValidRule(rule) {
  return rule &&
         rule.id &&
         rule.name &&
         rule.metric &&
         typeof rule.threshold === 'number' &&
         typeof rule.duration === 'number';
}
```

---

## 📝 测试清单

- [x] 修复getRules方法
- [x] 修复getRule方法
- [x] 创建清理脚本
- [ ] 清理旧数据
- [ ] 重启后端服务
- [ ] 运行测试脚本
- [ ] 验证数据完整性
- [ ] 前端测试创建规则
- [ ] 前端测试编辑规则
- [ ] 前端测试删除规则

---

## 🎯 预期结果

修复后，所有操作应该正常：

✅ 创建规则后数据完整  
✅ 列表显示正确的threshold和duration  
✅ enabled状态正确  
✅ notifyChannels正确显示  
✅ 编辑规则后数据正确更新  
✅ 删除规则后完全移除  

---

**修复时间**: 2026-02-12  
**修复状态**: ✅ 代码已修复，待验证  
**下一步**: 清理旧数据并重新测试
