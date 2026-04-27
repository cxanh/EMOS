const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const metricsWS = require('../websocket/metricsWS');

test('extractTokenFromRequest reads token from query string', () => {
  const token = metricsWS.extractTokenFromRequest({
    url: '/ws/metrics?token=query-token',
    headers: {}
  });

  assert.equal(token, 'query-token');
});

test('authenticateRequest rejects connection without token', () => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret';

  const result = metricsWS.authenticateRequest({
    url: '/ws/metrics',
    headers: {}
  });

  assert.equal(result.success, false);
  assert.equal(result.code, 'NO_TOKEN');

  process.env.JWT_SECRET = originalSecret;
});

test('authenticateRequest rejects invalid token', () => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret';

  const result = metricsWS.authenticateRequest({
    url: '/ws/metrics?token=invalid-token',
    headers: {}
  });

  assert.equal(result.success, false);
  assert.equal(result.code, 'INVALID_TOKEN');

  process.env.JWT_SECRET = originalSecret;
});

test('authenticateRequest accepts valid token', () => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret';

  const signedToken = jwt.sign(
    { id: 1, username: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const result = metricsWS.authenticateRequest({
    url: `/ws/metrics?token=${signedToken}`,
    headers: {}
  });

  assert.equal(result.success, true);
  assert.equal(result.user.username, 'admin');

  process.env.JWT_SECRET = originalSecret;
});
