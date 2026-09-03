import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, GitBranch } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { MetricCard } from '@/components/MetricCard';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import FTATreeEditor from '@/components/TreeEditor/FTATreeEditor';
import { useWorkflowExecutions, useWorkflowFaultTree, useSaveFaultTree } from '@/hooks/useWorkflows';
import type { WorkflowExecutionRecord, StatusVariant, FaultTree } from '@/types';
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
  {
    key: 'completed_at',
    label: '结束时间',
    render: (val) =>
      val ? (
        <span className="text-xs">{new Date(String(val)).toLocaleString('zh-CN')}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export default function WorkflowExecution() {
  const { id } = useParams();
  const workflowId = id ?? 'wf-001';

  const [selected, setSelected] = useState<WorkflowExecutionRecord | null>(null);

  // Execution data
  const { data, isLoading } = useWorkflowExecutions(workflowId);
  const executions = data?.executions ?? [];
  const completedCount = executions.filter((e) => e.status === 'completed').length;
  const successRate = executions.length > 0 ? ((completedCount / executions.length) * 100).toFixed(0) : '0';
  const avgDuration = executions.length > 0
    ? (executions.reduce((sum, e) => sum + e.duration_ms, 0) / executions.length / 1000).toFixed(1)
    : '0';

  // FTA tree data
  const { data: faultTree, isLoading: treeLoading } = useWorkflowFaultTree(workflowId);
  const saveMutation = useSaveFaultTree(workflowId);

  const handleSave = useCallback(
    (tree: FaultTree) => {
      saveMutation.mutate(tree);
    },
    [saveMutation],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="工作流详情"
        breadcrumbs={[
          { label: '故障分析工作流', href: '/workflows' },
          { label: workflowId },
        ]}
      />

      <Tabs defaultValue="editor" className="w-full">
        <TabsList>
          <TabsTrigger value="editor" className="gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            FTA 树编辑器
          </TabsTrigger>
          <TabsTrigger value="executions" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            执行记录
          </TabsTrigger>
        </TabsList>

        {/* ── FTA Tree Editor Tab ── */}
        <TabsContent value="editor" className="mt-4">
          {treeLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center" style={{ height: '600px' }}>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ) : (
            <div style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}>
              <FTATreeEditor
                faultTree={faultTree ?? null}
                onSave={handleSave}
                saving={saveMutation.isPending}
              />
            </div>
          )}
        </TabsContent>

        {/* ── Execution Records Tab ── */}
        <TabsContent value="executions" className="mt-4 space-y-4">
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
                <DataTable
                  columns={columns}
                  data={executions}
                  loading={isLoading}
                  emptyMessage="暂无执行记录"
                  onRowClick={(row) => setSelected(row)}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">{selected?.id}</DialogTitle>
            <DialogDescription>工作流「{selected?.workflow_name}」单次执行详情</DialogDescription>
          </DialogHeader>
          {selected && (
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">状态</dt>
                <dd>
                  {(() => {
                    const s = executionStatusMap[selected.status];
                    return s ? <StatusBadge variant={s.variant} label={s.label} /> : selected.status;
                  })()}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">触发源</dt>
                <dd className="font-mono text-xs">{selected.trigger}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-muted-foreground">根因</dt>
                <dd className="text-right leading-relaxed">{selected.root_cause ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">评估节点</dt>
                <dd className="font-mono">{selected.nodes_evaluated}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">耗时</dt>
                <dd className="font-mono">
                  {selected.duration_ms > 1000
                    ? `${(selected.duration_ms / 1000).toFixed(1)}s`
                    : `${selected.duration_ms}ms`}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">开始时间</dt>
                <dd>{new Date(selected.started_at).toLocaleString('zh-CN')}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">结束时间</dt>
                <dd>{selected.completed_at ? new Date(selected.completed_at).toLocaleString('zh-CN') : '—'}</dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
