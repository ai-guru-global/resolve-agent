import { useState, useMemo } from 'react';
import {
  FileText,
  Code,
  FunctionSquare,
  GitBranch,
  MessageSquare,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Copy,
  Check,
  Wrench,
  Microscope,
  Siren,
  FlaskConical,
  Building2,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { generateRAGCorpus, type RAGDocument, type RAGCorpusResult } from '@/lib/ragCorpusGenerator';
import type { K8sAnalysisChain } from '@/types/k8sCorpus';

interface RAGCorpusPanelProps {
  chain: K8sAnalysisChain;
}

const DOC_TYPE_META: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  // Code analysis types
  overview: { label: '概览', icon: FileText, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
  source_file: { label: '源码文件', icon: Code, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
  function: { label: '函数', icon: FunctionSquare, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30' },
  flow_complete: { label: '完整流程', icon: GitBranch, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
  flow_step: { label: '流程步骤', icon: GitBranch, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
  cross_reference: { label: '组件交互', icon: ArrowRightLeft, color: 'text-red-600 bg-red-50 dark:bg-red-950/30' },
  qa_pair: { label: 'Q&A', icon: MessageSquare, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' },
  // Ops scenario types
  daily_ops: { label: '日常运维', icon: Wrench, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30' },
  deep_troubleshoot: { label: '疑难排查', icon: Microscope, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30' },
  incident_response: { label: '应急响应', icon: Siren, color: 'text-red-500 bg-red-50 dark:bg-red-950/30' },
  testing: { label: '测试验证', icon: FlaskConical, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30' },
  architecture: { label: '架构改进', icon: Building2, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/30' },
  feature_consulting: { label: '功能咨询', icon: BookOpen, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30' },
  product_learning: { label: '产品学习', icon: GraduationCap, color: 'text-lime-600 bg-lime-50 dark:bg-lime-950/30' },
};

// Filter groups: code analysis types + ops scenario types
const CODE_ANALYSIS_FILTER_KEYS = ['overview', 'source_file', 'function', 'flow_complete', 'cross_reference', 'qa_pair'] as const;
const OPS_SCENARIO_FILTER_KEYS = ['daily_ops', 'deep_troubleshoot', 'incident_response', 'testing', 'architecture', 'feature_consulting', 'product_learning'] as const;

function getStatCount(stats: RAGCorpusResult['stats'], key: string): number {
  const mapping: Record<string, number> = {
    overview: stats.overview,
    source_file: stats.sourceFile,
    function: stats.function,
    flow_complete: stats.flow,
    cross_reference: stats.crossReference,
    qa_pair: stats.qaPair,
    daily_ops: stats.dailyOps,
    deep_troubleshoot: stats.deepTroubleshoot,
    incident_response: stats.incidentResponse,
    testing: stats.testing,
    architecture: stats.architecture,
    feature_consulting: stats.featureConsulting,
    product_learning: stats.productLearning,
  };
  return mapping[key] ?? 0;
}

function DocTypeFilter({
  stats,
  activeType,
  onSelect,
}: {
  stats: RAGCorpusResult['stats'];
  activeType: string | null;
  onSelect: (type: string | null) => void;
}) {
  const codeTypes = CODE_ANALYSIS_FILTER_KEYS
    .map((key) => ({ key, count: getStatCount(stats, key) }))
    .filter((t) => t.count > 0);

  const opsTypes = OPS_SCENARIO_FILTER_KEYS
    .map((key) => ({ key, count: getStatCount(stats, key) }))
    .filter((t) => t.count > 0);

  const renderBtn = (key: string, count: number) => {
    const meta = DOC_TYPE_META[key];
    return (
      <button
        key={key}
        onClick={() => onSelect(activeType === key ? null : key)}
        className={cn(
          'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
          activeType === key
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/30 text-muted-foreground hover:bg-muted/50',
        )}
      >
        {meta?.label ?? key} ({count})
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
          activeType === null
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/30 text-muted-foreground hover:bg-muted/50',
        )}
      >
        全部 ({stats.total})
      </button>
      {codeTypes.map((t) => renderBtn(t.key, t.count))}
      {opsTypes.length > 0 && (
        <div className="w-px h-5 bg-border/40 mx-0.5" />
      )}
      {opsTypes.map((t) => renderBtn(t.key, t.count))}
    </div>
  );
}

function DocumentCard({ doc }: { doc: RAGDocument }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const meta = DOC_TYPE_META[doc.docType] ?? DOC_TYPE_META.overview!;
  const Icon = meta.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(doc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const preview = doc.content.slice(0, 200).replace(/\n/g, ' ').trim();

  return (
    <div className="rounded-md border border-border/30 bg-background overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/20 transition-colors"
      >
        <div className={cn('rounded p-1 shrink-0 mt-0.5', meta.color)}>
          <Icon className="h-3 w-3" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-semibold truncate">{doc.title}</p>
            <Badge variant="outline" className="text-[9px] shrink-0">{meta.label}</Badge>
          </div>
          {!expanded && (
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{preview}...</p>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/20 px-3 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {doc.content.length.toLocaleString()} 字符 · ID: {doc.id}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <pre className="bg-muted/20 rounded-md p-3 text-[11px] font-mono overflow-x-auto max-h-[300px] overflow-y-auto leading-relaxed whitespace-pre-wrap border border-border/10">
            {doc.content}
          </pre>
          {/* Metadata */}
          <div className="flex flex-wrap gap-1">
            {Object.entries(doc.metadata)
              .filter(([k]) => !['source', 'tags', 'components'].includes(k))
              .slice(0, 6)
              .map(([k, v]) => (
                <span key={k} className="rounded bg-muted/20 px-1.5 py-0.5 text-[9px] text-muted-foreground font-mono">
                  {k}: {String(v)}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatsGroup({
  title,
  accentColor,
  items,
  subtotal,
}: {
  title: string;
  accentColor: string;
  items: { label: string; value: number; color: string }[];
  subtotal: number;
}) {
  return (
    <div className={cn('border-l-2 pl-3', accentColor)}>
      <p className="text-[10px] font-medium text-muted-foreground mb-1.5">{title}</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-1.5">
        {items.map((s) => (
          <div key={s.label} className="rounded-md bg-muted/20 border border-border/20 px-2 py-1.5 text-center">
            <p className={cn('text-base font-bold tabular-nums', s.color)}>{s.value}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
        <div className="rounded-md bg-muted/30 border border-border/30 px-2 py-1.5 text-center">
          <p className="text-base font-bold tabular-nums text-foreground/70">{subtotal}</p>
          <p className="text-[9px] text-muted-foreground">小计</p>
        </div>
      </div>
    </div>
  );
}

export default function RAGCorpusPanel({ chain }: RAGCorpusPanelProps) {
  const [generated, setGenerated] = useState(false);
  const [activeType, setActiveType] = useState<string | null>(null);

  const corpus = useMemo(() => {
    if (!generated) return null;
    return generateRAGCorpus(chain);
  }, [generated, chain]);

  const filteredDocs = useMemo(() => {
    if (!corpus) return [];
    if (!activeType) return corpus.documents;
    return corpus.documents.filter((d) => d.docType === activeType || d.docType.startsWith(activeType));
  }, [corpus, activeType]);

  // Reset when chain changes
  const [prevChainId, setPrevChainId] = useState(chain.id);
  if (chain.id !== prevChainId) {
    setPrevChainId(chain.id);
    setGenerated(false);
    setActiveType(null);
  }

  if (!generated) {
    return (
      <Card className="border-border/30 border-dashed">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                RAG 语料生成
              </h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                基于当前调用链 &ldquo;{chain.name}&rdquo; 的源码文件、函数签名、调用关系和执行流程，
                自动生成结构化 RAG 语料文档（代码分析 + 运维场景共 14 类），用于检索增强生成。
              </p>
            </div>
            <button
              onClick={() => setGenerated(true)}
              className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              生成语料
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!corpus) return null;

  const codeSubtotal = corpus.stats.overview + corpus.stats.sourceFile + corpus.stats.function +
    corpus.stats.flow + corpus.stats.crossReference + corpus.stats.qaPair;
  const opsSubtotal = corpus.stats.dailyOps + corpus.stats.deepTroubleshoot + corpus.stats.incidentResponse +
    corpus.stats.testing + corpus.stats.architecture + corpus.stats.featureConsulting + corpus.stats.productLearning;

  return (
    <Card className="border-border/30">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            RAG 语料 — {chain.name}
          </h4>
          <button
            onClick={() => { setGenerated(false); setActiveType(null); }}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            重新生成
          </button>
        </div>

        {/* Grouped stats */}
        <div className="space-y-3">
          <StatsGroup
            title="代码分析"
            accentColor="border-blue-400"
            items={[
              { label: '概览', value: corpus.stats.overview, color: 'text-blue-600' },
              { label: '源码文件', value: corpus.stats.sourceFile, color: 'text-emerald-600' },
              { label: '函数', value: corpus.stats.function, color: 'text-purple-600' },
              { label: '流程', value: corpus.stats.flow, color: 'text-amber-600' },
              { label: '组件交互', value: corpus.stats.crossReference, color: 'text-red-600' },
              { label: 'Q&A', value: corpus.stats.qaPair, color: 'text-indigo-600' },
            ]}
            subtotal={codeSubtotal}
          />
          <StatsGroup
            title="运维场景"
            accentColor="border-orange-400"
            items={[
              { label: '日常运维', value: corpus.stats.dailyOps, color: 'text-orange-600' },
              { label: '疑难排查', value: corpus.stats.deepTroubleshoot, color: 'text-rose-600' },
              { label: '应急响应', value: corpus.stats.incidentResponse, color: 'text-red-500' },
              { label: '测试验证', value: corpus.stats.testing, color: 'text-cyan-600' },
              { label: '架构改进', value: corpus.stats.architecture, color: 'text-sky-600' },
              { label: '功能咨询', value: corpus.stats.featureConsulting, color: 'text-violet-600' },
              { label: '产品学习', value: corpus.stats.productLearning, color: 'text-lime-600' },
            ]}
            subtotal={opsSubtotal}
          />
          <div className="flex justify-end">
            <div className="rounded-md bg-primary/10 border border-primary/20 px-3 py-1.5 text-center">
              <span className="text-sm font-bold tabular-nums text-primary">{corpus.stats.total}</span>
              <span className="text-[10px] text-muted-foreground ml-1.5">总计</span>
            </div>
          </div>
        </div>

        {/* Filter */}
        <DocTypeFilter stats={corpus.stats} activeType={activeType} onSelect={setActiveType} />

        {/* Document list */}
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
          {filteredDocs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
