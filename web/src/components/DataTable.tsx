import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: keyof T & string;
  label: string;
  className?: string;
  mono?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = '暂无数据',
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-2.5">
            {columns.map((col) => (
              <Skeleton key={col.key} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="w-full overflow-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground',
                  col.className,
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className={cn(
                'border-b border-border transition-colors hover:bg-accent/50',
                onRowClick && 'cursor-pointer',
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => {
                const value = (row as Record<string, unknown>)[col.key];
                return (
                  <td
                    key={col.key}
                    className={cn('px-4 py-2.5 text-sm', col.mono && 'font-mono text-xs', col.className)}
                  >
                    {col.render ? col.render(value, row) : (value != null ? String(value) : '—')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
