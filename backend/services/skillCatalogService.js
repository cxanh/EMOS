const alertService = require('./alertService');
const { createActionRegistry } = require('./aiOps/actionRegistry');
const {
  createIncidentTimelineService
} = require('./aiOps/incidentTimelineService');

const STATIC_ANALYSIS_SKILLS = [
  {
    skillId: 'system_health_check',
    skillType: 'analysis_skill',
    title: '系统健康检查',
    description: '快速查看当前系统整体健康状态、关键问题和风险摘要。',
    riskLevel: 'low',
    entryTarget: '/ai-analysis',
    enabled: true,
    requiresContext: false,
    source: 'static',
    scenario: '适合先快速判断当前系统是否健康。'
  },
  {
    skillId: 'performance_trend_analysis',
    skillType: 'analysis_skill',
    title: '性能趋势分析',
    description: '围绕节点和时间范围分析历史指标趋势与异常信号。',
    riskLevel: 'low',
    entryTarget: '/ai-analysis',
    enabled: true,
    requiresContext: true,
    source: 'static',
    scenario: '适合分析指定节点在时间窗口内的趋势变化。'
  },
  {
    skillId: 'optimization_recommendations',
    skillType: 'analysis_skill',
    title: '优化建议',
    description: '从当前系统状态出发给出结构化优化方向与优先级建议。',
    riskLevel: 'low',
    entryTarget: '/ai-analysis',
    enabled: true,
    requiresContext: false,
    source: 'static',
    scenario: '适合在完成基础观察后获取后续优化方向。'
  },
  {
    skillId: 'ai_chat_analysis',
    skillType: 'analysis_skill',
    title: 'AI 对话分析',
    description: '进入带上下文的短会话分析页，围绕当前问题继续追问。',
    riskLevel: 'low',
    entryTarget: '/ai-chat-analysis',
    enabled: true,
    requiresContext: true,
    source: 'static',
    scenario: '适合在已有问题和上下文时继续做多轮分析。'
  }
];

const DERIVED_ANALYSIS_SKILLS = [
  {
    skillId: 'homepage_quick_overview',
    skillType: 'analysis_skill',
    title: '首页快速概况提问',
    description: '从现有首页能力映射出的快速概况入口，用于先做简要问题定位。',
    riskLevel: 'low',
    entryTarget: '/',
    enabled: true,
    requiresContext: false,
    source: 'derived',
    scenario: '适合从首页快速进入系统概况和问题发现流程。'
  },
  {
    skillId: 'analysis_result_follow_up',
    skillType: 'analysis_skill',
    title: '分析结果追问',
    description: '从分析结果页派生出的继续追问入口，进入 AI 对话分析做后续解释。',
    riskLevel: 'low',
    entryTarget: '/ai-chat-analysis',
    enabled: true,
    requiresContext: true,
    source: 'derived',
    scenario: '适合在已有分析结果后继续做后续问答。'
  }
];

function createDefaultActionRegistry() {
  const incidentTimelineService = createIncidentTimelineService();

  return createActionRegistry({
    alertService,
    incidentTimelineService
  });
}

function mapRegistryActionToSkill(action) {
  return {
    skillId: action.actionId,
    skillType: 'platform_action_skill',
    title: action.title,
    description: action.summary,
    riskLevel: action.riskLevel || 'low',
    entryTarget: '/ai-ops-assistant',
    enabled: true,
    requiresContext: true,
    source: 'registry',
    scenario: '受控动作，仅跳转到 AIOpsAssistant，不会在 Catalog 中直接执行。'
  };
}

function cloneSkill(skill) {
  return { ...skill };
}

function createSkillCatalogService({
  actionRegistry = createDefaultActionRegistry()
} = {}) {
  if (!actionRegistry || typeof actionRegistry.listActions !== 'function') {
    throw new Error('actionRegistry.listActions is required');
  }

  return {
    async getCatalog() {
      const registrySkills = actionRegistry
        .listActions()
        .filter(action => action.actionClass === 'platform_action')
        .map(mapRegistryActionToSkill);

      return {
        categories: [
          {
            skillType: 'analysis_skill',
            title: '分析能力',
            description: '用于系统观察、趋势理解和上下文化 AI 分析，不直接执行动作。',
            skills: [
              ...STATIC_ANALYSIS_SKILLS.map(cloneSkill),
              ...DERIVED_ANALYSIS_SKILLS.map(cloneSkill)
            ]
          },
          {
            skillType: 'platform_action_skill',
            title: '受控动作能力',
            description: '来自白名单 action registry，仅用于导航到 AIOpsAssistant。',
            skills: registrySkills
          }
        ]
      };
    }
  };
}

module.exports = {
  createSkillCatalogService
};
