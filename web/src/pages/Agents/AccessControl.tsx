import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, Users, Clock, Eye, Pencil, Play, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgent, useAgentAccessRules, useAgentAuditLog } from '@/hooks/useAgents';
import type { AccessRole } from '@/types';

const roleLabels: Record<AccessRole, string> = {
  viewer: '只读',
  operator: '操作员',
  developer: '开发者',
  admin: '管理员',
};

const roleColors: Record<AccessRole, string> = {
  viewer: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  operator: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  developer: 'bg-green-500/10 text-green-500 border-green-500/20',
  admin: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const permissionIcons = {
  view: Eye,
  execute: Play,
  edit: Pencil,
  admin: Settings2,
};

const permissionLabels: Record<string, string> = {
  view: '查看',
  execute: '执行',
  edit: '编辑',
  admin: '管理',
};

export default function AccessControl() {
  const { id } = useParams();
  const { data: agent, isLoading: agentLoading } = useAgent(id ?? '');
  const { data: rulesData, isLoading: rulesLoading } = useAgentAccessRules(id ?? '');
  const { data: auditData, isLoading: auditLoading } = useAgentAuditLog(id ?? '');
  const [tab, setTab] = useState('rules');

  const isLoading = agentLoading || rulesLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title={agentLoading ? '加载中...' : `访问控制 — ${agent?.name ?? id ?? ''}`}
        description="管理 Agent 的访问权限和审计日志"
        breadcrumbs={[
          { label: 'Agent 管理', href: '/agents' },
          { label: agent?.name ?? id ?? '详情', href: `/agents/${id ?? ''}` },
          { label: '访问控制' },
        ]}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="rules">访问规则</TabsTrigger>
          <TabsTrigger value="audit">审计日志</TabsTrigger>
        </TabsList>

        {/* Access Rules */}
        <TabsContent value="rules" className="mt-4 space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : !rulesData?.rules.length ? (
            <EmptyState icon={Shield} title="暂无访问规则" description="访问控制功能将在后续版本推出" />
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['viewer', 'operator', 'developer', 'admin'] as const).map((role) => {
                  const count = rulesData.rules.filter((r) => r.role === role).length;
                  return (
                    <Card key={role}>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold font-mono">{count}</p>
                        <Badge variant="secondary" className={cn('text-[10px] mt-1 border', roleColors[role])}>
                          {roleLabels[role]}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Rules list */}
              <div className="space-y-2">
                {rulesData.rules.map((rule) => (
                  <Card key={rule.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{rule.user_or_role}</span>
                            <Badge variant="secondary" className={cn('text-[10px] border', roleColors[rule.role])}>
                              {roleLabels[rule.role]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {(Object.keys(rule.permissions) as Array<keyof typeof rule.permissions>).map((perm) => {
                              const Icon = permissionIcons[perm];
                              const enabled = rule.permissions[perm];
                              return (
                                <span
                                  key={perm}
                                  className={cn(
                                    'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded',
                                    enabled
                                      ? 'text-status-healthy bg-status-healthy/10'
                                      : 'text-muted-foreground/30 bg-muted/20',
                                  )}
                                >
                                  <Icon className="h-3 w-3" />
                                  {permissionLabels[perm]}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(rule.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Audit Log */}
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />审计日志</CardTitle></CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !auditData?.entries.length ? (
                <p className="text-sm text-muted-foreground text-center py-6">暂无审计日志</p>
              ) : (
                <div className="space-y-1">
                  {auditData.entries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/20 transition-colors">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{entry.user}</span>
                          <Badge variant="secondary" className="text-[9px]">{entry.action}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{entry.detail}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(entry.timestamp).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Reference */}
      <Card>
        <CardHeader><CardTitle className="text-sm">角色权限参考</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/20">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">角色</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">查看</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">执行</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">编辑</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">管理</th>
                </tr>
              </thead>
              <tbody>
                {([
                  { role: 'viewer' as const, perms: [true, false, false, false] },
                  { role: 'operator' as const, perms: [true, true, false, false] },
                  { role: 'developer' as const, perms: [true, true, true, false] },
                  { role: 'admin' as const, perms: [true, true, true, true] },
                ]).map(({ role, perms }) => (
                  <tr key={role} className="border-b border-border/10">
                    <td className="py-2 pr-4">
                      <Badge variant="secondary" className={cn('text-[10px] border', roleColors[role])}>
                        {roleLabels[role]}
                      </Badge>
                    </td>
                    {perms.map((p, i) => (
                      <td key={i} className="text-center py-2 px-3">
                        <span className={cn('text-xs', p ? 'text-status-healthy' : 'text-muted-foreground/20')}>
                          {p ? '✓' : '—'}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
