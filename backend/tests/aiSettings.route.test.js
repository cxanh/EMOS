const test = require('node:test');
const assert = require('node:assert/strict');

const express = require('express');

const { createFakeRedisClient, jsonRequest, startServer } = require('./aiOpsTestUtils');
const { errorHandler, notFoundHandler } = require('../middleware/errorHandler');

let createAiSettingsRouter;

try {
  ({ createAiSettingsRouter } = require('../routes/aiSettings'));
} catch (error) {
  // The assertions below intentionally fail until the implementation exists.
}

function setEnv(overrides) {
  const previous = new Map();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);

    if (value === null || value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = String(value);
    }
  }

  return () => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

function createTestApp({ redisClient, user }) {
  const app = express();
  app.use(express.json());
  app.use('/api/ai/v2/settings', createAiSettingsRouter({
    redisClient,
    authenticateRequest: (req, res, next) => {
      req.user = user;
      next();
    }
  }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

test('GET /api/ai/v2/settings returns separated system and user settings with env and fallback sources and masked api key metadata', async () => {
  assert.equal(typeof createAiSettingsRouter, 'function');

  const restoreEnv = setEnv({
    AI_ENABLED: 'true',
    LLM_PROVIDER: 'deepseek',
    LLM_MODEL: 'deepseek-chat',
    LLM_BASE_URL: 'https://env.deepseek.example/v1',
    LLM_API_KEY: 'env-secret-key',
    AI_TIMEOUT_MS: null,
    AI_ALLOW_ACTION_RECOMMENDATIONS: null
  });

  const app = createTestApp({
    redisClient: createFakeRedisClient(),
    user: {
      id: 'user-settings-read',
      role: 'viewer'
    }
  });

  const server = await startServer(app);

  try {
    const response = await jsonRequest(server.baseUrl, '/api/ai/v2/settings', {
      method: 'GET'
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.system.enabled.value, true);
    assert.equal(response.body.data.system.enabled.source, 'env');
    assert.equal(response.body.data.system.provider.value, 'deepseek');
    assert.equal(response.body.data.system.provider.source, 'env');
    assert.equal(response.body.data.system.model.value, 'deepseek-chat');
    assert.equal(response.body.data.system.model.source, 'env');
    assert.equal(response.body.data.system.baseUrl.value, 'https://env.deepseek.example/v1');
    assert.equal(response.body.data.system.baseUrl.source, 'env');
    assert.equal(response.body.data.system.timeoutMs.value, 120000);
    assert.equal(response.body.data.system.timeoutMs.source, 'fallback');
    assert.equal(response.body.data.system.allowActionRecommendations.value, true);
    assert.equal(response.body.data.system.allowActionRecommendations.source, 'fallback');
    assert.deepEqual(response.body.data.system.apiKey, {
      configured: true,
      source: 'env',
      editable: true
    });

    assert.equal(response.body.data.user.language.value, 'zh-CN');
    assert.equal(response.body.data.user.language.source, 'fallback');
    assert.equal(response.body.data.user.responseStyle.value, 'standard');
    assert.equal(response.body.data.user.responseStyle.source, 'fallback');
    assert.equal(response.body.data.user.defaultAnalysisScope.value, '24h');
    assert.equal(response.body.data.user.defaultAnalysisScope.source, 'fallback');
    assert.equal(response.body.data.user.showActionRecommendations.value, true);
    assert.equal(response.body.data.user.showActionRecommendations.source, 'fallback');

    assert.equal(JSON.stringify(response.body).includes('env-secret-key'), false);
  } finally {
    restoreEnv();
    await server.close();
  }
});

test('PUT /api/ai/v2/settings/system rejects non-admin and persisted values override env and fallback for admin', async () => {
  assert.equal(typeof createAiSettingsRouter, 'function');

  const restoreEnv = setEnv({
    AI_ENABLED: 'false',
    LLM_PROVIDER: 'openai',
    LLM_MODEL: 'gpt-4o-mini',
    LLM_BASE_URL: 'https://api.openai.com/v1',
    LLM_API_KEY: 'env-openai-secret',
    AI_TIMEOUT_MS: null,
    AI_ALLOW_ACTION_RECOMMENDATIONS: null
  });

  const redisClient = createFakeRedisClient();
  const nonAdminApp = createTestApp({
    redisClient,
    user: {
      id: 'user-settings-non-admin',
      role: 'operator'
    }
  });
  const nonAdminServer = await startServer(nonAdminApp);

  try {
    const forbiddenResponse = await jsonRequest(nonAdminServer.baseUrl, '/api/ai/v2/settings/system', {
      method: 'PUT',
      body: JSON.stringify({
        enabled: true
      })
    });

    assert.equal(forbiddenResponse.status, 403);
    assert.equal(forbiddenResponse.body.error.code, 'FORBIDDEN');
  } finally {
    await nonAdminServer.close();
  }

  const adminApp = createTestApp({
    redisClient,
    user: {
      id: 'user-settings-admin',
      role: 'admin'
    }
  });
  const adminServer = await startServer(adminApp);

  try {
    const updateResponse = await jsonRequest(adminServer.baseUrl, '/api/ai/v2/settings/system', {
      method: 'PUT',
      body: JSON.stringify({
        enabled: true,
        provider: 'qwen',
        model: 'qwen-plus',
        baseUrl: 'https://persisted.qwen.example/compatible-mode/v1',
        timeoutMs: 45000,
        allowActionRecommendations: false,
        apiKey: 'persisted-secret-key'
      })
    });

    assert.equal(updateResponse.status, 200);
    assert.equal(updateResponse.body.data.system.provider.value, 'qwen');
    assert.equal(updateResponse.body.data.system.provider.source, 'persisted');
    assert.equal(updateResponse.body.data.system.model.value, 'qwen-plus');
    assert.equal(updateResponse.body.data.system.model.source, 'persisted');
    assert.equal(updateResponse.body.data.system.baseUrl.value, 'https://persisted.qwen.example/compatible-mode/v1');
    assert.equal(updateResponse.body.data.system.baseUrl.source, 'persisted');
    assert.equal(updateResponse.body.data.system.timeoutMs.value, 45000);
    assert.equal(updateResponse.body.data.system.timeoutMs.source, 'persisted');
    assert.equal(updateResponse.body.data.system.allowActionRecommendations.value, false);
    assert.equal(updateResponse.body.data.system.allowActionRecommendations.source, 'persisted');
    assert.deepEqual(updateResponse.body.data.system.apiKey, {
      configured: true,
      source: 'persisted',
      editable: true
    });
    assert.equal(JSON.stringify(updateResponse.body).includes('persisted-secret-key'), false);

    const getResponse = await jsonRequest(adminServer.baseUrl, '/api/ai/v2/settings', {
      method: 'GET'
    });

    assert.equal(getResponse.status, 200);
    assert.equal(getResponse.body.data.system.enabled.value, true);
    assert.equal(getResponse.body.data.system.enabled.source, 'persisted');
    assert.equal(getResponse.body.data.system.provider.value, 'qwen');
    assert.equal(getResponse.body.data.system.provider.source, 'persisted');
    assert.equal(getResponse.body.data.system.model.value, 'qwen-plus');
    assert.equal(getResponse.body.data.system.model.source, 'persisted');
    assert.equal(getResponse.body.data.system.baseUrl.value, 'https://persisted.qwen.example/compatible-mode/v1');
    assert.equal(getResponse.body.data.system.baseUrl.source, 'persisted');
    assert.equal(getResponse.body.data.system.timeoutMs.value, 45000);
    assert.equal(getResponse.body.data.system.timeoutMs.source, 'persisted');
    assert.equal(getResponse.body.data.system.allowActionRecommendations.value, false);
    assert.equal(getResponse.body.data.system.allowActionRecommendations.source, 'persisted');
    assert.deepEqual(getResponse.body.data.system.apiKey, {
      configured: true,
      source: 'persisted',
      editable: true
    });
    assert.equal(JSON.stringify(getResponse.body).includes('persisted-secret-key'), false);
    assert.equal(JSON.stringify(getResponse.body).includes('env-openai-secret'), false);
  } finally {
    restoreEnv();
    await adminServer.close();
  }
});

test('PUT /api/ai/v2/settings/user lets a normal user persist only personal preferences and keeps them scoped per user', async () => {
  assert.equal(typeof createAiSettingsRouter, 'function');

  const redisClient = createFakeRedisClient();
  const firstUserApp = createTestApp({
    redisClient,
    user: {
      id: 'user-pref-1',
      role: 'viewer'
    }
  });
  const firstUserServer = await startServer(firstUserApp);

  try {
    const updateResponse = await jsonRequest(firstUserServer.baseUrl, '/api/ai/v2/settings/user', {
      method: 'PUT',
      body: JSON.stringify({
        language: 'en-US',
        responseStyle: 'detailed',
        defaultAnalysisScope: '7d',
        showActionRecommendations: false
      })
    });

    assert.equal(updateResponse.status, 200);
    assert.equal(updateResponse.body.data.user.language.value, 'en-US');
    assert.equal(updateResponse.body.data.user.language.source, 'persisted');
    assert.equal(updateResponse.body.data.user.responseStyle.value, 'detailed');
    assert.equal(updateResponse.body.data.user.responseStyle.source, 'persisted');
    assert.equal(updateResponse.body.data.user.defaultAnalysisScope.value, '7d');
    assert.equal(updateResponse.body.data.user.defaultAnalysisScope.source, 'persisted');
    assert.equal(updateResponse.body.data.user.showActionRecommendations.value, false);
    assert.equal(updateResponse.body.data.user.showActionRecommendations.source, 'persisted');
  } finally {
    await firstUserServer.close();
  }

  const secondUserApp = createTestApp({
    redisClient,
    user: {
      id: 'user-pref-2',
      role: 'viewer'
    }
  });
  const secondUserServer = await startServer(secondUserApp);

  try {
    const secondUserResponse = await jsonRequest(secondUserServer.baseUrl, '/api/ai/v2/settings', {
      method: 'GET'
    });

    assert.equal(secondUserResponse.status, 200);
    assert.equal(secondUserResponse.body.data.user.language.value, 'zh-CN');
    assert.equal(secondUserResponse.body.data.user.language.source, 'fallback');
    assert.equal(secondUserResponse.body.data.user.responseStyle.value, 'standard');
    assert.equal(secondUserResponse.body.data.user.responseStyle.source, 'fallback');
    assert.equal(secondUserResponse.body.data.user.defaultAnalysisScope.value, '24h');
    assert.equal(secondUserResponse.body.data.user.defaultAnalysisScope.source, 'fallback');
    assert.equal(secondUserResponse.body.data.user.showActionRecommendations.value, true);
    assert.equal(secondUserResponse.body.data.user.showActionRecommendations.source, 'fallback');
  } finally {
    await secondUserServer.close();
  }
});
