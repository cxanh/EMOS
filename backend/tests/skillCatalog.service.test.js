const test = require('node:test');
const assert = require('node:assert/strict');

const { createSkillCatalogService } = require('../services/skillCatalogService');

function flattenSkills(catalog) {
  return catalog.categories.flatMap(category => category.skills);
}

test('skillCatalogService organizes registry, static, and derived skills into display-only categories', async () => {
  assert.equal(typeof createSkillCatalogService, 'function');

  const actionRegistry = {
    listActions() {
      return [
        {
          actionClass: 'platform_action',
          actionId: 'acknowledge_alert',
          title: 'Acknowledge Alert',
          summary: 'Acknowledge an active alert event',
          riskLevel: 'low'
        },
        {
          actionClass: 'platform_action',
          actionId: 'create_incident_timeline_note',
          title: 'Create Incident Timeline Note',
          summary: 'Create a new incident timeline note',
          riskLevel: 'medium'
        },
        {
          actionClass: 'platform_action',
          actionId: 'mute_alert_rule_temporarily',
          title: 'Mute Alert Rule Temporarily',
          summary: 'Temporarily mute an alert rule',
          riskLevel: 'medium'
        }
      ];
    }
  };

  const service = createSkillCatalogService({
    actionRegistry
  });

  const catalog = await service.getCatalog();

  assert.deepEqual(catalog.categories.map(category => category.skillType), [
    'analysis_skill',
    'platform_action_skill'
  ]);

  const analysisCategory = catalog.categories.find(category => category.skillType === 'analysis_skill');
  const platformCategory = catalog.categories.find(category => category.skillType === 'platform_action_skill');

  assert.ok(analysisCategory);
  assert.ok(platformCategory);
  assert.equal(analysisCategory.title, '分析能力');
  assert.equal(platformCategory.title, '受控动作能力');
  assert.equal(Array.isArray(analysisCategory.skills), true);
  assert.equal(Array.isArray(platformCategory.skills), true);

  const allSkills = flattenSkills(catalog);
  const skillIds = allSkills.map(skill => skill.skillId);

  [
    'system_health_check',
    'performance_trend_analysis',
    'optimization_recommendations',
    'homepage_quick_overview',
    'analysis_result_follow_up',
    'ai_chat_analysis',
    'acknowledge_alert',
    'create_incident_timeline_note',
    'mute_alert_rule_temporarily'
  ].forEach(skillId => {
    assert.ok(skillIds.includes(skillId), `Expected skillId ${skillId} in catalog`);
  });

  allSkills.forEach(skill => {
    assert.equal(typeof skill.skillId, 'string');
    assert.ok(['analysis_skill', 'platform_action_skill'].includes(skill.skillType));
    assert.equal(typeof skill.title, 'string');
    assert.equal(typeof skill.description, 'string');
    assert.equal(typeof skill.entryTarget, 'string');
    assert.equal(typeof skill.enabled, 'boolean');
    assert.equal(typeof skill.requiresContext, 'boolean');
    assert.ok(['registry', 'static', 'derived'].includes(skill.source));
    assert.equal(typeof skill.scenario, 'string');

    assert.equal(Object.prototype.hasOwnProperty.call(skill, 'params'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(skill, 'resolvedParams'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(skill, 'actionClass'), false);
  });

  const platformSkill = platformCategory.skills.find(skill => skill.skillId === 'acknowledge_alert');
  assert.deepEqual(platformSkill, {
    skillId: 'acknowledge_alert',
    skillType: 'platform_action_skill',
    title: 'Acknowledge Alert',
    description: 'Acknowledge an active alert event',
    riskLevel: 'low',
    entryTarget: '/ai-ops-assistant',
    enabled: true,
    requiresContext: true,
    source: 'registry',
    scenario: '受控动作，仅跳转到 AIOpsAssistant，不会在 Catalog 中直接执行。'
  });

  const derivedSkill = analysisCategory.skills.find(skill => skill.skillId === 'analysis_result_follow_up');
  assert.equal(derivedSkill.source, 'derived');
  assert.equal(derivedSkill.skillType, 'analysis_skill');
  assert.equal(derivedSkill.entryTarget, '/ai-chat-analysis');
  assert.equal(derivedSkill.title, '分析结果追问');
});
