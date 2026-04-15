function serializeAuditValue(value) {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function createActionAudit({
  redisClient,
  now = () => new Date().toISOString(),
  eventIdFactory
}) {
  let sequence = 0;

  return {
    async record(event) {
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
        await redisClient.hSet(key, field, serializeAuditValue(value));
      }

      await redisClient.zAdd('ai:v2:audit:events', {
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
