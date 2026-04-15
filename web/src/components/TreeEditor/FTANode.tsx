import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FTANodeData {
  label: string;
  type: 'top' | 'intermediate' | 'basic';
  status?: 'pending' | 'evaluating' | 'completed';
  evaluator?: string;
  editable?: boolean;
}

interface FTANodeProps {
  id: string;
  data: FTANodeData;
  selected?: boolean;
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

function FTANode({ id, data, selected }: FTANodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setNodes, deleteElements } = useReactFlow();

  const editable = data.editable !== false;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commitEdit = useCallback(() => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== data.label) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, label: editValue.trim() } } : n,
        ),
      );
    } else {
      setEditValue(data.label);
    }
  }, [editValue, data.label, id, setNodes]);

  const handleDoubleClick = useCallback(() => {
    if (!editable) return;
    setEditValue(data.label);
    setIsEditing(true);
  }, [editable, data.label]);

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
        'group relative min-w-[120px] max-w-[180px] rounded-lg border-2 px-4 py-2 text-center transition-shadow',
        statusStyles[data.status ?? 'pending'],
        typeStyles[data.type],
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={handleDoubleClick}
    >
      {/* Delete button */}
      {editable && hovered && (
        <button
          onClick={handleDelete}
          className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      <Handle type="target" position={Position.Top} className="!bg-primary" />

      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {data.type}
      </div>

      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') {
              setEditValue(data.label);
              setIsEditing(false);
            }
          }}
          className="mt-1 w-full rounded border border-input bg-background px-1 py-0.5 text-center text-sm font-medium outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <div className="mt-1 text-sm font-medium leading-tight">{data.label}</div>
      )}

      {data.evaluator && (
        <div className="mt-1 truncate text-[10px] font-mono text-muted-foreground/70">
          {data.evaluator}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
}

export default memo(FTANode);
