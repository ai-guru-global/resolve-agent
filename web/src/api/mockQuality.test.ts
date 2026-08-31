import { describe, it, expect } from 'vitest';
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
