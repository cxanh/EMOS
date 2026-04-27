const crypto = require('crypto');
const logger = require('../utils/logger');

function safeCompare(a, b) {
  const aBuffer = Buffer.from(String(a || ''), 'utf8');
  const bBuffer = Buffer.from(String(b || ''), 'utf8');

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function extractAgentToken(req) {
  const headers = req.headers || {};
  const headerToken = headers['x-agent-token'];
  if (headerToken) {
    return String(headerToken).trim();
  }

  const authHeader = headers['authorization'];
  if (!authHeader) {
    return '';
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme && scheme.toLowerCase() === 'bearer' && token) {
    return token.trim();
  }

  return '';
}

function authenticateAgentToken(req, res, next) {
  const configuredToken = String(process.env.AGENT_API_TOKEN || '').trim();
  if (!configuredToken) {
    const allowInsecureAgent =
      process.env.NODE_ENV === 'development' ||
      String(process.env.ALLOW_INSECURE_AGENT || '').trim() === 'true';

    if (allowInsecureAgent) {
      logger.warn('AGENT_API_TOKEN is not configured, allowing agent request in development mode');
      return next();
    }

    logger.error('AGENT_API_TOKEN is not configured, rejecting agent request');
    return res.status(503).json({
      success: false,
      error: {
        code: 'AGENT_AUTH_NOT_CONFIGURED',
        message: 'Agent authentication is not configured on server'
      }
    });
  }

  const providedToken = extractAgentToken(req);
  if (!providedToken) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NO_AGENT_TOKEN',
        message: 'Agent token is required'
      }
    });
  }

  if (!safeCompare(providedToken, configuredToken)) {
    logger.warn('Invalid agent token attempt', {
      ip: req.ip,
      route: req.originalUrl
    });
    return res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_AGENT_TOKEN',
        message: 'Invalid agent token'
      }
    });
  }

  return next();
}

module.exports = {
  authenticateAgentToken,
  extractAgentToken
};
