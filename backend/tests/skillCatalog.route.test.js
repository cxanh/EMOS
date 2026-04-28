const test = require('node:test');
const assert = require('node:assert/strict');

const express = require('express');

const { errorHandler, notFoundHandler } = require('../middleware/errorHandler');
const { generateToken } = require('../middleware/auth');
const { jsonRequest, startServer } = require('./aiOpsTestUtils');
const { createSkillCatalogRouter } = require('../routes/skillCatalog');
const { createApp } = require('../index');

function createTestApp({ skillCatalogService, user }) {
  const app = express();
  app.use(express.json());
  app.use('/api/ai/v2/skills', createSkillCatalogRouter({
    skillCatalogService,
    authenticateRequest: (req, res, next) => {
      req.user = user;
      next();
    }
  }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

test('skillCatalog route returns a read-only catalog payload with required categories and skill fields', async () => {
  assert.equal(typeof createSkillCatalogRouter, 'function');

  const skillCatalogService = {
    async getCatalog() {
      return {
        categories: [
          {
            skillType: 'analysis_skill',
            title: 'Analysis Skills',
            description: 'Read-only analysis entry points',
            skills: [
              {
                skillId: 'system_health_check',
                skillType: 'analysis_skill',
                title: '系统健康检查',
                description: '快速判断当前系统健康状态。',
                riskLevel: 'low',
                entryTarget: '/ai-analysis',
                enabled: true,
                requiresContext: false,
                source: 'static',
                scenario: '适合先快速判断当前系统是否健康。'
              }
            ]
          },
          {
            skillType: 'platform_action_skill',
            title: 'Platform Action Skills',
            description: 'Controlled actions that only navigate',
            skills: [
              {
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
              }
            ]
          }
        ]
      };
    }
  };

  const app = createTestApp({
    skillCatalogService,
    user: {
      id: 'catalog-route-user',
      role: 'viewer'
    }
  });
  const server = await startServer(app);

  try {
    const response = await jsonRequest(server.baseUrl, '/api/ai/v2/skills/catalog', {
      method: 'GET'
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.categories.map(category => category.skillType), [
      'analysis_skill',
      'platform_action_skill'
    ]);

    const firstSkill = response.body.data.categories[0].skills[0];
    assert.equal(firstSkill.title, '系统健康检查');
    assert.equal(typeof firstSkill.skillId, 'string');
    assert.equal(typeof firstSkill.entryTarget, 'string');
    assert.equal(typeof firstSkill.enabled, 'boolean');
    assert.equal(Object.prototype.hasOwnProperty.call(firstSkill, 'params'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(firstSkill, 'resolvedParams'), false);
  } finally {
    await server.close();
  }
});

test('main app mounts /api/ai/v2/skills/catalog and protects it with JWT auth', async () => {
  assert.equal(typeof createApp, 'function');

  process.env.JWT_SECRET = process.env.JWT_SECRET || 'batch-8-test-secret';

  const app = createApp({
    skipRequestLogging: true
  });
  const server = await startServer(app);

  try {
    const noAuthResponse = await jsonRequest(server.baseUrl, '/api/ai/v2/skills/catalog', {
      method: 'GET'
    });

    assert.equal(noAuthResponse.status, 401);
    assert.equal(noAuthResponse.body.error.code, 'NO_TOKEN');

    const token = generateToken({
      id: 'catalog-mount-user',
      role: 'operator'
    });

    const authResponse = await jsonRequest(server.baseUrl, '/api/ai/v2/skills/catalog', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    assert.notEqual(authResponse.status, 404);
  } finally {
    await server.close();
  }
});
