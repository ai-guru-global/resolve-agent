import { useState } from 'react';
import { Check, ChevronDown, Copy } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { configGroups, type ConfigItem } from './configGuide';

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
  const [configFilter, setConfigFilter] = useState<'all' | 'needed'>('all');
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(() => new Set(['required']));
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const connStatus = settings?.resolve_net?.status
    ? connectionStatusMap[settings.resolve_net.status]
    : null;

  const needsConfig = (item: ConfigItem) => item.filterTag !== 'optional';
  const neededCount = configGroups.reduce((n, g) => n + g.items.filter(needsConfig).length, 0);
  const totalCount = configGroups.reduce((n, g) => n + g.items.length, 0);
  const visibleGroups =
    configFilter === 'needed' ? configGroups.filter((g) => g.items.some(needsConfig)) : configGroups;
  const isGroupOpen = (id: string) => configFilter === 'needed' || expandedGroups.has(id);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyExample = (id: string, text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedId(id);
        window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
      })
      .catch(() => {});
  };

  return (
    <div className="space-y-6">
      <PageHeader title="系统设置" />

      <Tabs defaultValue="platform" className="max-w-3xl">
        <TabsList>
          <TabsTrigger value="platform">平台配置</TabsTrigger>
          <TabsTrigger value="models">模型服务</TabsTrigger>
          <TabsTrigger value="harness">Harness 默认</TabsTrigger>
          <TabsTrigger value="integration">集成对接</TabsTrigger>
          <TabsTrigger value="config-guide">配置说明</TabsTrigger>
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
              ) : settings?.platform ? (
                <>
                  <div className="space-y-2">
                    <Label>服务地址</Label>
                    <Input value={settings.platform.server_address ?? '未配置'} readOnly className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>Agent 运行时地址</Label>
                    <Input value={`${settings.platform.runtime_address ?? '未配置'} (gRPC)`} readOnly className="font-mono" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>版本</Label>
                      <Input value={settings.platform.version ?? '未配置'} readOnly className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label>Commit</Label>
                      <Input value={settings.platform.commit ?? '未配置'} readOnly className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label>构建时间</Label>
                      <Input value={settings.platform.build_date ? new Date(settings.platform.build_date).toLocaleDateString('zh-CN') : '未配置'} readOnly />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">平台配置不可用</p>
              )}
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
              ) : settings && (settings.models?.length ?? 0) > 0 ? (
                <div className="space-y-3">
                  {(settings.models ?? []).map((model, idx) => (
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
                      {idx < (settings.models?.length ?? 0) - 1 && <Separator />}
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
                    {connStatus?.label ?? (settings?.resolve_net ? '未知' : '未配置')}
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
              ) : settings?.resolve_net ? (
                <>
                  <div className="space-y-2">
                    <Label>端点地址</Label>
                    <Input value={settings.resolve_net.endpoint ?? '未配置'} readOnly className="font-mono" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>认证方式</Label>
                      <Input value={settings.resolve_net.auth_method ? `${settings.resolve_net.auth_method} 证书认证` : '未配置'} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>租户 ID</Label>
                      <Input value={settings.resolve_net.tenant_id ?? '未配置'} readOnly className="font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>同步间隔</Label>
                      <Input value={settings.resolve_net.sync_interval_seconds != null ? `${settings.resolve_net.sync_interval_seconds} 秒` : '未配置'} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>连接延迟</Label>
                      <Input value={settings.resolve_net.latency_ms != null ? `${settings.resolve_net.latency_ms}ms` : '未配置'} readOnly className="font-mono" />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">ResolveNet 对接未配置</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Config Guide Tab */}
        <TabsContent value="config-guide" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>环境变量配置说明</CardTitle>
              <CardDescription>
                配置方式：复制 .env.example 为 .env 后填写，下方按启动决策顺序说明各项的目的、作用与不配置的影响。
                提示：后端不可用时 WebUI 自动进入演示模式（mock 数据驱动），可零配置体验全部页面。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 pb-1" role="group" aria-label="配置项筛选">
                <button
                  type="button"
                  aria-pressed={configFilter === 'all'}
                  onClick={() => setConfigFilter('all')}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    configFilter === 'all'
                      ? 'border-transparent bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted/40',
                  )}
                >
                  全部（{totalCount} 项）
                </button>
                <button
                  type="button"
                  aria-pressed={configFilter === 'needed'}
                  onClick={() => setConfigFilter('needed')}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    configFilter === 'needed'
                      ? 'border-transparent bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted/40',
                  )}
                >
                  需要配置（{neededCount} 项）
                </button>
              </div>

              {visibleGroups.map((group) => {
                const items = configFilter === 'needed' ? group.items.filter(needsConfig) : group.items;
                const open = isGroupOpen(group.id);
                return (
                  <div key={group.id}>
                    <h4>
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={`config-group-${group.id}`}
                        onClick={() => toggleGroup(group.id)}
                        className="-mx-2 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronDown
                          className={cn(
                            'size-4 shrink-0 text-muted-foreground transition-transform',
                            open && 'rotate-180',
                          )}
                        />
                        <span className="text-sm font-semibold">{group.title}</span>
                        <span className="truncate text-xs text-muted-foreground">{group.summary}</span>
                        <span className="ml-auto shrink-0 rounded-md border px-2 py-0.5 text-[10px] text-muted-foreground">
                          {items.length} 项
                        </span>
                      </button>
                    </h4>
                    {open && (
                      <div id={`config-group-${group.id}`} className="space-y-3 px-2 pb-2">
                        {items.map((item) => (
                          <ConfigGuideItem
                            key={item.keys[0]}
                            item={item}
                            copied={copiedId === item.keys[0]}
                            onCopy={copyExample}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConfigGuideItem({
  item,
  copied,
  onCopy,
}: {
  item: ConfigItem;
  copied: boolean;
  onCopy: (id: string, text: string) => void;
}) {
  const example = item.example;
  const key0 = item.keys[0] ?? '';
  return (
    <div className="space-y-3 rounded-md border border-border/40 bg-muted/5 p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="text-sm font-medium">{item.name}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          {item.keys.map((k) => (
            <code key={k} className="break-all rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs">
              {k}
            </code>
          ))}
        </span>
        <Badge variant={item.requirementVariant} className="ml-auto shrink-0 text-[10px]">
          {item.requirement}
        </Badge>
      </div>
      <dl className="space-y-2">
        <div className="grid grid-cols-[92px_1fr] gap-x-3">
          <dt className="pt-0.5 text-xs text-muted-foreground">目的</dt>
          <dd className="text-sm leading-relaxed">{item.purpose}</dd>
        </div>
        <div className="grid grid-cols-[92px_1fr] gap-x-3">
          <dt className="pt-0.5 text-xs text-muted-foreground">作用</dt>
          <dd className="text-sm leading-relaxed">{item.effect}</dd>
        </div>
        <div className="grid grid-cols-[92px_1fr] gap-x-3">
          <dt className="pt-0.5 text-xs text-muted-foreground">不配置的影响</dt>
          <dd className="text-sm leading-relaxed text-amber-700 dark:text-amber-400">{item.impact}</dd>
        </div>
      </dl>
      {example && (
        <div className="flex items-center justify-between gap-2 rounded bg-muted/30 px-2 py-1.5">
          <code className="min-w-0 break-all font-mono text-xs text-muted-foreground">{example}</code>
          <button
            type="button"
            onClick={() => onCopy(key0, example)}
            aria-label={copied ? '已复制' : `复制示例：${key0}`}
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copied ? <Check className="size-3.5 text-status-healthy" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
