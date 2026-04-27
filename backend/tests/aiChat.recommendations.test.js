const test = require('node:test');
const assert = require('node:assert/strict');

let createAiChatService;
let createActionRegistry;
let createActionPolicy;

try {
  ({ createAiChatService } = require('../services/aiChat/aiChatService'));
  ({ createActionRegistry } = require('../services/aiOps/actionRegistry'));
  ({ createActionPolicy } = require('../services/aiOps/actionPolicy'));
} catch (error) {
  // The assertions below intentionally fail until the implementation exists.
}

test('aiChatService filters recommended actions through the registry whitelist and action policy', async () => {
  assert.equal(typeof createAiChatService, 'function');
  assert.equal(typeof createActionRegistry, 'function');
  assert.equal(typeof createActionPolicy, 'function');

  const actionRegistry = createActionRegistry({
    alertService: {
      async acknowledgeAlert(params) {
        return {
          success: true,
          data: {
            ok: true,
            eventId: params.eventId
          }
        };
      },
      async muteRuleTemporarily(params) {
        return {
          success: true,
          data: {
            ok: true,
            ruleId: params.ruleId,
            mutedUntil: params.mutedUntil
          }
        };
      }
    },
    incidentTimelineService: {
      async createNote(params) {
        return {
          success: true,
          data: {
            ok: true,
            incidentId: params.incidentId
          }
        };
      }
    }
  });

  const actionPolicy = createActionPolicy({
    canOperateRule: async ({ ruleId }) => ruleId !== 'rule-blocked'
  });

  const store = {
    async createSession(input) {
      return {
        sessionId: 'chat_reco_1',
        userId: input.userId,
        nodeId: input.nodeId,
        incidentId: input.incidentId,
        timeRange: input.timeRange,
        title: input.title,
        messageCount: 0,
        createdAt: '2026-04-17T09:00:00.000Z',
        updatedAt: '2026-04-17T09:00:00.000Z',
        status: 'active'
      };
    },
    async appendMessage(_sessionId, message) {
      return message;
    }
  };

  const chatService = createAiChatService({
    aiChatStore: store,
    aiContextService: {
      async buildContextSummary() {
        return {
          context: {
            node: { nodeId: 'node-reco-1', status: 'online' },
            incident: { incidentId: 'incident-reco-1', status: 'active' },
            metricsSummary: { timeRange: '24h', trend: 'spike detected' },
            latestAnalysisSummary: null
          },
          promptSummary: 'node-reco-1 had a CPU spike linked to incident-reco-1'
        };
      }
    },
    aiModel: {
      isEnabled() {
        return true;
      },
      getStatus() {
        return {
          enabled: true,
          provider: 'openai',
          model: 'gpt-4o-mini'
        };
      },
      async generateChatAnalysis() {
        return {
          answer: 'CPU surge correlates with the current incident.',
          conclusion: {
            summary: 'CPU surge is concentrated on one node.',
            riskLevel: 'medium',
            keyFindings: ['CPU exceeded 80%', 'Incident is still active'],
            affectedEntities: ['node:node-reco-1', 'incident:incident-reco-1']
          },
          recommendedActions: [
            {
              actionClass: 'platform_action',
              actionId: 'acknowledge_alert',
              reason: 'Acknowledge the active incident before further handling.',
              riskLevel: 'low',
              prefillParams: {
                eventId: 'incident-reco-1',
                comment: 'Investigating CPU surge'
              }
            },
            {
              actionClass: 'platform_action',
              actionId: 'mute_alert_rule_temporarily',
              reason: 'Mute repeated notifications during investigation.',
              riskLevel: 'low',
              prefillParams: {
                ruleId: 'rule-blocked',
                durationSec: 1800,
                reason: 'Investigating CPU surge'
              }
            },
            {
              actionClass: 'platform_action',
              actionId: 'non_existing_action',
              reason: 'This must be dropped.',
              riskLevel: 'high',
              prefillParams: {}
            }
          ]
        };
      }
    },
    actionRegistry,
    actionPolicy,
    idFactory: () => 'msg_reco_001',
    now: () => '2026-04-17T09:00:01.000Z'
  });

  const result = await chatService.createSession({
    actor: {
      id: 'operator-1',
      role: 'operator'
    },
    input: {
      nodeId: 'node-reco-1',
      incidentId: 'incident-reco-1',
      timeRange: '24h',
      question: 'Why is CPU still high?'
    }
  });

  assert.equal(result.message.messageId, 'msg_reco_001');
  assert.equal(result.message.answer, 'CPU surge correlates with the current incident.');
  assert.equal(result.message.conclusion.summary, 'CPU surge is concentrated on one node.');
  assert.deepEqual(result.message.recommendedActions, [
    {
      actionClass: 'platform_action',
      actionId: 'acknowledge_alert',
      title: 'Acknowledge Alert',
      reason: 'Acknowledge the active incident before further handling.',
      riskLevel: 'low',
      prefillParams: {
        eventId: 'incident-reco-1',
        comment: 'Investigating CPU surge'
      }
    }
  ]);
});
