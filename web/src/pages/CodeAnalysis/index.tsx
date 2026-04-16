import { useState } from 'react';
import {
  BookOpen,
  ArrowRight,
  Code2,
  Database,
  Zap,
  GitBranch,
  Network,
  BrainCircuit,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/PageHeader';
import CallGraphList from './CallGraphList';
import TrafficAnalysis from './TrafficAnalysis';
import K8sCorpusAnalysis from './K8sCorpusAnalysis';

export default function CodeAnalysisPage() {
  const [activeTab, setActiveTab] = useState('call-graphs');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Code Analysis Corpus 代码分析语料"
        description="Static call graph analysis and dynamic traffic capture analysis for solution generation"
      />

      {/* ── Code Analysis Introduction ── */}
      <div className="rounded-xl border border-border/40 bg-gradient-to-br from-card/60 via-card/30 to-transparent p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Code2 className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold mb-1">代码分析引擎 Code Analysis Engine</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              代码分析引擎是 ResolveAgent 的<strong className="text-foreground/80">第四大执行子系统</strong>，
              通过<strong className="text-foreground/80">静态分析</strong>和<strong className="text-foreground/80">动态分析</strong>双引擎深度理解代码与服务行为，
              并将分析结果沉淀为 RAG 可检索的知识资产，实现「<strong className="text-foreground/80">分析即知识</strong>」的闭环。
              智能选择器根据用户意图自动路由到对应的分析子类型（static / traffic / llm）。
            </p>
          </div>
        </div>

        {/* Three-column concept cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {/* Static Analysis */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/15 p-3">
            <GitBranch className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-foreground/80">静态分析 Static Analysis</span>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                对源码仓库进行 AST 解析，构建 BFS 调用图（Call Graph），
                支持 Python / Go / JS / TS / Java 五种语言。
                自动检测入口点（装饰器、main 函数），解析错误日志与堆栈信息，
                结合 LLM + RAG 生成标准化解决方案文档（SolutionDocument）。
              </p>
            </div>
          </div>
          {/* Dynamic Analysis */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/15 p-3">
            <Network className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-foreground/80">动态分析 Dynamic Analysis</span>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                通过混合流量采集方案（OpenTelemetry / Proxy 日志 / eBPF）收集运行时流量，
                构建服务依赖图（Service Dependency Graph）并转为 XYFlow 前端可视化格式。
                结合规则基线分析与 LLM 增强，生成包含热点识别、异常检测和优化建议的分析报告。
              </p>
            </div>
          </div>
          {/* RAG Dual-Write */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/15 p-3">
            <Database className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-foreground/80">RAG 双写沉淀 Dual-Write Pipeline</span>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                静态方案和动态报告通过 DualWriteRAGPipeline 同时写入
                「code-analysis」专用集合和「kudig-rag」通用集合。
                分析结果经分块、嵌入后成为可检索的向量知识，
                让后续的 RAG 查询和智能选择器都能受益于历史分析积累。
              </p>
            </div>
          </div>
        </div>

        {/* System synergy highlight */}
        <div className="rounded-lg bg-muted/10 border border-border/20 p-3 mb-3">
          <div className="flex items-start gap-2">
            <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-foreground/80">与系统组件的协同 System Synergy</span>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                <strong className="text-foreground/70">智能选择器</strong>根据意图分析自动将代码相关请求路由到 code_analysis 路由类型，
                并通过 sub_type 参数分发至静态（static）、动态（traffic）或 LLM 审查（llm）模式。
                分析过程中发现的故障模式可转化为 <strong className="text-foreground/70">FTA 工作流</strong>的基础事件，
                生成的解决方案文档丰富 <strong className="text-foreground/70">RAG 知识库</strong>，
                形成「代码分析 → 知识沉淀 → 智能路由 → 故障诊断」的持续增强循环。
              </p>
            </div>
          </div>
        </div>

        {/* Footer: pipeline flow + doc link */}
        <div className="flex items-center justify-between pt-3 border-t border-border/20">
          <div className="flex items-center gap-1.5">
            <BrainCircuit className="h-3 w-3 text-muted-foreground/60" />
            <p className="text-[10px] text-muted-foreground/60">
              流程: AST 解析 / 流量采集 → 图谱构建 → 错误解析 / 报告生成 → 方案生成 → RAG 双写沉淀
            </p>
          </div>
          <Link
            to="/architecture"
            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline shrink-0"
          >
            <BookOpen className="h-3 w-3" />
            查看架构文档
            <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="call-graphs">Call Graphs</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Analysis</TabsTrigger>
          <TabsTrigger value="k8s-corpus">K8s 源码语料</TabsTrigger>
        </TabsList>

        <TabsContent value="call-graphs" className="mt-4">
          <CallGraphList />
        </TabsContent>

        <TabsContent value="traffic" className="mt-4">
          <TrafficAnalysis />
        </TabsContent>

        <TabsContent value="k8s-corpus" className="mt-4">
          <K8sCorpusAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
