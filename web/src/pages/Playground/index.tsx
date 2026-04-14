import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Loader2, Layers, Brain, Zap, Shield } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/EmptyState';
import { api, type Agent } from '@/api/client';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
}

export default function Playground() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [loadingAgents, setLoadingAgents] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const data = await api.listAgents();
        const list = (data as any).agents ?? data;
        setAgents(list);
        const first = list[0];
        if (first) setSelectedAgent(first.id);
      } catch {
        // ignore
      } finally {
        setLoadingAgents(false);
      }
    };
    void loadAgents();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.executeAgent(selectedAgent, input.trim());
      const assistantMsg: Message = {
        role: 'assistant',
        content: response.content ?? response.response ?? JSON.stringify(response),
        metadata: response.metadata as Record<string, unknown> | undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '请求失败，请重试' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const currentAgent = agents.find((a) => a.id === selectedAgent);

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col space-y-4">
      <PageHeader
        title="Playground"
        actions={
          <div className="w-56">
            <Select value={selectedAgent} onValueChange={setSelectedAgent} disabled={loadingAgents}>
              <SelectTrigger>
                <SelectValue placeholder={loadingAgents ? '加载中...' : '选择 Agent'} />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Harness summary for selected agent */}
      {currentAgent && (
        <div className="flex items-center gap-3 rounded-lg border border-border/20 bg-card/20 px-4 py-2.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Harness</span>
          <Badge variant="secondary" className="text-[10px] gap-1 border border-primary/20 bg-primary/5 text-primary">
            {currentAgent.mode === 'all_skills' ? <Layers className="h-3 w-3" /> : <Brain className="h-3 w-3" />}
            {currentAgent.mode === 'all_skills' ? 'All Skills' : 'Selector'}
          </Badge>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Zap className="h-3 w-3" />
            {currentAgent.harness.skills.length + currentAgent.harness.tools.length} tools
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Shield className="h-3 w-3" />
            {currentAgent.harness.hooks.filter(h => h.enabled).length} hooks
          </span>
        </div>
      )}

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <CardContent className="p-4 space-y-4">
            {messages.length === 0 ? (
              <EmptyState
                icon={Bot}
                title="开始对话"
                description="选择一个 Agent，输入问题开始 Harness 执行验证"
                className="py-20"
              />
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[70%] rounded-lg px-4 py-2.5 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border',
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.metadata && 'route_type' in msg.metadata && (
                      <div className="mt-2 flex gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] border border-primary/20 bg-primary/5 text-primary">
                          {String(msg.metadata.route_type)}
                        </Badge>
                        {'confidence' in msg.metadata && (
                          <Badge variant="outline" className="text-[10px]">
                            {(Number(msg.metadata.confidence) * 100).toFixed(0)}%
                          </Badge>
                        )}
                        {'hooks_triggered' in msg.metadata && (
                          <Badge variant="secondary" className="text-[10px]">
                            <Shield className="h-3 w-3 mr-1" />
                            {String(msg.metadata.hooks_triggered)} hooks
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-lg px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>
        </ScrollArea>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedAgent ? '输入问题...' : '请先选择 Agent'}
              disabled={!selectedAgent || loading}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!selectedAgent || !input.trim() || loading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
