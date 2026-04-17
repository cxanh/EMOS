<template>
  <div class="alert-page">
    <!-- Toast Notification -->
    <Toast ref="toastRef" :message="toastMessage" :type="toastType" />
    
    <div class="page-header">
      <h1>告警管理</h1>
      <div class="header-actions">
        <button @click="showCreateDialog = true" class="btn-primary">
          <span>➕</span> 新建规则
        </button>
        <button @click="refreshData" class="btn-secondary">
          <span>🔄</span> 刷新
        </button>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="tabs">
      <button
        class="tab"
        :class="{ active: activeTab === 'alerts' }"
        @click="activeTab = 'alerts'"
      >
        活动告警
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'rules' }"
        @click="activeTab = 'rules'"
      >
        告警规则
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'logs' }"
        @click="activeTab = 'logs'"
      >
        通知日志
      </button>
    </div>

    <!-- Active Alerts Section -->
    <div v-show="activeTab === 'alerts'" class="section">
      <div class="section-header">
        <h2>活动告警 ({{ alertStore.activeAlertCount }})</h2>
      </div>
      <div v-if="alertStore.activeEvents.length === 0" class="empty-state">
        <span class="icon">✅</span>
        <p>暂无活动告警</p>
      </div>
      <div v-else class="alert-list">
        <div
          v-for="event in alertStore.activeEvents"
          :key="event.id"
          class="alert-card active"
        >
          <div class="alert-icon">🔴</div>
          <div class="alert-content">
            <div class="alert-title">{{ event.ruleName }}</div>
            <div class="alert-details">
              <span>节点: {{ event.nodeName }}</span>
              <span>指标: {{ getMetricLabel(event.metric) }}</span>
              <span>当前值: {{ formatPercent(event.currentValue) }}</span>
              <span>阈值: {{ event.threshold }}%</span>
            </div>
            <div class="alert-time">{{ formatTime(event.triggeredAt) }}</div>
          </div>
          <div class="alert-actions">
            <button @click="handleResolve(event.id)" class="btn-success">处理</button>
            <button @click="handleIgnore(event.id)" class="btn-warning">忽略</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Alert Rules Section -->
    <div v-show="activeTab === 'rules'" class="section">
      <div class="section-header">
        <h2>告警规则 ({{ alertStore.rules.length }})</h2>
      </div>
      <div v-if="alertStore.rules.length === 0" class="empty-state">
        <span class="icon">📋</span>
        <p>暂无告警规则，点击"新建规则"创建</p>
      </div>
      <div v-else class="rules-list">
        <div
          v-for="rule in alertStore.rules"
          :key="rule.id"
          class="rule-card"
          :class="{ disabled: !rule.enabled }"
        >
          <div class="rule-header">
            <div class="rule-title">
              <span class="rule-status" :class="{ enabled: rule.enabled }">
                {{ rule.enabled ? '●' : '○' }}
              </span>
              {{ rule.name }}
            </div>
            <div class="rule-actions">
              <button @click="toggleRuleStatus(rule)" class="btn-icon" :title="rule.enabled ? '禁用' : '启用'">
                {{ rule.enabled ? '⏸' : '▶' }}
              </button>
              <button @click="editRule(rule)" class="btn-icon" title="编辑">✏️</button>
              <button @click="deleteRuleConfirm(rule)" class="btn-icon" title="删除">🗑️</button>
            </div>
          </div>
          <div class="rule-details">
            <div class="rule-info">
              <span><strong>节点:</strong> {{ rule.nodeId === '*' ? '所有节点' : rule.nodeId }}</span>
              <span><strong>指标:</strong> {{ getMetricLabel(rule.metric) }}</span>
              <span><strong>条件:</strong> {{ getOperatorLabel(rule.operator) }} {{ rule.threshold }}%</span>
              <span><strong>持续时间:</strong> {{ rule.duration }}秒</span>
            </div>
            <div class="rule-channels">
              <strong>通知方式:</strong>
              <span v-for="channel in rule.notifyChannels" :key="channel" class="channel-tag">
                {{ getChannelLabel(channel) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Notification Logs Section -->
    <div v-show="activeTab === 'logs'" class="section">
      <NotificationLogs />
    </div>

    <!-- Create/Edit Rule Dialog -->
    <div v-if="showCreateDialog || showEditDialog" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3>{{ showEditDialog ? '编辑告警规则' : '新建告警规则' }}</h3>
          <button @click="closeDialog" class="btn-close">✕</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="submitRule">
            <div class="form-group">
              <label>规则名称 *</label>
              <input v-model="ruleForm.name" type="text" required placeholder="例如: CPU使用率过高" />
            </div>
            <div class="form-group">
              <label>监控节点</label>
              <select v-model="ruleForm.nodeId">
                <option value="*">所有节点</option>
                <option v-for="node in nodesStore.nodes" :key="node.node_id" :value="node.node_id">
                  {{ node.hostname || node.node_id }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>监控指标 *</label>
                <select v-model="ruleForm.metric" required>
                  <option value="cpu_usage">CPU使用率</option>
                  <option value="memory_usage">内存使用率</option>
                  <option value="disk_usage">磁盘使用率</option>
                </select>
              </div>
              <div class="form-group">
                <label>条件 *</label>
                <select v-model="ruleForm.operator" required>
                  <option value="gt">大于 (&gt;)</option>
                  <option value="gte">大于等于 (&gt;=)</option>
                  <option value="lt">小于 (&lt;)</option>
                  <option value="lte">小于等于 (&lt;=)</option>
                  <option value="eq">等于 (=)</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>阈值 (%) *</label>
                <input v-model.number="ruleForm.threshold" type="number" min="0" max="100" required />
              </div>
              <div class="form-group">
                <label>持续时间 (秒) *</label>
                <input v-model.number="ruleForm.duration" type="number" min="0" required />
              </div>
            </div>
            <div class="form-group">
              <label>通知方式</label>
              <div class="checkbox-group">
                <label>
                  <input type="checkbox" value="websocket" v-model="ruleForm.notifyChannels" />
                  WebSocket推送
                </label>
                <label>
                  <input type="checkbox" value="email" v-model="ruleForm.notifyChannels" />
                  邮件通知
                </label>
                <label>
                  <input type="checkbox" value="dingtalk" v-model="ruleForm.notifyChannels" />
                  钉钉通知
                </label>
              </div>
            </div>
            <div class="form-actions">
              <button type="button" @click="closeDialog" class="btn-secondary">取消</button>
              <button type="submit" class="btn-primary">{{ showEditDialog ? '保存' : '创建' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAlertStore } from '@/stores/alert'
import { useNodesStore } from '@/stores/nodes'
import type { AlertRule, CreateRuleRequest } from '@/api/alert'
import Toast from '@/components/Toast.vue'
import NotificationLogs from '@/components/NotificationLogs.vue'

const alertStore = useAlertStore()
const nodesStore = useNodesStore()

const activeTab = ref<'alerts' | 'rules' | 'logs'>('alerts')
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const editingRuleId = ref<string | null>(null)

// Toast
const toastRef = ref<InstanceType<typeof Toast> | null>(null)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'warning' | 'info'>('success')

const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
  toastMessage.value = message
  toastType.value = type
  toastRef.value?.show()
}

const ruleForm = ref<CreateRuleRequest>({
  name: '',
  nodeId: '*',
  metric: 'cpu_usage',
  operator: 'gt',
  threshold: 80,
  duration: 60,
  notifyChannels: ['websocket']
})

onMounted(async () => {
  await Promise.all([
    alertStore.fetchRules(),
    alertStore.fetchActiveEvents(),
    nodesStore.fetchNodes()
  ])
})

const refreshData = async () => {
  await Promise.all([
    alertStore.fetchRules(),
    alertStore.fetchActiveEvents()
  ])
}

const submitRule = async () => {
  try {
    if (showEditDialog.value && editingRuleId.value) {
      await alertStore.updateRule(editingRuleId.value, ruleForm.value)
      showToast('规则更新成功！', 'success')
    } else {
      await alertStore.createRule(ruleForm.value)
      showToast('规则创建成功！', 'success')
    }
    closeDialog()
  } catch (error) {
    console.error('Failed to submit rule:', error)
    showToast('操作失败: ' + (error as any).message, 'error')
  }
}

const editRule = (rule: AlertRule) => {
  editingRuleId.value = rule.id
  ruleForm.value = {
    name: rule.name,
    nodeId: rule.nodeId,
    metric: rule.metric,
    operator: rule.operator,
    threshold: rule.threshold,
    duration: rule.duration,
    notifyChannels: [...rule.notifyChannels]
  }
  showEditDialog.value = true
}

const deleteRuleConfirm = async (rule: AlertRule) => {
  if (confirm(`确定要删除告警规则"${rule.name}"吗？`)) {
    try {
      await alertStore.deleteRule(rule.id)
      showToast('规则删除成功！', 'success')
    } catch (error) {
      console.error('Failed to delete rule:', error)
      showToast('删除失败: ' + (error as any).message, 'error')
    }
  }
}

const toggleRuleStatus = async (rule: AlertRule) => {
  try {
    await alertStore.toggleRule(rule.id, !rule.enabled)
    const status = !rule.enabled ? '启用' : '禁用'
    showToast(`规则已${status}！`, 'success')
  } catch (error) {
    console.error('Failed to toggle rule:', error)
    showToast('操作失败: ' + (error as any).message, 'error')
  }
}

const handleResolve = async (eventId: string) => {
  const comment = prompt('请输入处理备注（可选）:')
  if (comment !== null) {
    await alertStore.resolveEvent(eventId, comment || undefined)
  }
}

const handleIgnore = async (eventId: string) => {
  if (confirm('确定要忽略此告警吗？')) {
    await alertStore.ignoreEvent(eventId)
  }
}

const closeDialog = () => {
  showCreateDialog.value = false
  showEditDialog.value = false
  editingRuleId.value = null
  ruleForm.value = {
    name: '',
    nodeId: '*',
    metric: 'cpu_usage',
    operator: 'gt',
    threshold: 80,
    duration: 60,
    notifyChannels: ['websocket']
  }
}

const getMetricLabel = (metric: string) => {
  const labels: Record<string, string> = {
    cpu_usage: 'CPU使用率',
    memory_usage: '内存使用率',
    disk_usage: '磁盘使用率'
  }
  return labels[metric] || metric
}

const getOperatorLabel = (operator: string) => {
  const labels: Record<string, string> = {
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
    eq: '='
  }
  return labels[operator] || operator
}

const getChannelLabel = (channel: string) => {
  const labels: Record<string, string> = {
    websocket: 'WebSocket',
    email: '邮件',
    dingtalk: '钉钉'
  }
  return labels[channel] || channel
}

const formatPercent = (value: number | string | null | undefined) => {
  const numericValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(1)}%` : '-'
}

const formatTime = (time: string | null | undefined) => {
  if (!time) return '-'

  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return '-'
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diff < 60) return `${diff}秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return date.toLocaleString('zh-CN')
}
</script>

<style scoped>
.alert-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
}

.header-actions {
  display: flex;
  gap: 10px;
}

/* 标签页 */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: white;
  padding: 8px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tab {
  flex: 1;
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
}

.tab:hover {
  background: #f5f5f5;
  color: #1a1a1a;
}

.tab.active {
  background: #1976d2;
  color: white;
}

.section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-header {
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-state .icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 8px;
  background: #fff5f5;
  border: 1px solid #ffcdd2;
}

.alert-icon {
  font-size: 24px;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-size: 16px;
  font-weight: 600;
  color: #d32f2f;
  margin-bottom: 8px;
}

.alert-details {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.alert-time {
  font-size: 12px;
  color: #999;
}

.alert-actions {
  display: flex;
  gap: 8px;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-card {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  background: white;
  transition: all 0.2s;
}

.rule-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.rule-card.disabled {
  opacity: 0.6;
  background: #f5f5f5;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.rule-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.rule-status {
  font-size: 12px;
  color: #999;
}

.rule-status.enabled {
  color: #4caf50;
}

.rule-actions {
  display: flex;
  gap: 8px;
}

.rule-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-info {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #666;
  flex-wrap: wrap;
}

.rule-channels {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.channel-tag {
  padding: 2px 8px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 4px;
  font-size: 12px;
}

/* Buttons */
.btn-primary, .btn-secondary, .btn-success, .btn-warning, .btn-icon {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #1976d2;
  color: white;
}

.btn-primary:hover {
  background: #1565c0;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-success {
  background: #4caf50;
  color: white;
}

.btn-success:hover {
  background: #43a047;
}

.btn-warning {
  background: #ff9800;
  color: white;
}

.btn-warning:hover {
  background: #f57c00;
}

.btn-icon {
  padding: 4px 8px;
  background: transparent;
  font-size: 16px;
}

.btn-icon:hover {
  background: #f5f5f5;
}

/* Dialog */
.dialog-overlay {
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
}

.dialog {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 32px;
  height: 32px;
}

.btn-close:hover {
  color: #666;
}

.dialog-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #1976d2;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: normal;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
