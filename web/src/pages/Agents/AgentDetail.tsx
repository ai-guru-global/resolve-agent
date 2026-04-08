import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgent, useAgentExecutions, useAgentRuntimeStatus } from '@/hooks/useAgents';
import type { AgentExecution, StatusVariant } from '@/types';
import { agentStatusToVariant } from '@/types';

const typeLabels: Record<string, string> = {
  mega: '综合智能体',
  skill: '技能智能体',
  fta: '故障分析',
  rag: '知识问答',
  custom: '自定义',
};

const executionStatusMap: Record<string, { label: string; variant: StatusVariant }> = {
  completed: { label: '完成', variant: 'healthy' },
  failed: { label: '失败', variant: 'failed' },
  running: { label: '运行中', variant: 'progressing' },
  pending: { label: '等待', variant: 'unknown' },
};

const executionColumns: DataTableColumn<AgentExecution>[] = [
  { key: 'id', label: 'ID', mono: true },
  { key: 'input_preview', label: '输入', render: (val) => <span className="line-clamp-1 max-w-[200px]">{String(val)}</span> },
  {
    key: 'status',
    label: '状态',
    render: (val) => {
      const s = executionStatusMap[String(val)];
      return s ? <StatusBadge variant={s.variant} label={s.label} /> : <span>{String(val)}</span>;
    },
  },
  { key: 'route_type', label: '路由', render: (val) => <Badge variant="secondary" className="text-[10px]">{String(val)}</Badge> },
  { key: 'confidence', label: '置信度', render: (val) => <span>{(Number(val) * 100).toFixed(0)}%</span> },
  { key: 'duration_ms', label: '耗时', render: (val) => <span className="font-mono">{Number(val) > 1000 ? `${(Number(val) / 1000).toFixed(1)}s` : `${val}ms`}</span> },
  { key: 'created_at', label: '时间', render: (val) => <span className="text-xs">{new Date(String(val)).toLocaleString('zh-CN')}</span> },
];

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days} 天 ${hours} 小时`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours} 小时 ${minutes} 分钟`;
}

export default function AgentDetail() {
  const { id } = useParams();
  const { data: agent, isLoading: agentLoading } = useAgent(id ?? '');
  const { data: statusData, isLoading: statusLoading } = useAgentRuntimeStatus(id ?? '');
  const { data: executionsData, isLoading: executionsLoading } = useAgentExecutions(id ?? '');

  const agentStatus = agent?.status as keyof typeof agentStatusToVariant | undefined;
  const statusVariant = agentStatus ? agentStatusToVariant[agentStatus] : 'unknown';

  const statusLabels: Record<string, string> = {
    active: '运行中',
    inactive: '未激活',
    error: '异常',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={agentLoading ? '加载中...' : (agent?.name ?? `智能体 ${id ?? ''}`)}
        breadcrumbs={[
          { label: '智能体管理', href: '/agents' },
          { label: agent?.name ?? id ?? '详情' },
        ]}
        actions={
          agentLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <StatusBadge variant={statusVariant} label={statusLabels[agent?.status ?? ''] ?? agent?.status ?? '未知'} />
          )
        }
      />

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">配置信息</TabsTrigger>
          <TabsTrigger value="status">运行状态</TabsTrigger>
          <TabsTrigger value="history">执行记录</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>基本配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {agentLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i}>
                    <div className="flex justify-between py-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    {i < 4 && <Separator />}
                  </div>
                ))
              ) : agent ? (
                <>
                  <div className="flex justify-between py-1">
                    <span className="text-sm text-muted-foreground">ID</span>
                    <span className="text-sm font-mono">{agent.id}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between py-1">
                    <span className="text-sm text-muted-foreground">类型</span>
                    <span className="text-sm">{typeLabels[agent.type] ?? agent.type}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between py-1">
                    <span className="text-sm text-muted-foreground">模型</span>
                    <span className="text-sm font-mono">{String(agent.config.model ?? '—')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between py-1">
                    <span className="text-sm text-muted-foreground">创建时间</span>
                    <span className="text-sm">
                      {agent.config.created_at
                        ? new Date(String(agent.config.created_at)).toLocaleString('zh-CN')
                        : '—'}
                    </span>
                  </div>
                  {agent.config.system_prompt && (
                    <>
                      <Separator />
                      <div className="space-y-1.5 py-1">
                        <span className="text-sm text-muted-foreground">系统提示词</span>
                        <p className="text-sm rounded bg-muted/50 p-3 font-mono leading-relaxed">
                          {String(agent.config.system_prompt)}
                        </p>
                      </div>
                    </>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>运行状态</CardTitle>
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : statusData ? (
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">运行时间</span>
                    <p className="text-sm font-medium">{formatUptime(statusData.uptime_seconds)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">总执行次数</span>
                    <p className="text-sm font-medium font-mono">{statusData.total_executions.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">成功率</span>
                    <p className="text-sm font-medium">{(statusData.success_rate * 100).toFixed(1)}%</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">平均延迟</span>
                    <p className="text-sm font-medium font-mono">
                      {statusData.avg_latency_ms > 1000
                        ? `${(statusData.avg_latency_ms / 1000).toFixed(1)}s`
                        : `${statusData.avg_latency_ms}ms`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">24h 错误数</span>
                    <p className={`text-sm font-medium font-mono ${statusData.error_count_24h > 10 ? 'text-status-failed' : ''}`}>
                      {statusData.error_count_24h}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">内存占用</span>
                    <p className="text-sm font-medium font-mono">{statusData.memory_mb} MB</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">无法获取运行状态数据</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>执行记录</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <DataTable
                columns={executionColumns}
                data={executionsData?.executions ?? []}
                loading={executionsLoading}
                emptyMessage="暂无执行记录"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
