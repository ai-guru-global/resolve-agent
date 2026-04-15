import { type DragEvent, useCallback } from 'react';
import {
  Save,
  LayoutGrid,
  Undo2,
  Redo2,
  Download,
  Plus,
  CircleDot,
  GitFork,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

// ─── Drag item definitions ───

interface DragItem {
  nodeType: 'ftaNode' | 'gateNode';
  label: string;
  icon: React.ReactNode;
  extra: Record<string, unknown>;
}

const EVENT_ITEMS: DragItem[] = [
  {
    nodeType: 'ftaNode',
    label: 'Top',
    icon: <CircleDot className="h-3.5 w-3.5 text-destructive" />,
    extra: { type: 'top', status: 'pending' },
  },
  {
    nodeType: 'ftaNode',
    label: '中间事件',
    icon: <CircleDot className="h-3.5 w-3.5 text-primary" />,
    extra: { type: 'intermediate', status: 'pending' },
  },
  {
    nodeType: 'ftaNode',
    label: '基本事件',
    icon: <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />,
    extra: { type: 'basic', status: 'pending' },
  },
];

const GATE_ITEMS: DragItem[] = [
  {
    nodeType: 'gateNode',
    label: 'AND',
    icon: <GitFork className="h-3.5 w-3.5" />,
    extra: { gateType: 'AND' },
  },
  {
    nodeType: 'gateNode',
    label: 'OR',
    icon: <GitFork className="h-3.5 w-3.5 text-blue-500" />,
    extra: { gateType: 'OR' },
  },
  {
    nodeType: 'gateNode',
    label: 'VOTING',
    icon: <GitFork className="h-3.5 w-3.5 text-amber-500" />,
    extra: { gateType: 'VOTING', kValue: 2, nValue: 3 },
  },
];

// ─── Draggable chip ───

function DraggableItem({ item }: { item: DragItem }) {
  const onDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData(
        'application/reactflow',
        JSON.stringify({ nodeType: item.nodeType, ...item.extra, label: item.label }),
      );
      e.dataTransfer.effectAllowed = 'move';
    },
    [item],
  );

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex cursor-grab items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-accent active:cursor-grabbing"
    >
      {item.icon}
      {item.label}
    </div>
  );
}

// ─── Toolbar ───

interface EditorToolbarProps {
  onSave: () => void;
  onAutoLayout: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExportYaml: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  dirty: boolean;
}

export default function EditorToolbar({
  onSave,
  onAutoLayout,
  onUndo,
  onRedo,
  onExportYaml,
  canUndo,
  canRedo,
  saving,
  dirty,
}: EditorToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
        {/* Drag-to-add nodes */}
        <div className="flex items-center gap-1">
          <Plus className="mr-0.5 h-3.5 w-3.5 text-muted-foreground" />
          {EVENT_ITEMS.map((item) => (
            <DraggableItem key={item.label} item={item} />
          ))}
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <div className="flex items-center gap-1">
          {GATE_ITEMS.map((item) => (
            <DraggableItem key={item.label} item={item} />
          ))}
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onUndo} disabled={!canUndo}>
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>撤销</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onRedo} disabled={!canRedo}>
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>重做</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onAutoLayout}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>自动布局</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onExportYaml}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>导出 YAML</TooltipContent>
          </Tooltip>
        </div>

        <div className="ml-auto">
          <Button size="sm" onClick={onSave} disabled={saving || !dirty}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? '保存中...' : dirty ? '保存' : '已保存'}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
