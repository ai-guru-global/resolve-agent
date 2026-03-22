import { memo } from 'react';

interface GateNodeProps {
  data: {
    label: string;
    gateType: 'AND' | 'OR' | 'VOTING';
    kValue?: number;
  };
}

function GateNode({ data }: GateNodeProps) {
  const gateSymbol = {
    AND: '&',
    OR: '|',
    VOTING: `${data.kValue || 'k'}/${data.kValue || 'n'}`,
  };

  return (
    <div className="w-16 h-16 rounded-lg bg-purple-900/30 border-2 border-purple-500 flex flex-col items-center justify-center">
      <div className="text-lg font-bold">{gateSymbol[data.gateType]}</div>
      <div className="text-[10px] text-gray-400">{data.gateType}</div>
    </div>
  );
}

export default memo(GateNode);
