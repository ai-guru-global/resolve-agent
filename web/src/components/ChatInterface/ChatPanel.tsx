import { useState } from 'react';
import { Send } from 'lucide-react';

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
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm ${
              msg.role === 'user' ? 'text-right' : 'text-left'
            }`}
          >
            <span
              className={`inline-block px-3 py-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-800 text-gray-200'
              }`}
            >
              {msg.content}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-800 p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
          placeholder={agentId ? `Chat with ${agentId}...` : 'Select an agent...'}
          disabled={!agentId}
        />
        <button
          onClick={handleSend}
          disabled={!agentId}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white p-1.5 rounded-lg"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
