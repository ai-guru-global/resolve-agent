import { memo, type FC } from 'react';
import {
  BaseEdge,
  getStraightPath,
  type EdgeProps,
  EdgeLabelRenderer,
} from '@xyflow/react';
import { cn } from '@/lib/utils';

interface TrafficEdgeData {
  requestCount: number;
  errorCount: number;
  avgLatencyMs: number;
  protocols: string[];
  methods: string[];
}

const TrafficEdge: FC<EdgeProps> = memo(
  ({ id, sourceX, sourceY, targetX, targetY, data, selected }) => {
    const d = data as unknown as TrafficEdgeData;
    const [edgePath, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });

    const hasErrors = d?.errorCount > 0;
    const strokeColor = hasErrors ? '#ef4444' : '#64748b';
    const strokeWidth = Math.min(1 + (d?.requestCount ?? 0) / 50, 5);

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            stroke: selected ? '#3b82f6' : strokeColor,
            strokeWidth,
            strokeDasharray: hasErrors ? '5 3' : undefined,
          }}
          markerEnd="url(#traffic-arrow)"
        />
        <EdgeLabelRenderer>
          <div
            className={cn(
              'absolute pointer-events-all rounded px-1.5 py-0.5 text-[10px] font-medium shadow-sm',
              hasErrors
                ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300',
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {d?.requestCount ?? 0} req
            {d?.avgLatencyMs ? ` · ${d.avgLatencyMs.toFixed(0)}ms` : ''}
          </div>
        </EdgeLabelRenderer>
      </>
    );
  },
);
TrafficEdge.displayName = 'TrafficEdge';

export default TrafficEdge;
