const express = require('express');

const logger = require('../utils/logger');
const { createSkillCatalogService } = require('../services/skillCatalogService');

function createSkillCatalogRouter({
  authenticateRequest = (req, res, next) => next(),
  skillCatalogService = createSkillCatalogService()
} = {}) {
  const router = express.Router();

  router.use(authenticateRequest);

  router.get('/catalog', async (req, res, next) => {
    try {
      const result = await skillCatalogService.getCatalog();
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to get skill catalog:', error);
      next(error);
    }
  });

  return router;
}

module.exports = {
  createSkillCatalogRouter
};
