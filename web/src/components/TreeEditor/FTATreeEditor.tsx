import {
  useCallback,
  useRef,
  useState,
  useMemo,
  type DragEvent,
} from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type ReactFlowInstance,
  MarkerType,
} from '@xyflow/react';
import FTANode from './FTANode';
import GateNode from './GateNode';
import EditorToolbar from './EditorToolbar';
import NodePropertyPanel from './NodePropertyPanel';
import type { FaultTree, FTAEvent, FTAGate } from '@/types';

// ─── Constants ───

const NODE_TYPES = { ftaNode: FTANode, gateNode: GateNode };
const ROW_HEIGHT = 180;
const COL_WIDTH = 200;

// ─── Undo / Redo ───

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

function useHistory(_initialNodes: Node[], _initialEdges: Edge[]) {
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  const push = useCallback((nodes: Node[], edges: Edge[]) => {
    setPast((p) => [...p.slice(-30), { nodes, edges }]);
    setFuture([]);
  }, []);

  const undo = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) => {
      if (past.length === 0) return null;
      const prev = past[past.length - 1];
      setPast((p) => p.slice(0, -1));
      setFuture((f) => [...f, { nodes: currentNodes, edges: currentEdges }]);
      return prev;
    },
    [past],
  );

  const redo = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) => {
      if (future.length === 0) return null;
      const next = future[future.length - 1];
      setFuture((f) => f.slice(0, -1));
      setPast((p) => [...p, { nodes: currentNodes, edges: currentEdges }]);
      return next;
    },
    [future],
  );

  return { push, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}

// ─── FaultTree <-> ReactFlow conversion ───

export function faultTreeToFlow(tree: FaultTree): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const gateByOutput = new Map(tree.gates.map((g) => [g.output_id, g]));

  // BFS for depth
  const eventDepth = new Map<string, number>();
  const queue: { id: string; depth: number }[] = [{ id: tree.top_event_id, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    eventDepth.set(id, depth);
    const gate = gateByOutput.get(id);
    if (gate) {
      for (const inputId of gate.input_ids) {
        queue.push({ id: inputId, depth: depth + 1 });
      }
    }
  }

  const depthGroups = new Map<number, string[]>();
  for (const [id, depth] of eventDepth) {
    if (!depthGroups.has(depth)) depthGroups.set(depth, []);
    depthGroups.get(depth)!.push(id);
  }
  const eventColumn = new Map<string, number>();
  for (const [, ids] of depthGroups) {
    ids.forEach((id, idx) => eventColumn.set(id, idx));
  }

  for (const event of tree.events) {
    const depth = eventDepth.get(event.id) ?? 0;
    const col = eventColumn.get(event.id) ?? 0;
    const siblings = depthGroups.get(depth) ?? [event.id];
    const totalWidth = siblings.length * COL_WIDTH;
    const startX = -totalWidth / 2;

    nodes.push({
      id: event.id,
      type: 'ftaNode',
      position: {
        x: startX + col * COL_WIDTH + COL_WIDTH / 2 - 60,
        y: depth * ROW_HEIGHT,
      },
      data: {
        label: event.name,
        type:
          event.type === 'top'
            ? 'top'
            : event.type === 'basic' || event.type === 'undeveloped'
              ? 'basic'
              : 'intermediate',
        status: 'pending',
        evaluator: event.evaluator || undefined,
        description: event.description || undefined,
        editable: true,
      },
    });
  }

  for (const gate of tree.gates) {
    const outputDepth = eventDepth.get(gate.output_id) ?? 0;
    const inputDepths = gate.input_ids.map((id) => eventDepth.get(id) ?? 0);
    const avgInputCol =
      gate.input_ids.reduce((sum, id) => sum + (eventColumn.get(id) ?? 0), 0) /
      gate.input_ids.length;
    const avgDepth = (outputDepth + Math.max(...inputDepths)) / 2;
    const siblings = depthGroups.get(outputDepth) ?? [];
    const totalWidth = Math.max(siblings.length, gate.input_ids.length) * COL_WIDTH;
    const startX = -totalWidth / 2;

    nodes.push({
      id: gate.id,
      type: 'gateNode',
      position: {
        x: startX + avgInputCol * COL_WIDTH + COL_WIDTH / 2 - 32,
        y: avgDepth * ROW_HEIGHT,
      },
      data: {
        label: gate.name,
        gateType: gate.type,
        kValue: gate.k_value,
        editable: true,
      },
    });

    edges.push({
      id: `e-${gate.output_id}-${gate.id}`,
      source: gate.output_id,
      target: gate.id,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    });

    for (const inputId of gate.input_ids) {
      edges.push({
        id: `e-${gate.id}-${inputId}`,
        source: gate.id,
        target: inputId,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
      });
    }
  }

  return { nodes, edges };
}

export function flowToFaultTree(
  nodes: Node[],
  edges: Edge[],
  treeId: string,
  treeName: string,
): FaultTree {
  const events: FTAEvent[] = [];
  const gates: FTAGate[] = [];

  const eventNodes = nodes.filter((n) => n.type === 'ftaNode');
  const gateNodes = nodes.filter((n) => n.type === 'gateNode');

  // Find top event: ftaNode with type=top, or the one with no incoming edges among ftaNodes
  let topEventId = '';
  for (const n of eventNodes) {
    if ((n.data as Record<string, unknown>).type === 'top') {
      topEventId = n.id;
      break;
    }
  }
  if (!topEventId && eventNodes.length > 0) {
    const hasIncoming = new Set(edges.map((e) => e.target));
    const roots = eventNodes.filter((n) => !hasIncoming.has(n.id));
    topEventId = roots[0]?.id ?? eventNodes[0]?.id ?? '';
  }

  for (const n of eventNodes) {
    const d = n.data as Record<string, unknown>;
    let eventType = String(d.type ?? 'basic');
    if (n.id === topEventId) eventType = 'top';
    events.push({
      id: n.id,
      name: String(d.label ?? ''),
      description: String(d.description ?? ''),
      type: eventType as FTAEvent['type'],
      evaluator: String(d.evaluator ?? ''),
      parameters: (d.parameters as Record<string, unknown>) ?? {},
    });
  }

  for (const n of gateNodes) {
    const d = n.data as Record<string, unknown>;
    // output: edge where this gate is the target (from a parent event)
    const outputEdge = edges.find((e) => e.target === n.id && eventNodes.some((en) => en.id === e.source));
    // inputs: edges where this gate is the source (to child events)
    const inputEdges = edges.filter((e) => e.source === n.id);

    gates.push({
      id: n.id,
      name: String(d.label ?? d.gateType ?? ''),
      type: String(d.gateType ?? 'OR') as FTAGate['type'],
      output_id: outputEdge?.source ?? '',
      input_ids: inputEdges.map((e) => e.target),
      k_value: d.kValue as number | undefined,
    });
  }

  return { id: treeId, name: treeName, top_event_id: topEventId, events, gates };
}

// ─── YAML export helper ───

function faultTreeToYaml(tree: FaultTree): string {
  const lines: string[] = ['tree:', `  id: ${tree.id}`, `  name: "${tree.name}"`, `  top_event: ${tree.top_event_id}`, '  events:'];
  for (const e of tree.events) {
    lines.push(`    - id: ${e.id}`);
    lines.push(`      name: "${e.name}"`);
    if (e.description) lines.push(`      description: "${e.description}"`);
    lines.push(`      type: ${e.type}`);
    if (e.evaluator) {
      const [evalType, evalTarget] = e.evaluator.split(':');
      lines.push(`      evaluator: ${evalType}`);
      if (evalTarget) {
        if (evalType === 'skill') lines.push(`      skill_name: ${evalTarget}`);
        else if (evalType === 'rag') {
          lines.push(`      collection: ${evalTarget}`);
        } else lines.push(`      target: ${evalTarget}`);
      }
    }
    // Gate reference
    const gate = tree.gates.find((g) => g.output_id === e.id);
    if (gate) {
      lines.push(`      gate: ${gate.type}`);
      lines.push(`      inputs: [${gate.input_ids.join(', ')}]`);
      if (gate.type === 'VOTING' && gate.k_value != null) {
        lines.push(`      k_value: ${gate.k_value}`);
      }
    }
  }
  return lines.join('\n');
}

// ─── Auto-layout (reuse BFS approach from WorkflowDesigner) ───

function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  // Find root (no incoming edge)
  const hasIncoming = new Set(edges.map((e) => e.target));
  const roots = nodes.filter((n) => !hasIncoming.has(n.id));
  const root = roots[0] ?? nodes[0];
  if (!root) return nodes;

  // BFS
  const depth = new Map<string, number>();
  const queue: { id: string; d: number }[] = [{ id: root.id, d: 0 }];
  const visited = new Set<string>();
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
  }

  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    depth.set(id, d);
    for (const child of adj.get(id) ?? []) {
      queue.push({ id: child, d: d + 1 });
    }
  }

  // Also include unvisited nodes
  for (const n of nodes) {
    if (!depth.has(n.id)) depth.set(n.id, 0);
  }

  const depthGroups = new Map<number, string[]>();
  for (const [id, d] of depth) {
    if (!depthGroups.has(d)) depthGroups.set(d, []);
    depthGroups.get(d)!.push(id);
  }

  return nodes.map((n) => {
    const d = depth.get(n.id) ?? 0;
    const siblings = depthGroups.get(d) ?? [n.id];
    const col = siblings.indexOf(n.id);
    const totalWidth = siblings.length * COL_WIDTH;
    const startX = -totalWidth / 2;
    const isGate = n.type === 'gateNode';

    return {
      ...n,
      position: {
        x: startX + col * COL_WIDTH + COL_WIDTH / 2 - (isGate ? 32 : 60),
        y: d * ROW_HEIGHT,
      },
    };
  });
}

// ─── ID generator ───

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

// ─── Main component ───

interface FTATreeEditorProps {
  faultTree: FaultTree | null;
  onSave: (tree: FaultTree) => void;
  saving?: boolean;
}

export default function FTATreeEditor({ faultTree, onSave, saving = false }: FTATreeEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const initial = useMemo(() => {
    if (!faultTree) return { nodes: [] as Node[], edges: [] as Edge[] };
    return faultTreeToFlow(faultTree);
  }, [faultTree]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [dirty, setDirty] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const history = useHistory(initial.nodes, initial.edges);

  // Track dirtiness
  const markDirty = useCallback(() => {
    setDirty(true);
  }, []);

  // ─── Connection handling ───
  const onConnect = useCallback(
    (params: Connection) => {
      history.push(nodes, edges);
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
          },
          eds,
        ),
      );
      markDirty();
    },
    [nodes, edges, history, setEdges, markDirty],
  );

  // Connection validation: only ftaNode<->gateNode
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return false;
      return sourceNode.type !== targetNode.type;
    },
    [nodes],
  );

  // ─── Drop handler (from toolbar drag) ───
  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/reactflow');
      if (!raw) return;

      const data = JSON.parse(raw);
      const { nodeType, label, ...rest } = data;

      if (!rfInstance || !reactFlowWrapper.current) return;
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = rfInstance.screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });

      history.push(nodes, edges);

      const newNode: Node = {
        id: nextId(nodeType === 'gateNode' ? 'gate' : 'evt'),
        type: nodeType,
        position,
        data: { ...rest, label, editable: true },
      };

      setNodes((nds) => [...nds, newNode]);
      markDirty();
    },
    [rfInstance, nodes, edges, history, setNodes, markDirty],
  );

  // ─── Node selection -> property panel ───
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
      setPanelOpen(true);
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setPanelOpen(false);
  }, []);

  // ─── Property update ───
  const handleNodeUpdate = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      history.push(nodes, edges);
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
      );
      markDirty();
    },
    [nodes, edges, history, setNodes, markDirty],
  );

  // ─── Deletion tracking ───
  const handleNodesDelete = useCallback(() => {
    history.push(nodes, edges);
    markDirty();
  }, [nodes, edges, history, markDirty]);

  const handleEdgesDelete = useCallback(() => {
    history.push(nodes, edges);
    markDirty();
  }, [nodes, edges, history, markDirty]);

  // ─── Toolbar actions ───
  const handleSave = useCallback(() => {
    const tree = flowToFaultTree(
      nodes,
      edges,
      faultTree?.id ?? 'new-tree',
      faultTree?.name ?? '新故障树',
    );
    onSave(tree);
    setDirty(false);
  }, [nodes, edges, faultTree, onSave]);

  const handleAutoLayout = useCallback(() => {
    history.push(nodes, edges);
    const laid = autoLayout(nodes, edges);
    setNodes(laid);
    markDirty();
    setTimeout(() => rfInstance?.fitView({ padding: 0.2 }), 50);
  }, [nodes, edges, history, setNodes, markDirty, rfInstance]);

  const handleUndo = useCallback(() => {
    const snapshot = history.undo(nodes, edges);
    if (snapshot) {
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
    }
  }, [nodes, edges, history, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    const snapshot = history.redo(nodes, edges);
    if (snapshot) {
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
    }
  }, [nodes, edges, history, setNodes, setEdges]);

  const handleExportYaml = useCallback(() => {
    const tree = flowToFaultTree(
      nodes,
      edges,
      faultTree?.id ?? 'new-tree',
      faultTree?.name ?? '新故障树',
    );
    const yaml = faultTreeToYaml(tree);
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tree.id}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, faultTree]);

  return (
    <div className="flex h-full flex-col gap-3">
      <EditorToolbar
        onSave={handleSave}
        onAutoLayout={handleAutoLayout}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExportYaml={handleExportYaml}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        saving={saving}
        dirty={dirty}
      />

      <div ref={reactFlowWrapper} className="flex-1 rounded-lg border bg-background">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onInit={setRfInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodesDelete={handleNodesDelete}
          onEdgesDelete={handleEdgesDelete}
          nodeTypes={NODE_TYPES}
          fitView
          deleteKeyCode="Delete"
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
          }}
        >
          <Background />
          <Controls />
          <MiniMap
            nodeStrokeWidth={3}
            className="!bg-card !border-border"
          />
        </ReactFlow>
      </div>

      <NodePropertyPanel
        node={selectedNode}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onUpdate={handleNodeUpdate}
      />
    </div>
  );
}
