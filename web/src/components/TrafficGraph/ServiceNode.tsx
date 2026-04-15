import { memo, type FC } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';

interface ServiceNodeData {
  label: string;
  requestCount: number;
  errorCount: number;
  avgLatencyMs: number;
  protocols: string[];
}

const ServiceNode: FC<NodeProps> = memo(({ data, selected }) => {
  const d = data as unknown as ServiceNodeData;
  const errorRate = d.requestCount > 0 ? d.errorCount / d.requestCount : 0;

  const statusColor =
    errorRate > 0.1
      ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
      : errorRate > 0.05
        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
        : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30';

  return (
    <div
      className={cn(
        'rounded-lg border-2 px-4 py-3 shadow-sm min-w-[160px] transition-shadow',
        statusColor,
        selected && 'ring-2 ring-blue-500 shadow-md',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />

      <div className="text-sm font-semibold truncate mb-1.5">{d.label}</div>
      <div className="space-y-0.5 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Requests</span>
          <span className="font-medium text-foreground">{d.requestCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Errors</span>
          <span className={cn('font-medium', d.errorCount > 0 ? 'text-red-600' : 'text-foreground')}>
            {d.errorCount}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Latency</span>
          <span className="font-medium text-foreground">{d.avgLatencyMs.toFixed(0)}ms</span>
        </div>
        {d.protocols.length > 0 && (
          <div className="flex gap-1 mt-1">
            {d.protocols.map((p) => (
              <span key={p} className="rounded bg-muted px-1 py-0.5 text-[10px]">
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  );
});
ServiceNode.displayName = 'ServiceNode';

export default ServiceNode;
