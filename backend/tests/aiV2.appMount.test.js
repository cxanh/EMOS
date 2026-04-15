const test = require('node:test');
const assert = require('node:assert/strict');

const { generateToken } = require('../middleware/auth');
const { jsonRequest, startServer } = require('./aiOpsTestUtils');

let createApp;

try {
  ({ createApp } = require('../index'));
} catch (error) {
  // The assertions below intentionally fail until Batch 2 wiring exists.
}

test('main app mounts /api/ai/v2 and protects it with JWT auth', async () => {
  assert.equal(typeof createApp, 'function');

  process.env.JWT_SECRET = process.env.JWT_SECRET || 'batch-2-test-secret';

  const app = createApp({
    skipRequestLogging: true
  });

  const server = await startServer(app);

  try {
    const noAuthResponse = await jsonRequest(server.baseUrl, '/api/ai/v2/action-requests', {
      method: 'POST',
      body: JSON.stringify({
        actionClass: 'platform_action',
        actionId: 'acknowledge_alert',
        idempotencyKey: 'mount-test-1',
        params: {
          eventId: 'event-mount-1',
          comment: 'Mount test'
        }
      })
    });

    assert.equal(noAuthResponse.status, 401);
    assert.equal(noAuthResponse.body.error.code, 'NO_TOKEN');

    const token = generateToken({
      id: 'mount-user',
      role: 'operator'
    });

    const authResponse = await jsonRequest(server.baseUrl, '/api/ai/v2/action-requests', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        actionClass: 'platform_action',
        actionId: 'acknowledge_alert',
        idempotencyKey: 'mount-test-2',
        params: {
          eventId: 'event-mount-2',
          comment: 'Mount test'
        }
      })
    });

    assert.notEqual(authResponse.status, 404);
  } finally {
    await server.close();
  }
});
