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

function createIncidentTimelineNoteAction({ incidentTimelineService }) {
  return {
    actionClass: 'platform_action',
    actionId: 'create_incident_timeline_note',
    riskLevel: 'low',
    resolveParams(request = {}) {
      const params = request.params || {};
      const incidentId = params.incidentId || request.incidentId;
      const note = params.note || request.note;
      const visibility = params.visibility || request.visibility || 'internal';

      if (!incidentId) {
        throw createAiOpsError(
          'INVALID_ACTION_PARAMS',
          'incidentId is required for create_incident_timeline_note',
          400
        );
      }

      if (!note) {
        throw createAiOpsError(
          'INVALID_ACTION_PARAMS',
          'note is required for create_incident_timeline_note',
          400
        );
      }

      return {
        incidentId,
        note,
        visibility
      };
    },
    buildImpact({ resolvedParams }) {
      return {
        entities: [`incident:timeline:${resolvedParams.incidentId}`],
        estimatedDurationSec: 1,
        summary: 'Create a new incident timeline note'
      };
    },
    async execute({ resolvedParams }) {
      if (
        !incidentTimelineService ||
        typeof incidentTimelineService.createNote !== 'function'
      ) {
        throw createAiOpsError(
          'PLATFORM_ACTION_UNAVAILABLE',
          'incident timeline note action is not available',
          500
        );
      }

      return normalizeActionResult(
        await incidentTimelineService.createNote(resolvedParams)
      );
    }
  };
}

module.exports = {
  createIncidentTimelineNoteAction
};
