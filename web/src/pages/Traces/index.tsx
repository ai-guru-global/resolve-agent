import { useState } from 'react';
import {
  Activity,
  Target,
  Cpu,
  Brain,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { RouteType, SelectorStrategy, StatusVariant } from '@/types';

interface TraceRecord {
  id: string;
  input: string;
  strategy: SelectorStrategy;
  intent_type: string;
  intent_confidence: number;
  route_type: RouteType;
  route_target: string;
  status: 'success' | 'failed' | 'timeout';
  latency_ms: number;
  timestamp: string;
  enriched_skills: string[];
  corpus_matches: { name: string; score: number }[];
  reasoning: string;
}

const ROUTE_LABELS: Record<string, string> = {
  fta: 'FTA 工作流',
  skill: '技能调用',
  rag: '知识检索',
  code_analysis: '代码分析',
  multi: '多路由链',
  direct: '直接回复',
};

const STATUS_MAP: Record<string, { label: string; variant: StatusVariant }> = {
  success: { label: '成功', variant: 'healthy' },
  failed: { label: '失败', variant: 'failed' },
  timeout: { label: '超时', variant: 'degraded' },
};

// Mock trace data
const mockTraces: TraceRecord[] = [
  {
    id: 'tr-001',
    input: 'Kubernetes Pod CrashLoopBackOff 如何排查？',
    strategy: 'hybrid',
    intent_type: 'workflow',
    intent_confidence: 0.92,
    route_type: 'fta',
    route_target: 'k8s-crash-diagnosis',
    status: 'success',
    latency_ms: 18,
    timestamp: '2026-04-15T10:32:15Z',
    enriched_skills: ['k8s-diagnostics', 'log-analysis'],
    corpus_matches: [{ name: 'K8s 运维手册', score: 0.89 }],
    reasoning: '检测到 K8s 故障排查意图，匹配 FTA 工作流进行结构化诊断',
  },
  {
    id: 'tr-002',
    input: '查询最近24小时的错误日志统计',
    strategy: 'hybrid',
    intent_type: 'skill',
    intent_confidence: 0.87,
    route_type: 'skill',
    route_target: 'log-analysis',
    status: 'success',
    latency_ms: 12,
    timestamp: '2026-04-15T10:28:42Z',
    enriched_skills: ['log-analysis', 'metrics-query'],
    corpus_matches: [],
    reasoning: '明确的日志查询需求，路由至 log-analysis 技能',
  },
  {
    id: 'tr-003',
    input: 'Nginx 反向代理配置最佳实践是什么？',
    strategy: 'hybrid',
    intent_type: 'rag',
    intent_confidence: 0.95,
    route_type: 'rag',
    route_target: 'ops-knowledge-base',
    status: 'success',
    latency_ms: 8,
    timestamp: '2026-04-15T10:15:30Z',
    enriched_skills: [],
    corpus_matches: [
      { name: 'Nginx 配置指南', score: 0.94 },
      { name: '运维最佳实践', score: 0.78 },
    ],
    reasoning: '知识检索类问题，RAG 语料库高置信度匹配',
  },
  {
    id: 'tr-004',
    input: '帮我分析这段 Python 代码的性能瓶颈\n```python\nfor i in range(len(data)):\n  result.append(process(data[i]))\n```',
    strategy: 'hybrid',
    intent_type: 'code_analysis',
    intent_confidence: 0.91,
    route_type: 'code_analysis',
    route_target: 'code-review',
    status: 'success',
    latency_ms: 15,
    timestamp: '2026-04-15T09:58:10Z',
    enriched_skills: ['code-review', 'performance-profiler'],
    corpus_matches: [],
    reasoning: '检测到代码块，触发代码分析路由',
  },
  {
    id: 'tr-005',
    input: 'MySQL 连接池耗尽导致服务不可用',
    strategy: 'hybrid',
    intent_type: 'workflow',
    intent_confidence: 0.88,
    route_type: 'fta',
    route_target: 'db-connection-diagnosis',
    status: 'failed',
    latency_ms: 245,
    timestamp: '2026-04-15T09:45:00Z',
    enriched_skills: ['db-diagnostics', 'metrics-query'],
    corpus_matches: [{ name: 'MySQL 运维手册', score: 0.85 }],
    reasoning: '数据库故障场景，路由至 FTA 进行诊断，但工作流执行超时',
  },
  {
    id: 'tr-006',
    input: '你好，介绍一下 Resolve Agent 系统',
    strategy: 'rule',
    intent_type: 'direct',
    intent_confidence: 0.99,
    route_type: 'direct',
    route_target: 'llm-direct',
    status: 'success',
    latency_ms: 3,
    timestamp: '2026-04-15T09:30:22Z',
    enriched_skills: [],
    corpus_matches: [],
    reasoning: '简单问候/介绍类问题，规则匹配直接回复',
  },
];

export default function TraceAnalysis() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRoute, setFilterRoute] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTraces = mockTraces.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterRoute !== 'all' && t.route_type !== filterRoute) return false;
    if (searchQuery && !t.input.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: mockTraces.length,
    success: mockTraces.filter((t) => t.status === 'success').length,
    failed: mockTraces.filter((t) => t.status !== 'success').length,
    avgLatency: Math.round(mockTraces.reduce((sum, t) => sum + t.latency_ms, 0) / mockTraces.length),
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <PageHeader
        title="追踪分析"
        description="Intelligent Selector Pipeline 执行追踪 — 查看意图分析、上下文增强与路由决策的完整链路"
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard icon={Activity} value={String(stats.total)} label="总追踪数" />
        <MetricCard icon={CheckCircle2} value={String(stats.success)} label="成功" trend={{ value: 83, direction: 'up' }} />
        <MetricCard icon={XCircle} value={String(stats.failed)} label="失败/超时" trend={{ value: 17, direction: 'down' }} />
        <MetricCard icon={Clock} value={`${stats.avgLatency}ms`} label="平均延迟" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            placeholder="搜索追踪记录..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 h-9">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="success">成功</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
            <SelectItem value="timeout">超时</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRoute} onValueChange={setFilterRoute}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部路由</SelectItem>
            <SelectItem value="fta">FTA 工作流</SelectItem>
            <SelectItem value="skill">技能调用</SelectItem>
            <SelectItem value="rag">知识检索</SelectItem>
            <SelectItem value="code_analysis">代码分析</SelectItem>
            <SelectItem value="direct">直接回复</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trace List */}
      <div className="space-y-2">
        {filteredTraces.map((trace) => {
          const expanded = expandedId === trace.id;
          const statusInfo = STATUS_MAP[trace.status] ?? { label: trace.status, variant: 'unknown' as const };

          return (
            <Card key={trace.id} className="border-border/30 overflow-hidden">
              {/* Summary Row */}
              <button
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(expanded ? null : trace.id)}
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="text-[10px] font-mono text-muted-foreground/50 w-16 shrink-0">{trace.id}</span>
                <span className="text-sm truncate flex-1">{trace.input.split('\n')[0]}</span>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {ROUTE_LABELS[trace.route_type] ?? trace.route_type}
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground w-14 text-right shrink-0">
                  {trace.latency_ms}ms
                </span>
                <StatusBadge variant={statusInfo.variant} label={statusInfo.label} className="shrink-0" />
                <span className="text-[10px] text-muted-foreground/50 w-20 text-right shrink-0">
                  {new Date(trace.timestamp).toLocaleTimeString('zh-CN')}
                </span>
              </button>

              {/* Expanded Detail */}
              {expanded && (
                <CardContent className="px-4 pb-4 pt-0 border-t border-border/20">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    {/* Stage 1: Intent Analysis */}
                    <div className="rounded-lg border border-border/20 bg-background/20 p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[11px] font-semibold">Stage 1: 意图分析</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">意图类型</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {ROUTE_LABELS[trace.intent_type] ?? trace.intent_type}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">置信度</span>
                          <span className="text-[11px] font-mono font-bold text-primary">
                            {(trace.intent_confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">策略</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{trace.strategy}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stage 2: Context Enrichment */}
                    <div className="rounded-lg border border-border/20 bg-background/20 p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Cpu className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[11px] font-semibold">Stage 2: 上下文增强</span>
                      </div>
                      <div className="space-y-2">
                        {trace.enriched_skills.length > 0 && (
                          <div>
                            <span className="text-[11px] text-muted-foreground">匹配技能</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {trace.enriched_skills.map((sk) => (
                                <span
                                  key={sk}
                                  className="text-[9px] font-mono text-primary bg-primary/5 border border-primary/15 rounded px-1.5 py-0.5"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {trace.corpus_matches.length > 0 && (
                          <div>
                            <span className="text-[11px] text-muted-foreground">语料库匹配</span>
                            <div className="mt-1 space-y-1">
                              {trace.corpus_matches.map((cm) => (
                                <div key={cm.name} className="flex items-center gap-1.5 rounded bg-muted/15 px-2 py-1">
                                  <span className="h-1 w-1 rounded-full bg-status-healthy shrink-0" />
                                  <span className="text-[10px] font-medium truncate flex-1">{cm.name}</span>
                                  <span className="text-[10px] font-mono text-muted-foreground">{(cm.score * 100).toFixed(0)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {trace.enriched_skills.length === 0 && trace.corpus_matches.length === 0 && (
                          <p className="text-[11px] text-muted-foreground/50">无匹配上下文</p>
                        )}
                      </div>
                    </div>

                    {/* Stage 3: Route Decision */}
                    <div className="rounded-lg border border-border/20 bg-background/20 p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Brain className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[11px] font-semibold">Stage 3: 路由决策</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">路由类型</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {ROUTE_LABELS[trace.route_type] ?? trace.route_type}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">目标</span>
                          <span className="text-[10px] font-mono text-foreground/70">{trace.route_target}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground">决策原因</span>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-relaxed">{trace.reasoning}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {filteredTraces.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">无匹配的追踪记录</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
