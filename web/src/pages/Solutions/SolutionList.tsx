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
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type {
  TroubleshootingSolution,
  SolutionSeverity,
  SolutionStatus,
} from '@/types';

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

const statusLabels: Record<SolutionStatus, string> = {
  active: '启用',
  draft: '草稿',
  archived: '已归档',
};

const statusVariant: Record<SolutionStatus, 'healthy' | 'progressing' | 'unknown'> = {
  active: 'healthy',
  draft: 'progressing',
  archived: 'unknown',
};

const domainOptions = ['kubernetes', 'database', 'network'];
const severityOptions: SolutionSeverity[] = ['critical', 'high', 'medium', 'low'];
const statusOptions: SolutionStatus[] = ['active', 'draft', 'archived'];

interface SolutionFormState {
  title: string;
  domain: string;
  component: string;
  severity: SolutionSeverity;
  status: SolutionStatus;
  tags: string;
  search_keywords: string;
  problem_symptoms: string;
  key_information: string;
  troubleshooting_steps: string;
  resolution_steps: string;
}

const emptyForm: SolutionFormState = {
  title: '',
  domain: 'kubernetes',
  component: '',
  severity: 'medium',
  status: 'active',
  tags: '',
  search_keywords: '',
  problem_symptoms: '',
  key_information: '',
  troubleshooting_steps: '',
  resolution_steps: '',
};

export default function SolutionList() {
  const [solutions, setSolutions] = useState<TroubleshootingSolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<TroubleshootingSolution | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<TroubleshootingSolution | null>(null);
  const [form, setForm] = useState<SolutionFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const normFilter = (v: string) => (v === 'all' ? undefined : v || undefined);

  const loadSolutions = async () => {
    setLoading(true);
    try {
      if (appliedKeyword.trim()) {
        const data = await api.searchSolutions({
          keyword: appliedKeyword.trim(),
          domain: normFilter(domainFilter),
          severity: normFilter(severityFilter),
          status: normFilter(statusFilter),
        });
        setSolutions(data.solutions);
      } else {
        const data = await api.listSolutions({
          domain: normFilter(domainFilter),
          severity: normFilter(severityFilter),
          status: normFilter(statusFilter),
        });
        setSolutions(data.solutions);
      }
    } catch {
      toast.error('加载结构化标准方案列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSolutions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedKeyword, domainFilter, severityFilter, statusFilter]);

  const handleSearch = () => {
    setAppliedKeyword(searchKeyword.trim());
  };

  const openCreate = () => {
    setFormMode('create');
    setEditTarget(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (sol: TroubleshootingSolution) => {
    setFormMode('edit');
    setEditTarget(sol);
    setForm({
      title: sol.title,
      domain: sol.domain,
      component: sol.component,
      severity: sol.severity,
      status: sol.status,
      tags: sol.tags.join(', '),
      search_keywords: sol.search_keywords,
      problem_symptoms: sol.problem_symptoms,
      key_information: sol.key_information,
      troubleshooting_steps: sol.troubleshooting_steps,
      resolution_steps: sol.resolution_steps,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload: Partial<TroubleshootingSolution> = {
      title: form.title.trim(),
      domain: form.domain.trim(),
      component: form.component.trim(),
      severity: form.severity,
      status: form.status,
      tags: form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      search_keywords: form.search_keywords.trim(),
      problem_symptoms: form.problem_symptoms,
      key_information: form.key_information,
      troubleshooting_steps: form.troubleshooting_steps,
      resolution_steps: form.resolution_steps,
    };
    try {
      if (formMode === 'edit' && editTarget) {
        await api.updateSolution(editTarget.id, payload);
        toast.success(`方案 "${payload.title}" 已更新`);
      } else {
        await api.createSolution(payload);
        toast.success(`方案 "${payload.title}" 已创建`);
      }
      setFormOpen(false);
      loadSolutions();
    } catch {
      toast.error(formMode === 'edit' ? '更新方案失败' : '创建方案失败');
    } finally {
      setSaving(false);
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

  const hasFilters = Boolean(
    appliedKeyword ||
      severityFilter !== 'all' ||
      domainFilter !== 'all' ||
      statusFilter !== 'all',
  );

  if (!loading && solutions.length === 0 && !hasFilters) {
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
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            新建方案
          </Button>
        }
      />

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-56 max-w-md">
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
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="严重度" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部严重度</SelectItem>
            {severityOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {severityLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="领域" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部领域</SelectItem>
            {domainOptions.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[110px] h-9">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : solutions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          没有符合当前筛选条件的方案
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
                    <StatusBadge
                      label={statusLabels[sol.status]}
                      variant={statusVariant[sol.status]}
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
                    <DropdownMenuItem onClick={() => openEdit(sol)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      编辑
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

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? '新建方案' : '编辑方案'}</DialogTitle>
            <DialogDescription>
              填写方案四要素与元数据，保存后进入标准方案知识库
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label>标题</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="如：Redis 缓存击穿排查方案"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label>领域</Label>
                <Select value={form.domain} onValueChange={(v) => setForm({ ...form, domain: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择领域" />
                  </SelectTrigger>
                  <SelectContent>
                    {domainOptions.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>组件</Label>
                <Input
                  value={form.component}
                  onChange={(e) => setForm({ ...form, component: e.target.value })}
                  placeholder="如 redis / nginx"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>严重度</Label>
                <Select
                  value={form.severity}
                  onValueChange={(v) => setForm({ ...form, severity: v as SolutionSeverity })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="严重度" />
                  </SelectTrigger>
                  <SelectContent>
                    {severityOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {severityLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>状态</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as SolutionStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>搜索关键词（逗号分隔）</Label>
                <Input
                  value={form.search_keywords}
                  onChange={(e) => setForm({ ...form, search_keywords: e.target.value })}
                  placeholder="如 crashloop, oom, pod 重启"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>标签（逗号分隔）</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="如 k8s, 网络, 证书"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>问题现象</Label>
              <Textarea
                rows={3}
                value={form.problem_symptoms}
                onChange={(e) => setForm({ ...form, problem_symptoms: e.target.value })}
                placeholder="描述故障的典型现象..."
              />
            </div>
            <div className="grid gap-1.5">
              <Label>关键信息 / 日志</Label>
              <Textarea
                rows={3}
                value={form.key_information}
                onChange={(e) => setForm({ ...form, key_information: e.target.value })}
                placeholder="关键日志片段、指标快照..."
              />
            </div>
            <div className="grid gap-1.5">
              <Label>排查步骤</Label>
              <Textarea
                rows={4}
                value={form.troubleshooting_steps}
                onChange={(e) => setForm({ ...form, troubleshooting_steps: e.target.value })}
                placeholder="1. ...&#10;2. ..."
              />
            </div>
            <div className="grid gap-1.5">
              <Label>解决方案</Label>
              <Textarea
                rows={4}
                value={form.resolution_steps}
                onChange={(e) => setForm({ ...form, resolution_steps: e.target.value })}
                placeholder="1. ...&#10;2. ..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {formMode === 'create' ? '创建' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
