import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Zap,
  GitBranch,
  Database,
  MessageSquare,
  Settings,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Agents', href: '/agents', icon: Bot },
  { name: 'Skills', href: '/skills', icon: Zap },
  { name: 'Workflows', href: '/workflows', icon: GitBranch },
  { name: 'RAG', href: '/rag/collections', icon: Database },
  { name: 'Playground', href: '/playground', icon: MessageSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold text-primary-500">ResolveAgent</h1>
        <p className="text-xs text-gray-500 mt-1">Mega Agent Platform</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-800 text-xs text-gray-600">
        v0.1.0 | Apache 2.0
      </div>
    </div>
  );
}
