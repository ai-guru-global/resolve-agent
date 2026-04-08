import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatPanelProps {
  agentId?: string;
  onSend?: (message: string) => void;
}

export function ChatPanel({ agentId, onSend }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    onSend?.(input);
    setInput('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn('text-sm', msg.role === 'user' ? 'text-right' : 'text-left')}>
            <span
              className={cn(
                'inline-block rounded-lg px-3 py-2',
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border',
              )}
            >
              {msg.content}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={agentId ? '输入消息...' : '请先选择智能体'}
          disabled={!agentId}
        />
        <Button size="icon" onClick={handleSend} disabled={!agentId}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
