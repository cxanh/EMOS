const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveServerBinding } = require('../config/serverConfig');

test('resolveServerBinding defaults host to 0.0.0.0 for LAN access', () => {
  const result = resolveServerBinding({ PORT: '50001' });

  assert.equal(result.host, '0.0.0.0');
  assert.equal(result.port, 50001);
});

test('resolveServerBinding uses explicit HOST when provided', () => {
  const result = resolveServerBinding({ PORT: '3000', HOST: '127.0.0.1' });

  assert.equal(result.host, '127.0.0.1');
  assert.equal(result.port, 3000);
});

test('resolveServerBinding falls back to 50001 when PORT is invalid', () => {
  const result = resolveServerBinding({ PORT: 'invalid' });

  assert.equal(result.host, '0.0.0.0');
  assert.equal(result.port, 50001);
});
