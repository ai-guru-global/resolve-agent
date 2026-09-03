import { useParams } from 'react-router-dom';
import { Target, Cpu, Brain, Shield, Clock, AlertTriangle, Database, FileCode2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatTimeAgo } from '@/lib/demoTime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgent, useAgentExecutionDetail } from '@/hooks/useAgents';
import type { StatusVariant } from '@/types';

const executionStatusMap: Record<string, { label: string; variant: StatusVariant }> = {
  completed: { label: '完成', variant: 'healthy' },
  failed: { label: '失败', variant: 'failed' },
  running: { label: '运行中', variant: 'progressing' },
  pending: { label: '等待', variant: 'unknown' },
};

const hookStatusColors: Record<string, string> = {
  success: 'text-status-healthy',
  failed: 'text-status-failed',
  skipped: 'text-muted-foreground',
};

const INTENT_LABELS: Record<string, string> = {
  workflow: '工作流',
  skill: '技能',
  rag: '知识检索',
  code_analysis: '代码分析',
  direct: '直接推理',
  multi: '多智能体',
};

const STRATEGY_LABELS: Record<string, string> = {
  hybrid: '混合策略',
  llm: 'LLM 判别',
  rule: '规则匹配',
};

const HOOK_TYPE_LABELS: Record<string, string> = {
  pre_execution: '前置',
  post_execution: '后置',
  on_error: '错误处理',
  on_exit: '退出',
};

export default function ExecutionDetail() {
  const { id, execId } = useParams();
  const { data: agent } = useAgent(id ?? '');
  const { data: detail, isLoading } = useAgentExecutionDetail(id ?? '', execId ?? '');

  const statusInfo = detail ? executionStatusMap[detail.status] : undefined;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-6">
        <PageHeader title="执行详情" breadcrumbs={[{ label: 'Agent 管理', href: '/agents' }]} />
        <p className="text-sm text-muted-foreground">未找到执行记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="执行详情"
        breadcrumbs={[
          { label: 'Agent 管理', href: '/agents' },
          { label: agent?.name ?? '', href: `/agents/${id}` },
          { label: '执行记录' },
          { label: execId ?? '' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {statusInfo && <StatusBadge variant={statusInfo.variant} label={statusInfo.label} />}
            <Badge variant="secondary" className="text-xs font-mono">{detail.route_type}</Badge>
            <span className="text-xs text-muted-foreground">
              {detail.duration_ms > 1000 ? `${(detail.duration_ms / 1000).toFixed(1)}s` : `${detail.duration_ms}ms`}
            </span>
            <span className="text-xs text-muted-foreground/70 hidden sm:inline">
              {new Date(detail.created_at).toLocaleString('zh-CN')}（{formatTimeAgo(detail.created_at)}）
            </span>
          </div>
        }
      />

      {/* Input / Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">输入</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap bg-muted/20 rounded-lg p-3 font-mono">{detail.input_full}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">输出</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap bg-muted/20 rounded-lg p-3 font-mono">{detail.output_full}</p></CardContent>
        </Card>
      </div>

      {/* Selector Pipeline Trace */}
      {detail.pipeline_trace && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain className="h-4 w-4 text-primary" />
              选择器管线追踪
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5">
              {[
                { label: '意图分析', icon: Target, desc: `${detail.pipeline_trace.intent.intent_type} (${(detail.pipeline_trace.intent.confidence * 100).toFixed(0)}%)` },
                { label: '上下文增强', icon: Cpu, desc: `${detail.pipeline_trace.enriched_context.available_skills.length} skills, ${detail.pipeline_trace.enriched_context.active_workflows.length} workflows` },
                { label: '路由决策', icon: Brain, desc: `${detail.pipeline_trace.decision.route_type} → ${detail.pipeline_trace.decision.route_target}` },
              ].map((stage, i) => (
                <div key={stage.label} className="flex items-center gap-1.5 flex-1">
                  <div className="flex-1 rounded-lg border border-border/20 bg-card/40 p-3 text-center">
                    <stage.icon className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="text-[10px] font-medium">{stage.label}</p>
                    <p className="text-[9px] text-muted-foreground font-mono mt-1">{stage.desc}</p>
                  </div>
                  {i < 2 && <span className="text-muted-foreground/20 shrink-0">→</span>}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {detail.pipeline_trace.intent.entities.map((e) => (
                <Badge key={e} variant="outline" className="text-[9px] font-mono px-1.5 py-0">{e}</Badge>
              ))}
              {detail.pipeline_trace.intent.sub_intents.length > 0 && (
                <span className="text-[10px] text-muted-foreground ml-1">
                  子意图: {detail.pipeline_trace.intent.sub_intents.map((s) => INTENT_LABELS[s] ?? s).join(' + ')}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/60 ml-auto">意图类型: {INTENT_LABELS[detail.pipeline_trace.intent.intent_type] ?? detail.pipeline_trace.intent.intent_type}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] font-mono rounded bg-primary/10 text-primary px-1.5 py-0.5">目标: {detail.pipeline_trace.decision.route_target}</span>
              {Object.entries(detail.pipeline_trace.decision.parameters).map(([k, v]) => (
                <span key={k} className="text-[10px] font-mono rounded bg-muted/40 px-1.5 py-0.5 text-muted-foreground">{k}={String(v)}</span>
              ))}
            </div>
            {detail.pipeline_trace.enriched_context.rag_collections.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                {detail.pipeline_trace.enriched_context.rag_collections.map((c) => (
                  <div key={c.collection_id} className="flex flex-wrap items-center gap-2 rounded border border-border/20 bg-muted/10 px-2.5 py-1.5 text-[10px]">
                    <FileCode2 className="h-3 w-3 text-primary shrink-0" />
                    <span className="font-mono text-primary">{c.collection_name}</span>
                    <span className="text-muted-foreground/70">{c.matched_keywords.join(' / ')}</span>
                    <span className="ml-auto font-mono text-muted-foreground">{c.document_count} 篇 · 相关度 {(c.relevance_score * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
            {detail.pipeline_trace.enriched_context.code_context && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded border border-border/20 bg-muted/10 px-2.5 py-1.5 text-[10px]">
                <FileCode2 className="h-3 w-3 text-primary shrink-0" />
                <span className="font-mono text-primary">代码上下文: {detail.pipeline_trace.enriched_context.code_context.language}</span>
                <span className="text-muted-foreground/70">{detail.pipeline_trace.enriched_context.code_context.detected_patterns.join(' · ')}</span>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-2.5">
              管线策略: {STRATEGY_LABELS[detail.pipeline_trace.strategy] ?? detail.pipeline_trace.strategy} · 管线延迟: {detail.pipeline_trace.pipeline_latency_ms}ms · 理由: {detail.pipeline_trace.decision.reasoning}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Chain Sub-Decisions */}
      {detail.pipeline_trace?.decision.chain && detail.pipeline_trace.decision.chain.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain className="h-4 w-4 text-primary" />
              子决策链 (Chain)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {detail.pipeline_trace.decision.chain.map((step, i) => (
                <div key={i} className="flex items-start gap-3 rounded-md border border-border/20 bg-muted/10 px-4 py-2.5">
                  <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 mt-0.5">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[9px] font-mono">{step.route_type}</Badge>
                      <span className="text-xs font-mono">{step.route_target}</span>
                      <span className="text-[10px] text-muted-foreground">置信度 {(step.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{step.reasoning}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timing Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            耗时分解
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { label: 'Selector', ms: detail.timing_breakdown.selector_ms, color: 'bg-blue-500' },
              { label: 'Pre-Hook', ms: detail.timing_breakdown.pre_hook_ms, color: 'bg-amber-500' },
              { label: 'LLM 推理', ms: detail.timing_breakdown.llm_inference_ms, color: 'bg-primary' },
              { label: 'Post-Hook', ms: detail.timing_breakdown.post_hook_ms, color: 'bg-green-500' },
            ].map((phase) => (
              <div key={phase.label} className="flex items-center gap-3">
                <span className="text-xs w-20 text-right text-muted-foreground">{phase.label}</span>
                <div className="flex-1 h-5 bg-muted/20 rounded overflow-hidden">
                  <div
                    className={cn('h-full rounded', phase.color)}
                    style={{ width: `${Math.max(1, (phase.ms / detail.timing_breakdown.total_ms) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-mono w-16">{phase.ms}ms</span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center gap-3">
              <span className="text-xs w-20 text-right font-medium">Total</span>
              <div className="flex-1" />
              <span className="text-xs font-mono font-bold w-16">{detail.timing_breakdown.total_ms}ms</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hook Execution Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            Hook 执行日志
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detail.hook_logs.length === 0 ? (
            <p className="text-sm text-muted-foreground/50">无 Hook 执行记录</p>
          ) : (
            <div className="space-y-2">
              {detail.hook_logs.map((log, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border border-border/20 bg-muted/10 px-4 py-2.5">
                  <span className={cn('h-2 w-2 rounded-full shrink-0', log.status === 'success' ? 'bg-status-healthy' : log.status === 'failed' ? 'bg-status-failed' : 'bg-muted-foreground/30')} />
                  <Badge variant="outline" className="text-[9px] shrink-0 px-1.5 py-0">{HOOK_TYPE_LABELS[log.hook_type] ?? log.hook_type}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{log.hook_name}</p>
                    <p className="text-[10px] text-muted-foreground">{log.input_preview} → {log.output_preview}</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0 hidden sm:inline">{new Date(log.timestamp).toLocaleTimeString('zh-CN')}</span>
                  <span className={cn('text-xs', hookStatusColors[log.status])}>{log.status}</span>
                  <span className="text-xs font-mono text-muted-foreground">{log.duration_ms}ms</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memory Context */}
      {detail.memory_context.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-primary" />
              记忆上下文
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {detail.memory_context.map((m) => (
                <div key={m.id} className="flex items-start gap-3 rounded-md border border-border/20 bg-muted/10 px-4 py-2.5">
                  <Badge variant="outline" className="text-[9px] shrink-0 uppercase">{m.role}</Badge>
                  <p className="flex-1 min-w-0 text-xs leading-relaxed">{m.content}</p>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-mono text-muted-foreground">{m.token_count} tokens</p>
                    <p className="text-[10px] text-muted-foreground/50">{new Date(m.created_at).toLocaleTimeString('zh-CN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Detail */}
      {detail.error_detail && (
        <Card className="border-status-failed/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-status-failed">
              <AlertTriangle className="h-4 w-4" />
              错误详情
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-mono bg-status-failed/5 rounded-lg p-3 whitespace-pre-wrap">{detail.error_detail}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
