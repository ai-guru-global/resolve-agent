import { memo, type FC } from 'react';
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
  EdgeLabelRenderer,
} from '@xyflow/react';

interface FunctionCallEdgeData {
  label: string;
  callType: 'direct' | 'grpc' | 'http' | 'event' | 'watch';
}

const CALL_TYPE_COLORS: Record<string, string> = {
  direct: '#64748b',
  grpc: '#3b82f6',
  http: '#10b981',
  event: '#f59e0b',
  watch: '#f59e0b',
};

const FunctionCallEdge: FC<EdgeProps> = memo(
  ({ id, sourceX, sourceY, targetX, targetY, data, selected }) => {
    const d = data as unknown as FunctionCallEdgeData;
    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      borderRadius: 12,
    });

    const strokeColor = selected ? '#3b82f6' : (CALL_TYPE_COLORS[d?.callType] ?? '#64748b');
    const isAsync = d?.callType === 'event' || d?.callType === 'watch';

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            stroke: strokeColor,
            strokeWidth: 2,
            strokeDasharray: isAsync ? '6 4' : undefined,
          }}
          markerEnd="url(#k8s-chain-arrow)"
        />
        {d?.label && (
          <EdgeLabelRenderer>
            <div
              className="absolute pointer-events-all rounded px-1.5 py-0.5 text-[10px] font-medium shadow-sm bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300 border border-border/30"
              style={{
                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              }}
            >
              {d.label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  },
);
FunctionCallEdge.displayName = 'FunctionCallEdge';

export default FunctionCallEdge;
