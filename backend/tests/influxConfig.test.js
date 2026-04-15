const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldEnableInflux } = require('../config/influxdb');

test('shouldEnableInflux returns false for placeholder token', () => {
  assert.equal(shouldEnableInflux('your_influx_token_here'), false);
});

test('shouldEnableInflux returns true for real token', () => {
  assert.equal(shouldEnableInflux('real-token-value'), true);
});
