const redisModule = require('../config/redis');

const SYSTEM_SETTINGS_KEY = 'ai:settings:system';
const USER_SETTINGS_PREFIX = 'ai:settings:user:';

function resolveRedisClient(redisClient) {
  if (typeof redisClient === 'function') {
    return redisClient();
  }

  if (redisClient && redisClient.client) {
    return redisClient.client;
  }

  return redisClient;
}

function serializeValue(value) {
  return JSON.stringify(value);
}

function deserializeValue(value) {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

function normalizeHash(hash) {
  return Object.fromEntries(
    Object.entries(hash || {}).map(([field, value]) => [field, deserializeValue(value)])
  );
}

function createAiSettingsStore({
  redisClient = () => redisModule.client
} = {}) {
  async function getClient() {
    const client = resolveRedisClient(redisClient);

    if (!client) {
      throw new Error('Redis client is not available');
    }

    return client;
  }

  async function writeHashFields(key, fields) {
    const client = await getClient();

    for (const [field, value] of Object.entries(fields)) {
      await client.hSet(key, field, serializeValue(value));
    }
  }

  return {
    async getSystemSettings() {
      const client = await getClient();
      return normalizeHash(await client.hGetAll(SYSTEM_SETTINGS_KEY));
    },

    async saveSystemSettings(fields) {
      await writeHashFields(SYSTEM_SETTINGS_KEY, fields);
    },

    async getUserSettings(userId) {
      const client = await getClient();
      return normalizeHash(await client.hGetAll(`${USER_SETTINGS_PREFIX}${userId}`));
    },

    async saveUserSettings(userId, fields) {
      await writeHashFields(`${USER_SETTINGS_PREFIX}${userId}`, fields);
    }
  };
}

module.exports = {
  SYSTEM_SETTINGS_KEY,
  USER_SETTINGS_PREFIX,
  createAiSettingsStore
};
