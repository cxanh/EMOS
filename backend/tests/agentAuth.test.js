const test = require('node:test');
const assert = require('node:assert/strict');

const { authenticateAgentToken, extractAgentToken } = require('../middleware/agentAuth');

function createRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    }
  };
}

test('extractAgentToken prefers X-Agent-Token header', () => {
  const token = extractAgentToken({
    headers: {
      'x-agent-token': 'agent-token-from-header',
      authorization: 'Bearer user-jwt'
    }
  });

  assert.equal(token, 'agent-token-from-header');
});

test('agent auth should reject when AGENT_API_TOKEN is not configured', () => {
  const original = process.env.AGENT_API_TOKEN;
  delete process.env.AGENT_API_TOKEN;

  const req = { headers: {}, ip: '127.0.0.1', originalUrl: '/api/agent/register' };
  const res = createRes();
  let nextCalled = false;

  authenticateAgentToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 503);
  assert.equal(res.payload.error.code, 'AGENT_AUTH_NOT_CONFIGURED');

  process.env.AGENT_API_TOKEN = original;
});

test('agent auth should reject missing token', () => {
  const original = process.env.AGENT_API_TOKEN;
  process.env.AGENT_API_TOKEN = 'expected-token';

  const req = { headers: {}, ip: '127.0.0.1', originalUrl: '/api/agent/register' };
  const res = createRes();
  let nextCalled = false;

  authenticateAgentToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.error.code, 'NO_AGENT_TOKEN');

  process.env.AGENT_API_TOKEN = original;
});

test('agent auth should reject invalid token', () => {
  const original = process.env.AGENT_API_TOKEN;
  process.env.AGENT_API_TOKEN = 'expected-token';

  const req = {
    headers: { 'x-agent-token': 'invalid-token' },
    ip: '127.0.0.1',
    originalUrl: '/api/agent/metrics'
  };
  const res = createRes();
  let nextCalled = false;

  authenticateAgentToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.error.code, 'INVALID_AGENT_TOKEN');

  process.env.AGENT_API_TOKEN = original;
});

test('agent auth should pass with valid token', () => {
  const original = process.env.AGENT_API_TOKEN;
  process.env.AGENT_API_TOKEN = 'expected-token';

  const req = {
    headers: { 'x-agent-token': 'expected-token' },
    ip: '127.0.0.1',
    originalUrl: '/api/agent/metrics'
  };
  const res = createRes();
  let nextCalled = false;

  authenticateAgentToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);

  process.env.AGENT_API_TOKEN = original;
});
