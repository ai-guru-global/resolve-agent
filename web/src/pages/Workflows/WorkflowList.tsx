import { Link } from 'react-router-dom';
import { GitBranch, TreeDeciduous, Boxes, Workflow, Search, Zap, BookOpen, ArrowRight } from 'lucide-react';
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

      {/* ── Workflow & FTA Introduction ── */}
      <div className="rounded-xl border border-border/40 bg-gradient-to-br from-card/60 via-card/30 to-transparent p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <TreeDeciduous className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold mb-1">工作流与 FTA 简介</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              工作流（Workflow）是 ResolveAgent 中用于<strong className="text-foreground/80">编排复杂运维任务</strong>的核心抽象。
              它将多步骤的诊断、决策和执行过程组织为有向图结构，由节点（事件）、边（连接）和门逻辑（决策规则）组成，支持异步流式执行和自动化编排。
            </p>
          </div>
        </div>

        {/* Three-column concept cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="flex items-start gap-2 rounded-lg bg-muted/15 p-3">
            <Workflow className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-foreground/80">Workflow 工作流</span>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                将运维流程拆解为可编排、可复用的自动化步骤，支持条件分支、并行执行和流式事件输出。
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/15 p-3">
            <Search className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-foreground/80">FTA 故障树分析</span>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                自顶向下的演绎分析方法，通过 AND/OR/VOTING 等逻辑门将顶级故障事件分解为可评估的基本事件，实现系统化根因定位。
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/15 p-3">
            <Boxes className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-foreground/80">多源协同评估</span>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                叶节点支持技能（Skill）、RAG 知识检索和 LLM 智能判断三种评估器，实现数据驱动与知识驱动的融合决策。
              </p>
            </div>
          </div>
        </div>

        {/* FTA importance highlight */}
        <div className="rounded-lg bg-muted/10 border border-border/20 p-3 mb-3">
          <div className="flex items-start gap-2">
            <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-foreground/80">FTA 在 ResolveAgent 中的关键地位</span>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                FTA 工作流引擎是 ResolveAgent 的<strong className="text-foreground/70">决策中枢</strong>：智能选择器（Selector）根据上下文路由到合适的 FTA 工作流，
                工作流通过逻辑门编排技能执行和 RAG 检索，最终将诊断结果与代码分析、知识库数据融合，输出完整的根因分析报告。
                它连接了从告警触发到问题解决的完整闭环。
              </p>
            </div>
          </div>
        </div>

        {/* Footer with doc link */}
        <div className="flex items-center justify-between pt-3 border-t border-border/20">
          <div className="flex items-center gap-1.5">
            <GitBranch className="h-3 w-3 text-muted-foreground/60" />
            <p className="text-[10px] text-muted-foreground/60">
              执行流程：解析树结构 → 并行评估叶节点 → 自底向上传播门逻辑 → 输出顶级事件结果
            </p>
          </div>
          <Link
            to="/architecture/fta-engine"
            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline shrink-0"
          >
            <BookOpen className="h-3 w-3" />
            查看 FTA 引擎文档
            <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>

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
