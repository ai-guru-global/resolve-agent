import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/api/client';

export default function AgentCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('mega');
  const [model, setModel] = useState('qwen-turbo');
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createAgent({ name, type, model, system_prompt: prompt });
      toast.success('智能体创建成功');
      navigate('/agents');
    } catch {
      toast.error('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="创建运维智能体"
        breadcrumbs={[
          { label: '智能体管理', href: '/agents' },
          { label: '创建智能体' },
        ]}
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>智能体配置</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">智能体名称</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="输入智能体名称" required />
            </div>

            <div className="space-y-2">
              <Label>智能体类型</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qwen-turbo">通义千问 Turbo</SelectItem>
                  <SelectItem value="qwen-plus">通义千问 Plus</SelectItem>
                  <SelectItem value="qwen-max">通义千问 Max</SelectItem>
                  <SelectItem value="ernie-4.0">ERNIE 4.0</SelectItem>
                  <SelectItem value="glm-4">GLM-4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">系统提示词</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="输入系统提示词，定义智能体的行为和能力范围"
                className="min-h-[120px]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading || !name}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                创建智能体
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/agents')}>
                取消
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
