const test = require('node:test');
const assert = require('node:assert/strict');

let createActionRegistry;
let createActionPolicy;
let createActionDryRun;

try {
  ({ createActionRegistry } = require('../services/aiOps/actionRegistry'));
  ({ createActionPolicy } = require('../services/aiOps/actionPolicy'));
  ({ createActionDryRun } = require('../services/aiOps/actionDryRun'));
} catch (error) {
  // The assertions below intentionally fail until the implementation exists.
}

test('dry-run returns normalized result and calls reserved policy hooks', async () => {
  assert.equal(typeof createActionRegistry, 'function');
  assert.equal(typeof createActionPolicy, 'function');
  assert.equal(typeof createActionDryRun, 'function');

  let canAccessIncidentCalls = 0;
  let canOperateRuleCalls = 0;

  const registry = createActionRegistry({
    alertService: {},
    incidentTimelineService: {}
  });

  const policy = createActionPolicy({
    canAccessIncident: async ({ incidentId }) => {
      canAccessIncidentCalls += 1;
      return Boolean(incidentId);
    },
    canOperateRule: async () => {
      canOperateRuleCalls += 1;
      return true;
    }
  });

  const actionDryRun = createActionDryRun({
    actionRegistry: registry,
    actionPolicy: policy
  });

  const result = await actionDryRun.run({
    actor: {
      id: 'user-1',
      role: 'operator'
    },
    request: {
      actionClass: 'platform_action',
      actionId: 'create_incident_timeline_note',
      params: {
        incidentId: 'incident-1',
        note: 'Investigating alert spike'
      }
    }
  });

  assert.deepEqual(result, {
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
      note: 'Investigating alert spike',
      visibility: 'internal'
    }
  });

  assert.equal(canAccessIncidentCalls, 1);
  assert.equal(canOperateRuleCalls, 0);
});

test('dry-run for mute_alert_rule_temporarily returns normalized duration, expiry, and fixed warning', async () => {
  assert.equal(typeof createActionRegistry, 'function');
  assert.equal(typeof createActionPolicy, 'function');
  assert.equal(typeof createActionDryRun, 'function');

  let canOperateRuleCalls = 0;

  const registry = createActionRegistry({
    alertService: {},
    incidentTimelineService: {},
    now: () => '2026-04-15T00:00:00.000Z'
  });

  const policy = createActionPolicy({
    canOperateRule: async ({ ruleId }) => {
      canOperateRuleCalls += 1;
      return Boolean(ruleId);
    }
  });

  const actionDryRun = createActionDryRun({
    actionRegistry: registry,
    actionPolicy: policy
  });

  const result = await actionDryRun.run({
    actor: {
      id: 'user-2',
      role: 'operator'
    },
    request: {
      actionClass: 'platform_action',
      actionId: 'mute_alert_rule_temporarily',
      params: {
        ruleId: 'rule-1',
        durationSec: 1800,
        reason: 'Maintenance window'
      }
    }
  });

  assert.deepEqual(result, {
    allowed: true,
    riskLevel: 'low',
    warnings: ['静默期间相同规则不会生成新告警'],
    impact: {
      entities: ['alert_rule:rule-1'],
      estimatedDurationSec: 1800,
      summary: 'Temporarily mute the alert rule'
    },
    resolvedParams: {
      ruleId: 'rule-1',
      durationSec: 1800,
      muteReason: 'Maintenance window',
      mutedBy: 'user-2',
      mutedUntil: '2026-04-15T00:30:00.000Z'
    }
  });

  assert.equal(canOperateRuleCalls, 1);
});
