import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Bot,
  Send,
  Loader2,
  Layers,
  Brain,
  Zap,
  Shield,
  MessageSquarePlus,
  History,
  Trash2,
  Clock,
  X,
  Sparkles,
  FlaskConical,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/EmptyState';
import { api, type Agent } from '@/api/client';
import { cn } from '@/lib/utils';
import {
  useConversationHistory,
  type ConversationRecord,
} from './useConversationHistory';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
}

const isMegaAgent = (agent: Agent) => agent.type === 'mega';

const MOCK_RECOMMENDED_QUESTIONS = [
  '集群节点 cn-hangzhou.10.0.3.47 内存使用率 91%，部分 Pod 出现重启',
  '线上服务响应延迟突然升高，P99 从 50ms 飙升到 800ms',
  '明天凌晨 2 点有变更发布，如何评估对生产环境的影响？',
  '最近一周 CPU 使用率趋势异常，帮我分析一下',
];

const MOCK_QUESTIONS_BY_AGENT_TYPE: Record<string, string[]> = {
  mega: [
    '集群节点 cn-hangzhou.10.0.3.47 内存使用率 91%，部分 Pod 出现重启',
    '线上服务响应延迟突然升高，P99 从 50ms 飙升到 800ms',
    '明天凌晨 2 点有变更发布，如何评估对生产环境的影响？',
    '最近一周 CPU 使用率趋势异常，帮我分析一下',
  ],
  fta: [
    'Pod 启动后立即崩溃，帮我做故障树分析',
    '服务间调用链路出现大量超时，根因是什么？',
    '数据库连接数突然打满，分析故障传播路径',
  ],
  rag: [
    'HPA 自动扩缩容的配置规范是什么？',
    '如何在不停机的情况下升级集群版本？',
    '如何配置 Prometheus 告警规则监控 Pod 内存？',
  ],
  skill: [
    '帮我分析最近 30 分钟的日志中的错误',
    '执行一次完整的集群健康检查',
    '生成上周的运维报告摘要',
  ],
  custom: [
    '分析当前入口流量的来源分布',
    '帮我查看 SLB 后端服务器的连接状态',
  ],
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}

export default function Playground() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [conversationId, setConversationId] = useState<string>(
    crypto.randomUUID(),
  );
  const [showHistory, setShowHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mockMode, setMockMode] = useState(false);
  const mockApiRef = useRef<typeof import('@/api/mock').mockApi | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  let conversationCreated = new Date().toISOString();

  const {
    history,
    saveConversation,
    deleteConversation: deleteHistoryRecord,
    getByAgent,
  } = useConversationHistory();

  // Filter history by selected agent
  const agentHistory = useMemo(
    () => (selectedAgent ? getByAgent(selectedAgent) : history),
    [selectedAgent, getByAgent, history],
  );

  const currentAgentName = useMemo(
    () => agents.find((a) => a.id === selectedAgent)?.name ?? '',
    [agents, selectedAgent],
  );

  // Start a new conversation
  const startNewConversation = () => {
    // Save current conversation before starting new one
    persistCurrentConversation();
    setMessages([]);
    const newId = crypto.randomUUID();
    setConversationId(newId);
    conversationCreated = new Date().toISOString();
  };

  // Persist the current conversation to history
  const persistCurrentConversation = () => {
    if (messages.length === 0 || !selectedAgent) return;
    const firstUserMsg = messages.find((m) => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 50) +
        (firstUserMsg.content.length > 50 ? '...' : '')
      : '新对话';
    saveConversation({
      id: conversationId,
      agentId: selectedAgent,
      agentName: currentAgentName,
      title,
      messages,
      createdAt: conversationCreated,
    });
  };

  // Load a historical conversation
  const loadConversation = (record: ConversationRecord) => {
    // Save current first
    persistCurrentConversation();
    // Load the selected one
    setConversationId(record.id);
    setMessages(record.messages);
    conversationCreated = record.createdAt;
    // Switch to the correct agent if needed
    if (record.agentId !== selectedAgent) {
      setSelectedAgent(record.agentId);
    }
    setShowHistory(false);
  };

  // Delete a history record
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    setTimeout(() => {
      deleteHistoryRecord(id);
      setDeletingId(null);
      // If deleting the current conversation, start a new one
      if (id === conversationId) {
        setMessages([]);
        const newId = crypto.randomUUID();
        setConversationId(newId);
        conversationCreated = new Date().toISOString();
      }
    }, 200);
  };

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const data = await api.listAgents();
        const list = data.agents ?? data;
        setAgents(list);
        const first = list[0];
        if (first) {
          setSelectedAgent(first.id);
          setConversationId(crypto.randomUUID());
          conversationCreated = new Date().toISOString();
        }
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

  // Auto-save conversation when messages change
  useEffect(() => {
    if (messages.length > 0 && selectedAgent) {
      const firstUserMsg = messages.find((m) => m.role === 'user');
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 50) +
          (firstUserMsg.content.length > 50 ? '...' : '')
        : '新对话';
      saveConversation({
        id: conversationId,
        agentId: selectedAgent,
        agentName: currentAgentName,
        title,
        messages,
        createdAt: conversationCreated,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let response;
      if (mockMode) {
        if (!mockApiRef.current) {
          const mod = await import('@/api/mock');
          mockApiRef.current = mod.mockApi;
        }
        response = await mockApiRef.current.executeAgent(selectedAgent, input.trim());
      } else {
        response = await api.executeAgent(selectedAgent, input.trim(), conversationId);
      }
      const assistantMsg: Message = {
        role: 'assistant',
        content:
          response.content ?? response.response ?? JSON.stringify(response),
        metadata: response.metadata as Record<string, unknown> | undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: mockMode ? 'Mock 请求失败，请重试' : '请求失败，请重试' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Get recommended questions based on selected agent type
  const getRecommendedQuestions = useMemo(() => {
    if (!selectedAgent) return MOCK_RECOMMENDED_QUESTIONS;
    const agent = agents.find((a) => a.id === selectedAgent);
    if (!agent) return MOCK_RECOMMENDED_QUESTIONS;
    return MOCK_QUESTIONS_BY_AGENT_TYPE[agent.type] ?? MOCK_RECOMMENDED_QUESTIONS;
  }, [selectedAgent, agents]);

  const handleRecommendedQuestion = (question: string) => {
    if (!selectedAgent) return;
    setLoading(true);
    const userMsg: Message = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    (async () => {
      try {
        let response;
        if (mockMode) {
          if (!mockApiRef.current) {
            const mod = await import('@/api/mock');
            mockApiRef.current = mod.mockApi;
          }
          response = await mockApiRef.current.executeAgent(selectedAgent, question);
        } else {
          response = await api.executeAgent(selectedAgent, question, conversationId);
        }
        const assistantMsg: Message = {
          role: 'assistant',
          content:
            response.content ?? response.response ?? JSON.stringify(response),
          metadata: response.metadata as Record<string, unknown> | undefined,
        };
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && last.content === '') {
            return [...prev.slice(0, -1), assistantMsg];
          }
          return [...prev, assistantMsg];
        });
      } catch {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && last.content === '') {
            return [
              ...prev.slice(0, -1),
              { role: 'assistant', content: mockMode ? 'Mock 请求失败，请重试' : '请求失败，请重试' },
            ];
          }
          return [
            ...prev,
            { role: 'assistant', content: mockMode ? 'Mock 请求失败，请重试' : '请求失败，请重试' },
          ];
        });
      } finally {
        setLoading(false);
      }
    })();
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                'gap-1.5',
                showHistory && 'bg-primary/10 border-primary/30',
              )}
            >
              <History className="h-4 w-4" />
              历史对话
              {agentHistory.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]"
                >
                  {agentHistory.length}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={startNewConversation}
              disabled={loading || messages.length === 0}
              className="gap-1.5"
            >
              <MessageSquarePlus className="h-4 w-4" />
              新对话
            </Button>
            <div className="w-auto min-w-[180px]">
              <Select
                value={selectedAgent}
                onValueChange={(v) => {
                  persistCurrentConversation();
                  setSelectedAgent(v);
                  setMessages([]);
                  const newId = crypto.randomUUID();
                  setConversationId(newId);
                  conversationCreated = new Date().toISOString();
                }}
                disabled={loadingAgents}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingAgents ? '加载中...' : '选择 Agent'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                      {isMegaAgent(a) ? ' (Mega)' : ' (Traditional)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant={mockMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMockMode(!mockMode)}
              aria-pressed={mockMode}
              className={cn('gap-1.5', mockMode && 'bg-primary/90 border-primary/30')}
              title="Mock 模式下使用模拟数据，无需后端支持"
            >
              <FlaskConical className="h-4 w-4" />
              Mock {mockMode ? 'ON' : 'OFF'}
            </Button>
          </div>
        }
      />

      {/* Harness summary for selected agent */}
      {currentAgent && currentAgent.harness && (
        <div className="flex items-center gap-3 rounded-lg border border-border/20 bg-card/20 px-4 py-2.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Harness
          </span>
          <Badge
            variant="secondary"
            className="text-[10px] gap-1 bg-primary/10 text-primary"
          >
            {currentAgent.mode === 'all_skills' ? (
              <Layers className="h-3 w-3" />
            ) : (
              <Brain className="h-3 w-3" />
            )}
            {currentAgent.mode === 'all_skills' ? 'All Skills' : 'Selector'}
          </Badge>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Zap className="h-3 w-3" />
            {(currentAgent.harness.skills?.length ?? 0) +
              (currentAgent.harness.tools?.length ?? 0)}{' '}
            tools
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Shield className="h-3 w-3" />
            {currentAgent.harness.hooks?.filter((h) => h.enabled).length ??
              0}{' '}
            hooks
          </span>
          {mockMode && (
            <Badge
              variant="secondary"
              className="text-[10px] gap-1"
              style={{
                borderColor: 'hsl(var(--status-mock-border))',
                backgroundColor: 'hsl(var(--status-mock-bg))',
                color: 'hsl(var(--status-mock-text))',
              }}
            >
              <FlaskConical className="h-3 w-3" />
              Mock
            </Badge>
          )}
        </div>
      )}

      {/* Main content area with optional history sidebar */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* History Sidebar */}
        {showHistory && (
          <Card className="w-80 flex-shrink-0 flex-col overflow-hidden max-lg:hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">历史对话</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                onClick={() => setShowHistory(false)}
                aria-label="关闭历史"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {agentHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Clock className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs">暂无历史对话</p>
                  </div>
                ) : (
                  agentHistory.map((record) => {
                    const isActive = record.id === conversationId;
                    const isDeleting = record.id === deletingId;
                    const msgCount = record.messages.length;
                    return (
                      <div className="group relative">
                        <button
                          type="button"
                          key={record.id}
                          aria-current={isActive ? 'true' : undefined}
                          onClick={() => !isActive && loadConversation(record)}
                          className={cn(
                            'w-full text-left rounded-lg px-3 py-2.5 pr-12 text-sm transition-colors',
                            isActive
                              ? 'bg-primary/10 border border-primary/20'
                              : 'hover:bg-accent/50 border border-transparent',
                            isDeleting && 'opacity-50 scale-95',
                          )}
                        >
                          <span className="flex flex-col gap-1">
                            <span
                              className={cn(
                                'text-xs font-medium leading-snug line-clamp-2',
                                isActive
                                  ? 'text-primary'
                                  : 'text-foreground/80',
                              )}
                            >
                              {record.title}
                            </span>
                            <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatRelativeTime(record.updatedAt)}
                              </span>
                              <span>·</span>
                              <span>{msgCount} 条消息</span>
                              {record.agentName && (
                                <>
                                  <span>·</span>
                                  <span className="truncate max-w-[80px]">
                                    {record.agentName}
                                  </span>
                                </>
                              )}
                            </span>
                          </span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-11 w-11 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                          onClick={(e) => handleDelete(record.id, e)}
                          aria-label="删除对话"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </Card>
        )}

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <CardContent className="p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                  <EmptyState
                    icon={Bot}
                    title="开始对话"
                    description={
                      mockMode
                        ? '当前为 Mock 模式，使用模拟数据进行演示'
                        : '选择一个 Agent，输入问题开始 Harness 执行验证'
                    }
                    className="py-8"
                  />
                  {selectedAgent && (
                    <div className="w-full max-w-lg space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Sparkles className="h-4 w-4" />
                        <span>推荐问题（点击直接发送）</span>
                      </div>
                      <div className="grid gap-2">
                        {getRecommendedQuestions.map((q, idx) => (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => handleRecommendedQuestion(q)}
                            className={cn(
                              'text-left text-sm p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-accent/50 hover:border-primary/30 hover:shadow-sm transition-colors duration-150',
                              'flex items-start gap-2',
                            )}
                          >
                            <Bot className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                            <span className="leading-snug">{q}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex',
                      msg.role === 'user' ? 'justify-end' : 'justify-start',
                    )}
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
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-primary/10 text-primary"
                          >
                            {String(msg.metadata.route_type)}
                          </Badge>
                          {'confidence' in msg.metadata && (
                            <Badge variant="outline" className="text-[10px]">
                              {(Number(msg.metadata.confidence) * 100).toFixed(
                                0,
                              )}
                              %
                            </Badge>
                          )}
                          {'hooks_triggered' in msg.metadata && (
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
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
                placeholder={
                  selectedAgent
                    ? mockMode
                      ? 'Mock 模式下输入问题（使用模拟数据）...'
                      : '输入问题...'
                    : '请先选择 Agent'
                }
                aria-label={selectedAgent ? (mockMode ? 'Mock 模式问题输入' : '问题输入') : '选择 Agent 后输入问题'}
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
    </div>
  );
}
