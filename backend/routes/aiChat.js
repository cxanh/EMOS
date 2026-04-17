const express = require('express');

const logger = require('../utils/logger');
const alertService = require('../services/alertService');
const redisClient = require('../config/redis');
const { createAiChatStore } = require('../services/aiChat/aiChatStore');
const { createAiContextService } = require('../services/aiChat/aiContextService');
const { createAiChatService } = require('../services/aiChat/aiChatService');
const { createAiChatSessionPolicy } = require('../services/aiChat/aiChatSessionPolicy');
const { createActionRegistry } = require('../services/aiOps/actionRegistry');
const { createActionPolicy } = require('../services/aiOps/actionPolicy');
const {
  createIncidentTimelineService
} = require('../services/aiOps/incidentTimelineService');

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

  return {
    id: actorId,
    role: actorRole,
    ...(actorUsername ? { username: actorUsername } : {})
  };
}

function createValidationError(message) {
  const error = new Error(message);
  error.code = 'INVALID_CHAT_REQUEST';
  error.statusCode = 400;
  return error;
}

function validateAllowedFields(payload, allowedFields) {
  const unknownFields = Object.keys(payload).filter(field => !allowedFields.includes(field));
  if (unknownFields.length > 0) {
    throw createValidationError(`Unsupported fields: ${unknownFields.join(', ')}`);
  }
}

function validateCreateSessionPayload(payload, sessionPolicy) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createValidationError('Request body must be an object');
  }

  validateAllowedFields(payload, ['nodeId', 'incidentId', 'timeRange', 'question']);

  if (typeof payload.question !== 'string' || !payload.question.trim()) {
    throw createValidationError('question is required');
  }

  if (!sessionPolicy.isAllowedTimeRange(payload.timeRange)) {
    throw createValidationError('timeRange must be one of 24h, 7d, 30d');
  }
}

function validateFollowUpPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createValidationError('Request body must be an object');
  }

  validateAllowedFields(payload, ['question']);

  if (typeof payload.question !== 'string' || !payload.question.trim()) {
    throw createValidationError('question is required');
  }
}

function createDefaultAiChatService({ sessionPolicy }) {
  const incidentTimelineService = createIncidentTimelineService();

  return createAiChatService({
    aiChatStore: createAiChatStore({
      redisClient: () => redisClient.client,
      sessionPolicy
    }),
    aiContextService: createAiContextService(),
    actionRegistry: createActionRegistry({
      alertService,
      incidentTimelineService
    }),
    actionPolicy: createActionPolicy()
  });
}

function createAiChatRouter({
  authenticateRequest = (req, res, next) => next(),
  sessionPolicy = createAiChatSessionPolicy(),
  aiChatService = createDefaultAiChatService({ sessionPolicy })
} = {}) {
  const router = express.Router();

  router.use(authenticateRequest);

  router.post('/sessions', async (req, res, next) => {
    try {
      validateCreateSessionPayload(req.body, sessionPolicy);
      const result = await aiChatService.createSession({
        actor: getActor(req),
        input: req.body
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to create AI chat session:', error);
      next(error);
    }
  });

  router.get('/sessions', async (req, res, next) => {
    try {
      const result = await aiChatService.listSessions({
        actor: getActor(req)
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to list AI chat sessions:', error);
      next(error);
    }
  });

  router.get('/sessions/:sessionId', async (req, res, next) => {
    try {
      const result = await aiChatService.getSession({
        actor: getActor(req),
        sessionId: req.params.sessionId
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to get AI chat session:', error);
      next(error);
    }
  });

  router.get('/sessions/:sessionId/messages', async (req, res, next) => {
    try {
      const result = await aiChatService.getMessages({
        actor: getActor(req),
        sessionId: req.params.sessionId
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to get AI chat messages:', error);
      next(error);
    }
  });

  router.post('/sessions/:sessionId/messages', async (req, res, next) => {
    try {
      validateFollowUpPayload(req.body);
      const result = await aiChatService.postMessage({
        actor: getActor(req),
        sessionId: req.params.sessionId,
        question: req.body.question
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to post AI chat message:', error);
      next(error);
    }
  });

  return router;
}

module.exports = {
  createAiChatRouter
};
