import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        healthy: 'bg-status-healthy/10 text-status-healthy',
        degraded: 'bg-status-degraded/10 text-status-degraded',
        failed: 'bg-status-failed/10 text-status-failed',
        progressing: 'bg-status-progressing/10 text-status-progressing',
        unknown: 'bg-status-unknown/10 text-status-unknown',
      },
    },
    defaultVariants: {
      variant: 'unknown',
    },
  },
);

const dotColorMap: Record<string, string> = {
  healthy: 'bg-status-healthy',
  degraded: 'bg-status-degraded',
  failed: 'bg-status-failed',
  progressing: 'bg-status-progressing',
  unknown: 'bg-status-unknown',
};

export interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  label: string;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ variant, label, showDot = true, className }: StatusBadgeProps) {
  const key = variant ?? 'unknown';
  return (
    <span className={cn(statusBadgeVariants({ variant }), className)}>
      {showDot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColorMap[key])} />}
      {label}
    </span>
  );
}
