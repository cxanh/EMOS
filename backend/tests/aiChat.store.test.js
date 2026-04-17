const test = require('node:test');
const assert = require('node:assert/strict');

const { createFakeRedisClient } = require('./aiOpsTestUtils');

let createAiChatStore;
let createAiChatSessionPolicy;

try {
  ({ createAiChatStore } = require('../services/aiChat/aiChatStore'));
  ({ createAiChatSessionPolicy } = require('../services/aiChat/aiChatSessionPolicy'));
} catch (error) {
  // The assertions below intentionally fail until the implementation exists.
}

function createTrackingRedisClient() {
  const client = createFakeRedisClient();
  const expireCalls = [];

  return {
    client: {
      ...client,
      async expire(key, seconds) {
        expireCalls.push({ key, seconds });
        return client.expire(key, seconds);
      }
    },
    expireCalls
  };
}

test('aiChat store applies ttl and evicts the oldest recent session when recent-session limit is exceeded', async () => {
  assert.equal(typeof createAiChatStore, 'function');
  assert.equal(typeof createAiChatSessionPolicy, 'function');

  const redis = createTrackingRedisClient();
  const policy = createAiChatSessionPolicy({
    sessionTtlSec: 3600,
    maxMessagesPerSession: 3,
    maxRecentSessionsPerUser: 2
  });

  let sequence = 0;
  const store = createAiChatStore({
    redisClient: redis.client,
    sessionPolicy: policy,
    idFactory: () => `chat_test_${++sequence}`,
    now: () => '2026-04-17T08:00:00.000Z'
  });

  const first = await store.createSession({
    userId: 'user-chat-1',
    nodeId: 'node-1',
    incidentId: 'incident-1',
    timeRange: '24h',
    title: 'First session'
  });
  const second = await store.createSession({
    userId: 'user-chat-1',
    nodeId: 'node-2',
    incidentId: '',
    timeRange: '7d',
    title: 'Second session'
  });
  const third = await store.createSession({
    userId: 'user-chat-1',
    nodeId: 'node-3',
    incidentId: '',
    timeRange: '30d',
    title: 'Third session'
  });

  const sessions = await store.listRecentSessions('user-chat-1');
  assert.deepEqual(sessions.map(session => session.sessionId), [third.sessionId, second.sessionId]);
  assert.equal(await store.getSession(first.sessionId), null);

  assert.ok(redis.expireCalls.some(call =>
    call.key === `ai:chat:session:${third.sessionId}` && call.seconds === 3600
  ));
  assert.ok(redis.expireCalls.some(call =>
    call.key === `ai:chat:session:${third.sessionId}:messages` && call.seconds === 3600
  ));
  assert.ok(redis.expireCalls.some(call =>
    call.key === 'ai:chat:user:user-chat-1:sessions' && call.seconds === 3600
  ));
});

test('aiChat store enforces per-session message count limits and returns persisted messages in order', async () => {
  assert.equal(typeof createAiChatStore, 'function');
  assert.equal(typeof createAiChatSessionPolicy, 'function');

  const policy = createAiChatSessionPolicy({
    sessionTtlSec: 1800,
    maxMessagesPerSession: 2,
    maxRecentSessionsPerUser: 5
  });
  const store = createAiChatStore({
    redisClient: createFakeRedisClient(),
    sessionPolicy: policy,
    idFactory: () => 'chat_limit_1',
    now: () => '2026-04-17T08:05:00.000Z'
  });

  const session = await store.createSession({
    userId: 'user-chat-2',
    nodeId: 'node-limit',
    incidentId: '',
    timeRange: '24h',
    title: 'Limit test session'
  });

  await store.appendMessage(session.sessionId, {
    messageId: 'msg_001',
    role: 'assistant',
    question: 'first question',
    answer: 'first answer',
    conclusion: {
      summary: 'first summary',
      riskLevel: 'low',
      keyFindings: ['first finding'],
      affectedEntities: ['node:node-limit']
    },
    recommendedActions: [],
    createdAt: '2026-04-17T08:05:01.000Z'
  });

  await store.appendMessage(session.sessionId, {
    messageId: 'msg_002',
    role: 'assistant',
    question: 'second question',
    answer: 'second answer',
    conclusion: {
      summary: 'second summary',
      riskLevel: 'medium',
      keyFindings: ['second finding'],
      affectedEntities: ['node:node-limit']
    },
    recommendedActions: [],
    createdAt: '2026-04-17T08:05:02.000Z'
  });

  await assert.rejects(
    () => store.appendMessage(session.sessionId, {
      messageId: 'msg_003',
      role: 'assistant',
      question: 'third question',
      answer: 'third answer',
      conclusion: {
        summary: 'third summary',
        riskLevel: 'high',
        keyFindings: ['third finding'],
        affectedEntities: ['node:node-limit']
      },
      recommendedActions: [],
      createdAt: '2026-04-17T08:05:03.000Z'
    }),
    error => error && error.code === 'CHAT_SESSION_MESSAGE_LIMIT_REACHED'
  );

  const messages = await store.getMessages(session.sessionId);
  const updatedSession = await store.getSession(session.sessionId);

  assert.equal(messages.length, 2);
  assert.deepEqual(messages.map(message => message.messageId), ['msg_001', 'msg_002']);
  assert.equal(updatedSession.messageCount, 2);
});
