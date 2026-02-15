# 告警规则显示问题修复

## 问题描述
创建告警规则成功后，规则列表仍然显示"告警规则 (0)"，规则没有显示在页面上。

## 问题分析

### 1. WebSocket端口错误
- 前端配置文件中WebSocket URL指向错误的端口3000
- 应该指向后端实际运行的端口50001
- 这导致WebSocket连接失败，但不影响HTTP API调用

### 2. 可能的响应式更新问题
- Vue的响应式系统可能没有检测到数组的更新
- 需要使用数组展开操作符强制触发更新

## 修复内容

### 1. 修复WebSocket端口配置
**文件**: `frontend/.env`

```env
# 修改前
VITE_WS_URL=ws://localhost:3000/ws/metrics

# 修改后
VITE_WS_URL=ws://localhost:50001/ws/metrics
```

### 2. 增强Store日志和响应式更新
**文件**: `frontend/src/stores/alert.ts`

- 添加详细的调试日志，追踪API响应
- 使用数组展开操作符 `[...array]` 确保Vue检测到变化
- 添加响应结构验证，防止undefined错误

```typescript
// 关键修改
if (fetchResponse.data.success && fetchResponse.data.data?.rules) {
  // 使用展开操作符强制触发响应式更新
  rules.value = [...fetchResponse.data.data.rules]
  console.log('[Alert Store] Rules updated:', rules.value.length, 'rules')
  console.log('[Alert Store] Rules content:', JSON.stringify(rules.value, null, 2))
}
```

## 测试步骤

### 1. 重启前端开发服务器
由于修改了 `.env` 文件，必须重启前端服务：

```bash
# 在 frontend 目录下
# 停止当前运行的服务 (Ctrl+C)
# 然后重新启动
npm run dev
```

### 2. 打开浏览器控制台
按 F12 打开开发者工具，查看Console标签

### 3. 创建新的告警规则
1. 点击"新建规则"按钮
2. 填写规则信息
3. 点击"创建"

### 4. 查看控制台日志
应该看到以下日志输出：

```
[Alert Store] Creating rule: {...}
[Alert Store] Create response: {...}
[Alert Store] Fetching rules after create...
[Alert Store] Fetch response: {...}
[Alert Store] Fetch response rules: [...]
[Alert Store] Rules updated: X rules
[Alert Store] Rules content: [...]
```

### 5. 验证结果
- ✅ WebSocket连接成功（不再显示端口3000的错误）
- ✅ 创建成功后显示Toast通知
- ✅ 规则列表显示正确的数量
- ✅ 规则卡片正确显示在页面上

## 预期行为

1. 创建规则后，Toast显示"规则创建成功！"
2. 规则列表标题显示正确的数量，如"告警规则 (1)"
3. 规则卡片显示在列表中，包含所有规则信息
4. WebSocket连接成功，不再有连接错误

## 如果问题仍然存在

### 检查控制台日志
查找 `[Alert Store]` 开头的日志，特别注意：

1. **Fetch response rules** - 确认API返回了规则数组
2. **Rules updated** - 确认规则数量正确
3. **Rules content** - 查看规则的完整内容

### 可能的问题

#### 问题1: API返回空数组
```
[Alert Store] Fetch response rules: []
```
**解决方案**: 检查后端Redis数据，运行 `node backend/test-alert-create.js` 验证后端

#### 问题2: API响应结构错误
```
[Alert Store] Invalid response structure
```
**解决方案**: 检查后端 `backend/routes/alert.js` 的响应格式

#### 问题3: 前端未重启
**解决方案**: 确保重启了前端开发服务器以加载新的 `.env` 配置

## 相关文件

- `frontend/.env` - 环境配置
- `frontend/src/stores/alert.ts` - 告警Store
- `frontend/src/views/Alert.vue` - 告警页面
- `backend/routes/alert.js` - 后端API路由
- `backend/services/alertService.js` - 告警服务

## 后续优化建议

1. 考虑使用 `nextTick` 确保DOM更新
2. 添加加载状态指示器
3. 实现乐观更新（先更新UI，再调用API）
4. 添加错误重试机制
