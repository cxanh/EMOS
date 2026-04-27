import api from '@/api'

export type SkillType = 'analysis_skill' | 'platform_action_skill'

export interface SkillInfo {
  skillId: string
  skillType: SkillType
  title: string
  description: string
  riskLevel: 'low' | 'medium' | 'high'
  entryTarget: string
  enabled: boolean
  requiresContext: boolean
  source: string
  scenario: string
}

export interface SkillCategory {
  skillType: SkillType
  title: string
  description: string
  skills: SkillInfo[]
}

export interface SkillCatalogResponse {
  success: boolean
  data: {
    categories: SkillCategory[]
  }
}

export const getSkillCatalog = () => {
  return api.get<any, SkillCatalogResponse>('/ai/v2/skills/catalog')
}
