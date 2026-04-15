const test = require('node:test');
const assert = require('node:assert/strict');

const { createFakeRedisClient } = require('./aiOpsTestUtils');

let createActionRegistry;
let createActionPolicy;
let createActionDryRun;
let createActionExecutor;
let createActionVerifier;
let createActionAudit;
let createActionRequestStore;
let createAiOpsOrchestrator;

try {
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

test('confirm advances state machine, get returns terminal state, and repeated confirm does not execute twice', async () => {
  assert.equal(typeof createActionRegistry, 'function');
  assert.equal(typeof createActionPolicy, 'function');
  assert.equal(typeof createActionDryRun, 'function');
  assert.equal(typeof createActionExecutor, 'function');
  assert.equal(typeof createActionVerifier, 'function');
  assert.equal(typeof createActionAudit, 'function');
  assert.equal(typeof createActionRequestStore, 'function');
  assert.equal(typeof createAiOpsOrchestrator, 'function');

  const redisClient = createFakeRedisClient();
  let executionCalls = 0;

  const actionRegistry = createActionRegistry({
    alertService: {
      async acknowledgeAlert() {
        executionCalls += 1;
        return {
          ok: true,
          alertId: 'alert-1'
        };
      }
    },
    incidentTimelineService: {}
  });

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
    actionPolicy: createActionPolicy(),
    actionDryRun: createActionDryRun({
      actionRegistry,
      actionPolicy: createActionPolicy()
    }),
    actionExecutor: createActionExecutor({
      actionRegistry
    }),
    actionVerifier: createActionVerifier(),
    actionAudit,
    actionRequestStore,
    idFactory: () => 'actreq_001',
    traceIdFactory: () => 'trace_001',
    now: () => '2026-04-15T00:00:00.000Z'
  });

  const created = await orchestrator.createActionRequest({
    actor: {
      id: 'user-1',
      role: 'operator'
    },
    input: {
      actionClass: 'platform_action',
      actionId: 'acknowledge_alert',
      idempotencyKey: 'ack-alert-1',
      params: {
        eventId: 'alert-1',
        comment: 'Acknowledged by AI Ops test'
      }
    }
  });

  assert.equal(created.status, 'DRY_RUN_READY');

  const confirmResult = await orchestrator.confirmActionRequest({
    actor: {
      id: 'user-1',
      role: 'operator'
    },
    requestId: created.requestId
  });

  assert.equal(confirmResult.status, 'EXECUTING');

  const request = await orchestrator.getActionRequest(created.requestId);

  assert.equal(request.status, 'SUCCEEDED');
  assert.deepEqual(request.executionResult, {
    ok: true,
    alertId: 'alert-1'
  });
  assert.deepEqual(request.verificationResult, {
    status: 'pass',
    checks: []
  });
  assert.equal(executionCalls, 1);

  await assert.rejects(
    orchestrator.confirmActionRequest({
      actor: {
        id: 'user-1',
        role: 'operator'
      },
      requestId: created.requestId
    }),
    error => error.code === 'ACTION_REQUEST_NOT_CONFIRMABLE'
  );

  assert.equal(executionCalls, 1);
});
