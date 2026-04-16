function serializeAuditValue(value) {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
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

function createActionAudit({
  redisClient,
  now = () => new Date().toISOString(),
  eventIdFactory
}) {
  let sequence = 0;

  return {
    async record(event) {
      const client = resolveRedisClient(redisClient);
      sequence += 1;

      const eventId = eventIdFactory
        ? eventIdFactory(sequence)
        : `audit_${Date.now()}_${sequence}`;

      const payload = {
        eventId,
        timestamp: now(),
        ...event
      };

      const key = `ai:v2:audit:event:${eventId}`;

      for (const [field, value] of Object.entries(payload)) {
        await client.hSet(key, field, serializeAuditValue(value));
      }

      await client.zAdd('ai:v2:audit:events', {
        score: sequence,
        value: eventId
      });

      return payload;
    }
  };
}

module.exports = {
  createActionAudit
};
