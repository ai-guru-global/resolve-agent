import { useState, useRef } from 'react';
import {
  Bot,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Brain,
  BookOpen,
  GitBranch,
  FileText,
  BarChart3,
  Sparkles,
  ArrowLeft,
  Database,
  Activity,
  Layers,
  Network,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface DemoScenario {
  id: string;
  title: string;
  description: string;
  icon: typeof Bot;
  color: string;
  input: string;
  steps: DemoStep[];
  response: DemoResponse;
}

interface DemoStep {
  label: string;
  description: string;
  icon: typeof Bot;
  duration?: number;
}

interface DemoResponse {
  content: string;
  route_type: string;
  confidence: number;
  metadata: Record<string, unknown>;
}

const routeTypeConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  multi: { label: 'Multi-Agent', variant: 'default' },
  fta: { label: '故障树分析', variant: 'secondary' },
  rag: { label: '知识检索', variant: 'secondary' },
  skill: { label: 'Skill 调用', variant: 'secondary' },
  direct: { label: '直接执行', variant: 'outline' },
};

const scenarioCategories = [
  { label: '智能诊断', icon: Brain, color: 'text-purple-500', ids: ['mega', 'fta', 'database', 'network'] },
  { label: '自动化运维', icon: Zap, color: 'text-green-500', ids: ['skill', 'change', 'security'] },
  { label: '数据分析', icon: BarChart3, color: 'text-blue-500', ids: ['rag', 'log', 'capacity'] },
];

const demoScenarios: DemoScenario[] = [
  {
    id: 'mega',
    title: '智能问题诊断',
    description: 'Multi-Agent 协作，综合调用 Skills、RAG、FTA 进行复杂问题分析',
    icon: Sparkles,
    color: 'text-purple-500',
    input: '集群节点 cn-hangzhou.10.0.3.47 内存使用率 91%，部分 Pod 出现重启',
    steps: [
      { label: '意图理解', description: '解析问题，提取关键实体', icon: Brain, duration: 120 },
      { label: '路由选择', description: '综合评估选择 Multi-Agent 模式', icon: Zap, duration: 80 },
      { label: '并行执行', description: 'K8s 诊断 Skill 与 etcd 检查', icon: Play, duration: 850 },
      { label: '结果汇总', description: '聚合返回，生成综合报告', icon: Bot, duration: 180 },
    ],
    response: {
      content: `## 诊断结果\n\n- 集群节点数：12/12 Ready\n- etcd 集群健康：3/3 members\n- 异常节点：\`cn-hangzhou.10.0.3.47\` 内存 91.3%，OOM 风险\n- 3 Pod 处于 CrashLoopBackOff\n\n**建议**：kubectl drain 后扩容节点池`,
      route_type: 'multi',
      confidence: 0.91,
      metadata: { latency_ms: 1230, model: 'qwen-max' },
    },
  },
  {
    id: 'fta',
    title: '故障树分析',
    description: '基于 FTA 引擎进行根因定位，展示故障传播链路',
    icon: GitBranch,
    color: 'text-orange-500',
    input: 'K8s 节点 NotReady，kubelet 报 FailedToStartCIDR',
    steps: [
      { label: '故障树构建', description: '构建顶层与中间事件', icon: GitBranch, duration: 200 },
      { label: '叶子节点评估', description: '并行检查策略、路由、安全组', icon: CheckCircle2, duration: 1200 },
      { label: '割集分析', description: '计算最小割集，定位根因', icon: AlertCircle, duration: 3400 },
      { label: '报告生成', description: '输出修复建议', icon: FileText, duration: 150 },
    ],
    response: {
      content: `## 故障树分析\n\n**顶层事件**: K8s 节点 NotReady\n\n\`\`\`\n[根因] NetworkPolicy 变更导致 kubelet 心跳包被 Drop\n  └─ [中间] 节点与 API Server 通信中断\n       ├─ NetworkPolicy 规则更新 ✅\n       ├─ 安全组入方向规则 ✅\n       └─ VPC 路由表变更 ❌ (排除)\n\`\`\`\n\n**修复**：放行 kubelet 端口 10250/10255`,
      route_type: 'fta',
      confidence: 0.87,
      metadata: { fault_tree: 'ft-k8s-notready', nodes_evaluated: 8 },
    },
  },
  {
    id: 'rag',
    title: '运维知识问答',
    description: '基于 RAG 知识库检索，结合历史案例进行智能问答',
    icon: BookOpen,
    color: 'text-blue-500',
    input: 'RDS MySQL 主从同步延迟超过 5 秒，如何排查？',
    steps: [
      { label: 'query 改写', description: '转换为向量检索 query', icon: Brain, duration: 60 },
      { label: '向量检索', description: '在知识库中检索相关内容', icon: BookOpen, duration: 180 },
      { label: '结果排序', description: '语义相似度与相关性评分', icon: BarChart3, duration: 90 },
      { label: '答案生成', description: '综合检索结果生成回答', icon: Sparkles, duration: 220 },
    ],
    response: {
      content: `## 运维知识检索结果\n\n**常见原因**：\n1. **大事务阻塞** — 启用 parallel replication\n2. **从库规格不足** — 升级从库规格\n3. **binlog 传输延迟** — 检查 Seconds_Behind_Master\n\n> 来源：《RDS MySQL 主从同步最佳实践》`,
      route_type: 'rag',
      confidence: 0.84,
      metadata: { sources: 3, collection: 'col-ops-kb-001' },
    },
  },
  {
    id: 'skill',
    title: '工单自动处理',
    description: '调用专业 Skill 自动化处理运维工单',
    icon: Zap,
    color: 'text-green-500',
    input: 'INC-2024-0891: ECS cpu.utilization 持续 95% 超过 10 分钟',
    steps: [
      { label: '工单解析', description: '提取关键信息与上下文', icon: FileText, duration: 100 },
      { label: 'Skill 调用', description: '执行 ticket-handler 技能', icon: Zap, duration: 420 },
      { label: '影响评估', description: '评估影响范围与优先级', icon: AlertCircle, duration: 150 },
      { label: '处理建议', description: '生成应急预案', icon: CheckCircle2, duration: 150 },
    ],
    response: {
      content: `## 工单分析结果\n\n| 维度 | 结果 |\n|------|------|\n| 影响范围 | 生产 / cn-hangzhou |\n| 优先级 | **P1 - 紧急** |\n| 涉及组件 | ACK + ECS |\n| 预计恢复 | 30 分钟内 |\n\n**处理**：拉起应急响应群，执行 PLAN-ECS-001`,
      route_type: 'skill',
      confidence: 0.93,
      metadata: { skill_name: 'ticket-handler', execution_ms: 820 },
    },
  },
  {
    id: 'log',
    title: '日志智能分析',
    description: '海量日志中提取关键信息，自动识别异常模式',
    icon: FileText,
    color: 'text-yellow-600',
    input: '分析 production命名空间 过去1小时的容器日志，查找错误',
    steps: [
      { label: '日志采集', description: '从 Kubernetes 采集容器日志', icon: FileText, duration: 300 },
      { label: '模式识别', description: '使用正则与 ML 识别异常模式', icon: Brain, duration: 450 },
      { label: '聚合分析', description: '按错误类型、时间线聚合', icon: BarChart3, duration: 200 },
      { label: '根因推断', description: '关联多维度数据定位根因', icon: AlertCircle, duration: 350 },
    ],
    response: {
      content: `## 日志分析结果\n\n**错误统计**（过去 1 小时）：\n- OOMKilled: 23 次（涉及 5 个 Pod）\n- Connection Timeout: 156 次\n- 503 Service Unavailable: 89 次\n\n**异常时段**：14:32-14:45 流量突增导致\n\n**根因**：后端连接池耗尽，建议扩容`,
      route_type: 'multi',
      confidence: 0.88,
      metadata: { logs_analyzed: 12847, errors_found: 268 },
    },
  },
  {
    id: 'change',
    title: '变更风险评审',
    description: '自动化评审变更方案，预测潜在风险并给出建议',
    icon: AlertCircle,
    color: 'text-red-500',
    input: '评审变更：升级 ACK 集群 Kubernetes 版本从 1.26 到 1.28',
    steps: [
      { label: '变更解析', description: '提取变更内容与影响范围', icon: FileText, duration: 80 },
      { label: '风险查询', description: '检索历史变更风险案例', icon: BookOpen, duration: 150 },
      { label: '影响评估', description: '计算业务影响与兼容性', icon: BarChart3, duration: 200 },
      { label: '建议生成', description: '输出风险等级与缓解措施', icon: CheckCircle2, duration: 120 },
    ],
    response: {
      content: `## 变更风险评审\n\n**变更内容**：ACK 1.26 → 1.28\n\n**风险等级**：🟡 中等\n\n**已知风险**：\n1. API 弃用：batch/v1 CronJob 需迁移\n2. 网络策略：iptables 改为 nftables\n\n**建议**：\n1. 先在预发环境验证\n2. 准备回滚方案（预计 15 分钟）\n3. 确认应用兼容 Cilium`,
      route_type: 'rag',
      confidence: 0.85,
      metadata: { risk_level: 'medium', compatibility_issues: 2 },
    },
  },
  {
    id: 'capacity',
    title: '容量规划分析',
    description: '基于历史数据预测资源需求，优化成本',
    icon: BarChart3,
    color: 'text-indigo-500',
    input: '分析下个月 ACK 集群的容量需求，预计流量增长 40%',
    steps: [
      { label: '数据采集', description: '采集历史 CPU、内存、网络数据', icon: BarChart3, duration: 300 },
      { label: '趋势预测', description: '使用时间序列模型预测增长', icon: Brain, duration: 500 },
      { label: '瓶颈分析', description: '识别潜在资源瓶颈', icon: AlertCircle, duration: 200 },
      { label: '方案输出', description: '生成扩容建议与成本估算', icon: CheckCircle2, duration: 150 },
    ],
    response: {
      content: `## 容量规划报告\n\n**流量增长**：40% (日均 QPS 2,340 → 3,276)\n\n**资源需求**：\n| 资源 | 当前 | 建议 |\n|------|------|------|\n| 节点数 | 12 | 16 |\n| CPU | 64 核 | 96 核 |\n| 内存 | 256 GB | 384 GB |\n\n**成本估算**：+¥12,800/月\n\n**节省建议**：开启 Spot 实例可节省 35%`,
      route_type: 'direct',
      confidence: 0.82,
      metadata: { current_nodes: 12, recommended_nodes: 16, cost_increase: 12800 },
    },
  },
  {
    id: 'security',
    title: '安全巡检报告',
    description: '自动化安全扫描，检测配置漏洞与威胁',
    icon: AlertCircle,
    color: 'text-red-600',
    input: '对 production 命名空间进行安全巡检',
    steps: [
      { label: '配置扫描', description: '检查 RBAC、安全组、Secret 加密', icon: AlertCircle, duration: 400 },
      { label: '漏洞检测', description: '扫描 CVE 与配置不当', icon: Brain, duration: 600 },
      { label: '合规检查', description: '对照等保 2.0 要求检查', icon: CheckCircle2, duration: 300 },
      { label: '报告生成', description: '输出风险项与修复建议', icon: FileText, duration: 150 },
    ],
    response: {
      content: `## 安全巡检报告\n\n**扫描范围**：production 命名空间\n\n**风险项**：🔴 3 项严重 | 🟡 8 项中等\n\n**严重风险**：\n1. Pod 安全上下文使用 root 运行\n2. Secret 未启用加密存储\n3. 存在 privileged Pod\n\n**修复建议**：\n1. 配置 runAsNonRoot: true\n2. 启用 Secret 加密\n3. 移除 privileged 权限`,
      route_type: 'skill',
      confidence: 0.91,
      metadata: { critical: 3, medium: 8, low: 12 },
    },
  },
  {
    id: 'database',
    title: '数据库诊断',
    description: '一键诊断 RDS/PolarDB 性能问题与配置隐患',
    icon: Database,
    color: 'text-teal-500',
    input: 'RDS MySQL 实例 rm-2zei123 突然响应变慢，QPS 下降 60%',
    steps: [
      { label: '状态采集', description: '采集 slow_query_log 与 innodb 状态', icon: BarChart3, duration: 250 },
      { label: '锁分析', description: '检查锁等待与死锁情况', icon: AlertCircle, duration: 300 },
      { label: '索引诊断', description: '识别缺失索引与全表扫描', icon: Brain, duration: 400 },
      { label: '建议输出', description: '生成优化 SQL 与参数调整', icon: CheckCircle2, duration: 150 },
    ],
    response: {
      content: `## 数据库诊断报告\n\n**问题根因**：全表扫描导致 CPU 飙升\n\n**慢查询 Top 3**：\n1. \`SELECT * FROM orders WHERE status\` — 耗时 3.2s\n2. \`UPDATE inventory SET count\` — 锁等待 15s\n3. \`SELECT user_id, SUM(amount)\` — 无索引\n\n**建议**：\n1. 为 orders.status 添加索引\n2. 优化第二条 SQL 的事务范围\n3. 考虑读写分离`,
      route_type: 'fta',
      confidence: 0.89,
      metadata: { slow_queries: 23, lock_waits: 5, missing_indexes: 3 },
    },
  },
  {
    id: 'network',
    title: '网络连通性诊断',
    description: '端到端探测网络路径，快速定位故障节点',
    icon: Zap,
    color: 'text-cyan-600',
    input: 'VPC 内 Pod 无法访问集群外部 API，DNS 解析正常',
    steps: [
      { label: '路径探测', description: '逐跳探测网络路径', icon: Zap, duration: 200 },
      { label: '防火墙检查', description: '检查安全组与网络 ACL', icon: AlertCircle, duration: 300 },
      { label: '路由分析', description: '验证 VPC 路由表与 NAT 配置', icon: Brain, duration: 250 },
      { label: '诊断报告', description: '输出故障点与修复方案', icon: FileText, duration: 100 },
    ],
    response: {
      content: `## 网络诊断结果\n\n**故障点**：NAT Gateway 出口规则\n\n**探测结果**：\n- Pod → VPC Router: ✅ 正常\n- NAT GW → Internet: ❌ 超时\n\n**根因**：NAT Gateway 的 SNAT 规则被意外删除\n\n**修复**：重新添加 SNAT 规则，放行 100.0.0.0/8\n\n**预计恢复时间**：5 分钟`,
      route_type: 'fta',
      confidence: 0.94,
      metadata: { hops: 4, packet_loss: '100%', bottleneck: 'NAT Gateway' },
    },
  },
];

function DemoCard({ scenario, onRun }: { scenario: DemoScenario; onRun: (s: DemoScenario) => void }) {
  const Icon = scenario.icon;
  const totalDuration = scenario.steps.reduce((acc, s) => acc + (s.duration || 0), 0);
  const route = routeTypeConfig[scenario.response.route_type];
  const confidence = (scenario.response.confidence * 100).toFixed(0);

  return (
    <Card
      className="group hover:border-primary/30 hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col"
      onClick={() => onRun(scenario)}
    >
      <CardContent className="p-3.5 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn('p-1.5 rounded-md bg-muted shrink-0', scenario.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="font-medium text-sm leading-tight">{scenario.title}</h3>
          </div>
          <Play className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {scenario.description}
        </p>

        <div className="bg-muted/50 rounded px-2 py-1.5 mt-auto">
          <p className="text-[11px] text-muted-foreground truncate" title={scenario.input}>
            <span className="text-foreground/60 font-medium">Q:</span> {scenario.input}
          </p>
        </div>

        <div className="flex items-center justify-between gap-1 pt-0.5">
          <div className="flex items-center gap-1">
            {route && <Badge variant={route.variant} className="text-[10px] px-1.5 py-0 h-[18px] leading-none">{route.label}</Badge>}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Layers className="h-2.5 w-2.5" />
              {scenario.steps.length} 步
            </span>
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {(totalDuration / 1000).toFixed(1)}s
            </span>
            <span className="flex items-center gap-0.5">
              <Activity className="h-2.5 w-2.5" />
              {confidence}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StepIndicator({ step, index, total, active, completed }: {
  step: DemoStep;
  index: number;
  total: number;
  active: boolean;
  completed: boolean;
}) {
  const Icon = step.icon;
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300',
            completed && 'bg-green-500/10 border-green-500 text-green-500',
            active && 'bg-primary/10 border-primary text-primary',
            !completed && !active && 'bg-muted border-muted-foreground/20 text-muted-foreground',
          )}
        >
          {completed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </div>
        {index < total - 1 && (
          <div className="w-0.5 h-8 bg-border mt-1">
            <div className={cn('h-full bg-green-500 transition-all duration-500', completed ? 'opacity-100' : 'opacity-0')} />
          </div>
        )}
      </div>
      <div className="flex-1 pt-1">
        <p className={cn('text-sm font-medium', completed && 'text-green-500', active && 'text-primary')}>
          {step.label}
        </p>
        <p className="text-xs text-muted-foreground">{step.description}</p>
        {step.duration && (active || completed) && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {completed ? '✓ 完成' : '处理中...'} · {step.duration}ms
          </p>
        )}
      </div>
    </div>
  );
}

export default function Demo() {
  const [running, setRunning] = useState(false);
  const [activeScenario, setActiveScenario] = useState<DemoScenario | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showResponse, setShowResponse] = useState(false);
  const [progress, setProgress] = useState(0);
  const responseRef = useRef<HTMLDivElement>(null);

  const runDemo = async (scenario: DemoScenario) => {
    setRunning(true);
    setActiveScenario(scenario);
    setCurrentStep(0);
    setCompletedSteps([]);
    setShowResponse(false);
    setProgress(0);

    const totalDuration = scenario.steps.reduce((acc, s) => acc + (s.duration || 0), 0);
    let elapsed = 0;

    for (let i = 0; i < scenario.steps.length; i++) {
      setCurrentStep(i);
      const step = scenario.steps[i];
      const stepDuration = step?.duration ?? 0;

      await new Promise((resolve) => {
        const interval = setInterval(() => {
          elapsed += 50;
          setProgress((elapsed / totalDuration) * 100);
          if (elapsed >= stepDuration) {
            clearInterval(interval);
            resolve(null);
          }
        }, 50);
      });

      setCompletedSteps((prev) => [...prev, i]);
      elapsed = 0;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    setShowResponse(true);
    setRunning(false);

    setTimeout(() => {
      responseRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const getRouteTypeBadge = (routeType: string) => {
    const config = routeTypeConfig[routeType] || { label: routeType, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const avgConfidence = (demoScenarios.reduce((acc, s) => acc + s.response.confidence, 0) / demoScenarios.length * 100).toFixed(0);
  const totalSteps = demoScenarios.reduce((acc, s) => acc + s.steps.length, 0);
  const routeTypes = new Set(demoScenarios.map(s => s.response.route_type)).size;

  return (
    <div className="flex flex-col h-full space-y-4">
      <PageHeader
        title="Demo 演示"
        description="体验不同场景下 Agent 的智能分析与处理能力"
      />

      {!activeScenario ? (
        <div className="flex flex-col gap-5 flex-1">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-semibold leading-none">{demoScenarios.length}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">演示场景</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-500/10 text-green-500">
                  <Network className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-semibold leading-none">{routeTypes}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">路由策略</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-500/10 text-blue-500">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-semibold leading-none">{avgConfidence}%</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">平均置信度</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-md bg-orange-500/10 text-orange-500">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-semibold leading-none">{totalSteps}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">处理步骤</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Categorized Scenarios */}
          {scenarioCategories.map((category) => {
            const CategoryIcon = category.icon;
            const scenarios = category.ids
              .map(id => demoScenarios.find(s => s.id === id))
              .filter((s): s is DemoScenario => !!s);

            return (
              <div key={category.label}>
                <div className="flex items-center gap-2 mb-2.5">
                  <CategoryIcon className={cn('h-4 w-4', category.color)} />
                  <h2 className="text-sm font-medium">{category.label}</h2>
                  <span className="text-[11px] text-muted-foreground">({scenarios.length})</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {scenarios.map((scenario) => (
                    <DemoCard key={scenario.id} scenario={scenario} onRun={runDemo} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-4">
          {/* Scenario Header */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <activeScenario.icon className={cn('h-5 w-5', activeScenario.color)} />
                  <div>
                    <p className="font-medium">{activeScenario.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                      "{activeScenario.input}"
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {running && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <Button variant="outline" size="sm" onClick={() => setActiveScenario(null)} className="gap-1.5">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    返回
                  </Button>
                </div>
              </div>
              {running && (
                <Progress value={progress} className="mt-3 h-1" />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2 flex-1">
            {/* Steps Panel */}
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">执行流程</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-0">
                  {activeScenario.steps.map((step, index) => (
                    <StepIndicator
                      key={index}
                      step={step}
                      index={index}
                      total={activeScenario.steps.length}
                      active={currentStep === index && running}
                      completed={completedSteps.includes(index)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Response Panel */}
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">执行结果</CardTitle>
                  {showResponse && (
                    <div className="flex items-center gap-2">
                      {getRouteTypeBadge(activeScenario.response.route_type)}
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {String(activeScenario.response.metadata.latency_ms ??
                          activeScenario.response.metadata.execution_ms ??
                          activeScenario.response.metadata.data_points ??
                          '~')}ms
                      </Badge>
                      <Badge variant="secondary">
                        {(Number(activeScenario.response.confidence) * 100).toFixed(0)}% 置信度
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                {!showResponse ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">运行后将显示分析结果</p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="h-full" ref={responseRef}>
                    <div className="space-y-3">
                      {activeScenario.response.content.split('\n').map((line, i) => {
                        if (line.startsWith('## ')) {
                          return (
                            <h3 key={i} className="text-base font-semibold mt-4 first:mt-0">
                              {line.replace('## ', '')}
                            </h3>
                          );
                        }
                        if (line.startsWith('**') && line.endsWith('**')) {
                          return (
                            <p key={i} className="font-medium">
                              {line.replace(/\*\*/g, '')}
                            </p>
                          );
                        }
                        if (line.startsWith('> ')) {
                          return (
                            <p key={i} className="text-muted-foreground italic text-sm border-l-2 border-primary/30 pl-3">
                              {line.replace('> ', '')}
                            </p>
                          );
                        }
                        if (line.startsWith('```')) {
                          return null;
                        }
                        if (line.startsWith('- ')) {
                          return (
                            <p key={i} className="text-sm pl-3">
                              • {line.replace('- ', '')}
                            </p>
                          );
                        }
                        if (line.startsWith('| ')) {
                          return (
                            <p key={i} className="text-sm font-mono text-muted-foreground">
                              {line}
                            </p>
                          );
                        }
                        if (line.trim()) {
                          return (
                            <p key={i} className="text-sm leading-relaxed">
                              {line}
                            </p>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
