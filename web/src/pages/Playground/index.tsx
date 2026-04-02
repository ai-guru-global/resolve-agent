import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { api, Agent } from '../../api/client';

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
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [loadingAgents, setLoadingAgents] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadAgents = async () => {
    try {
      const response = await api.listAgents();
      setAgents(response.agents);
      if (response.agents.length > 0) {
        setSelectedAgent(response.agents[0].id);
      }
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await api.executeAgent(selectedAgent, userMessage);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.response || response.content || 'No response',
          metadata: response.metadata,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Failed to execute agent'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header with agent selector */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 className="text-lg font-semibold">Playground</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Agent:</span>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            disabled={loadingAgents}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
          >
            {loadingAgents ? (
              <option>Loading...</option>
            ) : agents.length === 0 ? (
              <option>No agents available</option>
            ) : (
              agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Bot className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="mb-2">Select an agent and start a conversation.</p>
              <p className="text-sm text-gray-600">
                The agent will process your message through the Intelligent Selector.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-400" />
              </div>
            )}

            <div
              className={`max-w-[70%] rounded-xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-800 text-gray-200'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.metadata && Object.keys(msg.metadata).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700/50 text-xs text-gray-400">
                  {msg.metadata.route_type && (
                    <span className="inline-flex items-center gap-1 mr-3">
                      Route: {String(msg.metadata.route_type)}
                    </span>
                  )}
                  {msg.metadata.confidence && (
                    <span className="inline-flex items-center gap-1">
                      Confidence: {(Number(msg.metadata.confidence) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-900/50 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-400" />
            </div>
            <div className="bg-gray-800 rounded-xl px-4 py-2.5">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={loading || !selectedAgent}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none disabled:opacity-50"
            placeholder={
              !selectedAgent
                ? 'Select an agent to start chatting...'
                : 'Type a message...'
            }
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim() || !selectedAgent}
            className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
