const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const logger = require('../utils/logger');

// Get AI service status
router.get('/status', async (req, res, next) => {
  try {
    const status = aiService.getStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
});

// Analyze system health
router.post('/analyze/health', async (req, res, next) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'AI_SERVICE_DISABLED',
          message: 'AI service is not enabled. Please configure LLM_PROVIDER and API keys.'
        }
      });
    }

    logger.info('Starting system health analysis');
    const result = await aiService.analyzeSystemHealth();

    if (result.success) {
      logger.info('System health analysis completed');
      res.json(result);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    logger.error('Error in health analysis:', error);
    next(error);
  }
});

// Analyze performance trend
router.post('/analyze/trend', async (req, res, next) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'AI_SERVICE_DISABLED',
          message: 'AI service is not enabled'
        }
      });
    }

    const { nodeId, timeRange } = req.body;

    if (!nodeId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'nodeId is required'
        }
      });
    }

    logger.info(`Starting trend analysis for node ${nodeId}`);
    const result = await aiService.analyzeTrend(nodeId, timeRange || '24h');

    if (result.success) {
      logger.info('Trend analysis completed');
      res.json(result);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    logger.error('Error in trend analysis:', error);
    next(error);
  }
});

// Get optimization recommendations
router.post('/analyze/recommendations', async (req, res, next) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'AI_SERVICE_DISABLED',
          message: 'AI service is not enabled'
        }
      });
    }

    logger.info('Getting optimization recommendations');
    const result = await aiService.getRecommendations();

    if (result.success) {
      logger.info('Recommendations generated');
      res.json(result);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    next(error);
  }
});

// Follow-up question on analysis
router.post('/analyze/follow-up', async (req, res, next) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'AI_SERVICE_DISABLED',
          message: 'AI service is not enabled'
        }
      });
    }

    const { question, contextSummary, analysisType } = req.body;

    if (!question || !contextSummary || !analysisType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'question, contextSummary and analysisType are required'
        }
      });
    }

    logger.info(`Starting follow-up analysis for type ${analysisType}`);
    const result = await aiService.analyzeFollowUp(question, contextSummary, analysisType);

    if (result.success) {
      logger.info('Follow-up analysis completed');
      res.json(result);
    } else {
      throw new Error(result.error || 'Failed to analyze follow-up');
    }
  } catch (error) {
    logger.error('Error in follow-up analysis:', error);
    next(error);
  }
});

// Homepage quick overview question
router.post('/analyze/overview-question', async (req, res, next) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'AI_SERVICE_DISABLED',
          message: 'AI service is not enabled'
        }
      });
    }

    const { question, contextType, clientHints } = req.body;

    if (!question || contextType !== 'system-overview') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'question is required and contextType must be system-overview'
        }
      });
    }

    logger.info('Starting overview question analysis');
    const result = await aiService.analyzeOverviewQuestion({
      question,
      contextType,
      clientHints
    });

    if (result.success) {
      logger.info('Overview question analysis completed');
      res.json(result);
    } else {
      throw new Error(result.error || 'Failed to analyze overview question');
    }
  } catch (error) {
    logger.error('Error in overview question analysis:', error);
    next(error);
  }
});

module.exports = router;
