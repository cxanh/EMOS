const test = require('node:test');
const assert = require('node:assert/strict');

const { generateToken } = require('../middleware/auth');
const { jsonRequest, startServer } = require('./aiOpsTestUtils');

let createApp;

try {
  ({ createApp } = require('../index'));
} catch (error) {
  // The assertions below intentionally fail until the implementation exists.
}

test('main app mounts /api/ai/v2/settings and protects it with JWT auth', async () => {
  assert.equal(typeof createApp, 'function');

  process.env.JWT_SECRET = process.env.JWT_SECRET || 'batch-5-test-secret';

  const app = createApp({
    skipRequestLogging: true
  });

  const server = await startServer(app);

  try {
    const noAuthResponse = await jsonRequest(server.baseUrl, '/api/ai/v2/settings', {
      method: 'GET'
    });

    assert.equal(noAuthResponse.status, 401);
    assert.equal(noAuthResponse.body.error.code, 'NO_TOKEN');

    const token = generateToken({
      id: 'mount-settings-user',
      role: 'viewer'
    });

    const authResponse = await jsonRequest(server.baseUrl, '/api/ai/v2/settings', {
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
