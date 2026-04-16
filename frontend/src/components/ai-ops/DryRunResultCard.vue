<template>
  <div class="dry-run-card">
    <div v-if="!dryRun" class="empty">暂无 dry-run 结果</div>

    <div v-else class="content">
      <div class="row">
        <span class="label">allowed</span>
        <span class="value" :class="dryRun.allowed ? 'ok' : 'fail'">
          {{ dryRun.allowed }}
        </span>
      </div>
      <div class="row">
        <span class="label">riskLevel</span>
        <span class="value">{{ dryRun.riskLevel }}</span>
      </div>

      <div class="section">
        <div class="section-title">warnings</div>
        <ul v-if="dryRun.warnings && dryRun.warnings.length" class="list">
          <li v-for="(warning, index) in dryRun.warnings" :key="index">{{ warning }}</li>
        </ul>
        <div v-else class="muted">无</div>
      </div>

      <div class="section">
        <div class="section-title">impact</div>
        <div class="muted">{{ dryRun.impact.summary }}</div>
        <div class="impact-meta">
          <span>entities: {{ dryRun.impact.entities.join(', ') || '-' }}</span>
          <span>estimatedDurationSec: {{ dryRun.impact.estimatedDurationSec }}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">resolvedParams</div>
        <pre class="code">{{ resolvedParams }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DryRunResult } from '@/api/aiOps'

const props = defineProps<{
  dryRun: DryRunResult | null
}>()

const resolvedParams = computed(() => {
  if (!props.dryRun) {
    return '{}'
  }
  return JSON.stringify(props.dryRun.resolvedParams, null, 2)
})
</script>

<style scoped>
.dry-run-card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 12px;
  background: #fafafa;
}

.empty {
  color: #7f8c8d;
  font-size: 13px;
}

.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
}

.label {
  color: #7f8c8d;
}

.value {
  font-weight: 600;
  color: #2c3e50;
}

.value.ok {
  color: #2e7d32;
}

.value.fail {
  color: #c62828;
}

.section {
  margin-top: 10px;
}

.section-title {
  font-size: 12px;
  color: #7f8c8d;
  margin-bottom: 4px;
}

.list {
  padding-left: 18px;
  margin: 0;
  color: #555;
  font-size: 13px;
}

.muted {
  font-size: 13px;
  color: #555;
}

.impact-meta {
  margin-top: 4px;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #555;
}

.code {
  background: #ffffff;
  border-radius: 8px;
  padding: 8px;
  font-size: 12px;
  color: #2c3e50;
  border: 1px solid #e0e0e0;
  overflow-x: auto;
}
</style>
