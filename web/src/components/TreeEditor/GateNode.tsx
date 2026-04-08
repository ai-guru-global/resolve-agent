import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface GateNodeProps {
  data: {
    label: string;
    gateType: 'AND' | 'OR' | 'VOTING';
    kValue?: number;
  };
}

const gateSymbols: Record<string, string> = {
  AND: '&',
  OR: '|',
};

function GateNode({ data }: GateNodeProps) {
  const symbol = data.gateType === 'VOTING'
    ? `${data.kValue ?? 'k'}/${data.kValue ?? 'n'}`
    : (gateSymbols[data.gateType] ?? data.gateType);

  return (
    <div className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 border-primary bg-primary/20">
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <div className="text-lg font-bold">{symbol}</div>
      <div className="text-[10px] text-muted-foreground">{data.gateType}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
}

export default memo(GateNode);
