import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

export default function AgentCreate() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [agentType, setAgentType] = useState('mega');
  const [model, setModel] = useState('qwen-plus');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.createAgent({
        name,
        type: agentType,
        model,
        system_prompt: systemPrompt,
      });
      navigate('/agents');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold mb-6">Create New Agent</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-900/50 border border-red-800 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            placeholder="my-agent"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Type</label>
          <select
            value={agentType}
            onChange={(e) => setAgentType(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            disabled={loading}
          >
            <option value="mega">Mega Agent</option>
            <option value="skill">Skill Agent</option>
            <option value="fta">FTA Agent</option>
            <option value="rag">RAG Agent</option>
            <option value="custom">Custom Agent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            disabled={loading}
          >
            <option value="qwen-turbo">Qwen Turbo</option>
            <option value="qwen-plus">Qwen Plus</option>
            <option value="qwen-max">Qwen Max</option>
            <option value="ernie-4.0">ERNIE 4.0</option>
            <option value="glm-4">GLM-4</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:outline-none h-32 resize-y"
            placeholder="You are a helpful assistant..."
            disabled={loading}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Creating...' : 'Create Agent'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/agents')}
            disabled={loading}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-2 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
