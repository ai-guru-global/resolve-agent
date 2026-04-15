import type { ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSkillDetail } from '@/hooks/useSkills';

const stepTypeLabels: Record<string, { label: string; color: string }> = {
  collect: { label: '采集', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  diagnose: { label: '诊断', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  verify: { label: '校验', color: 'bg-green-500/15 text-green-400 border-green-500/20' },
  action: { label: '执行', color: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
};

export default function SkillDetail() {
  const { name } = useParams();
  const {
    data: skill,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useSkillDetail(name ?? '');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="加载中..."
          breadcrumbs={[{ label: '运维技能', href: '/skills' }, { label: '加载中...' }]}
        />
        <Card>
          <CardContent className="pt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="flex justify-between py-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
                {i < 3 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !skill) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="技能未找到"
          breadcrumbs={[{ label: '运维技能', href: '/skills' }, { label: '未知' }]}
        />
        <Card>
          <CardContent className="py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="mt-4 text-muted-foreground">
              {error instanceof Error ? error.message : `未找到名为 “${name}” 的技能`}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" onClick={() => void refetch()}>
                重试加载
              </Button>
              <Button variant="outline" asChild>
                <Link to="/skills">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回技能列表
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isScenario = skill.skill_type === 'scenario';
  const scenarioConfig = skill.scenario_config;
  const level = skill.level ?? Math.min(10, Math.max(1, Math.floor(skill.execution_count / 120) + 1));
  const experiencePoints = skill.experience_points ?? skill.execution_count * 15 + 120;
  const nextLevelExperience = skill.next_level_experience ?? experiencePoints + 500;
  const relatedAgentCount = skill.related_agent_count ?? 0;

  const permissionLabels = [
    { label: '网络访问', value: skill.permissions.network_access ? '允许' : '禁止' },
    { label: '文件读取', value: skill.permissions.file_system_read ? '允许' : '禁止' },
    { label: '文件写入', value: skill.permissions.file_system_write ? '允许' : '禁止' },
    { label: '超时时间', value: `${skill.permissions.timeout_seconds}s` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={skill.display_name}
        description={skill.description}
        breadcrumbs={[{ label: '运维技能', href: '/skills' }, { label: skill.display_name }]}
        actions={
          <div className="flex items-center gap-2">
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Badge variant="secondary" className="font-mono">v{skill.version}</Badge>
            {isScenario ? (
              <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/20">场景技能</Badge>
            ) : (
              <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20">通用技能</Badge>
            )}
          </div>
        }
      />

      <Tabs defaultValue="info" className="max-w-4xl">
        <TabsList>
          <TabsTrigger value="info">基本信息</TabsTrigger>
          {isScenario && <TabsTrigger value="scenario">排查流程</TabsTrigger>}
          <TabsTrigger value="io">输入输出</TabsTrigger>
          <TabsTrigger value="perms">权限配置</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card className="mb-4">
            <CardContent className="grid gap-4 pt-5 sm:grid-cols-3">
              <StatCard label="技能等级" value={`Lv.${level}`} />
              <StatCard label="经验值" value={`${experiencePoints} XP`} />
              <StatCard label="关联 Agents" value={String(relatedAgentCount)} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 space-y-3">
              <InfoRow label="技能名称" value={<span className="text-sm font-mono">{skill.name}</span>} />
              <Separator />
              <InfoRow label="技能类型" value={<span className="text-sm">{isScenario ? '场景技能' : '通用技能'}</span>} />
              <Separator />
              {isScenario && scenarioConfig && (
                <>
                  <InfoRow
                    label="领域"
                    value={<Badge variant="outline" className="font-mono text-xs">{scenarioConfig.domain}</Badge>}
                  />
                  <Separator />
                  <InfoRow
                    label="标签"
                    value={(
                      <div className="flex items-center gap-1 flex-wrap sm:justify-end">
                        {scenarioConfig.tags.map((tag) => (
                          <span key={tag} className="rounded bg-muted/30 px-1.5 py-0.5 text-xs text-muted-foreground">#{tag}</span>
                        ))}
                      </div>
                    )}
                  />
                  <Separator />
                  <InfoRow
                    label="排查步骤数"
                    value={<span className="text-sm font-mono">{scenarioConfig.troubleshooting_flow.length} 步</span>}
                  />
                  <Separator />
                </>
              )}
              <InfoRow label="作者" value={<span className="text-sm">{skill.author}</span>} />
              <Separator />
              <InfoRow label="版本" value={<span className="text-sm font-mono">{skill.version}</span>} />
              <Separator />
              <InfoRow label="入口文件" value={<span className="break-all text-sm font-mono">{skill.entry_point}</span>} />
              <Separator />
              <InfoRow label="安装时间" value={<span className="text-sm">{new Date(skill.install_date).toLocaleString('zh-CN')}</span>} />
              <Separator />
              <InfoRow label="最后执行" value={<span className="text-sm">{new Date(skill.last_executed).toLocaleString('zh-CN')}</span>} />
              <Separator />
              <InfoRow label="累计执行" value={<span className="text-sm font-mono">{skill.execution_count.toLocaleString()} 次</span>} />
              <Separator />
              <InfoRow label="下一级所需经验" value={<span className="text-sm font-mono">{nextLevelExperience} XP</span>} />
            </CardContent>
          </Card>
        </TabsContent>

        {isScenario && scenarioConfig && (
          <TabsContent value="scenario" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">排查流程 ({scenarioConfig.troubleshooting_flow.length} 步)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {scenarioConfig.troubleshooting_flow
                    .sort((a, b) => a.order - b.order)
                    .map((step, idx) => {
                      const stepMeta = stepTypeLabels[step.step_type] ?? { label: step.step_type, color: 'bg-muted text-muted-foreground' };
                      const isLast = idx === scenarioConfig.troubleshooting_flow.length - 1;
                      return (
                        <div key={step.id} className="relative">
                          <div className="flex gap-3 pb-4">
                            {/* Timeline dot + line */}
                            <div className="flex flex-col items-center shrink-0 pt-1">
                              <div className={cn(
                                'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border',
                                stepMeta.color,
                              )}>
                                {step.order}
                              </div>
                              {!isLast && <div className="w-px flex-1 bg-border/40 mt-1" />}
                            </div>

                            {/* Step content */}
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-sm font-medium">{step.name}</span>
                                <Badge className={cn('text-[10px]', stepMeta.color)}>{stepMeta.label}</Badge>
                                {step.condition && (
                                  <Badge variant="outline" className="text-[10px] font-mono">
                                    条件: {step.condition}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mb-1.5">{step.description}</p>
                              {step.command && (
                                <code className="block text-[11px] bg-muted/20 rounded px-2.5 py-1.5 font-mono text-muted-foreground break-all">
                                  {step.command}
                                </code>
                              )}
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/50">
                                {step.expected_output && <span>输出: {step.expected_output}</span>}
                                <span>超时: {step.timeout_seconds}s</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Output template */}
            {scenarioConfig.output_template && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">输出模板 (四要素)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'include_symptoms', label: '问题现象' },
                      { key: 'include_evidence', label: '关键信息/日志' },
                      { key: 'include_steps', label: '排查步骤' },
                      { key: 'include_resolution', label: '解决方案' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center gap-2 rounded-md bg-muted/10 px-3 py-2">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          scenarioConfig.output_template?.[item.key as keyof typeof scenarioConfig.output_template]
                            ? 'bg-green-400' : 'bg-muted-foreground/30',
                        )} />
                        <span className="text-xs">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Severity levels */}
            {scenarioConfig.severity_levels.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">严重程度级别</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1.5">
                    {scenarioConfig.severity_levels.map((level, idx) => (
                      <div key={level} className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs font-mono">{level}</Badge>
                        {idx < scenarioConfig.severity_levels.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        <TabsContent value="io" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>输入参数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {skill.inputs.map((input) => (
                  <div key={input.name} className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{input.name}</span>
                        <Badge variant="outline" className="text-[10px]">{input.type}</Badge>
                        {input.required && <Badge variant="destructive" className="text-[10px]">必填</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{input.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>输出参数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {skill.outputs.map((output) => (
                  <div key={output.name} className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{output.name}</span>
                      <Badge variant="outline" className="text-[10px]">{output.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{output.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perms" className="mt-4">
          <Card>
            <CardContent className="pt-5 space-y-3">
              {permissionLabels.map((perm, idx) => (
                <div key={perm.label}>
                  <InfoRow label={perm.label} value={<span className="text-sm font-mono">{perm.value}</span>} />
                  {idx < permissionLabels.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-left sm:text-right">{value}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}
