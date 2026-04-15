import { useState, useMemo } from 'react';
import {
  GitBranch,
  FileCode,
  FunctionSquare,
  Tag,
  ChevronRight,
} from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ChainFlowViewer from '@/components/K8sCorpus/ChainFlowViewer';
import CodeSnippetPanel from '@/components/K8sCorpus/CodeSnippetPanel';
import { K8S_CORPUS } from '@/data/k8sCorpus';
import type { K8sChainId } from '@/types/k8sCorpus';

const CHAIN_ICONS: Record<K8sChainId, { color: string; bgColor: string }> = {
  'pod-not-ready': {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  'kubeadm-init': {
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
};

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

      {/* Chain Selector */}
      <div className="flex gap-3">
        {corpus.chains.map((chain) => {
          const isActive = chain.id === selectedChainId;
          const style = CHAIN_ICONS[chain.id];
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
                  ? 'border-primary bg-primary/5'
                  : 'border-border/30 hover:border-border/60',
              )}
            >
              <div className={cn('rounded-lg p-2 shrink-0 mt-0.5', style?.bgColor)}>
                <GitBranch className={cn('h-4 w-4', style?.color)} />
              </div>
              <div className="min-w-0">
                <p className={cn('text-sm font-semibold', isActive && 'text-primary')}>{chain.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{chain.description}</p>
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
          {/* Chain header */}
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">{selectedChain.name}</h3>
            <Badge variant="outline" className="text-[10px] font-mono">{selectedChain.version}</Badge>
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

          {/* Flow Steps */}
          <div>
            <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wider font-semibold mb-3">
              流程步骤
            </p>
            <div className="space-y-2">
              {selectedChain.flowSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
