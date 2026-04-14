import { PageHeader } from '@/components/PageHeader';
import { StatusDot } from '@/components/StatusDot';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/hooks/useSettings';
import type { StatusVariant } from '@/types';

const connectionStatusMap: Record<string, { label: string; variant: StatusVariant }> = {
  connected: { label: '已连接', variant: 'healthy' },
  disconnected: { label: '已断开', variant: 'failed' },
  error: { label: '异常', variant: 'failed' },
};

const modelStatusMap: Record<string, { label: string; variant: StatusVariant }> = {
  available: { label: '可用', variant: 'healthy' },
  unavailable: { label: '不可用', variant: 'failed' },
};

export default function Settings() {
  const { data: settings, isLoading } = useSettings();

  const connStatus = settings?.resolve_net.status
    ? connectionStatusMap[settings.resolve_net.status]
    : null;

  return (
    <div className="space-y-6">
      <PageHeader title="系统设置" />

      <Tabs defaultValue="platform" className="max-w-3xl">
        <TabsList>
          <TabsTrigger value="platform">平台配置</TabsTrigger>
          <TabsTrigger value="models">模型服务</TabsTrigger>
          <TabsTrigger value="harness">Harness 默认</TabsTrigger>
          <TabsTrigger value="integration">集成对接</TabsTrigger>
        </TabsList>

        {/* Platform Config Tab */}
        <TabsContent value="platform" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Resolve Agent 服务配置</CardTitle>
              <CardDescription>平台运行参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ))}
                </div>
              ) : settings ? (
                <>
                  <div className="space-y-2">
                    <Label>服务地址</Label>
                    <Input value={settings.platform.server_address} readOnly className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>Agent 运行时地址</Label>
                    <Input value={`${settings.platform.runtime_address} (gRPC)`} readOnly className="font-mono" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>版本</Label>
                      <Input value={settings.platform.version} readOnly className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label>Commit</Label>
                      <Input value={settings.platform.commit} readOnly className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label>构建时间</Label>
                      <Input value={new Date(settings.platform.build_date).toLocaleDateString('zh-CN')} readOnly />
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Model Services Tab */}
        <TabsContent value="models" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>模型服务</CardTitle>
              <CardDescription>配置大语言模型接入参数</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-14" />
                    </div>
                  ))}
                </div>
              ) : settings && settings.models.length > 0 ? (
                <div className="space-y-3">
                  {settings.models.map((model, idx) => (
                    <div key={model.id}>
                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{model.name}</span>
                            <span className="text-xs text-muted-foreground">{model.provider}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{model.description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-muted-foreground">
                            {model.max_tokens.toLocaleString()} tokens
                          </span>
                          {(() => {
                            const s = modelStatusMap[model.status];
                            return s ? <StatusBadge variant={s.variant} label={s.label} /> : null;
                          })()}
                        </div>
                      </div>
                      {idx < settings.models.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  支持通义千问、ERNIE、GLM 等国产大模型，通过环境变量或配置文件设置 API Key。
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Harness Defaults Tab — NEW */}
        <TabsContent value="harness" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Harness 默认配置</CardTitle>
              <CardDescription>新建 Agent 时的 Harness 默认参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between py-1">
                <span className="text-sm text-muted-foreground">默认沙箱类型</span>
                <Badge variant="secondary" className="text-[10px]">container</Badge>
              </div>
              <Separator />
              <div className="flex justify-between py-1">
                <span className="text-sm text-muted-foreground">默认上下文策略</span>
                <Badge variant="secondary" className="text-[10px]">compaction</Badge>
              </div>
              <Separator />
              <div className="flex justify-between py-1">
                <span className="text-sm text-muted-foreground">默认持久记忆</span>
                <Badge variant="secondary" className="text-[10px] text-status-healthy bg-status-healthy/10">启用</Badge>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">默认 Hook 模板</p>
                <div className="space-y-1.5">
                  {[
                    { name: 'Lint Check', type: 'post_execution', action: 'lint_check' },
                    { name: 'Auto Retry', type: 'on_error', action: 'auto_retry' },
                    { name: 'Log Trace', type: 'on_exit', action: 'log_trace' },
                  ].map((h) => (
                    <div key={h.name} className="flex items-center gap-3 rounded-md border border-border/20 bg-muted/10 px-3 py-2">
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      <span className="text-xs font-medium flex-1">{h.name}</span>
                      <span className="text-[10px] text-muted-foreground">{h.type} · {h.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Tab */}
        <TabsContent value="integration" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ResolveNet 平台对接</CardTitle>
                  <CardDescription>管理 ResolveNet 现场运维平台的连接配置</CardDescription>
                </div>
                {isLoading ? (
                  <Skeleton className="h-5 w-16" />
                ) : (
                  <span className="flex items-center gap-1.5 text-sm">
                    <StatusDot status={connStatus?.variant ?? 'unknown'} />
                    {connStatus?.label ?? '未知'}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ))}
                </div>
              ) : settings ? (
                <>
                  <div className="space-y-2">
                    <Label>端点地址</Label>
                    <Input value={settings.resolve_net.endpoint} readOnly className="font-mono" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>认证方式</Label>
                      <Input value={`${settings.resolve_net.auth_method} 证书认证`} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>租户 ID</Label>
                      <Input value={settings.resolve_net.tenant_id} readOnly className="font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>同步间隔</Label>
                      <Input value={`${settings.resolve_net.sync_interval_seconds} 秒`} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>连接延迟</Label>
                      <Input value={`${settings.resolve_net.latency_ms}ms`} readOnly className="font-mono" />
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
