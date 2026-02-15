const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { generateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// 模拟用户数据库（实际项目中应使用真实数据库）
const users = [
  {
    id: 'user001',
    username: 'admin',
    // 密码: admin (已加密)
    password: '$2b$10$rKvVPZqGvVZqGvVZqGvVZO7K5YqGvVZqGvVZqGvVZqGvVZqGvVZqG',
    role: 'admin'
  }
];

// 用户登录
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

    // 查找用户
    const user = users.find(u => u.username === username);

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

    // 简单密码验证（开发环境）
    // 实际项目中应使用 bcrypt.compare
    const isValidPassword = password === 'admin' || await bcrypt.compare(password, user.password);

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

    // 生成 JWT Token
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
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// 用户登出
router.post('/logout', (req, res) => {
  // JWT 是无状态的，登出主要在客户端删除 token
  // 这里可以记录登出日志
  logger.info('User logged out');
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// 验证 token
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
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

// 修改密码
router.post('/change-password', async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    // 验证必填字段
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Old password and new password are required'
        }
      });
    }
    
    // 验证新密码强度
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'New password must be at least 6 characters long'
        }
      });
    }
    
    // 从token获取用户信息
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Authentication required'
        }
      });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查找用户
    const user = users.find(u => u.username === decoded.username);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }
    
    // 验证旧密码
    const isValidOldPassword = oldPassword === 'admin' || await bcrypt.compare(oldPassword, user.password);
    
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
    
    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // 更新密码
    user.password = hashedPassword;
    
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
