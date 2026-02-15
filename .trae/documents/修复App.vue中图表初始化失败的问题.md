## 问题分析

图表初始化失败的原因是：
1. **初始化时机问题**：`initCharts()` 函数在 `onMounted` 钩子中调用，但此时默认显示的是 `home` 视图，而图表容器在 `dashboard` 视图中
2. **容器不存在**：当组件首次加载时，`dashboard` 视图的图表容器尚未渲染，导致 `chartRef.value` 为 `null`
3. **切换视图时未重新初始化**：当用户从 `home` 切换到 `dashboard` 时，图表容器会渲染，但没有触发重新初始化图表的逻辑

## 修复方案

### 方案1：使用watch监听视图切换
在App.vue中添加watch监听器，当currentView切换到'dashboard'时重新初始化图表

### 方案2：在dashboard视图中使用nextTick初始化
在dashboard视图渲染后通过nextTick调用initCharts函数

## 推荐方案

**方案1**：使用watch监听视图切换，因为这种方式更直接且可靠

## 具体修改步骤

1. **导入watch**：在App.vue的import语句中添加watch
2. **添加watch监听器**：监听currentView的变化
3. **重新初始化图表**：当currentView变为'dashboard'时，等待DOM更新后调用initCharts

## 预期效果

修复后，当用户切换到系统监控页面时，图表会自动初始化并显示数据，不再出现"chart not initialized"的警告信息。