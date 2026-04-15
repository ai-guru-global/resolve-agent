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
  chainType?: 'troubleshooting' | 'initialization';
}

const CALL_TYPE_COLORS: Record<string, string> = {
  direct: '#64748b',
  grpc: '#3b82f6',
  http: '#10b981',
  event: '#f59e0b',
  watch: '#f59e0b',
};

// Initialization chains use purple-tinted direct calls
const INIT_CALL_TYPE_COLORS: Record<string, string> = {
  direct: '#7c3aed',
  grpc: '#3b82f6',
  http: '#10b981',
  event: '#f59e0b',
  watch: '#f59e0b',
};

const FunctionCallEdge: FC<EdgeProps> = memo(
  ({ id, sourceX, sourceY, targetX, targetY, data, selected }) => {
    const d = data as unknown as FunctionCallEdgeData;
    const colorMap = d?.chainType === 'initialization' ? INIT_CALL_TYPE_COLORS : CALL_TYPE_COLORS;
    const strokeColor = selected ? '#3b82f6' : (colorMap[d?.callType] ?? '#64748b');
    const isAsync = d?.callType === 'event' || d?.callType === 'watch';
    const isInit = d?.chainType === 'initialization';

    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      borderRadius: isInit ? 8 : 12,
    });

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            stroke: strokeColor,
            strokeWidth: isInit ? 2.5 : 2,
            strokeDasharray: isAsync ? '6 4' : undefined,
          }}
          markerEnd={`url(#k8s-chain-arrow-${isInit ? 'kubeadm-init' : 'pod-not-ready'})`}
        />
        {d?.label && (
          <EdgeLabelRenderer>
            <div
              className={`absolute pointer-events-all rounded px-1.5 py-0.5 text-[10px] font-medium shadow-sm border border-border/30 ${
                isInit
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                  : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300'
              }`}
              style={{
                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              }}
            >
              {isAsync && <span className="mr-0.5 opacity-60">~</span>}
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
