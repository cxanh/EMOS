const axios = require('axios');
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
    this.enabled = false;
  }

  // Initialize AI service
  initialize() {
    try {
      this.provider = process.env.LLM_PROVIDER || 'openai';
      
      if (this.provider === 'openai') {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.model = process.env.OPENAI_MODEL || 'gpt-4';
        this.baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
        
        if (!this.apiKey) {
          logger.warn('OpenAI API key not configured');
          this.enabled = false;
          return;
        }
      } else if (this.provider === 'ollama') {
        this.baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.model = process.env.OLLAMA_MODEL || 'llama2';
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
      const metrics = await influxClient.queryMetrics({
        nodeId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      });

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
    if (this.provider === 'openai') {
      return await this.callOpenAI(prompt);
    } else if (this.provider === 'ollama') {
      return await this.callOllama(prompt);
    }
    throw new Error(`Unsupported LLM provider: ${this.provider}`);
  }

  // Call OpenAI API
  async callOpenAI(prompt) {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
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
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error('OpenAI API error:', error.message);
      throw new Error(`OpenAI API error: ${error.message}`);
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
