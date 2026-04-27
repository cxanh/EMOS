<template>
  <div class="skill-card">
    <div class="card-header">
      <h3 class="title">{{ skill.title }}</h3>
      <div class="badges">
        <span class="badge type-badge">{{ getSkillTypeLabel(skill.skillType) }}</span>
        <span v-if="skill.riskLevel" class="badge risk-badge" :class="skill.riskLevel">
          {{ getRiskLevelLabel(skill.riskLevel) }}
        </span>
        <span v-if="!skill.enabled" class="badge disabled-badge">已禁用</span>
      </div>
    </div>

    <div class="card-body">
      <p class="description">{{ skill.description }}</p>

      <div class="scenario-section">
        <span class="scenario-label">适用场景:</span>
        <p class="scenario-text">{{ skill.scenario }}</p>
      </div>

      <div v-if="skill.skillType === 'platform_action_skill'" class="warning-notice">
        ⚠️ 这是一个受控动作，此处仅用于跳转到相关执行中心，不可直接被触发执行。
      </div>
    </div>

    <div class="card-footer">
      <button class="nav-btn" :class="{ 'btn-secondary': !skill.enabled }" @click="handleNavigate">
        {{ getNavigateButtonText() }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { SkillInfo, SkillType } from '@/api/skillCatalog'

const props = defineProps<{
  skill: SkillInfo
}>()

const router = useRouter()

const getSkillTypeLabel = (type: SkillType) => {
  return type === 'analysis_skill' ? '分析能力 (Analysis)' : '执行动作 (Action)'
}

const getRiskLevelLabel = (risk: string) => {
  const map: Record<string, string> = {
    low: '低风险 (Low)',
    medium: '中风险 (Medium)',
    high: '高风险 (High)'
  }
  return map[risk] || risk
}

const getNavigateButtonText = () => {
  if (props.skill.skillType === 'analysis_skill') return '前往分析中心 →'
  return '前往操作中心 →'
}

const handleNavigate = () => {
  if (props.skill.entryTarget) {
    router.push(props.skill.entryTarget)
  }
}
</script>

<style scoped>
.skill-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.skill-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.card-header {
  margin-bottom: 12px;
}

.title {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #1f2937;
}

.badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.badge {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
}

.type-badge {
  background: #eef2ff;
  color: #4f46e5;
}

.risk-badge.low {
  background: #f0fdf4;
  color: #16a34a;
}

.risk-badge.medium {
  background: #fffbeb;
  color: #d97706;
}

.risk-badge.high {
  background: #fef2f2;
  color: #dc2626;
}

.disabled-badge {
  background: #f3f4f6;
  color: #6b7280;
}

.card-body {
  flex: 1;
  margin-bottom: 16px;
}

.description {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #4b5563;
  line-height: 1.5;
}

.scenario-section {
  background: #f9fafb;
  padding: 10px;
  border-radius: 6px;
  font-size: 13px;
}

.scenario-label {
  font-weight: 600;
  color: #374151;
  margin-right: 4px;
}

.scenario-text {
  margin: 4px 0 0 0;
  color: #4b5563;
  line-height: 1.4;
}

.warning-notice {
  margin-top: 12px;
  padding: 8px 10px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
  font-size: 12px;
  color: #92400e;
}

.card-footer {
  margin-top: auto;
  border-top: 1px solid #f3f4f6;
  padding-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.nav-btn {
  background: #4f46e5;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.nav-btn:hover {
  background: #4338ca;
}

.btn-secondary {
  background: #e5e7eb;
  color: #4b5563;
}

.btn-secondary:hover {
  background: #d1d5db;
}
</style>
