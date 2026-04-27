<template>
  <div class="dry-run-card">
    <template v-if="dryRun">
      <div class="card-row"><strong>Allowed:</strong> {{ dryRun.allowed }}</div>
      <div class="card-row"><strong>Risk:</strong> {{ dryRun.riskLevel }}</div>

      <div class="card-section">
        <div class="section-title">Warnings</div>
        <ul v-if="dryRun.warnings.length" class="list">
          <li v-for="(item, index) in dryRun.warnings" :key="index">{{ item }}</li>
        </ul>
        <div v-else class="empty">No warnings.</div>
      </div>

      <div class="card-section">
        <div class="section-title">Impact</div>
        <div class="card-row"><strong>Entities:</strong> {{ dryRun.impact.entities.join(', ') || '-' }}</div>
        <div class="card-row"><strong>Duration:</strong> {{ dryRun.impact.estimatedDurationSec }}s</div>
        <div class="card-row"><strong>Summary:</strong> {{ dryRun.impact.summary }}</div>
      </div>

      <div class="card-section">
        <div class="section-title">Resolved Params</div>
        <pre class="code-block">{{ formattedResolvedParams }}</pre>
      </div>
    </template>

    <template v-else>
      <div class="empty">No dry-run data yet.</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DryRunResult } from '@/api/aiOps'

const props = defineProps<{
  dryRun: DryRunResult | null
}>()

const formattedResolvedParams = computed(() => {
  if (!props.dryRun) {
    return '{}'
  }
  return JSON.stringify(props.dryRun.resolvedParams ?? {}, null, 2)
})
</script>

<style scoped>
.dry-run-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #ffffff;
}

.card-row {
  margin-bottom: 8px;
  color: #111827;
}

.card-section {
  margin-top: 12px;
}

.section-title {
  font-weight: 600;
  margin-bottom: 6px;
  color: #111827;
}

.list {
  margin: 0;
  padding-left: 18px;
}

.code-block {
  background: #f9fafb;
  padding: 10px;
  border-radius: 6px;
  font-size: 12px;
  overflow-x: auto;
}

.empty {
  color: #6b7280;
}
</style>
