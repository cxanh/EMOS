<template>
  <div class="skill-catalog-page">
    <div class="page-header">
      <div class="header-left">
        <h1>🛠️ AI 能力目录 (Skill Catalog)</h1>
        <p class="subtitle">查看当前系统已配置的所有 AI 与运维能力，本页面仅供展示与导航，不提供编辑和直接执行。</p>
      </div>
      <button @click="store.fetchCatalog" class="btn-secondary" :disabled="store.loading">
        <span>🔄</span> 刷新
      </button>
    </div>

    <!-- Toolbar: Search and Filter -->
    <div class="toolbar">
      <div class="search-box">
        <span class="icon">🔍</span>
        <input v-model="store.searchQuery" type="text" placeholder="搜索能力名称、描述或使用场景..." />
      </div>

      <div class="filter-box">
        <label>能力分类: </label>
        <select v-model="store.selectedType">
          <option value="all">全部 (All)</option>
          <option value="analysis_skill">分析能力 (Analysis)</option>
          <option value="platform_action_skill">执行动作 (Action)</option>
        </select>
      </div>
    </div>

    <!-- Error/Loading -->
    <div v-if="store.loading" class="state-message">加载中...</div>
    <div v-else-if="store.error" class="state-message error">{{ store.error }}</div>

    <!-- Content -->
    <div v-else-if="store.filteredCategories.length === 0" class="state-message">
      未找到任何符合条件的 AI 能力。
    </div>

    <div v-else class="catalog-content">
      <SkillCategorySection v-for="category in store.filteredCategories" :key="category.skillType"
        :category="category" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSkillCatalogStore } from '@/stores/skillCatalog'
import SkillCategorySection from '@/components/skill-catalog/SkillCategorySection.vue'

const store = useSkillCatalogStore()

onMounted(() => {
  store.fetchCatalog()
})
</script>

<style scoped>
.skill-catalog-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 4px 0;
  font-size: 24px;
  color: #111827;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toolbar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 12px;
}

.search-box input {
  flex: 1;
  border: none;
  padding: 10px;
  outline: none;
  font-size: 14px;
  background: transparent;
}

.filter-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-box label {
  font-size: 14px;
  color: #4b5563;
}

.filter-box select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  outline: none;
  color: #111827;
}

.state-message {
  padding: 32px 0;
  text-align: center;
  color: #6b7280;
  font-size: 15px;
}

.state-message.error {
  color: #dc2626;
}

.catalog-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
</style>
