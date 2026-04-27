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

test('audit events persist dryRunResult and resolvedParams for the request lifecycle', async () => {
  assert.equal(typeof createActionRegistry, 'function');
  assert.equal(typeof createActionPolicy, 'function');
  assert.equal(typeof createActionDryRun, 'function');
  assert.equal(typeof createActionExecutor, 'function');
  assert.equal(typeof createActionVerifier, 'function');
  assert.equal(typeof createActionAudit, 'function');
  assert.equal(typeof createActionRequestStore, 'function');
  assert.equal(typeof createAiOpsOrchestrator, 'function');

  const redisClient = createFakeRedisClient();

  const actionRegistry = createActionRegistry({
    alertService: {},
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

  const actionRequestStore = createActionRequestStore({
    redisClient,
    now: () => '2026-04-15T00:00:00.000Z'
  });

  const actionAudit = createActionAudit({
    redisClient,
    now: () => '2026-04-15T00:00:00.000Z',
    eventIdFactory: sequence => `audit_${sequence}`
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
    idFactory: () => 'actreq_002',
    traceIdFactory: () => 'trace_002',
    now: () => '2026-04-15T00:00:00.000Z'
  });

  const created = await orchestrator.createActionRequest({
    actor: {
      id: 'user-2',
      role: 'operator'
    },
    input: {
      actionClass: 'platform_action',
      actionId: 'create_incident_timeline_note',
      idempotencyKey: 'incident-note-1',
      params: {
        incidentId: 'incident-1',
        note: 'Timeline note from audit test'
      }
    }
  });

  await orchestrator.confirmActionRequest({
    actor: {
      id: 'user-2',
      role: 'operator'
    },
    requestId: created.requestId
  });

  const auditEventIds = await redisClient.zRange('ai:v2:audit:events', 0, -1);

  assert.ok(auditEventIds.length >= 2);

  const dryRunAudit = await redisClient.hGetAll('ai:v2:audit:event:audit_2');
  const executionAudit = await redisClient.hGetAll('ai:v2:audit:event:audit_4');

  assert.equal(dryRunAudit.requestId, created.requestId);
  assert.deepEqual(JSON.parse(dryRunAudit.dryRunResult), {
    allowed: true,
    riskLevel: 'low',
    warnings: [],
    impact: {
      entities: ['incident:timeline:incident-1'],
      estimatedDurationSec: 1,
      summary: 'Create a new incident timeline note'
    },
    resolvedParams: {
      incidentId: 'incident-1',
      note: 'Timeline note from audit test',
      visibility: 'internal'
    }
  });
  assert.deepEqual(JSON.parse(dryRunAudit.resolvedParams), {
    incidentId: 'incident-1',
    note: 'Timeline note from audit test',
    visibility: 'internal'
  });
  assert.deepEqual(JSON.parse(executionAudit.resolvedParams), {
    incidentId: 'incident-1',
    note: 'Timeline note from audit test',
    visibility: 'internal'
  });
});
