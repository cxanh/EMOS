<template>
  <div class="ai-analysis-page">
    <div class="page-header">
      <div class="header-left">
        <h1>🤖 AI智能分析</h1>
        <div class="ai-status" :class="{ enabled: aiStore.status?.enabled }">
          <span class="status-dot"></span>
          <span v-if="aiStore.status">
            {{ aiStore.status.enabled ? `${aiStore.status.provider} (${aiStore.status.model})` : 'AI服务未启用' }}
          </span>
        </div>
      </div>
      <button @click="refreshStatus" class="btn-secondary">
        <span>🔄</span> 刷新状态
      </button>
    </div>

    <!-- Analysis Actions -->
    <div class="analysis-actions">
      <button 
        @click="performHealthCheck" 
        class="action-card health"
        :disabled="aiStore.analyzing"
      >
        <div class="action-icon">💚</div>
        <div class="action-content">
          <h3>系统健康检查</h3>
          <p>分析当前系统整体状态</p>
        </div>
      </button>

      <button 
        @click="showTrendDialog = true" 
        class="action-card trend"
        :disabled="aiStore.analyzing"
      >
        <div class="action-icon">📈</div>
        <div class="action-content">
          <h3>性能趋势分析</h3>
          <p>分析历史数据趋势</p>
        </div>
      </button>

      <button 
        @click="performRecommendations" 
        class="action-card recommend"
        :disabled="aiStore.analyzing"
      >
        <div class="action-icon">💡</div>
        <div class="action-content">
          <h3>优化建议</h3>
          <p>获取系统优化建议</p>
        </div>
      </button>
    </div>

    <!-- Analyzing State -->
    <div v-if="aiStore.analyzing" class="analyzing-state">
      <div class="spinner"></div>
      <p>AI正在分析中，请稍候...</p>
    </div>

    <!-- Error State -->
    <div v-if="aiStore.error && !aiStore.analyzing" class="error-state">
      <div class="error-icon">⚠️</div>
      <p>{{ aiStore.error }}</p>
      <button @click="aiStore.clearError" class="btn-secondary">关闭</button>
    </div>

    <!-- Health Analysis Result -->
    <div v-if="aiStore.healthAnalysis && !aiStore.analyzing" class="result-section">
      <div class="section-header">
        <h2>系统健康分析</h2>
        <span class="timestamp">{{ formatTime(aiStore.healthAnalysis.analyzedAt) }}</span>
      </div>

      <div class="health-overview">
        <div class="health-score-card">
          <div class="score-circle" :class="getScoreClass(aiStore.healthAnalysis.healthScore)">
            <div class="score-value">{{ aiStore.healthAnalysis.healthScore }}</div>
            <div class="score-label">健康评分</div>
          </div>
          <div class="score-details">
            <div class="status-badge" :class="getStatusClass(aiStore.healthAnalysis.status)">
              {{ aiStore.healthAnalysis.status }}
            </div>
            <div class="urgency-badge" :class="aiStore.healthAnalysis.urgency">
              {{ getUrgencyLabel(aiStore.healthAnalysis.urgency) }}
            </div>
          </div>
        </div>

        <div class="health-summary">
          <h3>分析摘要</h3>
          <p>{{ aiStore.healthAnalysis.summary }}</p>
        </div>
      </div>

      <!-- Issues -->
      <div v-if="aiStore.healthAnalysis.issues && aiStore.healthAnalysis.issues.length > 0" class="issues-section">
        <h3>发现的问题 ({{ aiStore.healthAnalysis.issues.length }})</h3>
        <div class="issues-grid">
          <div 
            v-for="(issue, index) in aiStore.healthAnalysis.issues" 
            :key="index"
            class="issue-card"
            :class="issue.severity"
          >
            <div class="issue-header">
              <span class="severity-icon">{{ getSeverityIcon(issue.severity) }}</span>
              <span class="severity-label">{{ getSeverityLabel(issue.severity) }}</span>
            </div>
            <div class="issue-content">
              <div class="issue-info">
                <span><strong>节点:</strong> {{ issue.node }}</span>
                <span><strong>指标:</strong> {{ getMetricLabel(issue.metric) }}</span>
                <span><strong>当前值:</strong> {{ issue.value.toFixed(1) }}%</span>
              </div>
              <p class="issue-description">{{ issue.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div v-if="aiStore.healthAnalysis.recommendations && aiStore.healthAnalysis.recommendations.length > 0" class="recommendations-section">
        <h3>优化建议</h3>
        <ul class="recommendations-list">
          <li v-for="(rec, index) in aiStore.healthAnalysis.recommendations" :key="index">
            <span class="rec-icon">✓</span>
            <span>{{ rec }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Trend Analysis Result -->
    <div v-if="aiStore.trendAnalysis && !aiStore.analyzing" class="result-section">
      <div class="section-header">
        <h2>性能趋势分析</h2>
        <span class="timestamp">{{ formatTime(aiStore.trendAnalysis.analyzedAt) }}</span>
      </div>

      <div class="trend-overview">
        <div class="trend-card">
          <div class="trend-icon">📊</div>
          <div class="trend-info">
            <h4>趋势方向</h4>
            <p class="trend-value">{{ aiStore.trendAnalysis.trend }}</p>
          </div>
        </div>
        <div class="trend-card">
          <div class="trend-icon">🔄</div>
          <div class="trend-info">
            <h4>周期模式</h4>
            <p class="trend-value">{{ aiStore.trendAnalysis.pattern }}</p>
          </div>
        </div>
        <div class="trend-card">
          <div class="trend-icon">📅</div>
          <div class="trend-info">
            <h4>时间范围</h4>
            <p class="trend-value">{{ aiStore.trendAnalysis.timeRange }}</p>
          </div>
        </div>
        <div class="trend-card">
          <div class="trend-icon">📍</div>
          <div class="trend-info">
            <h4>数据点数</h4>
            <p class="trend-value">{{ aiStore.trendAnalysis.dataPoints }}</p>
          </div>
        </div>
      </div>

      <div class="trend-summary">
        <h3>趋势摘要</h3>
        <p>{{ aiStore.trendAnalysis.summary }}</p>
      </div>

      <!-- Predictions -->
      <div v-if="aiStore.trendAnalysis.predictions && aiStore.trendAnalysis.predictions.length > 0" class="predictions-section">
        <h3>趋势预测</h3>
        <div class="predictions-grid">
          <div 
            v-for="(pred, index) in aiStore.trendAnalysis.predictions" 
            :key="index"
            class="prediction-card"
          >
            <h4>{{ getMetricLabel(pred.metric) }}</h4>
            <div class="prediction-values">
              <div class="value-item">
                <span class="label">当前值</span>
                <span class="value">{{ pred.current.toFixed(1) }}%</span>
              </div>
              <div class="arrow">→</div>
              <div class="value-item">
                <span class="label">30天预测</span>
                <span class="value predicted">{{ pred.predicted30d.toFixed(1) }}%</span>
              </div>
            </div>
            <div class="confidence-badge" :class="pred.confidence">
              置信度: {{ getConfidenceLabel(pred.confidence) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Insights -->
      <div v-if="aiStore.trendAnalysis.insights && aiStore.trendAnalysis.insights.length > 0" class="insights-section">
        <h3>关键洞察</h3>
        <ul class="insights-list">
          <li v-for="(insight, index) in aiStore.trendAnalysis.insights" :key="index">
            <span class="insight-icon">💡</span>
            <span>{{ insight }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Recommendations Result -->
    <div v-if="aiStore.recommendations && !aiStore.analyzing" class="result-section">
      <div class="section-header">
        <h2>优化建议</h2>
        <span class="timestamp">{{ formatTime(aiStore.recommendations.analyzedAt) }}</span>
      </div>

      <!-- Quick Wins -->
      <div v-if="aiStore.recommendations.quickWins && aiStore.recommendations.quickWins.length > 0" class="quick-wins-section">
        <h3>🚀 快速见效建议</h3>
        <div class="quick-wins-grid">
          <div v-for="(win, index) in aiStore.recommendations.quickWins" :key="index" class="quick-win-card">
            <span class="win-icon">⚡</span>
            <span>{{ win }}</span>
          </div>
        </div>
      </div>

      <!-- Categories -->
      <div v-if="aiStore.recommendations.categories && aiStore.recommendations.categories.length > 0" class="categories-section">
        <div v-for="(category, index) in aiStore.recommendations.categories" :key="index" class="category-block">
          <div class="category-header">
            <h3>{{ category.category }}</h3>
            <span class="priority-badge" :class="category.priority">
              {{ getPriorityLabel(category.priority) }}
            </span>
          </div>
          <div class="recommendations-grid">
            <div 
              v-for="(rec, recIndex) in category.recommendations" 
              :key="recIndex"
              class="recommendation-card"
            >
              <h4>{{ rec.title }}</h4>
              <p class="rec-description">{{ rec.description }}</p>
              <div class="rec-meta">
                <span class="meta-item impact">
                  <strong>影响:</strong> {{ rec.impact }}
                </span>
                <span class="meta-item effort" :class="rec.effort">
                  <strong>工作量:</strong> {{ getEffortLabel(rec.effort) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Long Term -->
      <div v-if="aiStore.recommendations.longTerm && aiStore.recommendations.longTerm.length > 0" class="long-term-section">
        <h3>🎯 长期规划建议</h3>
        <ul class="long-term-list">
          <li v-for="(item, index) in aiStore.recommendations.longTerm" :key="index">
            <span class="item-icon">📋</span>
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Analysis History -->
    <div v-if="aiStore.history.length > 0" class="history-section">
      <div class="section-header">
        <h2>分析历史</h2>
      </div>
      <div class="history-list">
        <div 
          v-for="(item, index) in aiStore.history" 
          :key="index"
          class="history-item"
          @click="loadHistoryItem(item)"
        >
          <div class="history-icon">{{ getHistoryIcon(item.type) }}</div>
          <div class="history-content">
            <div class="history-type">{{ getHistoryTypeLabel(item.type) }}</div>
            <div class="history-time">{{ formatTime(item.timestamp) }}</div>
          </div>
          <div class="history-arrow">→</div>
        </div>
      </div>
    </div>

    <!-- Trend Analysis Dialog -->
    <div v-if="showTrendDialog" class="dialog-overlay" @click.self="closeTrendDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3>性能趋势分析</h3>
          <button @click="closeTrendDialog" class="btn-close">✕</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="performTrendAnalysis">
            <div class="form-group">
              <label>选择节点</label>
              <select v-model="trendForm.nodeId" required>
                <option value="">请选择节点</option>
                <option v-for="node in nodesStore.nodes" :key="node.node_id" :value="node.node_id">
                  {{ node.hostname || node.node_id }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>时间范围</label>
              <select v-model="trendForm.timeRange" required>
                <option value="24h">过去24小时</option>
                <option value="7d">过去7天</option>
                <option value="30d">过去30天</option>
              </select>
            </div>
            <div class="form-actions">
              <button type="button" @click="closeTrendDialog" class="btn-secondary">取消</button>
              <button type="submit" class="btn-primary">开始分析</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAIStore } from '@/stores/ai'
import { useNodesStore } from '@/stores/nodes'

const aiStore = useAIStore()
const nodesStore = useNodesStore()

const showTrendDialog = ref(false)
const trendForm = ref({
  nodeId: '',
  timeRange: '24h'
})

onMounted(async () => {
  await Promise.all([
    aiStore.fetchStatus(),
    nodesStore.fetchNodes()
  ])
})

const refreshStatus = async () => {
  await aiStore.fetchStatus()
}

const performHealthCheck = async () => {
  try {
    await aiStore.analyzeHealth()
  } catch (error) {
    console.error('Health check failed:', error)
  }
}

const performTrendAnalysis = async () => {
  try {
    await aiStore.analyzeTrend(trendForm.value.nodeId, trendForm.value.timeRange)
    closeTrendDialog()
  } catch (error) {
    console.error('Trend analysis failed:', error)
  }
}

const performRecommendations = async () => {
  try {
    await aiStore.getRecommendations()
  } catch (error) {
    console.error('Get recommendations failed:', error)
  }
}

const closeTrendDialog = () => {
  showTrendDialog.value = false
  trendForm.value = {
    nodeId: '',
    timeRange: '24h'
  }
}

const loadHistoryItem = (item: any) => {
  if (item.type === 'health') {
    aiStore.healthAnalysis = item.result
  } else if (item.type === 'trend') {
    aiStore.trendAnalysis = item.result
  } else if (item.type === 'recommendations') {
    aiStore.recommendations = item.result
  }
}

// Helper functions
const formatTime = (time: string | Date) => {
  const date = new Date(time)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diff < 60) return `${diff}秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return date.toLocaleString('zh-CN')
}

const getScoreClass = (score: number) => {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good'
  if (score >= 60) return 'warning'
  return 'danger'
}

const getStatusClass = (status: string) => {
  const statusMap: Record<string, string> = {
    '优秀': 'excellent',
    '良好': 'good',
    '警告': 'warning',
    '危险': 'danger'
  }
  return statusMap[status] || 'good'
}

const getUrgencyLabel = (urgency: string) => {
  const labels: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '紧急'
  }
  return labels[urgency] || urgency
}

const getSeverityIcon = (severity: string) => {
  const icons: Record<string, string> = {
    critical: '🔴',
    error: '🔴',
    warning: '⚠️',
    info: 'ℹ️'
  }
  return icons[severity] || '⚠️'
}

const getSeverityLabel = (severity: string) => {
  const labels: Record<string, string> = {
    critical: '严重',
    error: '错误',
    warning: '警告',
    info: '信息'
  }
  return labels[severity] || severity
}

const getMetricLabel = (metric: string) => {
  const labels: Record<string, string> = {
    cpu_usage: 'CPU使用率',
    memory_usage: '内存使用率',
    disk_usage: '磁盘使用率'
  }
  return labels[metric] || metric
}

const getConfidenceLabel = (confidence: string) => {
  const labels: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return labels[confidence] || confidence
}

const getPriorityLabel = (priority: string) => {
  const labels: Record<string, string> = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级'
  }
  return labels[priority] || priority
}

const getEffortLabel = (effort: string) => {
  const labels: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高'
  }
  return labels[effort] || effort
}

const getHistoryIcon = (type: string) => {
  const icons: Record<string, string> = {
    health: '💚',
    trend: '📈',
    recommendations: '💡'
  }
  return icons[type] || '📊'
}

const getHistoryTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    health: '系统健康检查',
    trend: '性能趋势分析',
    recommendations: '优化建议'
  }
  return labels[type] || type
}
</script>

<style scoped>
.ai-analysis-page {
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

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.ai-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f5f5f5;
  border-radius: 20px;
  font-size: 13px;
  color: #666;
}

.ai-status.enabled {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
}

.ai-status.enabled .status-dot {
  background: #4caf50;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Analysis Actions */
.analysis-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
}

.action-card:hover:not(:disabled) {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.action-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-card.health {
  border-color: #4caf50;
}

.action-card.health:hover:not(:disabled) {
  background: linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%);
  border-color: #4caf50;
}

.action-card.trend {
  border-color: #2196f3;
}

.action-card.trend:hover:not(:disabled) {
  background: linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%);
  border-color: #2196f3;
}

.action-card.recommend {
  border-color: #ff9800;
}

.action-card.recommend:hover:not(:disabled) {
  background: linear-gradient(135deg, #fff3e0 0%, #ffffff 100%);
  border-color: #ff9800;
}

.action-icon {
  font-size: 48px;
  line-height: 1;
}

.action-content h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.action-content p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

/* Analyzing State */
.analyzing-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  margin-bottom: 30px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.analyzing-state p {
  font-size: 16px;
  color: #666;
}

/* Error State */
.error-state {
  text-align: center;
  padding: 40px 20px;
  background: #fff5f5;
  border: 1px solid #ffcdd2;
  border-radius: 12px;
  margin-bottom: 30px;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-state p {
  color: #d32f2f;
  margin-bottom: 20px;
}

/* Result Section */
.result-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.section-header h2 {
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.timestamp {
  font-size: 13px;
  color: #999;
}

/* Health Overview */
.health-overview {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 30px;
  margin-bottom: 30px;
}

.health-score-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.score-circle {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
  position: relative;
}

.score-circle.excellent {
  background: linear-gradient(135deg, #4caf50 0%, #81c784 100%);
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.3);
}

.score-circle.good {
  background: linear-gradient(135deg, #2196f3 0%, #64b5f6 100%);
  box-shadow: 0 8px 24px rgba(33, 150, 243, 0.3);
}

.score-circle.warning {
  background: linear-gradient(135deg, #ff9800 0%, #ffb74d 100%);
  box-shadow: 0 8px 24px rgba(255, 152, 0, 0.3);
}

.score-circle.danger {
  background: linear-gradient(135deg, #f44336 0%, #e57373 100%);
  box-shadow: 0 8px 24px rgba(244, 67, 54, 0.3);
}

.score-value {
  font-size: 48px;
  font-weight: 700;
  color: white;
  line-height: 1;
}

.score-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 8px;
}

.score-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-badge, .urgency-badge {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
}

.status-badge.excellent {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.good {
  background: #e3f2fd;
  color: #1565c0;
}

.status-badge.warning {
  background: #fff3e0;
  color: #e65100;
}

.status-badge.danger {
  background: #ffebee;
  color: #c62828;
}

.urgency-badge.low {
  background: #f5f5f5;
  color: #666;
}

.urgency-badge.medium {
  background: #fff3e0;
  color: #e65100;
}

.urgency-badge.high, .urgency-badge.critical {
  background: #ffebee;
  color: #c62828;
}

.health-summary {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.health-summary h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.health-summary p {
  font-size: 15px;
  line-height: 1.6;
  color: #666;
  margin: 0;
}

/* Issues Section */
.issues-section {
  margin-bottom: 30px;
}

.issues-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

.issues-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.issue-card {
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid;
}

.issue-card.critical, .issue-card.error {
  background: #ffebee;
  border-color: #f44336;
}

.issue-card.warning {
  background: #fff3e0;
  border-color: #ff9800;
}

.issue-card.info {
  background: #e3f2fd;
  border-color: #2196f3;
}

.issue-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.severity-icon {
  font-size: 20px;
}

.severity-label {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
}

.issue-info {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.issue-description {
  font-size: 14px;
  color: #333;
  margin: 0;
  line-height: 1.5;
}

/* Recommendations Section */
.recommendations-section {
  margin-bottom: 30px;
}

.recommendations-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

.recommendations-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recommendations-list li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

.rec-icon {
  color: #4caf50;
  font-weight: bold;
  flex-shrink: 0;
}

/* Trend Overview */
.trend-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.trend-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.trend-icon {
  font-size: 32px;
}

.trend-info h4 {
  font-size: 13px;
  color: #999;
  margin: 0 0 4px 0;
  font-weight: 500;
}

.trend-value {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.trend-summary {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 24px;
}

.trend-summary h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.trend-summary p {
  font-size: 14px;
  line-height: 1.6;
  color: #666;
  margin: 0;
}

/* Predictions Section */
.predictions-section {
  margin-bottom: 30px;
}

.predictions-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

.predictions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.prediction-card {
  padding: 20px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
}

.prediction-card h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

.prediction-values {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.value-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.value-item .label {
  font-size: 12px;
  color: #999;
}

.value-item .value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
}

.value-item .value.predicted {
  color: #2196f3;
}

.arrow {
  font-size: 24px;
  color: #999;
}

.confidence-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  display: inline-block;
}

.confidence-badge.high {
  background: #e8f5e9;
  color: #2e7d32;
}

.confidence-badge.medium {
  background: #fff3e0;
  color: #e65100;
}

.confidence-badge.low {
  background: #ffebee;
  color: #c62828;
}

/* Insights Section */
.insights-section {
  margin-bottom: 30px;
}

.insights-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

.insights-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.insights-list li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #fffbf0;
  border-left: 3px solid #ff9800;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

.insight-icon {
  font-size: 18px;
  flex-shrink: 0;
}

/* Quick Wins Section */
.quick-wins-section {
  margin-bottom: 30px;
}

.quick-wins-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

.quick-wins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.quick-win-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%);
  border: 2px solid #4caf50;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
}

.win-icon {
  font-size: 24px;
  flex-shrink: 0;
}

/* Categories Section */
.categories-section {
  margin-bottom: 30px;
}

.category-block {
  margin-bottom: 24px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.category-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.priority-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.priority-badge.high {
  background: #ffebee;
  color: #c62828;
}

.priority-badge.medium {
  background: #fff3e0;
  color: #e65100;
}

.priority-badge.low {
  background: #f5f5f5;
  color: #666;
}

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.recommendation-card {
  padding: 20px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.2s;
}

.recommendation-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.recommendation-card h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.rec-description {
  font-size: 14px;
  line-height: 1.6;
  color: #666;
  margin: 0 0 16px 0;
}

.rec-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
}

.meta-item {
  padding: 4px 12px;
  background: #f5f5f5;
  border-radius: 12px;
  color: #666;
}

.meta-item.effort.low {
  background: #e8f5e9;
  color: #2e7d32;
}

.meta-item.effort.medium {
  background: #fff3e0;
  color: #e65100;
}

.meta-item.effort.high {
  background: #ffebee;
  color: #c62828;
}

/* Long Term Section */
.long-term-section {
  margin-bottom: 30px;
}

.long-term-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

.long-term-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.long-term-list li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

.item-icon {
  font-size: 18px;
  flex-shrink: 0;
}

/* History Section */
.history-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  background: #e3f2fd;
  transform: translateX(4px);
}

.history-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.history-content {
  flex: 1;
}

.history-type {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.history-time {
  font-size: 12px;
  color: #999;
}

.history-arrow {
  font-size: 20px;
  color: #999;
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
  max-width: 500px;
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
  margin: 0;
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

.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-group select:focus {
  outline: none;
  border-color: #1976d2;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

/* Buttons */
.btn-primary, .btn-secondary {
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

/* Responsive */
@media (max-width: 768px) {
  .health-overview {
    grid-template-columns: 1fr;
  }

  .analysis-actions {
    grid-template-columns: 1fr;
  }

  .issues-grid,
  .predictions-grid,
  .quick-wins-grid,
  .recommendations-grid {
    grid-template-columns: 1fr;
  }
}
</style>
