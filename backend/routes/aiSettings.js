const express = require('express');

const logger = require('../utils/logger');
const { createAiSettingsStore } = require('../services/aiSettingsStore');
const { createAiSettingsService } = require('../services/aiSettingsService');

function createAiSettingsRouter({
  redisClient,
  authenticateRequest = (req, res, next) => next(),
  aiSettingsService = createAiSettingsService({
    store: createAiSettingsStore({
      redisClient
    })
  })
} = {}) {
  const router = express.Router();

  router.use(authenticateRequest);

  router.get('/', async (req, res, next) => {
    try {
      const settings = await aiSettingsService.getSettingsForUser(req.user);
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Failed to get AI settings:', error);
      next(error);
    }
  });

  router.put('/system', async (req, res, next) => {
    try {
      const settings = await aiSettingsService.updateSystemSettings(req.user, req.body);
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Failed to update system AI settings:', error);
      next(error);
    }
  });

  router.put('/user', async (req, res, next) => {
    try {
      const settings = await aiSettingsService.updateUserSettings(req.user, req.body);
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Failed to update user AI settings:', error);
      next(error);
    }
  });

  return router;
}

module.exports = {
  createAiSettingsRouter
};
