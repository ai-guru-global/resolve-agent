import { Link } from 'react-router-dom';
import { CheckCircle2, Zap } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function SkillList() {
  const { data, isLoading } = useSkills();

  const skills = data?.skills ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="运维技能"
        description={isLoading ? '加载中...' : `已安装 ${skills.length} 个技能`}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-5 w-14" />
                </div>
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : skills.length === 0 ? (
        <Card>
          <EmptyState
            icon={Zap}
            title="暂无已安装技能"
            description="通过 CLI 或技能市场安装运维技能"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <Link key={skill.name} to={`/skills/${skill.name}`}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{skillIcons[skill.name] ?? '⚡'}</span>
                      <CardTitle className="text-base">{skillDisplayNames[skill.name] ?? skill.name}</CardTitle>
                    </div>
                    <StatusBadge variant="healthy" label="已安装" />
                  </div>
                  <CardDescription>{skill.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    v{skill.version}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-status-healthy" />
                    就绪
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
