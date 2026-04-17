const aiService = require('../aiService');

function createChatError(code, message, statusCode = 500) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function normalizeRiskLevel(value) {
  return ['low', 'medium', 'high'].includes(value) ? value : 'low';
}

function normalizeQuestion(question) {
  return String(question || '').trim();
}

function truncateTitle(question) {
  return normalizeQuestion(question).slice(0, 80);
}

function createDefaultAiModel() {
  return {
    isEnabled() {
      return aiService.isEnabled();
    },
    getStatus() {
      return aiService.getStatus();
    },
    async generateChatAnalysis({ question, contextSummary, history, allowedActions }) {
      const prompt = [
        '你是运维对话分析助手。',
        `问题: ${question}`,
        `上下文摘要: ${contextSummary}`,
        `会话历史摘要: ${history.map(item => `${item.question} => ${item.answer}`).join(' || ') || 'none'}`,
        `允许推荐的动作白名单: ${JSON.stringify(allowedActions)}`,
        '必须返回 JSON，包含 answer、conclusion、recommendedActions。'
      ].join('\n');

      const rawResponse = await aiService.callLLM(prompt);
      return aiService.parseJSONResponse(rawResponse);
    }
  };
}

function createAiChatService({
  aiChatStore,
  aiContextService,
  aiModel = createDefaultAiModel(),
  actionRegistry,
  actionPolicy,
  idFactory = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  now = () => new Date().toISOString()
} = {}) {
  if (!aiChatStore || !aiContextService || !actionRegistry || !actionPolicy) {
    throw new Error('aiChatStore, aiContextService, actionRegistry, and actionPolicy are required');
  }

  async function ensureSessionOwnership(actor, sessionId) {
    const session = await aiChatStore.getSession(sessionId);
    if (!session) {
      throw createChatError('CHAT_SESSION_NOT_FOUND', `Chat session ${sessionId} not found`, 404);
    }

    if (session.userId !== actor.id) {
      throw createChatError('FORBIDDEN', 'You cannot access this chat session', 403);
    }

    return session;
  }

  function normalizeConclusion(conclusion = {}) {
    return {
      summary: String(conclusion.summary || '').trim(),
      riskLevel: normalizeRiskLevel(conclusion.riskLevel),
      keyFindings: Array.isArray(conclusion.keyFindings)
        ? conclusion.keyFindings.map(item => String(item)).filter(Boolean)
        : [],
      affectedEntities: Array.isArray(conclusion.affectedEntities)
        ? conclusion.affectedEntities.map(item => String(item)).filter(Boolean)
        : []
    };
  }

  async function filterRecommendedActions({ actor, candidates }) {
    const descriptors = actionRegistry.listActions();
    const descriptorMap = new Map(
      descriptors.map(descriptor => [`${descriptor.actionClass}:${descriptor.actionId}`, descriptor])
    );
    const filtered = [];

    for (const candidate of Array.isArray(candidates) ? candidates : []) {
      const actionClass = candidate.actionClass || 'platform_action';
      const actionId = candidate.actionId;
      const descriptor = descriptorMap.get(`${actionClass}:${actionId}`);

      if (!descriptor) {
        continue;
      }

      try {
        const action = actionRegistry.getAction(actionClass, actionId);
        const prefillParams = candidate.prefillParams && typeof candidate.prefillParams === 'object'
          ? candidate.prefillParams
          : {};
        const resolvedParams = action.resolveParams({
          actionClass,
          actionId,
          params: prefillParams
        }, {
          actor
        });
        const evaluation = await actionPolicy.evaluate({
          actor,
          resolvedParams
        });

        if (!evaluation.allowed) {
          continue;
        }

        filtered.push({
          actionClass,
          actionId,
          title: descriptor.title,
          reason: String(candidate.reason || descriptor.summary || '').trim(),
          riskLevel: normalizeRiskLevel(candidate.riskLevel || descriptor.riskLevel),
          prefillParams
        });
      } catch (error) {
        continue;
      }
    }

    return filtered;
  }

  async function buildAssistantMessage({ actor, question, contextSummary, history }) {
    const analysis = await aiModel.generateChatAnalysis({
      question,
      contextSummary: contextSummary.promptSummary,
      history,
      allowedActions: actionRegistry.listActions()
    });

    return {
      messageId: idFactory(),
      role: 'assistant',
      question,
      answer: String(analysis.answer || '').trim(),
      conclusion: normalizeConclusion(analysis.conclusion),
      recommendedActions: await filterRecommendedActions({
        actor,
        candidates: analysis.recommendedActions
      }),
      createdAt: now()
    };
  }

  return {
    async createSession({ actor, input }) {
      if (!aiModel.isEnabled()) {
        throw createChatError('AI_SERVICE_DISABLED', 'AI service is not enabled', 503);
      }

      const question = normalizeQuestion(input.question);
      const contextSummary = await aiContextService.buildContextSummary({
        nodeId: input.nodeId || '',
        incidentId: input.incidentId || '',
        timeRange: input.timeRange
      });
      const session = await aiChatStore.createSession({
        userId: actor.id,
        nodeId: input.nodeId || '',
        incidentId: input.incidentId || '',
        timeRange: input.timeRange,
        title: truncateTitle(question)
      });
      const message = await buildAssistantMessage({
        actor,
        question,
        contextSummary,
        history: []
      });

      await aiChatStore.appendMessage(session.sessionId, message);

      return {
        sessionId: session.sessionId,
        context: {
          nodeId: session.nodeId,
          incidentId: session.incidentId,
          timeRange: session.timeRange,
          summary: contextSummary.promptSummary
        },
        message
      };
    },

    async postMessage({ actor, sessionId, question }) {
      const session = await ensureSessionOwnership(actor, sessionId);
      const history = await aiChatStore.getMessages(sessionId);
      const contextSummary = await aiContextService.buildContextSummary({
        nodeId: session.nodeId || '',
        incidentId: session.incidentId || '',
        timeRange: session.timeRange
      });
      const message = await buildAssistantMessage({
        actor,
        question: normalizeQuestion(question),
        contextSummary,
        history
      });

      await aiChatStore.appendMessage(sessionId, message);

      return {
        sessionId,
        message
      };
    },

    async listSessions({ actor }) {
      return {
        sessions: await aiChatStore.listRecentSessions(actor.id)
      };
    },

    async getSession({ actor, sessionId }) {
      return ensureSessionOwnership(actor, sessionId);
    },

    async getMessages({ actor, sessionId }) {
      await ensureSessionOwnership(actor, sessionId);
      return {
        sessionId,
        messages: await aiChatStore.getMessages(sessionId)
      };
    }
  };
}

module.exports = {
  createAiChatService
};
