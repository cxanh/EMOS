const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const userService = require('../services/userService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// 鏉冮檺妫€鏌ヤ腑闂翠欢
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required'
      }
    });
  }
  next();
};

// 鑾峰彇鎵€鏈夌敤鎴凤紙浠呯鐞嗗憳锛?
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

// 鑾峰彇褰撳墠鐢ㄦ埛淇℃伅
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
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

    const { password, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    next(error);
  }
});

// 鑾峰彇鎸囧畾鐢ㄦ埛淇℃伅锛堜粎绠＄悊鍛橈級
router.get('/meta/roles', authenticateToken, (req, res) => {
  const roles = userService.getRoles();
  res.json({
    success: true,
    data: roles.map(role => ({
      value: role,
      label: role.charAt(0).toUpperCase() + role.slice(1)
    }))
  });
});

router.get('/:userId', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await userService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    const { password, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    next(error);
  }
});

// 鍒涘缓鐢ㄦ埛锛堜粎绠＄悊鍛橈級
router.post('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { username, password, role, email, fullName } = req.body;

    // 楠岃瘉蹇呭～瀛楁
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Username and password are required'
        }
      });
    }

    // 楠岃瘉鐢ㄦ埛鍚嶆牸寮?
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USERNAME',
          message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
        }
      });
    }

    // 楠岃瘉瀵嗙爜寮哄害
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 6 characters long'
        }
      });
    }

    // 楠岃瘉瑙掕壊
    const validRoles = userService.getRoles();
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ROLE',
          message: `Role must be one of: ${validRoles.join(', ')}`
        }
      });
    }

    // 楠岃瘉閭鏍煎紡
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Invalid email format'
        }
      });
    }

    // 鍔犲瘑瀵嗙爜
    const hashedPassword = await bcrypt.hash(password, 10);

    // 鍒涘缓鐢ㄦ埛
    const user = await userService.createUser({
      username,
      password: hashedPassword,
      role,
      email,
      fullName
    });

    logger.info(`User created by admin: ${username}`);

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
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

// 鏇存柊鐢ㄦ埛淇℃伅
router.put('/:userId', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { username, role, email, fullName, status } = req.body;

    // 妫€鏌ユ潈闄愶細鍙湁绠＄悊鍛樻垨鐢ㄦ埛鏈汉鍙互鏇存柊
    if (req.user.role !== 'admin' && req.user.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update your own profile'
        }
      });
    }

    // 闈炵鐞嗗憳涓嶈兘淇敼瑙掕壊鍜岀姸鎬?
    if (req.user.role !== 'admin' && (role || status)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can change role and status'
        }
      });
    }

    const updates = {};
    if (username) updates.username = username;
    if (role) updates.role = role;
    if (email !== undefined) updates.email = email;
    if (fullName) updates.fullName = fullName;
    if (status) updates.status = status;

    // 楠岃瘉鐢ㄦ埛鍚嶆牸寮?
    if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USERNAME',
          message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
        }
      });
    }

    // 楠岃瘉閭鏍煎紡
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Invalid email format'
        }
      });
    }

    const user = await userService.updateUser(userId, updates);

    logger.info(`User updated: ${user.username} (${userId})`);

    res.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: error.message
        }
      });
    }
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

// 鍒犻櫎鐢ㄦ埛锛堜粎绠＄悊鍛橈級
router.delete('/:userId', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;

    // 涓嶈兘鍒犻櫎鑷繁
    if (req.user.user_id === userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_SELF',
          message: 'You cannot delete your own account'
        }
      });
    }

    await userService.deleteUser(userId);

    logger.info(`User deleted by admin: ${userId}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: error.message
        }
      });
    }
    if (error.message === 'Cannot delete the last admin user') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'LAST_ADMIN',
          message: error.message
        }
      });
    }
    next(error);
  }
});

// 淇敼瀵嗙爜
router.post('/:userId/change-password', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { oldPassword, newPassword } = req.body;

    // 妫€鏌ユ潈闄愶細鍙湁绠＄悊鍛樻垨鐢ㄦ埛鏈汉鍙互淇敼瀵嗙爜
    if (req.user.role !== 'admin' && req.user.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only change your own password'
        }
      });
    }

    // 楠岃瘉蹇呭～瀛楁
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'New password is required'
        }
      });
    }

    // 闈炵鐞嗗憳蹇呴』鎻愪緵鏃у瘑鐮?
    if (req.user.role !== 'admin' && !oldPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Old password is required'
        }
      });
    }

    // 楠岃瘉鏂板瘑鐮佸己搴?
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'New password must be at least 6 characters long'
        }
      });
    }

    // 闈炵鐞嗗憳闇€瑕侀獙璇佹棫瀵嗙爜
    if (req.user.role !== 'admin') {
      const isValidOldPassword = await userService.verifyPassword(userId, oldPassword);
      if (!isValidOldPassword) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_OLD_PASSWORD',
            message: 'Current password is incorrect'
          }
        });
      }
    }

    // 鏇存柊瀵嗙爜
    await userService.updatePassword(userId, newPassword);

    logger.info(`Password changed for user: ${userId}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// 鑾峰彇瑙掕壊鍒楄〃
module.exports = router;

