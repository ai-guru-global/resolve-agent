import { memo, useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GateNodeData {
  label: string;
  gateType: 'AND' | 'OR' | 'VOTING' | 'INHIBIT' | 'PRIORITY_AND';
  kValue?: number;
  nValue?: number;
  editable?: boolean;
}

interface GateNodeProps {
  id: string;
  data: GateNodeData;
  selected?: boolean;
}

const gateSymbols: Record<string, string> = {
  AND: '&',
  OR: '≥1',
  INHIBIT: '⊘',
  PRIORITY_AND: '&›',
};

const gateColors: Record<string, string> = {
  AND: 'border-primary bg-primary/20',
  OR: 'border-blue-500 bg-blue-500/20',
  VOTING: 'border-amber-500 bg-amber-500/20',
  INHIBIT: 'border-orange-500 bg-orange-500/20',
  PRIORITY_AND: 'border-purple-500 bg-purple-500/20',
};

function GateNode({ id, data, selected }: GateNodeProps) {
  const [hovered, setHovered] = useState(false);
  const { deleteElements } = useReactFlow();
  const editable = data.editable !== false;

  const symbol =
    data.gateType === 'VOTING'
      ? `${data.kValue ?? 'k'}/${data.nValue ?? 'n'}`
      : gateSymbols[data.gateType] ?? data.gateType;

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteElements({ nodes: [{ id }] });
    },
    [id, deleteElements],
  );

  return (
    <div
      className={cn(
        'relative flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 transition-shadow',
        gateColors[data.gateType] ?? 'border-primary bg-primary/20',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {editable && hovered && (
        <button
          onClick={handleDelete}
          className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <div className="text-lg font-bold">{symbol}</div>
      <div className="text-[10px] text-muted-foreground">{data.gateType}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
}

export default memo(GateNode);
