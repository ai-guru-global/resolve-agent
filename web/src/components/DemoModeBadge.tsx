import { Badge } from '@/components/ui/badge';
import { DEMO_NOW } from '@/lib/demoTime';
import { DEV_MOCKS_ENABLED } from '@/api/mockRuntime';

export function DemoModeBadge() {
  if (!DEV_MOCKS_ENABLED) return null;
  return (
    <Badge
      variant="outline"
      className="shrink-0 text-xs text-muted-foreground"
      title="当前页面由内置演示数据驱动，数据锚点固定，不代表真实运行状态"
    >
      演示数据 · 锚点 {DEMO_NOW.slice(0, 10)}
    </Badge>
  );
}
