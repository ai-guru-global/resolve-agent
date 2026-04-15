import { useCallback, useEffect, useState } from 'react';
import type { Node } from '@xyflow/react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Types ───

interface EventNodeData {
  label: string;
  type: 'top' | 'intermediate' | 'basic';
  status?: string;
  evaluator?: string;
  description?: string;
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

interface GateNodeData {
  label: string;
  gateType: 'AND' | 'OR' | 'VOTING' | 'INHIBIT' | 'PRIORITY_AND';
  kValue?: number;
  nValue?: number;
  [key: string]: unknown;
}

type SelectedNode = Node;

interface NodePropertyPanelProps {
  node: SelectedNode | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
}

// ─── Evaluator helpers ───

const EVALUATOR_TYPES = [
  { value: '', label: '无' },
  { value: 'skill', label: 'Skill (技能)' },
  { value: 'rag', label: 'RAG (知识库)' },
  { value: 'llm', label: 'LLM (大模型)' },
  { value: 'static', label: 'Static (静态值)' },
  { value: 'context', label: 'Context (上下文)' },
];

function parseEvaluator(evaluator?: string): { type: string; target: string } {
  if (!evaluator) return { type: '', target: '' };
  const idx = evaluator.indexOf(':');
  if (idx === -1) return { type: evaluator, target: '' };
  return { type: evaluator.slice(0, idx), target: evaluator.slice(idx + 1) };
}

// ─── Event Property Form ───

function EventPropertyForm({
  node,
  onUpdate,
}: {
  node: Node<EventNodeData>;
  onUpdate: NodePropertyPanelProps['onUpdate'];
}) {
  const d = node.data;
  const [label, setLabel] = useState(d.label);
  const [desc, setDesc] = useState(d.description ?? '');
  const [eventType, setEventType] = useState<string>(d.type);
  const evl = parseEvaluator(d.evaluator);
  const [evalType, setEvalType] = useState(evl.type);
  const [evalTarget, setEvalTarget] = useState(evl.target);

  // Reset when node changes
  useEffect(() => {
    setLabel(d.label);
    setDesc(d.description ?? '');
    setEventType(d.type);
    const e = parseEvaluator(d.evaluator);
    setEvalType(e.type);
    setEvalTarget(e.target);
  }, [node.id, d.label, d.description, d.type, d.evaluator]);

  const handleSave = useCallback(() => {
    const evaluator = evalType ? (evalTarget ? `${evalType}:${evalTarget}` : evalType) : '';
    onUpdate(node.id, {
      ...d,
      label,
      description: desc,
      type: eventType,
      evaluator: evaluator || undefined,
    });
  }, [node.id, d, label, desc, eventType, evalType, evalTarget, onUpdate]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>节点名称</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>描述</Label>
        <Textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          placeholder="可选：描述该事件节点的含义"
        />
      </div>

      <div className="space-y-2">
        <Label>事件类型</Label>
        <Select value={eventType} onValueChange={(v) => setEventType(v as EventNodeData['type'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="top">Top (顶事件)</SelectItem>
            <SelectItem value="intermediate">Intermediate (中间事件)</SelectItem>
            <SelectItem value="basic">Basic (基本事件)</SelectItem>
            <SelectItem value="undeveloped">Undeveloped (未展开)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(eventType === 'basic' || eventType === 'undeveloped') && (
        <>
          <div className="space-y-2">
            <Label>评估器类型</Label>
            <Select value={evalType} onValueChange={setEvalType}>
              <SelectTrigger>
                <SelectValue placeholder="选择评估器" />
              </SelectTrigger>
              <SelectContent>
                {EVALUATOR_TYPES.map((t) => (
                  <SelectItem key={t.value || '__none'} value={t.value || '__none'}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {evalType && evalType !== '__none' && (
            <div className="space-y-2">
              <Label>评估器目标</Label>
              <Input
                value={evalTarget}
                onChange={(e) => setEvalTarget(e.target.value)}
                placeholder={
                  evalType === 'skill'
                    ? 'e.g. dns-check'
                    : evalType === 'rag'
                      ? 'e.g. runbooks'
                      : evalType === 'llm'
                        ? 'e.g. classify'
                        : 'target'
                }
              />
            </div>
          )}
        </>
      )}

      <Button onClick={handleSave} className="w-full">
        应用更改
      </Button>
    </div>
  );
}

// ─── Gate Property Form ───

function GatePropertyForm({
  node,
  onUpdate,
}: {
  node: Node<GateNodeData>;
  onUpdate: NodePropertyPanelProps['onUpdate'];
}) {
  const d = node.data;
  const [label, setLabel] = useState(d.label);
  const [gateType, setGateType] = useState(d.gateType);
  const [kValue, setKValue] = useState(d.kValue ?? 2);
  const [nValue, setNValue] = useState(d.nValue ?? 3);

  useEffect(() => {
    setLabel(d.label);
    setGateType(d.gateType);
    setKValue(d.kValue ?? 2);
    setNValue(d.nValue ?? 3);
  }, [node.id, d.label, d.gateType, d.kValue, d.nValue]);

  const handleSave = useCallback(() => {
    onUpdate(node.id, {
      ...d,
      label,
      gateType,
      ...(gateType === 'VOTING' ? { kValue, nValue } : {}),
    });
  }, [node.id, d, label, gateType, kValue, nValue, onUpdate]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>门名称</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>门类型</Label>
        <Select value={gateType} onValueChange={(v) => setGateType(v as GateNodeData['gateType'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">AND (与门)</SelectItem>
            <SelectItem value="OR">OR (或门)</SelectItem>
            <SelectItem value="VOTING">VOTING (表决门)</SelectItem>
            <SelectItem value="INHIBIT">INHIBIT (禁止门)</SelectItem>
            <SelectItem value="PRIORITY_AND">PRIORITY_AND (顺序与门)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {gateType === 'VOTING' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>k (最少满足)</Label>
            <Input
              type="number"
              min={1}
              value={kValue}
              onChange={(e) => setKValue(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>n (总输入数)</Label>
            <Input
              type="number"
              min={1}
              value={nValue}
              onChange={(e) => setNValue(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      <Button onClick={handleSave} className="w-full">
        应用更改
      </Button>
    </div>
  );
}

// ─── Main Panel ───

export default function NodePropertyPanel({ node, open, onClose, onUpdate }: NodePropertyPanelProps) {
  const isGate = node?.type === 'gateNode';
  const title = isGate ? '编辑门节点' : '编辑事件节点';

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[340px] sm:max-w-[340px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {isGate ? '配置门的逻辑类型和参数' : '配置事件节点的属性和评估器'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {node && isGate ? (
            <GatePropertyForm node={node as Node<GateNodeData>} onUpdate={onUpdate} />
          ) : node ? (
            <EventPropertyForm node={node as Node<EventNodeData>} onUpdate={onUpdate} />
          ) : null}
        </div>

        {node && (
          <div className="mt-6 rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              节点 ID: <span className="font-mono">{node.id}</span>
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
