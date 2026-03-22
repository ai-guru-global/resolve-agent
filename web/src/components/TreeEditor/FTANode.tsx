import { memo } from 'react';

interface FTANodeProps {
  data: {
    label: string;
    type: 'top' | 'intermediate' | 'basic';
    status?: 'pending' | 'evaluating' | 'completed';
  };
}

function FTANode({ data }: FTANodeProps) {
  const statusColors = {
    pending: 'border-gray-600',
    evaluating: 'border-yellow-500 animate-pulse',
    completed: 'border-green-500',
  };

  const typeColors = {
    top: 'bg-red-900/30',
    intermediate: 'bg-blue-900/30',
    basic: 'bg-gray-800',
  };

  return (
    <div
      className={`px-4 py-2 rounded-lg border-2 ${
        statusColors[data.status || 'pending']
      } ${typeColors[data.type]} min-w-[120px] text-center`}
    >
      <div className="text-xs text-gray-400 uppercase">{data.type}</div>
      <div className="text-sm font-medium mt-1">{data.label}</div>
    </div>
  );
}

export default memo(FTANode);
