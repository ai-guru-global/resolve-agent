import { useMemo, useCallback, type FC } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Key, Link2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  tableGroups,
  getGroupColorClasses,
  type TableDef,
  type ForeignKeyDef,
} from '@/data/dbSchema';

// ─── Node Data ───

interface TableNodeData {
  tableName: string;
  displayName: string;
  groupLabel: string;
  groupColor: string;
  columnCount: number;
  pkColumns: string[];
  fkColumns: { name: string; target: string }[];
  [key: string]: unknown;
}

// ─── Color Maps ───

const groupBgColors: Record<string, string> = {
  blue: '#3b82f6',
  purple: '#a855f7',
  emerald: '#10b981',
  amber: '#f59e0b',
  cyan: '#06b6d4',
  rose: '#f43f5e',
};

// ─── Custom Node ───

const TableERNode: FC<NodeProps<Node<TableNodeData>>> = ({ data }) => {
  const bgColor = groupBgColors[data.groupColor] ?? '#3b82f6';

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm min-w-[180px] overflow-hidden">
      {/* Color Header */}
      <div
        className="px-3 py-1.5 text-[10px] font-semibold text-white"
        style={{ backgroundColor: bgColor }}
      >
        {data.groupLabel}
      </div>

      {/* Table Name */}
      <div className="px-3 py-2 border-b border-border/50">
        <p className="text-xs font-mono font-bold">{data.tableName}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{data.displayName}</p>
      </div>

      {/* Key Columns */}
      <div className="px-3 py-2 space-y-1">
        {data.pkColumns.map((pk) => (
          <div key={pk} className="flex items-center gap-1.5 text-[10px]">
            <Key className="h-2.5 w-2.5 text-amber-400" />
            <span className="font-mono">{pk}</span>
            <span className="text-muted-foreground ml-auto">PK</span>
          </div>
        ))}
        {data.fkColumns.map((fk) => (
          <div key={fk.name} className="flex items-center gap-1.5 text-[10px]">
            <Link2 className="h-2.5 w-2.5 text-blue-400" />
            <span className="font-mono">{fk.name}</span>
            <span className="text-muted-foreground ml-auto text-[9px]">&rarr; {fk.target}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-border/50 flex items-center justify-end">
        <span className="text-[9px] text-muted-foreground">{data.columnCount} 字段</span>
      </div>
    </div>
  );
};

const nodeTypes = { tableNode: TableERNode };

// ─── Layout Helpers ───

function buildNodes(): Node<TableNodeData>[] {
  const nodes: Node<TableNodeData>[] = [];

  // Layout: groups arranged in rows, tables within each group side by side
  const groupPositions: { x: number; y: number }[] = [
    { x: 0, y: 0 },      // 核心注册 (6 tables)
    { x: 0, y: 280 },     // Hook 生命周期
    { x: 500, y: 280 },   // RAG 知识库
    { x: 0, y: 530 },     // FTA 故障树
    { x: 500, y: 530 },   // 代码分析
    { x: 200, y: 780 },   // 记忆系统
  ];

  tableGroups.forEach((group, gi) => {
    const origin = groupPositions[gi]!;
    group.tables.forEach((table, ti) => {
      const pkColumns = table.columns.filter((c) => c.primaryKey).map((c) => c.name);
      const fkColumns = table.foreignKeys.map((fk) => ({
        name: fk.column,
        target: fk.referencesTable,
      }));

      // For core group (6 tables), arrange in 3 columns × 2 rows
      let x: number;
      let y: number;
      if (gi === 0) {
        const col = ti % 3;
        const row = Math.floor(ti / 3);
        x = origin.x + col * 230;
        y = origin.y + row * 220;
      } else {
        x = origin.x + ti * 230;
        y = origin.y;
      }

      nodes.push({
        id: table.name,
        type: 'tableNode',
        position: { x, y },
        data: {
          tableName: table.name,
          displayName: table.displayName,
          groupLabel: group.label,
          groupColor: group.color,
          columnCount: table.columns.length,
          pkColumns,
          fkColumns,
        },
      });
    });
  });

  return nodes;
}

function buildEdges(): Edge[] {
  const edges: Edge[] = [];
  const allFKs: { table: TableDef; fk: ForeignKeyDef; groupColor: string }[] = [];

  tableGroups.forEach((group) => {
    group.tables.forEach((table) => {
      table.foreignKeys.forEach((fk) => {
        allFKs.push({ table, fk, groupColor: group.color });
      });
    });
  });

  allFKs.forEach(({ table, fk, groupColor }) => {
    const strokeColor = groupBgColors[groupColor] ?? '#3b82f6';
    edges.push({
      id: `${table.name}-${fk.column}-${fk.referencesTable}`,
      source: table.name,
      target: fk.referencesTable,
      type: 'smoothstep',
      animated: fk.onDelete === 'CASCADE',
      label: fk.column,
      labelStyle: { fontSize: 10, fontFamily: 'monospace' },
      style: {
        stroke: strokeColor,
        strokeWidth: 1.5,
        strokeDasharray: fk.onDelete === 'SET NULL' ? '5 3' : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: strokeColor,
        width: 16,
        height: 16,
      },
    });
  });

  return edges;
}

// ─── Legend ───

function Legend() {
  return (
    <Card className="absolute top-3 right-3 z-10 shadow-md">
      <CardContent className="p-3 space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
          表分组
        </p>
        {tableGroups.map((group) => {
          const colors = getGroupColorClasses(group.color);
          return (
            <div key={group.label} className="flex items-center gap-2 text-[10px]">
              <span
                className={cn(
                  'inline-block h-2.5 w-2.5 rounded-sm border',
                  colors.bg,
                  colors.border,
                )}
              />
              <span className="text-muted-foreground">
                {group.label}
                <span className="ml-1 text-[9px] opacity-60">({group.tables.length})</span>
              </span>
            </div>
          );
        })}
        <div className="pt-1.5 border-t border-border/30 space-y-1">
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <span className="inline-block w-5 h-px bg-primary" />
            CASCADE
          </div>
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <span className="inline-block w-5 h-px border-b border-dashed border-primary" />
            SET NULL
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───

export default function RelationshipTab() {
  const initialNodes = useMemo(() => buildNodes(), []);
  const initialEdges = useMemo(() => buildEdges(), []);

  const minimapNodeColor = useCallback(
    (node: Node) => {
      const data = node.data as TableNodeData;
      return groupBgColors[data.groupColor] ?? '#3b82f6';
    },
    [],
  );

  return (
    <div className="relative rounded-lg border border-border bg-card" style={{ height: 650 }}>
      <Legend />
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
        <Controls
          showInteractive={false}
          className="!bg-card !border-border !shadow-sm"
        />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor="rgba(0,0,0,0.1)"
          className="!bg-card !border-border"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
