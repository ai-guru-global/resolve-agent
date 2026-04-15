import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgent } from '@/hooks/useAgents';
import { api } from '@/api/client';
import type { AgentMode, SandboxType, ContextStrategy, HarnessHook, HookType, HookAction } from '@/types';

const hookTypeOptions: { value: HookType; label: string }[] = [
  { value: 'pre_execution', label: '执行前' },
  { value: 'post_execution', label: '执行后' },
  { value: 'on_error', label: '错误时' },
  { value: 'on_exit', label: '退出时' },
];

const hookActionOptions: { value: HookAction; label: string }[] = [
  { value: 'lint_check', label: '代码检查' },
  { value: 'test_suite', label: '测试验证' },
  { value: 'auto_retry', label: '自动重试' },
  { value: 'compaction', label: '上下文压缩' },
  { value: 'log_trace', label: '日志追踪' },
  { value: 'notify', label: '发送通知' },
];

export default function AgentEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: agent, isLoading } = useAgent(id ?? '');
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('mega');
  const [model, setModel] = useState('qwen-turbo');
  const [status, setStatus] = useState('active');
  const [mode, setMode] = useState<AgentMode>('selector');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [tools, setTools] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [hooks, setHooks] = useState<HarnessHook[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [sandboxType, setSandboxType] = useState<SandboxType>('container');
  const [contextStrategy, setContextStrategy] = useState<ContextStrategy>('default');
  const [newTool, setNewTool] = useState('');
  const [newSkill, setNewSkill] = useState('');

  // Populate form from agent data
  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setType(agent.type);
      setModel(String(agent.config.model ?? 'qwen-turbo'));
      setStatus(agent.status);
      setMode(agent.mode);
      setSystemPrompt(agent.harness.system_prompt);
      setTools([...agent.harness.tools]);
      setSkills([...agent.harness.skills]);
      setHooks(agent.harness.hooks.map((h) => ({ ...h })));
      setMemoryEnabled(agent.harness.memory_enabled);
      setSandboxType(agent.harness.sandbox_type);
      setContextStrategy(agent.harness.context_strategy);
    }
  }, [agent]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await api.updateAgent(id, {
        name,
        type,
        model,
        status,
        mode,
        system_prompt: systemPrompt,
        harness: {
          system_prompt: systemPrompt,
          tools,
          skills,
          hooks,
          memory_enabled: memoryEnabled,
          sandbox_type: sandboxType,
          context_strategy: contextStrategy,
        },
      });
      toast.success('Agent 配置已保存');
      navigate(`/agents/${id}`);
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const addTool = () => {
    if (newTool.trim() && !tools.includes(newTool.trim())) {
      setTools([...tools, newTool.trim()]);
      setNewTool('');
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const addHook = () => {
    setHooks([...hooks, { name: '', type: 'post_execution', action: 'log_trace', enabled: true }]);
  };

  const updateHook = (index: number, field: keyof HarnessHook, value: string | boolean) => {
    const updated = [...hooks];
    const hook = updated[index];
    if (hook) {
      (hook as unknown as Record<string, unknown>)[field] = value;
    }
    setHooks(updated);
  };

  const removeHook = (index: number) => {
    setHooks(hooks.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full max-w-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`编辑 ${agent?.name ?? 'Agent'}`}
        breadcrumbs={[
          { label: 'Agent 管理', href: '/agents' },
          { label: agent?.name ?? '', href: `/agents/${id}` },
          { label: '编辑' },
        ]}
      />

      <div className="max-w-3xl space-y-4">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">名称</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">运行中</SelectItem>
                    <SelectItem value="inactive">未激活</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>类型</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mega">综合智能体 (Mega)</SelectItem>
                    <SelectItem value="skill">技能智能体</SelectItem>
                    <SelectItem value="fta">故障分析 (FTA)</SelectItem>
                    <SelectItem value="rag">知识问答 (RAG)</SelectItem>
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>推理模型</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qwen-turbo">通义千问 Turbo</SelectItem>
                    <SelectItem value="qwen-plus">通义千问 Plus</SelectItem>
                    <SelectItem value="qwen-max">通义千问 Max</SelectItem>
                    <SelectItem value="ernie-4.0">ERNIE 4.0</SelectItem>
                    <SelectItem value="glm-4">GLM-4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>运行模式</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as AgentMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_skills">All Skills — 并行执行</SelectItem>
                  <SelectItem value="selector">Selector — 精准路由</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* System Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>System Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="定义智能体的行为和能力范围"
              className="min-h-[160px] font-mono text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">{systemPrompt.length} 字符</p>
          </CardContent>
        </Card>

        {/* Tools & Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Tools & Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tools</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tools.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1 text-xs">
                    {t}
                    <button onClick={() => setTools(tools.filter((x) => x !== t))} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input value={newTool} onChange={(e) => setNewTool(e.target.value)} placeholder="添加 Tool" className="flex-1" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTool())} />
                <Button variant="outline" size="sm" onClick={addTool}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <Separator />
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Skills</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1 text-xs">
                    {s}
                    <button onClick={() => setSkills(skills.filter((x) => x !== s))} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="添加 Skill" className="flex-1" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
                <Button variant="outline" size="sm" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hooks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Hooks / Middleware</CardTitle>
            <Button variant="outline" size="sm" onClick={addHook}><Plus className="mr-1 h-4 w-4" />添加 Hook</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {hooks.length === 0 ? (
              <p className="text-sm text-muted-foreground/50">暂无 Hooks</p>
            ) : hooks.map((hook, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border border-border/20 bg-muted/10 px-3 py-2">
                <Input value={hook.name} onChange={(e) => updateHook(i, 'name', e.target.value)} placeholder="名称" className="flex-1 h-8 text-xs" />
                <Select value={hook.type} onValueChange={(v) => updateHook(i, 'type', v)}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {hookTypeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={hook.action} onValueChange={(v) => updateHook(i, 'action', v)}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {hookActionOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant={hook.enabled ? 'default' : 'outline'} size="sm" className="h-8 text-xs w-14" onClick={() => updateHook(i, 'enabled', !hook.enabled)}>
                  {hook.enabled ? '启用' : '禁用'}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeHook(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Memory & Infrastructure */}
        <Card>
          <CardHeader>
            <CardTitle>记忆与基础设施</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>持久记忆</Label>
                <Select value={memoryEnabled ? 'true' : 'false'} onValueChange={(v) => setMemoryEnabled(v === 'true')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">启用</SelectItem>
                    <SelectItem value="false">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>上下文策略</Label>
                <Select value={contextStrategy} onValueChange={(v) => setContextStrategy(v as ContextStrategy)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">默认策略</SelectItem>
                    <SelectItem value="compaction">上下文压缩</SelectItem>
                    <SelectItem value="offloading">Tool Offloading</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>沙箱类型</Label>
                <Select value={sandboxType} onValueChange={(v) => setSandboxType(v as SandboxType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">本地沙箱</SelectItem>
                    <SelectItem value="container">容器沙箱</SelectItem>
                    <SelectItem value="remote">远程沙箱</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving || !name}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存配置
          </Button>
          <Button variant="outline" onClick={() => navigate(`/agents/${id}`)}>取消</Button>
        </div>
      </div>
    </div>
  );
}
