import { Bot, Zap, GitBranch, Database } from 'lucide-react';

const stats = [
  { name: 'Active Agents', value: '0', icon: Bot, color: 'text-blue-400' },
  { name: 'Loaded Skills', value: '0', icon: Zap, color: 'text-yellow-400' },
  { name: 'Workflows', value: '0', icon: GitBranch, color: 'text-green-400' },
  { name: 'RAG Collections', value: '0', icon: Database, color: 'text-purple-400' },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{stat.name}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`w-10 h-10 ${stat.color} opacity-50`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-lg font-semibold mb-4">Recent Executions</h3>
          <p className="text-gray-500 text-sm">No executions yet.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-lg font-semibold mb-4">System Events</h3>
          <p className="text-gray-500 text-sm">No events yet.</p>
        </div>
      </div>
    </div>
  );
}
