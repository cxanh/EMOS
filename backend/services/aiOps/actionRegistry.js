const { createAcknowledgeAlertAction } = require('../../actions/platform/acknowledgeAlert');
const {
  createIncidentTimelineNoteAction
} = require('../../actions/platform/createIncidentTimelineNote');
const {
  createMuteAlertRuleTemporarilyAction
} = require('../../actions/platform/muteAlertRuleTemporarily');
const { createAiOpsError } = require('./errors');

function createActionRegistry({ alertService, incidentTimelineService, now }) {
  const actions = new Map();

  [
    createAcknowledgeAlertAction({ alertService }),
    createIncidentTimelineNoteAction({ incidentTimelineService }),
    createMuteAlertRuleTemporarilyAction({ alertService, now })
  ].forEach(action => {
    actions.set(`${action.actionClass}:${action.actionId}`, action);
  });

  return {
    getAction(actionClass, actionId) {
      const action = actions.get(`${actionClass}:${actionId}`);

      if (!action) {
        throw createAiOpsError(
          'UNSUPPORTED_ACTION',
          `Unsupported action: ${actionClass}/${actionId}`,
          404
        );
      }

      return action;
    }
  };
}

module.exports = {
  createActionRegistry
};
