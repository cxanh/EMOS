function createActionPolicy({
  canAccessIncident = async () => true,
  canOperateRule = async () => true
} = {}) {
  return {
    canAccessIncident,
    canOperateRule,
    async evaluate({ actor, resolvedParams }) {
      const warnings = [];
      let allowed = ['admin', 'operator'].includes(actor.role);

      if (!allowed) {
        warnings.push('Actor role is not allowed to execute AI Ops actions');
      }

      if (resolvedParams.incidentId) {
        const incidentAllowed = await canAccessIncident({
          actor,
          incidentId: resolvedParams.incidentId
        });

        if (!incidentAllowed) {
          allowed = false;
          warnings.push('Actor cannot access the incident');
        }
      }

      if (resolvedParams.ruleId) {
        const ruleAllowed = await canOperateRule({
          actor,
          ruleId: resolvedParams.ruleId
        });

        if (!ruleAllowed) {
          allowed = false;
          warnings.push('Actor cannot operate the rule');
        }
      }

      return {
        allowed,
        warnings
      };
    }
  };
}

module.exports = {
  createActionPolicy
};
