import { useParams } from 'react-router-dom';
import { Layers, Brain, Zap, Shield, MemoryStick, Box, FileText, Target, Cpu, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgent, useAgentExecutions, useAgentRuntimeStatus } from '@/hooks/useAgents';
import type { AgentExecution, StatusVariant, SelectorStrategy } from '@/types';
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

const sandboxLabels: Record<string, string> = {
  local: '本地沙箱',
  container: '容器沙箱',
  remote: '远程沙箱',
};

const contextLabels: Record<string, string> = {
  default: '默认策略',
  compaction: '上下文压缩',
  offloading: 'Tool Offloading',
};

const hookTypeLabels: Record<string, string> = {
  pre_execution: '执行前',
  post_execution: '执行后',
  on_error: '错误时',
  on_exit: '退出时',
};

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
        title={agentLoading ? '加载中...' : (agent?.name ?? `Agent ${id ?? ''}`)}
        breadcrumbs={[
          { label: 'Agent 管理', href: '/agents' },
          { label: agent?.name ?? id ?? '详情' },
        ]}
        actions={
          agentLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <div className="flex items-center gap-2">
              {agent?.mode && (
                <Badge variant="secondary" className="text-[10px] gap-1 border border-primary/20 bg-primary/5 text-primary">
                  {agent.mode === 'all_skills' ? <Layers className="h-3 w-3" /> : <Brain className="h-3 w-3" />}
                  {agent.mode === 'all_skills' ? 'All Skills' : 'Selector'}
                </Badge>
              )}
              <StatusBadge variant={statusVariant} label={statusLabels[agent?.status ?? ''] ?? agent?.status ?? '未知'} />
            </div>
          )
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="harness">Harness</TabsTrigger>
          <TabsTrigger value="status">运行状态</TabsTrigger>
          <TabsTrigger value="history">执行记录</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent 基本信息</CardTitle>
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
                    <span className="text-sm text-muted-foreground">运行模式</span>
                    <Badge variant="secondary" className="text-[10px] gap-1 border border-primary/20 bg-primary/5 text-primary">
                      {agent.mode === 'all_skills' ? 'All Skills — 并行执行' : 'Selector — 精准路由'}
                    </Badge>
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
                </>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Harness Tab — NEW */}
        <TabsContent value="harness" className="mt-4 space-y-4">
          {agentLoading ? (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ) : agent ? (
            <>
              {/* System Prompt */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    System Prompt
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm rounded-lg bg-muted/30 border border-border/20 p-4 font-mono leading-relaxed whitespace-pre-wrap">
                    {agent.harness.system_prompt || '未配置系统提示词'}
                  </p>
                </CardContent>
              </Card>

              {/* Tools & Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Tools / Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Tools</p>
                      <div className="space-y-1">
                        {agent.harness.tools.length === 0 ? (
                          <p className="text-xs text-muted-foreground/50">无绑定工具</p>
                        ) : agent.harness.tools.map((t) => (
                          <div key={t} className="flex items-center gap-2 rounded-md bg-muted/20 border border-border/15 px-3 py-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            <span className="text-xs font-mono">{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Skills</p>
                      <div className="space-y-1">
                        {agent.harness.skills.length === 0 ? (
                          <p className="text-xs text-muted-foreground/50">无绑定技能</p>
                        ) : agent.harness.skills.map((s) => (
                          <div key={s} className="flex items-center gap-2 rounded-md bg-muted/20 border border-border/15 px-3 py-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-status-healthy" />
                            <span className="text-xs font-mono">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hooks */}
              {/* Selector / Orchestration — only for selector mode */}
              {agent.mode === 'selector' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      Intelligent Selector · Orchestration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Strategy selector */}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">路由策略</p>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { key: 'hybrid' as SelectorStrategy, label: 'Hybrid', desc: '规则优先 + LLM 回退', recommended: true },
                          { key: 'rule' as SelectorStrategy, label: 'Rule', desc: '纯规则匹配，确定性路由' },
                          { key: 'llm' as SelectorStrategy, label: 'LLM', desc: '纯 LLM 分类' },
                        ]).map((s) => (
                          <div
                            key={s.key}
                            className={cn(
                              'rounded-lg border p-3 transition-all',
                              s.key === 'hybrid'
                                ? 'border-primary/30 bg-primary/5'
                                : 'border-border/20 bg-muted/10',
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                'h-2 w-2 rounded-full',
                                s.key === 'hybrid' ? 'bg-primary' : 'bg-muted-foreground/30',
                              )} />
                              <span className="text-xs font-semibold">{s.label}</span>
                              {s.recommended && (
                                <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-primary/10 text-primary border-primary/20">推荐</Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pipeline stages */}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">处理管道</p>
                      <div className="flex items-center gap-1.5">
                        {[
                          { label: '意图分析', icon: Target, desc: 'IntentAnalyzer' },
                          { label: '上下文增强', icon: Cpu, desc: 'ContextEnricher' },
                          { label: '路由决策', icon: Brain, desc: 'RouteDecider' },
                        ].map((stage, i) => (
                          <div key={stage.label} className="flex items-center gap-1.5 flex-1">
                            <div className="flex-1 rounded-lg border border-border/20 bg-card/40 p-2.5 text-center">
                              <stage.icon className="h-4 w-4 mx-auto mb-1 text-primary" />
                              <p className="text-[10px] font-medium">{stage.label}</p>
                              <p className="text-[9px] text-muted-foreground/50 font-mono">{stage.desc}</p>
                            </div>
                            {i < 2 && <span className="text-muted-foreground/20 shrink-0">→</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Route targets */}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">路由目标</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {[
                          { type: 'fta', label: 'FTA 工作流', icon: GitBranch, color: 'hsl(40 70% 60%)' },
                          { type: 'skill', label: 'Skills 执行', icon: Zap, color: 'hsl(40 92% 52%)' },
                          { type: 'rag', label: 'RAG 检索', icon: MemoryStick, color: 'hsl(142 71% 45%)' },
                          { type: 'code_analysis', label: '代码分析', icon: Target, color: 'hsl(220 8% 70%)' },
                          { type: 'direct', label: '直接对话', icon: Brain, color: 'hsl(220 8% 55%)' },
                          { type: 'multi', label: '多路由', icon: Layers, color: 'hsl(0 72% 51%)' },
                        ].map((rt) => (
                          <div key={rt.type} className="flex items-center gap-2 rounded-md border border-border/15 bg-background/20 px-2.5 py-2">
                            <rt.icon className="h-3.5 w-3.5" style={{ color: rt.color }} />
                            <div>
                              <span className="text-[10px] font-medium block">{rt.label}</span>
                              <span className="text-[9px] text-muted-foreground/50 font-mono">{rt.type}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Hooks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Hooks / Middleware
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {agent.harness.hooks.length === 0 ? (
                    <p className="text-sm text-muted-foreground/50">无配置 Hooks</p>
                  ) : (
                    <div className="space-y-2">
                      {agent.harness.hooks.map((hook, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-md border border-border/20 bg-muted/10 px-4 py-2.5">
                          <span className={cn(
                            'h-2 w-2 rounded-full shrink-0',
                            hook.enabled ? 'bg-status-healthy' : 'bg-muted-foreground/30',
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{hook.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {hookTypeLabels[hook.type] ?? hook.type} · {hook.action}
                            </p>
                          </div>
                          <Badge variant="secondary" className={cn(
                            'text-[10px]',
                            hook.enabled ? 'text-status-healthy bg-status-healthy/10' : 'text-muted-foreground bg-muted',
                          )}>
                            {hook.enabled ? '启用' : '禁用'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Memory & Infrastructure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MemoryStick className="h-4 w-4 text-primary" />
                      Memory & Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between py-1">
                      <span className="text-sm text-muted-foreground">持久记忆</span>
                      <Badge variant="secondary" className={cn(
                        'text-[10px]',
                        agent.harness.memory_enabled ? 'text-status-healthy bg-status-healthy/10' : 'text-muted-foreground bg-muted',
                      )}>
                        {agent.harness.memory_enabled ? '已启用' : '已禁用'}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between py-1">
                      <span className="text-sm text-muted-foreground">上下文策略</span>
                      <span className="text-sm">{contextLabels[agent.harness.context_strategy] ?? agent.harness.context_strategy}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Box className="h-4 w-4 text-primary" />
                      Infrastructure
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between py-1">
                      <span className="text-sm text-muted-foreground">沙箱类型</span>
                      <span className="text-sm">{sandboxLabels[agent.harness.sandbox_type] ?? agent.harness.sandbox_type}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Status Tab */}
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

        {/* History Tab */}
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
