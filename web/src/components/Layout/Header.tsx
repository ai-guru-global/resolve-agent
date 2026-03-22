import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/agents': 'Agents',
  '/skills': 'Skills',
  '/workflows': 'Workflows',
  '/rag/collections': 'RAG Collections',
  '/rag/documents': 'Documents',
  '/playground': 'Playground',
  '/settings': 'Settings',
};

export function Header() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'ResolveNet';

  return (
    <header className="h-14 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2 text-sm text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          System Healthy
        </span>
      </div>
    </header>
  );
}
