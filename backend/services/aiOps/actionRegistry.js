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
  const descriptors = [
    {
      actionClass: 'platform_action',
      actionId: 'acknowledge_alert',
      title: 'Acknowledge Alert',
      summary: 'Acknowledge an active alert event',
      riskLevel: 'low'
    },
    {
      actionClass: 'platform_action',
      actionId: 'create_incident_timeline_note',
      title: 'Create Incident Timeline Note',
      summary: 'Create a new incident timeline note',
      riskLevel: 'low'
    },
    {
      actionClass: 'platform_action',
      actionId: 'mute_alert_rule_temporarily',
      title: 'Mute Alert Rule Temporarily',
      summary: 'Temporarily mute an alert rule',
      riskLevel: 'low'
    }
  ];

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
    },
    listActions() {
      return descriptors.map(descriptor => ({ ...descriptor }));
    }
  };
}

module.exports = {
  createActionRegistry
};
