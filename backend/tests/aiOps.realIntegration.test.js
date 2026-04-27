const test = require('node:test');
const assert = require('node:assert/strict');

const redisModule = require('../config/redis');
const alertService = require('../services/alertService');
const { createFakeRedisClient } = require('./aiOpsTestUtils');

let createActionRegistry;
let createActionPolicy;
let createActionDryRun;
let createActionExecutor;
let createActionVerifier;
let createActionAudit;
let createActionRequestStore;
let createAiOpsOrchestrator;
let createIncidentTimelineService;

try {
  ({ createActionRegistry } = require('../services/aiOps/actionRegistry'));
  ({ createActionPolicy } = require('../services/aiOps/actionPolicy'));
  ({ createActionDryRun } = require('../services/aiOps/actionDryRun'));
  ({ createActionExecutor } = require('../services/aiOps/actionExecutor'));
  ({ createActionVerifier } = require('../services/aiOps/actionVerifier'));
  ({ createActionAudit } = require('../services/aiOps/actionAudit'));
  ({ createActionRequestStore } = require('../services/aiOps/actionRequestStore'));
  ({ createAiOpsOrchestrator } = require('../services/aiOps/aiOpsOrchestrator'));
  ({ createIncidentTimelineService } = require('../services/aiOps/incidentTimelineService'));
} catch (error) {
  // The assertions below intentionally fail until Batch 2 wiring exists.
}

test('acknowledge_alert uses real alertService update and verification', async () => {
  assert.equal(typeof createActionVerifier, 'function');
  assert.equal(typeof createIncidentTimelineService, 'function');
  assert.equal(typeof createAiOpsOrchestrator, 'function');

  const fakeRedis = createFakeRedisClient();
  redisModule.client = fakeRedis;

  const createdEvent = await alertService.createEvent({
    ruleId: 'rule-1',
    ruleName: 'CPU High',
    nodeId: 'node-1',
    nodeName: 'Node 1',
    metric: 'cpu_usage',
    currentValue: 95,
    threshold: 90
  });

  const incidentTimelineService = createIncidentTimelineService({
    redis: fakeRedis,
    now: () => '2026-04-15T00:00:00.000Z',
    idFactory: () => 'timeline_note_real_1'
  });

  const actionRegistry = createActionRegistry({
    alertService,
    incidentTimelineService
  });
  const actionPolicy = createActionPolicy();
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
    actionVerifier: createActionVerifier({
      alertService,
      incidentTimelineService
    }),
    actionAudit: createActionAudit({
      redisClient: fakeRedis,
      now: () => '2026-04-15T00:00:00.000Z'
    }),
    actionRequestStore: createActionRequestStore({
      redisClient: fakeRedis,
      now: () => '2026-04-15T00:00:00.000Z'
    }),
    idFactory: () => 'actreq_real_alert_1',
    traceIdFactory: () => 'trace_real_alert_1',
    now: () => '2026-04-15T00:00:00.000Z'
  });

  const created = await orchestrator.createActionRequest({
    actor: {
      id: 'user-real-alert',
      role: 'operator'
    },
    input: {
      actionClass: 'platform_action',
      actionId: 'acknowledge_alert',
      idempotencyKey: 'real-alert-ack-1',
      params: {
        eventId: createdEvent.id,
        comment: 'Acknowledged in real integration test'
      }
    }
  });

  await orchestrator.confirmActionRequest({
    actor: {
      id: 'user-real-alert',
      role: 'operator'
    },
    requestId: created.requestId
  });

  const storedRequest = await orchestrator.getActionRequest(created.requestId);
  const event = await alertService.getEventById(createdEvent.id);

  assert.equal(storedRequest.status, 'SUCCEEDED');
  assert.deepEqual(storedRequest.verificationResult, {
    status: 'pass',
    checks: [
      {
        name: 'alert_acknowledged',
        status: 'pass'
      }
    ]
  });
  assert.equal(event.status, 'acknowledged');
  assert.equal(event.comment, 'Acknowledged in real integration test');
});

test('create_incident_timeline_note writes a real note and verification queries it back', async () => {
  assert.equal(typeof createActionVerifier, 'function');
  assert.equal(typeof createIncidentTimelineService, 'function');
  assert.equal(typeof createAiOpsOrchestrator, 'function');

  const fakeRedis = createFakeRedisClient();
  redisModule.client = fakeRedis;

  const incidentTimelineService = createIncidentTimelineService({
    redis: fakeRedis,
    now: () => '2026-04-15T00:00:00.000Z',
    idFactory: () => 'timeline_note_real_2'
  });

  const actionRegistry = createActionRegistry({
    alertService,
    incidentTimelineService
  });
  const actionPolicy = createActionPolicy();
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
    actionVerifier: createActionVerifier({
      alertService,
      incidentTimelineService
    }),
    actionAudit: createActionAudit({
      redisClient: fakeRedis,
      now: () => '2026-04-15T00:00:00.000Z'
    }),
    actionRequestStore: createActionRequestStore({
      redisClient: fakeRedis,
      now: () => '2026-04-15T00:00:00.000Z'
    }),
    idFactory: () => 'actreq_real_timeline_1',
    traceIdFactory: () => 'trace_real_timeline_1',
    now: () => '2026-04-15T00:00:00.000Z'
  });

  const created = await orchestrator.createActionRequest({
    actor: {
      id: 'user-real-timeline',
      role: 'operator'
    },
    input: {
      actionClass: 'platform_action',
      actionId: 'create_incident_timeline_note',
      idempotencyKey: 'real-timeline-note-1',
      params: {
        incidentId: 'incident-real-1',
        note: 'Timeline note from real integration test'
      }
    }
  });

  await orchestrator.confirmActionRequest({
    actor: {
      id: 'user-real-timeline',
      role: 'operator'
    },
    requestId: created.requestId
  });

  const storedRequest = await orchestrator.getActionRequest(created.requestId);
  const note = await incidentTimelineService.getNoteById('timeline_note_real_2');
  const notes = await incidentTimelineService.listNotes('incident-real-1');

  assert.equal(storedRequest.status, 'SUCCEEDED');
  assert.deepEqual(storedRequest.verificationResult, {
    status: 'pass',
    checks: [
      {
        name: 'incident_timeline_note_created',
        status: 'pass'
      }
    ]
  });
  assert.equal(note.noteId, 'timeline_note_real_2');
  assert.equal(note.incidentId, 'incident-real-1');
  assert.equal(notes.length, 1);
  assert.equal(notes[0].note, 'Timeline note from real integration test');
});

test('mute_alert_rule_temporarily writes mute fields, verifies them, and repeated confirm does not execute twice', async () => {
  assert.equal(typeof createActionVerifier, 'function');
  assert.equal(typeof createAiOpsOrchestrator, 'function');

  const fakeRedis = createFakeRedisClient();
  redisModule.client = fakeRedis;

  const createdRule = await alertService.createRule({
    name: 'Memory High',
    nodeId: 'node-2',
    metric: 'memory_usage',
    threshold: 90,
    duration: 60
  });

  const incidentTimelineService = createIncidentTimelineService({
    redis: fakeRedis,
    now: () => '2026-04-15T00:00:00.000Z',
    idFactory: () => 'timeline_note_real_3'
  });

  const actionRegistry = createActionRegistry({
    alertService,
    incidentTimelineService,
    now: () => '2026-04-15T00:00:00.000Z'
  });
  const actionPolicy = createActionPolicy();
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
    actionVerifier: createActionVerifier({
      alertService,
      incidentTimelineService,
      now: () => '2026-04-15T00:00:00.000Z'
    }),
    actionAudit: createActionAudit({
      redisClient: fakeRedis,
      now: () => '2026-04-15T00:00:00.000Z'
    }),
    actionRequestStore: createActionRequestStore({
      redisClient: fakeRedis,
      now: () => '2026-04-15T00:00:00.000Z'
    }),
    idFactory: () => 'actreq_real_mute_1',
    traceIdFactory: () => 'trace_real_mute_1',
    now: () => '2026-04-15T00:00:00.000Z'
  });

  const created = await orchestrator.createActionRequest({
    actor: {
      id: 'user-real-mute',
      role: 'operator'
    },
    input: {
      actionClass: 'platform_action',
      actionId: 'mute_alert_rule_temporarily',
      idempotencyKey: 'real-rule-mute-1',
      params: {
        ruleId: createdRule.data.id,
        durationSec: 1800,
        reason: 'Maintenance window'
      }
    }
  });

  await orchestrator.confirmActionRequest({
    actor: {
      id: 'user-real-mute',
      role: 'operator'
    },
    requestId: created.requestId
  });

  const storedRequest = await orchestrator.getActionRequest(created.requestId);
  const ruleAfterFirstConfirm = await alertService.getRule(createdRule.data.id);

  assert.equal(storedRequest.status, 'SUCCEEDED');
  assert.deepEqual(storedRequest.verificationResult, {
    status: 'pass',
    checks: [
      {
        name: 'alert_rule_muted_temporarily',
        status: 'pass'
      }
    ]
  });
  assert.equal(ruleAfterFirstConfirm.muted_until, '2026-04-15T00:30:00.000Z');
  assert.equal(ruleAfterFirstConfirm.muted_by, 'user-real-mute');
  assert.equal(ruleAfterFirstConfirm.mute_reason, 'Maintenance window');

  await assert.rejects(
    orchestrator.confirmActionRequest({
      actor: {
        id: 'user-real-mute',
        role: 'operator'
      },
      requestId: created.requestId
    }),
    error => error.code === 'ACTION_REQUEST_NOT_CONFIRMABLE'
  );

  const ruleAfterSecondConfirm = await alertService.getRule(createdRule.data.id);

  assert.equal(ruleAfterSecondConfirm.muted_until, '2026-04-15T00:30:00.000Z');
  assert.equal(ruleAfterSecondConfirm.muted_by, 'user-real-mute');
  assert.equal(ruleAfterSecondConfirm.mute_reason, 'Maintenance window');
});
