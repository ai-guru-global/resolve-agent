import { useState, useMemo } from 'react';
import {
  GitBranch,
  FileCode,
  FunctionSquare,
  Tag,
  ChevronRight,
  AlertTriangle,
  Rocket,
  Network,
  ArrowRightLeft,
  Workflow,
  Zap,
} from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ChainFlowViewer from '@/components/K8sCorpus/ChainFlowViewer';
import CodeSnippetPanel from '@/components/K8sCorpus/CodeSnippetPanel';
import RAGCorpusPanel from '@/components/K8sCorpus/RAGCorpusPanel';
import { K8S_CORPUS } from '@/data/k8sCorpus';
import type { K8sChainId, K8sAnalysisChain } from '@/types/k8sCorpus';

const CHAIN_STYLES: Record<K8sChainId, {
  color: string;
  bgColor: string;
  icon: typeof AlertTriangle;
  accentBorder: string;
  topologyLabel: string;
  topologyIcon: typeof Network;
}> = {
  'pod-not-ready': {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: AlertTriangle,
    accentBorder: 'border-red-500/40',
    topologyLabel: '事件驱动 · 多分支图',
    topologyIcon: Network,
  },
  'kubeadm-init': {
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: Rocket,
    accentBorder: 'border-purple-500/40',
    topologyLabel: '顺序流水线 · 阶段化',
    topologyIcon: Workflow,
  },
};

const CALL_TYPE_LABELS: Record<string, { label: string; dotColor: string }> = {
  direct: { label: '直接调用', dotColor: 'bg-slate-500' },
  grpc: { label: 'gRPC', dotColor: 'bg-blue-500' },
  http: { label: 'HTTP', dotColor: 'bg-emerald-500' },
  event: { label: '事件', dotColor: 'bg-amber-500' },
  watch: { label: 'Watch', dotColor: 'bg-amber-500' },
};

function CallTypeBar({ chain }: { chain: K8sAnalysisChain }) {
  const dist = chain.callTypeDistribution;
  const total = dist.direct + dist.grpc + dist.http + dist.event + dist.watch;
  if (total === 0) return null;

  const segments = [
    { key: 'direct', count: dist.direct, color: 'bg-slate-400' },
    { key: 'http', count: dist.http, color: 'bg-emerald-500' },
    { key: 'event', count: dist.event, color: 'bg-amber-500' },
    { key: 'watch', count: dist.watch, color: 'bg-amber-400' },
    { key: 'grpc', count: dist.grpc, color: 'bg-blue-500' },
  ].filter((s) => s.count > 0);

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted-foreground/60 font-medium">调用类型分布</p>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/20">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={cn('h-full', seg.color)}
            style={{ width: `${(seg.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {segments.map((seg) => {
          const meta = CALL_TYPE_LABELS[seg.key];
          return (
            <span key={seg.key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className={cn('h-1.5 w-1.5 rounded-full', meta?.dotColor ?? 'bg-slate-400')} />
              {meta?.label ?? seg.key} ({seg.count})
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function K8sCorpusAnalysis() {
  const [selectedChainId, setSelectedChainId] = useState<K8sChainId>('pod-not-ready');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const corpus = K8S_CORPUS;
  const selectedChain = useMemo(
    () => corpus.chains.find((c) => c.id === selectedChainId) ?? corpus.chains[0]!,
    [corpus, selectedChainId],
  );
  const selectedFile = useMemo(
    () => (selectedFileId ? selectedChain.sourceFiles.find((f) => f.id === selectedFileId) ?? null : null),
    [selectedChain, selectedFileId],
  );

  const totalFiles = corpus.chains.reduce((s, c) => s + c.totalFiles, 0);
  const totalFunctions = corpus.chains.reduce((s, c) => s + c.totalFunctions, 0);

  const handleNodeClick = (fileId: string) => {
    setSelectedFileId((prev) => (prev === fileId ? null : fileId));
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard icon={Tag} value={corpus.kubernetesVersion} label="Kubernetes 版本" />
        <MetricCard icon={GitBranch} value={String(corpus.chains.length)} label="分析链路" />
        <MetricCard icon={FileCode} value={String(totalFiles)} label="源码文件" />
        <MetricCard icon={FunctionSquare} value={String(totalFunctions)} label="关键函数" />
      </div>

      {/* Chain Selector - with differentiated display */}
      <div className="flex gap-3">
        {corpus.chains.map((chain) => {
          const isActive = chain.id === selectedChainId;
          const style = CHAIN_STYLES[chain.id];
          const ChainIcon = style.icon;
          const TopoIcon = style.topologyIcon;
          return (
            <button
              key={chain.id}
              onClick={() => {
                setSelectedChainId(chain.id);
                setSelectedFileId(null);
              }}
              className={cn(
                'flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors flex-1',
                isActive
                  ? `border-primary bg-primary/5 ${style.accentBorder}`
                  : 'border-border/30 hover:border-border/60',
              )}
            >
              <div className={cn('rounded-lg p-2 shrink-0 mt-0.5', style.bgColor)}>
                <ChainIcon className={cn('h-4 w-4', style.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-semibold', isActive && 'text-primary')}>{chain.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{chain.description}</p>

                {/* Topology + chain type indicator */}
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                    chain.chainType === 'troubleshooting'
                      ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                      : 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400',
                  )}>
                    <TopoIcon className="h-2.5 w-2.5" />
                    {style.topologyLabel}
                  </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {chain.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded bg-muted/30 px-1 py-0.5 text-[9px] text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span>{chain.totalFiles} 文件</span>
                  <span>{chain.totalFunctions} 函数</span>
                  <span>{chain.totalLinesOfCode.toLocaleString()} 行</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Chain Detail */}
      <Card className="border-border/30">
        <CardContent className="p-5 space-y-4">
          {/* Chain header with type-specific styling */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">{selectedChain.name}</h3>
              <Badge variant="outline" className="text-[10px] font-mono">{selectedChain.version}</Badge>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  selectedChain.chainType === 'troubleshooting'
                    ? 'border-red-300 text-red-600 dark:border-red-800 dark:text-red-400'
                    : 'border-purple-300 text-purple-600 dark:border-purple-800 dark:text-purple-400',
                )}
              >
                {selectedChain.chainType === 'troubleshooting' ? '故障排查' : '集群初始化'}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {selectedChain.topology === 'event-driven' ? (
                <Zap className="h-3 w-3 text-amber-500" />
              ) : (
                <ArrowRightLeft className="h-3 w-3 text-purple-500" />
              )}
              {selectedChain.topology === 'event-driven' ? '事件驱动图' : '顺序流水线'}
            </div>
          </div>

          {/* Call type distribution bar */}
          <CallTypeBar chain={selectedChain} />

          {/* Component badges */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/60 font-medium">涉及组件</span>
            <div className="flex gap-1">
              {selectedChain.components.map((comp) => (
                <Badge key={comp} variant="outline" className="text-[10px]">
                  {comp}
                </Badge>
              ))}
            </div>
          </div>

          {/* Flow viewer + Code panel */}
          <div className={cn('flex gap-4', selectedFile ? 'flex-col lg:flex-row' : '')}>
            <div className={cn('flex-1 min-w-0', selectedFile ? 'lg:max-w-[60%]' : '')}>
              <ChainFlowViewer
                chain={selectedChain}
                selectedFileId={selectedFileId}
                onNodeClick={handleNodeClick}
              />
            </div>
            {selectedFile && (
              <div className="lg:w-[320px] shrink-0">
                <CodeSnippetPanel
                  sourceFile={selectedFile}
                  onClose={() => setSelectedFileId(null)}
                />
              </div>
            )}
          </div>

          {/* Flow Steps - with topology-specific rendering */}
          <div>
            <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wider font-semibold mb-3">
              {selectedChain.topology === 'sequential-pipeline' ? '执行阶段' : '流程步骤'}
            </p>
            {selectedChain.topology === 'sequential-pipeline' ? (
              /* Sequential pipeline: numbered phases with connecting arrows */
              <div className="flex flex-wrap items-center gap-1">
                {selectedChain.flowSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px]',
                      'border-purple-200 bg-purple-50/50 dark:border-purple-800/50 dark:bg-purple-950/20',
                    )}>
                      <span className="flex items-center justify-center h-4 w-4 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </span>
                    {idx < selectedChain.flowSteps.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-purple-400/50 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Event-driven: branching steps with importance markers */
              <div className="space-y-2">
                {selectedChain.flowSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className={cn(
                      'flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold shrink-0 mt-0.5',
                      idx < 3
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                        : idx < 7
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
                          : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
                    )}>
                      {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-[12px] text-muted-foreground leading-relaxed">{step}</p>
                      {idx < selectedChain.flowSteps.length - 1 && (
                        <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0 hidden sm:block" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* RAG Corpus Generation */}
      <RAGCorpusPanel chain={selectedChain} />
    </div>
  );
}
