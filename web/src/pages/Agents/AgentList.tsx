import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Plus, MoreHorizontal, Trash2, Eye, Loader2, Zap, Shield, MemoryStick, Layers, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      toast.error('加载 Agent 列表失败');
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
      toast.success(`Agent "${deleteTarget.name}" 已删除`);
      setDeleteTarget(null);
      void loadAgents();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  if (!loading && agents.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Agent 管理"
          actions={
            <Button asChild>
              <Link to="/agents/new">
                <Plus className="mr-2 h-4 w-4" />
                创建 Agent
              </Link>
            </Button>
          }
        />
        <EmptyState
          icon={Bot}
          title="暂无 Agent"
          description="创建您的第一个 Agent，开始 Harness 工程之旅"
          action={{ label: '创建 Agent', href: '/agents/new' }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent 管理"
        description={`共 ${agents.length} 个 Agent · Model + Harness`}
        actions={
          <Button asChild>
            <Link to="/agents/new">
              <Plus className="mr-2 h-4 w-4" />
              创建 Agent
            </Link>
          </Button>
        }
      />

      {/* Agent list — row layout instead of same-size card grid */}
      <div className="space-y-2">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border/30 bg-card/30 p-4 animate-pulse">
                <div className="h-5 w-40 bg-muted rounded mb-2" />
                <div className="h-4 w-60 bg-muted/50 rounded" />
              </div>
            ))
          : agents.map((agent) => {
              const status = agent.status as AgentStatus;
              return (
                <Link
                  key={agent.id}
                  to={`/agents/${agent.id}`}
                  className="flex items-center gap-4 rounded-lg border border-border/30 bg-card/20 p-4 transition-all duration-200 hover:bg-card/40 hover:border-border/50 group"
                >
                  {/* Left: Agent info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <Bot className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-display font-bold truncate">{agent.name}</span>
                      <StatusBadge variant={agentStatusToVariant[status]} label={statusLabels[status] ?? status} />
                    </div>
                    <p className="text-xs text-muted-foreground ml-6.5">
                      {typeLabels[agent.type] ?? agent.type}
                    </p>
                  </div>

                  {/* Right: Harness summary */}
                  <div className="hidden sm:flex items-center gap-3 shrink-0">
                    {/* Mode badge */}
                    <Badge variant="secondary" className={cn(
                      'text-[10px] gap-1 border',
                      agent.mode === 'all_skills'
                        ? 'border-primary/20 bg-primary/5 text-primary'
                        : 'border-primary/20 bg-primary/5 text-primary',
                    )}>
                      {agent.mode === 'all_skills' ? <Layers className="h-3 w-3" /> : <Brain className="h-3 w-3" />}
                      {agent.mode === 'all_skills' ? 'All Skills' : 'Selector'}
                    </Badge>

                    {/* Skills count */}
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Zap className="h-3 w-3" />
                      {agent.harness.skills.length + agent.harness.tools.length}
                    </span>

                    {/* Hooks count */}
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      {agent.harness.hooks.length}
                    </span>

                    {/* Memory */}
                    <span className={cn(
                      'flex items-center gap-1 text-[11px]',
                      agent.harness.memory_enabled ? 'text-status-healthy' : 'text-muted-foreground/40',
                    )}>
                      <MemoryStick className="h-3 w-3" />
                    </span>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/agents/${agent.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          查看详情
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={(e) => { e.preventDefault(); setDeleteTarget(agent); }}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Link>
              );
            })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除 Agent &ldquo;{deleteTarget?.name}&rdquo; 吗？此操作不可撤销。
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
