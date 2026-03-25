<template>
  <div class="custom-dashboard">
    <div class="dashboard-header">
      <h2>自定义仪表盘</h2>
      <div class="header-actions">
        <button @click="showAddWidget = true" class="btn-primary">
          <span class="icon">➕</span>
          添加组件
        </button>
        <button @click="toggleEditMode" class="btn-secondary">
          <span class="icon">{{ editMode ? '✅' : '✏️' }}</span>
          {{ editMode ? '完成编辑' : '编辑布局' }}
        </button>
        <button @click="resetLayout" class="btn-danger">
          <span class="icon">🔄</span>
          重置布局
        </button>
      </div>
    </div>

    <!-- 仪表盘网格 -->
    <div class="dashboard-grid" :class="{ 'edit-mode': editMode }">
      <div
        v-for="widget in widgets"
        :key="widget.id"
        class="widget-container"
        :style="getWidgetStyle(widget)"
      >
        <div class="widget-header">
          <h3>{{ widget.title }}</h3>
          <div class="widget-actions" v-if="editMode">
            <button @click="removeWidget(widget.id)" class="btn-icon">❌</button>
          </div>
        </div>
        <div class="widget-content">
          <component
            :is="getWidgetComponent(widget.type)"
            :widget="widget"
            :node-id="widget.nodeId"
          />
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="widgets.length === 0" class="empty-state">
      <div class="empty-icon">📊</div>
      <h3>暂无组件</h3>
      <p>点击"添加组件"按钮开始自定义您的仪表盘</p>
      <button @click="showAddWidget = true" class="btn-primary">添加第一个组件</button>
    </div>

    <!-- 添加组件对话框 -->
    <div v-if="showAddWidget" class="modal-overlay" @click="showAddWidget = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>添加组件</h3>
          <button @click="showAddWidget = false" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>组件类型</label>
            <select v-model="newWidget.type" class="form-control">
              <option value="cpu-gauge">CPU仪表盘</option>
              <option value="memory-gauge">内存仪表盘</option>
              <option value="disk-pie">磁盘饼图</option>
              <option value="network-line">网络趋势图</option>
              <option value="system-radar">系统雷达图</option>
              <option value="stats-card">统计卡片</option>
            </select>
          </div>
          <div class="form-group">
            <label>组件标题</label>
            <input v-model="newWidget.title" type="text" class="form-control" placeholder="输入标题" />
          </div>
          <div class="form-group">
            <label>选择节点</label>
            <select v-model="newWidget.nodeId" class="form-control">
              <option value="">所有节点</option>
              <option v-for="node in nodes" :key="node.id" :value="node.id">
                {{ node.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>组件大小</label>
            <select v-model="newWidget.size" class="form-control">
              <option value="small">小 (1x1)</option>
              <option value="medium">中 (2x1)</option>
              <option value="large">大 (2x2)</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showAddWidget = false" class="btn-secondary">取消</button>
          <button @click="addWidget" class="btn-primary">添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNodesStore } from '@/stores/nodes'
import { useMetricsStore } from '@/stores/metrics'
import CPUGaugeWidget from '@/components/widgets/CPUGaugeWidget.vue'
import MemoryGaugeWidget from '@/components/widgets/MemoryGaugeWidget.vue'
import DiskPieWidget from '@/components/widgets/DiskPieWidget.vue'
import NetworkLineWidget from '@/components/widgets/NetworkLineWidget.vue'
import SystemRadarWidget from '@/components/widgets/SystemRadarWidget.vue'
import StatsCardWidget from '@/components/widgets/StatsCardWidget.vue'

const nodesStore = useNodesStore()
const metricsStore = useMetricsStore()

const nodes = computed(() => nodesStore.nodes)
const editMode = ref(false)
const showAddWidget = ref(false)

interface Widget {
  id: string
  type: string
  title: string
  nodeId: string
  size: 'small' | 'medium' | 'large'
  position: { x: number; y: number }
}

const widgets = ref<Widget[]>([])

const newWidget = ref({
  type: 'cpu-gauge',
  title: 'CPU使用率',
  nodeId: '',
  size: 'medium' as 'small' | 'medium' | 'large'
})

// 组件映射
const widgetComponents: Record<string, any> = {
  'cpu-gauge': CPUGaugeWidget,
  'memory-gauge': MemoryGaugeWidget,
  'disk-pie': DiskPieWidget,
  'network-line': NetworkLineWidget,
  'system-radar': SystemRadarWidget,
  'stats-card': StatsCardWidget
}

const getWidgetComponent = (type: string) => {
  return widgetComponents[type] || StatsCardWidget
}

const getWidgetStyle = (widget: Widget) => {
  const sizeMap = {
    small: { width: '1fr', height: '250px' },
    medium: { width: '2fr', height: '250px' },
    large: { width: '2fr', height: '500px' }
  }
  return sizeMap[widget.size] || sizeMap.medium
}

const addWidget = () => {
  const widget: Widget = {
    id: Date.now().toString(),
    type: newWidget.value.type,
    title: newWidget.value.title,
    nodeId: newWidget.value.nodeId,
    size: newWidget.value.size,
    position: { x: 0, y: widgets.value.length }
  }
  widgets.value.push(widget)
  saveLayout()
  showAddWidget.value = false
  
  // 重置表单
  newWidget.value = {
    type: 'cpu-gauge',
    title: 'CPU使用率',
    nodeId: '',
    size: 'medium'
  }
}

const removeWidget = (id: string) => {
  widgets.value = widgets.value.filter(w => w.id !== id)
  saveLayout()
}

const toggleEditMode = () => {
  editMode.value = !editMode.value
}

const resetLayout = () => {
  if (confirm('确定要重置布局吗？这将删除所有自定义组件。')) {
    widgets.value = []
    saveLayout()
  }
}

const saveLayout = () => {
  localStorage.setItem('dashboard-layout', JSON.stringify(widgets.value))
}

const loadLayout = () => {
  const saved = localStorage.getItem('dashboard-layout')
  if (saved) {
    try {
      widgets.value = JSON.parse(saved)
    } catch (e) {
      console.error('Failed to load dashboard layout:', e)
    }
  }
}

onMounted(() => {
  loadLayout()
  nodesStore.fetchNodes()
})
</script>

<style scoped>
.custom-dashboard {
  padding: 20px;
  min-height: calc(100vh - 60px);
  background: #f5f7fa;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dashboard-header h2 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.dashboard-grid.edit-mode .widget-container {
  border: 2px dashed #409eff;
  cursor: move;
}

.widget-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.widget-container:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.widget-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.widget-actions {
  display: flex;
  gap: 8px;
}

.widget-content {
  padding: 16px;
  min-height: 200px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #2c3e50;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #7f8c8d;
}

/* 按钮样式 */
.btn-primary, .btn-secondary, .btn-danger {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #ecf0f1;
  color: #2c3e50;
}

.btn-secondary:hover {
  background: #d5dbdb;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.btn-icon:hover {
  opacity: 1;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #ecf0f1;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  color: #2c3e50;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #7f8c8d;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #ecf0f1;
  color: #2c3e50;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #ecf0f1;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #2c3e50;
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
