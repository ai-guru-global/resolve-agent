import { useState } from 'react';

export default function WorkflowDesigner() {
  const [nodes] = useState<string[]>([]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">FTA Workflow Designer</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl" style={{ height: '600px' }}>
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">Visual FTA Tree Editor</p>
            <p className="text-sm">
              Drag and drop events and gates to build your fault tree.
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Powered by React Flow
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
