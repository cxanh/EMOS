const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { authenticateToken, generateToken } = require('../middleware/auth');
const userService = require('../services/userService');
const logger = require('../utils/logger');

router.post('/register', async (req, res, next) => {
  try {
    const { username, password, email, fullName } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Username and password are required'
        }
      });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USERNAME',
          message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
        }
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 6 characters long'
        }
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Invalid email format'
        }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userService.createUser({
      username,
      password: hashedPassword,
      role: userService.ROLES.VIEWER,
      email,
      fullName
    });

    logger.info(`User self-registered: ${username}`);

    res.status(201).json({
      success: true,
      data: user,
      message: 'Account created successfully'
    });
  } catch (error) {
    if (error.message === 'Username already exists' || error.message === 'Email already exists') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: error.message
        }
      });
    }
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Username and password are required'
        }
      });
    }

    const user = await userService.getUserByUsername(username);

    if (!user) {
      logger.warn(`Login attempt with invalid username: ${username}`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        }
      });
    }

    if (user.status === 'disabled') {
      logger.warn(`Login attempt with disabled account: ${username}`);
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Your account has been disabled'
        }
      });
    }

    const isValidPassword = await userService.verifyPassword(user.id, password);

    if (!isValidPassword) {
      logger.warn(`Login attempt with invalid password for user: ${username}`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        }
      });
    }

    await userService.updateLastLogin(user.id);

    const token = generateToken({
      user_id: user.id,
      username: user.username,
      role: user.role
    });

    logger.info(`User logged in: ${username}`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          fullName: user.fullName
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res) => {
  logger.info('User logged out');
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NO_TOKEN',
        message: 'No token provided'
      }
    });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({
      success: true,
      data: {
        valid: true,
        user: decoded
      }
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    });
  }
});

router.post('/change-password', authenticateToken, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Old password and new password are required'
        }
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'New password must be at least 6 characters long'
        }
      });
    }

    const user = await userService.getUserById(req.user.user_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    const isValidOldPassword = await userService.verifyPassword(user.id, oldPassword);

    if (!isValidOldPassword) {
      logger.warn(`Failed password change attempt for user: ${user.username}`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_OLD_PASSWORD',
          message: 'Current password is incorrect'
        }
      });
    }

    await userService.updatePassword(user.id, newPassword);

    logger.info(`Password changed for user: ${user.username}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
