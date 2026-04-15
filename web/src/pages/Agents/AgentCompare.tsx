import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAgents, useAgent } from '@/hooks/useAgents';

function DiffRow({ label, left, right }: { label: string; left: string; right: string }) {
  const same = left === right;
  return (
    <div className={cn('grid grid-cols-[120px_1fr_1fr] gap-2 py-1.5 text-sm', !same && 'bg-amber-50/30 dark:bg-amber-500/5 -mx-2 px-2 rounded')}>
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={cn('font-mono text-xs', !same && 'text-amber-700 dark:text-amber-400')}>{left || '—'}</span>
      <span className={cn('font-mono text-xs', !same && 'text-amber-700 dark:text-amber-400')}>{right || '—'}</span>
    </div>
  );
}

export default function AgentCompare() {
  const [searchParams] = useSearchParams();
  const { data: agentsData } = useAgents();
  const [leftId, setLeftId] = useState(searchParams.get('a') ?? searchParams.get('left') ?? '');
  const [rightId, setRightId] = useState(searchParams.get('right') ?? '');
  const { data: leftAgent, isLoading: leftLoading } = useAgent(leftId);
  const { data: rightAgent, isLoading: rightLoading } = useAgent(rightId);

  const agents = agentsData?.agents ?? [];
  const isLoading = leftLoading || rightLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="配置对比"
        breadcrumbs={[
          { label: 'Agent 管理', href: '/agents' },
          { label: '配置对比' },
        ]}
      />

      {/* Agent Selectors */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
        <Select value={leftId} onValueChange={setLeftId}>
          <SelectTrigger><SelectValue placeholder="选择 Agent A" /></SelectTrigger>
          <SelectContent>
            {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
        <Select value={rightId} onValueChange={setRightId}>
          <SelectTrigger><SelectValue placeholder="选择 Agent B" /></SelectTrigger>
          <SelectContent>
            {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {leftId && rightId && !isLoading && leftAgent && rightAgent && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">基本信息</CardTitle>
              <div className="grid grid-cols-[120px_1fr_1fr] gap-2 text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                <span>字段</span>
                <span>{leftAgent.name}</span>
                <span>{rightAgent.name}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-0">
              <DiffRow label="类型" left={leftAgent.type} right={rightAgent.type} />
              <DiffRow label="状态" left={leftAgent.status} right={rightAgent.status} />
              <DiffRow label="模式" left={leftAgent.mode} right={rightAgent.mode} />
              <DiffRow label="模型" left={String(leftAgent.config.model ?? '')} right={String(rightAgent.config.model ?? '')} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">System Prompt</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <p className="text-xs font-mono bg-muted/20 rounded p-3 whitespace-pre-wrap">{leftAgent.harness.system_prompt || '(空)'}</p>
                <p className="text-xs font-mono bg-muted/20 rounded p-3 whitespace-pre-wrap">{rightAgent.harness.system_prompt || '(空)'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Tools & Skills</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Tools</p>
                  <div className="flex flex-wrap gap-1">{leftAgent.harness.tools.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}</div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1 mt-3">Skills</p>
                  <div className="flex flex-wrap gap-1">{leftAgent.harness.skills.map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}</div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Tools</p>
                  <div className="flex flex-wrap gap-1">{rightAgent.harness.tools.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}</div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1 mt-3">Skills</p>
                  <div className="flex flex-wrap gap-1">{rightAgent.harness.skills.map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">基础设施</CardTitle></CardHeader>
            <CardContent className="space-y-0">
              <DiffRow label="沙箱类型" left={leftAgent.harness.sandbox_type} right={rightAgent.harness.sandbox_type} />
              <DiffRow label="上下文策略" left={leftAgent.harness.context_strategy} right={rightAgent.harness.context_strategy} />
              <DiffRow label="持久记忆" left={leftAgent.harness.memory_enabled ? '启用' : '禁用'} right={rightAgent.harness.memory_enabled ? '启用' : '禁用'} />
              <DiffRow label="Hooks 数量" left={String(leftAgent.harness.hooks.length)} right={String(rightAgent.harness.hooks.length)} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
