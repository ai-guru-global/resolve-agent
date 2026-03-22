import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

export default function WorkflowList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">FTA Workflows</h2>
        <Link
          to="/workflows/designer"
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Design Workflow
        </Link>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-gray-500 text-sm">No workflows defined yet.</p>
      </div>
    </div>
  );
}
