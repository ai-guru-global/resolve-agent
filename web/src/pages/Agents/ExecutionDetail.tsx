import { useParams } from 'react-router-dom';
import { Target, Cpu, Brain, Shield, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
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
            <p className="text-[10px] text-muted-foreground mt-2">
              管线策略: {detail.pipeline_trace.strategy} · 管线延迟: {detail.pipeline_trace.pipeline_latency_ms}ms · 理由: {detail.pipeline_trace.decision.reasoning}
            </p>
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
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{log.hook_name}</p>
                    <p className="text-[10px] text-muted-foreground">{log.input_preview} → {log.output_preview}</p>
                  </div>
                  <span className={cn('text-xs', hookStatusColors[log.status])}>{log.status}</span>
                  <span className="text-xs font-mono text-muted-foreground">{log.duration_ms}ms</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
