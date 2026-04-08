import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusDotVariants = cva('rounded-full', {
  variants: {
    status: {
      healthy: 'bg-status-healthy',
      degraded: 'bg-status-degraded',
      failed: 'bg-status-failed',
      progressing: 'bg-status-progressing',
      unknown: 'bg-status-unknown',
    },
    size: {
      sm: 'h-1.5 w-1.5',
      md: 'h-2 w-2',
    },
  },
  defaultVariants: {
    status: 'unknown',
    size: 'md',
  },
});

export interface StatusDotProps extends VariantProps<typeof statusDotVariants> {
  animated?: boolean;
  className?: string;
}

export function StatusDot({ status, size, animated = false, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        statusDotVariants({ status, size }),
        animated && status === 'progressing' && 'animate-pulse-dot',
        className,
      )}
    />
  );
}
