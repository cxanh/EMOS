import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type BrowserContext, type Page, type Route } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const clipsDir = path.join(repoRoot, 'video-assets', 'clips');
const shotsDir = path.join(repoRoot, 'video-assets', 'shots');

const FRONTEND_BASE_URL = process.env.EMOS_FRONTEND_URL || 'http://127.0.0.1:5174';
const VIEWPORT = { width: 1600, height: 900 };
const DEMO_NOW = '2026-04-27T09:30:00+08:00';
const DEMO_NOW_ISO = new Date(DEMO_NOW).toISOString();
const DEMO_USER = {
  id: 'user_demo_001',
  username: 'admin',
  role: 'admin',
  email: 'demo@example.com',
  fullName: 'Demo Admin',
};

let actionRequestStatus: 'DRY_RUN_READY' | 'SUCCEEDED' = 'DRY_RUN_READY';

const demoMetrics = {
  'node-001': metricPoint(82.4, 71.8, 63.5, 214_000_000, 92_000_000, 0),
  'node-002': metricPoint(46.2, 58.1, 54.4, 141_000_000, 61_000_000, 1),
  'node-003': metricPoint(32.8, 44.6, 49.3, 88_000_000, 37_000_000, 2),
};

const demoAgents = [
  demoAgent('node-001', 'emos-core-01', '10.10.1.11', 'online', demoMetrics['node-001']),
  demoAgent('node-002', 'emos-edge-02', '10.10.1.12', 'online', demoMetrics['node-002']),
  demoAgent('node-003', 'emos-db-03', '10.10.1.13', 'warning', demoMetrics['node-003']),
];

const demoAlertRules = [
  {
    id: 'rule-cpu-critical',
    name: '核心节点 CPU 高使用率',
    nodeId: 'node-001',
    metric: 'cpu_usage',
    operator: 'gte',
    threshold: 80,
    duration: 60,
    enabled: true,
    notifyChannels: ['websocket', 'email'],
    createdAt: DEMO_NOW_ISO,
    updatedAt: DEMO_NOW_ISO,
  },
  {
    id: 'rule-disk-warning',
    name: '磁盘容量预警',
    nodeId: '*',
    metric: 'disk_usage',
    operator: 'gt',
    threshold: 75,
    duration: 300,
    enabled: true,
    notifyChannels: ['websocket'],
    createdAt: DEMO_NOW_ISO,
    updatedAt: DEMO_NOW_ISO,
  },
];

const demoActiveAlerts = [
  {
    id: 'alert-123',
    ruleId: 'rule-cpu-critical',
    ruleName: '核心节点 CPU 高使用率',
    nodeId: 'node-001',
    nodeName: 'emos-core-01',
    metric: 'cpu_usage',
    currentValue: 86.7,
    threshold: 80,
    status: 'active',
    triggeredAt: DEMO_NOW_ISO,
    resolvedAt: null,
    notified: true,
    message: 'node-001 CPU 连续 3 分钟高于 80%',
  },
  {
    id: 'alert-124',
    ruleId: 'rule-disk-warning',
    ruleName: '磁盘容量预警',
    nodeId: 'node-003',
    nodeName: 'emos-db-03',
    metric: 'disk_usage',
    currentValue: 78.2,
    threshold: 75,
    status: 'active',
    triggeredAt: DEMO_NOW_ISO,
    resolvedAt: null,
    notified: true,
    message: '数据库节点磁盘使用率进入 warning 区间',
  },
];

const demoDryRun = {
  allowed: true,
  riskLevel: 'low',
  warnings: ['该操作仅确认告警，不会修改监控规则或节点配置。'],
  impact: {
    entities: ['alert-123', 'node-001'],
    estimatedDurationSec: 3,
    summary: '确认 CPU 峰值告警，记录 AI 建议与人工确认备注。',
  },
  resolvedParams: {
    eventId: 'alert-123',
    comment: 'AI建议先确认',
    operator: 'Demo Admin',
  },
};

const demoExecutionResult = {
  ok: true,
  eventId: 'alert-123',
  acknowledgedBy: 'admin',
  acknowledgedAt: DEMO_NOW_ISO,
  message: '告警已确认，已写入演示审计日志。',
};

const demoVerificationResult = {
  status: 'pass',
  checks: [
    { name: '告警状态已更新为 ACKNOWLEDGED', status: 'pass' },
    { name: '审计日志包含操作人和备注', status: 'pass' },
    { name: '未触发真实后端副作用', status: 'pass' },
  ],
};

function metricPoint(cpu: number, memory: number, disk: number, rx: number, tx: number, offsetMinutes: number) {
  return {
    cpu_usage: cpu,
    memory_usage: memory,
    disk_usage: disk,
    network_rx_bytes: rx,
    network_tx_bytes: tx,
    timestamp: new Date(new Date(DEMO_NOW).getTime() - offsetMinutes * 60_000).toISOString(),
  };
}

function demoAgent(nodeId: string, hostname: string, ip: string, status: string, latestMetrics: object) {
  return {
    node_id: nodeId,
    hostname,
    display_name: hostname,
    ip,
    status,
    last_heartbeat: DEMO_NOW_ISO,
    registered_at: '2026-04-01T00:00:00.000Z',
    latest_metrics: latestMetrics,
  };
}

function historyMetrics() {
  return Array.from({ length: 18 }, (_, index) => {
    const wave = Math.sin(index / 2) * 7;
    return metricPoint(
      62 + wave + index * 0.9,
      55 + Math.cos(index / 3) * 5,
      58 + index * 0.35,
      120_000_000 + index * 8_000_000,
      54_000_000 + index * 3_000_000,
      18 - index,
    );
  });
}

function jsonResponse(data: unknown) {
  return {
    status: 200,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(data),
  };
}

async function mockApi(route: Route) {
  const request = route.request();
  const url = new URL(request.url());

  if (!url.pathname.startsWith('/api/')) {
    await route.continue();
    return;
  }

  const method = request.method();
  const apiPath = url.pathname.replace(/^\/api/, '');

  if (method === 'GET' && apiPath === '/auth/verify') {
    await route.fulfill(jsonResponse({
      success: true,
      data: {
        valid: true,
        user: {
          user_id: DEMO_USER.id,
          username: DEMO_USER.username,
          role: DEMO_USER.role,
        },
      },
    }));
    return;
  }

  if (method === 'GET' && apiPath === '/agent/list') {
    await route.fulfill(jsonResponse({ success: true, data: { agents: demoAgents, count: demoAgents.length } }));
    return;
  }

  const agentMatch = apiPath.match(/^\/agent\/([^/]+)$/);
  if (method === 'GET' && agentMatch) {
    const agent = demoAgents.find((item) => item.node_id === agentMatch[1]) || demoAgents[0];
    await route.fulfill(jsonResponse({ success: true, data: agent }));
    return;
  }

  if (method === 'GET' && apiPath === '/metrics/nodes') {
    await route.fulfill(jsonResponse({
      success: true,
      data: {
        nodes: demoAgents.map(({ node_id, hostname, ip, status, last_heartbeat }) => ({
          node_id,
          hostname,
          ip,
          status,
          last_heartbeat,
        })),
        count: demoAgents.length,
      },
    }));
    return;
  }

  const latestMetricsMatch = apiPath.match(/^\/metrics\/latest\/([^/]+)$/);
  if (method === 'GET' && latestMetricsMatch) {
    const nodeId = latestMetricsMatch[1];
    await route.fulfill(jsonResponse({
      success: true,
      data: {
        node_id: nodeId,
        metrics: demoMetrics[nodeId as keyof typeof demoMetrics] || demoMetrics['node-001'],
        timestamp: DEMO_NOW_ISO,
      },
    }));
    return;
  }

  const statsMatch = apiPath.match(/^\/metrics\/stats\/([^/]+)$/);
  if (method === 'GET' && statsMatch) {
    await route.fulfill(jsonResponse({
      success: true,
      data: {
        node_id: statsMatch[1],
        period: url.searchParams.get('period') || '1h',
        stats: {
          cpu: { avg: 68.4, max: 86.7, min: 42.1 },
          memory: { avg: 57.8, max: 72.4, min: 39.2 },
          disk: { avg: 61.2, max: 78.2, min: 48.5 },
        },
        data_points: 18,
      },
    }));
    return;
  }

  if (method === 'GET' && apiPath === '/metrics/history') {
    const nodeId = url.searchParams.get('nodeId') || 'node-001';
    const metrics = historyMetrics();
    await route.fulfill(jsonResponse({
      success: true,
      data: {
        node_id: nodeId,
        start_time: metrics[0].timestamp,
        end_time: metrics.at(-1)?.timestamp,
        interval: url.searchParams.get('interval') || '1m',
        metrics,
        count: metrics.length,
      },
    }));
    return;
  }

  if (method === 'GET' && apiPath === '/alert/rules') {
    await route.fulfill(jsonResponse({ success: true, data: { rules: demoAlertRules, count: demoAlertRules.length } }));
    return;
  }

  if (method === 'GET' && apiPath === '/alert/events/active') {
    await route.fulfill(jsonResponse({ success: true, data: { events: demoActiveAlerts, count: demoActiveAlerts.length } }));
    return;
  }

  if (method === 'GET' && apiPath === '/alert/events/history') {
    await route.fulfill(jsonResponse({ success: true, data: { events: demoActiveAlerts, count: demoActiveAlerts.length } }));
    return;
  }

  if (method === 'GET' && apiPath === '/alert/status') {
    await route.fulfill(jsonResponse({ success: true, data: { running: true, activeAlerts: demoActiveAlerts.length, checkInterval: 30 } }));
    return;
  }

  if (method === 'GET' && apiPath === '/alert/notifications') {
    await route.fulfill(jsonResponse({
      success: true,
      data: {
        logs: demoActiveAlerts.map((alert, index) => ({
          id: `notif-${index + 1}`,
          eventId: alert.id,
          ruleName: alert.ruleName,
          nodeId: alert.nodeId,
          nodeName: alert.nodeName,
          timestamp: DEMO_NOW_ISO,
          channels: [
            { type: 'websocket', status: 'success', sentAt: DEMO_NOW_ISO },
            { type: 'email', status: index === 0 ? 'success' : 'failed', error: index === 0 ? undefined : '演示邮箱不可达', sentAt: DEMO_NOW_ISO },
          ],
        })),
        count: demoActiveAlerts.length,
      },
    }));
    return;
  }

  if (method === 'GET' && apiPath === '/alert/notifications/stats/summary') {
    await route.fulfill(jsonResponse({
      success: true,
      data: {
        total: 6,
        byChannel: { websocket: 3, email: 2, dingtalk: 1 },
        byStatus: { success: 5, failed: 1 },
        byNode: {
          'node-001': { nodeId: 'node-001', nodeName: 'emos-core-01', count: 4 },
          'node-003': { nodeId: 'node-003', nodeName: 'emos-db-03', count: 2 },
        },
      },
    }));
    return;
  }

  await mockAiApi(route, method, apiPath);
}

async function mockAiApi(route: Route, method: string, apiPath: string) {
  if (method === 'GET' && apiPath === '/ai/status') {
    await route.fulfill(jsonResponse({ success: true, data: { enabled: true, provider: 'OpenAI', model: 'gpt-5-demo' } }));
    return;
  }

  if (method === 'POST' && apiPath === '/ai/analyze/health') {
    await route.fulfill(jsonResponse({
      success: true,
      data: {
        healthScore: 86,
        status: 'good',
        summary: '当前 EMOS 集群总体稳定，node-001 在过去 24 小时出现短时 CPU 峰值，建议先确认告警并持续观察。',
        issues: [
          { severity: 'warning', node: 'node-001', metric: 'cpu', value: 82.4, description: '业务高峰期间 CPU 使用率升高。' },
          { severity: 'info', node: 'node-002', metric: 'memory', value: 58.1, description: '内存使用率平稳。' },
        ],
        recommendations: ['先确认 alert-123。', '继续观察 24 小时趋势。', '必要时进入 AI Ops 执行 dry-run。'],
        urgency: 'medium',
        analyzedAt: DEMO_NOW_ISO,
      },
    }));
    return;
  }

  if (method === 'POST' && apiPath === '/ai/analyze/overview-question') {
    await route.fulfill(jsonResponse({
      success: true,
      data: {
        answer: '当前主要风险集中在 node-001 的 CPU 峰值告警，建议先执行低风险确认动作，再跟踪 24 小时趋势。',
        riskPoints: ['node-001 CPU 峰值', 'alert-123 未确认', '夜间批处理窗口即将开始'],
        nextSteps: ['确认告警', '保留上下文进入 AI Chat', '必要时创建事件时间线备注'],
        recommendedActions: [
          { type: 'navigate', target: 'ai-chat', label: '进入 AI Chat 深入分析' },
          { type: 'navigate', target: 'ai-ops', label: '运行 AI Ops dry-run' },
        ],
        analyzedAt: DEMO_NOW_ISO,
      },
    }));
    return;
  }

  if (method === 'POST' && apiPath === '/ai/v2/chat/sessions') {
    await route.fulfill(jsonResponse({
      success: true,
      data: {
        sessionId: 'chat_demo_001',
        context: {
          nodeId: 'node-001',
          incidentId: 'incident-001',
          timeRange: '24h',
          summary: 'node-001 在 24 小时窗口内出现 CPU 峰值告警 alert-123。',
        },
        message: demoChatMessage(),
      },
    }));
    return;
  }

  if (method === 'GET' && apiPath === '/ai/v2/chat/sessions') {
    await route.fulfill(jsonResponse({ success: true, data: { sessions: [demoChatSession()] } }));
    return;
  }

  if (method === 'GET' && apiPath === '/ai/v2/chat/sessions/chat_demo_001') {
    await route.fulfill(jsonResponse({ success: true, data: demoChatSession() }));
    return;
  }

  if (method === 'GET' && apiPath === '/ai/v2/chat/sessions/chat_demo_001/messages') {
    await route.fulfill(jsonResponse({ success: true, data: { sessionId: 'chat_demo_001', messages: [demoChatMessage()] } }));
    return;
  }

  if (method === 'POST' && apiPath === '/ai/v2/action-requests') {
    actionRequestStatus = 'DRY_RUN_READY';
    await route.fulfill(jsonResponse({ success: true, data: { requestId: 'actreq_demo_001', status: 'DRY_RUN_READY', dryRun: demoDryRun } }));
    return;
  }

  if (method === 'POST' && apiPath === '/ai/v2/action-requests/actreq_demo_001/confirm') {
    actionRequestStatus = 'SUCCEEDED';
    await route.fulfill(jsonResponse({ success: true, data: { requestId: 'actreq_demo_001', status: 'SUCCEEDED' } }));
    return;
  }

  if (method === 'GET' && apiPath === '/ai/v2/action-requests/actreq_demo_001') {
    await route.fulfill(jsonResponse({ success: true, data: demoActionRequest() }));
    return;
  }

  if (method === 'GET' && apiPath === '/ai/v2/action-requests/actreq_demo_001/timeline') {
    await route.fulfill(jsonResponse({ success: true, data: demoTimeline() }));
    return;
  }

  await route.fulfill(jsonResponse({ success: true, data: {}, message: `Unhandled demo mock for ${method} ${apiPath}` }));
}

function demoChatSession() {
  return {
    sessionId: 'chat_demo_001',
    userId: 'user_demo_001',
    nodeId: 'node-001',
    incidentId: 'incident-001',
    timeRange: '24h',
    title: 'node-001 CPU 峰值告警分析',
    messageCount: 1,
    createdAt: DEMO_NOW_ISO,
    updatedAt: DEMO_NOW_ISO,
    status: 'active',
  };
}

function demoChatMessage() {
  return {
    messageId: 'msg_demo_001',
    role: 'assistant',
    question: '请分析 node-001 当前风险',
    answer: 'node-001 当前风险为中等：CPU 峰值已经触发 alert-123，但内存、磁盘和网络指标未出现联动异常。建议先确认告警并保留 24 小时趋势观察窗口。',
    conclusion: {
      summary: '风险可控，优先确认告警并观察趋势。',
      riskLevel: 'medium',
      keyFindings: ['CPU 峰值集中在业务高峰', '未发现磁盘和内存联动异常', '告警尚未确认'],
      affectedEntities: ['node-001', 'incident-001', 'alert-123'],
    },
    recommendedActions: [
      {
        actionClass: 'platform_action',
        actionId: 'acknowledge_alert',
        title: '确认告警事件',
        reason: '该动作风险低，可减少重复告警噪声并记录处理上下文。',
        riskLevel: 'low',
        prefillParams: { eventId: 'alert-123', comment: 'AI建议先确认' },
      },
    ],
    createdAt: DEMO_NOW_ISO,
  };
}

function demoActionRequest() {
  return {
    requestId: 'actreq_demo_001',
    traceId: 'trace_demo_001',
    actionClass: 'platform_action',
    actionId: 'acknowledge_alert',
    idempotencyKey: 'idem_demo_001',
    status: actionRequestStatus,
    params: { eventId: 'alert-123', comment: 'AI建议先确认' },
    incidentId: 'incident-001',
    actorId: 'user_demo_001',
    actorRole: 'admin',
    dryRunResult: demoDryRun,
    resolvedParams: demoDryRun.resolvedParams,
    executionResult: actionRequestStatus === 'SUCCEEDED' ? demoExecutionResult : null,
    verificationResult: actionRequestStatus === 'SUCCEEDED' ? demoVerificationResult : null,
    error: null,
    createdAt: DEMO_NOW_ISO,
    updatedAt: DEMO_NOW_ISO,
  };
}

function demoTimeline() {
  return {
    requestId: 'actreq_demo_001',
    events: [
      timelineEvent('ACTION_REQUESTED', '', 'REQUESTED', null),
      timelineEvent('ACTION_DRY_RUN_COMPLETED', 'REQUESTED', 'DRY_RUN_READY', demoDryRun),
      ...(actionRequestStatus === 'SUCCEEDED'
        ? [
          timelineEvent('ACTION_CONFIRMED', 'DRY_RUN_READY', 'CONFIRMED', demoDryRun),
          timelineEvent('ACTION_EXECUTION_COMPLETED', 'CONFIRMED', 'VERIFYING', demoDryRun),
          timelineEvent('ACTION_VERIFICATION_COMPLETED', 'VERIFYING', 'SUCCEEDED', demoDryRun),
        ]
        : []),
    ],
  };
}

function timelineEvent(eventType: string, statusFrom: string, statusTo: string, dryRunResult: unknown) {
  return {
    requestId: 'actreq_demo_001',
    traceId: 'trace_demo_001',
    eventType,
    timestamp: DEMO_NOW_ISO,
    actorType: 'user',
    actorId: 'user_demo_001',
    actorRole: 'admin',
    actionClass: 'platform_action',
    actionId: 'acknowledge_alert',
    incidentId: 'incident-001',
    statusFrom,
    statusTo,
    riskLevel: 'low',
    dryRunResult,
    resolvedParams: demoDryRun.resolvedParams,
    error: null,
  };
}

async function installContext(context: BrowserContext) {
  await context.addInitScript({
    content: `
      var __name = globalThis.__name || function(target, value) {
        try {
          if (value && (typeof target === 'function' || typeof target === 'object')) {
            Object.defineProperty(target, 'name', { value: value, configurable: true });
          }
        } catch (_) {}
        return target;
      };
      globalThis.__name = __name;
    `,
  });

  await context.addInitScript(({ user, metrics }) => {
    localStorage.setItem('token', 'demo-token');
    localStorage.setItem('user', JSON.stringify(user));

    class DemoWebSocket extends EventTarget {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      url: string;
      readyState = DemoWebSocket.CONNECTING;
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      private timer: number | null = null;

      constructor(url: string) {
        super();
        this.url = url;
        window.setTimeout(() => this.open(), 80);
      }

      private open() {
        this.readyState = DemoWebSocket.OPEN;
        const event = new Event('open');
        this.dispatchEvent(event);
        this.onopen?.(event);
        this.emit({ type: 'connected', message: 'demo websocket connected' });
        let tick = 0;
        this.timer = window.setInterval(() => {
          tick += 1;
          Object.entries(metrics).forEach(([node_id, data]) => {
            const nextData = { ...(data as Record<string, number | string>) };
            nextData.cpu_usage = Number(nextData.cpu_usage) + (tick % 3);
            nextData.memory_usage = Number(nextData.memory_usage) + (tick % 2);
            this.emit({ type: 'metrics', node_id, data: nextData, timestamp: new Date().toISOString() });
          });
        }, 700);
      }

      private emit(payload: unknown) {
        const event = new MessageEvent('message', { data: JSON.stringify(payload) });
        this.dispatchEvent(event);
        this.onmessage?.(event);
      }

      send(data: string) {
        if (String(data).includes('ping')) {
          this.emit({ type: 'pong' });
        }
      }

      get onclose() {
        return null;
      }

      set onclose(_handler: ((event: CloseEvent) => void) | null) {
        // Suppress app-level reconnect loops during scripted page teardown.
      }

      close() {
        this.readyState = DemoWebSocket.CLOSED;
        if (this.timer) {
          window.clearInterval(this.timer);
        }
      }
    }

    Object.defineProperty(window, 'WebSocket', { value: DemoWebSocket, configurable: true });
  }, { user: DEMO_USER, metrics: demoMetrics });

  await context.route('**/*', mockApi);
}

function appUrl(pathname: string) {
  const base = FRONTEND_BASE_URL.replace(/\/+$/, '');
  const suffix = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${suffix}`;
}

async function waitForMainContent(page: Page, pathname: string) {
  const expected = mainContentPattern(pathname);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const matched = await page
      .locator('main.main-content')
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(async () => {
        await page.waitForFunction(
          ({ pattern }) => {
            const main = document.querySelector('main.main-content');
            const text = main?.textContent || '';
            return text.trim().length > 8 && (!pattern || new RegExp(pattern).test(text));
          },
          { pattern: expected?.source || '' },
          { timeout: 6000 },
        );
        return true;
      })
      .catch(() => false);

    if (matched) {
      return true;
    }

    if (attempt < 2) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => undefined);
    }
  }

  console.warn(`[capture warning] main content did not become ready for ${pathname}; capturing current page.`);
  return false;
}

function mainContentPattern(pathname: string) {
  if (pathname.startsWith('/dashboard')) return /系统监控面板|节点列表|CPU/;
  if (pathname.startsWith('/history')) return /历史数据查询|查询数据|平均 CPU/;
  if (pathname.startsWith('/alert')) return /告警管理|活动告警|告警规则/;
  if (pathname.startsWith('/ai-chat-analysis')) return /AI 运维分析|工作台|请输入|AI 回复/;
  if (pathname.startsWith('/ai-ops-assistant')) return /AI 操作助手|Dry-Run|推荐动作/;
  return undefined;
}

async function gotoApp(page: Page, pathname: string) {
  await page.goto(appUrl(pathname), { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await waitForMainContent(page, pathname);
}

async function clickIfAvailable(page: Page, selector: string, timeout = 1800) {
  const locator = page.locator(selector).first();
  try {
    await locator.waitFor({ state: 'visible', timeout });
    await locator.click({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function fillIfAvailable(page: Page, selector: string, value: string, timeout = 1800) {
  const locator = page.locator(selector).first();
  try {
    await locator.waitFor({ state: 'visible', timeout });
    await locator.fill(value, { timeout });
    return true;
  } catch {
    return false;
  }
}

async function screenshot(page: Page, fileName: string) {
  const target = path.join(shotsDir, fileName);
  await page.screenshot({ path: target, fullPage: true });
  console.log(`Generated ${path.relative(repoRoot, target)}`);
}

async function runClip(browser: Browser, clipName: string, action: (page: Page) => Promise<void>) {
  const target = path.join(clipsDir, clipName);
  const tempDir = path.join(clipsDir, `.tmp-${path.basename(clipName, '.webm')}`);
  rmSync(tempDir, { recursive: true, force: true });
  mkdirSync(tempDir, { recursive: true });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: {
      dir: tempDir,
      size: VIEWPORT,
    },
  });
  await installContext(context);

  const page = await context.newPage();
  page.on('console', (msg) => {
    const text = msg.text();
    if (
      text.includes('WebSocket closed')
      || text.includes('Reconnecting in')
      || text.includes('Attempting to reconnect')
    ) {
      return;
    }
    console.log(`[browser console:${msg.type()}]`, text);
  });

  page.on('pageerror', (err) => {
    if (err.message.includes('__name is not defined')) {
      return;
    }
    console.error('[browser pageerror]', err.message);
  });

  page.on('requestfailed', (request) => {
    console.error('[request failed]', request.method(), request.url(), request.failure()?.errorText);
  });

  page.on('response', async (response) => {
    const status = response.status();
    const url = response.url();

    if (status >= 400) {
      console.error('[bad response]', status, url);
    }
  });
  page.setDefaultTimeout(5000);
  const video = page.video();

  try {
    await action(page);
    await page.waitForTimeout(900);
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
  }

  const source = await video?.path();
  if (!source) {
    throw new Error(`No video was recorded for ${clipName}`);
  }

  if (existsSync(target)) {
    rmSync(target, { force: true });
  }
  renameSync(source, target);
  rmSync(tempDir, { recursive: true, force: true });
  console.log(`Generated ${path.relative(repoRoot, target)}`);
}

async function captureDashboard(page: Page) {
  await gotoApp(page, '/dashboard');
  await screenshot(page, '01-dashboard-overview.png');
  await page.mouse.wheel(0, 360);
  await page.waitForTimeout(700);
  await screenshot(page, '01-dashboard-metrics.png');
}

async function captureNodesMonitoring(page: Page) {
  await gotoApp(page, '/dashboard');
  await clickIfAvailable(page, '.node-card');
  await screenshot(page, '02-nodes-list.png');
  await clickIfAvailable(page, '.node-card:nth-child(2)');
  await page.waitForTimeout(700);
  await screenshot(page, '02-nodes-selected.png');
}

async function captureVisualization(page: Page) {
  await gotoApp(page, '/history');
  await page.locator('select').first().selectOption('node-001').catch(() => undefined);
  await clickIfAvailable(page, '.query-btn');
  await page.waitForTimeout(1400);
  await screenshot(page, '03-visualization-history-charts.png');
  await page.mouse.wheel(0, 620);
  await page.waitForTimeout(700);
  await screenshot(page, '03-visualization-history-table.png');
}

async function captureAlerts(page: Page) {
  await gotoApp(page, '/alert');
  await screenshot(page, '04-alerts-active.png');
  await clickIfAvailable(page, '.tab:nth-child(2)');
  await page.waitForTimeout(700);
  await screenshot(page, '04-alerts-rules.png');
  await clickIfAvailable(page, '.tab:nth-child(3)');
  await page.waitForTimeout(1000);
  await screenshot(page, '04-alerts-notifications.png');
}

async function captureAIChat(page: Page) {
  await gotoApp(page, '/ai-chat-analysis?nodeId=node-001&incidentId=incident-001&timeRange=24h');
  await fillIfAvailable(page, 'textarea', '请分析 node-001 当前风险');
  await clickIfAvailable(page, '.btn-send');
  await page.waitForURL(/sessionId=chat_demo_001/, { timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(1200);
  await screenshot(page, '05-ai-chat-answer.png');
}

async function captureAIOps(page: Page) {
  actionRequestStatus = 'DRY_RUN_READY';
  await gotoApp(page, '/ai-ops-assistant?actionId=acknowledge_alert&eventId=alert-123&comment=AI建议先确认');
  await clickIfAvailable(page, 'form button[type="submit"]');
  await page.waitForTimeout(1000);
  await screenshot(page, '06-ai-ops-dryrun.png');
  await clickIfAvailable(page, '.actions .btn-primary');
  await page.waitForTimeout(1600);
  await screenshot(page, '06-ai-ops-result-timeline.png');
}

async function main() {
  mkdirSync(clipsDir, { recursive: true });
  mkdirSync(shotsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    await runClip(browser, '01-dashboard.webm', captureDashboard);
    await runClip(browser, '02-nodes-monitoring.webm', captureNodesMonitoring);
    await runClip(browser, '03-visualization.webm', captureVisualization);
    await runClip(browser, '04-alerts.webm', captureAlerts);
    await runClip(browser, '05-ai-chat.webm', captureAIChat);
    await runClip(browser, '06-ai-ops.webm', captureAIOps);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
