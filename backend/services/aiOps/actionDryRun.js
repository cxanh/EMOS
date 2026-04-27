function createActionDryRun({ actionRegistry, actionPolicy }) {
  return {
    async run({ actor, request }) {
      const action = actionRegistry.getAction(request.actionClass, request.actionId);
      const resolvedParams = action.resolveParams(request, { actor });
      const policyResult = await actionPolicy.evaluate({
        actor,
        request,
        resolvedParams
      });
      const actionWarnings =
        typeof action.buildWarnings === 'function'
          ? action.buildWarnings({
              actor,
              request,
              resolvedParams
            })
          : [];

      return {
        allowed: policyResult.allowed,
        riskLevel: action.riskLevel,
        warnings: [...policyResult.warnings, ...actionWarnings],
        impact: action.buildImpact({
          request,
          resolvedParams
        }),
        resolvedParams
      };
    }
  };
}

module.exports = {
  createActionDryRun
};
