import { useParams, Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgent, useAgentDiagnostics } from '@/hooks/useAgents';
import type { DiagnosticCheckStatus, StatusVariant } from '@/types';

const statusIcons: Record<DiagnosticCheckStatus, typeof CheckCircle> = {
  pass: CheckCircle,
  warning: AlertTriangle,
  fail: XCircle,
};

const statusColors: Record<DiagnosticCheckStatus, string> = {
  pass: 'text-status-healthy',
  warning: 'text-amber-500',
  fail: 'text-status-failed',
};

const categoryLabels: Record<string, string> = {
  runtime: '运行时',
  config: '配置',
  connectivity: '连通性',
  performance: '性能',
  dependency: '依赖',
};

const overallStatusMap: Record<string, { label: string; variant: StatusVariant }> = {
  healthy: { label: '健康', variant: 'healthy' },
  degraded: { label: '降级', variant: 'degraded' },
  failed: { label: '异常', variant: 'failed' },
};

const executionStatusMap: Record<string, { label: string; variant: StatusVariant }> = {
  completed: { label: '完成', variant: 'healthy' },
  failed: { label: '失败', variant: 'failed' },
  running: { label: '运行中', variant: 'progressing' },
  pending: { label: '等待', variant: 'unknown' },
};

export default function AgentDiagnostics() {
  const { id } = useParams();
  const { data: agent } = useAgent(id ?? '');
  const { data: diagnostics, isLoading } = useAgentDiagnostics(id ?? '');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const statusInfo = diagnostics ? overallStatusMap[diagnostics.overall_status] : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${agent?.name ?? 'Agent'} - 健康诊断`}
        breadcrumbs={[
          { label: 'Agent 管理', href: '/agents' },
          { label: agent?.name ?? '', href: `/agents/${id}` },
          { label: '健康诊断' },
        ]}
        actions={statusInfo && <StatusBadge variant={statusInfo.variant} label={statusInfo.label} />}
      />

      {diagnostics && (
        <>
          {/* Health Score */}
          <Card>
            <CardContent className="p-6 flex items-center gap-6">
              <div className="relative h-20 w-20">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/20" />
                  <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={`${diagnostics.health_score} ${100 - diagnostics.health_score}`}
                    className={cn(diagnostics.health_score >= 80 ? 'text-status-healthy' : diagnostics.health_score >= 50 ? 'text-amber-500' : 'text-status-failed')} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{diagnostics.health_score}</span>
              </div>
              <div>
                <p className="text-sm font-medium">健康评分</p>
                <p className="text-xs text-muted-foreground">检查时间: {new Date(diagnostics.checked_at).toLocaleString('zh-CN')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  通过 {diagnostics.checks.filter((c) => c.status === 'pass').length} / 警告 {diagnostics.checks.filter((c) => c.status === 'warning').length} / 失败 {diagnostics.checks.filter((c) => c.status === 'fail').length}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Diagnostic Checks */}
          <Card>
            <CardHeader><CardTitle className="text-sm">诊断清单</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {diagnostics.checks.map((check, i) => {
                const Icon = statusIcons[check.status];
                return (
                  <div key={i} className="flex items-start gap-3 rounded-md border border-border/20 bg-muted/10 px-4 py-3">
                    <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', statusColors[check.status])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{check.name}</span>
                        <Badge variant="secondary" className="text-[9px]">{categoryLabels[check.category] ?? check.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
                      {check.detail && <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">{check.detail}</p>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent Errors */}
          {diagnostics.recent_errors.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4 text-primary" />最近错误</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {diagnostics.recent_errors.map((exec) => {
                  const s = executionStatusMap[exec.status];
                  return (
                    <Link key={exec.id} to={`/agents/${id}/executions/${exec.id}`} className="flex items-center gap-3 rounded-md border border-border/20 bg-muted/10 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                      {s && <StatusBadge variant={s.variant} label={s.label} />}
                      <span className="text-xs flex-1 truncate">{exec.input_preview}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(exec.created_at).toLocaleString('zh-CN')}</span>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
