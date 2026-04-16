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
];

const designPrinciples = [
  { label: 'Agent-Driven', desc: 'All operations orchestrated by intelligent agents' },
  { label: 'Adaptive', desc: 'Workflows dynamically adjust based on context' },
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

      {/* ═══════════════ 第四层：系统设计详解 ═══════════════ */}

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
