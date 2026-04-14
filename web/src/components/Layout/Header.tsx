import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, Sun, Moon } from 'lucide-react';
import { useAppStore } from '@/stores/app';
import { StatusDot } from '@/components/StatusDot';

const routeMap: Record<string, { label: string; parent?: { label: string; href: string } }> = {
  '/': { label: '首页' },
  '/dashboard': { label: 'Harness 概览' },
  '/agents': { label: 'Agent 管理' },
  '/agents/new': { label: '创建 Agent', parent: { label: 'Agent 管理', href: '/agents' } },
  '/skills': { label: 'Skills 技能' },
  '/workflows': { label: '故障分析' },
  '/workflows/designer': { label: '设计器', parent: { label: '故障分析', href: '/workflows' } },
  '/rag/collections': { label: 'Knowledge 知识库' },
  '/rag/documents': { label: '知识文档' },
  '/playground': { label: 'Playground' },
  '/settings': { label: '系统设置' },
};

function getBreadcrumbs(pathname: string) {
  const exact = routeMap[pathname];
  if (exact) {
    const crumbs: { label: string; href?: string }[] = [];
    if (exact.parent) {
      crumbs.push({ label: exact.parent.label, href: exact.parent.href });
    }
    crumbs.push({ label: exact.label });
    return crumbs;
  }

  if (pathname.startsWith('/agents/')) {
    const id = pathname.split('/')[2];
    return [
      { label: 'Agent 管理', href: '/agents' },
      { label: id ?? '详情' },
    ];
  }
  if (pathname.startsWith('/skills/')) {
    const name = pathname.split('/')[2];
    return [
      { label: 'Skills 技能', href: '/skills' },
      { label: name ?? '详情' },
    ];
  }
  if (pathname.startsWith('/workflows/') && pathname.endsWith('/execution')) {
    const id = pathname.split('/')[2];
    return [
      { label: '故障分析', href: '/workflows' },
      { label: `执行监控 ${id ?? ''}` },
    ];
  }

  return [{ label: '页面' }];
}

export default function Header() {
  const location = useLocation();
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm">
        <span className="text-primary font-display font-semibold text-xs mr-1">Resolve Agent</span>
        <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
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
          className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>搜索...</span>
          <kbd className="ml-2 rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono">⌘K</kbd>
        </button>

        {/* Harness health indicators */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="flex items-center justify-center h-7 w-7 rounded-md border border-border hover:bg-muted transition-colors"
            title={theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'}
          >
            {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </button>
          <span className="flex items-center gap-1.5">
            <StatusDot status="healthy" />
            Harness
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
