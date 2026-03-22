import { useParams } from 'react-router-dom';

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Agent: {id}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-medium mb-4">Configuration</h3>
          <p className="text-gray-500 text-sm">Agent details will be displayed here.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-medium mb-4">Status</h3>
          <p className="text-gray-500 text-sm">Agent status information.</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-medium mb-4">Execution History</h3>
        <p className="text-gray-500 text-sm">No executions recorded.</p>
      </div>
    </div>
  );
}
