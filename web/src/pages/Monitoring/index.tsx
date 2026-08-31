import { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useMonitoringOverview } from '@/hooks/useMonitoring';
import type { AlertItem, SystemMetric, FeedbackSignal, CircuitBreakerStatus, AdaptiveWeight, StatusVariant } from '@/types';

// ─── Local icon map for SystemMetric.key ───
const METRIC_ICONS: Record<SystemMetric['key'], typeof Cpu> = {
  cpu: Cpu,
  memory: HardDrive,
  agent_pool: Server,
  api_latency: Clock,
  selector_fallback: Activity,
  network: Wifi,
};

const SEVERITY_MAP: Record<string, { label: string; variant: StatusVariant; className: string }> = {
  critical: { label: '严重', variant: 'failed', className: 'border-l-status-failed' },
  high: { label: '高', variant: 'degraded', className: 'border-l-status-degraded' },
  medium: { label: '中', variant: 'progressing', className: 'border-l-status-progressing' },
  low: { label: '低', variant: 'unknown', className: 'border-l-status-unknown' },
};

const SEVERITY_COLORS: Record<string, string> = {
  info: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  warn: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  error: 'text-red-500 bg-red-500/10 border-red-500/20',
  critical: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
};

const CB_STATE_MAP: Record<string, { label: string; color: string }> = {
  closed: { label: 'Closed', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  open: { label: 'Open', color: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20' },
  half_open: { label: 'Half-Open', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
};

const METRIC_STATUS_COLORS: Record<string, string> = {
  normal: 'text-status-healthy',
  warning: 'text-status-degraded',
  critical: 'text-status-failed',
};

const METRIC_BAR_COLORS: Record<string, string> = {
  normal: 'bg-status-healthy',
  warning: 'bg-status-degraded',
  critical: 'bg-status-failed',
};

export default function MonitorAlerts() {
  const [showAcknowledged, setShowAcknowledged] = useState(true);
  const { data } = useMonitoringOverview();
  const alerts: AlertItem[] = data?.alerts ?? [];
  const systemMetrics: SystemMetric[] = data?.system_metrics ?? [];
  const feedbackSignals: FeedbackSignal[] = data?.feedback_signals ?? [];
  const circuitBreakers: CircuitBreakerStatus[] = data?.circuit_breakers ?? [];
  const adaptiveWeights: AdaptiveWeight[] = data?.adaptive_weights ?? [];

  const activeAlerts = alerts.filter((a) => !a.acknowledged).length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical' && !a.acknowledged).length;

  const filteredAlerts = showAcknowledged ? alerts : alerts.filter((a) => !a.acknowledged);

  return (
    <div className="space-y-6 animate-slide-up">
      <PageHeader
        title="监控告警"
        description="系统健康监控与告警管理 — 关键指标、Agent 运行状态与异常告警"
      />

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard icon={Bell} value={String(activeAlerts)} label="活跃告警" />
        <MetricCard icon={AlertTriangle} value={String(criticalAlerts)} label="严重告警" />
        <MetricCard icon={CheckCircle2} value="99.2%" label="系统可用性" trend={{ value: 0.1, direction: 'up' }} />
        <MetricCard icon={Shield} value="100%" label="安全拦截率" />
      </div>

      <Tabs defaultValue="alerts">
        <TabsList className="h-9">
          <TabsTrigger value="alerts" className="text-xs px-4 h-8">
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            告警列表
            {activeAlerts > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[9px] h-4 px-1.5">{activeAlerts}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="metrics" className="text-xs px-4 h-8">
            <Activity className="h-3.5 w-3.5 mr-1.5" />
            系统指标
          </TabsTrigger>
          <TabsTrigger value="loop" className="text-xs px-4 h-8">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Loop Engineering
          </TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              共 {filteredAlerts.length} 条告警
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => setShowAcknowledged(!showAcknowledged)}
            >
              {showAcknowledged ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {showAcknowledged ? '显示全部' : '隐藏已确认'}
            </Button>
          </div>

          {filteredAlerts.map((alert) => {
            const severityInfo = SEVERITY_MAP[alert.severity] ?? { label: alert.severity, variant: 'unknown' as const, className: 'border-l-border' };
            return (
              <Card key={alert.id} className={cn('border-border/30 border-l-4', severityInfo.className)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <StatusBadge variant={severityInfo.variant} label={severityInfo.label} />
                        {alert.acknowledged && (
                          <span className="text-[10px] text-muted-foreground/50 bg-muted/30 rounded px-1.5 py-0.5">已确认</span>
                        )}
                      </div>
                      <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">{alert.description}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
                        <span>Agent: {alert.agent_name}</span>
                        <span>{new Date(alert.created_at).toLocaleString('zh-CN')}</span>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <Button variant="outline" size="sm" className="text-[11px] shrink-0">
                        确认
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* System Metrics Tab */}
        <TabsContent value="metrics" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {systemMetrics.map((metric) => {
              const percentage = metric.unit === '%' ? metric.value : (metric.value / metric.threshold) * 100;
              const statusColor = METRIC_STATUS_COLORS[metric.status];
              const barColor = METRIC_BAR_COLORS[metric.status];

              return (
                <Card key={metric.name} className="border-border/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {(() => { const Icon = METRIC_ICONS[metric.key] ?? Cpu; return <Icon className="h-4 w-4 text-muted-foreground" />; })()}
                        <span className="text-sm font-medium">{metric.name}</span>
                      </div>
                      <span className={cn('text-lg font-display font-bold tabular-nums', statusColor)}>
                        {metric.value}{metric.unit}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', barColor)}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
                        <span>0</span>
                        <span>阈值: {metric.threshold}{metric.unit}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Best Practices Recommendations */}
          <Card className="mt-4 border-border/30">
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wider font-semibold mb-3">监控最佳实践</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-md border border-border/20 bg-background/30 px-4 py-3">
                  <p className="text-sm font-medium mb-1">关键指标监控</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    重点关注请求延迟、错误率、Agent 池使用率和选择器回退率四项核心指标
                  </p>
                </div>
                <div className="rounded-md border border-border/20 bg-background/30 px-4 py-3">
                  <p className="text-sm font-medium mb-1">告警阈值建议</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    生产环境选择器置信度阈值建议 0.75，回退率告警阈值建议 15%
                  </p>
                </div>
                <div className="rounded-md border border-border/20 bg-background/30 px-4 py-3">
                  <p className="text-sm font-medium mb-1">故障排查清单</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Agent 执行失败时，依次检查：技能可用性 → 选择器日志 → RAG 索引状态 → 网络连通性
                  </p>
                </div>
                <div className="rounded-md border border-border/20 bg-background/30 px-4 py-3">
                  <p className="text-sm font-medium mb-1">性能优化建议</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    启用选择器缓存（TTL 300s）和 RAG 查询缓存，配置合理的 Agent 池并发限制
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loop Engineering Tab */}
        <TabsContent value="loop" className="mt-4 space-y-4">
          {/* Feedback Signals */}
          <Card className="border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">反馈信号流 (Feedback Signals)</p>
                <Badge variant="outline" className="ml-auto text-[9px]">实时</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">来源</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">事件</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">计数</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">速率/min</th>
                      <th className="text-center py-2 px-2 font-medium text-muted-foreground">严重性</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">最后出现</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackSignals.map((sig, i) => (
                      <tr key={i} className="border-b border-border/20">
                        <td className="py-1.5 px-2 font-mono text-primary">{sig.source}</td>
                        <td className="py-1.5 px-2">{sig.event}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums">{sig.count}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums">{sig.rate_per_min}</td>
                        <td className="py-1.5 px-2 text-center">
                          <span className={cn('inline-block rounded px-1.5 py-0.5 text-[10px] border', SEVERITY_COLORS[sig.severity])}>
                            {sig.severity}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-right text-muted-foreground/60">
                          {new Date(sig.last_seen).toLocaleTimeString('zh-CN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Circuit Breaker Status */}
          <Card className="border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">熔断器状态 (Circuit Breakers)</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {circuitBreakers.map((cb) => {
                  const stateInfo = CB_STATE_MAP[cb.state] ?? { label: cb.state, color: 'text-gray-500 border-gray-300' };
                  const usagePct = (cb.failures / cb.threshold) * 100;
                  return (
                    <div key={cb.name} className="rounded-lg border border-border/30 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-medium">{cb.name}</span>
                        <span className={cn('rounded px-1.5 py-0.5 text-[10px] border', stateInfo.color)}>
                          {stateInfo.label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden mb-1.5">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            cb.state === 'closed' ? 'bg-emerald-500' : cb.state === 'half_open' ? 'bg-amber-500' : 'bg-red-500'
                          )}
                          style={{ width: `${Math.min(usagePct, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
                        <span>Failures: {cb.failures}/{cb.threshold}</span>
                        <span>{new Date(cb.last_state_change).toLocaleTimeString('zh-CN')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Adaptive Selector Weights */}
          <Card className="border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">自适应选择器权重 (Adaptive Weights)</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {adaptiveWeights.map((w) => (
                  <div key={w.route_type} className="rounded-lg border border-border/30 p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{w.route_type}</p>
                    <p className={cn(
                      'text-lg font-display font-bold tabular-nums',
                      w.weight > 1.0 ? 'text-emerald-600 dark:text-emerald-400' : w.weight < 1.0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                    )}>
                      {w.weight.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {w.trend === 'up' ? '↑ 上升' : w.trend === 'down' ? '↓ 下降' : '→ 稳定'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card className="border-border/30">
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wider font-semibold mb-3">Loop Engineering 最佳实践</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-md border border-border/20 bg-background/30 px-4 py-3">
                  <p className="text-sm font-medium mb-1">反馈循环监控</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    关注 feedback_signals_total 和 retry_exhausted_total 两项核心指标，异常增长时检查下游服务健康状态
                  </p>
                </div>
                <div className="rounded-md border border-border/20 bg-background/30 px-4 py-3">
                  <p className="text-sm font-medium mb-1">熔断器管理</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    OPEN 状态持续超过 5 分钟应触发告警，检查下游服务是否可恢复
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
