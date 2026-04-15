import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Tag, Layers, Activity, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { api } from '@/api/client';
import type { TroubleshootingSolution, SolutionExecution, SolutionSeverity } from '@/types';

const severityVariant: Record<SolutionSeverity, 'failed' | 'degraded' | 'progressing' | 'unknown'> = {
  critical: 'failed',
  high: 'degraded',
  medium: 'progressing',
  low: 'unknown',
};

function SolutionSection({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="rounded-md border border-border bg-muted/30 p-3">
        <pre className="whitespace-pre-wrap text-xs text-foreground/80 font-mono leading-relaxed">
          {content}
        </pre>
      </div>
    </div>
  );
}

export default function SolutionDetail() {
  const { id } = useParams<{ id: string }>();
  const [solution, setSolution] = useState<TroubleshootingSolution | null>(null);
  const [executions, setExecutions] = useState<SolutionExecution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [sol, execData] = await Promise.all([
          api.getSolution(id),
          api.listSolutionExecutions(id),
        ]);
        setSolution(sol);
        setExecutions(execData.executions);
      } catch {
        toast.error('加载方案详情失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!solution) {
    return (
      <div className="space-y-6">
        <PageHeader title="方案未找到" />
        <Button variant="outline" asChild>
          <Link to="/solutions">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            返回列表
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link to="/solutions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{solution.title}</h1>
            <StatusBadge
              label={solution.severity}
              variant={severityVariant[solution.severity]}
            />
            <Badge variant="outline" className="text-xs">
              v{solution.version}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {solution.domain && (
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {solution.domain}
              </span>
            )}
            {solution.component && (
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {solution.component}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(solution.updated_at).toLocaleString('zh-CN')}
            </span>
          </div>
        </div>
      </div>

      {/* Tags */}
      {solution.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {solution.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Four-element sections */}
      <div className="space-y-4">
        <SolutionSection title="问题现象" content={solution.problem_symptoms} />
        <SolutionSection title="关键信息 / 日志" content={solution.key_information} />
        <SolutionSection title="排查步骤" content={solution.troubleshooting_steps} />
        <SolutionSection title="解决方案" content={solution.resolution_steps} />
      </div>

      {/* Related resources */}
      {(solution.related_skill_names.length > 0 || solution.related_workflow_ids.length > 0) && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">关联资源</h3>
            <div className="flex gap-2 flex-wrap">
              {solution.related_skill_names.map((name) => (
                <Badge key={name} variant="outline" className="text-xs">
                  Skill: {name}
                </Badge>
              ))}
              {solution.related_workflow_ids.map((wfId) => (
                <Badge key={wfId} variant="outline" className="text-xs">
                  Workflow: {wfId}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Execution history */}
      {executions.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Activity className="h-4 w-4" />
              执行记录
            </h3>
            <div className="space-y-2">
              {executions.map((exec) => (
                <div
                  key={exec.id}
                  className="rounded-md border border-border p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {exec.executor || '未知执行者'}
                    </span>
                    <StatusBadge
                      label={exec.status}
                      variant={exec.status === 'success' ? 'healthy' : 'failed'}
                    />
                  </div>
                  {exec.outcome_notes && (
                    <p className="text-muted-foreground">{exec.outcome_notes}</p>
                  )}
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>耗时: {exec.duration_ms}ms</span>
                    <span>有效性: {(exec.effectiveness_score * 100).toFixed(0)}%</span>
                    <span>{new Date(exec.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
