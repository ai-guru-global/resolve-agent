import { useParams } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { MetricCard } from '@/components/MetricCard';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkflowExecutions } from '@/hooks/useWorkflows';
import type { WorkflowExecutionRecord, StatusVariant } from '@/types';
import { ClipboardList, CheckCircle2, Clock } from 'lucide-react';

const executionStatusMap: Record<string, { label: string; variant: StatusVariant }> = {
  completed: { label: '完成', variant: 'healthy' },
  failed: { label: '失败', variant: 'failed' },
  running: { label: '运行中', variant: 'progressing' },
  pending: { label: '等待', variant: 'unknown' },
};

const columns: DataTableColumn<WorkflowExecutionRecord>[] = [
  { key: 'id', label: 'ID', mono: true },
  { key: 'workflow_name', label: '工作流' },
  {
    key: 'status',
    label: '状态',
    render: (val) => {
      const s = executionStatusMap[String(val)];
      return s ? <StatusBadge variant={s.variant} label={s.label} /> : <span>{String(val)}</span>;
    },
  },
  {
    key: 'trigger',
    label: '触发源',
    render: (val) => <span className="font-mono text-xs">{String(val)}</span>,
  },
  {
    key: 'root_cause',
    label: '根因',
    render: (val) =>
      val ? (
        <span className="line-clamp-1 max-w-[250px]">{String(val)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: 'nodes_evaluated',
    label: '评估节点',
    render: (val) => <span className="font-mono">{String(val)}</span>,
  },
  {
    key: 'duration_ms',
    label: '耗时',
    render: (val) => {
      const ms = Number(val);
      return <span className="font-mono">{ms > 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`}</span>;
    },
  },
  {
    key: 'started_at',
    label: '开始时间',
    render: (val) => <span className="text-xs">{new Date(String(val)).toLocaleString('zh-CN')}</span>,
  },
];

export default function WorkflowExecution() {
  const { id } = useParams();
  const { data, isLoading } = useWorkflowExecutions(id);

  const executions = data?.executions ?? [];
  const completedCount = executions.filter((e) => e.status === 'completed').length;
  const successRate = executions.length > 0 ? ((completedCount / executions.length) * 100).toFixed(0) : '0';
  const avgDuration = executions.length > 0
    ? (executions.reduce((sum, e) => sum + e.duration_ms, 0) / executions.length / 1000).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <PageHeader
        title="执行监控"
        breadcrumbs={[
          { label: '故障分析工作流', href: '/workflows' },
          { label: id ? `工作流 ${id}` : '全部执行' },
        ]}
      />

      {/* Summary Cards */}
      {!isLoading && executions.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard icon={ClipboardList} value={String(executions.length)} label="总执行次数" accentColor="border-l-primary" />
          <MetricCard icon={CheckCircle2} value={`${successRate}%`} label="成功率" accentColor="border-l-status-healthy" />
          <MetricCard icon={Clock} value={`${avgDuration}s`} label="平均耗时" accentColor="border-l-status-degraded" />
        </div>
      )}

      {/* Execution Table */}
      {!isLoading && executions.length === 0 ? (
        <Card>
          <EmptyState
            icon={Activity}
            title="暂无执行记录"
            description="工作流执行状态和节点评估结果将在此实时展示"
          />
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>执行记录</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <DataTable columns={columns} data={executions} loading={isLoading} emptyMessage="暂无执行记录" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
