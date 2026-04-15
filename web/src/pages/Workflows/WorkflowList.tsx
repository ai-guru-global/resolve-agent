import { Link } from 'react-router-dom';
import { GitBranch } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWorkflows } from '@/hooks/useWorkflows';
import type { WorkflowDetail, StatusVariant } from '@/types';

const workflowStatusMap: Record<string, { label: string; variant: StatusVariant }> = {
  active: { label: '运行中', variant: 'healthy' },
  draft: { label: '草稿', variant: 'unknown' },
  archived: { label: '已归档', variant: 'degraded' },
};

const columns: DataTableColumn<WorkflowDetail>[] = [
  {
    key: 'name',
    label: '名称',
    render: (val, row) => (
      <Link to={`/workflows/${row.id}/execution`} className="text-primary hover:underline">
        {String(val)}
      </Link>
    ),
  },
  {
    key: 'description',
    label: '描述',
    render: (val) => <span className="line-clamp-1 max-w-[300px] text-muted-foreground">{String(val)}</span>,
  },
  {
    key: 'status',
    label: '状态',
    render: (val) => {
      const s = workflowStatusMap[String(val)];
      return s ? <StatusBadge variant={s.variant} label={s.label} /> : <span>{String(val)}</span>;
    },
  },
  { key: 'node_count', label: '节点数', render: (val) => <span className="font-mono">{String(val)}</span> },
  { key: 'execution_count', label: '执行次数', render: (val) => <span className="font-mono">{String(val)}</span> },
  {
    key: 'last_executed',
    label: '最后执行',
    render: (val) =>
      val ? (
        <span className="text-xs">{new Date(String(val)).toLocaleString('zh-CN')}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export default function WorkflowList() {
  const { data, isLoading } = useWorkflows();

  const workflows = (data?.workflows ?? []) as WorkflowDetail[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="FTA 工作流"
        description={isLoading ? undefined : `共 ${workflows.length} 个工作流`}
        actions={
          <Button asChild>
            <Link to="/workflows/designer">设计工作流</Link>
          </Button>
        }
      />

      {!isLoading && workflows.length === 0 ? (
        <Card>
          <EmptyState
            icon={GitBranch}
            title="暂无工作流定义"
            description="通过可视化设计器创建故障分析树（FTA），定义自动化故障诊断流程"
            action={{ label: '设计工作流', href: '/workflows/designer' }}
          />
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <DataTable columns={columns} data={workflows} loading={isLoading} emptyMessage="暂无工作流" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
