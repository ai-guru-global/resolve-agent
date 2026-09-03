import { useParams } from 'react-router-dom';
import { Clock, FileText, Rocket, Power, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgent, useAgentDeployment, useAgentDeploymentVersions, useAgentLogs, useDeployAgent, useUndeployAgent, useScaleAgent, useUpdateDeploymentConfig } from '@/hooks/useAgents';
import type { StatusVariant } from '@/types';

const stateMap: Record<string, { label: string; variant: StatusVariant }> = {
  deployed: { label: '已部署', variant: 'healthy' },
  undeployed: { label: '未部署', variant: 'unknown' },
  deploying: { label: '部署中', variant: 'progressing' },
  scaling: { label: '扩缩容中', variant: 'progressing' },
  error: { label: '异常', variant: 'failed' },
};

const logLevelColors: Record<string, string> = {
  debug: 'text-muted-foreground',
  info: 'text-foreground',
  warn: 'text-amber-500',
  error: 'text-status-failed',
};

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days} 天 ${hours} 小时`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours} 小时 ${minutes} 分钟`;
}

export default function AgentDeployment() {
  const { id } = useParams();
  const { data: agent } = useAgent(id ?? '');
  const { data: deployment, isLoading: deplLoading } = useAgentDeployment(id ?? '');
  const { data: versionsData } = useAgentDeploymentVersions(id ?? '');
  const { data: logsData } = useAgentLogs(id ?? '');
  const agentId = id ?? '';
  const deployMutation = useDeployAgent(agentId);
  const undeployMutation = useUndeployAgent(agentId);
  const scaleMutation = useScaleAgent(agentId);
  const configMutation = useUpdateDeploymentConfig(agentId);

  const stateInfo = deployment ? stateMap[deployment.state] : undefined;
  const operating = deployMutation.isPending || undeployMutation.isPending || scaleMutation.isPending;

  const handleDeploy = () => {
    deployMutation.mutate(undefined, {
      onSuccess: (info) => toast.success(`已部署，当前副本数 ${info.replicas}`),
      onError: () => toast.error('部署失败，请重试'),
    });
  };

  const handleUndeploy = () => {
    undeployMutation.mutate(undefined, {
      onSuccess: () => toast.success('Agent 已下线'),
      onError: () => toast.error('下线失败，请重试'),
    });
  };

  const handleScale = (replicas: number) => {
    if (!deployment || replicas < 1 || replicas > 10 || replicas === deployment.replicas) return;
    scaleMutation.mutate(replicas, {
      onSuccess: (info) => toast.success(`已扩缩容至 ${info.replicas} 副本`),
      onError: () => toast.error('扩缩容失败，请重试'),
    });
  };

  const handleToggleAutoScale = () => {
    if (!deployment) return;
    const next = !deployment.auto_scale;
    configMutation.mutate({ auto_scale: next }, {
      onSuccess: (info) => toast.success(info.auto_scale ? '已开启自动扩缩容' : '已关闭自动扩缩容'),
      onError: () => toast.error('配置更新失败，请重试'),
    });
  };

  if (deplLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${agent?.name ?? 'Agent'} - 部署管理`}
        breadcrumbs={[
          { label: 'Agent 管理', href: '/agents' },
          { label: agent?.name ?? '', href: `/agents/${id}` },
          { label: '部署管理' },
        ]}
        actions={stateInfo && <StatusBadge variant={stateInfo.variant} label={stateInfo.label} />}
      />

      {deployment && (
        <>
          {/* Deployment Status */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">副本数</p>
                <p className="text-2xl font-bold font-mono">{deployment.replicas} / {deployment.desired_replicas}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">CPU 限制</p>
                <p className="text-2xl font-bold font-mono">{deployment.cpu_limit}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">内存限制</p>
                <p className="text-2xl font-bold font-mono">{deployment.memory_limit}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">运行时间</p>
                <p className="text-lg font-bold">{formatUptime(deployment.uptime_seconds)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Deployment Actions */}
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">副本控制</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={deployment.state === 'undeployed' || operating || deployment.replicas <= 1}
                  onClick={() => handleScale(deployment.replicas - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-sm font-mono font-bold w-6 text-center">{deployment.replicas}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={deployment.state === 'undeployed' || operating || deployment.replicas >= 10}
                  onClick={() => handleScale(deployment.replicas + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="h-6 w-px bg-border/40" />

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">自动扩缩容</span>
                <Badge variant={deployment.auto_scale ? 'default' : 'secondary'} className="text-[10px]">
                  {deployment.auto_scale ? '已开启' : '已关闭'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={configMutation.isPending}
                  onClick={handleToggleAutoScale}
                >
                  {deployment.auto_scale ? '关闭' : '开启'}
                </Button>
              </div>

              <div className="flex-1" />

              {deployment.state === 'undeployed' ? (
                <Button size="sm" className="h-8" disabled={operating} onClick={handleDeploy}>
                  <Rocket className="mr-1.5 h-3.5 w-3.5" />
                  部署
                </Button>
              ) : (
                <Button size="sm" variant="destructive" className="h-8" disabled={operating} onClick={handleUndeploy}>
                  <Power className="mr-1.5 h-3.5 w-3.5" />
                  下线
                </Button>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="versions">
            <TabsList>
              <TabsTrigger value="versions">
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                版本历史
              </TabsTrigger>
              <TabsTrigger value="logs">
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                运行日志
              </TabsTrigger>
            </TabsList>

            <TabsContent value="versions" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {versionsData?.versions.map((v, i) => (
                    <div key={v.version} className={cn('flex items-start gap-4 px-6 py-4', i > 0 && 'border-t border-border/20')}>
                      <div className="flex flex-col items-center">
                        <div className={cn('h-3 w-3 rounded-full', v.status === 'success' ? 'bg-status-healthy' : v.status === 'rollback' ? 'bg-amber-500' : 'bg-status-failed')} />
                        {i < (versionsData.versions.length - 1) && <div className="w-px flex-1 bg-border/20 mt-1" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-bold">{v.version}</span>
                          <Badge variant="secondary" className="text-[10px]">{v.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{v.config_changes}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1">
                          {v.deployer} · {new Date(v.deployed_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <div className="bg-background/50 rounded-lg border border-border/20 p-3 font-mono text-xs space-y-0.5 max-h-96 overflow-auto">
                    {logsData?.logs.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-muted-foreground/50 shrink-0">{new Date(log.timestamp).toLocaleTimeString('zh-CN')}</span>
                        <span className={cn('shrink-0 w-12 uppercase', logLevelColors[log.level])}>[{log.level}]</span>
                        <span className={cn(logLevelColors[log.level])}>{log.message}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
