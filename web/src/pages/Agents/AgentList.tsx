import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Plus, MoreHorizontal, Trash2, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api, type Agent } from '@/api/client';
import { agentStatusToVariant, type AgentStatus } from '@/types';

const statusLabels: Record<string, string> = {
  active: '运行中',
  inactive: '未激活',
  error: '异常',
};

const typeLabels: Record<string, string> = {
  mega: '综合智能体',
  skill: '技能智能体',
  fta: '故障分析',
  rag: '知识问答',
  custom: '自定义',
};

export default function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await api.listAgents();
      setAgents(data.agents);
    } catch {
      toast.error('加载智能体列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAgents();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteAgent(deleteTarget.id);
      toast.success(`智能体 "${deleteTarget.name}" 已删除`);
      setDeleteTarget(null);
      void loadAgents();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<Agent>[] = [
    {
      key: 'name',
      label: '名称',
      render: (_val, row) => (
        <Link to={`/agents/${row.id}`} className="font-medium text-primary hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: 'type',
      label: '类型',
      render: (val) => <span className="text-muted-foreground">{typeLabels[String(val)] ?? String(val)}</span>,
    },
    {
      key: 'status',
      label: '状态',
      render: (val) => {
        const s = String(val) as AgentStatus;
        return <StatusBadge variant={agentStatusToVariant[s]} label={statusLabels[s] ?? s} />;
      },
    },
    {
      key: 'id',
      label: '操作',
      className: 'w-12',
      render: (_val, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/agents/${row.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                查看详情
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(row)}>
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (!loading && agents.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="智能体管理"
          actions={
            <Button asChild>
              <Link to="/agents/new">
                <Plus className="mr-2 h-4 w-4" />
                创建智能体
              </Link>
            </Button>
          }
        />
        <EmptyState
          icon={Bot}
          title="暂无智能体"
          description="创建您的第一个运维智能体，开始智能化运维之旅"
          action={{ label: '创建智能体', href: '/agents/new' }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="智能体管理"
        description={`共 ${agents.length} 个智能体`}
        actions={
          <Button asChild>
            <Link to="/agents/new">
              <Plus className="mr-2 h-4 w-4" />
              创建智能体
            </Link>
          </Button>
        }
      />

      <DataTable columns={columns} data={agents} loading={loading} emptyMessage="暂无智能体" />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除智能体 &ldquo;{deleteTarget?.name}&rdquo; 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
