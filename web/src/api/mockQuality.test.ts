import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mockApi } from './mock';

const ALL_ROUTE_TYPES = ['fta', 'skill', 'rag', 'code_analysis', 'multi', 'direct'];

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
    // 与 alert-006「最后执行时间 2026-08-22T14:20」保持同一事实源
    const stopped = agents.find((a) => a.id === 'agent-custom-005');
    expect(stopped?.last_execution_at).toBe('2026-08-22T14:20:00Z');
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
  const readPage = (rel: string) =>
    readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8');

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
  const readPage = (rel: string) =>
    readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8');

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
