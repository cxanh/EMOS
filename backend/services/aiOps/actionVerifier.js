function createActionVerifier({
  alertService,
  incidentTimelineService,
  now = () => new Date().toISOString()
} = {}) {
  async function verifyAcknowledgeAlert({ request, dryRunResult }) {
    if (!alertService || typeof alertService.getEventById !== 'function') {
      return {
        status: 'pass',
        checks: []
      };
    }

    const resolvedParams =
      (dryRunResult && dryRunResult.resolvedParams) || request.resolvedParams;

    const event = await alertService.getEventById(
      resolvedParams.eventId
    );

    if (event && event.status === 'acknowledged') {
      return {
        status: 'pass',
        checks: [
          {
            name: 'alert_acknowledged',
            status: 'pass'
          }
        ]
      };
    }

    return {
      status: 'fail',
      checks: [
        {
          name: 'alert_acknowledged',
          status: 'fail'
        }
      ]
    };
  }

  async function verifyTimelineNote({ request, executionResult }) {
    if (
      !incidentTimelineService ||
      typeof incidentTimelineService.getNoteById !== 'function' ||
      typeof incidentTimelineService.listNotes !== 'function'
    ) {
      return {
        status: 'pass',
        checks: []
      };
    }

    const note = await incidentTimelineService.getNoteById(executionResult.noteId);
    const notes = await incidentTimelineService.listNotes(
      request.resolvedParams.incidentId
    );

    const matched = note && notes.some(item => item.noteId === executionResult.noteId);

    if (matched) {
      return {
        status: 'pass',
        checks: [
          {
            name: 'incident_timeline_note_created',
            status: 'pass'
          }
        ]
      };
    }

    return {
      status: 'fail',
      checks: [
        {
          name: 'incident_timeline_note_created',
          status: 'fail'
        }
      ]
    };
  }

  async function verifyMutedRule({ request }) {
    if (!alertService || typeof alertService.getRule !== 'function') {
      return {
        status: 'pass',
        checks: []
      };
    }

    const rule = await alertService.getRule(request.resolvedParams.ruleId);
    const mutedUntilTime = rule && Date.parse(rule.muted_until);
    const nowTime = Date.parse(now());
    const isMutedUntilValid =
      rule &&
      Number.isFinite(mutedUntilTime) &&
      mutedUntilTime > nowTime;
    const hasMutedBy = rule && Boolean(rule.muted_by);
    const hasMuteReason = rule && Boolean(rule.mute_reason);

    if (rule && isMutedUntilValid && hasMutedBy && hasMuteReason) {
      return {
        status: 'pass',
        checks: [
          {
            name: 'alert_rule_muted_temporarily',
            status: 'pass'
          }
        ]
      };
    }

    return {
      status: 'fail',
      checks: [
        {
          name: 'alert_rule_muted_temporarily',
          status: 'fail'
        }
      ]
    };
  }

  return {
    async verify(context) {
      if (context.request.actionId === 'acknowledge_alert') {
        return verifyAcknowledgeAlert(context);
      }

      if (context.request.actionId === 'create_incident_timeline_note') {
        return verifyTimelineNote(context);
      }

      if (context.request.actionId === 'mute_alert_rule_temporarily') {
        return verifyMutedRule(context);
      }

      return {
        status: 'pass',
        checks: []
      };
    }
  };
}

module.exports = {
  createActionVerifier
};
