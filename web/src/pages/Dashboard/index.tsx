import { ClipboardList, Zap, ShieldCheck, Database } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusDot } from '@/components/StatusDot';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { OpsTicket, StatusVariant } from '@/types';
import { useDashboardMetrics, useTickets, usePlatformStatus } from '@/hooks/useDashboard';

const ticketStatusMap: Record<OpsTicket['status'], { label: string; variant: StatusVariant }> = {
  processing: { label: '处理中', variant: 'progressing' },
  pending: { label: '待处理', variant: 'unknown' },
  completed: { label: '已完成', variant: 'healthy' },
  approved: { label: '已审批', variant: 'healthy' },
};

const ticketColumns: DataTableColumn<OpsTicket>[] = [
  { key: 'id', label: '工单号', mono: true },
  { key: 'title', label: '标题' },
  {
    key: 'status',
    label: '状态',
    render: (val) => {
      const s = String(val) as OpsTicket['status'];
      const mapped = ticketStatusMap[s];
      return mapped ? <StatusBadge variant={mapped.variant} label={mapped.label} /> : <span>—</span>;
    },
  },
  { key: 'priority', label: '优先级', render: (val) => <span className="capitalize">{String(val)}</span> },
  { key: 'created_at', label: '创建时间' },
  { key: 'assignee', label: '负责人' },
];

const connectionStatusMap: Record<string, { label: string; variant: StatusVariant }> = {
  connected: { label: '已连接', variant: 'healthy' },
  disconnected: { label: '已断开', variant: 'failed' },
  degraded: { label: '降级', variant: 'degraded' },
};

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets();
  const { data: platformStatus, isLoading: statusLoading } = usePlatformStatus();

  const metricCards = metrics
    ? [
        { icon: ClipboardList, value: String(metrics.today_tickets), label: '今日工单', accent: 'border-l-status-progressing', trend: metrics.ticket_trend },
        { icon: Zap, value: String(metrics.skill_executions), label: '技能执行', accent: 'border-l-status-healthy', trend: metrics.execution_trend },
        { icon: ShieldCheck, value: String(metrics.change_approvals), label: '变更审批', accent: 'border-l-status-degraded' },
        { icon: Database, value: metrics.knowledge_entries.toLocaleString(), label: '知识条目', accent: 'border-l-primary' },
      ]
    : [];

  const connStatus = platformStatus
    ? connectionStatusMap[platformStatus.connection_status] ?? { label: '未知', variant: 'unknown' as StatusVariant }
    : null;

  return (
    <div className="space-y-6">
      <PageHeader title="运维概览" description="ResolveNet 现场助手运维数据总览" />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-l-4 border-l-muted">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : metricCards.map((m) => (
              <MetricCard
                key={m.label}
                icon={m.icon}
                value={m.value}
                label={m.label}
                accentColor={m.accent}
                trend={m.trend}
              />
            ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Tickets */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>近期工单</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <DataTable columns={ticketColumns} data={ticketsData?.tickets ?? []} loading={ticketsLoading} />
          </CardContent>
        </Card>

        {/* Platform Status */}
        <Card>
          <CardHeader>
            <CardTitle>ResolveNet 平台状态</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))
            ) : platformStatus ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">连接状态</span>
                  <span className="flex items-center gap-1.5 text-sm">
                    <StatusDot status={connStatus?.variant ?? 'unknown'} animated />
                    {connStatus?.label ?? '未知'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">端点地址</span>
                  <span className="text-sm font-mono">{platformStatus.endpoint}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">同步间隔</span>
                  <span className="text-sm font-mono">{platformStatus.sync_interval_seconds}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">区域</span>
                  <span className="text-sm font-mono">{platformStatus.region}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">延迟</span>
                  <span className="text-sm font-mono">{platformStatus.latency_ms}ms</span>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
