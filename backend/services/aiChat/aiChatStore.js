const { createAiChatSessionPolicy } = require('./aiChatSessionPolicy');

function resolveRedisClient(redisClient) {
  if (typeof redisClient === 'function') {
    return redisClient();
  }

  if (redisClient && redisClient.client) {
    return redisClient.client;
  }

  return redisClient;
}

function createChatError(code, message, statusCode = 500) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function parseStoredJson(value, fallback) {
  if (typeof value !== 'string' || !value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function createAiChatStore({
  redisClient,
  sessionPolicy = createAiChatSessionPolicy(),
  idFactory = () => `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  now = () => new Date().toISOString()
} = {}) {
  function getClient() {
    const client = resolveRedisClient(redisClient);
    if (!client) {
      throw createChatError('AI_CHAT_REDIS_NOT_INITIALIZED', 'AI chat Redis client not initialized', 500);
    }
    return client;
  }

  function getSessionKey(sessionId) {
    return `ai:chat:session:${sessionId}`;
  }

  function getMessagesKey(sessionId) {
    return `ai:chat:session:${sessionId}:messages`;
  }

  function getUserSessionsKey(userId) {
    return `ai:chat:user:${userId}:sessions`;
  }

  async function setJson(key, value) {
    await getClient().set(key, JSON.stringify(value));
  }

  async function getJson(key, fallback) {
    return parseStoredJson(await getClient().get(key), fallback);
  }

  async function applySessionTtl({ sessionId, userId }) {
    const client = getClient();
    await client.expire(getSessionKey(sessionId), sessionPolicy.sessionTtlSec);
    await client.expire(getMessagesKey(sessionId), sessionPolicy.sessionTtlSec);
    await client.expire(getUserSessionsKey(userId), sessionPolicy.sessionTtlSec);
  }

  async function saveRecentSessions(userId, sessionIds) {
    await setJson(getUserSessionsKey(userId), sessionIds);
  }

  async function deleteSession(sessionId) {
    const client = getClient();
    await client.del(getSessionKey(sessionId));
    await client.del(getMessagesKey(sessionId));
  }

  return {
    async createSession({ userId, nodeId = '', incidentId = '', timeRange, title = '' }) {
      const sessionId = idFactory();
      const timestamp = now();
      const session = {
        sessionId,
        userId,
        nodeId,
        incidentId,
        timeRange,
        title,
        messageCount: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        status: 'active'
      };

      await setJson(getSessionKey(sessionId), session);
      await setJson(getMessagesKey(sessionId), []);

      const recentSessionIds = await getJson(getUserSessionsKey(userId), []);
      const nextSessionIds = [sessionId, ...recentSessionIds]
        .filter((value, index, values) => values.indexOf(value) === index);

      const evictedSessionIds = nextSessionIds.slice(sessionPolicy.maxRecentSessionsPerUser);
      const keptSessionIds = nextSessionIds.slice(0, sessionPolicy.maxRecentSessionsPerUser);

      for (const evictedSessionId of evictedSessionIds) {
        await deleteSession(evictedSessionId);
      }

      await saveRecentSessions(userId, keptSessionIds);
      await applySessionTtl({ sessionId, userId });

      return session;
    },

    async getSession(sessionId) {
      return getJson(getSessionKey(sessionId), null);
    },

    async listRecentSessions(userId) {
      const sessionIds = await getJson(getUserSessionsKey(userId), []);
      const sessions = [];

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);
        if (session) {
          sessions.push(session);
        }
      }

      return sessions;
    },

    async getMessages(sessionId) {
      return getJson(getMessagesKey(sessionId), []);
    },

    async appendMessage(sessionId, message) {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw createChatError('CHAT_SESSION_NOT_FOUND', `Chat session ${sessionId} not found`, 404);
      }

      if (session.messageCount >= sessionPolicy.maxMessagesPerSession) {
        throw createChatError(
          'CHAT_SESSION_MESSAGE_LIMIT_REACHED',
          'Chat session message limit reached',
          409
        );
      }

      const messages = await this.getMessages(sessionId);
      const nextMessages = [...messages, message];
      const updatedSession = {
        ...session,
        messageCount: nextMessages.length,
        updatedAt: message.createdAt || now()
      };

      await setJson(getMessagesKey(sessionId), nextMessages);
      await setJson(getSessionKey(sessionId), updatedSession);

      const recentSessionIds = await getJson(getUserSessionsKey(session.userId), []);
      const reorderedSessionIds = [sessionId, ...recentSessionIds.filter(id => id !== sessionId)];
      await saveRecentSessions(
        session.userId,
        reorderedSessionIds.slice(0, sessionPolicy.maxRecentSessionsPerUser)
      );
      await applySessionTtl({ sessionId, userId: session.userId });

      return message;
    }
  };
}

module.exports = {
  createAiChatStore
};
