const test = require('node:test');
const assert = require('node:assert/strict');

const express = require('express');

const { createFakeRedisClient, jsonRequest, startServer } = require('./aiOpsTestUtils');
const { errorHandler, notFoundHandler } = require('../middleware/errorHandler');
const { generateToken } = require('../middleware/auth');

let createAiChatRouter;
let createApp;

try {
  ({ createAiChatRouter } = require('../routes/aiChat'));
  ({ createApp } = require('../index'));
} catch (error) {
  // The assertions below intentionally fail until the implementation exists.
}

function createTestApp({ aiChatService, user }) {
  const app = express();
  app.use(express.json());
  app.use('/api/ai/v2/chat', createAiChatRouter({
    aiChatService,
    authenticateRequest: (req, res, next) => {
      req.user = user;
      next();
    }
  }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

test('aiChat routes create sessions, append messages, and expose recent sessions plus message history', async () => {
  assert.equal(typeof createAiChatRouter, 'function');

  const serviceCalls = [];
  const aiChatService = {
    async createSession({ actor, input }) {
      serviceCalls.push({
        method: 'createSession',
        actor,
        input
      });
      return {
        sessionId: 'chat_route_001',
        context: {
          nodeId: input.nodeId,
          incidentId: input.incidentId,
          timeRange: input.timeRange
        },
        message: {
          messageId: 'msg_route_001',
          role: 'assistant',
          question: input.question,
          answer: 'Investigating the node context.',
          conclusion: {
            summary: 'CPU is high on the selected node.',
            riskLevel: 'medium',
            keyFindings: ['CPU > 80%'],
            affectedEntities: ['node:node-route-1']
          },
          recommendedActions: []
        }
      };
    },
    async postMessage({ actor, sessionId, question }) {
      serviceCalls.push({
        method: 'postMessage',
        actor,
        sessionId,
        question
      });
      return {
        sessionId,
        message: {
          messageId: 'msg_route_002',
          role: 'assistant',
          question,
          answer: 'The incident is still active.',
          conclusion: {
            summary: 'Incident remains active.',
            riskLevel: 'low',
            keyFindings: ['Incident state is active'],
            affectedEntities: ['incident:incident-route-1']
          },
          recommendedActions: []
        }
      };
    },
    async listSessions({ actor }) {
      serviceCalls.push({
        method: 'listSessions',
        actor
      });
      return {
        sessions: [
          {
            sessionId: 'chat_route_001',
            title: 'Why is CPU high?',
            nodeId: 'node-route-1',
            incidentId: 'incident-route-1',
            timeRange: '24h',
            messageCount: 2,
            updatedAt: '2026-04-17T09:30:00.000Z'
          }
        ]
      };
    },
    async getSession({ actor, sessionId }) {
      serviceCalls.push({
        method: 'getSession',
        actor,
        sessionId
      });
      return {
        sessionId,
        title: 'Why is CPU high?',
        nodeId: 'node-route-1',
        incidentId: 'incident-route-1',
        timeRange: '24h',
        messageCount: 2,
        updatedAt: '2026-04-17T09:30:00.000Z'
      };
    },
    async getMessages({ actor, sessionId }) {
      serviceCalls.push({
        method: 'getMessages',
        actor,
        sessionId
      });
      return {
        sessionId,
        messages: [
          {
            messageId: 'msg_route_001',
            role: 'assistant',
            question: 'Why is CPU high?',
            answer: 'Investigating the node context.',
            conclusion: {
              summary: 'CPU is high on the selected node.',
              riskLevel: 'medium',
              keyFindings: ['CPU > 80%'],
              affectedEntities: ['node:node-route-1']
            },
            recommendedActions: []
          }
        ]
      };
    }
  };

  const app = createTestApp({
    aiChatService,
    user: {
      id: 'user-chat-route',
      role: 'viewer'
    }
  });
  const server = await startServer(app);

  try {
    const createResponse = await jsonRequest(server.baseUrl, '/api/ai/v2/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({
        nodeId: 'node-route-1',
        incidentId: 'incident-route-1',
        timeRange: '24h',
        question: 'Why is CPU high?'
      })
    });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.body.data.sessionId, 'chat_route_001');
    assert.equal(createResponse.body.data.message.messageId, 'msg_route_001');

    const messageResponse = await jsonRequest(server.baseUrl, '/api/ai/v2/chat/sessions/chat_route_001/messages', {
      method: 'POST',
      body: JSON.stringify({
        question: 'Does this relate to the incident?'
      })
    });

    assert.equal(messageResponse.status, 200);
    assert.equal(messageResponse.body.data.message.messageId, 'msg_route_002');

    const listResponse = await jsonRequest(server.baseUrl, '/api/ai/v2/chat/sessions', {
      method: 'GET'
    });

    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.body.data.sessions.length, 1);

    const detailResponse = await jsonRequest(server.baseUrl, '/api/ai/v2/chat/sessions/chat_route_001', {
      method: 'GET'
    });
    assert.equal(detailResponse.status, 200);
    assert.equal(detailResponse.body.data.sessionId, 'chat_route_001');

    const historyResponse = await jsonRequest(server.baseUrl, '/api/ai/v2/chat/sessions/chat_route_001/messages', {
      method: 'GET'
    });
    assert.equal(historyResponse.status, 200);
    assert.equal(historyResponse.body.data.messages.length, 1);

    assert.deepEqual(serviceCalls.map(call => call.method), [
      'createSession',
      'postMessage',
      'listSessions',
      'getSession',
      'getMessages'
    ]);
  } finally {
    await server.close();
  }
});

test('aiChat routes validate request payloads and main app protects /api/ai/v2/chat with JWT auth', async () => {
  assert.equal(typeof createAiChatRouter, 'function');
  assert.equal(typeof createApp, 'function');

  const validationApp = createTestApp({
    aiChatService: {},
    user: {
      id: 'user-chat-validate',
      role: 'viewer'
    }
  });
  const validationServer = await startServer(validationApp);

  try {
    const missingQuestionResponse = await jsonRequest(validationServer.baseUrl, '/api/ai/v2/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({
        timeRange: '24h'
      })
    });
    assert.equal(missingQuestionResponse.status, 400);
    assert.equal(missingQuestionResponse.body.error.code, 'INVALID_CHAT_REQUEST');

    const invalidRangeResponse = await jsonRequest(validationServer.baseUrl, '/api/ai/v2/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({
        timeRange: '90d',
        question: 'invalid time range'
      })
    });
    assert.equal(invalidRangeResponse.status, 400);
    assert.equal(invalidRangeResponse.body.error.code, 'INVALID_CHAT_REQUEST');

    const invalidFollowUpResponse = await jsonRequest(
      validationServer.baseUrl,
      '/api/ai/v2/chat/sessions/chat_route_001/messages',
      {
        method: 'POST',
        body: JSON.stringify({})
      }
    );
    assert.equal(invalidFollowUpResponse.status, 400);
    assert.equal(invalidFollowUpResponse.body.error.code, 'INVALID_CHAT_REQUEST');
  } finally {
    await validationServer.close();
  }

  process.env.JWT_SECRET = process.env.JWT_SECRET || 'batch-7-chat-secret';

  const app = createApp({
    skipRequestLogging: true
  });
  const server = await startServer(app);

  try {
    const noAuthResponse = await jsonRequest(server.baseUrl, '/api/ai/v2/chat/sessions', {
      method: 'GET'
    });

    assert.equal(noAuthResponse.status, 401);
    assert.equal(noAuthResponse.body.error.code, 'NO_TOKEN');

    const token = generateToken({
      id: 'mount-chat-user',
      role: 'viewer'
    });

    const authResponse = await jsonRequest(server.baseUrl, '/api/ai/v2/chat/sessions', {
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
