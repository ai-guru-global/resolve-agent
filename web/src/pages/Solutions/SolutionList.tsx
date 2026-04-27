import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  MoreHorizontal,
  Trash2,
  Eye,
  Loader2,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/api/client';
import type { TroubleshootingSolution, SolutionSeverity } from '@/types';

const severityLabels: Record<SolutionSeverity, string> = {
  critical: '严重',
  high: '高',
  medium: '中',
  low: '低',
};

const severityVariant: Record<SolutionSeverity, 'failed' | 'degraded' | 'progressing' | 'unknown'> = {
  critical: 'failed',
  high: 'degraded',
  medium: 'progressing',
  low: 'unknown',
};

export default function SolutionList() {
  const [solutions, setSolutions] = useState<TroubleshootingSolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TroubleshootingSolution | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSolutions = async () => {
    setLoading(true);
    try {
      const data = await api.listSolutions();
      setSolutions(data.solutions);
    } catch {
      toast.error('加载结构化标准方案列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSolutions();
  }, []);

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      loadSolutions();
      return;
    }
    setLoading(true);
    try {
      const data = await api.searchSolutions({ keyword: searchKeyword.trim() });
      setSolutions(data.solutions);
    } catch {
      toast.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteSolution(deleteTarget.id);
      toast.success(`方案 "${deleteTarget.title}" 已删除`);
      setDeleteTarget(null);
      loadSolutions();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  if (!loading && solutions.length === 0 && !searchKeyword) {
    return (
      <div className="space-y-6">
        <PageHeader title="结构化标准方案" description="结构化标准方案知识库" />
        <EmptyState
          icon={BookOpen}
          title="暂无结构化标准方案"
          description="创建第一个结构化标准方案来构建运维知识库"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="结构化标准方案"
        description="结构化标准方案知识库 - 问题现象 / 关键信息 / 排查步骤 / 解决方案"
        actions={
          <Button size="sm" onClick={() => toast.info('即将推出：方案创建功能')}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            新建方案
          </Button>
        }
      />

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索方案标题、症状、关键词..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          搜索
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {solutions.map((sol) => (
            <div
              key={sol.id}
              className="group rounded-lg border border-border bg-card p-4 hover:border-accent transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Link
                      to={`/solutions/${sol.id}`}
                      className="text-sm font-medium hover:underline truncate"
                    >
                      {sol.title}
                    </Link>
                    <StatusBadge
                      label={severityLabels[sol.severity]}
                      variant={severityVariant[sol.severity]}
                    />
                    {sol.domain && (
                      <Badge variant="outline" className="text-[10px]">
                        {sol.domain}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {sol.problem_symptoms}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {sol.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                    {sol.tags.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{sol.tags.length - 4}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      v{sol.version} | {new Date(sol.updated_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/solutions/${sol.id}`}>
                        <Eye className="mr-2 h-3.5 w-3.5" />
                        查看详情
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteTarget(sol)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除结构化标准方案 &quot;{deleteTarget?.title}&quot; 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
