import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgent, useAgentAnalytics } from '@/hooks/useAgents';
import type { TrendInfo } from '@/types';

const timeRanges = [
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

function TrendBadge({ trend }: { trend: TrendInfo }) {
  const Icon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[10px]',
      trend.direction === 'up' ? 'text-status-healthy' : trend.direction === 'down' ? 'text-status-failed' : 'text-muted-foreground',
    )}>
      <Icon className="h-3 w-3" />
      {trend.value}%
    </span>
  );
}

export default function AgentAnalytics() {
  const { id } = useParams();
  const { data: agent } = useAgent(id ?? '');
  const [timeRange, setTimeRange] = useState('24h');
  const { data: analytics, isLoading } = useAgentAnalytics(id ?? '', timeRange);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${agent?.name ?? 'Agent'} - 性能分析`}
        breadcrumbs={[
          { label: 'Agent 管理', href: '/agents' },
          { label: agent?.name ?? '', href: `/agents/${id}` },
          { label: '性能分析' },
        ]}
        actions={
          <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
            {timeRanges.map((r) => (
              <button
                key={r.value}
                onClick={() => setTimeRange(r.value)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-md transition-colors',
                  timeRange === r.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {analytics && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">成功率</p>
                <div className="flex items-end gap-2 mt-1">
                  <p className="text-2xl font-bold">{(analytics.kpis.success_rate * 100).toFixed(1)}%</p>
                  <TrendBadge trend={analytics.kpis.success_rate_trend} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">平均延迟</p>
                <div className="flex items-end gap-2 mt-1">
                  <p className="text-2xl font-bold font-mono">
                    {analytics.kpis.avg_latency_ms > 1000 ? `${(analytics.kpis.avg_latency_ms / 1000).toFixed(1)}s` : `${analytics.kpis.avg_latency_ms}ms`}
                  </p>
                  <TrendBadge trend={analytics.kpis.avg_latency_trend} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">总执行量</p>
                <div className="flex items-end gap-2 mt-1">
                  <p className="text-2xl font-bold font-mono">{analytics.kpis.total_executions.toLocaleString()}</p>
                  <TrendBadge trend={analytics.kpis.execution_trend} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">错误率</p>
                <div className="flex items-end gap-2 mt-1">
                  <p className="text-2xl font-bold font-mono">{(analytics.kpis.error_rate * 100).toFixed(1)}%</p>
                  <TrendBadge trend={analytics.kpis.error_rate_trend} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="distribution">
            <TabsList>
              <TabsTrigger value="distribution">分布分析</TabsTrigger>
              <TabsTrigger value="errors">错误分析</TabsTrigger>
            </TabsList>

            <TabsContent value="distribution" className="mt-4 space-y-4">
              {/* Latency Percentiles */}
              <Card>
                <CardHeader><CardTitle className="text-sm">延迟分布 (百分位)</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(['p50', 'p75', 'p90', 'p95', 'p99'] as const).map((p) => {
                      const val = analytics.latency_percentiles[p];
                      const maxVal = analytics.latency_percentiles.p99;
                      return (
                        <div key={p} className="flex items-center gap-3">
                          <span className="text-xs w-8 text-right text-muted-foreground font-mono">{p.toUpperCase()}</span>
                          <div className="flex-1 h-5 bg-muted/20 rounded overflow-hidden">
                            <div className="h-full bg-primary/60 rounded" style={{ width: `${Math.max(2, (val / maxVal) * 100)}%` }} />
                          </div>
                          <span className="text-xs font-mono w-16">{val > 1000 ? `${(val / 1000).toFixed(1)}s` : `${val}ms`}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Route Distribution */}
              <Card>
                <CardHeader><CardTitle className="text-sm">路由类型分布</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.route_distribution.map((rd) => (
                      <div key={rd.route_type} className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-[10px] w-24 justify-center">{rd.route_type}</Badge>
                        <div className="flex-1 h-5 bg-muted/20 rounded overflow-hidden">
                          <div className="h-full bg-primary/50 rounded" style={{ width: `${rd.percentage}%` }} />
                        </div>
                        <span className="text-xs font-mono w-20 text-right">{rd.count} ({rd.percentage}%)</span>
                        <span className="text-[10px] text-muted-foreground w-20 text-right">置信度 {(rd.avg_confidence * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Confidence Histogram */}
              <Card>
                <CardHeader><CardTitle className="text-sm">选择器置信度分布</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 h-32">
                    {analytics.confidence_histogram.map((bucket) => {
                      const maxCount = Math.max(...analytics.confidence_histogram.map((b) => b.count));
                      return (
                        <div key={bucket.bucket} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full flex items-end justify-center" style={{ height: 100 }}>
                            <div className="w-full bg-primary/40 rounded-t" style={{ height: `${(bucket.count / maxCount) * 100}%` }} />
                          </div>
                          <span className="text-[9px] text-muted-foreground">{bucket.bucket}</span>
                          <span className="text-[10px] font-mono">{bucket.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="errors" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">高频错误</CardTitle></CardHeader>
                <CardContent>
                  {analytics.top_errors.length === 0 ? (
                    <p className="text-sm text-muted-foreground/50">暂无错误</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics.top_errors.map((err, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-md border border-border/20 bg-muted/10 px-4 py-2.5">
                          <span className="h-2 w-2 rounded-full bg-status-failed shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{err.error_type}</p>
                            <p className="text-[10px] text-muted-foreground">最后出现: {new Date(err.last_seen).toLocaleString('zh-CN')}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">{err.count} 次</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
