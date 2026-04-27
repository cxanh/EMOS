const redisClient = require('../../config/redis');
const { createAiOpsError } = require('./errors');

function createIncidentTimelineService({
  redis = redisClient.client,
  now = () => new Date().toISOString(),
  idFactory = () => `timeline_note_${Date.now()}`
} = {}) {
  return {
    async createNote(params) {
      if (!redis) {
        throw createAiOpsError(
          'TIMELINE_SERVICE_UNAVAILABLE',
          'incident timeline service is not configured',
          500
        );
      }

      const noteId = idFactory();
      const timestamp = now();
      const note = {
        noteId,
        incidentId: params.incidentId,
        note: params.note,
        visibility: params.visibility || 'internal',
        createdAt: timestamp
      };

      const noteKey = `incident:timeline:note:${noteId}`;

      for (const [field, value] of Object.entries(note)) {
        await redis.hSet(noteKey, field, String(value));
      }

      await redis.zAdd(`incident:timeline:${params.incidentId}`, {
        score: Date.now(),
        value: noteId
      });

      return {
        ok: true,
        noteId,
        incidentId: params.incidentId
      };
    },
    async getNoteById(noteId) {
      if (!redis) {
        throw createAiOpsError(
          'TIMELINE_SERVICE_UNAVAILABLE',
          'incident timeline service is not configured',
          500
        );
      }

      const note = await redis.hGetAll(`incident:timeline:note:${noteId}`);

      if (!note || Object.keys(note).length === 0) {
        return null;
      }

      return note;
    },
    async listNotes(incidentId) {
      if (!redis) {
        throw createAiOpsError(
          'TIMELINE_SERVICE_UNAVAILABLE',
          'incident timeline service is not configured',
          500
        );
      }

      const noteIds = await redis.zRange(`incident:timeline:${incidentId}`, 0, -1);
      const notes = [];

      for (const noteId of noteIds) {
        const note = await this.getNoteById(noteId);
        if (note) {
          notes.push(note);
        }
      }

      return notes;
    }
  };
}

module.exports = {
  createIncidentTimelineService
};
