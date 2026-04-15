import { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import SourceFileNode from './SourceFileNode';
import FunctionCallEdge from './FunctionCallEdge';
import type { K8sAnalysisChain } from '@/types/k8sCorpus';

interface ChainFlowViewerProps {
  chain: K8sAnalysisChain;
  selectedFileId: string | null;
  onNodeClick: (fileId: string) => void;
  className?: string;
}

const nodeTypes = { sourceFileNode: SourceFileNode };
const edgeTypes = { functionCallEdge: FunctionCallEdge };

// Layout constants — differ per topology
const SEQUENTIAL_ROW_HEIGHT = 140;
const SEQUENTIAL_COL_WIDTH = 280;
const EVENT_DRIVEN_ROW_HEIGHT = 180;
const EVENT_DRIVEN_COL_WIDTH = 320;

/**
 * Compute node positions for a sequential-pipeline topology.
 */
function computeSequentialLayout(chain: K8sAnalysisChain): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const fileIds = chain.sourceFiles.map((f) => f.id);

  const inDegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const id of fileIds) {
    inDegree.set(id, 0);
    children.set(id, []);
  }
  for (const edge of chain.edges) {
    inDegree.set(edge.targetFileId, (inDegree.get(edge.targetFileId) ?? 0) + 1);
    children.get(edge.sourceFileId)?.push(edge.targetFileId);
  }

  const depth = new Map<string, number>();
  const queue = fileIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
  for (const id of queue) depth.set(id, 0);

  let head = 0;
  while (head < queue.length) {
    const current = queue[head++]!;
    const d = depth.get(current) ?? 0;
    for (const child of children.get(current) ?? []) {
      const existing = depth.get(child);
      if (existing === undefined || d + 1 > existing) {
        depth.set(child, d + 1);
      }
      const newIn = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, newIn);
      if (newIn === 0) queue.push(child);
    }
  }

  for (const id of fileIds) {
    if (!depth.has(id)) depth.set(id, 0);
  }

  const depthGroups = new Map<number, string[]>();
  for (const [id, d] of depth) {
    if (!depthGroups.has(d)) depthGroups.set(d, []);
    depthGroups.get(d)!.push(id);
  }

  for (const [d, ids] of depthGroups) {
    const totalWidth = (ids.length - 1) * SEQUENTIAL_COL_WIDTH;
    const startX = -totalWidth / 2;
    ids.forEach((id, i) => {
      positions.set(id, { x: startX + i * SEQUENTIAL_COL_WIDTH, y: d * SEQUENTIAL_ROW_HEIGHT });
    });
  }

  return positions;
}

/**
 * Compute node positions for an event-driven topology.
 */
function computeEventDrivenLayout(chain: K8sAnalysisChain): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const fileIds = chain.sourceFiles.map((f) => f.id);

  const inDegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const id of fileIds) {
    inDegree.set(id, 0);
    children.set(id, []);
  }
  for (const edge of chain.edges) {
    inDegree.set(edge.targetFileId, (inDegree.get(edge.targetFileId) ?? 0) + 1);
    children.get(edge.sourceFileId)?.push(edge.targetFileId);
  }

  const depth = new Map<string, number>();
  const queue = fileIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
  for (const id of queue) depth.set(id, 0);

  let head = 0;
  while (head < queue.length) {
    const current = queue[head++]!;
    const d = depth.get(current) ?? 0;
    for (const child of children.get(current) ?? []) {
      const existing = depth.get(child);
      if (existing === undefined || d + 1 > existing) {
        depth.set(child, d + 1);
      }
      const newIn = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, newIn);
      if (newIn === 0) queue.push(child);
    }
  }

  for (const id of fileIds) {
    if (!depth.has(id)) depth.set(id, 0);
  }

  const depthGroups = new Map<number, string[]>();
  for (const [id, d] of depth) {
    if (!depthGroups.has(d)) depthGroups.set(d, []);
    depthGroups.get(d)!.push(id);
  }

  for (const [d, ids] of depthGroups) {
    const totalWidth = (ids.length - 1) * EVENT_DRIVEN_COL_WIDTH;
    const startX = -totalWidth / 2;
    ids.forEach((id, i) => {
      positions.set(id, {
        x: startX + i * EVENT_DRIVEN_COL_WIDTH,
        y: d * EVENT_DRIVEN_ROW_HEIGHT,
      });
    });
  }

  return positions;
}

function computeLayout(chain: K8sAnalysisChain): Map<string, { x: number; y: number }> {
  if (chain.topology === 'sequential-pipeline') {
    return computeSequentialLayout(chain);
  }
  return computeEventDrivenLayout(chain);
}

const TOPOLOGY_THEMES = {
  'event-driven': {
    arrowColor: '#64748b',
    gridGap: 20,
  },
  'sequential-pipeline': {
    arrowColor: '#7c3aed',
    gridGap: 16,
  },
} as const;

export default function ChainFlowViewer({ chain, selectedFileId, onNodeClick, className }: ChainFlowViewerProps) {
  const layout = useMemo(() => computeLayout(chain), [chain]);
  const theme = TOPOLOGY_THEMES[chain.topology] ?? TOPOLOGY_THEMES['event-driven'];

  const buildNodes = useCallback((): Node[] =>
    chain.sourceFiles.map((file) => {
      const pos = layout.get(file.id) ?? { x: 0, y: 0 };
      return {
        id: file.id,
        type: 'sourceFileNode',
        position: pos,
        selected: file.id === selectedFileId,
        data: {
          label: file.fileName,
          filePath: file.filePath,
          package: file.package,
          component: file.component,
          functionCount: file.keyFunctions.length,
          linesOfCode: file.linesOfCode,
          importance: file.importance,
          description: file.description,
          chainType: chain.chainType,
        },
      };
    }),
  [chain, layout, selectedFileId]);

  const buildEdges = useCallback((): Edge[] =>
    chain.edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceFileId,
      target: edge.targetFileId,
      type: 'functionCallEdge',
      data: {
        label: edge.label,
        callType: edge.callType,
        chainType: chain.chainType,
      },
    })),
  [chain]);

  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges());

  // Sync nodes/edges when chain or selection changes
  useEffect(() => {
    setNodes(buildNodes());
    setEdges(buildEdges());
  }, [chain, selectedFileId, buildNodes, buildEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick(node.id);
    },
    [onNodeClick],
  );

  const arrowId = `k8s-chain-arrow-${chain.id}`;

  return (
    <div className={`h-[560px] rounded-lg border bg-background ${className ?? ''}`}>
      <ReactFlow
        key={chain.id}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-left"
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
      >
        <Controls position="top-right" />
        <MiniMap pannable zoomable className="!bg-background !border-border" />
        <Background variant={BackgroundVariant.Dots} gap={theme.gridGap} size={1} />
        <svg>
          <defs>
            <marker
              id={arrowId}
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={theme.arrowColor} />
            </marker>
          </defs>
        </svg>
      </ReactFlow>
    </div>
  );
}
