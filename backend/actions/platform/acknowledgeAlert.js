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

function createAcknowledgeAlertAction({ alertService }) {
  return {
    actionClass: 'platform_action',
    actionId: 'acknowledge_alert',
    riskLevel: 'low',
    resolveParams(request = {}) {
      const params = request.params || {};
      const eventId = params.eventId || request.eventId || request.incidentId;
      const comment = params.comment || request.comment || '';

      if (!eventId) {
        throw createAiOpsError(
          'INVALID_ACTION_PARAMS',
          'eventId is required for acknowledge_alert',
          400
        );
      }

      return {
        eventId,
        comment
      };
    },
    buildImpact({ resolvedParams }) {
      return {
        entities: [`alert:${resolvedParams.eventId}`],
        estimatedDurationSec: 1,
        summary: 'Mark the alert as acknowledged'
      };
    },
    async execute({ resolvedParams }) {
      if (!alertService || typeof alertService.acknowledgeAlert !== 'function') {
        throw createAiOpsError(
          'PLATFORM_ACTION_UNAVAILABLE',
          'acknowledge alert action is not available',
          500
        );
      }

      return normalizeActionResult(
        await alertService.acknowledgeAlert(resolvedParams)
      );
    }
  };
}

module.exports = {
  createAcknowledgeAlertAction
};
