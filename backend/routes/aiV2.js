const express = require('express');

const alertService = require('../services/alertService');
const redisClient = require('../config/redis');
const logger = require('../utils/logger');
const { createActionRegistry } = require('../services/aiOps/actionRegistry');
const { createActionPolicy } = require('../services/aiOps/actionPolicy');
const { createActionDryRun } = require('../services/aiOps/actionDryRun');
const { createActionExecutor } = require('../services/aiOps/actionExecutor');
const { createActionVerifier } = require('../services/aiOps/actionVerifier');
const { createActionAudit } = require('../services/aiOps/actionAudit');
const { createActionRequestStore } = require('../services/aiOps/actionRequestStore');
const { createAiOpsOrchestrator } = require('../services/aiOps/aiOpsOrchestrator');
const {
  createIncidentTimelineService
} = require('../services/aiOps/incidentTimelineService');

function createDefaultOrchestrator() {
  const incidentTimelineService = createIncidentTimelineService();
  const actionPolicy = createActionPolicy();
  const actionRegistry = createActionRegistry({
    alertService,
    incidentTimelineService
  });

  return createAiOpsOrchestrator({
    actionRegistry,
    actionPolicy,
    actionDryRun: createActionDryRun({
      actionRegistry,
      actionPolicy
    }),
    actionExecutor: createActionExecutor({
      actionRegistry
    }),
    actionVerifier: createActionVerifier({
      alertService,
      incidentTimelineService
    }),
    actionAudit: createActionAudit({
      redisClient: () => redisClient.client
    }),
    actionRequestStore: createActionRequestStore({
      redisClient: () => redisClient.client
    })
  });
}

function getActor(req) {
  const user = req.user || {};
  const actorId = user.id || user.user_id;
  const actorRole = user.role;
  const actorUsername = user.username || user.name || '';

  if (!actorId || !actorRole) {
    const error = new Error('Authenticated user is required');
    error.code = 'UNAUTHENTICATED';
    error.statusCode = 401;
    throw error;
  }

  const actor = {
    id: actorId,
    role: actorRole
  };

  if (actorUsername) {
    actor.username = actorUsername;
  }

  return actor;
}

function createAiV2Router({
  orchestrator = createDefaultOrchestrator(),
  authenticateRequest = (req, res, next) => next()
} = {}) {
  const router = express.Router();

  router.use(authenticateRequest);

  router.post('/action-requests', async (req, res, next) => {
    try {
      const actor = getActor(req);
      const result = await orchestrator.createActionRequest({
        actor,
        input: req.body
      });

      res.status(result.reused ? 200 : 201).json({
        success: true,
        data: {
          requestId: result.requestId,
          status: result.status,
          dryRun: result.dryRunResult
        }
      });
    } catch (error) {
      logger.error('Failed to create AI Ops action request:', error);
      next(error);
    }
  });

  router.post('/action-requests/:requestId/confirm', async (req, res, next) => {
    try {
      if (req.body && req.body.confirm !== true) {
        const error = new Error('confirm=true is required');
        error.code = 'INVALID_CONFIRM_REQUEST';
        error.statusCode = 400;
        throw error;
      }

      const actor = getActor(req);
      const result = await orchestrator.confirmActionRequest({
        actor,
        requestId: req.params.requestId
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to confirm AI Ops action request:', error);
      next(error);
    }
  });

  router.get('/action-requests/:requestId', async (req, res, next) => {
    try {
      const result = await orchestrator.getActionRequest(req.params.requestId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to get AI Ops action request:', error);
      next(error);
    }
  });

  router.get('/action-requests/:requestId/timeline', async (req, res, next) => {
    try {
      const events = await orchestrator.getTimeline(req.params.requestId);

      res.json({
        success: true,
        data: {
          requestId: req.params.requestId,
          events
        }
      });
    } catch (error) {
      logger.error('Failed to get AI Ops action request timeline:', error);
      next(error);
    }
  });

  return router;
}

module.exports = {
  createAiV2Router
};
