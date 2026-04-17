const { createAiSettingsStore } = require('./aiSettingsStore');

const SYSTEM_FIELD_DEFINITIONS = {
  enabled: {
    editable: true,
    parse: parseBoolean,
    env: () => [readEnvBoolean('AI_ENABLED')]
  },
  provider: {
    editable: true,
    parse: parseProvider,
    env: () => [readEnvString('LLM_PROVIDER')]
  },
  model: {
    editable: true,
    parse: parseNonEmptyString,
    env: context => readProviderScopedEnvValues(context.provider.value, 'MODEL')
  },
  baseUrl: {
    editable: true,
    parse: parseNonEmptyString,
    env: context => readProviderScopedEnvValues(context.provider.value, 'BASE_URL')
  },
  timeoutMs: {
    editable: true,
    parse: parsePositiveInteger,
    env: () => [readEnvInteger('AI_TIMEOUT_MS'), readEnvInteger('LLM_TIMEOUT_MS')]
  },
  allowActionRecommendations: {
    editable: true,
    parse: parseBoolean,
    env: () => [readEnvBoolean('AI_ALLOW_ACTION_RECOMMENDATIONS')]
  }
};

const USER_FIELD_DEFINITIONS = {
  language: {
    editable: true,
    parse: parseLanguage
  },
  responseStyle: {
    editable: true,
    parse: parseResponseStyle
  },
  defaultAnalysisScope: {
    editable: true,
    parse: parseAnalysisScope
  },
  showActionRecommendations: {
    editable: true,
    parse: parseBoolean
  }
};

const PROVIDER_PRESETS = {
  openai: {
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1'
  },
  qwen: {
    model: 'qwen-plus',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  },
  deepseek: {
    model: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1'
  },
  zhipu: {
    model: 'glm-4-flash',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4'
  },
  kimi: {
    model: 'moonshot-v1-8k',
    baseUrl: 'https://api.moonshot.cn/v1'
  },
  moonshot: {
    model: 'moonshot-v1-8k',
    baseUrl: 'https://api.moonshot.cn/v1'
  },
  groq: {
    model: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1'
  },
  together: {
    model: 'meta-llama/Llama-3.1-70B-Instruct-Turbo',
    baseUrl: 'https://api.together.xyz/v1'
  },
  siliconflow: {
    model: 'Qwen/Qwen2.5-72B-Instruct',
    baseUrl: 'https://api.siliconflow.cn/v1'
  },
  ollama: {
    model: 'llama2',
    baseUrl: 'http://localhost:11434'
  }
};

const USER_DEFAULTS = {
  language: 'zh-CN',
  responseStyle: 'standard',
  defaultAnalysisScope: '24h',
  showActionRecommendations: true
};

function readEnvString(key) {
  const value = process.env[key];
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readEnvBoolean(key) {
  const value = readEnvString(key);
  if (value === undefined) {
    return undefined;
  }

  return parseBoolean(value);
}

function readEnvInteger(key) {
  const value = readEnvString(key);
  if (value === undefined) {
    return undefined;
  }

  return parsePositiveInteger(value);
}

function getProviderEnvPrefix(provider) {
  return String(provider || 'openai').toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

function readProviderScopedEnvValues(provider, suffix) {
  const prefix = getProviderEnvPrefix(provider);
  const values = [readEnvString(`LLM_${suffix}`), readEnvString(`${prefix}_${suffix}`)];

  if (provider === 'openai') {
    values.push(readEnvString(`OPENAI_${suffix}`));
  }

  return values;
}

function getProviderPreset(provider) {
  return PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.openai;
}

function parseBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw createValidationError('must be a boolean');
}

function parsePositiveInteger(value) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    if (parsed > 0) {
      return parsed;
    }
  }

  throw createValidationError('must be a positive integer');
}

function parseNonEmptyString(value) {
  if (typeof value !== 'string') {
    throw createValidationError('must be a non-empty string');
  }

  const normalized = value.trim();
  if (!normalized) {
    throw createValidationError('must be a non-empty string');
  }

  return normalized;
}

function parseProvider(value) {
  const normalized = parseNonEmptyString(value).toLowerCase();
  if (!PROVIDER_PRESETS[normalized]) {
    throw createValidationError('must be one of openai, qwen, deepseek, zhipu, kimi, moonshot, groq, together, siliconflow, ollama');
  }

  return normalized;
}

function parseLanguage(value) {
  const normalized = parseNonEmptyString(value);
  if (!['zh-CN', 'en-US'].includes(normalized)) {
    throw createValidationError('must be one of zh-CN, en-US');
  }

  return normalized;
}

function parseResponseStyle(value) {
  const normalized = parseNonEmptyString(value).toLowerCase();
  if (!['concise', 'standard', 'detailed'].includes(normalized)) {
    throw createValidationError('must be one of concise, standard, detailed');
  }

  return normalized;
}

function parseAnalysisScope(value) {
  const normalized = parseNonEmptyString(value);
  if (!['24h', '7d', '30d'].includes(normalized)) {
    throw createValidationError('must be one of 24h, 7d, 30d');
  }

  return normalized;
}

function createValidationError(message) {
  const error = new Error(message);
  error.code = 'INVALID_AI_SETTINGS';
  error.statusCode = 400;
  return error;
}

function resolveField({ persistedValue, envValues, fallbackValue, editable }) {
  if (persistedValue !== undefined) {
    return {
      value: persistedValue,
      source: 'persisted',
      editable
    };
  }

  const envValue = (envValues || []).find(value => value !== undefined);
  if (envValue !== undefined) {
    return {
      value: envValue,
      source: 'env',
      editable
    };
  }

  return {
    value: fallbackValue,
    source: 'fallback',
    editable
  };
}

function getActorId(user) {
  return user?.id || user?.user_id;
}

function validateUpdatePayload(payload, definitions) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    const error = new Error('settings payload must be an object');
    error.code = 'INVALID_AI_SETTINGS';
    error.statusCode = 400;
    throw error;
  }

  const unknownFields = Object.keys(payload).filter(field => !definitions[field]);
  if (unknownFields.length > 0) {
    const error = new Error(`unknown settings fields: ${unknownFields.join(', ')}`);
    error.code = 'INVALID_AI_SETTINGS';
    error.statusCode = 400;
    throw error;
  }
}

function normalizeSystemUpdates(payload) {
  validateUpdatePayload(payload, {
    ...SYSTEM_FIELD_DEFINITIONS,
    apiKey: {
      parse: parseNonEmptyString
    }
  });

  const normalized = {};

  for (const field of Object.keys(SYSTEM_FIELD_DEFINITIONS)) {
    if (payload[field] !== undefined) {
      normalized[field] = SYSTEM_FIELD_DEFINITIONS[field].parse(payload[field]);
    }
  }

  if (payload.apiKey !== undefined) {
    normalized.apiKey = parseNonEmptyString(payload.apiKey);
  }

  return normalized;
}

function normalizeUserUpdates(payload) {
  validateUpdatePayload(payload, USER_FIELD_DEFINITIONS);

  const normalized = {};

  for (const field of Object.keys(USER_FIELD_DEFINITIONS)) {
    if (payload[field] !== undefined) {
      normalized[field] = USER_FIELD_DEFINITIONS[field].parse(payload[field]);
    }
  }

  return normalized;
}

function createAiSettingsService({
  store = createAiSettingsStore(),
  now = () => new Date().toISOString()
} = {}) {
  async function resolveSystemSettings() {
    const persisted = await store.getSystemSettings();
    const provider = resolveField({
      persistedValue: persisted.provider,
      envValues: SYSTEM_FIELD_DEFINITIONS.provider.env(),
      fallbackValue: 'openai',
      editable: SYSTEM_FIELD_DEFINITIONS.provider.editable
    });

    const providerPreset = getProviderPreset(provider.value);

    const resolved = {
      enabled: resolveField({
        persistedValue: persisted.enabled,
        envValues: SYSTEM_FIELD_DEFINITIONS.enabled.env({ provider }),
        fallbackValue: false,
        editable: SYSTEM_FIELD_DEFINITIONS.enabled.editable
      }),
      provider,
      model: resolveField({
        persistedValue: persisted.model,
        envValues: SYSTEM_FIELD_DEFINITIONS.model.env({ provider }),
        fallbackValue: providerPreset.model,
        editable: SYSTEM_FIELD_DEFINITIONS.model.editable
      }),
      baseUrl: resolveField({
        persistedValue: persisted.baseUrl,
        envValues: SYSTEM_FIELD_DEFINITIONS.baseUrl.env({ provider }),
        fallbackValue: providerPreset.baseUrl,
        editable: SYSTEM_FIELD_DEFINITIONS.baseUrl.editable
      }),
      timeoutMs: resolveField({
        persistedValue: persisted.timeoutMs,
        envValues: SYSTEM_FIELD_DEFINITIONS.timeoutMs.env({ provider }),
        fallbackValue: 120000,
        editable: SYSTEM_FIELD_DEFINITIONS.timeoutMs.editable
      }),
      allowActionRecommendations: resolveField({
        persistedValue: persisted.allowActionRecommendations,
        envValues: SYSTEM_FIELD_DEFINITIONS.allowActionRecommendations.env({ provider }),
        fallbackValue: true,
        editable: SYSTEM_FIELD_DEFINITIONS.allowActionRecommendations.editable
      })
    };

    const envApiKey = readProviderScopedEnvValues(provider.value, 'API_KEY')
      .find(value => value !== undefined);
    const apiKeySource = persisted.apiKey !== undefined
      ? 'persisted'
      : envApiKey !== undefined
        ? 'env'
        : 'fallback';

    resolved.apiKey = {
      configured: persisted.apiKey !== undefined || envApiKey !== undefined,
      source: apiKeySource,
      editable: true
    };

    return resolved;
  }

  async function resolveUserSettings(userId) {
    const persisted = await store.getUserSettings(userId);

    return {
      language: resolveField({
        persistedValue: persisted.language,
        envValues: [],
        fallbackValue: USER_DEFAULTS.language,
        editable: USER_FIELD_DEFINITIONS.language.editable
      }),
      responseStyle: resolveField({
        persistedValue: persisted.responseStyle,
        envValues: [],
        fallbackValue: USER_DEFAULTS.responseStyle,
        editable: USER_FIELD_DEFINITIONS.responseStyle.editable
      }),
      defaultAnalysisScope: resolveField({
        persistedValue: persisted.defaultAnalysisScope,
        envValues: [],
        fallbackValue: USER_DEFAULTS.defaultAnalysisScope,
        editable: USER_FIELD_DEFINITIONS.defaultAnalysisScope.editable
      }),
      showActionRecommendations: resolveField({
        persistedValue: persisted.showActionRecommendations,
        envValues: [],
        fallbackValue: USER_DEFAULTS.showActionRecommendations,
        editable: USER_FIELD_DEFINITIONS.showActionRecommendations.editable
      })
    };
  }

  return {
    async getSettingsForUser(user) {
      const userId = getActorId(user);
      if (!userId) {
        const error = new Error('Authenticated user is required');
        error.code = 'UNAUTHENTICATED';
        error.statusCode = 401;
        throw error;
      }

      return {
        system: await resolveSystemSettings(),
        user: await resolveUserSettings(userId)
      };
    },

    async updateSystemSettings(actor, payload) {
      if (actor?.role !== 'admin') {
        const error = new Error('Only admins can update system AI settings');
        error.code = 'FORBIDDEN';
        error.statusCode = 403;
        throw error;
      }

      const normalized = normalizeSystemUpdates(payload);

      if (Object.keys(normalized).length === 0) {
        const error = new Error('At least one system setting is required');
        error.code = 'INVALID_AI_SETTINGS';
        error.statusCode = 400;
        throw error;
      }

      await store.saveSystemSettings({
        ...normalized,
        updatedAt: now(),
        updatedBy: getActorId(actor)
      });

      return this.getSettingsForUser(actor);
    },

    async updateUserSettings(actor, payload) {
      const userId = getActorId(actor);
      if (!userId) {
        const error = new Error('Authenticated user is required');
        error.code = 'UNAUTHENTICATED';
        error.statusCode = 401;
        throw error;
      }

      const normalized = normalizeUserUpdates(payload);

      if (Object.keys(normalized).length === 0) {
        const error = new Error('At least one user setting is required');
        error.code = 'INVALID_AI_SETTINGS';
        error.statusCode = 400;
        throw error;
      }

      await store.saveUserSettings(userId, {
        ...normalized,
        updatedAt: now()
      });

      return this.getSettingsForUser(actor);
    }
  };
}

module.exports = {
  createAiSettingsService
};
