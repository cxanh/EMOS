function createAiChatSessionPolicy({
  sessionTtlSec = 72 * 60 * 60,
  maxMessagesPerSession = 20,
  maxRecentSessionsPerUser = 5
} = {}) {
  return {
    sessionTtlSec,
    maxMessagesPerSession,
    maxRecentSessionsPerUser,
    isAllowedTimeRange(timeRange) {
      return ['24h', '7d', '30d'].includes(timeRange);
    }
  };
}

module.exports = {
  createAiChatSessionPolicy
};
