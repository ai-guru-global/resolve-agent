import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  Bot,
  Zap,
  GitBranch,
  Database,
  DatabaseZap,
  MessageSquare,
  Settings,
  Activity,
  BarChart3,
  Bell,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAppStore } from '@/stores/app';
import { Toaster } from '@/components/ui/sonner';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const navigationItems: {
  name: string;
  href: string;
  icon: typeof Home;
  external?: boolean;
}[] = [
  { name: '首页', href: '/', icon: Home },
  { name: 'Harness 概览', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Agent 管理', href: '/agents', icon: Bot },
  { name: 'Skills 技能', href: '/skills', icon: Zap },
  { name: 'FTA 工作流', href: '/workflows', icon: GitBranch },
  { name: 'RAG 知识库', href: '/rag/collections', icon: Database },
  { name: '知识文档', href: '/rag/documents', icon: Database },
  { name: 'Playground', href: '/playground', icon: MessageSquare },
  { name: '追踪分析', href: '/traces', icon: Activity },
  { name: '评估基准', href: '/evaluation', icon: BarChart3 },
  { name: '监控告警', href: '/monitoring', icon: Bell },
  { name: '记忆 & 数据库', href: '/database', icon: DatabaseZap },
  { name: '系统设置', href: '/settings', icon: Settings },
  { name: '自助学习', href: 'https://github.com/ai-guru-global/ai-guru-database/tree/main', icon: GraduationCap, external: true },
];

export default function MainLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCommandPaletteOpen]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      {/* Command Palette */}
      <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
        <CommandInput placeholder="搜索页面或功能..." />
        <CommandList>
          <CommandEmpty>未找到结果</CommandEmpty>
          <CommandGroup heading="页面导航">
            {navigationItems.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => {
                  if (item.external) {
                    window.open(item.href, '_blank', 'noopener,noreferrer');
                  } else {
                    navigate(item.href);
                  }
                  setCommandPaletteOpen(false);
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.name}</span>
                {item.external && <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground/50" />}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Toaster />
    </div>
  );
}
