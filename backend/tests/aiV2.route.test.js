const test = require('node:test');
const assert = require('node:assert/strict');

const express = require('express');

const { createFakeRedisClient, jsonRequest, startServer } = require('./aiOpsTestUtils');
const { errorHandler, notFoundHandler } = require('../middleware/errorHandler');

let createAiV2Router;
let createActionRegistry;
let createActionPolicy;
let createActionDryRun;
let createActionExecutor;
let createActionVerifier;
let createActionAudit;
let createActionRequestStore;
let createAiOpsOrchestrator;

try {
  ({ createAiV2Router } = require('../routes/aiV2'));
  ({ createActionRegistry } = require('../services/aiOps/actionRegistry'));
  ({ createActionPolicy } = require('../services/aiOps/actionPolicy'));
  ({ createActionDryRun } = require('../services/aiOps/actionDryRun'));
  ({ createActionExecutor } = require('../services/aiOps/actionExecutor'));
  ({ createActionVerifier } = require('../services/aiOps/actionVerifier'));
  ({ createActionAudit } = require('../services/aiOps/actionAudit'));
  ({ createActionRequestStore } = require('../services/aiOps/actionRequestStore'));
  ({ createAiOpsOrchestrator } = require('../services/aiOps/aiOpsOrchestrator'));
} catch (error) {
  // The assertions below intentionally fail until the implementation exists.
}

test('aiV2 routes create request, confirm with intermediate status, expose terminal state, and return a full timeline', async () => {
  assert.equal(typeof createAiV2Router, 'function');
  assert.equal(typeof createActionRegistry, 'function');
  assert.equal(typeof createActionPolicy, 'function');
  assert.equal(typeof createActionDryRun, 'function');
  assert.equal(typeof createActionExecutor, 'function');
  assert.equal(typeof createActionVerifier, 'function');
  assert.equal(typeof createActionAudit, 'function');
  assert.equal(typeof createActionRequestStore, 'function');
  assert.equal(typeof createAiOpsOrchestrator, 'function');

  const redisClient = createFakeRedisClient();
  let acknowledgeCalls = 0;

  const actionRegistry = createActionRegistry({
    alertService: {
      async acknowledgeAlert(params) {
        acknowledgeCalls += 1;
        return {
          ok: true,
          eventId: params.eventId
        };
      }
    },
    incidentTimelineService: {
      async createNote(params) {
        return {
          ok: true,
          noteId: 'note-1',
          incidentId: params.incidentId
        };
      }
    }
  });

  const actionPolicy = createActionPolicy();
  const actionRequestStore = createActionRequestStore({
    redisClient,
    now: () => '2026-04-15T00:00:00.000Z'
  });
  const actionAudit = createActionAudit({
    redisClient,
    now: () => '2026-04-15T00:00:00.000Z'
  });

  const orchestrator = createAiOpsOrchestrator({
    actionRegistry,
    actionPolicy,
    actionDryRun: createActionDryRun({
      actionRegistry,
      actionPolicy
    }),
    actionExecutor: createActionExecutor({
      actionRegistry
    }),
    actionVerifier: createActionVerifier(),
    actionAudit,
    actionRequestStore,
    idFactory: () => 'actreq_route_001',
    traceIdFactory: () => 'trace_route_001',
    now: () => '2026-04-15T00:00:00.000Z'
  });

  const app = express();
  app.use(express.json());
  app.use('/api/ai/v2', createAiV2Router({
    orchestrator,
    authenticateRequest: (req, res, next) => {
      req.user = {
        id: 'user-route',
        role: 'operator'
      };
      next();
    }
  }));
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = await startServer(app);

  try {
    const createResponse = await jsonRequest(server.baseUrl, '/api/ai/v2/action-requests', {
      method: 'POST',
      body: JSON.stringify({
        actionClass: 'platform_action',
        actionId: 'acknowledge_alert',
        idempotencyKey: 'route-ack-1',
        params: {
          eventId: 'alert-42',
          comment: 'Acknowledge from route test'
        }
      })
    });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.body.data.status, 'DRY_RUN_READY');
    assert.deepEqual(createResponse.body.data.dryRun, {
      allowed: true,
      riskLevel: 'low',
      warnings: [],
      impact: {
        entities: ['alert:alert-42'],
        estimatedDurationSec: 1,
        summary: 'Mark the alert as acknowledged'
      },
      resolvedParams: {
        eventId: 'alert-42',
        comment: 'Acknowledge from route test'
      }
    });

    const confirmResponse = await jsonRequest(
      server.baseUrl,
      '/api/ai/v2/action-requests/actreq_route_001/confirm',
      {
        method: 'POST',
        body: JSON.stringify({ confirm: true })
      }
    );

    assert.equal(confirmResponse.status, 200);
    assert.ok(['EXECUTING', 'VERIFYING'].includes(confirmResponse.body.data.status));

    const getResponse = await jsonRequest(
      server.baseUrl,
      '/api/ai/v2/action-requests/actreq_route_001',
      {
        method: 'GET'
      }
    );

    assert.equal(getResponse.status, 200);
    assert.equal(getResponse.body.data.status, 'SUCCEEDED');
    assert.deepEqual(getResponse.body.data.executionResult, {
      ok: true,
      eventId: 'alert-42'
    });

    const timelineResponse = await jsonRequest(
      server.baseUrl,
      '/api/ai/v2/action-requests/actreq_route_001/timeline',
      {
        method: 'GET'
      }
    );

    assert.equal(timelineResponse.status, 200);
    assert.deepEqual(
      timelineResponse.body.data.events.map(event => event.eventType),
      [
        'ACTION_REQUESTED',
        'ACTION_DRY_RUN_COMPLETED',
        'ACTION_CONFIRMED',
        'ACTION_EXECUTION_STARTED',
        'ACTION_EXECUTION_COMPLETED',
        'ACTION_VERIFICATION_COMPLETED',
        'ACTION_COMPLETED'
      ]
    );

    const duplicateConfirmResponse = await jsonRequest(
      server.baseUrl,
      '/api/ai/v2/action-requests/actreq_route_001/confirm',
      {
        method: 'POST',
        body: JSON.stringify({ confirm: true })
      }
    );

    assert.equal(duplicateConfirmResponse.status, 409);
    assert.equal(duplicateConfirmResponse.body.error.code, 'ACTION_REQUEST_NOT_CONFIRMABLE');
    assert.equal(acknowledgeCalls, 1);
  } finally {
    await server.close();
  }
});
