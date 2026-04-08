import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSkillDetail } from '@/hooks/useSkills';

export default function SkillDetail() {
  const { name } = useParams();
  const { data: skill, isLoading, isError } = useSkillDetail(name ?? '');

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
            <p className="text-muted-foreground">未找到名为 &ldquo;{name}&rdquo; 的技能</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link to="/skills">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回技能列表
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        actions={<Badge variant="secondary" className="font-mono">v{skill.version}</Badge>}
      />

      <Tabs defaultValue="info" className="max-w-3xl">
        <TabsList>
          <TabsTrigger value="info">基本信息</TabsTrigger>
          <TabsTrigger value="io">输入输出</TabsTrigger>
          <TabsTrigger value="perms">权限配置</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex justify-between py-1">
                <span className="text-sm text-muted-foreground">技能名称</span>
                <span className="text-sm font-mono">{skill.name}</span>
              </div>
              <Separator />
              <div className="flex justify-between py-1">
                <span className="text-sm text-muted-foreground">作者</span>
                <span className="text-sm">{skill.author}</span>
              </div>
              <Separator />
              <div className="flex justify-between py-1">
                <span className="text-sm text-muted-foreground">版本</span>
                <span className="text-sm font-mono">{skill.version}</span>
              </div>
              <Separator />
              <div className="flex justify-between py-1">
                <span className="text-sm text-muted-foreground">入口文件</span>
                <span className="text-sm font-mono">{skill.entry_point}</span>
              </div>
              <Separator />
              <div className="flex justify-between py-1">
                <span className="text-sm text-muted-foreground">安装时间</span>
                <span className="text-sm">{new Date(skill.install_date).toLocaleString('zh-CN')}</span>
              </div>
              <Separator />
              <div className="flex justify-between py-1">
                <span className="text-sm text-muted-foreground">最后执行</span>
                <span className="text-sm">{new Date(skill.last_executed).toLocaleString('zh-CN')}</span>
              </div>
              <Separator />
              <div className="flex justify-between py-1">
                <span className="text-sm text-muted-foreground">累计执行</span>
                <span className="text-sm font-mono">{skill.execution_count.toLocaleString()} 次</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
                  <div className="flex justify-between py-1">
                    <span className="text-sm text-muted-foreground">{perm.label}</span>
                    <span className="text-sm font-mono">{perm.value}</span>
                  </div>
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
