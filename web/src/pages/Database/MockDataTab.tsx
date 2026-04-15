import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  tableGroups,
  allTables,
  getTableGroup,
  getGroupColorClasses,
  type TableDef,
} from '@/data/dbSchema';
import { DataTable, type DataTableColumn } from '@/components/DataTable';

function JsonPreview({ value }: { value: unknown }) {
  const json = JSON.stringify(value, null, 2);
  const preview = JSON.stringify(value);
  const truncated = preview.length > 40 ? preview.slice(0, 37) + '...' : preview;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-left font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors max-w-[200px] truncate block">
          {truncated}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">JSON 详情</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 whitespace-pre-wrap break-all">
            {json}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function formatCellValue(value: unknown, colType: string): React.ReactNode {
  if (value === null || value === undefined) return <span className="text-muted-foreground">NULL</span>;

  const upperType = colType.toUpperCase();

  if (upperType === 'JSONB') {
    return <JsonPreview value={value} />;
  }

  if (upperType === 'UUID') {
    const str = String(value);
    return <span className="font-mono text-[11px]">{str.slice(0, 8)}...</span>;
  }

  if (upperType === 'TIMESTAMPTZ') {
    try {
      const date = new Date(String(value));
      return (
        <span className="font-mono text-[11px]">
          {date.toLocaleDateString('zh-CN')} {date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      );
    } catch {
      return <span className="font-mono text-[11px]">{String(value)}</span>;
    }
  }

  if (upperType === 'TEXT[]') {
    const arr = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-1">
        {arr.map((item, i) => (
          <Badge key={i} variant="secondary" className="text-[9px] font-mono">
            {String(item)}
          </Badge>
        ))}
      </div>
    );
  }

  if (upperType === 'BOOLEAN') {
    return value ? (
      <span className="text-status-healthy font-medium text-xs">true</span>
    ) : (
      <span className="text-status-failed font-medium text-xs">false</span>
    );
  }

  return <span className="text-xs">{String(value)}</span>;
}

function buildColumns(table: TableDef): DataTableColumn<Record<string, unknown>>[] {
  return table.columns.map((colDef) => ({
    key: colDef.name,
    label: colDef.name,
    mono: colDef.type.toUpperCase() === 'UUID' || colDef.name.endsWith('_id'),
    render: (value: unknown) => formatCellValue(value, colDef.type),
  }));
}

export default function MockDataTab() {
  const [selectedTable, setSelectedTable] = useState<string>(allTables[0]!.name);

  const currentTable = useMemo(
    () => allTables.find((t) => t.name === selectedTable) ?? allTables[0]!,
    [selectedTable],
  );

  const columns = useMemo(() => buildColumns(currentTable), [currentTable]);

  return (
    <div className="space-y-4">
      {/* Table Selector */}
      <Card>
        <CardContent className="p-3">
          <ScrollArea className="w-full">
            <div className="flex gap-1.5 pb-1">
              {tableGroups.map((group) => {
                const colors = getGroupColorClasses(group.color);
                return group.tables.map((t) => {
                  const isActive = selectedTable === t.name;
                  return (
                    <button
                      key={t.name}
                      onClick={() => setSelectedTable(t.name)}
                      className={cn(
                        'shrink-0 rounded-md px-2.5 py-1 text-[11px] font-mono transition-colors border',
                        isActive
                          ? cn(colors.bg, colors.text, colors.border, 'font-medium')
                          : 'border-border/30 text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {t.name}
                      <span className="ml-1 text-[9px] opacity-60">({t.mockData.length})</span>
                    </button>
                  );
                });
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono">{currentTable.name}</CardTitle>
            <div className="flex items-center gap-2">
              {(() => {
                const group = getTableGroup(currentTable.name);
                if (!group) return null;
                const colors = getGroupColorClasses(group.color);
                return (
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[10px] font-semibold border',
                      colors.bg,
                      colors.text,
                      colors.border,
                    )}
                  >
                    {group.label}
                  </span>
                );
              })()}
              <Badge variant="secondary" className="text-[10px]">
                {currentTable.mockData.length} 行
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{currentTable.description}</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <DataTable
              columns={columns}
              data={currentTable.mockData}
              emptyMessage="暂无示例数据"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
