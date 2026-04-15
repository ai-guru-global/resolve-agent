import { useState, useMemo } from 'react';
import { Search, Key, Link2, Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  tableGroups,
  allTables,
  getTableGroup,
  getGroupColorClasses,
  type TableDef,
  type ColumnDef,
} from '@/data/dbSchema';

interface SchemaTabProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  selectedGroup: string;
  onGroupChange: (v: string) => void;
}

function matchesSearch(table: TableDef, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (table.name.toLowerCase().includes(q)) return true;
  if (table.displayName.toLowerCase().includes(q)) return true;
  return table.columns.some(
    (col) => col.name.toLowerCase().includes(q) || col.description.toLowerCase().includes(q),
  );
}

function ColumnTypeTag({ type }: { type: string }) {
  const baseType = type.split('(')[0]!.toUpperCase();
  let variant: string;
  switch (baseType) {
    case 'UUID':
      variant = 'bg-violet-500/15 text-violet-400';
      break;
    case 'JSONB':
      variant = 'bg-amber-500/15 text-amber-400';
      break;
    case 'TIMESTAMPTZ':
      variant = 'bg-sky-500/15 text-sky-400';
      break;
    case 'TEXT':
    case 'TEXT[]':
      variant = 'bg-emerald-500/15 text-emerald-400';
      break;
    case 'INTEGER':
    case 'BIGSERIAL':
    case 'REAL':
      variant = 'bg-orange-500/15 text-orange-400';
      break;
    case 'BOOLEAN':
      variant = 'bg-pink-500/15 text-pink-400';
      break;
    default:
      variant = 'bg-muted text-muted-foreground';
  }
  return (
    <span className={cn('inline-block rounded px-1.5 py-0.5 text-[10px] font-mono', variant)}>
      {type}
    </span>
  );
}

function ColumnRow({ col, fkColumns }: { col: ColumnDef; fkColumns: Set<string> }) {
  return (
    <tr className="border-b border-border/30 hover:bg-accent/20 transition-colors">
      <td className="px-3 py-2 text-xs font-mono whitespace-nowrap">
        <span className="flex items-center gap-1.5">
          {col.primaryKey && <Key className="h-3 w-3 text-amber-400" />}
          {fkColumns.has(col.name) && <Link2 className="h-3 w-3 text-blue-400" />}
          {col.name}
        </span>
      </td>
      <td className="px-3 py-2">
        <ColumnTypeTag type={col.type} />
      </td>
      <td className="px-3 py-2 text-xs text-center">
        {col.nullable ? (
          <span className="text-muted-foreground">NULL</span>
        ) : (
          <span className="text-status-healthy font-medium">NOT NULL</span>
        )}
      </td>
      <td className="px-3 py-2 text-xs font-mono text-muted-foreground whitespace-nowrap">
        {col.default ?? '—'}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{col.description}</td>
    </tr>
  );
}

function TableDetail({ table }: { table: TableDef }) {
  const group = getTableGroup(table.name);
  const groupColors = group ? getGroupColorClasses(group.color) : null;
  const fkColumns = new Set(table.foreignKeys.map((fk) => fk.column));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-lg font-mono font-semibold">{table.name}</h3>
          {groupColors && (
            <span
              className={cn(
                'rounded-md px-2 py-0.5 text-[10px] font-semibold border',
                groupColors.bg,
                groupColors.text,
                groupColors.border,
              )}
            >
              {group!.label}
            </span>
          )}
          <Badge variant="secondary" className="text-[10px] font-mono">
            {table.migration}
          </Badge>
        </div>
        <p className="text-sm font-medium">{table.displayName}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{table.description}</p>
      </div>

      {/* Columns */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" />
            字段定义
            <Badge variant="secondary" className="text-[10px] font-mono ml-1">
              {table.columns.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    字段名
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    类型
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    约束
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    默认值
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    说明
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.columns.map((c) => (
                  <ColumnRow key={c.name} col={c} fkColumns={fkColumns} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Indexes */}
      {table.indexes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">索引</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {table.indexes.map((idx) => (
                <div
                  key={idx.name}
                  className="flex items-center gap-3 text-xs rounded-md border border-border/30 px-3 py-2"
                >
                  <span className="font-mono text-muted-foreground">{idx.name}</span>
                  <span className="text-muted-foreground">ON</span>
                  <span className="font-mono">
                    ({idx.columns.join(', ')})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Foreign Keys */}
      {table.foreignKeys.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              外键关系
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {table.foreignKeys.map((fk) => (
                <div
                  key={fk.column}
                  className="flex items-center gap-2 text-xs rounded-md border border-border/30 px-3 py-2"
                >
                  <span className="font-mono font-medium">{fk.column}</span>
                  <span className="text-muted-foreground">&rarr;</span>
                  <span className="font-mono text-primary">
                    {fk.referencesTable}.{fk.referencesColumn}
                  </span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">
                    ON DELETE {fk.onDelete}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SchemaTab({
  searchQuery,
  onSearchChange,
  selectedGroup,
  onGroupChange,
}: SchemaTabProps) {
  const [selectedTable, setSelectedTable] = useState<string>(allTables[0]!.name);

  const filteredGroups = useMemo(() => {
    return tableGroups
      .filter((g) => selectedGroup === 'all' || g.label === selectedGroup)
      .map((g) => ({
        ...g,
        tables: g.tables.filter((t) => matchesSearch(t, searchQuery)),
      }))
      .filter((g) => g.tables.length > 0);
  }, [searchQuery, selectedGroup]);

  const currentTable = useMemo(
    () => allTables.find((t) => t.name === selectedTable) ?? allTables[0]!,
    [selectedTable],
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索表名或字段..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Select value={selectedGroup} onValueChange={onGroupChange}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="全部分组" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分组</SelectItem>
            {tableGroups.map((g) => (
              <SelectItem key={g.label} value={g.label}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Master-Detail */}
      <div className="flex gap-4 min-h-[600px]">
        {/* Left: Table List */}
        <div className="w-56 shrink-0">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4 pr-2">
              {filteredGroups.map((group) => {
                const colors = getGroupColorClasses(group.color);
                return (
                  <div key={group.label}>
                    <p className="px-1 mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span
                        className={cn('inline-block h-2 w-2 rounded-full', colors.bg, colors.border, 'border')}
                      />
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.tables.map((t) => (
                        <button
                          key={t.name}
                          onClick={() => setSelectedTable(t.name)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors',
                            selectedTable === t.name
                              ? 'bg-accent text-accent-foreground font-medium'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          <span className="font-mono truncate">{t.name}</span>
                          <Badge variant="secondary" className="text-[9px] font-mono ml-1 shrink-0">
                            {t.columns.length}
                          </Badge>
                        </button>
                      ))}
                    </div>
                    <Separator className="mt-2" />
                  </div>
                );
              })}
              {filteredGroups.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  无匹配结果
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Table Detail */}
        <div className="flex-1 min-w-0">
          <ScrollArea className="h-[600px]">
            <div className="pr-2">
              <TableDetail table={currentTable} />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
