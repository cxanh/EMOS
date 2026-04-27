<template>
  <div class="message-list">
    <div v-if="!messages.length" class="empty-state">
      <h3>开始一段短会话</h3>
      <p>输入问题后，后端会基于当前上下文生成摘要，并返回回答、结构化结论与推荐动作。</p>
    </div>

    <div v-for="message in messages" :key="message.messageId" class="message-thread">
      <article class="bubble bubble-user">
        <div class="bubble-label">你的问题</div>
        <p>{{ message.question }}</p>
      </article>

      <article class="bubble bubble-assistant">
        <div class="bubble-label">AI 回复</div>
        <p class="answer">{{ message.answer || '当前未返回文本回答。' }}</p>

        <section class="conclusion-block">
          <div class="section-title">结构化结论</div>
          <div class="conclusion-summary">
            <strong>{{ message.conclusion.summary || '暂无结论摘要' }}</strong>
            <span class="risk-pill" :class="message.conclusion.riskLevel">{{ message.conclusion.riskLevel }}</span>
          </div>
          <div class="detail-grid">
            <div class="detail-card">
              <div class="detail-title">关键发现</div>
              <ul>
                <li v-for="finding in message.conclusion.keyFindings" :key="finding">{{ finding }}</li>
                <li v-if="!message.conclusion.keyFindings.length">暂无</li>
              </ul>
            </div>
            <div class="detail-card">
              <div class="detail-title">影响对象</div>
              <ul>
                <li v-for="entity in message.conclusion.affectedEntities" :key="entity">{{ entity }}</li>
                <li v-if="!message.conclusion.affectedEntities.length">暂无</li>
              </ul>
            </div>
          </div>
        </section>

        <RecommendedActionCards :actions="message.recommendedActions" />
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AIChatAssistantMessage } from '@/api/aiChat'
import RecommendedActionCards from './RecommendedActionCards.vue'

defineProps<{
  messages: AIChatAssistantMessage[]
}>()
</script>

<style scoped>
.message-list {
  display: grid;
  gap: 18px;
}

.empty-state {
  padding: 28px;
  border: 1px dashed #cbd5e1;
  border-radius: 16px;
  background: linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%);
  text-align: center;
}

.empty-state h3 {
  margin: 0 0 8px;
  color: #0f172a;
}

.empty-state p {
  margin: 0;
  color: #475569;
  line-height: 1.6;
}

.message-thread {
  display: grid;
  gap: 12px;
}

.bubble {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 16px;
}

.bubble-user {
  justify-self: end;
  width: min(100%, 520px);
  background: #0f172a;
  color: #f8fafc;
}

.bubble-assistant {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.06);
}

.bubble-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.8;
}

.bubble p,
.bubble ul {
  margin: 0;
}

.answer {
  color: #1e293b;
  line-height: 1.7;
  white-space: pre-wrap;
}

.conclusion-block {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.section-title,
.detail-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f766e;
}

.conclusion-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #0f172a;
}

.detail-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.detail-card {
  padding: 12px;
  border-radius: 12px;
  background: #ffffff;
}

.detail-card ul {
  padding-left: 18px;
  color: #475569;
  line-height: 1.6;
}

.risk-pill {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.risk-pill.low {
  background: #dcfce7;
  color: #166534;
}

.risk-pill.medium {
  background: #fef3c7;
  color: #92400e;
}

.risk-pill.high {
  background: #fee2e2;
  color: #991b1b;
}

@media (max-width: 768px) {
  .bubble-user {
    justify-self: stretch;
    width: 100%;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .conclusion-summary {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
