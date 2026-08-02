import { Link } from 'react-router-dom';
import {
  Layers,
  Bot,
  Zap,
  Database,
  GitBranch,
  BookOpen,
  MessageSquare,
  Globe,
  Cpu,
  ChevronRight,
  FileText,
  Shield,
  Sparkles,
  Route,
  Lightbulb,
  RefreshCw,
  Split,
  BrainCircuit,
  ToggleLeft,
  Activity,
  Workflow,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DocSection {
  id: string;
  title: string;
  icon: typeof Bot;
  description: string;
  href: string;
  badge?: string;
}

const subDocs: DocSection[] = [
  {
    id: 'database-schema',
    title: '数据库架构',
    icon: Database,
    description: '16 张表设计，覆盖 Agent、Skill、Workflow、RAG 等核心实体的完整 Schema',
    href: '/architecture/database-schema',
    badge: '详细',
  },
  {
    id: 'selector',
    title: '智能选择器',
    icon: Zap,
    description: 'LLM 驱动的元路由引擎，自适应工作流调度的核心组件',
    href: '/architecture/selector',
  },
  {
    id: 'selector-adapters',
    title: '选择器适配器',
    icon: Layers,
    description: 'Hook/Skill 适配器架构与 SelectorProtocol 协议定义',
    href: '/architecture/selector-adapters',
  },
  {
    id: 'fta-engine',
    title: 'FTA 引擎',
    icon: GitBranch,
    description: '故障树分析引擎，支持 AND/OR/NOT/VOTING 等门类型与蒙特卡洛仿真',
    href: '/architecture/fta-engine',
  },
  {
    id: 'agentscope-higress',
    title: 'AgentScope & Higress',
    icon: Globe,
    description: 'Python Runtime 与 Higress AI 网关的深度集成架构',
    href: '/architecture/agentscope-higress',
  },
  {
    id: 'ticket-summary',
    title: '工单摘要智能体',
    icon: MessageSquare,
    description: '知识生产引擎，将工单处理经验转化为组织能力增量',
    href: '/architecture/ticket-summary',
  },
  {
    id: 'memory',
    title: 'Memory 记忆',
    icon: Database,
    description: '三层记忆架构 - Working / Episodic / Long-term',
    href: '/architecture/memory',
  },
  {
    id: 'planner',
    title: 'Planner 规划',
    icon: GitBranch,
    description: 'Hybrid Planner 双模式 - REACTIVE / DELIBERATIVE',
    href: '/architecture/planner',
  },
  {
    id: 'toolhub',
    title: 'ToolHub 工具',
    icon: Zap,
    description: '工具发现 + Schema 注册 + Capability 映射 + 安全策略',
    href: '/architecture/toolhub',
  },
  {
    id: 'loop-engineering',
    title: 'Loop Engineering 循环工程',
    icon: RefreshCw,
    description: 'Observe-Orient-Decide-Act 持续反馈闭环：信号收集、聚合、分发、熔断器、自适应',
    href: '/architecture/loop-engineering',
    badge: 'New',
  },
];

const innovations = [
  {
    title: '智能选择器',
    description: 'LLM 驱动的元路由引擎，三阶段流程（意图分析→上下文增强→路由决策），支持规则/LLM/混合三种策略，自适应工作流调度',
    icon: Route,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    title: 'FTA 故障树分析',
    description: '复杂多步骤故障诊断，支持 AND/OR/NOT/VOTING/INHIBIT/PRIORITY_AND 六种门类型，最小割集计算与蒙特卡罗仿真',
    icon: GitBranch,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    title: 'RAG 知识检索增强',
    description: '6 格式解析 + 5 种分块策略，BGE 向量嵌入，三级重排序回退（cross-encoder → LLM → Jaccard+MMR）',
    icon: BookOpen,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    title: '专家技能系统',
    description: '原子化功能单元，沙箱执行（10s CPU / 512MB RAM），内置 WebSearch、CodeExecution、FileOps',
    icon: Cpu,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    title: '代码分析引擎',
    description: '静态分析（AST 调用图 + 错误解析 + 方案生成）与动态分析（混合流量采集 + 服务依赖图），RAG 双写沉淀',
    icon: Zap,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
  },
  {
    title: '工单摘要智能体',
    description: '知识生产引擎，将工单处理经验转化为组织能力增量，持续沉淀运维知识',
    icon: MessageSquare,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/20',
  },
  {
    title: 'Loop Engineering 循环工程',
    description: 'Observe-Orient-Decide-Act 持续反馈闭环，信号收集→聚合→分发→熔断→自适应权重调整',
    icon: RefreshCw,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/20',
  },
];

const designPrinciples = [
  { label: 'Agent-Driven', desc: 'All operations orchestrated by intelligent agents' },
  { label: 'Adaptive', desc: 'Workflows dynamically adjust based on context' },
  { label: 'Feedback-Driven', desc: 'Loop Engineering: observe-orient-decide-act continuous cycle' },
  { label: 'Pluggable', desc: 'Skills extensible without core changes' },
  { label: 'Observable', desc: 'Full telemetry with OpenTelemetry' },
  { label: 'Cloud Native', desc: 'Kubernetes-first with Helm and Kustomize' },
  { label: 'Single Source of Truth', desc: 'Go Registry manages all registrations' },
];

// Style 6: Claude Official colors
const COLORS = {
  bg: '#f8f6f3',
  blue: '#a8c5e6',
  green: '#9dd4c7',
  beige: '#f4e4c1',
  gray: '#e8e6e3',
  stroke: '#4a4a4a',
  text: '#1a1a1a',
  textSecondary: '#6a6a6a',
  arrow: '#5a5a5a',
  orange: '#f4c7a1',
  purple: '#c5b4e8',
  teal: '#8fd4d4',
};

function SvgDefs() {
  return (
    <defs>
      <marker id="arrow-main" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <polygon points="0 0, 8 4, 0 8" fill={COLORS.arrow} />
      </marker>
      <marker id="arrow-dashed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <polygon points="0 0, 8 4, 0 8" fill={COLORS.arrow} />
      </marker>
      <filter id="shadow-soft" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#00000010" />
      </filter>
    </defs>
  );
}

function LayerLabel({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <text x={x} y={y} fill={COLORS.textSecondary} fontSize="12" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
      {children}
    </text>
  );
}

function Arrow({ x1, y1, x2, y2, dashed = false, label }: {
  x1: number; y1: number; x2: number; y2: number;
  dashed?: boolean; label?: string;
}) {
  return (
    <g>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={COLORS.arrow}
        strokeWidth="2"
        strokeDasharray={dashed ? "5,3" : undefined}
        markerEnd="url(#arrow-main)"
      />
      {label && (
        <text
          x={(x1 + x2) / 2 + 8}
          y={(y1 + y2) / 2}
          fill={COLORS.textSecondary}
          fontSize="11"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {label}
        </text>
      )}
    </g>
  );
}

function ArchitectureDiagram() {
  const W = 820;
  const H = 620;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: W, margin: '0 auto', display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <style>
          {`text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }`}
        </style>
        <SvgDefs />

        {/* Background */}
        <rect width={W} height={H} fill={COLORS.bg} />

        {/* Title */}
        <text x={W / 2} y={28} textAnchor="middle" fill={COLORS.text} fontSize="16" fontWeight="700">
          ResolveAgent 系统架构
        </text>

        {/* Layer 1: Client */}
        <LayerLabel x={20} y={70}>Interface</LayerLabel>
        <rect x={100} y={52} width={130} height={48} rx="10" fill={COLORS.blue} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={165} y={72} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">CLI / TUI</text>
        <text x={165} y={88} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">Go</text>

        <rect x={250} y={52} width={130} height={48} rx="10" fill={COLORS.blue} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={315} y={72} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">WebUI</text>
        <text x={315} y={88} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">React + TS</text>

        <rect x={400} y={52} width={130} height={48} rx="10" fill={COLORS.blue} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={465} y={72} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">External APIs</text>
        <text x={465} y={88} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">Consumers</text>

        {/* Arrow to Gateway */}
        <Arrow x1={465} y1={100} x2={465} y2={135} />

        {/* Layer 2: Gateway */}
        <LayerLabel x={20} y={165}>Gateway</LayerLabel>
        <rect x={200} y={140} width={420} height={60} rx="12" fill={COLORS.beige} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={410} y={163} textAnchor="middle" fill={COLORS.text} fontSize="13" fontWeight="600">Higress AI / API Gateway</text>
        <text x={410} y={182} textAnchor="middle" fill={COLORS.textSecondary} fontSize="11">Auth · Rate Limit · Model Routing · Route Sync</text>

        {/* Arrow to Platform */}
        <Arrow x1={410} y1={200} x2={410} y2={235} />

        {/* Layer 3: Platform Services */}
        <LayerLabel x={20} y={275}>Platform</LayerLabel>
        <rect x={100} y={240} width={620} height={100} rx="14" fill={COLORS.green} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={120} y={262} fill={COLORS.text} fontSize="12" fontWeight="600">Platform Services (Go)</text>

        {/* Platform components */}
        <rect x={115} y={272} width={130} height={56} rx="8" fill="rgba(255,255,255,0.6)" stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={180} y={294} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">API Server</text>
        <text x={180} y={310} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">HTTP:8080 / gRPC:9090</text>

        <rect x={260} y={272} width={130} height={56} rx="8" fill="rgba(255,255,255,0.6)" stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={325} y={294} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">9 Registries</text>
        <text x={325} y={310} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">Agent·Skill·WF·RAG…</text>

        <rect x={405} y={272} width={130} height={56} rx="8" fill="rgba(255,255,255,0.6)" stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={470} y={294} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">RuntimeClient</text>
        <text x={470} y={310} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">HTTP+SSE → Py:9091</text>

        <rect x={550} y={272} width={155} height={56} rx="8" fill="rgba(255,255,255,0.6)" stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={627} y={294} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">Config · NATS · OTel</text>
        <text x={627} y={310} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">Viper · EventBus · OTel</text>

        {/* Arrow to Agent Runtime */}
        <Arrow x1={410} y1={340} x2={410} y2={375} label="HTTP + SSE" />

        {/* Layer 4: Agent Runtime */}
        <LayerLabel x={20} y={420}>Runtime</LayerLabel>
        <rect x={100} y={380} width={620} height={120} rx="14" fill={COLORS.purple} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={120} y={402} fill={COLORS.text} fontSize="12" fontWeight="600">Agent Runtime (Python / AgentScope)</text>

        {/* Intelligent Selector */}
        <rect x={115} y={412} width={200} height={76} rx="10" fill={COLORS.blue} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={215} y={436} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">Intelligent Selector</text>
        <text x={215} y={452} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">Intent Analysis → Context → Route</text>
        <text x={215} y={468} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">Adaptive Workflow Orchestration</text>

        {/* FTA + Skills + RAG */}
        <rect x={330} y={412} width={120} height={76} rx="10" fill={COLORS.beige} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={390} y={436} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">FTA Engine</text>
        <text x={390} y={452} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">Fault Tree Analysis</text>
        <text x={390} y={468} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">MC Sim · MinCutSets</text>

        <rect x={465} y={412} width={120} height={76} rx="10" fill={COLORS.green} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={525} y={436} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">Expert Skills</text>
        <text x={525} y={452} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">Search · Code · FileOps</text>
        <text x={525} y={468} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">Sandboxed Execution</text>

        <rect x={600} y={412} width={105} height={76} rx="10" fill={COLORS.teal} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={652} y={436} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">RAG Pipeline</text>
        <text x={652} y={452} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">Milvus / Qdrant</text>
        <text x={652} y={468} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">BGE + Reranking</text>

        {/* Arrow to Data Layer */}
        <Arrow x1={410} y1={500} x2={390} y2={518} />

        {/* Layer 5: Data */}
        <rect x={140} y={518} width={480} height={45} rx="10" fill={COLORS.gray} stroke={COLORS.stroke} strokeWidth="1.5" filter="url(#shadow-soft)" />
        <text x={380} y={536} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">Data Layer</text>
        <text x={380} y={552} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">PostgreSQL · Redis · NATS · Milvus / Qdrant</text>

        {/* Legend */}
        <g transform="translate(640, 518)">
          <rect x={0} y={0} width={170} height={90} rx="8" fill="rgba(255,255,255,0.9)" stroke={COLORS.stroke} strokeWidth="1" />
          <text x={10} y={16} fill={COLORS.text} fontSize="11" fontWeight="600">Legend</text>
          <rect x={10} y={24} width={12} height={12} rx="2" fill={COLORS.blue} />
          <text x={28} y={35} fill={COLORS.textSecondary} fontSize="10">Interface / Input</text>
          <rect x={10} y={42} width={12} height={12} rx="2" fill={COLORS.green} />
          <text x={28} y={53} fill={COLORS.textSecondary} fontSize="10">Agent / Process</text>
          <rect x={10} y={60} width={12} height={12} rx="2" fill={COLORS.beige} />
          <text x={28} y={71} fill={COLORS.textSecondary} fontSize="10">Infrastructure</text>
          <rect x={10} y={78} width={12} height={12} rx="2" fill={COLORS.gray} />
          <text x={28} y={89} fill={COLORS.textSecondary} fontSize="10">Storage / State</text>
        </g>
      </svg>
    </div>
  );
}

function GoPythonBridgeDiagram() {
  const W = 700;
  const H = 300;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, margin: '0 auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <style>{`text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }`}</style>
        <SvgDefs />
        <rect width={W} height={H} fill={COLORS.bg} />

        {/* Title */}
        <text x={W / 2} y={28} textAnchor="middle" fill={COLORS.text} fontSize="15" fontWeight="700">Go-Python 通信桥接</text>

        {/* Go Platform Box */}
        <rect x={40} y={60} width={200} height={180} rx="14" fill={COLORS.green} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={140} y={85} textAnchor="middle" fill={COLORS.text} fontSize="13" fontWeight="600">Go Platform Server</text>
        <text x={140} y={102} textAnchor="middle" fill={COLORS.textSecondary} fontSize="11">port 8080 / 9090</text>

        <rect x={55} y={115} width={170} height={40} rx="8" fill="rgba(255,255,255,0.6)" stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={140} y={138} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">RuntimeClient</text>

        <rect x={55} y={165} width={170} height={60} rx="8" fill="rgba(255,255,255,0.6)" stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={140} y={186} textAnchor="middle" fill={COLORS.text} fontSize="11">executeAgent()</text>
        <text x={140} y={202} textAnchor="middle" fill={COLORS.text} fontSize="11">executeWorkflow()</text>
        <text x={140} y={218} textAnchor="middle" fill={COLORS.text} fontSize="11">importCorpus()</text>

        {/* Forward arrow: Go → Python */}
        <line x1={240} y1={130} x2={340} y2={130} stroke={COLORS.arrow} strokeWidth="2" markerEnd="url(#arrow-main)" />
        <text x={290} y={123} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">POST /execute</text>

        {/* Protocol badge */}
        <rect x={252} y={140} width={86} height={20} rx="4" fill={COLORS.blue} />
        <text x={295} y={154} textAnchor="middle" fill={COLORS.text} fontSize="10" fontWeight="600">HTTP + SSE</text>

        <text x={290} y={180} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">text/event-stream</text>

        {/* Python Runtime Box */}
        <rect x={350} y={60} width={200} height={180} rx="14" fill={COLORS.purple} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={450} y={85} textAnchor="middle" fill={COLORS.text} fontSize="13" fontWeight="600">Python Runtime</text>
        <text x={450} y={102} textAnchor="middle" fill={COLORS.textSecondary} fontSize="11">FastAPI :9091</text>

        <rect x={365} y={115} width={170} height={40} rx="8" fill="rgba(255,255,255,0.6)" stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={450} y={138} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">ExecutionEngine</text>

        <rect x={365} y={165} width={170} height={60} rx="8" fill="rgba(255,255,255,0.6)" stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={450} y={186} textAnchor="middle" fill={COLORS.text} fontSize="11">run_agent()</text>
        <text x={450} y={202} textAnchor="middle" fill={COLORS.text} fontSize="11">run_workflow()</text>
        <text x={450} y={218} textAnchor="middle" fill={COLORS.text} fontSize="11">import_corpus()</text>

        {/* Backward arrow: Python → Go (SSE response) */}
        <line x1={350} y1={168} x2={240} y2={168} stroke={COLORS.arrow} strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrow-main)" />

        {/* Features */}
        <rect x={575} y={60} width={115} height={180} rx="10" fill={COLORS.gray} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={632} y={85} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">Features</text>
        <text x={632} y={108} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">SSE Streaming</text>
        <text x={632} y={124} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">120s Timeout</text>
        <text x={632} y={148} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">RegistryClient</text>
        <text x={632} y={164} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">HTTP Queries</text>
        <text x={632} y={188} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">Progress Events</text>
      </svg>
    </div>
  );
}

function CoordDiagram() {
  const W = 680;
  const H = 400;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, margin: '0 auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <style>{`text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }`}</style>
        <SvgDefs />
        <rect width={W} height={H} fill={COLORS.bg} />

        <text x={W / 2} y={28} textAnchor="middle" fill={COLORS.text} fontSize="15" fontWeight="700">FTA / Skills / RAG 协同调度</text>

        {/* User Request */}
        <rect x={270} y={48} width={140} height={44} rx="12" fill={COLORS.blue} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={340} y={76} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">User Request</text>

        {/* Arrow down */}
        <line x1={340} y1={92} x2={340} y2={118} stroke={COLORS.arrow} strokeWidth="2" markerEnd="url(#arrow-main)" />

        {/* MegaAgent */}
        <rect x={250} y={122} width={180} height={52} rx="12" fill={COLORS.green} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={340} y={146} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">MegaAgent</text>
        <text x={340} y={163} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">Orchestrator</text>

        {/* Arrow down */}
        <line x1={340} y1={174} x2={340} y2={200} stroke={COLORS.arrow} strokeWidth="2" markerEnd="url(#arrow-main)" />

        {/* Intelligent Selector */}
        <rect x={210} y={204} width={260} height={60} rx="12" fill={COLORS.blue} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={340} y={226} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">Intelligent Selector</text>
        <text x={340} y={243} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">Intent Analysis → Context Enrichment → Route Decision</text>

        {/* Cache hint */}
        <rect x={480} y={212} width={90} height={36} rx="6" fill={COLORS.gray} stroke={COLORS.stroke} strokeWidth="1" strokeDasharray="4,2" />
        <text x={525} y={229} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">Cache</text>
        <text x={525} y={242} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">SHA-256 key</text>

        {/* Three branches */}
        <line x1={260} y1={264} x2={150} y2={290} stroke={COLORS.arrow} strokeWidth="2" markerEnd="url(#arrow-main)" />
        <line x1={340} y1={264} x2={340} y2={290} stroke={COLORS.arrow} strokeWidth="2" markerEnd="url(#arrow-main)" />
        <line x1={420} y1={264} x2={510} y2={290} stroke={COLORS.arrow} strokeWidth="2" markerEnd="url(#arrow-main)" />

        {/* FTA Engine */}
        <rect x={60} y={294} width={160} height={72} rx="12" fill={COLORS.beige} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={140} y={318} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">FTA Engine</text>
        <text x={140} y={335} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">Fault Tree Analysis</text>
        <text x={140} y={350} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">AND/OR/NOT/VOTING Gates</text>

        {/* Skills */}
        <rect x={260} y={294} width={160} height={72} rx="12" fill={COLORS.green} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={340} y={318} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">Skills System</text>
        <text x={340} y={335} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">Sandboxed Execution</text>
        <text x={340} y={350} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">WebSearch · CodeExec · FileOps</text>

        {/* RAG */}
        <rect x={460} y={294} width={160} height={72} rx="12" fill={COLORS.teal} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={540} y={318} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">RAG Pipeline</text>
        <text x={540} y={335} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">Vector Search + Reranking</text>
        <text x={540} y={350} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">Milvus / Qdrant</text>
      </svg>
    </div>
  );
}

function HarnessDiagram() {
  const W = 680;
  const H = 260;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, margin: '0 auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <style>{`text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }`}</style>
        <SvgDefs />
        <rect width={W} height={H} fill={COLORS.bg} />

        {/* Title */}
        <text x={W / 2} y={28} textAnchor="middle" fill={COLORS.text} fontSize="15" fontWeight="700">Agent = Model + Harness</text>

        {/* Agent outer box */}
        <rect x={60} y={50} width={560} height={190} rx="16" fill="rgba(165,180,252,0.08)" stroke={COLORS.stroke} strokeWidth="2" strokeDasharray="6,3" />
        <text x={80} y={72} fill={COLORS.text} fontSize="13" fontWeight="700">Agent</text>

        {/* Model box (left) */}
        <rect x={90} y={90} width={180} height={130} rx="14" fill={COLORS.beige} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={180} y={118} textAnchor="middle" fill={COLORS.text} fontSize="13" fontWeight="700">Model (LLM)</text>
        <text x={180} y={142} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">通义千问 · 文心一言</text>
        <text x={180} y={158} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">智谱清言 · OpenAI</text>
        <text x={180} y={180} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">推理 · 生成 · 理解</text>
        <text x={180} y={206} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9" fontStyle="italic">核心智能引擎</text>

        {/* Plus sign */}
        <text x={300} y={162} textAnchor="middle" fill={COLORS.text} fontSize="24" fontWeight="700">+</text>

        {/* Harness box (right) */}
        <rect x={340} y={90} width={260} height={130} rx="14" fill={COLORS.purple} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={470} y={118} textAnchor="middle" fill={COLORS.text} fontSize="13" fontWeight="700">Harness (非模型逻辑)</text>

        {/* Harness sub-items */}
        <rect x={355} y={130} width={110} height={28} rx="6" fill="rgba(255,255,255,0.6)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={410} y={148} textAnchor="middle" fill={COLORS.text} fontSize="10">状态管理</text>

        <rect x={475} y={130} width={110} height={28} rx="6" fill="rgba(255,255,255,0.6)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={530} y={148} textAnchor="middle" fill={COLORS.text} fontSize="10">工具执行</text>

        <rect x={355} y={166} width={110} height={28} rx="6" fill="rgba(255,255,255,0.6)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={410} y={184} textAnchor="middle" fill={COLORS.text} fontSize="10">沙箱环境</text>

        <rect x={475} y={166} width={110} height={28} rx="6" fill="rgba(255,255,255,0.6)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={530} y={184} textAnchor="middle" fill={COLORS.text} fontSize="10">Hooks 生命周期</text>

        <text x={470} y={210} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9" fontStyle="italic">上下文策略 · 路由调度 · 安全沙箱 · 可观测性</text>
      </svg>
    </div>
  );
}

function LoopEngineeringDiagram() {
  const W = 720;
  const H = 360;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, margin: '0 auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <style>{`text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }`}</style>
        <SvgDefs />
        <rect width={W} height={H} fill={COLORS.bg} />

        <text x={W / 2} y={28} textAnchor="middle" fill={COLORS.text} fontSize="15" fontWeight="700">Loop Engineering 循环工程闭环</text>

        {/* Observe box */}
        <rect x={30} y={60} width={140} height={120} rx="12" fill={COLORS.blue} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={100} y={85} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">Observe</text>
        <rect x={42} y={95} width={116} height={24} rx="6" fill="rgba(255,255,255,0.6)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={100} y={111} textAnchor="middle" fill={COLORS.text} fontSize="10">Health · Retry</text>
        <rect x={42} y={125} width={116} height={24} rx="6" fill="rgba(255,255,255,0.6)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={100} y={141} textAnchor="middle" fill={COLORS.text} fontSize="10">Workflow · Telemetry</text>
        <rect x={42} y={155} width={116} height={18} rx="4" fill="rgba(255,255,255,0.4)" stroke={COLORS.stroke} strokeWidth="0.5" />
        <text x={100} y={168} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">FeedbackSignal</text>

        {/* Arrow Observe → Orient */}
        <Arrow x1={170} y1={120} x2={210} y2={120} />

        {/* Orient box */}
        <rect x={220} y={75} width={130} height={90} rx="12" fill={COLORS.beige} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={285} y={100} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">Orient</text>
        <text x={285} y={120} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">RingBuffer (1000)</text>
        <text x={285} y={138} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">Aggregator</text>
        <text x={285} y={154} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">滑动窗口 5m</text>

        {/* Arrow Orient → Decide */}
        <Arrow x1={350} y1={120} x2={390} y2={120} />

        {/* Decide box */}
        <rect x={400} y={75} width={130} height={90} rx="12" fill={COLORS.orange} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={465} y={100} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">Decide</text>
        <text x={465} y={120} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">Alert Engine</text>
        <text x={465} y={138} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">规则评估</text>
        <text x={465} y={154} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">notify / circuit_break</text>

        {/* Arrow Decide → Act */}
        <Arrow x1={530} y1={120} x2={560} y2={120} />

        {/* Act box */}
        <rect x={570} y={60} width={130} height={120} rx="12" fill={COLORS.purple} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={635} y={85} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">Act</text>
        <rect x={582} y={95} width={106} height={24} rx="6" fill="rgba(255,255,255,0.6)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={635} y={111} textAnchor="middle" fill={COLORS.text} fontSize="10">Circuit Breaker</text>
        <rect x={582} y={125} width={106} height={24} rx="6" fill="rgba(255,255,255,0.6)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={635} y={141} textAnchor="middle" fill={COLORS.text} fontSize="10">Adaptive Weight</text>
        <rect x={582} y={155} width={106} height={18} rx="4" fill="rgba(255,255,255,0.4)" stroke={COLORS.stroke} strokeWidth="0.5" />
        <text x={635} y={168} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">Hook Chain</text>

        {/* Feedback loop arrow: Act → Observe (bottom arc) */}
        <path d="M 635 180 Q 635 250 400 260 Q 100 270 100 180" fill="none" stroke={COLORS.arrow} strokeWidth="2" strokeDasharray="6,3" markerEnd="url(#arrow-main)" />
        <text x={370} y={275} textAnchor="middle" fill={COLORS.textSecondary} fontSize="11" fontWeight="600">Feedback Dispatch</text>
        <text x={370} y={292} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">Log · Webhook · NATS</text>

        {/* State machine legend */}
        <rect x={30} y={310} width={660} height={40} rx="8" fill="rgba(255,255,255,0.9)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={50} y={330} fill={COLORS.text} fontSize="10" fontWeight="600">熔断器状态机:</text>
        <text x={150} y={330} fill={COLORS.textSecondary} fontSize="10">CLOSED ─[failures≥5]─→ OPEN ─[30s timeout]─→ HALF_OPEN ─[probe ok]─→ CLOSED</text>
        <rect x={50} y={338} width={8} height={8} rx="2" fill={COLORS.green} />
        <text x={64} y={346} fill={COLORS.textSecondary} fontSize="9">Closed (正常)</text>
        <rect x={140} y={338} width={8} height={8} rx="2" fill={COLORS.orange} />
        <text x={154} y={346} fill={COLORS.textSecondary} fontSize="9">Open (熔断)</text>
        <rect x={220} y={338} width={8} height={8} rx="2" fill={COLORS.beige} />
        <text x={234} y={346} fill={COLORS.textSecondary} fontSize="9">Half-Open (探测)</text>
      </svg>
    </div>
  );
}

function SelectorFlowDiagram() {
  const W = 900;
  const H = 380;
  const boxH = 54;
  const row1Y = 60;
  const row2Y = 200;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, margin: '0 auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <style>{`text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }`}</style>
        <SvgDefs />
        <rect width={W} height={H} fill={COLORS.bg} />
        <text x={W / 2} y={28} textAnchor="middle" fill={COLORS.text} fontSize="15" fontWeight="700">Intelligent Selector 三阶段路由决策</text>

        {/* ══════════ Row 1: 三阶段流水线 ══════════ */}
        {/* Stage 1: Intent Analysis */}
        <rect x={30} y={row1Y} width={220} height={boxH} rx="12" fill={COLORS.blue} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={140} y={row1Y + 22} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">① 意图分析</text>
        <text x={140} y={row1Y + 40} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">用户输入 → 类型识别</text>

        <Arrow x1={250} y1={row1Y + 27} x2={330} y2={row1Y + 27} />

        {/* Stage 2: Context Enrichment */}
        <rect x={340} y={row1Y} width={220} height={boxH} rx="12" fill={COLORS.green} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={450} y={row1Y + 22} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">② 上下文增强</text>
        <text x={450} y={row1Y + 40} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">记忆 + 知识 + 会话历史</text>

        <Arrow x1={560} y1={row1Y + 27} x2={640} y2={row1Y + 27} />

        {/* Stage 3: Route Decision */}
        <rect x={650} y={row1Y} width={220} height={boxH} rx="12" fill={COLORS.orange} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={760} y={row1Y + 22} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">③ 路由决策</text>
        <text x={760} y={row1Y + 40} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">选择执行路径 + 缓存命中</text>

        {/* Context sources under stage 2 */}
        <rect x={370} y={row1Y + 66} width={80} height={26} rx="6" fill="rgba(255,255,255,0.7)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={410} y={row1Y + 83} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">短期记忆</text>
        <rect x={458} y={row1Y + 66} width={80} height={26} rx="6" fill="rgba(255,255,255,0.7)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={498} y={row1Y + 83} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">RAG 知识库</text>
        <rect x={546} y={row1Y + 66} width={80} height={26} rx="6" fill="rgba(255,255,255,0.7)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={586} y={row1Y + 83} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">FTA 证据</text>
        <line x1={450} y1={row1Y + 92} x2={450} y2={row1Y + 100} stroke={COLORS.arrow} strokeWidth="1.5" markerEnd="url(#arrow-main)" />
        <line x1={498} y1={row1Y + 92} x2={498} y2={row1Y + 100} stroke={COLORS.arrow} strokeWidth="1.5" markerEnd="url(#arrow-main)" />
        <line x1={586} y1={row1Y + 92} x2={586} y2={row1Y + 100} stroke={COLORS.arrow} strokeWidth="1.5" markerEnd="url(#arrow-main)" />

        {/* ══════════ Row 2: 四条执行路径 + 失败回退 ══════════ */}
        <line x1={140} y1={row1Y + boxH} x2={140} y2={row2Y} stroke={COLORS.arrow} strokeWidth="1.5" />
        <line x1={450} y1={row1Y + boxH} x2={450} y2={row2Y} stroke={COLORS.arrow} strokeWidth="1.5" />
        <line x1={760} y1={row1Y + boxH} x2={760} y2={row2Y} stroke={COLORS.arrow} strokeWidth="1.5" />

        {/* Route label under selector */}
        <text x={450} y={row2Y - 8} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10" fontWeight="600">策略: 规则路由 / LLM 路由 / 混合路由 · 失败自动切换</text>

        {/* Path 1: FTA */}
        <rect x={40} y={row2Y} width={200} height={64} rx="10" fill={COLORS.beige} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={140} y={row2Y + 24} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">FTA 故障树分析</text>
        <text x={140} y={row2Y + 42} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">根因诊断 · 最小割集</text>
        <text x={140} y={row2Y + 56} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">蒙特卡洛仿真</text>

        {/* Path 2: Skill */}
        <rect x={255} y={row2Y} width={200} height={64} rx="10" fill={COLORS.green} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={355} y={row2Y + 24} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">专家技能执行</text>
        <text x={355} y={row2Y + 42} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">WebSearch · CodeExec</text>
        <text x={355} y={row2Y + 56} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">沙箱隔离</text>

        {/* Path 3: RAG */}
        <rect x={470} y={row2Y} width={200} height={64} rx="10" fill={COLORS.teal} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={570} y={row2Y + 24} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">RAG 知识检索</text>
        <text x={570} y={row2Y + 42} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">向量检索 + 重排序</text>
        <text x={570} y={row2Y + 56} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">Milvus / Qdrant</text>

        {/* Path 4: Code Analysis */}
        <rect x={685} y={row2Y} width={185} height={64} rx="10" fill={COLORS.purple} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={777} y={row2Y + 24} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">代码分析引擎</text>
        <text x={777} y={row2Y + 42} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">静态 AST + 动态调用图</text>
        <text x={777} y={row2Y + 56} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">修复方案生成</text>

        {/* ══════════ Row 3: 失败回退链 ══════════ */}
        <rect x={150} y={row2Y + 78} width={600} height={40} rx="8" fill="rgba(255,255,255,0.75)" stroke={COLORS.stroke} strokeWidth="1" strokeDasharray="5,3" />
        <text x={450} y={row2Y + 100} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">失败回退: 重试(最多 N 次) → ReEnricher 重富化 → 切换备选路径 → 熔断降级</text>
        <line x1={450} y1={row2Y + 64} x2={450} y2={row2Y + 78} stroke={COLORS.arrow} strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrow-main)" />

        {/* 决策逻辑说明卡 */}
        <rect x={40} y={row2Y + 128} width={820} height={52} rx="8" fill={COLORS.gray} stroke={COLORS.stroke} strokeWidth="1" />
        <text x={60} y={row2Y + 148} fill={COLORS.text} fontSize="10" fontWeight="600">决策逻辑: </text>
        <text x={140} y={row2Y + 148} fill={COLORS.textSecondary} fontSize="10">输入哈希 → 缓存命中直接返回 · 意图置信度 &lt; 阈值 → 转 LLM 路由 · 上下文路由偏好 (prefer_reasoning / prefer_knowledge / prefer_analysis) 影响路径选择</text>
        <text x={60} y={row2Y + 168} fill={COLORS.textSecondary} fontSize="10">失败信号 (超时/资源缺失/逻辑错误) → ReEnricher 分类错误类型 → 动态调整 route_preferences → 下一轮路由携带经验重试</text>
      </svg>
    </div>
  );
}

function MemoryHierarchyDiagram() {
  const W = 820;
  const H = 330;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, margin: '0 auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <style>{`text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }`}</style>
        <SvgDefs />
        <rect width={W} height={H} fill={COLORS.bg} />
        <text x={W / 2} y={28} textAnchor="middle" fill={COLORS.text} fontSize="15" fontWeight="700">Hierarchical Memory 三层记忆架构</text>

        {/* Layer 1: Short-term */}
        <rect x={30} y={56} width={350} height={86} rx="12" fill={COLORS.blue} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={50} y={78} fill={COLORS.text} fontSize="12" fontWeight="600">① 短期记忆 · Working Memory</text>
        <text x={50} y={98} fill={COLORS.textSecondary} fontSize="10">当前会话上下文 · 对话历史 · 中间推理状态</text>
        <text x={50} y={116} fill={COLORS.textSecondary} fontSize="10">存储: Redis (TLL 过期) · 容量上限 + 逐出策略 (LRU)</text>
        <text x={50} y={134} fill={COLORS.textSecondary} fontSize="10">并发安全: asyncio.Lock 串行化读写</text>

        {/* Layer 2: Long-term */}
        <rect x={30} y={158} width={350} height={86} rx="12" fill={COLORS.green} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={50} y={180} fill={COLORS.text} fontSize="12" fontWeight="600">② 长期记忆 · Episodic Memory</text>
        <text x={50} y={200} fill={COLORS.textSecondary} fontSize="10">历史工单经验 · 已解决问题 · 用户画像</text>
        <text x={50} y={218} fill={COLORS.textSecondary} fontSize="10">存储: PostgreSQL 持久化 + 语义索引</text>
        <text x={50} y={236} fill={COLORS.textSecondary} fontSize="10">沉淀: 会话结束后由回放/总结任务写入</text>

        {/* Layer 3: Knowledge base */}
        <rect x={30} y={260} width={350} height={58} rx="12" fill={COLORS.beige} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={50} y={282} fill={COLORS.text} fontSize="12" fontWeight="600">③ 知识库 · Knowledge Base</text>
        <text x={50} y={302} fill={COLORS.textSecondary} fontSize="10">RAG 管道: 文档 → 分块 → BGE 向量 → Milvus/Qdrant 检索</text>

        {/* Consolidation arrow */}
        <line x1={380} y1={100} x2={450} y2={100} stroke={COLORS.arrow} strokeWidth="2" markerEnd="url(#arrow-main)" />
        <text x={415} y={92} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">巩固</text>
        <line x1={380} y1={202} x2={450} y2={202} stroke={COLORS.arrow} strokeWidth="2" markerEnd="url(#arrow-main)" />
        <text x={415} y={194} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">归纳</text>

        {/* Right: 检索与生命周期 */}
        <rect x={460} y={56} width={330} height={262} rx="12" fill={COLORS.gray} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={480} y={80} fill={COLORS.text} fontSize="12" fontWeight="600">读取路径 (Selector 上下文增强)</text>
        <text x={480} y={104} fill={COLORS.textSecondary} fontSize="10">1. 短期记忆: 命中当前会话 → 直接使用</text>
        <text x={480} y={124} fill={COLORS.textSecondary} fontSize="10">2. 未命中 → 语义查询长期记忆 (相似经验)</text>
        <text x={480} y={144} fill={COLORS.textSecondary} fontSize="10">3. RAG 知识库: 补充领域文档证据</text>
        <text x={480} y={164} fill={COLORS.textSecondary} fontSize="10">4. 多源融合注入 prompt, 提升路由质量</text>

        <line x1={480} y1={178} x2={770} y2={178} stroke={COLORS.stroke} strokeWidth="0.5" strokeDasharray="4,3" />

        <text x={480} y={198} fill={COLORS.text} fontSize="12" fontWeight="600">写入路径</text>
        <text x={480} y={222} fill={COLORS.textSecondary} fontSize="10">· 实时: 会话消息写入短期记忆 (Redis)</text>
        <text x={480} y={242} fill={COLORS.textSecondary} fontSize="10">· 异步: 回放任务将短期 → 长期巩固</text>
        <text x={480} y={262} fill={COLORS.textSecondary} fontSize="10">· 离线: 工单总结 Agent 归纳 → 知识库</text>
        <text x={480} y={282} fill={COLORS.textSecondary} fontSize="10">· 失效: TTL 过期 / 容量逐出 / 主动清理</text>
        <text x={480} y={306} fill={COLORS.textSecondary} fontSize="9" fontStyle="italic">关键设计: 记忆带置信度与衰减, 过期自动回收</text>
      </svg>
    </div>
  );
}

function HybridPlannerDiagram() {
  const W = 860;
  const H = 400;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, margin: '0 auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <style>{`text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }`}</style>
        <SvgDefs />
        <rect width={W} height={H} fill={COLORS.bg} />
        <text x={W / 2} y={28} textAnchor="middle" fill={COLORS.text} fontSize="15" fontWeight="700">Hybrid Planner 双模式规划</text>

        {/* Goal input */}
        <rect x={330} y={48} width={200} height={42} rx="10" fill={COLORS.blue} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={430} y={74} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">用户目标 Goal</text>

        {/* Mode switch box */}
        <rect x={280} y={106} width={300} height={58} rx="12" fill={COLORS.beige} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={430} y={128} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">模式选择</text>
        <text x={430} y={146} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">简单/紧急 → REACTIVE · 复杂/多步 → DELIBERATIVE</text>
        <line x1={430} y1={90} x2={430} y2={106} stroke={COLORS.arrow} strokeWidth="2" markerEnd="url(#arrow-main)" />

        {/* Branch lines */}
        <line x1={330} y1={164} x2={205} y2={190} stroke={COLORS.arrow} strokeWidth="2" markerEnd="url(#arrow-main)" />
        <line x1={530} y1={164} x2={655} y2={190} stroke={COLORS.arrow} strokeWidth="2" markerEnd="url(#arrow-main)" />

        {/* ══════════ Left: REACTIVE ══════════ */}
        <rect x={40} y={196} width={330} height={160} rx="12" fill={COLORS.green} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={205} y={220} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">REACTIVE 反应式</text>
        <text x={205} y={238} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">低延迟 · 单轮推理</text>

        <rect x={60} y={250} width={290} height={34} rx="7" fill="rgba(255,255,255,0.7)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={205} y={272} textAnchor="middle" fill={COLORS.text} fontSize="10">观察 → 行动 → 观察循环 (ReAct)</text>

        <rect x={60} y={292} width={140} height={34} rx="7" fill="rgba(255,255,255,0.7)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={130} y={314} textAnchor="middle" fill={COLORS.text} fontSize="10">工具调用</text>
        <rect x={210} y={292} width={140} height={34} rx="7" fill="rgba(255,255,255,0.7)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={280} y={314} textAnchor="middle" fill={COLORS.text} fontSize="10">结果反馈</text>
        <text x={205} y={348} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9" fontStyle="italic">适用: 告警确认 · 单点故障 · 即时问答</text>

        {/* ══════════ Right: DELIBERATIVE ══════════ */}
        <rect x={490} y={196} width={330} height={160} rx="12" fill={COLORS.purple} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={655} y={220} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">DELIBERATIVE 深思式</text>
        <text x={655} y={238} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">LLM 目标分解 · 逐步执行</text>

        <rect x={510} y={250} width={290} height={34} rx="7" fill="rgba(255,255,255,0.7)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={655} y={272} textAnchor="middle" fill={COLORS.text} fontSize="10">LLM 分解 → JSON 步骤计划</text>

        <rect x={510} y={292} width={140} height={34} rx="7" fill="rgba(255,255,255,0.7)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={580} y={314} textAnchor="middle" fill={COLORS.text} fontSize="10">顺序/并行执行</text>
        <rect x={660} y={292} width={140} height={34} rx="7" fill="rgba(255,255,255,0.7)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={730} y={314} textAnchor="middle" fill={COLORS.text} fontSize="10">失败回退</text>
        <text x={655} y={348} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9" fontStyle="italic">适用: 复杂工单 · 多子系统故障 · 变更方案</text>

        {/* Fallback note */}
        <rect x={140} y={370} width={580} height={22} rx="6" fill="rgba(255,255,255,0.75)" stroke={COLORS.stroke} strokeWidth="1" strokeDasharray="4,3" />
        <text x={430} y={385} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">鲁棒性: LLM 分解失败/返回空步骤 → 自动回退规则式关键词分解, 保证任何输入都有计划产出</text>
      </svg>
    </div>
  );
}

function ResilienceDiagram() {
  const W = 860;
  const H = 380;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, margin: '0 auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <style>{`text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }`}</style>
        <SvgDefs />
        <rect width={W} height={H} fill={COLORS.bg} />
        <text x={W / 2} y={28} textAnchor="middle" fill={COLORS.text} fontSize="15" fontWeight="700">Resilience 熔断与降级策略</text>

        {/* Request entry */}
        <rect x={330} y={48} width={200} height={40} rx="10" fill={COLORS.blue} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={430} y={73} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">下游调用请求</text>

        {/* Circuit breaker state machine */}
        <rect x={250} y={104} width={360} height={70} rx="12" fill={COLORS.beige} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={430} y={126} textAnchor="middle" fill={COLORS.text} fontSize="12" fontWeight="600">Circuit Breaker 熔断器状态机</text>
        <text x={430} y={146} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">CLOSED ─失败≥阈值→ OPEN ─超时→ HALF_OPEN ─探测成功→ CLOSED</text>
        <text x={430} y={162} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">asyncio.Lock 并发安全 · 失败计数平滑衰减 · 可观测 get_state_info()</text>
        <line x1={430} y1={88} x2={430} y2={104} stroke={COLORS.arrow} strokeWidth="2" markerEnd="url(#arrow-main)" />

        {/* Three outcomes */}
        <line x1={340} y1={174} x2={240} y2={200} stroke={COLORS.arrow} strokeWidth="1.5" markerEnd="url(#arrow-main)" />
        <line x1={430} y1={174} x2={430} y2={200} stroke={COLORS.arrow} strokeWidth="1.5" markerEnd="url(#arrow-main)" />
        <line x1={520} y1={174} x2={620} y2={200} stroke={COLORS.arrow} strokeWidth="1.5" markerEnd="url(#arrow-main)" />

        {/* Success */}
        <rect x={90} y={206} width={240} height={80} rx="10" fill={COLORS.green} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={210} y={230} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">正常调用</text>
        <text x={210} y={250} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">CLOSED 直通 · 成功后</text>
        <text x={210} y={266} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">失败计数减一 (衰减)</text>
        <text x={210} y={282} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">HALF_OPEN 探测成功 → 闭合</text>

        {/* Fallback cascade */}
        <rect x={350} y={206} width={180} height={80} rx="10" fill={COLORS.orange} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={440} y={230} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">失败</text>
        <text x={440} y={250} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">记录失败 → 计数+1</text>
        <text x={440} y={266} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">达阈值 → 熔断 OPEN</text>
        <text x={440} y={282} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">快速失败拒绝后续请求</text>

        {/* Fallback value */}
        <rect x={560} y={206} width={210} height={80} rx="10" fill={COLORS.purple} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={665} y={230} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">降级 Fallback</text>
        <text x={665} y={250} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">返回降级值 / 缓存结果</text>
        <text x={665} y={266} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">FallbackCascade 多级</text>
        <text x={665} y={282} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">策略逐级尝试</text>

        {/* Cascade detail */}
        <rect x={90} y={300} width={680} height={62} rx="10" fill={COLORS.gray} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={110} y={322} fill={COLORS.text} fontSize="11" fontWeight="600">FallbackCascade 降级链</text>
        <rect x={110} y={332} width={150} height={20} rx="5" fill="rgba(255,255,255,0.8)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={185} y={346} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">MCP 工具 → 原生 Skill</text>
        <text x={265} y={346} fill={COLORS.textSecondary} fontSize="10">→</text>
        <rect x={278} y={332} width={150} height={20} rx="5" fill="rgba(255,255,255,0.8)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={353} y={346} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">→ 规则引擎 → 直接 LLM</text>
        <text x={440} y={346} fill={COLORS.textSecondary} fontSize="10">→</text>
        <rect x={460} y={332} width={150} height={20} rx="5" fill="rgba(255,255,255,0.8)" stroke={COLORS.stroke} strokeWidth="1" />
        <text x={535} y={346} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">→ 缓存快照 → 明确报错</text>
        <text x={650} y={346} fill={COLORS.textSecondary} fontSize="10">每级失败记录日志, 最后返回结构化 FallbackResult</text>
      </svg>
    </div>
  );
}

function FtaAIOpsFlowDiagram() {
  const W = 900;
  const H = 300;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, margin: '0 auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <style>{`text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }`}</style>
        <SvgDefs />
        <rect width={W} height={H} fill={COLORS.bg} />
        <text x={W / 2} y={28} textAnchor="middle" fill={COLORS.text} fontSize="15" fontWeight="700">FTA 引擎在 AIOps 场景的应用流程</text>

        {/* Row 1: 五个阶段 */}
        <rect x={20} y={56} width={160} height={64} rx="10" fill={COLORS.blue} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={100} y={78} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">① 事件接入</text>
        <text x={100} y={96} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">告警 · 日志 · 指标</text>
        <text x={100} y={110} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">异常信号采集</text>

        <Arrow x1={180} y1={88} x2={210} y2={88} />

        <rect x={210} y={56} width={160} height={64} rx="10" fill={COLORS.green} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={290} y={78} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">② 建树分析</text>
        <text x={290} y={96} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">AND/OR/NOT/VOTING</text>
        <text x={290} y={110} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">故障树构造</text>

        <Arrow x1={370} y1={88} x2={400} y2={88} />

        <rect x={400} y={56} width={160} height={64} rx="10" fill={COLORS.beige} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={480} y={78} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">③ 定量分析</text>
        <text x={480} y={96} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">最小割集 · 顶事件概率</text>
        <text x={480} y={110} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">蒙特卡洛仿真</text>

        <Arrow x1={560} y1={88} x2={590} y2={88} />

        <rect x={590} y={56} width={160} height={64} rx="10" fill={COLORS.orange} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={670} y={78} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">④ 根因定位</text>
        <text x={670} y={96} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">按割集概率排序</text>
        <text x={670} y={110} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">最小割集 → 最可能根因</text>

        <Arrow x1={750} y1={88} x2={780} y2={88} />

        <rect x={780} y={56} width={110} height={64} rx="10" fill={COLORS.purple} stroke={COLORS.stroke} strokeWidth="2" filter="url(#shadow-soft)" />
        <text x={835} y={78} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">⑤ 处置建议</text>
        <text x={835} y={96} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">修复动作</text>
        <text x={835} y={110} textAnchor="middle" fill={COLORS.textSecondary} fontSize="9">复盘沉淀</text>

        {/* Row 2: 与 Selector 的协同 */}
        <rect x={120} y={150} width={660} height={60} rx="10" fill={COLORS.gray} stroke={COLORS.stroke} strokeWidth="1.5" />
        <text x={450} y={172} textAnchor="middle" fill={COLORS.text} fontSize="11" fontWeight="600">与 Intelligent Selector 协同</text>
        <text x={450} y={192} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">选择器将复杂多步故障路由至 FTA → 结果写回记忆/知识库 → 同型故障二次触发时直接命中缓存或相似案例</text>
        <line x1={450} y1={120} x2={450} y2={150} stroke={COLORS.arrow} strokeWidth="1.5" markerEnd="url(#arrow-main)" />

        {/* Row 3: 失败回退 */}
        <rect x={120} y={230} width={660} height={40} rx="8" fill="rgba(255,255,255,0.75)" stroke={COLORS.stroke} strokeWidth="1" strokeDasharray="5,3" />
        <text x={450} y={254} textAnchor="middle" fill={COLORS.textSecondary} fontSize="10">FTA 引擎不可用/失败 → 选择器自动降级: RAG 相似案例 → 代码分析 → 直接 LLM 推理</text>
      </svg>
    </div>
  );
}

export default function ArchitecturePage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <PageHeader
        title="架构说明"
        description="ResolveAgent 核心架构文档 — 面向问题解决的综合智能体平台"
      />

      {/* ═══════════════ 第一层：什么是 Agent Harness ═══════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Agent Harness 理念
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            ResolveAgent 采用 <span className="font-semibold text-foreground">Agent = Model + Harness</span> 架构范式。
            Model 是大语言模型本身的推理能力，而 <span className="font-semibold text-foreground">Harness</span> 涵盖所有非模型逻辑 ——
            状态管理、工具执行、沙箱环境、生命周期 Hooks、上下文策略、路由调度和可观测性。
            这种分离使得同一 Harness 可以驱动不同 LLM 后端，也使系统具备更强的可测试性和可组合性。
          </p>
          <HarnessDiagram />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">模型无关</p>
              <p className="text-xs text-muted-foreground">Harness 与 LLM 解耦，支持通义千问、文心一言、智谱清言、OpenAI 等多种后端自由切换</p>
            </div>
            <div className="rounded-md bg-purple-500/5 border border-purple-500/20 p-3">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">可组合能力</p>
              <p className="text-xs text-muted-foreground">FTA 工作流、专家技能、RAG 管道、代码分析引擎作为 Harness 组件，按需编排组合</p>
            </div>
            <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-3">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">全生命周期治理</p>
              <p className="text-xs text-muted-foreground">Hooks 机制在 Agent 执行的各阶段（pre/post）插入自定义逻辑，实现精细化控制</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════ 第二层：ResolveAgent 的问题解决创新 ═══════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            ResolveAgent 问题解决创新
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            传统 AI Agent 系统采用固定处理流程，而 ResolveAgent 通过<span className="font-semibold text-foreground">智能选择器</span>实现动态路由，
            根据用户意图自动选择最优执行路径，并协调四大执行子系统（FTA、Skills、RAG、Code Analysis）协同工作。
            以下是 ResolveAgent 为提升问题解决能力所做的六大核心创新：
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {innovations.map((cap) => (
              <div key={cap.title} className={cn('rounded-lg border p-4', cap.bgColor)}>
                <div className="flex items-center gap-2 mb-2">
                  <cap.icon className={cn('h-4 w-4', cap.color)} />
                  <span className="text-sm font-medium">{cap.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{cap.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════ 第三层：如何实现这些创新 ═══════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            创新技术实现：FTA / Skills / RAG 协同调度
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            MegaAgent 编排器通过智能选择器（Intelligent Selector）将用户请求分发到最合适的执行子系统：
          </p>
          <CoordDiagram />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">FTA Engine</p>
              <p className="text-xs text-muted-foreground">故障树分析，支持 AND/OR/NOT/VOTING/INHIBIT/PRIORITY_AND 门类型，最小割集计算，蒙特卡洛仿真</p>
            </div>
            <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-3">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Skills System</p>
              <p className="text-xs text-muted-foreground">沙箱执行（10s CPU，512MB RAM），内置 WebSearch、CodeExecution、FileOps</p>
            </div>
            <div className="rounded-md bg-cyan-500/5 border border-cyan-500/20 p-3">
              <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400 mb-1">RAG Pipeline</p>
              <p className="text-xs text-muted-foreground">6 格式解析，5 种分块策略，BGE 嵌入，Milvus/Qdrant 向量索引，三层重排序</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════ 第四层：核心方法论设计 ═══════════════ */}

      {/* Intelligent Selector 工作流 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Split className="h-4 w-4 text-primary" />
            Intelligent Selector 智能路由机制
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Selector 是三阶段元路由引擎：<span className="font-semibold text-foreground">意图分析 → 上下文增强 → 路由决策</span>。
            相比传统 Agent 的固定流程（LangGraph / CrewAI 的静态图），它根据用户意图与实时上下文动态选择执行路径，
            并通过<span className="font-semibold text-foreground">失败回退 + 重富化</span>实现自适应调度：
          </p>
          <SelectorFlowDiagram />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">三策略路由</p>
              <p className="text-xs text-muted-foreground">规则路由（确定性快路径）→ LLM 路由（语义理解）→ 混合路由（置信度分级），兼顾延迟与智能</p>
            </div>
            <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-3">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">失败感知</p>
              <p className="text-xs text-muted-foreground">ReEnricher 对错误分类（超时/资源缺失/逻辑错误…）并动态调整 route_preferences，下一轮路由携带经验重试</p>
            </div>
            <div className="rounded-md bg-purple-500/5 border border-purple-500/20 p-3">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">缓存加速</p>
              <p className="text-xs text-muted-foreground">输入 SHA-256 哈希命中直接返回；重试时按配置绕过缓存，避免拿旧结果掩盖新失败</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hierarchical Memory 三层记忆 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-primary" />
            Hierarchical Memory 三层记忆架构
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            记忆系统按<span className="font-semibold text-foreground">时效性与抽象层级</span>分为三层：
            短期记忆（会话态）→ 长期记忆（经验态）→ 知识库（组织态），各层独立存储、按需巩固沉淀：
          </p>
          <MemoryHierarchyDiagram />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-blue-500/5 border border-blue-500/20 p-3">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">短期记忆 · Working</p>
              <p className="text-xs text-muted-foreground">Redis 会话缓存，TTL 过期 + 容量上限逐出（LRU），asyncio.Lock 保证并发读写安全</p>
            </div>
            <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-3">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">长期记忆 · Episodic</p>
              <p className="text-xs text-muted-foreground">PostgreSQL 持久化历史工单/已解决问题，支持语义相似查询，会话结束后异步巩固写入</p>
            </div>
            <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">知识库 · Knowledge</p>
              <p className="text-xs text-muted-foreground">RAG 管道：文档解析 → 分块 → BGE 向量化 → Milvus/Qdrant 检索，为路由提供领域证据</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hybrid Planner 双模式 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ToggleLeft className="h-4 w-4 text-primary" />
            Hybrid Planner 混合规划
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Planner 在<span className="font-semibold text-foreground">反应式（REACTIVE）</span>与
            <span className="font-semibold text-foreground">深思式（DELIBERATIVE）</span>双模式间动态切换：
            简单/紧急任务走 ReAct 快路径，复杂多步任务由 LLM 分解为结构化计划逐步执行。
          </p>
          <HybridPlannerDiagram />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-3">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">REACTIVE 反应式</p>
              <p className="text-xs text-muted-foreground">单轮推理 + 工具调用循环，延迟最低；适合告警确认、单点故障、即时问答等确定性场景</p>
            </div>
            <div className="rounded-md bg-purple-500/5 border border-purple-500/20 p-3">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">DELIBERATIVE 深思式</p>
              <p className="text-xs text-muted-foreground">LLM 目标分解为 JSON 步骤计划，支持顺序/并行执行；适合复杂工单、多子系统故障排查</p>
            </div>
            <div className="rounded-md bg-orange-500/5 border border-orange-500/20 p-3">
              <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">容错回退</p>
              <p className="text-xs text-muted-foreground">LLM 分解失败或返回空步骤 → 自动回退规则式关键词分解，任何输入都有计划产出</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resilience 熔断降级 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Resilience 熔断与降级策略
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Resilience 模块为下游依赖提供<span className="font-semibold text-foreground">熔断器 + 降级级联</span>双保险：
            连续失败触发熔断快速失败，保护系统免遭雪崩；降级链逐级尝试备选策略，保证核心功能可用：
          </p>
          <ResilienceDiagram />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-rose-500/5 border border-rose-500/20 p-3">
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">熔断三态机</p>
              <p className="text-xs text-muted-foreground">CLOSED → OPEN → HALF_OPEN 完整状态机；失败计数平滑衰减，探测成功后自动闭合；支持手动重置与状态观测</p>
            </div>
            <div className="rounded-md bg-orange-500/5 border border-orange-500/20 p-3">
              <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">降级级联</p>
              <p className="text-xs text-muted-foreground">FallbackCascade 按序尝试 MCP 工具 → 原生 Skill → 规则引擎 → 直接 LLM → 缓存快照，逐级降级</p>
            </div>
            <div className="rounded-md bg-purple-500/5 border border-purple-500/20 p-3">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">结构化结果</p>
              <p className="text-xs text-muted-foreground">统一返回 FallbackResult（success / strategy_used / data / error），失败策略全程可观测、可审计</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FTA AIOps 应用流程 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary" />
            FTA 引擎在 AIOps 场景的应用流程
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            FTA（故障树分析）引擎将运维事件转化为<span className="font-semibold text-foreground">可量化的故障逻辑模型</span>：
            从事件接入到建树分析、定量仿真、根因定位再到处置建议，形成完整的 AIOps 诊断闭环：
          </p>
          <FtaAIOpsFlowDiagram />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">六种门类型</p>
              <p className="text-xs text-muted-foreground">AND / OR / NOT / VOTING / INHIBIT / PRIORITY_AND，支持因果、时序与优先级语义</p>
            </div>
            <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-3">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">定量分析</p>
              <p className="text-xs text-muted-foreground">最小割集计算 + 蒙特卡洛仿真，按概率排序定位最可能根因，替代人工经验猜测</p>
            </div>
            <div className="rounded-md bg-purple-500/5 border border-purple-500/20 p-3">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">经验闭环</p>
              <p className="text-xs text-muted-foreground">结果写回记忆与知识库，同型故障再次触发时直接命中缓存或相似案例，越用越准</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════ 第五层：系统设计详解 ═══════════════ */}

      {/* System Architecture Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            系统架构总览
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            五层架构：客户端 → API 网关（Higress）→ 平台服务（Go）→ Agent 运行时（Python）→ 数据层
          </p>
          <ArchitectureDiagram />
        </CardContent>
      </Card>

      {/* Registry System */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            注册表系统（9 大 Registry）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Go 注册表系统作为唯一数据源（Single Source of Truth），通过 Higress 网关同步路由配置，确保系统拓扑一致性：
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Registry</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Resource</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'AgentRegistry', resource: 'Agent definitions', purpose: 'Agent lifecycle, configuration, status' },
                  { name: 'SkillRegistry', resource: 'Skill manifests', purpose: 'Skill discovery, version management' },
                  { name: 'WorkflowRegistry', resource: 'FTA workflows', purpose: 'Workflow definitions, tree structures' },
                  { name: 'RAGRegistry', resource: 'RAG collections', purpose: 'Collection metadata, embedding config' },
                  { name: 'RAGDocumentRegistry', resource: 'RAG documents', purpose: 'Individual document tracking' },
                  { name: 'FTADocumentRegistry', resource: 'FTA documents', purpose: 'Fault tree document management' },
                  { name: 'HookRegistry', resource: 'Hook definitions', purpose: 'Lifecycle hook configuration' },
                  { name: 'CodeAnalysisRegistry', resource: 'Analysis results', purpose: 'Static analysis result storage' },
                  { name: 'MemoryRegistry', resource: 'Agent memory', purpose: 'Conversation history, resolved issues' },
                ].map((r) => (
                  <tr key={r.name} className="border-b border-border/30">
                    <td className="py-2 px-3 font-mono text-primary">{r.name}</td>
                    <td className="py-2 px-3">{r.resource}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Design Principles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            核心设计原则
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {designPrinciples.map((p) => (
              <div key={p.label} className="rounded-md border border-border/50 p-3">
                <p className="text-xs font-medium text-primary mb-1">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Go-Python Bridge (moved to bottom as system implementation detail) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Go-Python 通信桥接
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Why: 多语言架构的必要性 */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              ResolveAgent 采用 <span className="font-semibold text-foreground">Go + Python 多语言架构</span>，
              这一设计源于核心技术决策（<span className="text-xs font-mono text-primary">ADR-001</span>）：单一语言难以同时满足高性能平台服务和灵活 AI 运行时的需求。
              Go 平台与 Python Runtime 通过 HTTP + SSE 流式通信实现跨语言协同，让每个层级都使用最适合的技术栈。
            </p>
          </div>

          {/* What: 各语言的技术优势 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-md bg-emerald-500/10 p-1.5">
                  <Cpu className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Go — 平台服务层</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span><span className="font-medium text-foreground">高并发低延迟</span> — goroutine 原生并发，轻松处理万级连接</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span><span className="font-medium text-foreground">云原生生态</span> — 与 Kubernetes、etcd、Higress 天然协作</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span><span className="font-medium text-foreground">静态编译</span> — 单二进制部署，启动快、资源占用低</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span><span className="font-medium text-foreground">类型安全</span> — 泛型注册表 + gRPC 强类型接口，长期可维护</span>
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-md bg-purple-500/10 p-1.5">
                  <Bot className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Python — Agent 运行时层</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-1.5">
                  <span className="text-purple-500 mt-0.5">•</span>
                  <span><span className="font-medium text-foreground">AI/ML 生态</span> — PyTorch、Transformers、BGE 嵌入等开箱即用</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-purple-500 mt-0.5">•</span>
                  <span><span className="font-medium text-foreground">AgentScope 框架</span> — 成熟的 Agent 编排引擎，原生 Python 实现</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-purple-500 mt-0.5">•</span>
                  <span><span className="font-medium text-foreground">快速迭代</span> — AI 能力原型开发效率高，Skill 编写门槛低</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-purple-500 mt-0.5">•</span>
                  <span><span className="font-medium text-foreground">数据科学</span> — NumPy、Pandas 等支撑 FTA 概率分析与向量计算</span>
                </li>
              </ul>
            </div>
          </div>

          {/* How: 通信架构图 */}
          <GoPythonBridgeDiagram />

          {/* 通信机制详解 */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-md bg-muted/30 p-3">
              <p className="font-medium mb-1">SSE 流式传输</p>
              <p className="text-muted-foreground">长运行操作（Agent 执行、语料导入）通过 Server-Sent Events 实时推送进度</p>
            </div>
            <div className="rounded-md bg-muted/30 p-3">
              <p className="font-medium mb-1">RegistryClient</p>
              <p className="text-muted-foreground">Python 侧 HTTP 客户端，查询 Go Registry 获取 Skills、Workflows、RAG 集合</p>
            </div>
          </div>

          {/* Benefit: 架构收益 */}
          <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
            <p className="text-xs font-semibold text-foreground mb-3">架构收益</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <span><span className="font-medium text-foreground">性能最优化</span> — Go 承担高频 API / 注册表读写，Python 专注计算密集型 AI 推理，各取所长</span>
              </div>
              <div className="flex items-start gap-2">
                <Layers className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                <span><span className="font-medium text-foreground">独立扩缩容</span> — 平台层和运行时层可独立水平扩展，按需分配资源</span>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" />
                <span><span className="font-medium text-foreground">AI 能力充分释放</span> — Python 生态的 LLM/RAG/FTA 能力无需跨语言妥协</span>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <span><span className="font-medium text-foreground">故障隔离</span> — 运行时崩溃不影响平台服务；gRPC + SSE 提供清晰的边界契约</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loop Engineering */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            Loop Engineering 循环工程
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            ResolveAgent 集成了 <span className="font-semibold text-foreground">Loop Engineering（循环工程）</span> 方法论，
            实现 <span className="font-mono text-xs text-primary">Observe → Orient → Decide → Act</span> 持续闭环改进。
            反馈信号从各子系统采集，经过环形缓冲和滑动窗口聚合，由告警引擎决策，最终驱动熔断器和自适应权重调整。
          </p>
          <LoopEngineeringDiagram />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-rose-500/5 border border-rose-500/20 p-3">
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">反馈循环</p>
              <p className="text-xs text-muted-foreground">FeedbackSignal 原子单元 → RingBuffer (1000) → Aggregator (5m 窗口) → 三种分发器 (Log/Webhook/NATS)</p>
            </div>
            <div className="rounded-md bg-orange-500/5 border border-orange-500/20 p-3">
              <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">熔断器</p>
              <p className="text-xs text-muted-foreground">三态机 (Closed→Open→HalfOpen→Closed)，failure_threshold=5，recovery_timeout=30s</p>
            </div>
            <div className="rounded-md bg-purple-500/5 border border-purple-500/20 p-3">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">自适应选择器</p>
              <p className="text-xs text-muted-foreground">AdaptiveWeightAdjuster 基于成功率调整权重，时间衰减因子 0.95 向中性值回归</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub Documentation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            子架构文档
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {subDocs.map((doc) => (
              <Link
                key={doc.id}
                to={doc.href}
                className="group flex items-start gap-3 rounded-lg border border-border/50 p-4 transition-all hover:border-primary/30 hover:bg-accent/20"
              >
                <div className="rounded-md bg-primary/10 p-2 shrink-0">
                  <doc.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">{doc.title}</span>
                    {doc.badge && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        {doc.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{doc.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
