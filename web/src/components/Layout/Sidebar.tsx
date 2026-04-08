import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Zap,
  GitBranch,
  Database,
  MessageSquare,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: '运维管理',
    items: [
      { name: '运维概览', href: '/', icon: LayoutDashboard },
      { name: '智能体管理', href: '/agents', icon: Bot },
    ],
  },
  {
    label: '技能 & 知识',
    items: [
      { name: '运维技能', href: '/skills', icon: Zap },
      { name: '知识库', href: '/rag/collections', icon: Database },
    ],
  },
  {
    label: '分析 & 测试',
    items: [
      { name: '故障分析', href: '/workflows', icon: GitBranch },
      { name: '对话测试', href: '/playground', icon: MessageSquare },
    ],
  },
  {
    label: '系统',
    items: [{ name: '平台设置', href: '/settings', icon: Settings }],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

export default function Sidebar() {
  const location = useLocation();
  const sidebarExpanded = useAppStore((s) => s.sidebarExpanded);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-card transition-all duration-200 ease-in-out',
        sidebarExpanded ? 'w-60' : 'w-16',
      )}
    >
      {/* Brand */}
      <div className={cn('flex h-12 items-center border-b border-border px-4', !sidebarExpanded && 'justify-center px-0')}>
        {sidebarExpanded ? (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              R
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">ResolveNet</p>
              <p className="text-[10px] text-muted-foreground">现场助手</p>
            </div>
          </div>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            R
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {sidebarExpanded && (
                <p className="px-2 mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              {!sidebarExpanded && group !== navGroups[0] && <Separator className="my-2" />}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(location.pathname, item.href);
                  const linkContent = (
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                        active
                          ? 'bg-primary/10 text-primary border-l-2 border-l-primary -ml-[1px]'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        !sidebarExpanded && 'justify-center px-0 py-2',
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {sidebarExpanded && <span>{item.name}</span>}
                    </Link>
                  );

                  if (!sidebarExpanded) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right">{item.name}</TooltipContent>
                      </Tooltip>
                    );
                  }

                  return <div key={item.href}>{linkContent}</div>;
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {sidebarExpanded ? (
            <>
              <ChevronsLeft className="h-4 w-4" />
              <span>收起侧栏</span>
            </>
          ) : (
            <ChevronsRight className="h-4 w-4" />
          )}
        </button>
        {sidebarExpanded && (
          <p className="mt-1 text-center text-[10px] text-muted-foreground/50">v1.0.0 | ResolveNet</p>
        )}
      </div>
    </aside>
  );
}
