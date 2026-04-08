import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/stores/app';
import { StatusDot } from '@/components/StatusDot';

const routeMap: Record<string, { label: string; parent?: { label: string; href: string } }> = {
  '/': { label: '运维概览' },
  '/agents': { label: '智能体管理' },
  '/agents/new': { label: '创建智能体', parent: { label: '智能体管理', href: '/agents' } },
  '/skills': { label: '运维技能' },
  '/workflows': { label: '故障分析工作流' },
  '/workflows/designer': { label: '设计器', parent: { label: '故障分析工作流', href: '/workflows' } },
  '/rag/collections': { label: '知识库集合' },
  '/rag/documents': { label: '运维文档' },
  '/playground': { label: '对话测试' },
  '/settings': { label: '平台设置' },
};

function getBreadcrumbs(pathname: string) {
  // Try exact match first
  const exact = routeMap[pathname];
  if (exact) {
    const crumbs: { label: string; href?: string }[] = [];
    if (exact.parent) {
      crumbs.push({ label: exact.parent.label, href: exact.parent.href });
    }
    crumbs.push({ label: exact.label });
    return crumbs;
  }

  // Dynamic routes: /agents/:id, /skills/:name, /workflows/:id/execution
  if (pathname.startsWith('/agents/')) {
    const id = pathname.split('/')[2];
    return [
      { label: '智能体管理', href: '/agents' },
      { label: id ?? '详情' },
    ];
  }
  if (pathname.startsWith('/skills/')) {
    const name = pathname.split('/')[2];
    return [
      { label: '运维技能', href: '/skills' },
      { label: name ?? '详情' },
    ];
  }
  if (pathname.startsWith('/workflows/') && pathname.endsWith('/execution')) {
    const id = pathname.split('/')[2];
    return [
      { label: '故障分析工作流', href: '/workflows' },
      { label: `执行监控 ${id ?? ''}` },
    ];
  }

  return [{ label: '页面' }];
}

export default function Header() {
  const location = useLocation();
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            {crumb.href ? (
              <Link to={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        {/* Command palette trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>搜索...</span>
          <kbd className="ml-2 rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono">⌘K</kbd>
        </button>

        {/* Status indicators */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <StatusDot status="degraded" />
            ResolveNet
          </span>
          <span className="flex items-center gap-1.5">
            <StatusDot status="healthy" />
            系统正常
          </span>
        </div>
      </div>
    </header>
  );
}
