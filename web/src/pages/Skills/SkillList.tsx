import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSkills } from '@/hooks/useSkills';

const skillIcons: Record<string, string> = {
  'ticket-handler': '🎫',
  'consulting-qa': '💬',
  'log-analyzer': '📊',
  'metric-alerter': '📈',
  'change-reviewer': '🔍',
  'hello-world': '👋',
};

const skillDisplayNames: Record<string, string> = {
  'ticket-handler': '工单处理',
  'consulting-qa': '咨询问答',
  'log-analyzer': '日志分析',
  'metric-alerter': '指标告警',
  'change-reviewer': '变更审核',
  'hello-world': '测试技能',
};

// Mock: which agents reference each skill
const skillAgentRefs: Record<string, string[]> = {
  'ticket-handler': ['mega-agent', 'resolve-coordinator'],
  'consulting-qa': ['mega-agent', 'qa-specialist'],
  'log-analyzer': ['mega-agent', 'log-expert', 'fta-diagnoser'],
  'metric-alerter': ['mega-agent', 'monitor-agent'],
  'change-reviewer': ['mega-agent', 'code-reviewer'],
  'hello-world': ['test-agent'],
};

export default function SkillList() {
  const { data, isLoading } = useSkills();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const skills = data?.skills ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills 技能"
        description={isLoading ? '加载中...' : `Harness Tools/Skills 层 · 已安装 ${skills.length} 个技能`}
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border/30 bg-card/20 p-4 animate-pulse">
              <div className="h-5 w-40 bg-muted rounded mb-2" />
              <div className="h-4 w-60 bg-muted/50 rounded" />
            </div>
          ))}
        </div>
      ) : skills.length === 0 ? (
        <Card>
          <EmptyState
            icon={Zap}
            title="暂无已安装技能"
            description="通过 CLI 或技能市场安装技能，作为 Harness 的 Tools/Skills 层"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Skill list — left */}
          <div className="lg:col-span-2 space-y-1.5">
            {skills.map((skill) => {
              const refs = skillAgentRefs[skill.name] ?? [];
              return (
                <button
                  key={skill.name}
                  onClick={() => setSelectedSkill(skill.name === selectedSkill ? null : skill.name)}
                  className={cn(
                    'w-full text-left rounded-lg border p-4 transition-all duration-200',
                    selectedSkill === skill.name
                      ? 'border-primary/30 bg-accent/30'
                      : 'border-border/30 bg-card/20 hover:bg-card/40',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl shrink-0">{skillIcons[skill.name] ?? '⚡'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-display font-bold">{skillDisplayNames[skill.name] ?? skill.name}</span>
                        <Badge variant="secondary" className="font-mono text-[10px]">v{skill.version}</Badge>
                        <StatusBadge variant="healthy" label="就绪" />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                      <Bot className="h-3 w-3" />
                      {refs.length} Agents
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail preview — right */}
          <div className="lg:col-span-1">
            {selectedSkill ? (() => {
              const skill = skills.find((s) => s.name === selectedSkill);
              const refs = skillAgentRefs[selectedSkill] ?? [];
              if (!skill) return null;
              return (
                <Card className="sticky top-4">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{skillIcons[skill.name] ?? '⚡'}</span>
                      <div>
                        <p className="text-sm font-display font-bold">{skillDisplayNames[skill.name] ?? skill.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{skill.name}</p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">{skill.description}</p>

                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">引用此技能的 Agent</p>
                      <div className="space-y-1">
                        {refs.length === 0 ? (
                          <p className="text-xs text-muted-foreground/50">暂无引用</p>
                        ) : refs.map((r) => (
                          <div key={r} className="flex items-center gap-2 rounded-md bg-muted/20 px-3 py-1.5">
                            <Bot className="h-3 w-3 text-primary" />
                            <span className="text-xs font-mono">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Link
                      to={`/skills/${skill.name}`}
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      查看详情 →
                    </Link>
                  </CardContent>
                </Card>
              );
            })() : (
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground/50 text-center py-8">选择一个技能查看详情</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
