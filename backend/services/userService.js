const redisClient = require('../config/redis');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

class UserService {
  constructor() {
    this.USERS_KEY = 'users';
    this.USER_PREFIX = 'user:';
    this.ROLES = {
      ADMIN: 'admin',
      OPERATOR: 'operator',
      VIEWER: 'viewer'
    };
  }

  // 初始化默认管理员账户
  async initializeDefaultAdmin() {
    try {
      const adminExists = await this.getUserByUsername('admin');
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin', 10);
        await this.createUser({
          username: 'admin',
          password: hashedPassword,
          role: this.ROLES.ADMIN,
          email: 'admin@example.com',
          fullName: 'System Administrator'
        });
        logger.info('Default admin user created');
      }
    } catch (error) {
      logger.error('Error initializing default admin:', error);
    }
  }

  // 创建用户
  async createUser(userData) {
    try {
      const { username, password, role, email, fullName } = userData;

      // 检查用户名是否已存在
      const existingUser = await this.getUserByUsername(username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // 检查邮箱是否已存在
      if (email) {
        const existingEmail = await this.getUserByEmail(email);
        if (existingEmail) {
          throw new Error('Email already exists');
        }
      }

      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const user = {
        id: userId,
        username,
        password, // 应该已经加密
        role: role || this.ROLES.VIEWER,
        email: email || '',
        fullName: fullName || username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: null,
        status: 'active' // active, disabled
      };

      // 保存用户信息
      await redisClient.client.hSet(
        `${this.USER_PREFIX}${userId}`,
        Object.entries(user).reduce((acc, [key, value]) => {
          acc[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
          return acc;
        }, {})
      );

      // 添加到用户列表
      await redisClient.client.sAdd(this.USERS_KEY, userId);

      // 创建用户名到ID的映射
      await redisClient.client.set(`username:${username}`, userId);

      // 创建邮箱到ID的映射
      if (email) {
        await redisClient.client.set(`email:${email}`, userId);
      }

      logger.info(`User created: ${username} (${userId})`);

      // 返回用户信息（不包含密码）
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  // 获取用户（通过ID）
  async getUserById(userId) {
    try {
      const userData = await redisClient.client.hGetAll(`${this.USER_PREFIX}${userId}`);
      
      if (!userData || Object.keys(userData).length === 0) {
        return null;
      }

      return this.parseUserData(userData);
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      return null;
    }
  }

  // 获取用户（通过用户名）
  async getUserByUsername(username) {
    try {
      const userId = await redisClient.client.get(`username:${username}`);
      if (!userId) {
        return null;
      }
      return await this.getUserById(userId);
    } catch (error) {
      logger.error('Error getting user by username:', error);
      return null;
    }
  }

  // 获取用户（通过邮箱）
  async getUserByEmail(email) {
    try {
      const userId = await redisClient.client.get(`email:${email}`);
      if (!userId) {
        return null;
      }
      return await this.getUserById(userId);
    } catch (error) {
      logger.error('Error getting user by email:', error);
      return null;
    }
  }

  // 获取所有用户
  async getAllUsers() {
    try {
      const userIds = await redisClient.client.sMembers(this.USERS_KEY);
      const users = [];

      for (const userId of userIds) {
        const user = await this.getUserById(userId);
        if (user) {
          // 不返回密码
          const { password, ...userWithoutPassword } = user;
          users.push(userWithoutPassword);
        }
      }

      return users;
    } catch (error) {
      logger.error('Error getting all users:', error);
      return [];
    }
  }

  // 更新用户
  async updateUser(userId, updates) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // 如果更新用户名，检查是否已存在
      if (updates.username && updates.username !== user.username) {
        const existingUser = await this.getUserByUsername(updates.username);
        if (existingUser) {
          throw new Error('Username already exists');
        }
        // 更新用户名映射
        await redisClient.client.del(`username:${user.username}`);
        await redisClient.client.set(`username:${updates.username}`, userId);
      }

      // 如果更新邮箱，检查是否已存在
      if (updates.email && updates.email !== user.email) {
        const existingEmail = await this.getUserByEmail(updates.email);
        if (existingEmail) {
          throw new Error('Email already exists');
        }
        // 更新邮箱映射
        if (user.email) {
          await redisClient.client.del(`email:${user.email}`);
        }
        await redisClient.client.set(`email:${updates.email}`, userId);
      }

      const updatedUser = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // 保存更新后的用户信息
      await redisClient.client.hSet(
        `${this.USER_PREFIX}${userId}`,
        Object.entries(updatedUser).reduce((acc, [key, value]) => {
          acc[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
          return acc;
        }, {})
      );

      logger.info(`User updated: ${updatedUser.username} (${userId})`);

      const { password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  // 删除用户
  async deleteUser(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // 不允许删除最后一个管理员
      if (user.role === this.ROLES.ADMIN) {
        const allUsers = await this.getAllUsers();
        const adminCount = allUsers.filter(u => u.role === this.ROLES.ADMIN).length;
        if (adminCount <= 1) {
          throw new Error('Cannot delete the last admin user');
        }
      }

      // 删除用户数据
      await redisClient.client.del(`${this.USER_PREFIX}${userId}`);
      
      // 从用户列表中移除
      await redisClient.client.sRem(this.USERS_KEY, userId);
      
      // 删除用户名映射
      await redisClient.client.del(`username:${user.username}`);
      
      // 删除邮箱映射
      if (user.email) {
        await redisClient.client.del(`email:${user.email}`);
      }

      logger.info(`User deleted: ${user.username} (${userId})`);

      return true;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  // 更新密码
  async updatePassword(userId, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await redisClient.client.hSet(`${this.USER_PREFIX}${userId}`, 'password', hashedPassword);
      await redisClient.client.hSet(`${this.USER_PREFIX}${userId}`, 'updatedAt', new Date().toISOString());
      
      logger.info(`Password updated for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error updating password:', error);
      throw error;
    }
  }

  // 验证密码
  async verifyPassword(userId, password) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return false;
      }

      // 开发环境简单验证
      const allowDevAdminBypass =
        process.env.NODE_ENV === 'development' &&
        process.env.ALLOW_DEFAULT_ADMIN_PASSWORD === 'true';

      if (allowDevAdminBypass && password === 'admin' && user.username === 'admin') {
        return true;
      }

      return await bcrypt.compare(password, user.password);
    } catch (error) {
      logger.error('Error verifying password:', error);
      return false;
    }
  }

  // 更新最后登录时间
  async updateLastLogin(userId) {
    try {
      await redisClient.client.hSet(
        `${this.USER_PREFIX}${userId}`,
        'lastLogin',
        new Date().toISOString()
      );
    } catch (error) {
      logger.error('Error updating last login:', error);
    }
  }

  // 禁用/启用用户
  async setUserStatus(userId, status) {
    try {
      await redisClient.client.hSet(`${this.USER_PREFIX}${userId}`, 'status', status);
      await redisClient.client.hSet(`${this.USER_PREFIX}${userId}`, 'updatedAt', new Date().toISOString());
      
      logger.info(`User status updated: ${userId} -> ${status}`);
      return true;
    } catch (error) {
      logger.error('Error setting user status:', error);
      throw error;
    }
  }

  // 解析用户数据
  parseUserData(userData) {
    return {
      id: userData.id,
      username: userData.username,
      password: userData.password,
      role: userData.role,
      email: userData.email || '',
      fullName: userData.fullName || userData.username,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      lastLogin: userData.lastLogin === 'null' ? null : userData.lastLogin,
      status: userData.status || 'active'
    };
  }

  // 获取角色列表
  getRoles() {
    return Object.values(this.ROLES);
  }
}

module.exports = new UserService();
