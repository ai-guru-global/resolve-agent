import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Layers,
  Search,
  FileText,
  Activity,
  Code2,
  BookOpen,
  GitBranch,
  Zap,
  ChevronRight,
  ArrowRight,
  Cpu,
  Database,
  Bot,
  Target,
  Play,
  Pause,
  CheckCircle2,
  Shield,
  MemoryStick,
  Settings2,
  Workflow,
  ArrowDown,
  Eye,
  EyeOff,
  Library,
  Braces,
  Route,
  Scan,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { SelectorStrategy, IntentType, CorpusMatch } from '@/types';

/* ═══════════════════════════ DATA ═══════════════════════════ */

const SKILLS = [
  { id: 'web-search', name: 'Web 搜索', desc: '搜索互联网获取最新信息', icon: Search, accent: 'hsl(40 92% 52%)' },
  { id: 'log-analyzer', name: '日志分析', desc: '解析错误模式与异常检测', icon: FileText, accent: 'hsl(142 71% 45%)' },
  { id: 'metrics-checker', name: '指标检查', desc: '系统指标阈值告警检测', icon: Activity, accent: 'hsl(40 70% 60%)' },
  { id: 'code-analysis', name: '代码分析', desc: '静态分析检测潜在缺陷', icon: Code2, accent: 'hsl(220 8% 70%)' },
  { id: 'knowledge-retrieval', name: '知识检索', desc: 'RAG 语义检索知识库', icon: BookOpen, accent: 'hsl(0 72% 51%)' },
];

const ROUTE_TYPES = [
  { type: 'skill', label: '技能执行器', icon: Zap, color: 'hsl(40 92% 52%)' },
  { type: 'rag', label: '知识检索 RAG', icon: Database, color: 'hsl(142 71% 45%)' },
  { type: 'fta', label: '故障树分析', icon: GitBranch, color: 'hsl(40 70% 60%)' },
  { type: 'code_analysis', label: '代码分析', icon: Code2, color: 'hsl(220 8% 70%)' },
  { type: 'direct', label: '直接对话', icon: Brain, color: 'hsl(220 8% 55%)' },
  { type: 'multi', label: '多路由组合', icon: Layers, color: 'hsl(0 72% 51%)' },
];

interface DemoScenario {
  input: string;
  routeType: string;
  routeTarget: string;
  confidence: number;
  intentCategory: string;
  keywords: string[];
  label: string;
  color: string;
  trace: {
    strategy: SelectorStrategy;
    intent: { type: IntentType; confidence: number; sub_intents: IntentType[] };
    corpus_matches: CorpusMatch[];
    enriched_skills: string[];
    reasoning: string;
    pipeline_latency_ms: number;
  };
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    input: '帮我搜索 Kubernetes 最佳实践',
    routeType: 'skill', routeTarget: 'web-search', confidence: 83,
    intentCategory: 'task_execution', keywords: ['搜索'], label: '技能执行器', color: 'hsl(40 92% 52%)',
    trace: {
      strategy: 'hybrid', intent: { type: 'skill', confidence: 0.83, sub_intents: ['rag'] },
      corpus_matches: [{ collection_id: 'col-ops-kb-003', collection_name: 'K8s 最佳实践', relevance_score: 0.72, matched_keywords: ['Kubernetes', '最佳实践'], document_count: 89 }],
      enriched_skills: ['web-search', 'knowledge-retrieval'],
      reasoning: 'Hybrid (rule): 匹配 skill 模式 — 搜索关键字触发 web-search skill', pipeline_latency_ms: 12,
    },
  },
  {
    input: '分析一下 /var/log/app 的错误日志',
    routeType: 'skill', routeTarget: 'log-analyzer', confidence: 93,
    intentCategory: 'task_execution', keywords: ['日志', 'log'], label: '技能执行器', color: 'hsl(40 92% 52%)',
    trace: {
      strategy: 'hybrid', intent: { type: 'skill', confidence: 0.93, sub_intents: [] },
      corpus_matches: [], enriched_skills: ['log-analyzer', 'metric-alerter'],
      reasoning: 'Hybrid (rule): 高置信度规则匹配 — 日志分析模式', pipeline_latency_ms: 8,
    },
  },
  {
    input: '检查服务器的 CPU 和内存使用情况',
    routeType: 'skill', routeTarget: 'metrics-checker', confidence: 95,
    intentCategory: 'task_execution', keywords: ['CPU', '内存'], label: '技能执行器', color: 'hsl(40 92% 52%)',
    trace: {
      strategy: 'hybrid', intent: { type: 'skill', confidence: 0.95, sub_intents: [] },
      corpus_matches: [], enriched_skills: ['metric-alerter', 'metrics-checker'],
      reasoning: 'Hybrid (rule): 指标检查关键字匹配', pipeline_latency_ms: 6,
    },
  },
  {
    input: '502 错误怎么处理？',
    routeType: 'rag', routeTarget: 'support-knowledge-base', confidence: 92,
    intentCategory: 'information_retrieval', keywords: ['怎么', '502'], label: '知识检索', color: 'hsl(142 71% 45%)',
    trace: {
      strategy: 'hybrid', intent: { type: 'rag', confidence: 0.88, sub_intents: ['workflow'] },
      corpus_matches: [
        { collection_id: 'col-ops-kb-001', collection_name: '阿里云产品运维手册', relevance_score: 0.91, matched_keywords: ['502', '错误', 'SLB'], document_count: 347 },
        { collection_id: 'col-ops-kb-002', collection_name: '历史故障复盘文档', relevance_score: 0.78, matched_keywords: ['502', '故障'], document_count: 156 },
        { collection_id: 'col-ops-kb-004', collection_name: '内部运维 SOP 流程', relevance_score: 0.65, matched_keywords: ['处理', 'SOP'], document_count: 63 },
      ],
      enriched_skills: ['consulting-qa'],
      reasoning: 'Hybrid (ensemble): 规则+LLM 一致确认 RAG 问题模式，加权融合', pipeline_latency_ms: 45,
    },
  },
  {
    input: '线上服务响应变慢，帮我诊断原因',
    routeType: 'fta', routeTarget: 'incident-diagnosis', confidence: 83,
    intentCategory: 'complex_analysis', keywords: ['诊断'], label: '故障树分析', color: 'hsl(40 70% 60%)',
    trace: {
      strategy: 'hybrid', intent: { type: 'workflow', confidence: 0.83, sub_intents: ['skill'] },
      corpus_matches: [{ collection_id: 'col-ops-kb-002', collection_name: '历史故障复盘文档', relevance_score: 0.85, matched_keywords: ['响应慢', '诊断'], document_count: 156 }],
      enriched_skills: ['log-analyzer', 'metric-alerter'],
      reasoning: 'Hybrid (rule): 诊断/troubleshoot 模式匹配 → FTA workflow', pipeline_latency_ms: 15,
    },
  },
  {
    input: '分析这段代码有没有潜在的bug\n```python\ndef process(data):\n  result = eval(data["expr"])\n  return result\n```',
    routeType: 'code_analysis', routeTarget: 'static-analyzer', confidence: 93,
    intentCategory: 'code_review', keywords: ['代码', 'bug'], label: '代码分析', color: 'hsl(220 8% 70%)',
    trace: {
      strategy: 'hybrid', intent: { type: 'code_analysis', confidence: 0.95, sub_intents: [] },
      corpus_matches: [{ collection_id: 'col-ops-kb-005', collection_name: '安全基线与合规指南', relevance_score: 0.73, matched_keywords: ['安全', 'eval'], document_count: 42 }],
      enriched_skills: ['code-analysis'],
      reasoning: 'Hybrid (rule): 代码块检测 + eval() 风险模式 → code_analysis +0.1 boost', pipeline_latency_ms: 18,
    },
  },
  {
    input: '你好，你是谁？',
    routeType: 'direct', routeTarget: '', confidence: 95,
    intentCategory: 'general_conversation', keywords: [], label: '直接对话', color: 'hsl(220 8% 55%)',
    trace: {
      strategy: 'hybrid', intent: { type: 'direct', confidence: 0.95, sub_intents: [] },
      corpus_matches: [], enriched_skills: [],
      reasoning: 'Hybrid (rule): 无匹配模式，默认 direct 对话路由', pipeline_latency_ms: 3,
    },
  },
];

const HARNESS_LAYERS = [
  { label: '用户请求', sub: 'CLI · WebUI · API', icon: Bot, color: 'hsl(40 10% 92%)' },
  { label: 'Hooks / Middleware', sub: '拦截 · 预处理 · 校验', icon: Shield, color: 'hsl(40 92% 52%)' },
  { label: 'Orchestration', sub: '意图分析 · 路由决策', icon: Workflow, color: 'hsl(40 70% 60%)' },
  { label: 'Tools / Skills', sub: '技能执行 · FTA · RAG', icon: Zap, color: 'hsl(142 71% 45%)' },
  { label: 'Infrastructure', sub: '沙箱 · 文件系统 · 代码', icon: Settings2, color: 'hsl(220 8% 70%)' },
  { label: 'Memory', sub: '持久记忆 · 知识检索 · 上下文', icon: MemoryStick, color: 'hsl(0 72% 51%)' },
];

/* ═══════════════════ UTILITY COMPONENTS ═══════════════════ */

function ConfidenceBar({ value, color, animated }: { value: number; color?: string; animated: boolean }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (animated) {
      const t = setTimeout(() => setWidth(value), 150);
      return () => clearTimeout(t);
    }
    setWidth(value);
  }, [value, animated]);

  const barColor = color ?? 'hsl(40 92% 52%)';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${width}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-sm font-mono font-bold tabular-nums w-12 text-right" style={{ color: barColor }}>
        {value}%
      </span>
    </div>
  );
}

function RouteTypeBadge({ type }: { type: string }) {
  const rt = ROUTE_TYPES.find((r) => r.type === type);
  if (!rt) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold"
      style={{ borderColor: `color-mix(in srgb, ${rt.color} 20%, transparent)`, backgroundColor: `color-mix(in srgb, ${rt.color} 8%, transparent)`, color: rt.color }}
    >
      <rt.icon className="h-3 w-3" />
      {rt.label}
    </span>
  );
}

function SectionHeader({ badge, title, subtitle }: { badge: string; title: string; subtitle: string }) {
  return (
    <div className="mb-12">
      <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground mb-4">{badge}</p>
      <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-lg">{subtitle}</p>
    </div>
  );
}

/* ═══════════════════ HERO SECTION ═══════════════════ */

const CORE_INNOVATIONS = [
  { label: '智能选择器', desc: 'LLM 驱动元路由', icon: Route, color: 'hsl(40 92% 52%)' },
  { label: 'FTA 引擎', desc: '故障树分析诊断', icon: GitBranch, color: 'hsl(280 60% 55%)' },
  { label: '技能系统', desc: '沙箱化原子执行', icon: Zap, color: 'hsl(142 71% 45%)' },
  { label: 'RAG 管道', desc: '检索增强生成', icon: Database, color: 'hsl(200 70% 50%)' },
  { label: '代码分析', desc: '静态+动态引擎', icon: Scan, color: 'hsl(25 80% 55%)' },
];

function HeroSection({ onScrollDown: _onScrollDown }: { onScrollDown: () => void }) {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[520px] flex items-center">
      <div className="relative max-w-5xl mx-auto px-4 py-20">
        {/* Status pill */}
        <div className="inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-4 py-1.5 mb-10 animate-slide-up">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground/60 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-foreground" />
          </span>
          <span className="text-xs text-muted-foreground font-medium tracking-wide">Agent = Model + Harness</span>
        </div>

        {/* Title */}
        <h1 className="animate-slide-up text-5xl sm:text-6xl lg:text-7xl font-display font-extrabold tracking-tighter mb-5" style={{ animationDelay: '0.1s' }}>
          Resolve Agent
        </h1>

        <p className="animate-slide-up text-lg text-muted-foreground mb-3 max-w-lg" style={{ animationDelay: '0.2s' }}>
          面向问题解决的综合智能体 — 通过智能路由协调五大核心引擎，实现自适应故障诊断与知识检索
        </p>

        {/* Core Innovations Pills */}
        <div className="animate-slide-up flex flex-wrap items-center gap-2 mb-10" style={{ animationDelay: '0.28s' }}>
          {CORE_INNOVATIONS.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-[1.03]"
              style={{
                borderColor: `color-mix(in srgb, ${item.color} 25%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${item.color} 6%, transparent)`,
              }}
            >
              <item.icon className="h-3 w-3" style={{ color: item.color }} />
              <span className="font-semibold" style={{ color: item.color }}>{item.label}</span>
              <span className="text-muted-foreground/60 hidden sm:inline">· {item.desc}</span>
            </span>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="animate-slide-up flex flex-col sm:flex-row items-start gap-3" style={{ animationDelay: '0.38s' }}>
          <button
            onClick={() => navigate('/agents')}
            className="group inline-flex items-center gap-2.5 rounded-lg bg-foreground text-background px-6 py-2.5 text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          >
            <Bot className="h-4 w-4" />
            管理 Agents
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={() => navigate('/playground')}
            className="group inline-flex items-center gap-2.5 rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-all duration-200 active:scale-[0.98]"
          >
            <Brain className="h-4 w-4" />
            对话测试
          </button>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ ARCHITECTURE COMPARISON ═══════════════ */

const ARCH_COLORS = {
  bg: 'hsl(var(--background))',
  card: 'hsl(var(--card))',
  border: 'hsl(var(--border))',
  text: 'hsl(var(--foreground))',
  muted: 'hsl(var(--muted-foreground))',
  amber: 'hsl(40 92% 52%)',
  green: 'hsl(142 71% 45%)',
  purple: 'hsl(280 60% 55%)',
  blue: 'hsl(200 70% 50%)',
  orange: 'hsl(25 80% 55%)',
  red: 'hsl(0 72% 51%)',
};

function ArchitectureComparison() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <SectionHeader
        badge="Architecture Evolution"
        title="架构演进对比"
        subtitle="从传统 Agent 到 ResolveAgent — 理解智能体平台的三代架构范式差异"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── 传统 Agent 架构 ── */}
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 transition-all hover:border-border">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Bot className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold">传统 Agent</h3>
              <p className="text-[10px] text-muted-foreground">固定流水线</p>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            {[
              { label: '用户输入', sub: 'User Query' },
              { label: '固定 Prompt', sub: 'Static Template' },
              { label: 'LLM 调用', sub: 'Single Model' },
              { label: '固定输出', sub: 'Response' },
            ].map((step, i) => (
              <div key={step.label}>
                <div className="flex items-center gap-2 rounded-md border border-border/40 bg-background/50 px-3 py-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-muted-foreground bg-muted">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-[11px] font-medium">{step.label}</p>
                    <p className="text-[9px] text-muted-foreground">{step.sub}</p>
                  </div>
                </div>
                {i < 3 && <div className="flex justify-center"><ArrowDown className="h-3 w-3 text-muted-foreground/20 my-0.5" /></div>}
              </div>
            ))}
          </div>
          <div className="rounded-md bg-muted/30 border border-border/30 p-2.5">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground/70">局限</span> — 单一处理路径，无法根据意图动态调度，缺少工具执行和知识检索能力
            </p>
          </div>
        </div>

        {/* ── Agent Harness 架构 ── */}
        <div className="rounded-xl border border-primary/20 bg-card/50 p-5 transition-all hover:border-primary/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${ARCH_COLORS.amber} 12%, transparent)` }}>
              <Shield className="h-4 w-4" style={{ color: ARCH_COLORS.amber }} />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold">Agent Harness</h3>
              <p className="text-[10px] text-muted-foreground">Model + 非模型逻辑</p>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 rounded-md border border-border/40 bg-background/50 px-3 py-2">
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-[11px] font-medium">用户输入</p>
              </div>
            </div>
            <div className="flex justify-center"><ArrowDown className="h-3 w-3 text-muted-foreground/20 my-0.5" /></div>
            <div className="rounded-lg border-2 border-dashed border-primary/15 bg-primary/[0.02] p-2.5 space-y-1.5">
              <p className="text-[9px] text-primary/60 font-semibold uppercase tracking-wider">Harness Layer</p>
              {[
                { label: 'Hooks / 中间件', icon: Shield },
                { label: 'Orchestration', icon: Workflow },
                { label: 'Tool 执行', icon: Zap },
                { label: 'Memory / 上下文', icon: MemoryStick },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded border border-border/30 bg-background/40 px-2.5 py-1.5">
                  <item.icon className="h-3 w-3 text-primary/50" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center"><ArrowDown className="h-3 w-3 text-muted-foreground/20 my-0.5" /></div>
            <div className="flex items-center gap-2 rounded-md border border-border/40 bg-background/50 px-3 py-2">
              <Brain className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-[11px] font-medium">LLM 推理</p>
                <p className="text-[9px] text-muted-foreground">多模型可切换</p>
              </div>
            </div>
          </div>
          <div className="rounded-md bg-primary/[0.03] border border-primary/15 p-2.5">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground/70">进步</span> — 将模型与非模型逻辑分离，支持生命周期管理，但缺少专用子系统协调能力
            </p>
          </div>
        </div>

        {/* ── ResolveAgent 综合架构 ── */}
        <div className="rounded-xl border-2 border-primary/25 bg-card/60 p-5 transition-all hover:border-primary/35 relative overflow-hidden">
          {/* Highlight badge */}
          <div className="absolute top-3 right-3">
            <span className="text-[9px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">ResolveAgent</span>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
              <span className="text-[10px] font-display font-extrabold text-background">R</span>
            </div>
            <div>
              <h3 className="text-sm font-display font-bold">ResolveAgent</h3>
              <p className="text-[10px] text-muted-foreground">Harness + 智能路由 + 五大引擎</p>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 rounded-md border border-border/40 bg-background/50 px-3 py-2">
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-medium flex-1">用户输入</p>
            </div>
            <div className="flex justify-center"><ArrowDown className="h-3 w-3 text-primary/30 my-0.5" /></div>

            {/* Intelligent Selector */}
            <div className="rounded-lg border border-primary/20 p-2.5" style={{ backgroundColor: `color-mix(in srgb, ${ARCH_COLORS.amber} 5%, transparent)` }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Route className="h-3 w-3" style={{ color: ARCH_COLORS.amber }} />
                <span className="text-[10px] font-bold" style={{ color: ARCH_COLORS.amber }}>智能选择器</span>
                <span className="text-[8px] text-muted-foreground ml-auto">Intent → Context → Route</span>
              </div>
              <div className="flex gap-1">
                {['规则', 'LLM', '混合'].map((s) => (
                  <span key={s} className="text-[8px] rounded bg-background/60 border border-border/30 px-1.5 py-0.5 text-muted-foreground">{s}</span>
                ))}
              </div>
            </div>
            <div className="flex justify-center"><ArrowDown className="h-3 w-3 text-primary/30 my-0.5" /></div>

            {/* Five Engines */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'FTA 引擎', icon: GitBranch, color: ARCH_COLORS.purple },
                { label: '技能系统', icon: Zap, color: ARCH_COLORS.green },
                { label: 'RAG 管道', icon: Database, color: ARCH_COLORS.blue },
                { label: '代码分析', icon: Scan, color: ARCH_COLORS.orange },
              ].map((eng) => (
                <div
                  key={eng.label}
                  className="flex items-center gap-1.5 rounded border px-2 py-1.5"
                  style={{
                    borderColor: `color-mix(in srgb, ${eng.color} 20%, transparent)`,
                    backgroundColor: `color-mix(in srgb, ${eng.color} 4%, transparent)`,
                  }}
                >
                  <eng.icon className="h-3 w-3" style={{ color: eng.color }} />
                  <span className="text-[10px] font-semibold" style={{ color: eng.color }}>{eng.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md bg-primary/[0.04] border border-primary/15 p-2.5">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground/70">创新</span> — 智能选择器动态路由 + 五大引擎协同执行，自适应工作流调度，上下文增强决策
            </p>
          </div>
        </div>
      </div>

      {/* Architecture Flow SVG */}
      <div className="mt-8 rounded-xl border border-border/50 bg-card/30 p-6 overflow-x-auto">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground mb-5">ResolveAgent 完整数据流</p>
        <ArchFlowDiagram />
      </div>
    </section>
  );
}

function ArchFlowDiagram() {
  const W = 860;
  const H = 340;
  const C = {
    bg: '#f8f6f3', stroke: '#4a4a4a', text: '#1a1a1a', muted: '#6a6a6a', arrow: '#5a5a5a',
    amber: '#e4a83c', green: '#48b07a', purple: '#9466cc', blue: '#3a9fd6', orange: '#d97a3e',
    blueBg: '#e8f0f8', greenBg: '#e4f5ec', purpleBg: '#f0e8f8', orangeBg: '#fdf0e4', amberBg: '#fdf4e0',
    grayBg: '#eeedeb',
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, margin: '0 auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
      <style>{`text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }`}</style>
      <defs>
        <marker id="af-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <polygon points="0 0, 8 4, 0 8" fill={C.arrow} />
        </marker>
        <filter id="af-shadow" x="-5%" y="-5%" width="110%" height="115%">
          <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#00000008" />
        </filter>
      </defs>
      <rect width={W} height={H} fill={C.bg} rx="8" />

      {/* Row 1: User Request */}
      <rect x={350} y={16} width={160} height={36} rx={10} fill={C.blueBg} stroke={C.stroke} strokeWidth={1.5} />
      <text x={430} y={38} textAnchor="middle" fill={C.text} fontSize={11} fontWeight={600}>User Request</text>

      {/* Arrow to Selector */}
      <line x1={430} y1={52} x2={430} y2={76} stroke={C.arrow} strokeWidth={1.5} markerEnd="url(#af-arrow)" />

      {/* Row 2: Intelligent Selector */}
      <rect x={240} y={80} width={380} height={52} rx={12} fill={C.amberBg} stroke={C.amber} strokeWidth={2} filter="url(#af-shadow)" />
      <text x={310} y={100} fill={C.amber} fontSize={11} fontWeight={700}>Intelligent Selector</text>
      <text x={310} y={118} fill={C.muted} fontSize={9}>Intent Analysis → Context Enrichment → Route Decision</text>
      {/* Strategy badges */}
      <rect x={530} y={91} width={38} height={16} rx={4} fill="rgba(228,168,60,0.15)" />
      <text x={549} y={103} textAnchor="middle" fill={C.amber} fontSize={8} fontWeight={600}>Rule</text>
      <rect x={572} y={91} width={38} height={16} rx={4} fill="rgba(228,168,60,0.15)" />
      <text x={591} y={103} textAnchor="middle" fill={C.amber} fontSize={8} fontWeight={600}>LLM</text>

      {/* Arrows to 5 engines */}
      <line x1={210} y1={132} x2={120} y2={162} stroke={C.arrow} strokeWidth={1.5} markerEnd="url(#af-arrow)" />
      <line x1={330} y1={132} x2={280} y2={162} stroke={C.arrow} strokeWidth={1.5} markerEnd="url(#af-arrow)" />
      <line x1={430} y1={132} x2={430} y2={162} stroke={C.arrow} strokeWidth={1.5} markerEnd="url(#af-arrow)" />
      <line x1={530} y1={132} x2={580} y2={162} stroke={C.arrow} strokeWidth={1.5} markerEnd="url(#af-arrow)" />
      <line x1={650} y1={132} x2={730} y2={162} stroke={C.arrow} strokeWidth={1.5} markerEnd="url(#af-arrow)" />

      {/* Row 3: Five Engines */}
      {/* FTA Engine */}
      <rect x={40} y={166} width={150} height={56} rx={10} fill={C.purpleBg} stroke={C.purple} strokeWidth={1.5} filter="url(#af-shadow)" />
      <text x={115} y={188} textAnchor="middle" fill={C.purple} fontSize={11} fontWeight={700}>FTA 引擎</text>
      <text x={115} y={204} textAnchor="middle" fill={C.muted} fontSize={8}>故障树 · 最小割集 · MC仿真</text>

      {/* Skills System */}
      <rect x={205} y={166} width={150} height={56} rx={10} fill={C.greenBg} stroke={C.green} strokeWidth={1.5} filter="url(#af-shadow)" />
      <text x={280} y={188} textAnchor="middle" fill={C.green} fontSize={11} fontWeight={700}>技能系统</text>
      <text x={280} y={204} textAnchor="middle" fill={C.muted} fontSize={8}>沙箱执行 · 原子化能力单元</text>

      {/* RAG Pipeline */}
      <rect x={370} y={166} width={150} height={56} rx={10} fill={C.blueBg} stroke={C.blue} strokeWidth={1.5} filter="url(#af-shadow)" />
      <text x={445} y={188} textAnchor="middle" fill={C.blue} fontSize={11} fontWeight={700}>RAG 管道</text>
      <text x={445} y={204} textAnchor="middle" fill={C.muted} fontSize={8}>BGE嵌入 · 三级重排 · 向量检索</text>

      {/* Code Analysis */}
      <rect x={535} y={166} width={150} height={56} rx={10} fill={C.orangeBg} stroke={C.orange} strokeWidth={1.5} filter="url(#af-shadow)" />
      <text x={610} y={188} textAnchor="middle" fill={C.orange} fontSize={11} fontWeight={700}>代码分析</text>
      <text x={610} y={204} textAnchor="middle" fill={C.muted} fontSize={8}>AST调用图 · 动态依赖分析</text>

      {/* Ticket Summary */}
      <rect x={700} y={166} width={150} height={56} rx={10} fill={C.grayBg} stroke={C.stroke} strokeWidth={1.5} filter="url(#af-shadow)" />
      <text x={775} y={188} textAnchor="middle" fill={C.text} fontSize={11} fontWeight={700}>工单摘要</text>
      <text x={775} y={204} textAnchor="middle" fill={C.muted} fontSize={8}>知识生产 · 经验沉淀</text>

      {/* Arrows to data layer */}
      <line x1={115} y1={222} x2={115} y2={248} stroke={C.arrow} strokeWidth={1} strokeDasharray="4,3" markerEnd="url(#af-arrow)" />
      <line x1={280} y1={222} x2={280} y2={248} stroke={C.arrow} strokeWidth={1} strokeDasharray="4,3" markerEnd="url(#af-arrow)" />
      <line x1={445} y1={222} x2={445} y2={248} stroke={C.arrow} strokeWidth={1} strokeDasharray="4,3" markerEnd="url(#af-arrow)" />
      <line x1={610} y1={222} x2={610} y2={248} stroke={C.arrow} strokeWidth={1} strokeDasharray="4,3" markerEnd="url(#af-arrow)" />
      <line x1={775} y1={222} x2={775} y2={248} stroke={C.arrow} strokeWidth={1} strokeDasharray="4,3" markerEnd="url(#af-arrow)" />

      {/* Row 4: Shared Infrastructure */}
      <rect x={40} y={252} width={810} height={40} rx={10} fill={C.grayBg} stroke={C.stroke} strokeWidth={1.5} />
      <text x={W / 2} y={268} textAnchor="middle" fill={C.text} fontSize={11} fontWeight={600}>Shared Data Layer</text>
      <text x={W / 2} y={282} textAnchor="middle" fill={C.muted} fontSize={9}>PostgreSQL · Redis · NATS · Milvus / Qdrant · Go Registry (Single Source of Truth)</text>

      {/* Layer labels */}
      <text x={20} y={38} fill={C.muted} fontSize={9} fontWeight={600}>Input</text>
      <text x={20} y={108} fill={C.muted} fontSize={9} fontWeight={600}>Router</text>
      <text x={20} y={196} fill={C.muted} fontSize={9} fontWeight={600}>Engines</text>
      <text x={20} y={274} fill={C.muted} fontSize={9} fontWeight={600}>Data</text>

      {/* Legend */}
      <g transform="translate(680, 298)">
        <text x={0} y={12} fill={C.muted} fontSize={8}>动态路由</text>
        <line x1={42} y1={9} x2={62} y2={9} stroke={C.arrow} strokeWidth={1.5} markerEnd="url(#af-arrow)" />
        <text x={80} y={12} fill={C.muted} fontSize={8}>数据流</text>
        <line x1={112} y1={9} x2={132} y2={9} stroke={C.arrow} strokeWidth={1} strokeDasharray="4,3" markerEnd="url(#af-arrow)" />
      </g>
    </svg>
  );
}

/* ═══════════════ HARNESS ARCHITECTURE ═══════════════ */

function HarnessArchitecture() {
  return (
    <section className="max-w-4xl mx-auto px-4 py-16">
      <SectionHeader
        badge="Harness Architecture"
        title="Agent = Model + Harness"
        subtitle="Harness 是模型之外的所有代码、配置和执行逻辑 — 将模型智能转化为可用的工作引擎"
      />

      <div className="space-y-2 max-w-2xl mx-auto">
        {HARNESS_LAYERS.map((layer, i) => (
          <div
            key={layer.label}
            className="animate-slide-up flex items-center gap-4 rounded-lg border border-border/30 bg-card/30 px-5 py-4 transition-all duration-200 hover:bg-card/50 hover:border-border/50"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `color-mix(in srgb, ${layer.color} 12%, transparent)` }}
            >
              <layer.icon className="h-5 w-5" style={{ color: layer.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{layer.label}</p>
              <p className="text-[11px] text-muted-foreground">{layer.sub}</p>
            </div>
            {i < HARNESS_LAYERS.length - 1 && (
              <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════ TWO MODES — HARNESS EXECUTION ═══════════════ */

function ModesComparison() {
  const [activeMode, setActiveMode] = useState<'all' | 'selector'>('all');

  return (
    <section className="max-w-5xl mx-auto px-4 py-16">
      <SectionHeader
        badge="Harness Execution Modes"
        title="两种 Harness 执行模式"
        subtitle="Harness 编排逻辑决定 Agent 如何调度 Tools/Skills"
      />

      {/* Mode toggle */}
      <div className="flex mb-8">
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          <button
            onClick={() => setActiveMode('all')}
            className={cn(
              'rounded-md px-5 py-2 text-sm font-medium transition-all duration-200',
              activeMode === 'all' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Layers className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
            全 Skills 模式
          </button>
          <button
            onClick={() => setActiveMode('selector')}
            className={cn(
              'rounded-md px-5 py-2 text-sm font-medium transition-all duration-200',
              activeMode === 'selector' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Brain className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
            选择器模式
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* All Skills Mode */}
        <div className={cn(
          'rounded-xl border p-6 transition-all duration-300',
          activeMode === 'all' ? 'border-foreground/20 bg-card' : 'border-border bg-card/50 opacity-50',
        )}>
          <div className="flex items-center gap-3 mb-5">
            <Layers className="h-5 w-5" />
            <div>
              <h3 className="text-base font-display font-bold">全 Skills 模式</h3>
              <p className="text-xs text-muted-foreground">Harness 将所有 Tools/Skills 并行触发，结果聚合</p>
            </div>
          </div>

          <div className="space-y-1 mb-5">
            {SKILLS.map((skill) => (
              <div key={skill.id} className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
                <skill.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium flex-1">{skill.name}</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/40" />
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-4">
            全面覆盖所有分析维度 · 并行执行效率最大化 · 综合结果聚合输出
          </p>
        </div>

        {/* Selector Mode */}
        <div className={cn(
          'rounded-xl border p-6 transition-all duration-300',
          activeMode === 'selector' ? 'border-foreground/20 bg-card' : 'border-border bg-card/50 opacity-50',
        )}>
          <div className="flex items-center gap-3 mb-5">
            <Brain className="h-5 w-5" />
            <div>
              <h3 className="text-base font-display font-bold">选择器模式</h3>
              <p className="text-xs text-muted-foreground">Harness 的 Orchestration Logic 分析意图后精准路由</p>
            </div>
          </div>

          {/* Decision pipeline */}
          <div className="border border-border rounded-lg bg-background p-3 mb-4">
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-2 font-semibold">Orchestration 决策流</p>
            <div className="flex items-center gap-1.5">
              {[
                { label: '意图分析', icon: Target },
                { label: '上下文增强', icon: Cpu },
                { label: '路由决策', icon: Brain },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-1.5 flex-1">
                  <div className="flex-1 rounded-md border border-border bg-muted p-2 text-center">
                    <step.icon className="h-3.5 w-3.5 mx-auto mb-0.5 text-foreground" />
                    <p className="text-[10px] font-medium">{step.label}</p>
                  </div>
                  {i < 2 && <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Route targets */}
          <div className="grid grid-cols-2 gap-1.5 mb-5">
            {ROUTE_TYPES.map((rt) => (
              <div key={rt.type} className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
                <rt.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-medium">{rt.label}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-4">
            精准路由降低资源消耗 · 置信度评分透明可审计 · 规则 + LLM 混合策略
          </p>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ INTERACTIVE DEMO — SELECTOR PIPELINE ═══════════════ */

const STRATEGY_INFO: Record<SelectorStrategy, { label: string; desc: string }> = {
  hybrid: { label: 'Hybrid', desc: '规则快速路径 + LLM 回退' },
  rule: { label: 'Rule', desc: '纯模式匹配，确定性路由' },
  llm: { label: 'LLM', desc: '纯 LLM 分类，复杂请求' },
};

const INTENT_LABELS: Record<string, string> = {
  workflow: '工作流 / FTA',
  skill: '技能执行',
  rag: '知识检索',
  code_analysis: '代码分析',
  direct: '直接对话',
  multi: '多意图',
};

function InteractiveDemo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState<'analyzing' | 'enriching' | 'routing' | 'done'>('done');
  const [showPipeline, setShowPipeline] = useState(true);
  const [activeStrategy, setActiveStrategy] = useState<SelectorStrategy>('hybrid');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCycling = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIsAnimating(false);
      setPhase('analyzing');
      setTimeout(() => {
        setPhase('enriching');
        setTimeout(() => {
          setActiveIndex((prev) => (prev + 1) % DEMO_SCENARIOS.length);
          setIsAnimating(true);
          setPhase('routing');
          setTimeout(() => setPhase('done'), 600);
        }, 400);
      }, 400);
    }, 6000);
  }, []);

  useEffect(() => {
    if (!isPaused) startCycling();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPaused, startCycling]);

  const selectScenario = (i: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPaused(true);
    setIsAnimating(false);
    setPhase('analyzing');
    setTimeout(() => {
      setPhase('enriching');
      setTimeout(() => {
        setActiveIndex(i);
        setIsAnimating(true);
        setPhase('routing');
        setTimeout(() => setPhase('done'), 600);
      }, 300);
    }, 300);
    setTimeout(() => setIsPaused(false), 15000);
  };

  const scenario = DEMO_SCENARIOS[activeIndex]!;
  const trace = scenario.trace;

  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <SectionHeader
        badge="Intelligent Selector Pipeline"
        title="智能路由决策演示"
        subtitle="观察 Harness Orchestration 层的完整处理管道：意图分析 → 上下文增强 → 路由决策"
      />

      {/* Strategy selector + pipeline toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">策略</span>
          <div className="inline-flex rounded-lg border border-border/30 bg-card/20 p-0.5">
            {(Object.keys(STRATEGY_INFO) as SelectorStrategy[]).map((s) => (
              <button
                key={s}
                onClick={() => setActiveStrategy(s)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[10px] font-semibold transition-all',
                  activeStrategy === s
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground/60 hover:text-muted-foreground',
                )}
              >
                {STRATEGY_INFO[s].label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground/40 hidden sm:inline">{STRATEGY_INFO[activeStrategy].desc}</span>
        </div>
        <button
          onClick={() => setShowPipeline(!showPipeline)}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          {showPipeline ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {showPipeline ? '隐藏管道详情' : '显示管道详情'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Scenario list */}
        <div className="lg:col-span-4 space-y-1">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">测试场景</p>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {isPaused ? '恢复' : '暂停'}
            </button>
          </div>
          {DEMO_SCENARIOS.map((s, i) => (
            <button
              key={i}
              onClick={() => selectScenario(i)}
              className={cn(
                'w-full text-left rounded-lg border px-4 py-2.5 transition-all duration-200',
                i === activeIndex
                  ? 'border-primary/25 bg-accent/30'
                  : 'border-transparent hover:bg-card/30',
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs truncate', i === activeIndex ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                    {s.input.split('\n')[0]}
                  </p>
                  {i === activeIndex && (
                    <p className="text-[10px] mt-0.5 text-primary">{s.label} · {s.confidence}%</p>
                  )}
                </div>
                {i === activeIndex && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Decision panel */}
        <div className="lg:col-span-8">
          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center justify-between border-b border-border/30 px-5 py-3 bg-background/40">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground/50 font-mono tracking-wider">INTELLIGENT SELECTOR</span>
                <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary border-primary/20 px-1.5 py-0">
                  {activeStrategy.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {/* Pipeline phase indicator */}
                {(['analyzing', 'enriching', 'routing', 'done'] as const).map((p, i) => (
                  <span
                    key={p}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full transition-all duration-300',
                      phase === p ? 'bg-primary scale-125' : (
                        (['analyzing', 'enriching', 'routing', 'done'].indexOf(phase) > i) ? 'bg-status-healthy' : 'bg-muted-foreground/20'
                      ),
                    )}
                  />
                ))}
                <span className="text-[10px] text-muted-foreground/40 font-mono ml-1">
                  {phase === 'analyzing' ? 'INTENT' : phase === 'enriching' ? 'CONTEXT' : phase === 'routing' ? 'DECIDING' : 'READY'}
                </span>
              </div>
            </div>

            <div className={cn('p-5 transition-all duration-300', isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')}>
              {/* Input query */}
              <div className="mb-4">
                <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-2 font-semibold">用户输入</p>
                <div className="rounded-lg bg-background/40 border border-border/20 px-4 py-2.5">
                  <p className="text-sm font-medium whitespace-pre-wrap">{scenario.input.split('\n')[0]}</p>
                  {scenario.input.includes('```') && (
                    <div className="mt-2 rounded-md bg-background/60 border border-border/20 px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Braces className="h-3 w-3 text-muted-foreground/50" />
                        <span className="text-[9px] text-muted-foreground/40 font-mono">CODE BLOCK DETECTED</span>
                      </div>
                      <pre className="text-[11px] font-mono text-foreground/60">{scenario.input.split('```python\n')[1]?.split('\n```')[0]}</pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Pipeline trace — collapsible */}
              {showPipeline && (
                <div className="mb-4 rounded-lg border border-border/20 bg-background/20 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border/15 bg-background/30">
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">
                      Selector Pipeline Trace · {trace.pipeline_latency_ms}ms
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/15">
                    {/* Stage 1: Intent Analysis */}
                    <div className={cn('p-3 transition-colors', phase === 'analyzing' && 'bg-primary/5')}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Target className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-semibold">Stage 1: 意图分析</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">意图类型</span>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{INTENT_LABELS[trace.intent.type] ?? trace.intent.type}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">意图置信度</span>
                          <span className="text-[10px] font-mono font-bold text-primary">{(trace.intent.confidence * 100).toFixed(0)}%</span>
                        </div>
                        {trace.intent.sub_intents.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">子意图</span>
                            <div className="flex gap-1">
                              {trace.intent.sub_intents.map((si) => (
                                <span key={si} className="text-[9px] text-muted-foreground/70 bg-muted/30 rounded px-1 py-0.5">{INTENT_LABELS[si]}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stage 2: Context Enrichment */}
                    <div className={cn('p-3 transition-colors', phase === 'enriching' && 'bg-primary/5')}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Cpu className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-semibold">Stage 2: 上下文增强</span>
                      </div>
                      <div className="space-y-1.5">
                        {trace.enriched_skills.length > 0 && (
                          <div>
                            <span className="text-[10px] text-muted-foreground">可用 Skills</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {trace.enriched_skills.map((sk) => (
                                <span key={sk} className="text-[9px] font-mono text-primary bg-primary/5 border border-primary/15 rounded px-1.5 py-0.5">{sk}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {trace.corpus_matches.length > 0 && (
                          <div>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Library className="h-2.5 w-2.5" />
                              匹配语料库 ({trace.corpus_matches.length})
                            </span>
                            <div className="mt-1 space-y-1">
                              {trace.corpus_matches.map((cm) => (
                                <div key={cm.collection_id} className="flex items-center gap-1.5 rounded bg-muted/15 px-2 py-1">
                                  <span className="h-1 w-1 rounded-full bg-status-healthy shrink-0" />
                                  <span className="text-[9px] font-medium truncate flex-1">{cm.collection_name}</span>
                                  <span className="text-[9px] font-mono text-muted-foreground">{(cm.relevance_score * 100).toFixed(0)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {trace.corpus_matches.length === 0 && trace.enriched_skills.length === 0 && (
                          <p className="text-[10px] text-muted-foreground/40">无匹配语料库</p>
                        )}
                      </div>
                    </div>

                    {/* Stage 3: Route Decision */}
                    <div className={cn('p-3 transition-colors', phase === 'routing' && 'bg-primary/5')}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Brain className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-semibold">Stage 3: 路由决策</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">路由类型</span>
                          <RouteTypeBadge type={scenario.routeType} />
                        </div>
                        {scenario.routeTarget && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">目标</span>
                            <span className="text-[9px] font-mono text-foreground/70">{scenario.routeTarget}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] text-muted-foreground">决策原因</span>
                          <p className="text-[9px] text-muted-foreground/60 mt-0.5 leading-relaxed">{trace.reasoning}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Final decision results */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-2 font-semibold">路由类型</p>
                    <RouteTypeBadge type={scenario.routeType} />
                  </div>
                  {scenario.routeTarget && (
                    <div>
                      <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-2 font-semibold">路由目标</p>
                      <span className="text-xs font-mono text-foreground/70 bg-background/30 rounded-md px-3 py-1.5 border border-border/20 inline-block">
                        {scenario.routeTarget}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-2 font-semibold">置信度</p>
                  <ConfidenceBar value={scenario.confidence} color={scenario.color} animated={isAnimating} />
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-1.5 font-semibold">意图</p>
                    <Badge variant="secondary" className="text-[10px] bg-muted border-border/30 font-mono">{scenario.intentCategory}</Badge>
                  </div>
                  {scenario.keywords.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-1.5 font-semibold">关键词</p>
                      <div className="flex gap-1.5">
                        {scenario.keywords.map((kw) => (
                          <Badge key={kw} variant="secondary" className="text-[10px] border border-primary/20 bg-primary/5 text-primary font-medium">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {trace.corpus_matches.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-1.5 font-semibold">语料库</p>
                      <div className="flex gap-1.5">
                        {trace.corpus_matches.slice(0, 2).map((cm) => (
                          <Badge key={cm.collection_id} variant="secondary" className="text-[10px] border border-status-healthy/20 bg-status-healthy/5 text-status-healthy font-medium">
                            <Database className="h-2.5 w-2.5 mr-1" />
                            {cm.collection_name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="ml-auto">
                    <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-1.5 font-semibold">延迟</p>
                    <span className="text-[10px] font-mono text-muted-foreground">{trace.pipeline_latency_ms}ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ CORE CAPABILITIES — ASYMMETRIC ═══════════════ */

function CapabilitiesSection() {
  return (
    <section className="max-w-4xl mx-auto px-4 py-16">
      <SectionHeader
        badge="Harness Core Capabilities"
        title="Harness 核心能力"
        subtitle="六大核心组件构成 Agent 的完整执行框架"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main area — FTA engine */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <GitBranch className="h-5 w-5" />
            <h3 className="text-base font-display font-bold">FTA 故障树分析引擎</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            基于故障树分析（Fault Tree Analysis）的智能故障检测与诊断引擎，支持 AND/OR/VOTING 逻辑门组合，
            实现复杂故障场景的系统化分析和根因定位。
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'AND 逻辑门', desc: '所有条件同时满足' },
              { label: 'OR 逻辑门', desc: '任一条件满足即触发' },
              { label: 'VOTING 门', desc: 'K/N 多数表决机制' },
            ].map((g) => (
              <div key={g.label} className="rounded-lg border border-border bg-muted p-3 text-center">
                <p className="text-xs font-semibold mb-0.5">{g.label}</p>
                <p className="text-[10px] text-muted-foreground">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Side area — stacked */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <Database className="h-5 w-5 mb-3" />
            <h4 className="text-sm font-display font-bold mb-1">RAG 知识管道</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">BGE 嵌入模型 + 交叉编码器重排序，企业级知识检索</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <Zap className="h-5 w-5 mb-3" />
            <h4 className="text-sm font-display font-bold mb-1">专家技能系统</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">插件化架构 + 沙箱执行，AIOps 领域专家知识封装</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <MemoryStick className="h-5 w-5 mb-3" />
            <h4 className="text-sm font-display font-bold mb-1">上下文管理</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">Compaction 压缩 + Tool Offloading，对抗上下文腐化</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ STATS ═══════════════ */

function StatsBar() {
  return (
    <section className="max-w-4xl mx-auto px-4 py-8">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4">
          {[
            { value: '7', label: 'Agent 实例' },
            { value: '5', label: '路由类型' },
            { value: '7+', label: '内置 Skills' },
            { value: '100%', label: 'Harness 覆盖率' },
          ].map((s, i) => (
            <div key={s.label} className={cn('px-6 py-6 text-center', i > 0 && 'border-l border-border')}>
              <p className="text-3xl sm:text-4xl font-display font-extrabold tabular-nums">
                {s.value}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1.5 font-medium tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ MAIN PAGE ═══════════════ */

export default function Home() {
  const navigate = useNavigate();
  const modesRef = useRef<HTMLDivElement>(null);

  const handleScrollDown = () => {
    modesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-full -m-6 overflow-y-auto">
      <HeroSection onScrollDown={handleScrollDown} />
      <ArchitectureComparison />

      <div ref={modesRef} className="scroll-mt-4">
        <ModesComparison />
      </div>

      <InteractiveDemo />

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 pt-4 pb-10">
        <Separator className="mb-8" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background text-[10px] font-display font-extrabold">R</span>
            <span className="text-xs text-muted-foreground font-medium">Resolve Agent v0.1.0</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted-foreground/60">
            {[
              { label: 'Agents', href: '/agents' },
              { label: 'Playground', href: '/playground' },
              { label: '故障分析', href: '/workflows' },
              { label: '设置', href: '/settings' },
            ].map((l) => (
              <button key={l.href} onClick={() => navigate(l.href)} className="hover:text-foreground transition-colors">
                {l.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/30 font-mono">Apache-2.0</p>
        </div>
      </footer>
    </div>
  );
}
