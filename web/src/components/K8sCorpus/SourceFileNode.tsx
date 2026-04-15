import { memo, type FC } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';

interface SourceFileNodeData {
  label: string;
  filePath: string;
  package: string;
  component: string;
  functionCount: number;
  linesOfCode: number;
  importance: 'critical' | 'high' | 'medium';
  description: string;
  chainType?: 'troubleshooting' | 'initialization';
}

const COMPONENT_STYLES: Record<string, { border: string; bg: string; badge: string }> = {
  kubelet: {
    border: 'border-blue-500/60',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  },
  'controller-manager': {
    border: 'border-emerald-500/60',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  },
  kubeadm: {
    border: 'border-purple-500/60',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  },
  'api-server': {
    border: 'border-orange-500/60',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  },
  api: {
    border: 'border-slate-400/60',
    bg: 'bg-slate-50 dark:bg-slate-900/30',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
  },
};

const IMPORTANCE_INDICATOR: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-slate-400',
};

// Shape variation: troubleshooting chains use rounded corners, init chains use sharper
const CHAIN_TYPE_SHAPE: Record<string, string> = {
  troubleshooting: 'rounded-lg',
  initialization: 'rounded-md',
};

const SourceFileNode: FC<NodeProps> = memo(({ data, selected }) => {
  const d = data as unknown as SourceFileNodeData;
  const styles = COMPONENT_STYLES[d.component] ?? COMPONENT_STYLES.api!;
  const indicatorColor = IMPORTANCE_INDICATOR[d.importance] ?? 'bg-slate-400';
  const shapeClass = CHAIN_TYPE_SHAPE[d.chainType ?? 'troubleshooting'] ?? 'rounded-lg';
  const isInit = d.chainType === 'initialization';

  return (
    <div
      className={cn(
        'relative border-2 pl-5 pr-4 py-3 shadow-sm min-w-[210px] max-w-[260px] transition-shadow cursor-pointer',
        shapeClass,
        styles.border,
        styles.bg,
        selected && 'ring-2 ring-primary shadow-md',
        isInit && 'border-l-4',
      )}
    >
      {/* Importance indicator bar */}
      <div className={cn(
        'absolute left-0 top-2 bottom-2 rounded-full',
        indicatorColor,
        isInit ? 'w-1.5' : 'w-1',
      )} />

      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />

      {/* Component badge */}
      <span className={cn('inline-block rounded px-1.5 py-0.5 text-[10px] font-medium mb-1.5', styles.badge)}>
        {d.component}
      </span>

      {/* File name */}
      <div className="text-sm font-semibold truncate">{d.label}</div>

      {/* File path */}
      <div className="text-[10px] font-mono text-muted-foreground truncate mt-0.5" title={d.filePath}>
        {d.filePath}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{d.functionCount}</span> 函数
        </span>
        <span>
          <span className="font-medium text-foreground">{d.linesOfCode.toLocaleString()}</span> 行
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  );
});
SourceFileNode.displayName = 'SourceFileNode';

export default SourceFileNode;
