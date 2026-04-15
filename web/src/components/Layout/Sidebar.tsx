import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  Bot,
  Zap,
  Database,
  DatabaseZap,
  GitBranch,
  MessageSquare,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Code2,
  FileBox,
  Users,
  Layers,
  Play,
  Smartphone,
  GraduationCap,
  ExternalLink,
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
  external?: boolean;
  url?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: '平台概览',
    items: [
      { name: '首页', href: '/', icon: Home },
      { name: '全局看板', href: '/dashboard', icon: LayoutDashboard },
      { name: '架构说明', href: '/architecture', icon: Layers },
      { name: 'Mobile App', href: '/mobile', icon: Smartphone },
      { name: 'Demo 演示', href: '/demo', icon: Play },
    ],
  },
  {
    label: 'Agent 管理',
    items: [
      { name: 'Agent 管理', href: '/agents', icon: Bot },
      { name: 'Agent 模板', href: '/agents/templates', icon: FileBox },
      { name: '多 Agent 协作', href: '/agents/collaboration', icon: Users },
    ],
  },
  {
    label: 'Harness 组件',
    items: [
      { name: 'Skills 技能', href: '/skills', icon: Zap },
      { name: 'FTA 工作流', href: '/workflows', icon: GitBranch },
      { name: '排查方案库', href: '/solutions', icon: BookOpen },
      { name: '代码分析语料', href: '/code-analysis', icon: Code2 },
      { name: 'RAG 知识库', href: '/rag/collections', icon: Database },
    ],
  },
  {
    label: '分析 & 测试',
    items: [
      { name: 'Playground', href: '/playground', icon: MessageSquare },
      { name: '追踪分析', href: '/traces', icon: Activity },
      { name: '评估基准', href: '/evaluation', icon: BarChart3 },
      { name: '监控告警', href: '/monitoring', icon: Bell },
    ],
  },
  {
    label: '系统',
    items: [
      { name: '记忆 & 数据库', href: '/database', icon: DatabaseZap },
      { name: '系统设置', href: '/settings', icon: Settings },
    ],
  },
  {
    label: '学习 & 资源',
    items: [
      {
        name: '自助学习',
        href: '#external',
        icon: GraduationCap,
        external: true,
        url: 'https://github.com/ai-guru-global/ai-guru-database',
      },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  // Exact match (handles /agents and /agents/ equally)
  if (pathname === href) return true;
  // Prefix match only when pathname goes deeper — pathname must start with href
  // AND the next char must be '/' (not a longer path segment matching by coincidence)
  return pathname.startsWith(href) && pathname[href.length] === '/';
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
      <div className={cn('flex h-14 items-center border-b border-border px-4', !sidebarExpanded && 'justify-center px-0')}>
        {sidebarExpanded ? (
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background text-xs font-display font-extrabold">
              R
            </span>
            <div className="leading-tight">
              <p className="text-sm font-display font-bold tracking-tight">Resolve Agent</p>
              <p className="text-[10px] text-muted-foreground leading-tight">面向问题解决的综合智能体</p>
            </div>
          </div>
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background text-xs font-display font-extrabold">
            R
          </span>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {sidebarExpanded && (
                <p className="px-2 mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              {!sidebarExpanded && group !== navGroups[0] && <Separator className="my-2" />}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = !item.external && isActive(location.pathname, item.href);
                  const linkClasses = cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    !sidebarExpanded && 'justify-center px-0 py-2',
                  );

                  const linkContent = item.external ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClasses}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {sidebarExpanded && (
                        <>
                          <span>{item.name}</span>
                          <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground/50" />
                        </>
                      )}
                    </a>
                  ) : (
                    <Link
                      to={item.href}
                      className={linkClasses}
                    >
                      <item.icon className={cn('h-4 w-4 shrink-0', active && 'text-accent-foreground')} />
                      {sidebarExpanded && <span>{item.name}</span>}
                    </Link>
                  );

                  if (!sidebarExpanded) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right">
                          {item.name}{item.external && ' ↗'}
                        </TooltipContent>
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
          className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
          <p className="mt-1 text-center text-[10px] text-muted-foreground/50">v1.0.0 | Resolve Agent</p>
        )}
      </div>
    </aside>
  );
}
