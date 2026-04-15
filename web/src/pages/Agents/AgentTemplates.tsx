import { Link } from 'react-router-dom';
import { Bot, Zap } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgentTemplates } from '@/hooks/useAgents';

const categoryLabels: Record<string, string> = {
  ops: '运维',
  knowledge: '知识',
  analysis: '分析',
  custom: '自定义',
};

const typeLabels: Record<string, string> = {
  mega: '综合智能体',
  skill: '技能智能体',
  fta: '故障分析',
  rag: '知识问答',
  custom: '自定义',
};

export default function AgentTemplates() {
  const { data, isLoading } = useAgentTemplates();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent 模板"
        description="从预置模板快速创建 Agent"
        breadcrumbs={[
          { label: 'Agent 管理', href: '/agents' },
          { label: '模板库' },
        ]}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.templates.map((tpl) => (
            <Card key={tpl.id} className="hover:border-primary/30 transition-colors group">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{tpl.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-display font-bold">{tpl.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tpl.description}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">{typeLabels[tpl.type] ?? tpl.type}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{categoryLabels[tpl.category] ?? tpl.category}</Badge>
                  <Badge variant="secondary" className="text-[10px] font-mono">{tpl.model}</Badge>
                </div>

                <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{tpl.tools.length + tpl.skills.length}</span>
                  <span className="flex items-center gap-1"><Bot className="h-3 w-3" />{tpl.mode === 'all_skills' ? 'All Skills' : 'Selector'}</span>
                </div>

                <div className="mt-4">
                  <Button asChild size="sm" className="w-full opacity-80 group-hover:opacity-100 transition-opacity">
                    <Link to={`/agents/new?from_template=${tpl.id}`}>
                      使用此模板创建
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
