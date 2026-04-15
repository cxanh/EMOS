const { createAiOpsError } = require('../../services/aiOps/errors');

function normalizeActionResult(result) {
  if (result && result.success === false) {
    throw createAiOpsError(
      'PLATFORM_ACTION_FAILED',
      result.error || 'Platform action failed',
      500
    );
  }

  if (result && result.success === true && result.data) {
    return result.data;
  }

  return result || { ok: true };
}

function createMuteAlertRuleTemporarilyAction({
  alertService,
  now = () => new Date().toISOString()
}) {
  return {
    actionClass: 'platform_action',
    actionId: 'mute_alert_rule_temporarily',
    riskLevel: 'low',
    resolveParams(request = {}, context = {}) {
      const params = request.params || {};
      const ruleId = params.ruleId || request.ruleId;
      const durationSec = Number(params.durationSec || request.durationSec);
      const reason = params.reason || request.reason;
      const actorId = context.actor && context.actor.id;

      if (!ruleId) {
        throw createAiOpsError(
          'INVALID_ACTION_PARAMS',
          'ruleId is required for mute_alert_rule_temporarily',
          400
        );
      }

      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        throw createAiOpsError(
          'INVALID_ACTION_PARAMS',
          'durationSec must be a positive number for mute_alert_rule_temporarily',
          400
        );
      }

      if (!reason) {
        throw createAiOpsError(
          'INVALID_ACTION_PARAMS',
          'reason is required for mute_alert_rule_temporarily',
          400
        );
      }

      const baseTime = new Date(now());
      const mutedUntil = new Date(baseTime.getTime() + durationSec * 1000).toISOString();

      return {
        ruleId,
        durationSec,
        muteReason: reason,
        mutedBy: actorId || '',
        mutedUntil
      };
    },
    buildWarnings() {
      return ['静默期间相同规则不会生成新告警'];
    },
    buildImpact({ resolvedParams }) {
      return {
        entities: [`alert_rule:${resolvedParams.ruleId}`],
        estimatedDurationSec: resolvedParams.durationSec,
        summary: 'Temporarily mute the alert rule'
      };
    },
    async execute({ resolvedParams }) {
      if (!alertService || typeof alertService.muteRuleTemporarily !== 'function') {
        throw createAiOpsError(
          'PLATFORM_ACTION_UNAVAILABLE',
          'mute alert rule action is not available',
          500
        );
      }

      return normalizeActionResult(
        await alertService.muteRuleTemporarily(resolvedParams)
      );
    }
  };
}

module.exports = {
  createMuteAlertRuleTemporarilyAction
};
