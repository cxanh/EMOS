<template>
  <div class="notification-logs">
    <!-- 统计卡片 -->
    <div v-if="stats" class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总通知数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.byStatus.success }}</div>
          <div class="stat-label">成功</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">❌</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.byStatus.failed }}</div>
          <div class="stat-label">失败</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📱</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.byChannel.websocket }}</div>
          <div class="stat-label">WebSocket</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📧</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.byChannel.email }}</div>
          <div class="stat-label">邮件</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💬</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.byChannel.dingtalk }}</div>
          <div class="stat-label">钉钉</div>
        </div>
      </div>
    </div>

    <!-- 日志列表 -->
    <div class="logs-section">
      <div class="section-header">
        <h3>通知日志</h3>
        <button @click="refreshLogs" class="btn-refresh">
          <span>🔄</span> 刷新
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="logs.length === 0" class="empty-state">
        <span class="icon">📝</span>
        <p>暂无通知日志</p>
      </div>

      <div v-else class="logs-list">
        <div v-for="log in logs" :key="log.id" class="log-card">
          <div class="log-header">
            <div class="log-title">
              <span class="log-icon">🔔</span>
              <span class="log-rule">{{ log.ruleName }}</span>
            </div>
            <div class="log-time">{{ formatTime(log.timestamp) }}</div>
          </div>

          <div class="log-info">
            <span><strong>节点:</strong> {{ log.nodeName }}</span>
            <span><strong>事件ID:</strong> {{ log.eventId }}</span>
          </div>

          <div class="log-channels">
            <strong>通知渠道:</strong>
            <div class="channel-list">
              <div
                v-for="(channel, index) in log.channels"
                :key="index"
                class="channel-item"
                :class="channel.status"
              >
                <span class="channel-icon">{{ getChannelIcon(channel.type) }}</span>
                <span class="channel-name">{{ getChannelLabel(channel.type) }}</span>
                <span class="channel-status">
                  {{ channel.status === 'success' ? '✓' : '✗' }}
                </span>
                <span v-if="channel.error" class="channel-error" :title="channel.error">
                  {{ channel.error }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="logs.length > 0 && hasMore" class="load-more">
        <button @click="loadMore" class="btn-load-more" :disabled="loadingMore">
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { NotificationLog, NotificationStats } from '@/api/alert'
import * as alertApi from '@/api/alert'

const logs = ref<NotificationLog[]>([])
const stats = ref<NotificationStats | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const limit = 20
const offset = ref(0)

onMounted(async () => {
  await Promise.all([
    fetchLogs(),
    fetchStats()
  ])
})

const fetchLogs = async () => {
  try {
    loading.value = true
    const response = await alertApi.getNotificationLogs({ limit, offset: 0 })
    if (response.success) {
      logs.value = response.data.logs
      offset.value = logs.value.length
      hasMore.value = response.data.logs.length === limit
    }
  } catch (error) {
    console.error('Failed to fetch notification logs:', error)
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const response = await alertApi.getNotificationStats()
    if (response.success) {
      stats.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch notification stats:', error)
  }
}

const loadMore = async () => {
  try {
    loadingMore.value = true
    const response = await alertApi.getNotificationLogs({ limit, offset: offset.value })
    if (response.success) {
      logs.value.push(...response.data.logs)
      offset.value = logs.value.length
      hasMore.value = response.data.logs.length === limit
    }
  } catch (error) {
    console.error('Failed to load more logs:', error)
  } finally {
    loadingMore.value = false
  }
}

const refreshLogs = async () => {
  offset.value = 0
  await Promise.all([
    fetchLogs(),
    fetchStats()
  ])
}

const getChannelIcon = (type: string) => {
  const icons: Record<string, string> = {
    websocket: '📱',
    email: '📧',
    dingtalk: '💬'
  }
  return icons[type] || '📢'
}

const getChannelLabel = (type: string) => {
  const labels: Record<string, string> = {
    websocket: 'WebSocket',
    email: '邮件',
    dingtalk: '钉钉'
  }
  return labels[type] || type
}

const formatTime = (time: string) => {
  const date = new Date(time)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>

<style scoped>
.notification-logs {
  padding: 20px 0;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  transition: all 0.2s;
}

.stat-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 32px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

/* 日志列表 */
.logs-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
}

.section-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.btn-refresh {
  padding: 6px 12px;
  background: #f5f5f5;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-refresh:hover {
  background: #e0e0e0;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 空状态 */
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

/* 日志卡片 */
.logs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-card {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.2s;
}

.log-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.log-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.log-icon {
  font-size: 20px;
}

.log-time {
  font-size: 13px;
  color: #999;
}

.log-info {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.log-channels {
  font-size: 14px;
  color: #666;
}

.channel-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.channel-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #e0e0e0;
}

.channel-item.success {
  border-left-color: #4caf50;
  background: #f1f8f4;
}

.channel-item.failed {
  border-left-color: #f44336;
  background: #fef5f5;
}

.channel-icon {
  font-size: 18px;
}

.channel-name {
  flex: 1;
  font-weight: 500;
}

.channel-status {
  font-size: 16px;
  font-weight: 600;
}

.channel-item.success .channel-status {
  color: #4caf50;
}

.channel-item.failed .channel-status {
  color: #f44336;
}

.channel-error {
  font-size: 12px;
  color: #f44336;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 加载更多 */
.load-more {
  text-align: center;
  margin-top: 20px;
}

.btn-load-more {
  padding: 10px 24px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-load-more:hover:not(:disabled) {
  background: #1565c0;
}

.btn-load-more:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .log-info {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
