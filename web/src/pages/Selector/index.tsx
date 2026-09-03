import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ArrowLeft, GitBranch, Cpu, Route, Activity, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTraces } from '@/hooks/useMonitoring';
import type { TraceRecord } from '@/types';

const strategyLabels: Record<string, string> = {
  hybrid: '混合',
  llm: 'LLM',
  rule: '规则',
};

const routeTypeLabels: Record<string, string> = {
  fta: 'FTA 工作流',
  skill: '技能',
  rag: 'RAG 检索',
  code_analysis: '代码分析',
  multi: '链式路由',
  direct: '直接响应',
};

const decisionColumns: DataTableColumn<TraceRecord>[] = [
  { key: 'id', label: 'ID', mono: true },
  {
    key: 'input',
    label: '输入请求',
    render: (val) => <span className="line-clamp-1 max-w-[260px]">{String(val)}</span>,
  },
  {
    key: 'strategy',
    label: '策略',
    render: (val) => <Badge variant="secondary" className="text-[10px]">{strategyLabels[String(val)] ?? String(val)}</Badge>,
  },
  {
    key: 'route_type',
    label: '路由类型',
    render: (val) => <span className="font-mono text-xs text-primary">{routeTypeLabels[String(val)] ?? String(val)}</span>,
  },
  {
    key: 'route_target',
    label: '路由目标',
    render: (val) => <span className="font-mono text-xs">{String(val)}</span>,
  },
  {
    key: 'intent_confidence',
    label: '置信度',
    render: (val) => <span className="font-mono">{(Number(val) * 100).toFixed(0)}%</span>,
  },
  {
    key: 'latency_ms',
    label: '管线延迟',
    render: (val) => {
      const ms = Number(val);
      return <span className="font-mono text-xs">{ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`}</span>;
    },
  },
  {
    key: 'timestamp',
    label: '时间',
    render: (val) => <span className="text-xs">{new Date(String(val)).toLocaleString('zh-CN')}</span>,
  },
];

const strategies = [
  {
    name: '规则策略',
    tag: 'Rule-based',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    pros: ['速度快，无 LLM 调用开销', '可预测性强', '易于调试'],
    cons: ['覆盖有限，需预定义模式', '无法处理复杂/模糊意图'],
    desc: '基于模式匹配的快速路由，适用于明确的请求类型。18 条预编译规则，置信度 >= 0.7 直接返回。',
  },
  {
    name: 'LLM 策略',
    tag: 'LLM-based',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    pros: ['理解复杂意图', '自动适应新能力', '上下文感知'],
    cons: ['需要 LLM 调用', '存在延迟', '成本较高'],
    desc: '使用 LLM 进行意图分类和路由决策，可用技能/工作流/知识库作为上下文。',
  },
  {
    name: '混合策略',
    tag: 'Hybrid（默认）',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    pros: ['兼顾速度与智能', '自适应加成', '三阶段回退'],
    cons: ['复杂度较高'],
    desc: '先尝试规则快速路径，未命中则 LLM 回退，最后集成决策（规则 vs LLM 置信度 + 自适应加成）。',
  },
];

const routeTypes = [
  { type: 'workflow', icon: '🌳', target: 'FTA 工作流', desc: '复杂多步骤故障诊断流程' },
  { type: 'skill', icon: '🔧', target: '注册技能', desc: '具体工具执行（搜索、代码执行、文件操作）' },
  { type: 'rag', icon: '📚', target: '知识集合', desc: '从文档中检索增强生成' },
  { type: 'code_analysis', icon: '💻', target: '静态分析工具', desc: '代码审查、安全扫描、AST 分析' },
  { type: 'direct', icon: '💬', target: 'LLM', desc: '简单直接响应，无需工具' },
  { type: 'multi', icon: '🔗', target: '链式路由', desc: '多路由按序组合执行' },
];

const pipelineStages = [
  {
    stage: '阶段 1',
    name: '意图分析',
    component: 'IntentAnalyzer',
    detail: '关键词评分 + 模式匹配 + 代码检测 + 问题检测（一次遍历）',
    output: 'IntentClassification（类型, 实体, 置信度, 分数）',
    perf: '预编译正则 + frozenset O(1) 查找',
  },
  {
    stage: '阶段 2',
    name: '上下文增强',
    component: 'ContextEnricher',
    detail: '并行查询技能/工作流/RAG 注册表（asyncio.gather）',
    output: '加权排序 top-10 技能 + Agent 记忆 + 对话历史',
    perf: '并行 I/O，代码场景附加 CodeContext',
  },
  {
    stage: '阶段 3',
    name: '路由决策',
    component: '策略执行器',
    detail: '混合策略三阶段：快速规则 → LLM 回退 → 集成决策',
    output: 'RouteDecision（type, target, confidence, reasoning）',
    perf: 'SHA-256 缓存键 + TTL-LRU（1000 条, 300s）',
  },
];

export default function SelectorPage() {
  const { data, isLoading } = useTraces();
  const traces = data?.traces ?? [];

  const stats = useMemo(() => {
    const total = traces.length;
    const avgConfidence = total > 0 ? (traces.reduce((s, t) => s + t.intent_confidence, 0) / total) * 100 : 0;
    const avgLatency = total > 0 ? traces.reduce((s, t) => s + t.latency_ms, 0) / total : 0;
    const successRate = total > 0 ? (traces.filter((t) => t.status === 'success').length / total) * 100 : 0;
    return { total, avgConfidence, avgLatency, successRate };
  }, [traces]);

  const routeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of traces) counts[t.route_type] = (counts[t.route_type] ?? 0) + 1;
    return counts;
  }, [traces]);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/architecture">
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回架构总览
          </Link>
        </Button>
      </div>

      <PageHeader
        title="智能选择器"
        description="LLM 驱动的元路由引擎 — 分析用户意图、评估可用能力、选择最优执行路径"
      />

      {/* Realtime routing decisions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            实时路由决策流
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <MetricCard icon={Route} value={String(stats.total)} label="决策总量" accentColor="border-l-primary" />
            <MetricCard icon={Zap} value={`${stats.avgConfidence.toFixed(1)}%`} label="平均置信度" accentColor="border-l-status-healthy" />
            <MetricCard icon={Cpu} value={`${stats.avgLatency >= 1000 ? `${(stats.avgLatency / 1000).toFixed(1)}s` : `${stats.avgLatency.toFixed(0)}ms`}`} label="平均管线延迟" accentColor="border-l-status-degraded" />
            <MetricCard icon={CheckCircle2} value={`${stats.successRate.toFixed(0)}%`} label="决策成功率" accentColor="border-l-status-progressing" />
          </div>
          <DataTable columns={decisionColumns} data={traces} loading={isLoading} emptyMessage="暂无路由决策" />
        </CardContent>
      </Card>

      {/* Three-stage Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" />
            三阶段处理流程
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            每个请求经过意图分析 → 上下文增强 → 路由决策三阶段处理，命中缓存时直接返回。
          </p>
          <div className="space-y-3">
            {pipelineStages.map((s, i) => (
              <div key={s.stage} className="rounded-lg border border-border/50 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="outline" className="font-mono text-xs shrink-0">{s.stage}</Badge>
                  <span className="text-sm font-semibold">{s.name}</span>
                  <span className="text-xs font-mono text-muted-foreground ml-auto">{s.component}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">处理逻辑：</span> {s.detail}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">输出：</span> {s.output}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">性能优化：</span> {s.perf}
                  </div>
                </div>
                {i < pipelineStages.length - 1 && (
                  <div className="flex justify-center mt-2 text-muted-foreground">↓</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Routing Strategies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            路由策略
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {strategies.map((s) => (
              <div key={s.name} className={cn('rounded-lg border p-4', s.bgColor)}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold">{s.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{s.tag}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{s.desc}</p>
                <div className="space-y-1 text-xs">
                  {s.pros.map((p) => (
                    <div key={p} className="flex items-start gap-1.5">
                      <span className="text-emerald-500">✓</span>
                      <span className="text-muted-foreground">{p}</span>
                    </div>
                  ))}
                  {s.cons.map((c) => (
                    <div key={c} className="flex items-start gap-1.5">
                      <span className="text-rose-400">✗</span>
                      <span className="text-muted-foreground">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Route Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            路由类型
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">类型</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">图标</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">目标</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">说明</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">实际分布</th>
                </tr>
              </thead>
              <tbody>
                {routeTypes.map((r) => {
                  // routeTypes.type 为意图类型（workflow），对应路由类型 fta
                  const routeKey = r.type === 'workflow' ? 'fta' : r.type;
                  const count = routeCounts[routeKey] ?? 0;
                  const pct = traces.length > 0 ? ((count / traces.length) * 100).toFixed(0) : '0';
                  return (
                    <tr key={r.type} className="border-b border-border/30">
                      <td className="py-2 px-3 font-mono text-primary">{r.type}</td>
                      <td className="py-2 px-3">{r.icon}</td>
                      <td className="py-2 px-3">{r.target}</td>
                      <td className="py-2 px-3 text-muted-foreground">{r.desc}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {count} 次 · {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cache */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            缓存与性能
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: '缓存键', value: 'SHA-256(input + agent + strategy)' },
              { label: '缓存策略', value: 'TTL-aware LRU' },
              { label: '容量', value: '1000 条（默认）' },
              { label: 'TTL', value: '300 秒' },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-border/50 p-3">
                <p className="text-xs font-medium text-primary mb-1">{item.label}</p>
                <p className="text-xs text-muted-foreground font-mono">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
