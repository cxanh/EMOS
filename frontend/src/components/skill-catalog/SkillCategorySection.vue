<template>
  <div class="category-section">
    <div class="category-header">
      <h2>{{ category.title }}</h2>
      <p class="category-desc">{{ category.description }}</p>
    </div>

    <div class="skills-grid">
      <SkillCard v-for="skill in category.skills" :key="skill.skillId" :skill="skill" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SkillCategory } from '@/api/skillCatalog'
import SkillCard from './SkillCard.vue'

defineProps<{
  category: SkillCategory
}>()
</script>

<style scoped>
.category-section {
  margin-bottom: 32px;
}

.category-header {
  margin-bottom: 16px;
}

.category-header h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  color: #111827;
}

.category-desc {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
</style>
