import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MessageSquare, Brain, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgent, useAgentConversations, useConversationMessages, useAgentLongTermMemory } from '@/hooks/useAgents';
import { api } from '@/api/client';

const memoryTypeLabels: Record<string, string> = {
  summary: '摘要',
  preference: '偏好',
  pattern: '模式',
  fact: '事实',
  skill_learned: '习得技能',
};

const roleLabels: Record<string, string> = {
  system: '系统',
  user: '用户',
  assistant: '助手',
  tool: '工具',
};

export default function AgentMemory() {
  const { id } = useParams();
  const { data: agent } = useAgent(id ?? '');
  const { data: convData, isLoading: convLoading } = useAgentConversations(id ?? '');
  const { data: ltmData, isLoading: ltmLoading } = useAgentLongTermMemory(id ?? '');
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const { data: messagesData, isLoading: msgLoading } = useConversationMessages(selectedConv ?? '');

  const handleDeleteConversation = async (convId: string) => {
    try {
      await api.deleteConversation(convId);
      toast.success('对话已删除');
      if (selectedConv === convId) setSelectedConv(null);
    } catch {
      toast.error('删除失败');
    }
  };

  const handlePrune = async () => {
    try {
      const result = await api.pruneMemories();
      toast.success(`已清理 ${result.pruned} 条过期记忆`);
    } catch {
      toast.error('清理失败');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${agent?.name ?? 'Agent'} - 记忆浏览器`}
        breadcrumbs={[
          { label: 'Agent 管理', href: '/agents' },
          { label: agent?.name ?? '', href: `/agents/${id}` },
          { label: '记忆' },
        ]}
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">对话数</p>
            <p className="text-2xl font-bold font-mono">{convData?.total ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">长期记忆</p>
            <p className="text-2xl font-bold font-mono">{ltmData?.total ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">记忆状态</p>
            <Badge variant="secondary" className={cn('mt-1 text-xs', agent?.harness.memory_enabled ? 'text-status-healthy bg-status-healthy/10' : 'text-muted-foreground')}>
              {agent?.harness.memory_enabled ? '已启用' : '已禁用'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="conversations">
        <TabsList>
          <TabsTrigger value="conversations">
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            对话记录
          </TabsTrigger>
          <TabsTrigger value="long-term">
            <Brain className="mr-1.5 h-3.5 w-3.5" />
            长期记忆
          </TabsTrigger>
        </TabsList>

        {/* Conversations Tab */}
        <TabsContent value="conversations" className="mt-4">
          <div className="grid grid-cols-3 gap-4" style={{ minHeight: 400 }}>
            {/* Conversation list */}
            <Card className="col-span-1">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">对话列表</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {convLoading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : convData?.conversations.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground/50">暂无对话</p>
                ) : (
                  <div className="divide-y divide-border/20">
                    {convData?.conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConv(conv.id)}
                        className={cn(
                          'w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors',
                          selectedConv === conv.id && 'bg-accent/50',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-muted-foreground">{conv.id}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                            className="text-muted-foreground/40 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{conv.message_count} 条消息 · {conv.user_id}</p>
                        <p className="text-[10px] text-muted-foreground/50">{new Date(conv.updated_at).toLocaleString('zh-CN')}</p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Message thread */}
            <Card className="col-span-2">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">{selectedConv ? `对话 ${selectedConv}` : '选择一个对话'}</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {!selectedConv ? (
                  <p className="text-sm text-muted-foreground/50 text-center py-12">点击左侧对话列表查看消息</p>
                ) : msgLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messagesData?.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          'rounded-lg border border-border/20 p-3',
                          msg.role === 'user' ? 'bg-primary/5 ml-8' : msg.role === 'assistant' ? 'bg-muted/20 mr-8' : 'bg-muted/10',
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-[10px]">{roleLabels[msg.role] ?? msg.role}</Badge>
                          <span className="text-[10px] text-muted-foreground">#{msg.sequence} · {msg.token_count} tokens</span>
                          <span className="text-[10px] text-muted-foreground/50 ml-auto">{new Date(msg.created_at).toLocaleTimeString('zh-CN')}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Long-Term Memory Tab */}
        <TabsContent value="long-term" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handlePrune}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              清理过期记忆
            </Button>
          </div>
          {ltmLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : ltmData?.memories.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground/50">暂无长期记忆</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {ltmData?.memories.map((mem) => (
                <Card key={mem.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="secondary" className="text-[10px]">{memoryTypeLabels[mem.memory_type] ?? mem.memory_type}</Badge>
                          <span className="text-[10px] text-muted-foreground">{mem.user_id}</span>
                          <span className="text-[10px] text-muted-foreground">访问 {mem.access_count} 次</span>
                          {mem.expires_at && (
                            <Badge variant="secondary" className="text-[10px] text-amber-600 bg-amber-50 border-amber-200">
                              过期: {new Date(mem.expires_at).toLocaleDateString('zh-CN')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{mem.content}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1">
                          创建: {new Date(mem.created_at).toLocaleDateString('zh-CN')} · 更新: {new Date(mem.updated_at).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <div className="shrink-0 text-center">
                        <p className="text-[10px] text-muted-foreground">重要性</p>
                        <p className="text-sm font-mono font-bold">{(mem.importance * 100).toFixed(0)}%</p>
                        <div className="mt-1 w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${mem.importance * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
