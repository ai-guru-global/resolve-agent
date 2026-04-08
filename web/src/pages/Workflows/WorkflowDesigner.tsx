import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitBranch } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import FTANode from '@/components/TreeEditor/FTANode';
import GateNode from '@/components/TreeEditor/GateNode';
import { useWorkflows, useWorkflowFaultTree } from '@/hooks/useWorkflows';
import type { FaultTree } from '@/types';

const nodeTypes = {
  ftaNode: FTANode,
  gateNode: GateNode,
};

function buildFlowData(tree: FaultTree): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const gateByOutput = new Map(tree.gates.map((g) => [g.output_id, g]));

  // BFS to determine depth of each event
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

  // Group by depth for column layout
  const depthGroups = new Map<number, string[]>();
  for (const [id, depth] of eventDepth) {
    if (!depthGroups.has(depth)) depthGroups.set(depth, []);
    depthGroups.get(depth)!.push(id);
  }

  const eventColumn = new Map<string, number>();
  for (const [, ids] of depthGroups) {
    ids.forEach((id, idx) => eventColumn.set(id, idx));
  }

  const ROW_HEIGHT = 180;
  const COL_WIDTH = 200;

  // Event nodes
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
        type: event.type === 'top' ? 'top' : event.type === 'basic' || event.type === 'undeveloped' ? 'basic' : 'intermediate',
        status: 'completed',
      },
    });
  }

  // Gate nodes + edges
  for (const gate of tree.gates) {
    const outputDepth = eventDepth.get(gate.output_id) ?? 0;
    const inputDepths = gate.input_ids.map((id) => eventDepth.get(id) ?? 0);
    const avgInputCol = gate.input_ids.reduce((sum, id) => sum + (eventColumn.get(id) ?? 0), 0) / gate.input_ids.length;
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
        gateType: gate.type === 'AND' || gate.type === 'OR' || gate.type === 'VOTING' ? gate.type : 'OR',
        kValue: gate.k_value,
      },
    });

    edges.push({
      id: `e-${gate.output_id}-${gate.id}`,
      source: gate.output_id,
      target: gate.id,
      type: 'smoothstep',
    });

    for (const inputId of gate.input_ids) {
      edges.push({
        id: `e-${gate.id}-${inputId}`,
        source: gate.id,
        target: inputId,
        type: 'smoothstep',
      });
    }
  }

  return { nodes, edges };
}

export default function WorkflowDesigner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const workflowId = searchParams.get('id') ?? 'wf-001';

  const { data: workflowsData, isLoading: workflowsLoading } = useWorkflows();
  const { data: faultTree, isLoading: treeLoading } = useWorkflowFaultTree(workflowId);

  const { nodes, edges } = useMemo(() => {
    if (!faultTree) return { nodes: [], edges: [] };
    return buildFlowData(faultTree);
  }, [faultTree]);

  const handleWorkflowChange = (value: string) => {
    setSearchParams({ id: value });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="工作流设计器"
        breadcrumbs={[
          { label: '故障分析工作流', href: '/workflows' },
          { label: '设计器' },
        ]}
        actions={
          <div className="w-64">
            <Select value={workflowId} onValueChange={handleWorkflowChange} disabled={workflowsLoading}>
              <SelectTrigger>
                <SelectValue placeholder="选择工作流" />
              </SelectTrigger>
              <SelectContent>
                {(workflowsData?.workflows ?? []).map((wf) => (
                  <SelectItem key={wf.id} value={wf.id}>
                    {wf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
      <Card>
        <CardContent className="p-0">
          {treeLoading ? (
            <div className="flex items-center justify-center" style={{ height: '600px' }}>
              <Skeleton className="h-8 w-32" />
            </div>
          ) : nodes.length > 0 ? (
            <div style={{ height: '600px' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
              >
                <Background />
                <Controls />
              </ReactFlow>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg m-4"
              style={{ height: '600px' }}
            >
              <div className="rounded-full bg-muted p-4 mb-4">
                <GitBranch className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">无故障树数据</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                选择一个包含故障树定义的工作流
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
