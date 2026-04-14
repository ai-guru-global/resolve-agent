import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  trend?: { value: number; direction: 'up' | 'down' | 'flat' };
  accentColor?: string;
  className?: string;
}

export function MetricCard({ icon: Icon, value, label, trend, className }: MetricCardProps) {
  return (
    <Card className={cn('border-border/30', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-display font-bold tabular-nums">{value}</p>
            {trend && (
              <p
                className={cn(
                  'text-xs',
                  trend.direction === 'up' && 'text-status-healthy',
                  trend.direction === 'down' && 'text-status-failed',
                  trend.direction === 'flat' && 'text-muted-foreground',
                )}
              >
                {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
                {trend.value}%
              </p>
            )}
          </div>
          <div className="rounded-lg bg-accent/40 p-2.5">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
