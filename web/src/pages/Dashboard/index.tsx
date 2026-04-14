import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Zap,
  Database,
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  Plus,
  Play,
  GitBranch,
  Radio,
  Cpu,
  HardDrive,
  Timer,
  Server,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusDot } from '@/components/StatusDot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type {
  AgentOverview,
  AgentType,
  ActivityEvent,
  AlertItem,
  StatusVariant,
  RouteType,
  HourlyExecution,
} from '@/types';
import {
  useDashboardMetrics,
  usePlatformStatus,
  useAgentOverviews,
  useActivityEvents,
  useExecutionStats,
  useAlerts,
} from '@/hooks/useDashboard';

const connectionStatusMap: Record<string, { label: string; variant: StatusVariant }> = {
  connected: { label: '已连接', variant: 'healthy' },
  disconnected: { label: '已断开', variant: 'failed' },
  degraded: { label: '降级', variant: 'degraded' },
};

const agentTypeLabels: Record<AgentType, string> = {
  mega: 'Mega',
  fta: 'FTA',
  rag: 'RAG',
  skill: 'Skill',
  custom: 'Custom',
};

const agentTypeColors: Record<AgentType, string> = {
  mega: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  fta: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  rag: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  skill: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  custom: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
};

const agentStatusVariantMap: Record<string, StatusVariant> = {
  active: 'healthy',
  inactive: 'unknown',
  error: 'failed',
};

const routeTypeLabels: Record<RouteType, string> = {
  fta: 'FTA 分析',
  skill: 'Skill 执行',
  rag: 'RAG 检索',
  code_analysis: '代码分析',
  multi: '多技能',
  direct: '直连',
};

const routeTypeColors: Record<RouteType, string> = {
  skill: 'bg-amber-500',
  fta: 'bg-purple-500',
  rag: 'bg-emerald-500',
  code_analysis: 'bg-slate-500',
  multi: 'bg-blue-500',
  direct: 'bg-cyan-500',
};

const severityConfig: Record<string, { label: string; variant: StatusVariant; icon: typeof AlertTriangle }> = {
  critical: { label: '严重', variant: 'failed', icon: AlertTriangle },
  high: { label: '高', variant: 'degraded', icon: AlertTriangle },
  medium: { label: '中', variant: 'progressing', icon: Info },
  low: { label: '低', variant: 'unknown', icon: Info },
};

const eventStatusIcon: Record<string, typeof CheckCircle2> = {
  completed: CheckCircle2,
  failed: XCircle,
  running: Loader2,
  info: Info,
  warning: AlertTriangle,
};

function formatUptime(seconds: number): string {
  if (seconds === 0) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}

function formatTimeAgo(isoString: string): string {
  const now = new Date('2026-04-08T10:00:00Z');
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function ProgressBar({ value, max, className, colorClass }: { value: number; max: number; className?: string; colorClass?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-muted', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', colorClass ?? 'bg-primary')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function MiniSparkline({ data, height = 32 }: { data: number[]; height?: number }) {
  const max = Math.max(...data, 1);
  const barWidth = 100 / data.length;
  return (
    <svg viewBox="0 0 100 40" className="w-full" style={{ height }} preserveAspectRatio="none">
      {data.map((v, i) => (
        <rect
          key={i}
          x={i * barWidth + 0.5}
          y={40 - (v / max) * 36}
          width={barWidth - 1}
          height={(v / max) * 36}
          rx={0.5}
          className="fill-primary/60"
        />
      ))}
    </svg>
  );
}

function AgentCard({ agent, onClick }: { agent: AgentOverview; onClick: () => void }) {
  const statusVariant = agentStatusVariantMap[agent.status] ?? 'unknown';
  const typeColor = agentTypeColors[agent.type] ?? agentTypeColors.custom;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-lg border border-border/50 bg-card p-3.5 transition-all hover:border-primary/30 hover:bg-accent/20"
    >
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-semibold border', typeColor)}>
            {agentTypeLabels[agent.type]}
          </div>
          <span className="text-sm font-medium truncate">{agent.name}</span>
        </div>
        <StatusDot status={statusVariant} animated={agent.status === 'active'} size="sm" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-2.5">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">成功率</p>
          <p className={cn(
            'text-sm font-semibold tabular-nums',
            agent.success_rate >= 0.95 ? 'text-status-healthy' : agent.success_rate >= 0.8 ? 'text-status-degraded' : 'text-status-failed',
          )}>
            {(agent.success_rate * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">执行数</p>
          <p className="text-sm font-semibold tabular-nums">{agent.total_executions.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">平均延迟</p>
          <p className="text-sm font-semibold tabular-nums">{formatDuration(agent.avg_latency_ms)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>运行 {formatUptime(agent.uptime_seconds)}</span>
        {agent.error_count_24h > 0 && (
          <span className="text-status-failed font-medium">{agent.error_count_24h} 错误/24h</span>
        )}
      </div>
    </button>
  );
}

function ActivityTimeline({ events, onAgentClick }: { events: ActivityEvent[]; onAgentClick: (id: string) => void }) {
  return (
    <div className="space-y-0">
      {events.map((event, idx) => {
        const StatusIcon = eventStatusIcon[event.status] ?? Info;
        const isLast = idx === events.length - 1;
        const statusColor = event.status === 'completed' ? 'text-status-healthy'
          : event.status === 'failed' ? 'text-status-failed'
          : event.status === 'running' ? 'text-status-progressing'
          : event.status === 'warning' ? 'text-status-degraded'
          : 'text-muted-foreground';

        return (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn('rounded-full p-1', statusColor)}>
                <StatusIcon className={cn('h-3.5 w-3.5', event.status === 'running' && 'animate-spin')} />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border/50 my-1" />}
            </div>
            <div className={cn('pb-4 min-w-0 flex-1')}>
              <div className="flex items-center gap-2 mb-0.5">
                <button
                  onClick={() => onAgentClick(event.agent_id)}
                  className="text-xs font-medium text-primary hover:underline truncate"
                >
                  {event.agent_name}
                </button>
                <span className={cn('rounded px-1 py-0.5 text-[10px] border', agentTypeColors[event.agent_type])}>
                  {agentTypeLabels[event.agent_type]}
                </span>
              </div>
              <p className="text-sm text-foreground/80 leading-snug">{event.description}</p>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                <span>{formatTimeAgo(event.timestamp)}</span>
                {event.duration_ms != null && event.duration_ms > 0 && (
                  <span>{formatDuration(event.duration_ms)}</span>
                )}
                {event.route_type && (
                  <span className="text-primary/70">{routeTypeLabels[event.route_type]}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RouteDistributionChart({ stats }: { stats: { route_type: RouteType; count: number; percentage: number }[] }) {
  const maxCount = Math.max(...stats.map((s) => s.count), 1);
  return (
    <div className="space-y-2.5">
      {stats.map((s) => (
        <div key={s.route_type} className="group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{routeTypeLabels[s.route_type]}</span>
            <span className="text-xs font-medium tabular-nums">{s.count.toLocaleString()} <span className="text-muted-foreground">({s.percentage.toFixed(1)}%)</span></span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all duration-700', routeTypeColors[s.route_type])}
              style={{ width: `${(s.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function HourlyChart({ data }: { data: HourlyExecution[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-[2px] h-20">
        {data.map((d, i) => {
          const h = (d.count / maxCount) * 100;
          const failH = (d.failed_count / maxCount) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end h-full group relative">
              <div
                className="w-full bg-primary/50 rounded-t-sm transition-all group-hover:bg-primary/80"
                style={{ height: `${h}%` }}
              />
              {d.failed_count > 0 && (
                <div
                  className="w-full bg-status-failed/60 rounded-t-sm absolute bottom-0"
                  style={{ height: `${failH}%` }}
                />
              )}
              <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-popover border border-border rounded px-2 py-1 text-[10px] whitespace-nowrap z-10">
                {d.hour}:00 — {d.count} 次执行
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>
    </div>
  );
}

const defaultSeverity = { label: '低', variant: 'unknown' as StatusVariant, icon: Info };

function AlertCard({ alert }: { alert: AlertItem }) {
  const severity = alert.severity;
  const severityLevel = severityConfig[severity] ?? defaultSeverity;
  const Icon = severityLevel.icon;
  return (
    <div className={cn(
      'rounded-md border p-2.5 transition-colors',
      alert.acknowledged ? 'border-border/30 opacity-60' : 'border-border/50',
    )}>
      <div className="flex items-start gap-2">
        <Icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', severity === 'critical' ? 'text-status-failed' : severity === 'high' ? 'text-status-degraded' : 'text-muted-foreground')} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium truncate">{alert.title}</span>
            <StatusBadge variant={severityLevel.variant} label={severityLevel.label} className="shrink-0" />
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{alert.description}</p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <span>{alert.agent_name}</span>
            <span>·</span>
            <span>{formatTimeAgo(alert.created_at)}</span>
            {alert.acknowledged && <span className="text-status-healthy">已确认</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: platformStatus, isLoading: statusLoading } = usePlatformStatus();
  const { data: agentsData, isLoading: agentsLoading } = useAgentOverviews();
  const { data: activityData, isLoading: activityLoading } = useActivityEvents();
  const { data: statsData, isLoading: statsLoading } = useExecutionStats();
  const { data: alertsData, isLoading: alertsLoading } = useAlerts();

  const connStatus = platformStatus
    ? connectionStatusMap[platformStatus.connection_status] ?? { label: '未知', variant: 'unknown' as StatusVariant }
    : null;

  const unacknowledgedAlerts = alertsData?.alerts.filter((a) => !a.acknowledged).length ?? 0;

  const metricCards = metrics
    ? [
        { icon: Bot, value: String(metrics.total_agents), label: 'Agent 总数', sub: `${metrics.active_agents} 运行 / ${metrics.error_agents} 异常`, trend: undefined },
        { icon: Activity, value: String(metrics.today_executions), label: '今日执行', trend: metrics.execution_trend },
        { icon: CheckCircle2, value: `${(metrics.success_rate * 100).toFixed(1)}%`, label: '执行成功率', sub: `${(metrics.success_rate * 100) >= 95 ? '优秀' : '需关注'}` },
        { icon: Timer, value: formatDuration(metrics.avg_latency_ms), label: '平均延迟', sub: 'P99: 25.1s' },
        { icon: Zap, value: String(metrics.skill_executions), label: 'Skills 执行', trend: metrics.execution_trend },
        { icon: Database, value: metrics.knowledge_entries.toLocaleString(), label: '知识条目' },
      ]
    : [];

  return (
    <div className="space-y-6 animate-slide-up">
      <PageHeader
        title="Harness 概览"
        description="Agent Harness 多智能体管理平台 — 运行状态与全局监控"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/playground')}>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Playground
            </Button>
            <Button size="sm" onClick={() => navigate('/agents/new')}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              创建 Agent
            </Button>
          </div>
        }
      />

      {/* Row 1: Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {metricsLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-7 w-12" />
                </CardContent>
              </Card>
            ))
          : metricCards.map((m) => (
              <MetricCard
                key={m.label}
                icon={m.icon}
                value={m.value}
                label={m.label}
                trend={m.trend}
              />
            ))}
      </div>

      {/* Row 2: Agent Status Grid */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Agent 状态矩阵</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate('/agents')}>
              查看全部 <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {agentsLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border/50 p-3.5">
                  <Skeleton className="h-4 w-24 mb-3" />
                  <div className="grid grid-cols-3 gap-3">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {agentsData?.agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onClick={() => navigate(`/agents/${agent.id}`)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 3: Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Activity + Analytics */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <Tabs defaultValue="activity">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <TabsList className="h-8">
                    <TabsTrigger value="activity" className="text-xs px-3 h-7">活动时间线</TabsTrigger>
                    <TabsTrigger value="analytics" className="text-xs px-3 h-7">执行分析</TabsTrigger>
                    <TabsTrigger value="hourly" className="text-xs px-3 h-7">24h 趋势</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <TabsContent value="activity" className="mt-0">
                  {activityLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex gap-3">
                          <Skeleton className="h-6 w-6 rounded-full" />
                          <div className="flex-1 space-y-1">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-4 w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ScrollArea className="h-[420px] pr-3">
                      <ActivityTimeline
                        events={activityData?.events ?? []}
                        onAgentClick={(id) => navigate(`/agents/${id}`)}
                      />
                    </ScrollArea>
                  )}
                </TabsContent>

                <TabsContent value="analytics" className="mt-0">
                  {statsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i}>
                          <Skeleton className="h-3 w-20 mb-1" />
                          <Skeleton className="h-2 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="rounded-lg border border-border/40 p-3 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">总执行</p>
                          <p className="text-lg font-bold tabular-nums">{statsData?.total.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg border border-border/40 p-3 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">成功</p>
                          <p className="text-lg font-bold tabular-nums text-status-healthy">{statsData?.success.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg border border-border/40 p-3 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">失败</p>
                          <p className="text-lg font-bold tabular-nums text-status-failed">{statsData?.failed.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg border border-border/40 p-3 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">运行中</p>
                          <p className="text-lg font-bold tabular-nums text-status-progressing">{statsData?.running}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">路由类型分布</h4>
                        <RouteDistributionChart stats={statsData?.by_route_type ?? []} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border border-border/40 p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">平均耗时</p>
                          <p className="text-base font-bold tabular-nums">{formatDuration(statsData?.avg_duration_ms ?? 0)}</p>
                        </div>
                        <div className="rounded-lg border border-border/40 p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">P99 耗时</p>
                          <p className="text-base font-bold tabular-nums">{formatDuration(statsData?.p99_duration_ms ?? 0)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="hourly" className="mt-0">
                  {statsLoading ? (
                    <Skeleton className="h-28 w-full" />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-primary/60" /> 执行次数</span>
                        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-status-failed/60" /> 失败次数</span>
                      </div>
                      <HourlyChart data={statsData?.by_hour ?? []} />
                      {metrics?.execution_trend_24h && (
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">执行量趋势</h4>
                          <MiniSparkline data={metrics.execution_trend_24h} height={48} />
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>

        {/* Right: Platform Status + Alerts + Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          {/* Platform Health */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" />
                平台状态
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {statusLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))
              ) : platformStatus ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">连接状态</span>
                    <span className="flex items-center gap-1.5 text-xs">
                      <StatusDot status={connStatus?.variant ?? 'unknown'} animated />
                      {connStatus?.label ?? '未知'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">端点</span>
                    <span className="text-xs font-mono">{platformStatus.endpoint}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">延迟</span>
                    <span className="text-xs font-mono">{platformStatus.latency_ms}ms</span>
                  </div>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Cpu className="h-3 w-3" /> CPU</span>
                      <span className="text-xs font-mono">{platformStatus.cpu_usage_percent}%</span>
                    </div>
                    <ProgressBar value={platformStatus.cpu_usage_percent} max={100} colorClass={platformStatus.cpu_usage_percent > 80 ? 'bg-status-failed' : platformStatus.cpu_usage_percent > 60 ? 'bg-status-degraded' : 'bg-status-healthy'} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><HardDrive className="h-3 w-3" /> 内存</span>
                      <span className="text-xs font-mono">{platformStatus.memory_usage_percent}%</span>
                    </div>
                    <ProgressBar value={platformStatus.memory_usage_percent} max={100} colorClass={platformStatus.memory_usage_percent > 80 ? 'bg-status-failed' : platformStatus.memory_usage_percent > 60 ? 'bg-status-degraded' : 'bg-status-healthy'} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">运行时间</span>
                    <span className="text-xs font-mono">{formatUptime(platformStatus.uptime_seconds)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Goroutines</span>
                    <span className="text-xs font-mono">{platformStatus.goroutines}</span>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          {/* Active Alerts */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  活跃告警
                  {unacknowledgedAlerts > 0 && (
                    <span className="ml-1 rounded-full bg-status-failed/20 px-1.5 py-0.5 text-[10px] font-bold text-status-failed">
                      {unacknowledgedAlerts}
                    </span>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-md" />
                  ))}
                </div>
              ) : alertsData?.alerts.length ? (
                <ScrollArea className="h-[240px]">
                  <div className="space-y-2 pr-2">
                    {alertsData.alerts.map((alert) => (
                      <AlertCard key={alert.id} alert={alert} />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-status-healthy" />
                  无活跃告警
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">快速操作</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="h-auto py-2.5 flex-col gap-1 text-xs" onClick={() => navigate('/agents/new')}>
                  <Plus className="h-4 w-4" />
                  创建 Agent
                </Button>
                <Button variant="outline" size="sm" className="h-auto py-2.5 flex-col gap-1 text-xs" onClick={() => navigate('/playground')}>
                  <Play className="h-4 w-4" />
                  Playground
                </Button>
                <Button variant="outline" size="sm" className="h-auto py-2.5 flex-col gap-1 text-xs" onClick={() => navigate('/workflows')}>
                  <GitBranch className="h-4 w-4" />
                  故障分析
                </Button>
                <Button variant="outline" size="sm" className="h-auto py-2.5 flex-col gap-1 text-xs" onClick={() => navigate('/rag/collections')}>
                  <Database className="h-4 w-4" />
                  知识库
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                系统信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">版本</span>
                  <span className="font-mono">v0.6.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Commit</span>
                  <span className="font-mono">a3f7c2e</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">区域</span>
                  <span className="font-mono">{platformStatus?.region ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">同步间隔</span>
                  <span className="font-mono">{platformStatus?.sync_interval_seconds ?? '—'}s</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
