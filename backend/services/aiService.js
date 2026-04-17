const axios = require('axios');
const OpenAI = require('openai');
const dataStore = require('./dataStore');
const alertService = require('./alertService');
const influxClient = require('../config/influxdb');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.provider = null;
    this.apiKey = null;
    this.model = null;
    this.baseURL = null;
    this.openaiClient = null;
    this.enabled = false;
  }

  // Convert provider name to env prefix (e.g. "openai-compatible" => "OPENAI_COMPATIBLE")
  getProviderEnvPrefix(provider) {
    return provider.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  }

  // Presets for common OpenAI-compatible providers
  getOpenAICompatiblePreset(provider) {
    const presets = {
      openai: {
        baseURL: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini'
      },
      qwen: {
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        model: 'qwen-plus'
      },
      deepseek: {
        baseURL: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat'
      },
      zhipu: {
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'glm-4-flash'
      },
      kimi: {
        baseURL: 'https://api.moonshot.cn/v1',
        model: 'moonshot-v1-8k'
      },
      moonshot: {
        baseURL: 'https://api.moonshot.cn/v1',
        model: 'moonshot-v1-8k'
      },
      groq: {
        baseURL: 'https://api.groq.com/openai/v1',
        model: 'llama-3.3-70b-versatile'
      },
      together: {
        baseURL: 'https://api.together.xyz/v1',
        model: 'meta-llama/Llama-3.1-70B-Instruct-Turbo'
      },
      siliconflow: {
        baseURL: 'https://api.siliconflow.cn/v1',
        model: 'Qwen/Qwen2.5-72B-Instruct'
      }
    };

    return presets[provider] || null;
  }

  // Initialize AI service
  initialize() {
    try {
      this.provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase().trim();

      if (this.provider === 'ollama') {
        this.baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.model = process.env.OLLAMA_MODEL || 'llama2';
        this.apiKey = null;
        this.openaiClient = null;
      } else {
        const providerPrefix = this.getProviderEnvPrefix(this.provider);
        const preset = this.getOpenAICompatiblePreset(this.provider);

        this.apiKey =
          process.env.LLM_API_KEY ||
          process.env[`${providerPrefix}_API_KEY`] ||
          (this.provider === 'openai' ? process.env.OPENAI_API_KEY : null);

        this.baseURL =
          process.env.LLM_BASE_URL ||
          process.env[`${providerPrefix}_BASE_URL`] ||
          (this.provider === 'openai' ? process.env.OPENAI_BASE_URL : null) ||
          preset?.baseURL ||
          'https://api.openai.com/v1';

        this.model =
          process.env.LLM_MODEL ||
          process.env[`${providerPrefix}_MODEL`] ||
          (this.provider === 'openai' ? process.env.OPENAI_MODEL : null) ||
          preset?.model ||
          'gpt-4o-mini';

        if (!this.apiKey) {
          logger.warn(`${this.provider} API key not configured`);
          this.enabled = false;
          return;
        }

        this.openaiClient = new OpenAI({
          apiKey: this.apiKey,
          baseURL: this.baseURL
        });
      }

      this.enabled = true;
      logger.info(`AI Service Initialized (Provider: ${this.provider}, Model: ${this.model})`);
    } catch (error) {
      logger.error('Failed to initialize AI Service:', error.message);
      this.enabled = false;
    }
  }

  // Check if AI service is enabled
  isEnabled() {
    return this.enabled;
  }

  // Get runtime status
  getStatus() {
    return {
      enabled: this.enabled,
      provider: this.provider,
      model: this.model,
      baseURL: this.baseURL
    };
  }

  // Analyze system health
  async analyzeSystemHealth() {
    if (!this.enabled) {
      return { success: false, error: 'AI service not enabled' };
    }

    try {
      // Collect current system data
      const nodes = await dataStore.getOnlineNodes();
      const alerts = await alertService.getActiveEvents();

      const systemData = {
        timestamp: new Date().toISOString(),
        totalNodes: nodes.length,
        onlineNodes: nodes.length,
        activeAlerts: alerts.length,
        nodes: nodes.map(node => ({
          id: node.node_id,
          name: node.hostname || node.node_id,
          cpu: parseFloat(node.latest_metrics?.cpu_usage || 0),
          memory: parseFloat(node.latest_metrics?.memory_usage || 0),
          disk: parseFloat(node.latest_metrics?.disk_usage || 0),
          status: 'online'
        }))
      };

      // Build prompt
      const prompt = this.buildHealthCheckPrompt(systemData);

      // Call LLM
      const response = await this.callLLM(prompt);

      // Parse response
      const analysis = this.parseJSONResponse(response);

      return {
        success: true,
        data: {
          ...analysis,
          analyzedAt: new Date().toISOString(),
          systemData
        }
      };
    } catch (error) {
      logger.error('Error analyzing system health:', error);
      return { success: false, error: error.message };
    }
  }

  // Analyze performance trend
  async analyzeTrend(nodeId, timeRange = '24h') {
    if (!this.enabled) {
      return { success: false, error: 'AI service not enabled' };
    }

    try {
      // Calculate time range
      const endTime = new Date();
      const startTime = new Date();

      if (timeRange === '24h') {
        startTime.setHours(startTime.getHours() - 24);
      } else if (timeRange === '7d') {
        startTime.setDate(startTime.getDate() - 7);
      } else if (timeRange === '30d') {
        startTime.setDate(startTime.getDate() - 30);
      }

      // Query historical data
      const metrics = await influxClient.queryMetrics(
        nodeId,
        startTime.toISOString(),
        endTime.toISOString(),
        '1h'
      );

      // Build prompt
      const prompt = this.buildTrendAnalysisPrompt({
        nodeId,
        timeRange,
        metrics,
        dataPoints: metrics.length
      });

      // Call LLM
      const response = await this.callLLM(prompt);

      // Parse response
      const analysis = this.parseJSONResponse(response);

      return {
        success: true,
        data: {
          ...analysis,
          analyzedAt: new Date().toISOString(),
          timeRange,
          dataPoints: metrics.length
        }
      };
    } catch (error) {
      logger.error('Error analyzing trend:', error);
      return { success: false, error: error.message };
    }
  }

  // Get optimization recommendations
  async getRecommendations() {
    if (!this.enabled) {
      return { success: false, error: 'AI service not enabled' };
    }

    try {
      // Collect system data
      const nodes = await dataStore.getOnlineNodes();
      const alerts = await alertService.getActiveEvents();
      const rules = await alertService.getRules();

      const systemData = {
        nodes: nodes.map(node => ({
          id: node.node_id,
          name: node.hostname || node.node_id,
          cpu: parseFloat(node.latest_metrics?.cpu_usage || 0),
          memory: parseFloat(node.latest_metrics?.memory_usage || 0),
          disk: parseFloat(node.latest_metrics?.disk_usage || 0)
        })),
        alerts: alerts.length,
        alertRules: rules.length
      };

      // Build prompt
      const prompt = this.buildRecommendationsPrompt(systemData);

      // Call LLM
      const response = await this.callLLM(prompt);

      // Parse response
      const recommendations = this.parseJSONResponse(response);

      return {
        success: true,
        data: {
          ...recommendations,
          analyzedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      return { success: false, error: error.message };
    }
  }

  // Analyze lightweight follow-up question
  async analyzeFollowUp(question, contextSummary, analysisType) {
    if (!this.enabled) {
      return { success: false, error: 'AI service not enabled' };
    }

    try {
      const prompt = this.buildFollowUpPrompt(question, contextSummary, analysisType);

      // Call LLM
      let response = await this.callLLM(prompt);

      // Try to parse JSON response
      let result;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = JSON.parse(response);
        }
      } catch (parseError) {
        // If parsing fails, use the raw response as answer
        result = {
          answer: response.trim(),
          recommendActions: []
        };
      }

      return {
        success: true,
        data: {
          answer: result.answer || response,
          recommendActions: Array.isArray(result.recommendActions) ? result.recommendActions : [],
          analyzedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error in follow-up analysis:', error);
      return { success: false, error: error.message };
    }
  }

  // Analyze homepage overview question (single-turn only)
  async analyzeOverviewQuestion(payload) {
    if (!this.enabled) {
      return { success: false, error: 'AI service not enabled' };
    }

    try {
      const { question, clientHints } = payload || {};

      const nodes = await dataStore.getOnlineNodes();
      const alerts = await alertService.getActiveEvents();

      const highLoadNodes = nodes
        .map(node => ({
          id: node.node_id,
          name: node.hostname || node.node_id,
          cpu: parseFloat(node.latest_metrics?.cpu_usage || 0),
          memory: parseFloat(node.latest_metrics?.memory_usage || 0),
          disk: parseFloat(node.latest_metrics?.disk_usage || 0)
        }))
        .filter(node => node.cpu >= 80 || node.memory >= 80 || node.disk >= 85)
        .slice(0, 5);

      const summaryData = {
        timestamp: new Date().toISOString(),
        totalNodes: nodes.length,
        activeAlerts: alerts.length,
        highLoadNodes,
        clientHints: clientHints || {}
      };

      const prompt = this.buildOverviewQuestionPrompt(question, summaryData);
      const response = await this.callLLM(prompt);

      let parsed;
      try {
        parsed = this.parseJSONResponse(response);
      } catch (parseError) {
        parsed = {
          answer: response?.trim() || '当前系统概况可用，但模型返回格式异常。',
          riskPoints: [],
          nextSteps: ['建议先执行系统健康检查获取结构化结果'],
          recommendedActions: [
            { type: 'navigate', target: 'health', label: '前往系统健康检查' },
            { type: 'navigate', target: 'ai-chat', label: '去 AIChatAnalysis 深入分析' }
          ]
        };
      }

      const normalized = this.normalizeOverviewQuestionResult(parsed);

      return {
        success: true,
        data: {
          ...normalized,
          analyzedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error analyzing overview question:', error);
      return { success: false, error: error.message };
    }
  }

  normalizeOverviewQuestionResult(result) {
    const allowedTargets = new Set(['health', 'trend', 'recommendations', 'ai-ops', 'ai-chat']);
    const safeRiskPoints = Array.isArray(result?.riskPoints)
      ? result.riskPoints.filter(item => typeof item === 'string').slice(0, 3)
      : [];
    const safeNextSteps = Array.isArray(result?.nextSteps)
      ? result.nextSteps.filter(item => typeof item === 'string').slice(0, 3)
      : [];

    const safeRecommendedActions = Array.isArray(result?.recommendedActions)
      ? result.recommendedActions
        .filter(
          item =>
            item &&
            item.type === 'navigate' &&
            typeof item.target === 'string' &&
            allowedTargets.has(item.target) &&
            typeof item.label === 'string'
        )
        .slice(0, 3)
      : [];

    return {
      answer: typeof result?.answer === 'string' && result.answer.trim()
        ? result.answer.trim()
        : '当前系统整体可用，建议先关注告警与高负载节点。',
      riskPoints: safeRiskPoints,
      nextSteps: safeNextSteps,
      recommendedActions: safeRecommendedActions
    };
  }

  buildOverviewQuestionPrompt(question, data) {
    const nodeBrief = data.highLoadNodes.length
      ? data.highLoadNodes
        .map(node => `${node.name}(CPU ${node.cpu.toFixed(1)}%, MEM ${node.memory.toFixed(1)}%, DISK ${node.disk.toFixed(1)}%)`)
        .join('；')
      : '暂无明显高负载节点';

    return `你是一个系统运维分析助手。请基于以下“系统级摘要”回答用户单轮问题。

【系统级摘要】
- 时间: ${data.timestamp}
- 在线节点数: ${data.totalNodes}
- 活动告警数: ${data.activeAlerts}
- 高负载节点: ${nodeBrief}
- 前端提示: ${JSON.stringify(data.clientHints || {})}

【用户问题】
${question}

请返回简洁结果，聚焦：
1) 当前概况总结
2) 2~3 条风险点
3) 1~3 条下一步建议
4) 可选推荐导航动作（只能是受控导航入口）

严格返回 JSON（不要包含额外说明文字）：
{
  "answer": "...",
  "riskPoints": ["...", "..."],
  "nextSteps": ["..."],
  "recommendedActions": [
    { "type": "navigate", "target": "health", "label": "前往系统健康检查" }
  ]
}

target 仅允许: health | trend | recommendations | ai-ops | ai-chat。`;
  }

  // Build follow-up prompt
  buildFollowUpPrompt(question, contextSummary, analysisType) {
    return `你是一个专业的数据分析专家和系统运维顾问。
用户刚刚对一份 [${analysisType}] 分析报告提出了追问。
以下是报告的简要摘要：
'''
${contextSummary}
'''

用户的追问是：
"${question}"

请基于报告摘要直接回答用户的问题。如果问题超出了摘要范围，请利用您的专业知识尽力解答。

返回格式要求：
必须返回 JSON 格式，包含：
1. "answer": 回答内容的字符串（支持 Markdown）。
2. "recommendActions": 可选的数组，包含最多 3 个推荐的操作建议项（如没有则空数组），每项包含：
   - "title": 操作标题（如："执行 Dry Run"）
   - "description": 操作说明

示例:
{
  "answer": "基于您的报告，CPU的上升主要受近期高频跑批任务影响。这是正常且可预期的波动。",
  "recommendActions": [
    {
      "title": "查看任务日志",
      "description": "建议前往任务调度平台检查日志确认是否是日常跑批"
    }
  ]
}`;
  }

  // Build health check prompt
  buildHealthCheckPrompt(data) {
    return `你是一个专业的系统运维专家。请分析以下系统监控数据，提供健康评估和建议。

【系统概况】
- 监控节点: ${data.totalNodes}个
- 在线节点: ${data.onlineNodes}个
- 活动告警: ${data.activeAlerts}个
- 分析时间: ${data.timestamp}

【节点详情】
${data.nodes.map(n => `
节点: ${n.name} (${n.id})
- CPU使用率: ${n.cpu.toFixed(1)}%
- 内存使用率: ${n.memory.toFixed(1)}%
- 磁盘使用率: ${n.disk.toFixed(1)}%
- 状态: ${n.status}
`).join('\n')}

【分析要求】
1. 评估系统整体健康状况（0-100分）
2. 识别关键问题和风险（如果有）
3. 提供具体的优化建议
4. 评估问题的紧急程度

请严格按照以下JSON格式返回结果（不要包含任何其他文字）:
{
  "healthScore": 85,
  "status": "良好",
  "summary": "系统整体运行正常，但有部分节点资源使用率较高",
  "issues": [
    {
      "severity": "warning",
      "node": "node001",
      "metric": "memory_usage",
      "value": 88.5,
      "description": "内存使用率较高，接近阈值"
    }
  ],
  "recommendations": [
    "建议增加node001的内存容量",
    "考虑优化内存密集型应用"
  ],
  "urgency": "medium"
}`;
  }

  // Build trend analysis prompt
  buildTrendAnalysisPrompt(data) {
    const avgCPU = data.metrics.reduce((sum, m) => sum + parseFloat(m.cpu_usage || 0), 0) / data.metrics.length;
    const avgMemory = data.metrics.reduce((sum, m) => sum + parseFloat(m.memory_usage || 0), 0) / data.metrics.length;
    const avgDisk = data.metrics.reduce((sum, m) => sum + parseFloat(m.disk_usage || 0), 0) / data.metrics.length;

    return `你是一个数据分析专家。请分析以下系统性能趋势数据。

【时间范围】
${data.timeRange}

【数据统计】
- 数据点数: ${data.dataPoints}
- 平均CPU使用率: ${avgCPU.toFixed(1)}%
- 平均内存使用率: ${avgMemory.toFixed(1)}%
- 平均磁盘使用率: ${avgDisk.toFixed(1)}%

【分析要求】
1. 识别性能趋势（上升/下降/稳定）
2. 发现周期性模式（如果有）
3. 预测未来趋势
4. 识别异常波动

请严格按照以下JSON格式返回结果（不要包含任何其他文字）:
{
  "trend": "稳定",
  "pattern": "工作日高峰模式",
  "summary": "系统性能整体稳定，工作日9-17点为高峰期",
  "predictions": [
    {
      "metric": "cpu_usage",
      "current": 65.5,
      "predicted30d": 70.2,
      "confidence": "high"
    }
  ],
  "anomalies": [],
  "insights": [
    "CPU使用率呈现轻微上升趋势",
    "建议关注未来30天的资源使用情况"
  ]
}`;
  }

  // Build recommendations prompt
  buildRecommendationsPrompt(data) {
    return `你是一个系统优化专家。请基于以下系统数据提供优化建议。

【系统状态】
- 节点数量: ${data.nodes.length}
- 活动告警: ${data.alerts}
- 告警规则: ${data.alertRules}

【节点资源使用】
${data.nodes.map(n => `
${n.name}: CPU ${n.cpu.toFixed(1)}%, 内存 ${n.memory.toFixed(1)}%, 磁盘 ${n.disk.toFixed(1)}%
`).join('')}

【优化方向】
1. 资源配置优化
2. 性能调优建议
3. 告警规则优化
4. 成本优化建议

请严格按照以下JSON格式返回结果（不要包含任何其他文字）:
{
  "categories": [
    {
      "category": "资源配置",
      "priority": "high",
      "recommendations": [
        {
          "title": "增加内存容量",
          "description": "node001内存使用率持续偏高，建议增加2GB内存",
          "impact": "提升系统稳定性，减少OOM风险",
          "effort": "low"
        }
      ]
    }
  ],
  "quickWins": [
    "清理临时文件释放磁盘空间",
    "优化告警阈值减少误报"
  ],
  "longTerm": [
    "考虑实施自动扩容机制",
    "建立容量规划流程"
  ]
}`;
  }

  // Call LLM API
  async callLLM(prompt) {
    if (this.provider === 'ollama') {
      return await this.callOllama(prompt);
    }
    return await this.callOpenAI(prompt);
  }

  // Call OpenAI API
  async callOpenAI(prompt) {
    try {
      if (!this.openaiClient) {
        throw new Error(`${this.provider} client is not initialized`);
      }

      const response = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的系统运维和数据分析专家。请始终以JSON格式返回分析结果。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error(`${this.provider} API error:`, error.message);
      throw new Error(`${this.provider} API error: ${error.message}`);
    }
  }

  // Call Ollama API
  async callOllama(prompt) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/chat`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的系统运维和数据分析专家。请始终以JSON格式返回分析结果。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          stream: false
        },
        {
          timeout: 120000  // 120秒超时，适应大模型
        }
      );

      return response.data.message.content;
    } catch (error) {
      logger.error('Ollama API error:', error.message);
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }

  // Parse JSON response
  parseJSONResponse(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // If no JSON found, try to parse the whole response
      return JSON.parse(response);
    } catch (error) {
      logger.error('Failed to parse JSON response:', error.message);
      logger.error('Response:', response);
      throw new Error('Failed to parse AI response');
    }
  }
}

module.exports = new AIService();
