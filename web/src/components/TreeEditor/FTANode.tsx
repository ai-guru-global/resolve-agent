import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';

interface FTANodeProps {
  data: {
    label: string;
    type: 'top' | 'intermediate' | 'basic';
    status?: 'pending' | 'evaluating' | 'completed';
  };
}

const statusStyles = {
  pending: 'border-border',
  evaluating: 'border-status-degraded animate-pulse',
  completed: 'border-status-healthy',
};

const typeStyles = {
  top: 'bg-destructive/20',
  intermediate: 'bg-primary/20',
  basic: 'bg-muted',
};

function FTANode({ data }: FTANodeProps) {
  return (
    <div
      className={cn(
        'min-w-[120px] rounded-lg border-2 px-4 py-2 text-center',
        statusStyles[data.status ?? 'pending'],
        typeStyles[data.type],
      )}
    >
      {data.type !== 'top' && (
        <Handle type="target" position={Position.Top} className="!bg-primary" />
      )}
      <div className="text-xs uppercase text-muted-foreground">{data.type}</div>
      <div className="mt-1 text-sm font-medium">{data.label}</div>
      {data.type !== 'basic' && (
        <Handle type="source" position={Position.Bottom} className="!bg-primary" />
      )}
    </div>
  );
}

export default memo(FTANode);
