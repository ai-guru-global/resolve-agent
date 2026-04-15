import { useMemo } from 'react';
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

import ServiceNode from './ServiceNode';
import TrafficEdge from './TrafficEdge';
import type { XYFlowGraphData } from '@/types';

interface TrafficGraphViewerProps {
  graphData: XYFlowGraphData | null;
  className?: string;
}

const nodeTypes = { serviceNode: ServiceNode };
const edgeTypes = { trafficEdge: TrafficEdge };

export default function TrafficGraphViewer({ graphData, className }: TrafficGraphViewerProps) {
  const initialNodes = useMemo(
    () => (graphData?.nodes ?? []) as Node[],
    [graphData],
  );
  const initialEdges = useMemo(
    () => (graphData?.edges ?? []) as Edge[],
    [graphData],
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const defaultViewport = useMemo(() => ({ x: 50, y: 50, zoom: 0.8 }), []);

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center h-[400px] text-muted-foreground ${className ?? ''}`}>
        No graph data available
      </div>
    );
  }

  return (
    <div className={`h-[500px] rounded-lg border bg-background ${className ?? ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={defaultViewport}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls position="top-right" />
        <MiniMap
          pannable
          zoomable
          className="!bg-background !border-border"
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <svg>
          <defs>
            <marker
              id="traffic-arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
            </marker>
          </defs>
        </svg>
      </ReactFlow>
    </div>
  );
}
