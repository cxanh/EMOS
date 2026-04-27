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

  // Redis compatibility helper for old servers without HSET map support
  async setHashFields(key, data) {
    for (const [field, value] of Object.entries(data)) {
      const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await redisClient.client.hSet(key, field, serialized);
    }
  }

  // 闁告帗绻傞～鎰板礌閺嶎厾甯涢悹浣靛€楅鎼佹偠閸℃鍠呴悹鎰堕檮閸?
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

  // 闁告帗绋戠紓鎾绘偨閵婏箑鐓?
  async createUser(userData) {
    try {
      const { username, password, role, email, fullName } = userData;

      // 婵☆偀鍋撻柡灞诲劤閺併倝骞嬪畡鐗堝€抽柡鍕靛灠閹礁顔忛幓鎺旀憼闁?
      const existingUser = await this.getUserByUsername(username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // 婵☆偀鍋撻柡灞诲劦閸嬫牜绮绘潏銊π﹂柛姘剧畱閸戯紕鈧稒锚濠€?
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
        password, // 閹煎瓨妫侀姘啅閼碱剛鐥呴柛鏃傚Т閻?
        role: role || this.ROLES.VIEWER,
        email: email || '',
        fullName: fullName || username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: null,
        status: 'active' // active, disabled
      };

      // 濞ｅ洦绻傞悺銊╂偨閵婏箑鐓曞ǎ鍥ｅ墲娴?
      await this.setHashFields(`${this.USER_PREFIX}${userId}`, user);

      // 婵烇綀顕ф慨鐐哄礆閹殿喗鏆忛柟鏉戝槻閸亞鎮?
      await redisClient.client.sAdd(this.USERS_KEY, userId);

      // 闁告帗绋戠紓鎾绘偨閵婏箑鐓曢柛姘Т閸╁瓥D闁汇劌瀚Σ褏浜?
      await redisClient.client.set(`username:${username}`, userId);

      // 闁告帗绋戠紓鎾绘焽椤旂虎鍞搁柛鎺旀D闁汇劌瀚Σ褏浜?
      if (email) {
        await redisClient.client.set(`email:${email}`, userId);
      }

      logger.info(`User created: ${username} (${userId})`);

      // 閺夆晜鏌ㄥú鏍偨閵婏箑鐓曞ǎ鍥ｅ墲娴煎懘鏁嶉崼婊呯憹闁告牕鎳庨幆鍫⑩偓闈涙閻栨粓鏁?
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  // 闁兼儳鍢茶ぐ鍥偨閵婏箑鐓曢柨娑樼墦閳ь剚淇虹换鍍咲闁?
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

  // 闁兼儳鍢茶ぐ鍥偨閵婏箑鐓曢柨娑樼墦閳ь剚淇虹换鍐偨閵婏箑鐓曢柛姘▌缁?
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

  // 闁兼儳鍢茶ぐ鍥偨閵婏箑鐓曢柨娑樼墦閳ь剚淇虹换鍐焽椤旂虎鍞搁柨?
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

  // 闁兼儳鍢茶ぐ鍥箥閳ь剟寮垫径灞炬殢闁?
  async getAllUsers() {
    try {
      const userIds = await redisClient.client.sMembers(this.USERS_KEY);
      const users = [];

      for (const userId of userIds) {
        const user = await this.getUserById(userId);
        if (user) {
          // 濞戞挸绉风换鎴﹀炊閻愯尙妲曢柣?
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

  // 闁哄洤鐡ㄩ弻濠囨偨閵婏箑鐓?
  async updateUser(userId, updates) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // 濠碘€冲€归悘澶愬即鐎涙ɑ鐓€闁活潿鍔嶉崺娑㈠触瀹ュ繒绀夋俊顐熷亾闁哄被鍎插Σ鎼佸触閿曗偓閸戯紕鈧稒锚濠€?
      if (updates.username && updates.username !== user.username) {
        const existingUser = await this.getUserByUsername(updates.username);
        if (existingUser) {
          throw new Error('Username already exists');
        }
        // 闁哄洤鐡ㄩ弻濠囨偨閵婏箑鐓曢柛姘У濡惭呬焊?
        await redisClient.client.del(`username:${user.username}`);
        await redisClient.client.set(`username:${updates.username}`, userId);
      }

      // 濠碘€冲€归悘澶愬即鐎涙ɑ鐓€闂侇収鍠氶鍫ユ晬鐏炵虎姊鹃柡灞诲劜濡叉悂宕ラ敃鈧崙锛勨偓娑櫭﹢?
      if (updates.email && updates.email !== user.email) {
        const existingEmail = await this.getUserByEmail(updates.email);
        if (existingEmail) {
          throw new Error('Email already exists');
        }
        // 闁哄洤鐡ㄩ弻濠囨焽椤旂虎鍞搁柡鍕Т閻?
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

      // 濞ｅ洦绻傞悺銊╁即鐎涙ɑ鐓€闁告艾娴峰▓鎴︽偨閵婏箑鐓曞ǎ鍥ｅ墲娴?
      await this.setHashFields(`${this.USER_PREFIX}${userId}`, updatedUser);

      logger.info(`User updated: ${updatedUser.username} (${userId})`);

      const { password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  // 闁告帞濞€濞呭酣鎮介妸锕€鐓?
  async deleteUser(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // 濞戞挸绉撮崢鎴犳媼缁嬪灝鐏╅梻鍕╁€栧〒鍫曞触鎼存繄顏卞☉鎿冧簽椤撴悂鎮堕崱妤佸枀
      if (user.role === this.ROLES.ADMIN) {
        const allUsers = await this.getAllUsers();
        const adminCount = allUsers.filter(u => u.role === this.ROLES.ADMIN).length;
        if (adminCount <= 1) {
          throw new Error('Cannot delete the last admin user');
        }
      }

      // 闁告帞濞€濞呭酣鎮介妸锕€鐓曢柡浣哄瀹?
      await redisClient.client.del(`${this.USER_PREFIX}${userId}`);
      
      // 濞寸姴娴烽弫銈夊箣瀹勬澘鐏欓悶娑栧妺閼垫垹绮旀繝姘彑
      await redisClient.client.sRem(this.USERS_KEY, userId);
      
      // 闁告帞濞€濞呭酣鎮介妸锕€鐓曢柛姘У濡惭呬焊?
      await redisClient.client.del(`username:${user.username}`);
      
      // 闁告帞濞€濞呭酣鏌囬缁㈠敻闁哄嫮濮撮惃?
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

  // 闁哄洤鐡ㄩ弻濠勨偓闈涙閻?
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

  // 濡ょ姴鐭侀惁澶屸偓闈涙閻?
  async verifyPassword(userId, password) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return false;
      }

      // 鐎殿喒鍋撻柛娆愬灩楠炲棙鏅堕崘顏嗘殕闁告娲熼悰娆戞嫚?
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

  // 闁哄洤鐡ㄩ弻濠囧嫉閳ь剟宕ユ惔锝嗩仮鐟滅増娲樺鍌炴⒒?
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

  // 缂佸倷鑳堕弫?闁告凹鍨抽弫銈夋偨閵婏箑鐓?
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

  // 閻熸瑱绲鹃悗浠嬫偨閵婏箑鐓曢柡浣哄瀹?
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

  // 闁兼儳鍢茶ぐ鍥╂喆閹烘洖顥忛柛鎺擃殙閵?
  getRoles() {
    return Object.values(this.ROLES);
  }
}

module.exports = new UserService();
