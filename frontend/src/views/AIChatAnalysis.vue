<template>
  <div class="workbench-layout">
    <!-- 紧凑的头部 -->
    <header class="workbench-header">
      <div class="header-left">
        <h1>AI 运维分析</h1>
        <span class="badge">工作台</span>
      </div>
      <div class="header-right">
        <button class="btn-ghost" type="button" @click="startNewSession">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          新建会话
        </button>
        <router-link class="btn-outline" to="/ai-analysis">退出工作台</router-link>
      </div>
    </header>

    <div class="workbench-body">
      <!-- 主聊天区 -->
      <main class="chat-main">
        <ChatContextBar
          class="compact-context-bar"
          :context="chatStore.context"
          :status="chatStore.aiStatus"
          :loading-status="chatStore.loadingStatus"
          @update:context="handleContextUpdate"
        />

        <div v-if="chatStore.error" class="error-banner">
          <span>{{ chatStore.error }}</span>
          <button type="button" @click="chatStore.clearError">关闭</button>
        </div>

        <div class="chat-scroll-area">
          <ChatMessageList :messages="chatStore.messages" />
        </div>

        <div class="chat-composer-wrap">
          <form class="chat-composer" @submit.prevent="submitQuestion">
            <div class="composer-quick-actions">
              <button type="button" class="btn-pill" @click="useSuggestedQuestion('请总结当前风险和优先处理项')">
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                风险总结
              </button>
              <button type="button" class="btn-pill" @click="useSuggestedQuestion('推荐哪些动作适合先做 dry-run？')">
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                动作建议
              </button>
            </div>
            <div class="composer-input-area">
              <textarea
                v-model.trim="question"
                :disabled="chatStore.submitting"
                placeholder="在此输入您要分析的问题，例如：这个节点近期的主要风险是什么..."
                rows="2"
                @keydown.enter.exact.prevent="submitQuestion"
              ></textarea>
              <button type="submit" class="btn-send" :disabled="chatStore.submitting || !question.trim()">
                <svg v-if="chatStore.submitting" class="spin" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line></svg>
                <svg v-else viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </form>
        </div>
      </main>

      <!-- 侧边信息区 -->
      <aside class="workbench-sidebar">
        <div class="sidebar-section">
          <div class="section-header">
            <h3>概览</h3>
            <span class="meta-tag" v-if="chatStore.currentSession">{{ chatStore.currentSession.messageCount }} 条消息</span>
          </div>
          <div class="dense-meta-card" v-if="chatStore.currentSession">
            <h4 class="truncate">{{ chatStore.currentSession.title || '当前上下文会话' }}</h4>
            <div class="meta-item"><span>ID:</span> <code>{{ chatStore.currentSession.sessionId.split('-')[0] }}...</code></div>
            <div class="meta-item"><span>时间:</span> {{ formatTime(chatStore.currentSession.updatedAt) }}</div>
          </div>
          <div class="dense-empty" v-else>暂无进行中的会话</div>
        </div>

        <div class="sidebar-section flex-1">
          <div class="section-header">
            <h3>历史记录</h3>
            <button class="btn-icon" @click="refreshRecentSessions" title="获取最新">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            </button>
          </div>
          <div class="history-list">
            <div v-if="chatStore.loadingSessions" class="dense-empty">加载中...</div>
            <div v-else-if="!chatStore.sessions.length" class="dense-empty">暂无历史会话</div>
            <div
              v-else
              v-for="session in chatStore.sessions"
              :key="session.sessionId"
              class="history-item"
              :class="{ 'is-active': session.sessionId === chatStore.currentSession?.sessionId }"
              @click="openSession(session.sessionId)"
            >
              <div class="history-item-title truncate">{{ session.title || '快捷分析任务' }}</div>
              <div class="history-item-meta">
                <span>{{ formatTimeShort(session.updatedAt) }}</span>
                <span class="range-tag">{{ session.timeRange }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChatContextBar from '@/components/ai-chat/ChatContextBar.vue'
import ChatMessageList from '@/components/ai-chat/ChatMessageList.vue'
import { useAIChatStore, type AIChatContextForm } from '@/stores/aiChat'

const route = useRoute()
const router = useRouter()
const chatStore = useAIChatStore()
const question = ref(typeof route.query.question === 'string' ? route.query.question : '')

const syncRoute = (sessionId?: string) => {
  router.replace({
    name: 'AIChatAnalysis',
    query: {
      nodeId: chatStore.context.nodeId || undefined,
      incidentId: chatStore.context.incidentId || undefined,
      timeRange: chatStore.context.timeRange,
      sessionId: sessionId || undefined
    }
  })
}

onMounted(async () => {
  await chatStore.bootstrap(route.query as Record<string, unknown>)
})

watch(
  () => route.query,
  (query) => {
    if (!chatStore.currentSession) {
      chatStore.applyRouteContext(query as Record<string, unknown>)
    }
  }
)

const handleContextUpdate = (nextContext: AIChatContextForm) => {
  chatStore.setContext(nextContext)
  if (!chatStore.currentSession) {
    syncRoute()
  }
}

const submitQuestion = async () => {
  const result = await chatStore.askQuestion(question.value)
  if (result.success) {
    syncRoute(result.sessionId)
    question.value = ''
  }
}

const useSuggestedQuestion = (value: string) => {
  question.value = value
}

const openSession = async (sessionId: string) => {
  await chatStore.loadSession(sessionId)
  syncRoute(sessionId)
}

const refreshRecentSessions = async () => {
  await chatStore.fetchRecentSessions()
}

const startNewSession = () => {
  chatStore.resetConversation()
  question.value = ''
  syncRoute()
}

const formatTime = (value: string) => {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatTimeShort = (value: string) => {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.workbench-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8fafc;
  overflow: hidden;
}

.workbench-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.badge {
  padding: 4px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-ghost,
.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-ghost {
  background: transparent;
  border: 1px solid transparent;
  color: #475569;
}

.btn-ghost:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.btn-outline {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #334155;
}

.btn-outline:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.workbench-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 主聊天区 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
}

.compact-context-bar {
  margin: 16px 24px 0;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.error-banner {
  margin: 16px 24px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #9f1239;
  font-size: 14px;
}

.error-banner button {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-weight: 600;
}

.chat-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.chat-composer-wrap {
  padding: 0 24px 24px;
  background: linear-gradient(180deg, transparent 0%, #f8fafc 20%);
  flex-shrink: 0;
}

.chat-composer {
  display: grid;
  gap: 8px;
  max-width: 800px;
  margin: 0 auto;
}

.composer-quick-actions {
  display: flex;
  gap: 8px;
}

.btn-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-pill:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

.composer-input-area {
  position: relative;
  display: flex;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.composer-input-area:focus-within {
  border-color: #0ea5e9;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}

.composer-input-area textarea {
  flex: 1;
  width: 100%;
  padding: 12px 48px 12px 14px;
  border: none;
  background: transparent;
  resize: none;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  color: #0f172a;
  outline: none;
}

.composer-input-area textarea::placeholder {
  color: #94a3b8;
}

.btn-send {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #0f172a;
  color: #ffffff;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 侧边信息区 */
.workbench-sidebar {
  width: 300px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-left: 1px solid #e2e8f0;
  flex-shrink: 0;
  height: 100%;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.sidebar-section.flex-1 {
  flex: 1;
  min-height: 0;
  border-bottom: none;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.meta-tag, .range-tag {
  padding: 2px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  font-size: 11px;
  color: #64748b;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.btn-icon:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.truncate {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.dense-meta-card {
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.dense-meta-card h4 {
  margin: 0 0 8px;
  font-size: 13px;
  color: #0f172a;
}

.meta-item {
  font-size: 12px;
  color: #475569;
  margin-bottom: 4px;
}

.meta-item:last-child {
  margin-bottom: 0;
}

.meta-item span {
  color: #94a3b8;
  display: inline-block;
  width: 36px;
}

.dense-empty {
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
  padding: 24px 0;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  background: #f8fafc;
}

.history-item.is-active {
  background: #f0f9ff;
  border-color: #bae6fd;
}

.history-item-title {
  font-size: 13px;
  font-weight: 500;
  color: #0f172a;
  margin-bottom: 4px;
}

.history-item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #64748b;
}

@media (max-width: 900px) {
  .workbench-layout {
    height: auto;
    min-height: 100vh;
  }
  .workbench-body {
    flex-direction: column;
    overflow: visible;
  }
  .chat-scroll-area {
    overflow-y: visible;
  }
  .workbench-sidebar {
    width: 100%;
    border-left: none;
    border-top: 1px solid #e2e8f0;
    height: auto;
  }
}
</style>
