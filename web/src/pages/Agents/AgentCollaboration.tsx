import { Bot, Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollaborationSessions } from '@/hooks/useAgents';
import type { StatusVariant } from '@/types';

const patternLabels: Record<string, string> = {
  sequential: '顺序链',
  fan_out_fan_in: '扇出/扇入',
  supervisor_worker: '主管-工人',
  debate: '辩论/共识',
};

const statusMap: Record<string, { label: string; variant: StatusVariant }> = {
  running: { label: '运行中', variant: 'progressing' },
  completed: { label: '已完成', variant: 'healthy' },
  failed: { label: '失败', variant: 'failed' },
};

export default function AgentCollaboration() {
  const { data, isLoading } = useCollaborationSessions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="多 Agent 协作"
        description="多 Agent 协作拓扑管理与会话监控"
        breadcrumbs={[
          { label: 'Agent 管理', href: '/agents' },
          { label: '多 Agent 协作' },
        ]}
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !data?.sessions.length ? (
        <EmptyState icon={Users} title="暂无协作会话" description="多 Agent 协作功能将在 v0.4.0 版本正式推出" />
      ) : (
        <div className="space-y-3">
          {data.sessions.map((session) => {
            const s = statusMap[session.status];
            return (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{session.name}</span>
                        {s && <StatusBadge variant={s.variant} label={s.label} />}
                        <Badge variant="secondary" className="text-[10px]">{patternLabels[session.pattern] ?? session.pattern}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Bot className="h-3 w-3" />{session.agents.length} 个 Agent
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {session.duration_ms > 60000 ? `${(session.duration_ms / 60000).toFixed(1)} 分钟` : `${(session.duration_ms / 1000).toFixed(1)} 秒`}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(session.started_at).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {session.agents.map((agentId) => (
                          <Badge key={agentId} variant="secondary" className="text-[9px] font-mono">{agentId}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Collaboration Patterns */}
      <Card>
        <CardHeader><CardTitle className="text-sm">协作模式</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { pattern: '顺序链', desc: 'Agent A → Agent B → Agent C', icon: '→' },
              { pattern: '扇出/扇入', desc: '并行分发，汇聚结果', icon: '⇅' },
              { pattern: '主管-工人', desc: '主 Agent 分配任务给子 Agent', icon: '⬡' },
              { pattern: '辩论/共识', desc: '多 Agent 交叉验证，达成共识', icon: '⟳' },
            ].map((p) => (
              <div key={p.pattern} className="rounded-lg border border-border/20 bg-muted/10 p-3 text-center">
                <span className="text-xl">{p.icon}</span>
                <p className="text-xs font-medium mt-1">{p.pattern}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
