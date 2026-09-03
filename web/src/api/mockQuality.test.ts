import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mockApi } from './mock';

const ALL_ROUTE_TYPES = ['fta', 'skill', 'rag', 'code_analysis', 'multi', 'direct'];

const readPage = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8');

describe('mock 数据质量 · Traces', () => {
  it('getTraces 返回 ≥12 条且覆盖全部 6 种路由类型与 3 种状态', async () => {
    const { traces } = await mockApi.getTraces();
    expect(traces.length).toBeGreaterThanOrEqual(12);
    for (const rt of ALL_ROUTE_TYPES) {
      expect(traces.some((t) => t.route_type === rt), `缺少路由类型 ${rt}`).toBe(true);
    }
    for (const st of ['success', 'failed', 'timeout'] as const) {
      expect(traces.some((t) => t.status === st), `缺少状态 ${st}`).toBe(true);
    }
  });

  it('时间戳统一收敛在 2026-08-25 ~ 08-31 演示窗口', async () => {
    const { traces } = await mockApi.getTraces();
    expect(traces.length).toBeGreaterThan(0);
    for (const t of traces) {
      expect(t.timestamp >= '2026-08-25', `${t.id} 时间戳过早: ${t.timestamp}`).toBe(true);
      expect(t.timestamp < '2026-09-01', `${t.id} 时间戳过晚: ${t.timestamp}`).toBe(true);
    }
  });

  it('ID 唯一且延迟按路由类型拟真分层（direct < rag < fta）', async () => {
    const { traces } = await mockApi.getTraces();
    expect(new Set(traces.map((t) => t.id)).size).toBe(traces.length);
    const avg = (rt: string) => {
      const xs = traces.filter((t) => t.route_type === rt);
      return xs.reduce((s, t) => s + t.latency_ms, 0) / xs.length;
    };
    expect(avg('direct')).toBeLessThan(avg('rag'));
    expect(avg('rag')).toBeLessThan(avg('fta'));
  });

  it('每条 trace 带有场景化决策理由', async () => {
    const { traces } = await mockApi.getTraces();
    for (const t of traces) {
      expect(t.reasoning.length).toBeGreaterThan(8);
      expect(t.input.length).toBeGreaterThan(4);
    }
  });
});

describe('mock 数据质量 · Monitoring', () => {
  it('getMonitoringOverview 五组数据完整、时间线统一 2026-08', async () => {
    const ov = await mockApi.getMonitoringOverview();
    expect(ov.alerts.length).toBeGreaterThanOrEqual(5);
    expect(ov.system_metrics.length).toBe(6);
    expect(ov.feedback_signals.length).toBeGreaterThanOrEqual(7);
    expect(ov.circuit_breakers.length).toBe(5);
    expect(ov.adaptive_weights.length).toBe(4);
    const stamps = [
      ...ov.alerts.map((a) => a.created_at),
      ...ov.feedback_signals.map((f) => f.last_seen),
      ...ov.circuit_breakers.map((c) => c.last_state_change),
    ];
    for (const s of stamps) {
      expect(s.startsWith('2026-08'), `时间线未统一: ${s}`).toBe(true);
    }
  });

  it('告警覆盖全部 4 档 severity 且关联 agent 标识', async () => {
    const ov = await mockApi.getMonitoringOverview();
    for (const sev of ['critical', 'high', 'medium', 'low'] as const) {
      expect(ov.alerts.some((a) => a.severity === sev), `缺少 ${sev}`).toBe(true);
    }
    expect(ov.alerts.every((a) => a.agent_id && a.agent_name)).toBe(true);
  });

  it('熔断器状态覆盖 closed/half_open/open 三态', async () => {
    const ov = await mockApi.getMonitoringOverview();
    for (const st of ['closed', 'half_open', 'open'] as const) {
      expect(ov.circuit_breakers.some((c) => c.state === st), `缺少 ${st}`).toBe(true);
    }
  });
});

describe('mock 数据质量 · 协作与权限', () => {
  it('协作会话扩到 5 条、模式与状态多样', async () => {
    const { sessions } = await mockApi.listCollaborationSessions();
    expect(sessions.length).toBe(5);
    expect(new Set(sessions.map((s) => s.pattern)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(sessions.map((s) => s.status)).size).toBeGreaterThanOrEqual(3);
    expect(sessions.every((s) => s.agents.length >= 2)).toBe(true);
  });

  it('访问规则覆盖全部 4 种角色', async () => {
    const { rules } = await mockApi.listAccessRules('agent-mega-001');
    expect(rules.length).toBe(4);
    for (const role of ['viewer', 'operator', 'developer', 'admin'] as const) {
      expect(rules.some((r) => r.role === role), `缺少角色 ${role}`).toBe(true);
    }
  });
});

describe('mock 数据质量 · Analytics 差异化', () => {
  it('不同类型 Agent 的 timeline/分位数/错误列表各不相同', async () => {
    const [mega, fta, rag] = await Promise.all([
      mockApi.getAgentAnalytics('agent-mega-001', '7d'),
      mockApi.getAgentAnalytics('agent-fta-002', '7d'),
      mockApi.getAgentAnalytics('agent-rag-003', '7d'),
    ]);
    expect(mega.latency_percentiles.p99).not.toBe(fta.latency_percentiles.p99);
    expect(mega.execution_timeline).not.toEqual(fta.execution_timeline);
    expect(rag.latency_percentiles.p50).not.toBe(mega.latency_percentiles.p50);
    expect(mega.top_errors.map((e) => e.error_type)).not.toEqual(rag.top_errors.map((e) => e.error_type));
  });
});

describe('mock 数据质量 · Dashboard', () => {
  it('getDashboardMetrics 提供 today_tickets/change_approvals 且 24h 趋势完整', async () => {
    const m = await mockApi.getDashboardMetrics();
    expect(m.today_tickets).toBeGreaterThan(0);
    expect(m.change_approvals).toBeGreaterThan(0);
    expect(m.skill_executions).toBeGreaterThan(0);
    expect(['up', 'down', 'flat']).toContain(m.ticket_trend.direction);
    expect(m.execution_trend_24h).toHaveLength(24);
  });

  it('Agent 概览最后执行时间统一 2026-08 且与停用 Agent 告警口径一致', async () => {
    const { agents } = await mockApi.getAgentOverviews();
    expect(agents.length).toBeGreaterThanOrEqual(7);
    for (const a of agents) {
      expect(a.last_execution_at.startsWith('2026-08'), `${a.id} 最后执行时间未统一: ${a.last_execution_at}`).toBe(true);
      expect(a.memory_mb).toBeGreaterThanOrEqual(0);
    }
    // alert-006 文案为相对口径「空闲超过 48 小时」，演示"现在"约 2026-08-31，与 2026-08-29T14:20 的最后执行时间一致
    const stopped = agents.find((a) => a.id === 'agent-custom-005');
    expect(stopped?.last_execution_at).toBe('2026-08-29T14:20:00Z');
  });

  it('活动事件时间戳收敛演示窗口（长期停用类事件除外）', async () => {
    const { events } = await mockApi.getActivityEvents();
    for (const e of events) {
      if (e.event_type === 'status_change') continue;
      expect(e.timestamp >= '2026-08-25', `${e.id} 过早: ${e.timestamp}`).toBe(true);
      expect(e.timestamp < '2026-09-01', `${e.id} 过晚: ${e.timestamp}`).toBe(true);
    }
  });

  it('平台状态 last_sync_at 落在演示窗口内', async () => {
    const s = await mockApi.getPlatformStatus();
    expect(s.last_sync_at >= '2026-08-25').toBe(true);
    expect(s.last_sync_at < '2026-09-01').toBe(true);
  });

  it('执行统计 P99/平均耗时与路由置信度字段可用于渲染', async () => {
    const s = await mockApi.getExecutionStats();
    expect(s.p99_duration_ms).toBeGreaterThan(s.avg_duration_ms);
    expect(s.by_route_type.every((r) => r.avg_confidence > 0 && r.avg_confidence <= 1)).toBe(true);
    expect(s.by_hour.every((h) => h.success_count + h.failed_count === h.count)).toBe(true);
  });
});

describe('页面源码去假化回归', () => {

  it('Dashboard 页面不再写死 P99/版本号/commit/旧时间锚点', () => {
    const src = readPage('../pages/Dashboard/index.tsx');
    expect(src, 'P99 耗时写死').not.toMatch(/25\.1s/);
    expect(src, '版本号写死').not.toMatch(/v0\.6\.0/);
    expect(src, 'commit 写死').not.toMatch(/a3f7c2e/);
    expect(src, '旧时间锚点写死').not.toMatch(/2026-04-08/);
  });

  it('Monitoring 页面不再写死可用性/拦截率，且具备确认交互与 Agent 跳转', () => {
    const src = readPage('../pages/Monitoring/index.tsx');
    expect(src, '系统可用性写死').not.toMatch(/99\.2%/);
    expect(src, '安全拦截率写死').not.toContain('value="100%"');
    expect(src, '缺少相对时间 formatTimeAgo').toMatch(/formatTimeAgo/);
    expect(src, '缺少 Agent 跳转 useNavigate').toMatch(/useNavigate/);
    expect(src, '缺少本地确认状态 ackedIds').toMatch(/ackedIds/);
    expect(src, '确认按钮未绑定 onClick').toMatch(/onClick=\{.*确认|确认.*onClick/s);
  });
});

describe('mock 数据质量 · 全站时间线统一', () => {
  it('关键端点不再出现 2026-01~05 旧时间戳', async () => {
    const [alerts, overview, analytics, tickets] = await Promise.all([
      mockApi.getAlerts(),
      mockApi.getMonitoringOverview(),
      mockApi.getAgentAnalytics('agent-mega-001', '7d'),
      mockApi.listTickets(),
    ]);
    const stamps = [
      ...alerts.alerts.map((a) => a.created_at),
      ...overview.feedback_signals.map((f) => f.last_seen),
      ...analytics.top_errors.map((e) => e.last_seen),
      ...tickets.tickets.map((t) => t.created_at),
    ];
    for (const s of stamps) {
      expect(s, `残留旧时间戳: ${s}`).not.toMatch(/2026-0[1-5]-/);
    }
  });

  it('工单 ID 年份与演示时间线一致（INC-2026）', async () => {
    const { tickets } = await mockApi.listTickets();
    expect(tickets.length).toBeGreaterThan(0);
    for (const t of tickets) {
      if (t.id.startsWith('INC-')) {
        expect(t.id.startsWith('INC-2026'), `工单 ${t.id} 年份未统一`).toBe(true);
      }
    }
  });
});

describe('mock 数据质量 · Monitoring', () => {
  it('系统指标状态有 normal 也有非 normal（健康率可计算）', async () => {
    const { system_metrics } = await mockApi.getMonitoringOverview();
    expect(system_metrics.length).toBeGreaterThanOrEqual(4);
    const statuses = new Set(system_metrics.map((m) => m.status));
    expect(statuses.has('normal'), '缺少正常指标').toBe(true);
    expect(statuses.size).toBeGreaterThan(1);
  });

  it('熔断器既有 closed 也有非 closed 状态，failures ≤ threshold', async () => {
    const { circuit_breakers } = await mockApi.getMonitoringOverview();
    expect(circuit_breakers.length).toBeGreaterThanOrEqual(3);
    const states = new Set(circuit_breakers.map((c) => c.state));
    expect(states.has('closed'), '缺少 closed 熔断器').toBe(true);
    expect(states.size).toBeGreaterThan(1);
    for (const c of circuit_breakers) {
      expect(c.failures).toBeLessThanOrEqual(c.threshold);
    }
  });

  it('告警列表 acknowledged 有 true 也有 false（确认交互可演示）', async () => {
    const { alerts } = await mockApi.getMonitoringOverview();
    expect(alerts.length).toBeGreaterThanOrEqual(4);
    expect(alerts.some((a) => a.acknowledged), '缺少已确认告警').toBe(true);
    expect(alerts.some((a) => !a.acknowledged), '缺少未确认告警').toBe(true);
  });

  it('MonitoringOverview.total 与 alerts 数量一致，反馈信号落在演示窗口', async () => {
    const overview = await mockApi.getMonitoringOverview();
    expect(overview.total).toBe(overview.alerts.length);
    for (const f of overview.feedback_signals) {
      expect(f.last_seen.startsWith('2026-08-31'), `反馈信号时间越界: ${f.last_seen}`).toBe(true);
    }
  });
});

describe('mock 数据质量 · ExecutionDetail 深度差异化', () => {

  it('不同 route_type 的 pipeline_trace 差异化：intent_type 随路由变化、strategy 多样', async () => {
    const multi = await mockApi.getAgentExecutionDetail('agent-mega-001', 'aexec-001');
    const fta = await mockApi.getAgentExecutionDetail('agent-fta-002', 'aexec-005');
    const rag = await mockApi.getAgentExecutionDetail('agent-rag-003', 'aexec-008');
    const skill = await mockApi.getAgentExecutionDetail('agent-skill-004', 'aexec-011');
    expect(multi.pipeline_trace?.intent.intent_type).toBe('multi');
    expect(fta.pipeline_trace?.intent.intent_type).toBe('workflow');
    expect(rag.pipeline_trace?.intent.intent_type).toBe('rag');
    expect(skill.pipeline_trace?.intent.intent_type).toBe('skill');
    const strategies = new Set([multi, fta, rag, skill].map((d) => d.pipeline_trace?.strategy));
    expect(strategies.size, 'strategy 应至少出现两种').toBeGreaterThanOrEqual(2);
  });

  it('multi 带 chain 子决策，rag 带语料命中，direct 代码审查带 code_context', async () => {
    const multi = await mockApi.getAgentExecutionDetail('agent-mega-001', 'aexec-001');
    expect(multi.pipeline_trace?.decision.chain?.length, 'multi 缺少 chain 子决策').toBeGreaterThanOrEqual(2);
    const rag = await mockApi.getAgentExecutionDetail('agent-rag-003', 'aexec-008');
    const corpora = rag.pipeline_trace?.enriched_context.rag_collections ?? [];
    expect(corpora.length, 'rag 路由缺少语料命中').toBeGreaterThan(0);
    for (const c of corpora) {
      expect(c.matched_keywords.length, `语料 ${c.collection_id} 缺少匹配关键词`).toBeGreaterThan(0);
      expect(c.relevance_score, `语料 ${c.collection_id} 缺少相关度`).toBeGreaterThan(0);
    }
    const direct = await mockApi.getAgentExecutionDetail('agent-mega-001', 'aexec-004');
    expect(direct.pipeline_trace?.enriched_context.code_context?.has_code_blocks, 'HPA 审查应识别代码上下文').toBe(true);
  });

  it('意图实体从输入提取、子意图与决策参数填实', async () => {
    const multi = await mockApi.getAgentExecutionDetail('agent-mega-001', 'aexec-001');
    expect(multi.pipeline_trace?.intent.entities.length, '缺少意图实体').toBeGreaterThan(0);
    expect(multi.pipeline_trace?.intent.sub_intents.length, 'multi 缺少子意图').toBeGreaterThan(0);
    expect(Object.keys(multi.pipeline_trace?.decision.parameters ?? {}).length, '缺少决策参数').toBeGreaterThan(0);
    const skill = await mockApi.getAgentExecutionDetail('agent-skill-004', 'aexec-011');
    expect(skill.pipeline_trace?.intent.entities.some((e) => e.startsWith('INC-')), '工单实体未提取').toBe(true);
  });

  it('hook_logs ≥4 条、覆盖 pre/post 钩子、时间戳晚于执行开始且落在演示窗口', async () => {
    const d = await mockApi.getAgentExecutionDetail('agent-fta-002', 'aexec-005');
    expect(d.hook_logs.length).toBeGreaterThanOrEqual(4);
    const types = new Set(d.hook_logs.map((h) => h.hook_type));
    expect(types.has('pre_execution'), '缺少 pre_execution 钩子').toBe(true);
    expect(types.has('post_execution'), '缺少 post_execution 钩子').toBe(true);
    for (const h of d.hook_logs) {
      expect(h.timestamp >= '2026-08-25' && h.timestamp < '2026-09-01', `hook 时间越界: ${h.timestamp}`).toBe(true);
      expect(h.timestamp >= d.created_at, `hook 早于执行开始: ${h.timestamp}`).toBe(true);
    }
  });

  it('失败执行的 on_error 钩子可见，成功执行无 on_error', async () => {
    const failed = await mockApi.getAgentExecutionDetail('agent-fta-002', 'aexec-007');
    expect(failed.hook_logs.some((h) => h.hook_type === 'on_error'), '失败执行缺少 on_error 钩子').toBe(true);
    const ok = await mockApi.getAgentExecutionDetail('agent-rag-003', 'aexec-009');
    expect(ok.hook_logs.some((h) => h.hook_type === 'on_error'), '成功执行不应有 on_error').toBe(false);
  });

  it('全部执行与运行状态时间统一到演示窗口 2026-08-25~31', async () => {
    for (const agentId of ['agent-mega-001', 'agent-fta-002', 'agent-rag-003', 'agent-skill-004', 'agent-fta-007']) {
      const { executions } = await mockApi.getAgentExecutions(agentId);
      expect(executions.length, `${agentId} 无执行记录`).toBeGreaterThan(0);
      for (const e of executions) {
        expect(e.created_at >= '2026-08-25' && e.created_at < '2026-09-01', `${e.id} 执行时间越界: ${e.created_at}`).toBe(true);
      }
      const status = await mockApi.getAgentStatus(agentId);
      const latest = executions.map((e) => e.created_at).sort().slice(-1)[0];
      expect(status.last_execution_at, `${agentId} last_execution_at 与执行列表不一致`).toBe(latest);
    }
  });

  it('耗时分解与管线延迟自洽：selector_ms 等于管线延迟且各阶段之和不超过 total', async () => {
    const d = await mockApi.getAgentExecutionDetail('agent-mega-001', 'aexec-001');
    const t = d.timing_breakdown;
    expect(t.selector_ms, 'selector_ms 应等于管线延迟').toBe(d.pipeline_trace?.pipeline_latency_ms);
    expect(t.selector_ms + t.pre_hook_ms + t.llm_inference_ms + t.post_hook_ms).toBeLessThanOrEqual(t.total_ms + 5);
  });

  it('memory_context 时间与执行时间一致（非旧硬编码）', async () => {
    const d = await mockApi.getAgentExecutionDetail('agent-fta-002', 'aexec-005');
    expect(d.memory_context.length).toBeGreaterThan(0);
    for (const m of d.memory_context) {
      expect(m.created_at >= '2026-08-25', `记忆上下文时间越界: ${m.created_at}`).toBe(true);
    }
  });

  it('ExecutionDetail 页面渲染记忆上下文/chain/语料命中/代码上下文/相对时间', () => {
    const src = readPage('../pages/Agents/ExecutionDetail.tsx');
    expect(src, '缺少 memory_context 渲染').toMatch(/memory_context/);
    expect(src, '缺少 chain 子决策渲染').toMatch(/chain/);
    expect(src, '缺少 rag_collections 渲染').toMatch(/rag_collections/);
    expect(src, '缺少 code_context 渲染').toMatch(/code_context/);
    expect(src, '缺少相对时间 formatTimeAgo').toMatch(/formatTimeAgo/);
  });
});

describe('mock 数据质量 · Solutions 过滤、溯源与执行记录', () => {

  it('方案库覆盖 4 档严重度与 3 种状态（active/draft/archived）', async () => {
    const { solutions } = await mockApi.listSolutions();
    expect(solutions.length, '方案样本过少').toBeGreaterThanOrEqual(10);
    const severities = new Set(solutions.map((s) => s.severity));
    expect([...severities].sort()).toEqual(['critical', 'high', 'low', 'medium']);
    const statuses = new Set(solutions.map((s) => s.status));
    expect(statuses.has('active'), '缺少 active 方案').toBe(true);
    expect(statuses.has('draft'), '缺少 draft 方案').toBe(true);
    expect(statuses.has('archived'), '缺少 archived 方案').toBe(true);
  });

  it('listSolutions 支持 domain/severity/status 过滤', async () => {
    const k8s = await mockApi.listSolutions({ domain: 'kubernetes' });
    expect(k8s.solutions.length).toBeGreaterThan(0);
    for (const s of k8s.solutions) {
      expect(s.domain, `domain 过滤失效: ${s.id}`).toBe('kubernetes');
    }
    const high = await mockApi.listSolutions({ severity: 'high' });
    expect(high.solutions.length).toBeGreaterThan(0);
    for (const s of high.solutions) {
      expect(s.severity, `severity 过滤失效: ${s.id}`).toBe('high');
    }
    const archived = await mockApi.listSolutions({ status: 'archived' });
    expect(archived.solutions.length, '缺少 archived 方案可过滤').toBeGreaterThan(0);
    for (const s of archived.solutions) {
      expect(s.status, `status 过滤失效: ${s.id}`).toBe('archived');
    }
  });

  it('searchSolutions 支持关键词 / status / tags 过滤', async () => {
    const kw = await mockApi.searchSolutions({ keyword: 'crashloop' });
    expect(kw.solutions.length, '关键词 crashloop 应命中 ≥2 条').toBeGreaterThanOrEqual(2);
    const archived = await mockApi.searchSolutions({ status: 'archived' });
    expect(archived.solutions.length).toBeGreaterThan(0);
    for (const s of archived.solutions) expect(s.status).toBe('archived');
    const oom = await mockApi.searchSolutions({ tags: ['oom'] });
    expect(oom.solutions.length, 'tags 过滤无结果').toBeGreaterThan(0);
  });

  it('至少 3 个方案有执行记录，字段全量且时间落在演示窗口', async () => {
    const { solutions } = await mockApi.listSolutions();
    let withExec = 0;
    for (const sol of solutions) {
      const { executions } = await mockApi.listSolutionExecutions(sol.id);
      if (executions.length === 0) continue;
      withExec += 1;
      for (const e of executions) {
        expect(e.solution_id).toBe(sol.id);
        expect(Object.keys(e.trigger_context).length, `${e.id} 缺少 trigger_context`).toBeGreaterThan(0);
        expect(e.effectiveness_score, `${e.id} effectiveness 越界`).toBeGreaterThan(0);
        expect(e.effectiveness_score).toBeLessThanOrEqual(1);
        expect(e.duration_ms, `${e.id} duration 异常`).toBeGreaterThan(0);
        expect(e.outcome_notes.length, `${e.id} 缺少 outcome_notes`).toBeGreaterThan(0);
        expect(
          e.created_at >= '2026-08-25' && e.created_at < '2026-09-01',
          `${e.id} 执行时间越界: ${e.created_at}`,
        ).toBe(true);
      }
    }
    expect(withExec, '有执行记录的方案太少').toBeGreaterThanOrEqual(3);
  }, 15000);

  it('kudig 溯源方案带 source_uri / metadata.category / created_by', async () => {
    const { solutions } = await mockApi.listSolutions();
    const kudig = solutions.filter((s) => s.metadata.source === 'kudig');
    expect(kudig.length).toBeGreaterThanOrEqual(5);
    for (const s of kudig) {
      expect(s.source_uri.startsWith('https://'), `${s.id} 缺少 source_uri`).toBe(true);
      expect(s.rag_collection_id.length, `${s.id} 缺少 rag_collection_id`).toBeGreaterThan(0);
      expect(String(s.metadata.category ?? '').length, `${s.id} 缺少 metadata.category`).toBeGreaterThan(0);
      expect(s.created_by.length, `${s.id} 缺少 created_by`).toBeGreaterThan(0);
    }
  });

  it('SolutionList 页面渲染过滤器与新建/编辑表单', () => {
    const src = readPage('../pages/Solutions/SolutionList.tsx');
    expect(src, '缺少 severity 过滤器').toMatch(/severity/);
    expect(src, '缺少 domain 过滤器').toMatch(/domain/);
    expect(src, '缺少 status 过滤器').toMatch(/status/);
    expect(src, '缺少新建方案调用 createSolution').toMatch(/createSolution/);
    expect(src, '缺少编辑方案调用 updateSolution').toMatch(/updateSolution/);
  });

  it('SolutionDetail 页面渲染溯源字段全量', () => {
    const src = readPage('../pages/Solutions/SolutionDetail.tsx');
    expect(src, '缺少状态徽标').toMatch(/solution\.status/);
    expect(src, '缺少来源链接 source_uri').toMatch(/source_uri/);
    expect(src, '缺少 RAG 溯源').toMatch(/rag_collection_id/);
    expect(src, '缺少 search_keywords').toMatch(/search_keywords/);
    expect(src, '缺少 created_by').toMatch(/created_by/);
    expect(src, '缺少 created_at 渲染').toMatch(/created_at/);
    expect(src, '缺少 metadata 渲染').toMatch(/metadata/);
    expect(src, '严重度未用中文映射 severityLabels').toMatch(/severityLabels/);
  });
});

describe('mock 数据质量 · Skills 状态真值与引用反查', () => {

  it('技能状态为真值分布（≥2 种且取值合法），不再是清一色 installed', async () => {
    const { skills } = await mockApi.listSkills();
    expect(skills.length, '技能样本过少').toBeGreaterThanOrEqual(20);
    const allowed = new Set(['enabled', 'disabled', 'deprecated', 'installed']);
    const statuses = new Set(skills.map((s) => s.status));
    for (const st of statuses) {
      expect(allowed.has(st), `非法技能状态: ${st}`).toBe(true);
    }
    expect(statuses.size, '技能状态全部相同，疑似写死').toBeGreaterThanOrEqual(2);
  });

  it('Agent harness.skills 反查引用：无悬空引用，场景技能被引用且与详情 related_agent_count 一致', async () => {
    const { skills } = await mockApi.listSkills();
    const { agents } = await mockApi.listAgents();
    const skillNames = new Set(skills.map((s) => s.name));
    const refCount: Record<string, number> = {};
    for (const a of agents) {
      for (const sn of a.harness.skills) {
        expect(skillNames.has(sn), `Agent ${a.id} 悬空引用技能 ${sn}`).toBe(true);
        refCount[sn] = (refCount[sn] ?? 0) + 1;
      }
    }
    expect(
      Object.keys(refCount).length,
      '被 Agent 引用的技能种类过少，反查无意义',
    ).toBeGreaterThanOrEqual(6);
    const scenario = skills.find((s) => s.skill_type === 'scenario' && refCount[s.name]);
    expect(scenario, '没有任何场景技能被 Agent 引用').toBeDefined();
    const detail = await mockApi.getSkill(scenario!.name);
    expect(
      detail.related_agent_count,
      `related_agent_count(${detail.related_agent_count}) 与反查结果(${refCount[scenario!.name]})不一致`,
    ).toBe(refCount[scenario!.name]);
  });

  it('场景技能详情：custom_sections 非空、排查步骤带 skill_ref 且引用真实技能、last_executed 在演示窗口', async () => {
    const { skills } = await mockApi.listSkills();
    const detail = await mockApi.getSkill('k8s-pod-crash');
    const cfg = detail.scenario_config;
    expect(cfg).toBeDefined();
    expect(cfg!.output_template!.custom_sections.length, 'custom_sections 为空').toBeGreaterThan(0);
    for (const step of cfg!.troubleshooting_flow) {
      expect(step.skill_ref, `${step.id} 缺少 skill_ref`).toBeTruthy();
      expect(
        skills.some((s) => s.name === step.skill_ref),
        `${step.skill_ref} 悬空技能引用`,
      ).toBe(true);
    }
    expect(
      detail.last_executed >= '2026-08-25' && detail.last_executed < '2026-09-01',
      `last_executed 越出演示窗口: ${detail.last_executed}`,
    ).toBe(true);
  });

  it('SkillList 页面删除假引用映射并接 listAgents 反查 + 状态真值徽章', () => {
    const src = readPage('../pages/Skills/SkillList.tsx');
    expect(src, 'skillAgentRefs 假映射仍存在').not.toMatch(/skillAgentRefs/);
    expect(src, '未接入 useAgents/listAgents 引用反查').toMatch(/useAgents|listAgents/);
    expect(src, '未读取 harness.skills').toMatch(/harness/);
    expect(src, '状态徽章仍写死"就绪"').not.toMatch(/label="就绪"/);
    expect(src, '缺少状态中文映射 statusLabels').toMatch(/statusLabels/);
  });

  it('SkillDetail 页面渲染 status / skill_ref / custom_sections', () => {
    const src = readPage('../pages/Skills/SkillDetail.tsx');
    expect(src, '详情页缺少 status 渲染').toMatch(/skill\.status|statusLabels/);
    expect(src, '排查步骤缺少 skill_ref 渲染').toMatch(/skill_ref/);
    expect(src, '输出模板缺少 custom_sections 渲染').toMatch(/custom_sections/);
  });
});

describe('mock 数据质量 · T6 Agents 域打通', () => {
  it('listAgents 每个 Agent 携带 last_execution_at 且全部落在演示窗口', async () => {
    const { agents } = await mockApi.listAgents();
    expect(agents.length, 'Agent 列表为空').toBeGreaterThan(0);
    for (const a of agents) {
      expect(
        a.last_execution_at,
        `${a.id} 缺少 last_execution_at`,
      ).toBeTruthy();
      expect(
        a.last_execution_at! >= '2026-08-25' && a.last_execution_at! < '2026-09-01',
        `${a.id} last_execution_at 越出演示窗口: ${a.last_execution_at}`,
      ).toBe(true);
    }
  }, 15000);

  it('部署状态机可操作：scale 持久化、undeploy/deploy 状态真实流转', async () => {
    const initial = await mockApi.getAgentDeployment('agent-skill-004');
    expect(initial.state, 'agent-skill-004 初始应为 deployed').toBe('deployed');

    const scaled = await mockApi.scaleAgent('agent-skill-004', 3);
    expect(scaled.replicas, 'scaleAgent 返回副本数错误').toBe(3);
    const afterScale = await mockApi.getAgentDeployment('agent-skill-004');
    expect(afterScale.replicas, 'scale 结果未持久化').toBe(3);

    await mockApi.undeployAgent('agent-mega-006');
    const afterUndeploy = await mockApi.getAgentDeployment('agent-mega-006');
    expect(afterUndeploy.state, 'undeploy 后状态未流转').toBe('undeployed');
    expect(afterUndeploy.replicas, 'undeploy 后副本数应为 0').toBe(0);

    const deployed = await mockApi.deployAgent('agent-custom-005');
    expect(deployed.state, 'deploy 返回状态错误').toBe('deployed');
    const afterDeploy = await mockApi.getAgentDeployment('agent-custom-005');
    expect(afterDeploy.state, 'deploy 后状态未持久化').toBe('deployed');
    expect(afterDeploy.replicas, 'deploy 后副本数应 ≥1').toBeGreaterThanOrEqual(1);
  }, 15000);

  it('auto_scale 配置可更新且持久化', async () => {
    const updated = await mockApi.updateAgentDeploymentConfig('agent-rag-003', { auto_scale: true });
    expect(updated.auto_scale, 'updateAgentDeploymentConfig 返回值未生效').toBe(true);
    const reloaded = await mockApi.getAgentDeployment('agent-rag-003');
    expect(reloaded.auto_scale, 'auto_scale 未持久化').toBe(true);
  }, 15000);

  it('LTM 删除真实生效：删除后列表不再包含且 total 递减', async () => {
    const before = await mockApi.searchLongTermMemory('agent-mega-001');
    expect(before.memories.length, 'LTM 初始为空').toBeGreaterThan(0);
    const target = before.memories[0]!;
    await mockApi.deleteLongTermMemory(target.id);
    const after = await mockApi.searchLongTermMemory('agent-mega-001');
    expect(
      after.memories.some((m) => m.id === target.id),
      `删除后 ${target.id} 仍出现在列表中`,
    ).toBe(false);
    expect(after.total, '删除后 total 未递减').toBe(before.total - 1);
  }, 15000);

  it('AgentDetail 执行记录行点击跳转 ExecutionDetail', () => {
    const src = readPage('../pages/Agents/AgentDetail.tsx');
    expect(src, '执行记录表未接 onRowClick').toMatch(/onRowClick/);
    expect(src, '未跳转 /agents/:id/executions/:execId').toMatch(/executions\//);
  });

  it('AgentList 展示 last_execution_at 并提供 /access 入口', () => {
    const src = readPage('../pages/Agents/AgentList.tsx');
    expect(src, '列表未展示 last_execution_at').toMatch(/last_execution_at/);
    expect(src, '缺少访问控制入口').toMatch(/agents\/\$\{agent\.id\}\/access/);
  });

  it('AgentDeployment 接 deploy/undeploy/scale 操作与 auto_scale', () => {
    const src = readPage('../pages/Agents/AgentDeployment.tsx');
    expect(src, '部署页未接 deployAgent/undeployAgent/scaleAgent').toMatch(/deployAgent|undeployAgent|scaleAgent/);
    expect(src, '部署页未展示/操作 auto_scale').toMatch(/auto_scale/);
  });

  it('AgentMemory 长期记忆支持删除', () => {
    const src = readPage('../pages/Agents/AgentMemory.tsx');
    expect(src, '长期记忆卡片缺少删除操作').toMatch(/deleteLongTermMemory/);
  });

  it('AgentCollaboration 展示 completed_at', () => {
    const src = readPage('../pages/Agents/AgentCollaboration.tsx');
    expect(src, '协作会话缺少 completed_at 展示').toMatch(/completed_at/);
  });
});

describe('mock 数据质量 · T7 Workflow/RAG 时间字段与详情展开', () => {
  it('工作流执行记录统一落在演示窗口（2026-08-25~31）', async () => {
    const { executions } = await mockApi.listWorkflowExecutions();
    expect(executions.length).toBeGreaterThanOrEqual(30);
    for (const e of executions) {
      expect(e.started_at, `执行 ${e.id} 开始时间越界: ${e.started_at}`).toMatch(/2026-08-(2[5-9]|3[01])/);
      if (e.status === 'completed' || e.status === 'failed') {
        expect(e.completed_at, `执行 ${e.id}（${e.status}）缺少结束时间`).not.toBeNull();
        if (e.completed_at) {
          expect(new Date(e.completed_at).getTime()).toBeGreaterThanOrEqual(new Date(e.started_at).getTime());
        }
      }
    }
  }, 15000);

  it('工作流列表 last_executed 落窗，created_at 差异化不再全同', async () => {
    const { workflows } = await mockApi.listWorkflowDetails();
    expect(workflows.length).toBeGreaterThanOrEqual(30);
    for (const w of workflows) {
      // archived 工作流的 last_executed 保留归档前旧时间是合理存量语义
      if (w.last_executed && w.status !== 'archived') {
        expect(w.last_executed, `工作流 ${w.id} 最后执行时间越界: ${w.last_executed}`).toMatch(
          /2026-08-(2[5-9]|3[01])/,
        );
      }
      expect(new Date(w.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(w.created_at).getTime());
    }
    const createdAtSet = new Set(workflows.map((w) => w.created_at));
    expect(createdAtSet.size, 'created_at 全部相同，缺乏差异化').toBeGreaterThan(5);
  }, 15000);

  it('集合详情与文档均携带完整时间字段', async () => {
    const { collections } = await mockApi.listCollectionDetails();
    expect(collections.length).toBeGreaterThanOrEqual(30);
    const createdAtSet = new Set(collections.map((c) => c.created_at));
    expect(createdAtSet.size, '集合 created_at 应存在且差异化').toBeGreaterThan(3);

    const { documents } = await mockApi.listDocuments();
    expect(documents.length).toBeGreaterThan(0);
    for (const d of documents) {
      expect(d.updated_at, `文档 ${d.id} 缺少更新时间`).toBeTruthy();
      expect(new Date(d.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(d.uploaded_at).getTime());
    }
  }, 15000);

  it('WorkflowList 展示创建/更新时间列', () => {
    const src = readPage('../pages/Workflows/WorkflowList.tsx');
    expect(src, '工作流列表缺少创建时间列').toMatch(/created_at/);
    expect(src, '工作流列表缺少更新时间列').toMatch(/updated_at/);
  });

  it('WorkflowExecution 展示结束时间列并支持行点击查看详情', () => {
    const src = readPage('../pages/Workflows/WorkflowExecution.tsx');
    expect(src, '执行记录缺少结束时间列').toMatch(/completed_at/);
    expect(src, '执行记录不支持行点击详情').toMatch(/onRowClick/);
    expect(src, '详情未使用 Dialog 渲染').toMatch(/<DialogContent/);
  });

  it('RAG Documents 展示更新时间列', () => {
    const src = readPage('../pages/RAG/Documents.tsx');
    expect(src, '文档列表缺少更新时间列').toMatch(/updated_at/);
  });

  it('RAG Collections 卡片展示创建时间', () => {
    const src = readPage('../pages/RAG/Collections.tsx');
    expect(src, '集合卡片缺少创建时间').toMatch(/created_at/);
  });
});

describe('mock 数据质量 · T8 TicketSummary 接真数据', () => {
  it('mockTickets 扩充至 ≥24 条，created_at 为绝对时间戳且落在演示窗口', async () => {
    const { tickets } = await mockApi.listTickets();
    expect(tickets.length).toBeGreaterThanOrEqual(24);
    for (const t of tickets) {
      expect(t.created_at, `工单 ${t.id} created_at 不是 ISO 绝对时间戳: ${t.created_at}`).toMatch(
        /^2026-\d{2}-\d{2}T/,
      );
      expect(t.created_at, `工单 ${t.id} created_at 越界: ${t.created_at}`).toMatch(/2026-08-(2[5-9]|3[01])/);
    }
    const idSet = new Set(tickets.map((t) => t.id));
    expect(idSet.size, '工单 ID 存在重复').toBe(tickets.length);
  }, 15000);

  it('工单状态与优先级分布差异化（≥3 种状态、取值合法、负责人非空）', async () => {
    const { tickets } = await mockApi.listTickets();
    const statusSet = new Set(tickets.map((t) => t.status));
    expect(statusSet.size, '工单状态缺乏差异化').toBeGreaterThanOrEqual(3);
    for (const t of tickets) {
      expect(['pending', 'processing', 'completed', 'approved'], `工单 ${t.id} 状态非法`).toContain(t.status);
      expect(['low', 'medium', 'high', 'critical'], `工单 ${t.id} 优先级非法`).toContain(t.priority);
      expect(t.assignee.length, `工单 ${t.id} 缺少负责人`).toBeGreaterThan(0);
    }
  }, 15000);

  it('TicketSummary 页面接入 useTickets 并渲染工单数据表', () => {
    const src = readPage('../pages/TicketSummary/index.tsx');
    expect(src, 'TicketSummary 未接入 useTickets').toMatch(/useTickets/);
    expect(src, 'TicketSummary 未渲染工单数据表').toMatch(/DataTable/);
    expect(src, '工单优先级未展示').toMatch(/priority/);
    expect(src, '工单状态未使用 StatusBadge').toMatch(/StatusBadge/);
  });
});

describe('mock 数据质量 · T9 Selector/Evaluation 接数据', () => {
  it('traces 提供充足路由决策样本（≥14 条、6 种路由类型、3 种策略、时间落窗）', async () => {
    const { traces } = await mockApi.getTraces();
    expect(traces.length).toBeGreaterThanOrEqual(14);
    const typeSet = new Set(traces.map((t) => t.route_type));
    expect(typeSet.size, '路由类型覆盖不足').toBeGreaterThanOrEqual(6);
    const strategySet = new Set(traces.map((t) => t.strategy));
    expect(strategySet.size, '策略覆盖不足').toBeGreaterThanOrEqual(3);
    for (const t of traces) {
      expect(t.timestamp, `trace ${t.id} 时间越界: ${t.timestamp}`).toMatch(/2026-08-(2[5-9]|3[01])/);
      expect(t.corpus_matches.length >= 0 && t.enriched_skills.length >= 0).toBe(true);
    }
  }, 15000);

  it('Selector 页接入 useTraces 实时路由决策流', () => {
    const src = readPage('../pages/Selector/index.tsx');
    expect(src, 'Selector 未接入 useTraces').toMatch(/useTraces/);
    expect(src, 'Selector 未渲染决策数据表').toMatch(/DataTable/);
    expect(src, '路由类型表未接实际分布列').toMatch(/实际分布|count/);
  });

  it('Evaluation 页接入 useTraces 实测对照区', () => {
    const src = readPage('../pages/Evaluation/index.tsx');
    expect(src, 'Evaluation 未接入 useTraces').toMatch(/useTraces/);
    expect(src, '实测对照缺少置信度指标').toMatch(/confidence/);
    expect(src, '实测对照缺少延迟指标').toMatch(/latency/);
  });
});

describe('mock 数据质量 · T10 GTM 运行数据总览区', () => {
  const gtm = () => readPage('../../../GTM/index.html');

  it('GTM 页提供运行数据总览区且数字与控制台同源', () => {
    const src = gtm();
    expect(src, '缺少运行数据总览区').toMatch(/id="opsdata"/);
    expect(src, '缺少演示窗口标注').toMatch(/2026-08-25/);
    expect(src, '缺少执行总量 48').toMatch(/48</);
    expect(src, '缺少闭环成功率 95.7%').toMatch(/95\.7%/);
    expect(src, '缺少工单量 30').toMatch(/>30</);
    expect(src, '缺少向量规模 62,470').toMatch(/62,470/);
  });

  it('GTM 页包含四线分发占比与真实路由决策留痕', () => {
    const src = gtm();
    expect(src, '缺少分发占比区').toMatch(/分发占比/);
    expect(src, '缺少决策留痕区').toMatch(/最近路由决策留痕/);
    expect(src, '缺少真实 trace 引用').toMatch(/tr-4821/);
    expect(src, '缺少导航入口').toMatch(/href="#opsdata"/);
  });
});
