const JSON_FIELDS = new Set([
  'params',
  'dryRunResult',
  'resolvedParams',
  'executionResult',
  'verificationResult',
  'error'
]);

function serializeField(field, value) {
  if (value === undefined || value === null) {
    return '';
  }

  if (JSON_FIELDS.has(field)) {
    return JSON.stringify(value);
  }

  return String(value);
}

function deserializeField(field, value) {
  if (value === undefined || value === null || value === '') {
    return JSON_FIELDS.has(field) ? null : value;
  }

  if (JSON_FIELDS.has(field)) {
    return JSON.parse(value);
  }

  return value;
}

function resolveRedisClient(redisClient) {
  const resolved = typeof redisClient === 'function'
    ? redisClient()
    : redisClient && redisClient.client
      ? redisClient.client
      : redisClient;

  if (!resolved) {
    const error = new Error('AI Ops Redis client not initialized');
    error.code = 'AI_OPS_REDIS_NOT_INITIALIZED';
    throw error;
  }

  return resolved;
}

function createActionRequestStore({
  redisClient,
  now = () => new Date().toISOString()
}) {
  return {
    async createRequest(request) {
      const client = resolveRedisClient(redisClient);
      const key = `ai:v2:action:request:${request.requestId}`;

      for (const [field, value] of Object.entries(request)) {
        await client.hSet(key, field, serializeField(field, value));
      }

      if (request.idempotencyKey) {
        await client.set(
          `ai:v2:action:idempotency:${request.idempotencyKey}`,
          request.requestId
        );
      }

      return request;
    },
    async updateRequest(requestId, patch) {
      const current = await this.getRequest(requestId);

      if (!current) {
        return null;
      }

      const next = {
        ...current,
        ...patch,
        updatedAt: now()
      };

      await this.createRequest(next);
      return next;
    },
    async getRequest(requestId) {
      const client = resolveRedisClient(redisClient);
      const stored = await client.hGetAll(
        `ai:v2:action:request:${requestId}`
      );

      if (!stored || Object.keys(stored).length === 0) {
        return null;
      }

      const request = {};

      for (const [field, value] of Object.entries(stored)) {
        request[field] = deserializeField(field, value);
      }

      return request;
    },
    async getRequestByIdempotencyKey(idempotencyKey) {
      const client = resolveRedisClient(redisClient);
      const requestId = await client.get(
        `ai:v2:action:idempotency:${idempotencyKey}`
      );

      if (!requestId) {
        return null;
      }

      return this.getRequest(requestId);
    },
    async appendTimelineEvent(requestId, event) {
      const client = resolveRedisClient(redisClient);
      await client.rPush(
        `ai:v2:action:timeline:${requestId}`,
        JSON.stringify(event)
      );

      return event;
    },
    async getTimeline(requestId) {
      const client = resolveRedisClient(redisClient);
      const values = await client.lRange(
        `ai:v2:action:timeline:${requestId}`,
        0,
        -1
      );

      return values.map(value => JSON.parse(value));
    }
  };
}

module.exports = {
  createActionRequestStore
};
