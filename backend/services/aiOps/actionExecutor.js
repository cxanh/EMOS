const { createAiOpsError } = require('./errors');

function createActionExecutor({ actionRegistry }) {
  return {
    async execute({ actor, request, dryRunResult, traceId }) {
      if (!dryRunResult || !dryRunResult.allowed) {
        throw createAiOpsError(
          'ACTION_NOT_ALLOWED',
          'Action cannot be executed because dry-run did not allow it',
          403
        );
      }

      const action = actionRegistry.getAction(request.actionClass, request.actionId);

      return action.execute({
        actor,
        request,
        traceId,
        resolvedParams: dryRunResult.resolvedParams
      });
    }
  };
}

module.exports = {
  createActionExecutor
};
