const { createAiOpsError } = require('./errors');

function createLifecycleEvent({
  actor,
  request,
  eventType,
  statusFrom,
  statusTo,
  timestamp,
  dryRunResult,
  resolvedParams,
  error
}) {
  return {
    requestId: request.requestId,
    traceId: request.traceId,
    eventType,
    timestamp,
    actorType: 'user',
    actorId: actor.id,
    actorRole: actor.role,
    actionClass: request.actionClass,
    actionId: request.actionId,
    incidentId:
      (resolvedParams && resolvedParams.incidentId) || request.incidentId || '',
    statusFrom,
    statusTo,
    riskLevel: dryRunResult ? dryRunResult.riskLevel : '',
    dryRunResult: dryRunResult || null,
    resolvedParams: resolvedParams || null,
    error: error || null
  };
}

function createAiOpsOrchestrator({
  actionDryRun,
  actionExecutor,
  actionVerifier,
  actionAudit,
  actionRequestStore,
  idFactory = () => `actreq_${Date.now()}`,
  traceIdFactory = () => `trace_${Date.now()}`,
  now = () => new Date().toISOString()
}) {
  async function recordEvent({ actor, request, event }) {
    await actionRequestStore.appendTimelineEvent(request.requestId, event);
    await actionAudit.record(event);
  }

  function ensureActor(actor) {
    if (!actor || !actor.id || !actor.role) {
      throw createAiOpsError(
        'UNAUTHENTICATED',
        'Authenticated actor is required',
        401
      );
    }
  }

  function buildStoredRequest({ actor, input }) {
    const timestamp = now();

    return {
      requestId: idFactory(),
      traceId: traceIdFactory(),
      actionClass: input.actionClass,
      actionId: input.actionId,
      idempotencyKey: input.idempotencyKey,
      status: 'REQUESTED',
      params: input.params || {},
      incidentId: input.incidentId || '',
      actorId: actor.id,
      actorRole: actor.role,
      dryRunResult: null,
      resolvedParams: null,
      executionResult: null,
      verificationResult: null,
      error: null,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  return {
    async createActionRequest({ actor, input }) {
      ensureActor(actor);

      if (!input || !input.actionClass || !input.actionId || !input.idempotencyKey) {
        throw createAiOpsError(
          'INVALID_ACTION_REQUEST',
          'actionClass, actionId, and idempotencyKey are required',
          400
        );
      }

      const existing = await actionRequestStore.getRequestByIdempotencyKey(
        input.idempotencyKey
      );

      if (existing) {
        return {
          ...existing,
          reused: true
        };
      }

      const request = buildStoredRequest({ actor, input });
      await actionRequestStore.createRequest(request);

      await recordEvent({
        actor,
        request,
        event: createLifecycleEvent({
          actor,
          request,
          eventType: 'ACTION_REQUESTED',
          statusFrom: '',
          statusTo: 'REQUESTED',
          timestamp: now()
        })
      });

      const dryRunResult = await actionDryRun.run({
        actor,
        request: input
      });

      const updatedRequest = await actionRequestStore.updateRequest(request.requestId, {
        status: 'DRY_RUN_READY',
        dryRunResult,
        resolvedParams: dryRunResult.resolvedParams
      });

      await recordEvent({
        actor,
        request: updatedRequest,
        event: createLifecycleEvent({
          actor,
          request: updatedRequest,
          eventType: 'ACTION_DRY_RUN_COMPLETED',
          statusFrom: 'REQUESTED',
          statusTo: 'DRY_RUN_READY',
          timestamp: now(),
          dryRunResult,
          resolvedParams: dryRunResult.resolvedParams
        })
      });

      return updatedRequest;
    },
    async confirmActionRequest({ actor, requestId }) {
      ensureActor(actor);

      let request = await actionRequestStore.getRequest(requestId);

      if (!request) {
        throw createAiOpsError('ACTION_REQUEST_NOT_FOUND', 'Request not found', 404);
      }

      if (request.status !== 'DRY_RUN_READY') {
        throw createAiOpsError(
          'ACTION_REQUEST_NOT_CONFIRMABLE',
          `Request cannot be confirmed from status ${request.status}`,
          409
        );
      }

      request = await actionRequestStore.updateRequest(requestId, {
        status: 'CONFIRMED'
      });

      await recordEvent({
        actor,
        request,
        event: createLifecycleEvent({
          actor,
          request,
          eventType: 'ACTION_CONFIRMED',
          statusFrom: 'DRY_RUN_READY',
          statusTo: 'CONFIRMED',
          timestamp: now(),
          dryRunResult: request.dryRunResult,
          resolvedParams: request.resolvedParams
        })
      });

      request = await actionRequestStore.updateRequest(requestId, {
        status: 'EXECUTING'
      });

      await recordEvent({
        actor,
        request,
        event: createLifecycleEvent({
          actor,
          request,
          eventType: 'ACTION_EXECUTION_STARTED',
          statusFrom: 'CONFIRMED',
          statusTo: 'EXECUTING',
          timestamp: now(),
          dryRunResult: request.dryRunResult,
          resolvedParams: request.resolvedParams
        })
      });

      const response = {
        requestId,
        status: 'EXECUTING'
      };

      try {
        const executionResult = await actionExecutor.execute({
          actor,
          request,
          dryRunResult: request.dryRunResult,
          traceId: request.traceId
        });

        request = await actionRequestStore.updateRequest(requestId, {
          status: 'VERIFYING',
          executionResult
        });

        await recordEvent({
          actor,
          request,
          event: createLifecycleEvent({
            actor,
            request,
            eventType: 'ACTION_EXECUTION_COMPLETED',
            statusFrom: 'EXECUTING',
            statusTo: 'VERIFYING',
            timestamp: now(),
            dryRunResult: request.dryRunResult,
            resolvedParams: request.resolvedParams
          })
        });

        const verificationResult = await actionVerifier.verify({
          actor,
          request,
          executionResult
        });

        await recordEvent({
          actor,
          request,
          event: createLifecycleEvent({
            actor,
            request,
            eventType: 'ACTION_VERIFICATION_COMPLETED',
            statusFrom: 'VERIFYING',
            statusTo: 'VERIFYING',
            timestamp: now(),
            dryRunResult: request.dryRunResult,
            resolvedParams: request.resolvedParams
          })
        });

        const finalStatus =
          verificationResult && verificationResult.status === 'pass'
            ? 'SUCCEEDED'
            : 'FAILED';

        request = await actionRequestStore.updateRequest(requestId, {
          status: finalStatus,
          verificationResult
        });

        await recordEvent({
          actor,
          request,
          event: createLifecycleEvent({
            actor,
            request,
            eventType: 'ACTION_COMPLETED',
            statusFrom: 'VERIFYING',
            statusTo: finalStatus,
            timestamp: now(),
            dryRunResult: request.dryRunResult,
            resolvedParams: request.resolvedParams
          })
        });
      } catch (error) {
        request = await actionRequestStore.updateRequest(requestId, {
          status: 'FAILED',
          error: {
            code: error.code || 'ACTION_EXECUTION_FAILED',
            message: error.message
          }
        });

        await recordEvent({
          actor,
          request,
          event: createLifecycleEvent({
            actor,
            request,
            eventType: 'ACTION_COMPLETED',
            statusFrom: request.status,
            statusTo: 'FAILED',
            timestamp: now(),
            dryRunResult: request.dryRunResult,
            resolvedParams: request.resolvedParams,
            error: {
              code: error.code || 'ACTION_EXECUTION_FAILED',
              message: error.message
            }
          })
        });

        throw error;
      }

      return response;
    },
    async getActionRequest(requestId) {
      const request = await actionRequestStore.getRequest(requestId);

      if (!request) {
        throw createAiOpsError('ACTION_REQUEST_NOT_FOUND', 'Request not found', 404);
      }

      return request;
    },
    async getTimeline(requestId) {
      const request = await actionRequestStore.getRequest(requestId);

      if (!request) {
        throw createAiOpsError('ACTION_REQUEST_NOT_FOUND', 'Request not found', 404);
      }

      return actionRequestStore.getTimeline(requestId);
    }
  };
}

module.exports = {
  createAiOpsOrchestrator
};
