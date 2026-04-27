import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SkillCategory, SkillType } from '@/api/skillCatalog'
import * as api from '@/api/skillCatalog'

export const useSkillCatalogStore = defineStore('skillCatalog', () => {
  const categories = ref<SkillCategory[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const selectedType = ref<SkillType | 'all'>('all')
  const searchQuery = ref('')

  const fetchCatalog = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await api.getSkillCatalog()
      if (response.success && response.data?.categories) {
        categories.value = response.data.categories
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch skill catalog'
      console.error('Error fetching skill catalog:', err)
    } finally {
      loading.value = false
    }
  }

  const filteredCategories = computed(() => {
    let result = categories.value

    // Filter by type
    if (selectedType.value !== 'all') {
      result = result.filter(cat => cat.skillType === selectedType.value)
    }

    // Filter by search query
    const query = searchQuery.value.toLowerCase().trim()
    if (query) {
      result = result.map(cat => {
        const filteredSkills = cat.skills.filter(s =>
          s.title.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.scenario.toLowerCase().includes(query) ||
          s.entryTarget.toLowerCase().includes(query) ||
          s.skillId.toLowerCase().includes(query)
        )
        return {
          ...cat,
          skills: filteredSkills
        }
      }).filter(cat => cat.skills.length > 0)
    }

    return result
  })

  return {
    categories,
    loading,
    error,
    selectedType,
    searchQuery,
    filteredCategories,
    fetchCatalog
  }
})
