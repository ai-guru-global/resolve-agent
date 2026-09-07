import type {
  ActivityEvent,
  AdaptiveWeight,
  AgentExecution,
  AgentOverview,
  AgentRuntimeStatus,
  AlertItem,
  CircuitBreakerStatus,
  ConversationMessage,
  DashboardMetrics,
  ExecutionStats,
  FeedbackSignal,
  HookExecutionLog,
  ModelConfig,
  OpsTicket,
  PlatformStatus,
  RouteDecision,
  SelectorPipelineTrace,
  SelectorStrategy,
  SolutionExecution,
  SystemMetric,
  SystemSettings,
  TimingBreakdown,
  TraceRecord,
  TroubleshootingSolution,
} from '../../types';
import { FTA_TREE_TARGET } from './workflows';
import { pickRagCorpora, RAG_CORPORA } from './rag';

// ─── Dashboard 数据 ───
export const mockDashboardMetrics: DashboardMetrics = {
  today_tickets: 23,
  skill_executions: 156,
  change_approvals: 8,
  knowledge_entries: 2847,
  ticket_trend: { value: 12, direction: 'up' },
  execution_trend: { value: 5, direction: 'up' },
  total_agents: 7,
  active_agents: 5,
  error_agents: 1,
  today_executions: 347,
  success_rate: 0.946,
  avg_latency_ms: 2450,
  execution_trend_24h: [12, 18, 8, 5, 3, 2, 4, 9, 15, 22, 28, 35, 42, 38, 31, 27, 24, 33, 41, 29, 18, 14, 11, 8],
};

export const mockTickets: OpsTicket[] = [
  { id: 'INC-2026-0905', title: 'ACK 集群 etcd DB size 超阈值告警', status: 'processing', priority: 'critical', created_at: '2026-08-31T09:50:00Z', assignee: '张明' },
  { id: 'INC-2026-0904', title: '生产集群 API Server 响应超时', status: 'pending', priority: 'critical', created_at: '2026-08-31T09:25:00Z', assignee: '李强' },
  { id: 'INC-2026-0903', title: 'RDS 只读实例复制延迟 15s', status: 'processing', priority: 'high', created_at: '2026-08-31T08:40:00Z', assignee: '王芳' },
  { id: 'INC-2026-0902', title: 'K8s 节点 NotReady — NetworkPolicy 误配置', status: 'completed', priority: 'high', created_at: '2026-08-31T07:30:00Z', assignee: '赵伟' },
  { id: 'INC-2026-0901', title: 'OSS 生命周期规则批量应用审核', status: 'approved', priority: 'medium', created_at: '2026-08-31T06:15:00Z', assignee: '陈静' },
  { id: 'INC-2026-0900', title: 'SLB 七层监听 502 响应激增', status: 'pending', priority: 'high', created_at: '2026-08-30T22:05:00Z', assignee: '刘洋' },
  { id: 'INC-2026-0899', title: 'Redis 主从切换后缓存命中率下降', status: 'completed', priority: 'medium', created_at: '2026-08-30T20:40:00Z', assignee: '周琳' },
  { id: 'INC-2026-0898', title: 'ECS 实例内存 OOM 触发进程 Kill', status: 'processing', priority: 'high', created_at: '2026-08-30T18:20:00Z', assignee: '孙磊' },
  { id: 'INC-2026-0897', title: '安全组放行规则季度复核', status: 'approved', priority: 'low', created_at: '2026-08-30T16:00:00Z', assignee: '张明' },
  { id: 'INC-2026-0896', title: 'MQTT 网关连接数打满导致设备掉线', status: 'completed', priority: 'critical', created_at: '2026-08-30T14:35:00Z', assignee: '李强' },
  { id: 'INC-2026-0895', title: 'PVC Pending — StorageClass 缺失', status: 'pending', priority: 'medium', created_at: '2026-08-30T12:10:00Z', assignee: '王芳' },
  { id: 'INC-2026-0894', title: 'Deployment Rollout 卡在 ImagePullBackOff', status: 'completed', priority: 'medium', created_at: '2026-08-30T10:45:00Z', assignee: '赵伟' },
  { id: 'INC-2026-0893', title: 'DNS 解析偶发超时（CoreDNS 节点漂移）', status: 'processing', priority: 'medium', created_at: '2026-08-30T09:20:00Z', assignee: '陈静' },
  { id: 'INC-2026-0892', title: 'TLS 证书轮换窗口变更审批', status: 'approved', priority: 'high', created_at: '2026-08-30T08:00:00Z', assignee: '刘洋' },
  { id: 'INC-2026-0891', title: 'ECS 实例 CPU 持续高负载告警', status: 'processing', priority: 'high', created_at: '2026-08-29T22:30:00Z', assignee: '周琳' },
  { id: 'INC-2026-0890', title: 'SLB 后端服务健康检查失败', status: 'pending', priority: 'critical', created_at: '2026-08-29T21:15:00Z', assignee: '孙磊' },
  { id: 'INC-2026-0889', title: 'RDS 主从同步延迟超过阈值', status: 'completed', priority: 'medium', created_at: '2026-08-29T19:50:00Z', assignee: '张明' },
  { id: 'INC-2026-0888', title: 'K8s 节点 NotReady 状态', status: 'approved', priority: 'high', created_at: '2026-08-29T17:25:00Z', assignee: '李强' },
  { id: 'INC-2026-0887', title: 'OSS Bucket 跨区域复制失败', status: 'processing', priority: 'medium', created_at: '2026-08-29T15:40:00Z', assignee: '王芳' },
  { id: 'INC-2026-0886', title: 'ACK Ingress 证书即将过期', status: 'pending', priority: 'high', created_at: '2026-08-29T14:05:00Z', assignee: '赵伟' },
  { id: 'INC-2026-0885', title: 'ECS 安全组规则变更审核', status: 'approved', priority: 'low', created_at: '2026-08-28T20:30:00Z', assignee: '陈静' },
  { id: 'INC-2026-0884', title: 'Redis 内存使用率告警', status: 'completed', priority: 'medium', created_at: '2026-08-28T18:10:00Z', assignee: '刘洋' },
  { id: 'INC-2026-0883', title: 'Pod CrashLoopBackOff — 探针配置错误', status: 'completed', priority: 'high', created_at: '2026-08-28T15:45:00Z', assignee: '周琳' },
  { id: 'INC-2026-0882', title: '日志投递延迟（SLS 采集端积压）', status: 'processing', priority: 'low', created_at: '2026-08-28T13:20:00Z', assignee: '孙磊' },
  { id: 'INC-2026-0881', title: 'HPA 目标 CPU 阈值调整审批', status: 'approved', priority: 'medium', created_at: '2026-08-27T21:00:00Z', assignee: '张明' },
  { id: 'INC-2026-0880', title: 'etcd 集群单成员失联', status: 'completed', priority: 'critical', created_at: '2026-08-27T17:35:00Z', assignee: '李强' },
  { id: 'INC-2026-0879', title: 'Ingress 域名解析不生效', status: 'pending', priority: 'medium', created_at: '2026-08-27T14:50:00Z', assignee: '王芳' },
  { id: 'INC-2026-0878', title: '备份任务失败 — 快照配额不足', status: 'completed', priority: 'low', created_at: '2026-08-26T19:25:00Z', assignee: '赵伟' },
  { id: 'INC-2026-0877', title: 'Secret 轮换后 Pod 挂载失败', status: 'completed', priority: 'medium', created_at: '2026-08-25T16:40:00Z', assignee: '陈静' },
  { id: 'INC-2026-0876', title: '知识库集合容量扩容审核', status: 'approved', priority: 'low', created_at: '2026-08-25T10:15:00Z', assignee: '刘洋' },
];

export const mockPlatformStatus: PlatformStatus = {
  connection_status: 'connected',
  endpoint: 'resolvenet.internal:443',
  sync_interval_seconds: 30,
  region: 'alibaba-cloud-east-01',
  latency_ms: 12,
  last_sync_at: '2026-08-31T10:29:00Z',
  cpu_usage_percent: 34,
  memory_usage_percent: 62,
  goroutines: 128,
  uptime_seconds: 172800,
};

// ─── Agent Execution History ───
export const mockAgentExecutions: Record<string, AgentExecution[]> = {
  'agent-mega-001': [
    { id: 'aexec-001', agent_id: 'agent-mega-001', input_preview: 'ACK 集群 cn-hangzhou-prod 节点池扩容评估...', output_preview: '当前集群负载率 78%，建议扩容 2 个节点...', status: 'completed', route_type: 'multi', confidence: 0.91, duration_ms: 1230, created_at: '2026-08-31T09:12:00Z' },
    { id: 'aexec-002', agent_id: 'agent-mega-001', input_preview: 'production 命名空间 Pod 异常诊断...', output_preview: '发现 3 个 CrashLoopBackOff 的 Pod，原因是镜像拉取失败...', status: 'completed', route_type: 'multi', confidence: 0.88, duration_ms: 1540, created_at: '2026-08-31T08:30:00Z' },
    { id: 'aexec-003', agent_id: 'agent-mega-001', input_preview: 'etcd 集群健康检查...', output_preview: '3/3 members healthy，DB size 2.1GB，建议定期 compact...', status: 'completed', route_type: 'direct', confidence: 0.95, duration_ms: 890, created_at: '2026-08-30T16:00:00Z' },
    { id: 'aexec-004', agent_id: 'agent-mega-001', input_preview: 'HPA 配置审查...', output_preview: '当前 HPA min=2 max=10，建议调整 target CPU 到 70%...', status: 'completed', route_type: 'direct', confidence: 0.82, duration_ms: 1100, created_at: '2026-08-30T14:20:00Z' },
  ],
  'agent-fta-002': [
    { id: 'aexec-005', agent_id: 'agent-fta-002', input_preview: 'K8s 节点 cn-hz-03 NotReady...', output_preview: '根因定位：NetworkPolicy 误配置导致 kubelet 心跳被 Drop...', status: 'completed', route_type: 'fta', confidence: 0.87, duration_ms: 12340, created_at: '2026-08-31T08:15:00Z' },
    { id: 'aexec-006', agent_id: 'agent-fta-002', input_preview: '节点 cn-hz-07 进入 NotReady...', output_preview: '根因定位：节点内存 OOM，kubelet 进程被 Kill...', status: 'completed', route_type: 'fta', confidence: 0.92, duration_ms: 18200, created_at: '2026-08-30T14:30:00Z' },
    { id: 'aexec-007', agent_id: 'agent-fta-002', input_preview: '多节点同时 NotReady 告警...', output_preview: '分析失败：无法连接到目标集群 API Server...', status: 'failed', route_type: 'fta', confidence: 0.45, duration_ms: 30000, created_at: '2026-08-29T22:00:00Z' },
  ],
  'agent-rag-003': [
    { id: 'aexec-008', agent_id: 'agent-rag-003', input_preview: 'RDS MySQL 主从同步延迟怎么排查?', output_preview: '常见原因包括大事务阻塞、从库规格不足、binlog 传输延迟...', status: 'completed', route_type: 'rag', confidence: 0.84, duration_ms: 650, created_at: '2026-08-31T09:00:00Z' },
    { id: 'aexec-009', agent_id: 'agent-rag-003', input_preview: 'ACK Ingress 如何配置 HTTPS?', output_preview: '通过 annotations 配置 SLB 证书，支持自动续期...', status: 'completed', route_type: 'rag', confidence: 0.91, duration_ms: 480, created_at: '2026-08-31T08:00:00Z' },
    { id: 'aexec-010', agent_id: 'agent-rag-003', input_preview: 'ECS 磁盘在线扩容步骤是什么?', output_preview: '1. 控制台扩容云盘 2. SSH 登录执行 growpart 3. resize2fs...', status: 'completed', route_type: 'rag', confidence: 0.89, duration_ms: 520, created_at: '2026-08-30T15:30:00Z' },
  ],
  'agent-skill-004': [
    { id: 'aexec-011', agent_id: 'agent-skill-004', input_preview: 'INC-2026-0891 ECS CPU 高负载工单...', output_preview: '优先级 P1，影响范围：生产环境 cn-hangzhou，建议立即响应...', status: 'completed', route_type: 'skill', confidence: 0.93, duration_ms: 820, created_at: '2026-08-31T09:12:00Z' },
    { id: 'aexec-012', agent_id: 'agent-skill-004', input_preview: 'INC-2026-0890 SLB 健康检查失败...', output_preview: '优先级 P0，涉及组件 SLB + ECS，已自动指派给 SRE 值班...', status: 'completed', route_type: 'skill', confidence: 0.96, duration_ms: 750, created_at: '2026-08-31T08:45:00Z' },
    { id: 'aexec-013', agent_id: 'agent-skill-004', input_preview: 'INC-2026-0885 安全组规则变更审核...', output_preview: '优先级 P3，常规变更，建议在变更窗口内执行...', status: 'completed', route_type: 'skill', confidence: 0.88, duration_ms: 680, created_at: '2026-08-30T10:00:00Z' },
  ],
  'agent-fta-007': [
    { id: 'aexec-014', agent_id: 'agent-fta-007', input_preview: 'RDS rm-2ze-001 同步延迟 15s...', output_preview: '根因：批量 UPDATE 影响 52 万行导致 SQL 线程阻塞...', status: 'completed', route_type: 'fta', confidence: 0.89, duration_ms: 25100, created_at: '2026-08-30T16:20:00Z' },
    { id: 'aexec-015', agent_id: 'agent-fta-007', input_preview: 'RDS rm-2ze-003 同步延迟 8s...', output_preview: '根因：从库 CPU 使用率 98%，建议升级从库规格...', status: 'completed', route_type: 'fta', confidence: 0.85, duration_ms: 15200, created_at: '2026-08-29T11:00:00Z' },
  ],
};

// ─── Agent Runtime Status ───
export const mockAgentStatuses: Record<string, AgentRuntimeStatus> = {
  'agent-mega-001': { uptime_seconds: 172800, total_executions: 1247, success_rate: 0.96, avg_latency_ms: 1180, last_execution_at: '2026-08-31T09:12:00Z', error_count_24h: 3, memory_mb: 256 },
  'agent-fta-002': { uptime_seconds: 172800, total_executions: 523, success_rate: 0.91, avg_latency_ms: 15600, last_execution_at: '2026-08-31T08:15:00Z', error_count_24h: 5, memory_mb: 512 },
  'agent-rag-003': { uptime_seconds: 172800, total_executions: 2891, success_rate: 0.98, avg_latency_ms: 550, last_execution_at: '2026-08-31T09:00:00Z', error_count_24h: 1, memory_mb: 384 },
  'agent-skill-004': { uptime_seconds: 172800, total_executions: 1893, success_rate: 0.97, avg_latency_ms: 760, last_execution_at: '2026-08-31T09:12:00Z', error_count_24h: 2, memory_mb: 192 },
  'agent-custom-005': { uptime_seconds: 0, total_executions: 89, success_rate: 0.85, avg_latency_ms: 2100, last_execution_at: '2026-08-29T14:20:00Z', error_count_24h: 0, memory_mb: 0 },
  'agent-mega-006': { uptime_seconds: 3600, total_executions: 342, success_rate: 0.42, avg_latency_ms: 8900, last_execution_at: '2026-08-31T06:00:00Z', error_count_24h: 37, memory_mb: 890 },
  'agent-fta-007': { uptime_seconds: 172800, total_executions: 267, success_rate: 0.94, avg_latency_ms: 20100, last_execution_at: '2026-08-30T16:20:00Z', error_count_24h: 1, memory_mb: 480 },
};

// ─── Execution Detail 构建器：按 route_type 差异化生成管线 trace / hook / 记忆 ───
export const EXEC_KEYWORDS = ['ACK', 'RDS', 'ECS', 'SLB', 'etcd', 'HPA', 'NotReady', 'OOM', 'CrashLoopBackOff', 'NetworkPolicy', 'Ingress', 'HTTPS', '扩容', '同步延迟', '磁盘', '安全组', 'CPU'];

export const extractExecEntities = (input: string): string[] => {
  const hits = EXEC_KEYWORDS.filter((k) => input.includes(k));
  const ticket = input.match(/INC-\d{4}-\d{4}/);
  if (ticket) hits.unshift(ticket[0]);
  return hits.slice(0, 6);
};

export const execAt = (base: string, offsetSeconds: number) =>
  new Date(Date.parse(base) + offsetSeconds * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');

export const buildCodeContext = (input: string) => {
  if (input.includes('HPA')) return { language: 'yaml', has_code_blocks: true, detected_patterns: ['HorizontalPodAutoscaler', 'targetCPUUtilizationPercentage'] };
  if (input.includes('etcd')) return { language: 'shell', has_code_blocks: true, detected_patterns: ['etcdctl endpoint health', 'compact + defrag'] };
  return null;
};

export const buildPipelineTrace = (base: AgentExecution): SelectorPipelineTrace => {
  const input = base.input_preview;
  const entities = extractExecEntities(input);
  const strategy: SelectorStrategy =
    base.route_type === 'skill' ? 'llm'
    : base.route_type === 'fta' ? 'rule'
    : base.route_type === 'rag' || base.route_type === 'multi' ? 'hybrid'
    : 'rule';
  const pipeline_latency_ms = strategy === 'rule' ? 14 : strategy === 'llm' ? 96 : 46;
  const ftaTarget = FTA_TREE_TARGET[base.agent_id] ?? 'ft-k8s-node-notready';
  const ticket = entities.find((e) => e.startsWith('INC-')) ?? 'INC-2026-0891';

  const chain: RouteDecision[] | undefined =
    base.route_type === 'multi'
      ? [
          { route_type: 'rag', route_target: 'kb-ops-corpus', confidence: 0.86, parameters: { top_k: 5 }, reasoning: '先检索相似案例与 runbook 知识' },
          { route_type: 'fta', route_target: 'ft-k8s-node-notready', confidence: 0.89, parameters: { tree_id: 'ft-k8s-node-notready', max_depth: 8 }, reasoning: '并行发起 FTA 故障定位与容量评估分支' },
          { route_type: 'skill', route_target: 'skill-ticket-triage', confidence: 0.9, parameters: { skill: 'ticket-triage' }, reasoning: '汇总结果并生成工单处置建议' },
        ]
      : undefined;

  const intent =
    base.route_type === 'multi'
      ? { intent_type: 'multi' as const, confidence: base.confidence, entities, metadata: { model: 'kimi-k2.5', selector_version: 'v2.3' }, sub_intents: ['rag', 'workflow', 'skill'] as ('rag' | 'workflow' | 'skill')[], suggested_target: 'wf-composite-diagnosis' }
      : base.route_type === 'fta'
        ? { intent_type: 'workflow' as const, confidence: base.confidence, entities, metadata: { model: 'kimi-k2.5', selector_version: 'v2.3' }, sub_intents: [], suggested_target: ftaTarget }
        : base.route_type === 'rag'
          ? { intent_type: 'rag' as const, confidence: base.confidence, entities, metadata: { model: 'kimi-k2.5', selector_version: 'v2.3' }, sub_intents: [], suggested_target: 'kb-ops-corpus' }
          : base.route_type === 'skill'
            ? { intent_type: 'skill' as const, confidence: base.confidence, entities, metadata: { model: 'kimi-k2.5', selector_version: 'v2.3' }, sub_intents: [], suggested_target: 'skill-ticket-triage' }
            : { intent_type: 'direct' as const, confidence: base.confidence, entities, metadata: { model: 'kimi-k2.5', selector_version: 'v2.3' }, sub_intents: [], suggested_target: 'llm-direct-infer' };

  const parameters: Record<string, unknown> =
    base.route_type === 'multi'
      ? { parallel_branches: 3, branch_timeout_ms: 30000, merge_strategy: 'weighted_vote' }
      : base.route_type === 'fta'
        ? { tree_id: ftaTarget, max_depth: 8, min_probability: 0.05 }
        : base.route_type === 'rag'
          ? { top_k: 5, rerank: true, score_threshold: 0.6 }
          : base.route_type === 'skill'
            ? { skill: 'ticket-triage', ticket_id: ticket, priority_source: 'sla_matrix' }
            : { temperature: 0.3, max_tokens: 2048 };

  const reasoning =
    base.route_type === 'multi'
      ? '命中多智能体编排规则：诊断请求涉及知识检索、故障定位与工单处置三个子任务，拆分为并行分支'
      : base.route_type === 'fta'
        ? '匹配 FTA 故障树分析场景，输入包含节点/实例级故障特征'
        : base.route_type === 'rag'
          ? '命中知识检索意图，输入为运维问答类查询'
          : base.route_type === 'skill'
            ? '识别工单 ID 与处置意图，路由至技能执行'
            : '简单问答/审查类请求，无需工具编排，直接推理';

  const ragCollections =
    base.route_type === 'rag' ? pickRagCorpora(input)
    : base.route_type === 'multi' ? [RAG_CORPORA.k8s, RAG_CORPORA.fta]
    : [];

  return {
    input,
    strategy,
    intent,
    enriched_context: {
      available_skills: base.route_type === 'skill' || base.route_type === 'multi' ? ['ticket-triage', 'log-analyzer', 'metric-alerter'] : ['log-analyzer', 'metric-alerter'],
      active_workflows: base.route_type === 'multi' || base.route_type === 'fta' ? ['wf-composite-diagnosis', 'wf-001'] : ['wf-001'],
      rag_collections: ragCollections,
      code_context: buildCodeContext(input),
    },
    decision: { route_type: base.route_type, route_target: intent.suggested_target, confidence: base.confidence, parameters, reasoning, chain },
    pipeline_latency_ms,
  };
};

export const buildHookLogs = (base: AgentExecution): HookExecutionLog[] => {
  const logs: HookExecutionLog[] = [
    { hook_name: '上下文压缩', hook_type: 'pre_execution', status: 'success', duration_ms: 12, input_preview: '历史上下文 8 条消息', output_preview: '压缩为 3 条核心消息', timestamp: execAt(base.created_at, 0) },
    { hook_name: '权限与配额校验', hook_type: 'pre_execution', status: 'success', duration_ms: 8, input_preview: base.agent_id, output_preview: 'RBAC 通过 · 配额余量充足', timestamp: execAt(base.created_at, 1) },
  ];
  if (base.route_type === 'rag' || base.route_type === 'multi') {
    logs.push({ hook_name: '知识库预取', hook_type: 'pre_execution', status: 'success', duration_ms: 15, input_preview: '检索 top-5 语料', output_preview: '预取 2 个 collection', timestamp: execAt(base.created_at, 2) });
  }
  if (base.status === 'failed') {
    logs.push({ hook_name: '错误上报', hook_type: 'on_error', status: 'failed', duration_ms: 120, input_preview: base.input_preview, output_preview: '已上报 trace 并触发告警', timestamp: execAt(base.created_at, Math.round(base.duration_ms / 1000)) });
  } else {
    logs.push({ hook_name: '执行日志落盘', hook_type: 'post_execution', status: 'success', duration_ms: 6, input_preview: '执行结果', output_preview: `已记录到 trace-${base.id}`, timestamp: execAt(base.created_at, Math.round(base.duration_ms / 1000)) });
  }
  logs.push({ hook_name: '记忆写入', hook_type: 'post_execution', status: 'success', duration_ms: 9, input_preview: '本轮对话摘要', output_preview: '已写入长期记忆', timestamp: execAt(base.created_at, Math.round(base.duration_ms / 1000) + 1) });
  return logs;
};

export const buildMemoryContext = (base: AgentExecution): ConversationMessage[] => [
  { id: `ctx-${base.id}-0`, conversation_id: `conv-${base.id}`, role: 'system', content: '你是阿里云 ACK/RDS 运维助手，回答需给出可执行步骤与风险提示', token_count: 42, sequence: 0, created_at: execAt(base.created_at, -300) },
  { id: `ctx-${base.id}-1`, conversation_id: `conv-${base.id}`, role: 'user', content: base.input_preview, token_count: 36, sequence: 1, created_at: base.created_at },
  { id: `ctx-${base.id}-2`, conversation_id: `conv-${base.id}`, role: 'assistant', content: base.output_preview, token_count: 88, sequence: 2, created_at: execAt(base.created_at, Math.round(base.duration_ms / 1000)) },
];

export const buildTiming = (base: AgentExecution, trace: SelectorPipelineTrace, hooks: HookExecutionLog[]): TimingBreakdown => {
  const pre = hooks.filter((h) => h.hook_type === 'pre_execution').reduce((s, h) => s + h.duration_ms, 0);
  const post = hooks.filter((h) => h.hook_type !== 'pre_execution').reduce((s, h) => s + h.duration_ms, 0);
  return {
    selector_ms: trace.pipeline_latency_ms,
    pre_hook_ms: pre,
    post_hook_ms: post,
    llm_inference_ms: Math.max(50, base.duration_ms - trace.pipeline_latency_ms - pre - post),
    total_ms: base.duration_ms,
  };
};

// ─── Settings ───
export const mockSettings: SystemSettings = {
  resolve_net: {
    endpoint: 'resolvenet.internal:443',
    auth_method: 'mTLS',
    tenant_id: 'alibaba-cloud-east-01',
    sync_interval_seconds: 30,
    status: 'connected',
    latency_ms: 12,
  },
  platform: {
    server_address: 'localhost:8080',
    runtime_address: 'localhost:50051',
    version: '0.6.0',
    commit: 'a3f7c2e',
    build_date: '2026-08-07T10:00:00Z',
  },
  models: [
    { id: 'qwen-turbo', name: '通义千问 Turbo', provider: '阿里云', status: 'available', max_tokens: 8192, description: '高速推理，适合实时对话和轻量级任务' },
    { id: 'qwen-plus', name: '通义千问 Plus', provider: '阿里云', status: 'available', max_tokens: 32768, description: '均衡性能，适合复杂推理和长文本处理' },
    { id: 'qwen-max', name: '通义千问 Max', provider: '阿里云', status: 'available', max_tokens: 32768, description: '旗舰模型，适合高精度分析和复杂决策' },
    { id: 'ernie-4.0', name: 'ERNIE 4.0', provider: '百度', status: 'unavailable', max_tokens: 8192, description: '百度文心大模型，暂未配置 API Key' },
    { id: 'glm-4', name: 'GLM-4', provider: '智谱', status: 'available', max_tokens: 128000, description: '智谱大模型，支持超长上下文窗口' },
  ] as ModelConfig[],
};

// ─── Agent 执行响应 —— 根据 agent 类型给不同的回复 ───
export const executeResponses: Record<string, (message: string) => { content: string; metadata: Record<string, unknown> }> = {
  mega: (message) => ({
    content: `## 诊断结果

根据您的描述「${message.slice(0, 30)}...」，我进行了以下排查：

**1. 集群状态检查**
- 当前集群节点数：12/12 Ready
- 控制面组件状态：正常
- etcd 集群健康：3/3 members healthy

**2. 异常发现**
- 节点 \`cn-hangzhou.10.0.3.47\` 内存使用率达 91.3%，存在 OOM 风险
- 命名空间 \`production\` 下有 3 个 Pod 处于 CrashLoopBackOff

**3. 建议操作**
1. 对高内存节点执行 \`kubectl drain\` 后扩容节点池
2. 检查 CrashLoopBackOff 的 Pod 日志：\`kubectl logs -n production <pod-name> --previous\`
3. 考虑配置 HPA 自动扩缩容策略`,
    metadata: { route_type: 'multi', confidence: 0.91, latency_ms: 1230, model: 'qwen-max' },
  }),

  fta: (message) => ({
    content: `## 故障树分析报告

**顶层事件**: ${message.slice(0, 20)}...

### 分析路径
\`\`\`
[根因] 网络策略变更导致 kubelet 心跳包被 Drop
  └─ [中间事件] 节点与 API Server 通信中断
       ├─ [基础事件] NetworkPolicy 规则更新 ✅ (已确认)
       ├─ [基础事件] 安全组入方向规则 ✅ (已确认)
       └─ [基础事件] VPC 路由表变更 ❌ (排除)
\`\`\`

### 根因定位
上午 10:23 变更单 CHG-2024-0156 修改了 calico NetworkPolicy，误将 kubelet 10250 端口的入方向流量 deny 掉了。

### 修复建议
恢复 NetworkPolicy 规则，放行 kubelet 端口 10250/10255。`,
    metadata: { route_type: 'fta', confidence: 0.87, fault_tree: 'ft-k8s-node-notready', nodes_evaluated: 8 },
  }),

  rag: (message) => ({
    content: `根据运维知识库检索到以下相关内容：

**问题**: ${message}

**回答**:

RDS MySQL 主从同步延迟超过阈值（通常 > 1s）的常见原因：

1. **大事务阻塞** — 单条 SQL 涉及大量行更新（> 10万行），从库回放串行化导致延迟
   - 解决方案：拆分大事务，启用 parallel replication

2. **从库规格不足** — 从库 CPU/IO 能力弱于主库
   - 解决方案：升级从库规格到与主库一致

3. **binlog 传输延迟** — 网络带宽瓶颈或跨可用区延迟
   - 解决方案：检查 \`Seconds_Behind_Master\`，确认是 IO thread 还是 SQL thread 延迟

> 📎 来源：《RDS MySQL 主从同步最佳实践》第 3.2 节
> 📎 来源：历史故障复盘 INC-2026-0673`,
    metadata: { route_type: 'rag', confidence: 0.84, sources: 3, collection: 'col-ops-kb-001' },
  }),

  skill: (message) => ({
    content: `## 工单分析结果

**工单内容摘要**: ${message.slice(0, 40)}...

| 维度 | 分析结果 |
|------|---------|
| 影响范围 | 生产环境 / cn-hangzhou 区域 |
| 优先级评估 | **P1 - 紧急** |
| 涉及组件 | ACK + SLB + RDS |
| 预计恢复时间 | 30 分钟内 |

**处理建议**:
1. 立即拉起应急响应群，通知 SRE 值班人员
2. 执行预案 PLAN-ACK-003：容器服务应急切流
3. 同步客户侧：预计 30 分钟内恢复`,
    metadata: { route_type: 'skill', confidence: 0.93, skill_name: 'ticket-handler', execution_ms: 820 },
  }),

  custom: (_message) => ({
    content: `## SLB 流量分析报告

时间范围：过去 6 小时

**流量概况**:
- 平均 QPS: 2,340
- 峰值 QPS: 8,920 (14:32 出现)
- 4xx 错误率: 0.3%
- 5xx 错误率: 2.1% ⚠️ (阈值: 1%)

**异常检测**:
14:30-14:45 期间出现流量突增，后端 3 台 ECS 实例的连接数达到上限（65535），导致新建连接被拒绝。

**建议**:
1. 将后端服务器组从 3 台扩展到 6 台
2. 开启 SLB 会话保持，缓解连接风暴
3. 配置弹性伸缩组，QPS > 5000 时自动扩容`,
    metadata: { route_type: 'direct', confidence: 0.79, data_points: 4320 },
  }),
};

// ─── Agent Overview ───
export const mockAgentOverviews: AgentOverview[] = [
  { id: 'agent-mega-001', name: 'ACK 集群运维助手', type: 'mega', status: 'active', success_rate: 0.96, total_executions: 1247, avg_latency_ms: 1180, last_execution_at: '2026-08-31T10:24:00Z', error_count_24h: 3, uptime_seconds: 172800, memory_mb: 256 },
  { id: 'agent-fta-002', name: '故障根因分析引擎', type: 'fta', status: 'active', success_rate: 0.91, total_executions: 523, avg_latency_ms: 15600, last_execution_at: '2026-08-31T10:28:00Z', error_count_24h: 5, uptime_seconds: 172800, memory_mb: 512 },
  { id: 'agent-rag-003', name: '运维知识问答', type: 'rag', status: 'active', success_rate: 0.98, total_executions: 2891, avg_latency_ms: 550, last_execution_at: '2026-08-31T10:10:00Z', error_count_24h: 1, uptime_seconds: 172800, memory_mb: 384 },
  { id: 'agent-skill-004', name: '工单自动处理', type: 'skill', status: 'active', success_rate: 0.97, total_executions: 1893, avg_latency_ms: 760, last_execution_at: '2026-08-31T10:23:00Z', error_count_24h: 2, uptime_seconds: 172800, memory_mb: 192 },
  { id: 'agent-custom-005', name: 'SLB 流量分析', type: 'custom', status: 'inactive', success_rate: 0.85, total_executions: 89, avg_latency_ms: 2100, last_execution_at: '2026-08-29T14:20:00Z', error_count_24h: 0, uptime_seconds: 0, memory_mb: 0 },
  { id: 'agent-mega-006', name: '变更风险评估', type: 'mega', status: 'error', success_rate: 0.42, total_executions: 342, avg_latency_ms: 8900, last_execution_at: '2026-08-31T10:18:00Z', error_count_24h: 37, uptime_seconds: 3600, memory_mb: 890 },
  { id: 'agent-fta-007', name: 'RDS 主从同步诊断', type: 'fta', status: 'active', success_rate: 0.94, total_executions: 267, avg_latency_ms: 20100, last_execution_at: '2026-08-30T16:20:00Z', error_count_24h: 1, uptime_seconds: 172800, memory_mb: 480 },
];

// ─── Activity Events ───
export const mockActivityEvents: ActivityEvent[] = [
  { id: 'evt-001', agent_id: 'agent-mega-001', agent_name: 'ACK 集群运维助手', agent_type: 'mega', event_type: 'execution', description: 'ACK 集群 cn-hangzhou-prod 节点池扩容评估完成', status: 'completed', timestamp: '2026-08-31T10:24:00Z', duration_ms: 1230, route_type: 'multi' },
  { id: 'evt-002', agent_id: 'agent-skill-004', agent_name: '工单自动处理', agent_type: 'skill', event_type: 'execution', description: 'INC-2026-0891 ECS CPU 高负载工单分析完成', status: 'completed', timestamp: '2026-08-31T10:23:00Z', duration_ms: 820, route_type: 'skill' },
  { id: 'evt-003', agent_id: 'agent-mega-006', agent_name: '变更风险评估', agent_type: 'mega', event_type: 'error', description: '合规检查 API 超时，连续第 3 次失败', status: 'failed', timestamp: '2026-08-31T10:18:00Z', duration_ms: 30000 },
  { id: 'evt-004', agent_id: 'agent-rag-003', agent_name: '运维知识问答', agent_type: 'rag', event_type: 'execution', description: 'RDS MySQL 主从同步延迟排查知识检索', status: 'completed', timestamp: '2026-08-31T10:10:00Z', duration_ms: 650, route_type: 'rag' },
  { id: 'evt-005', agent_id: 'agent-fta-002', agent_name: '故障根因分析引擎', agent_type: 'fta', event_type: 'execution', description: 'K8s 节点 NotReady 故障树分析完成', status: 'completed', timestamp: '2026-08-31T09:47:00Z', duration_ms: 12340, route_type: 'fta' },
  { id: 'evt-006', agent_id: 'agent-fta-002', agent_name: '故障根因分析引擎', agent_type: 'fta', event_type: 'execution', description: 'K8s 节点 cn-hz-03 NotReady 诊断中', status: 'running', timestamp: '2026-08-31T10:28:00Z' },
  { id: 'evt-007', agent_id: 'agent-mega-006', agent_name: '变更风险评估', agent_type: 'mega', event_type: 'alert', description: 'Agent 错误率超过阈值 (42% > 10%)', status: 'warning', timestamp: '2026-08-31T08:05:00Z' },
  { id: 'evt-008', agent_id: 'agent-skill-004', agent_name: '工单自动处理', agent_type: 'skill', event_type: 'execution', description: 'INC-2026-0890 SLB 健康检查失败工单处理', status: 'completed', timestamp: '2026-08-31T09:52:00Z', duration_ms: 750, route_type: 'skill' },
  { id: 'evt-009', agent_id: 'agent-custom-005', agent_name: 'SLB 流量分析', agent_type: 'custom', event_type: 'status_change', description: 'Agent 已停止，最后执行于 2026-08-29 14:20', status: 'info', timestamp: '2026-08-29T18:00:00Z' },
  { id: 'evt-010', agent_id: 'agent-fta-007', agent_name: 'RDS 主从同步诊断', agent_type: 'fta', event_type: 'execution', description: 'RDS rm-2ze-001 同步延迟诊断完成', status: 'completed', timestamp: '2026-08-30T16:20:00Z', duration_ms: 25100, route_type: 'fta' },
  { id: 'evt-011', agent_id: 'agent-mega-001', agent_name: 'ACK 集群运维助手', agent_type: 'mega', event_type: 'execution', description: 'etcd 集群健康检查完成', status: 'completed', timestamp: '2026-08-31T08:40:00Z', duration_ms: 890, route_type: 'direct' },
  { id: 'evt-012', agent_id: 'agent-mega-006', agent_name: '变更风险评估', agent_type: 'mega', event_type: 'deployment', description: 'Agent 重启 (v0.9.2 → v0.9.3)', status: 'info', timestamp: '2026-08-31T07:30:00Z' },
];

// ─── Execution Stats ───
export const mockExecutionStats: ExecutionStats = {
  total: 7262,
  success: 6841,
  failed: 237,
  running: 3,
  avg_duration_ms: 3450,
  p99_duration_ms: 25100,
  by_route_type: [
    { route_type: 'skill', count: 2891, percentage: 39.8, avg_confidence: 0.93 },
    { route_type: 'fta', count: 1790, percentage: 24.6, avg_confidence: 0.87 },
    { route_type: 'rag', count: 1520, percentage: 20.9, avg_confidence: 0.89 },
    { route_type: 'multi', count: 812, percentage: 11.2, avg_confidence: 0.91 },
    { route_type: 'direct', count: 249, percentage: 3.5, avg_confidence: 0.95 },
  ],
  by_hour: [
    { hour: '00', count: 12, success_count: 12, failed_count: 0 },
    { hour: '01', count: 18, success_count: 17, failed_count: 1 },
    { hour: '02', count: 8, success_count: 8, failed_count: 0 },
    { hour: '03', count: 5, success_count: 5, failed_count: 0 },
    { hour: '04', count: 3, success_count: 3, failed_count: 0 },
    { hour: '05', count: 2, success_count: 2, failed_count: 0 },
    { hour: '06', count: 4, success_count: 4, failed_count: 0 },
    { hour: '07', count: 9, success_count: 8, failed_count: 1 },
    { hour: '08', count: 15, success_count: 14, failed_count: 1 },
    { hour: '09', count: 22, success_count: 21, failed_count: 1 },
    { hour: '10', count: 28, success_count: 26, failed_count: 2 },
    { hour: '11', count: 35, success_count: 33, failed_count: 2 },
    { hour: '12', count: 42, success_count: 40, failed_count: 2 },
    { hour: '13', count: 38, success_count: 36, failed_count: 2 },
    { hour: '14', count: 31, success_count: 29, failed_count: 2 },
    { hour: '15', count: 27, success_count: 26, failed_count: 1 },
    { hour: '16', count: 24, success_count: 23, failed_count: 1 },
    { hour: '17', count: 33, success_count: 31, failed_count: 2 },
    { hour: '18', count: 41, success_count: 38, failed_count: 3 },
    { hour: '19', count: 29, success_count: 27, failed_count: 2 },
    { hour: '20', count: 18, success_count: 17, failed_count: 1 },
    { hour: '21', count: 14, success_count: 13, failed_count: 1 },
    { hour: '22', count: 11, success_count: 10, failed_count: 1 },
    { hour: '23', count: 8, success_count: 8, failed_count: 0 },
  ],
};

// ─── Alerts ───
export const mockAlerts: AlertItem[] = [
  { id: 'alert-001', severity: 'critical', agent_id: 'agent-skill-004', agent_name: '工单自动处理', title: '工单处理成功率跌破阈值', description: '近 1 小时成功率降至 62.5%（阈值 80%）。工单网关触发限流，37 次重试耗尽后进入熔断等待。建议检查 ticket-gateway 配额并临时切换备用通道。', created_at: '2026-08-31T09:47:00Z', acknowledged: false },
  { id: 'alert-002', severity: 'high', agent_id: 'agent-mega-001', agent_name: 'ACK 集群运维助手', title: '智能选择器回退率升高', description: '近 30 分钟回退至规则路由的比例达 35%（正常 <10%）。昨晚上线的新意图样本尚未完成向量化入库，LLM 分类置信度普遍低于 0.75 阈值。', created_at: '2026-08-31T09:12:00Z', acknowledged: false },
  { id: 'alert-003', severity: 'high', agent_id: 'agent-fta-007', agent_name: 'RDS 主从同步诊断', title: '主从延迟诊断连续中断', description: '只读实例延迟指标采集连续 3 次超时（each 15s），故障树在证据收集节点中断。DTS 链路可能存在网络抖动，建议人工核查 binlog 位点。', created_at: '2026-08-30T22:41:00Z', acknowledged: false },
  { id: 'alert-004', severity: 'medium', agent_id: 'agent-rag-003', agent_name: '运维知识问答', title: 'RAG 检索延迟 P99 超阈值', description: 'ops-knowledge-base 集合 P99 检索延迟 317ms（阈值 200ms）。Embedding 服务 CPU 使用率 81%，已接近瓶颈，建议扩容 embedding 副本或开启查询缓存。', created_at: '2026-08-30T15:26:00Z', acknowledged: true },
  { id: 'alert-005', severity: 'medium', agent_id: 'agent-mega-006', agent_name: '变更风险评估', title: 'Agent 内存接近警戒线', description: '进程常驻内存 268MB（警戒线 300MB），近 7 天增长 12%。与大工单上下文未及时压缩有关，建议开启 harness 的 compaction 钩子。', created_at: '2026-08-29T10:03:00Z', acknowledged: true },
  { id: 'alert-006', severity: 'low', agent_id: 'agent-custom-005', agent_name: 'SLB 流量分析', title: 'Agent 空闲超过 48 小时', description: '最后执行时间 2026-08-29T14:20。SLB 周报任务已迁移至 agent-mega-001，建议评估下线本实例以释放 Agent 池配额。', created_at: '2026-08-29T08:30:00Z', acknowledged: true },
];

// ─── Monitoring: System Metrics ───
export const mockSystemMetrics: SystemMetric[] = [
  { key: 'cpu', name: 'CPU 使用率', value: 43.7, unit: '%', threshold: 80, status: 'normal' },
  { key: 'memory', name: '内存使用率', value: 66.2, unit: '%', threshold: 85, status: 'normal' },
  { key: 'agent_pool', name: 'Agent 池使用率', value: 78, unit: '%', threshold: 85, status: 'warning' },
  { key: 'api_latency', name: 'API 延迟 P99', value: 163, unit: 'ms', threshold: 500, status: 'normal' },
  { key: 'selector_fallback', name: '选择器回退率', value: 8.4, unit: '%', threshold: 15, status: 'normal' },
  { key: 'network', name: '网络连通性', value: 99.93, unit: '%', threshold: 99, status: 'normal' },
];

// ─── Monitoring: Loop Engineering ───
export const mockFeedbackSignals: FeedbackSignal[] = [
  { source: 'health', event: 'health.degraded', count: 12, rate_per_min: 0.8, severity: 'warn', last_seen: '2026-08-31T10:28:00Z' },
  { source: 'retry', event: 'retry.exhausted', count: 5, rate_per_min: 0.3, severity: 'error', last_seen: '2026-08-31T10:25:00Z' },
  { source: 'retry', event: 'retry.success', count: 142, rate_per_min: 9.5, severity: 'info', last_seen: '2026-08-31T10:30:00Z' },
  { source: 'workflow', event: 'workflow.complete', count: 287, rate_per_min: 19.1, severity: 'info', last_seen: '2026-08-31T10:30:00Z' },
  { source: 'workflow', event: 'workflow.failed', count: 23, rate_per_min: 1.5, severity: 'warn', last_seen: '2026-08-31T10:22:00Z' },
  { source: 'circuit_breaker', event: 'circuit_breaker.open', count: 2, rate_per_min: 0.1, severity: 'critical', last_seen: '2026-08-31T09:45:00Z' },
  { source: 'selector', event: 'selector.fallback', count: 18, rate_per_min: 1.2, severity: 'warn', last_seen: '2026-08-31T10:20:00Z' },
];

export const mockCircuitBreakers: CircuitBreakerStatus[] = [
  { name: 'llm-provider-qwen', state: 'closed', failures: 0, threshold: 5, last_state_change: '2026-08-31T08:00:00Z' },
  { name: 'llm-provider-mimo', state: 'closed', failures: 1, threshold: 5, last_state_change: '2026-08-31T09:30:00Z' },
  { name: 'milvus-vector-db', state: 'closed', failures: 0, threshold: 5, last_state_change: '2026-08-31T08:00:00Z' },
  { name: 'redis-cache', state: 'half_open', failures: 3, threshold: 5, last_state_change: '2026-08-31T10:15:00Z' },
  { name: 'external-webhook', state: 'open', failures: 5, threshold: 5, last_state_change: '2026-08-31T09:45:00Z' },
];

export const mockAdaptiveWeights: AdaptiveWeight[] = [
  { route_type: 'skill', weight: 1.15, trend: 'up' },
  { route_type: 'rag', weight: 0.92, trend: 'down' },
  { route_type: 'fta', weight: 1.03, trend: 'stable' },
  { route_type: 'code_analysis', weight: 0.98, trend: 'stable' },
];

// ─── Traces: Intelligent Selector Pipeline ───
export const mockTraces: TraceRecord[] = [
  {
    id: 'tr-4821',
    input: 'Kubernetes Pod CrashLoopBackOff 如何排查？',
    strategy: 'hybrid',
    intent_type: 'workflow',
    intent_confidence: 0.92,
    route_type: 'fta',
    route_target: 'k8s-crash-diagnosis',
    status: 'success',
    latency_ms: 16840,
    timestamp: '2026-08-31T10:32:15Z',
    enriched_skills: ['k8s-diagnostics', 'log-analysis'],
    corpus_matches: [{ name: 'K8s Pod 故障排查手册', score: 0.89 }],
    reasoning: '检测到 K8s 故障排查意图，故障树「Pod CrashLoopBackOff」匹配度最高，进入 FTA 结构化诊断',
  },
  {
    id: 'tr-4790',
    input: '查询 production 命名空间最近 24 小时的错误日志统计',
    strategy: 'hybrid',
    intent_type: 'skill',
    intent_confidence: 0.87,
    route_type: 'skill',
    route_target: 'log-analysis',
    status: 'success',
    latency_ms: 3120,
    timestamp: '2026-08-31T10:28:42Z',
    enriched_skills: ['log-analysis', 'metrics-query'],
    corpus_matches: [],
    reasoning: '明确的日志查询需求，log-analysis 技能注册的触发词完全命中，直接路由',
  },
  {
    id: 'tr-4764',
    input: 'Nginx 反向代理配置中 proxy_read_timeout 应该怎么设置？',
    strategy: 'hybrid',
    intent_type: 'rag',
    intent_confidence: 0.95,
    route_type: 'rag',
    route_target: 'ops-knowledge-base',
    status: 'success',
    latency_ms: 2310,
    timestamp: '2026-08-31T09:58:30Z',
    enriched_skills: [],
    corpus_matches: [
      { name: 'Nginx 配置调优指南', score: 0.94 },
      { name: '网关超时最佳实践', score: 0.78 },
    ],
    reasoning: '配置咨询类问题无执行诉求，语料库高置信度命中，走 RAG 知识问答',
  },
  {
    id: 'tr-4731',
    input: 'ACK 集群 cn-hangzhou-prod 节点池扩容评估：当前负载 78%，周末大促预期 +40% 流量',
    strategy: 'hybrid',
    intent_type: 'workflow',
    intent_confidence: 0.91,
    route_type: 'multi',
    route_target: 'capacity-plan→risk-check',
    status: 'success',
    latency_ms: 12470,
    timestamp: '2026-08-31T09:41:18Z',
    enriched_skills: ['metrics-query', 'k8s-diagnostics'],
    corpus_matches: [{ name: 'ACK 节点池扩容 SOP', score: 0.86 }],
    reasoning: '复合意图：容量测算（skill）+ 变更风险（fta），构造多路由链并行执行后汇总',
  },
  {
    id: 'tr-4698',
    input: '帮我分析这段 Python 代码的性能瓶颈：\nfor i in range(len(data)):\n  result.append(process(data[i]))',
    strategy: 'hybrid',
    intent_type: 'code_analysis',
    intent_confidence: 0.91,
    route_type: 'code_analysis',
    route_target: 'code-review',
    status: 'success',
    latency_ms: 5830,
    timestamp: '2026-08-30T17:12:04Z',
    enriched_skills: ['code-review', 'performance-profiler'],
    corpus_matches: [],
    reasoning: '输入携带代码块且诉求为性能分析，触发代码分析路由，静态扫描 + 复杂度评估',
  },
  {
    id: 'tr-4650',
    input: '线上订单服务 5xx 激增，从 0.2% 涨到 6.8%，帮忙定位根因',
    strategy: 'hybrid',
    intent_type: 'workflow',
    intent_confidence: 0.89,
    route_type: 'multi',
    route_target: 'log-analysis→code-analysis',
    status: 'success',
    latency_ms: 14210,
    timestamp: '2026-08-30T15:37:52Z',
    enriched_skills: ['log-analysis', 'metrics-query', 'code-review'],
    corpus_matches: [{ name: '订单服务架构文档', score: 0.83 }],
    reasoning: '故障根因类意图 + 涉及最近发布代码，链式路由：先日志/指标定位，再对可疑提交做代码分析',
  },
  {
    id: 'tr-4617',
    input: 'RDS MySQL 连接池耗尽导致服务不可用，怎么处理？',
    strategy: 'hybrid',
    intent_type: 'workflow',
    intent_confidence: 0.88,
    route_type: 'fta',
    route_target: 'db-connection-diagnosis',
    status: 'timeout',
    latency_ms: 21500,
    timestamp: '2026-08-30T14:45:00Z',
    enriched_skills: ['db-diagnostics', 'metrics-query'],
    corpus_matches: [{ name: 'MySQL 连接池调优手册', score: 0.85 }],
    reasoning: '数据库故障场景路由至 FTA 诊断树，但证据收集阶段 DTS 指标拉取连续超时，会话超时终止',
  },
  {
    id: 'tr-4589',
    input: '工单 INC-2026-0877 的内容摘要一下，并给出处理优先级建议',
    strategy: 'hybrid',
    intent_type: 'skill',
    intent_confidence: 0.94,
    route_type: 'skill',
    route_target: 'ticket-handler',
    status: 'success',
    latency_ms: 3480,
    timestamp: '2026-08-30T11:26:33Z',
    enriched_skills: ['ticket-handler'],
    corpus_matches: [],
    reasoning: '工单号正则命中 + 摘要/优先级关键词，ticket-handler 技能直接处理',
  },
  {
    id: 'tr-4543',
    input: 'ACK 节点池扩容有什么注意事项？',
    strategy: 'hybrid',
    intent_type: 'rag',
    intent_confidence: 0.86,
    route_type: 'rag',
    route_target: 'ops-knowledge-base',
    status: 'success',
    latency_ms: 2140,
    timestamp: '2026-08-29T16:08:21Z',
    enriched_skills: [],
    corpus_matches: [
      { name: 'ACK 节点池扩容 SOP', score: 0.91 },
      { name: '大促容量保障手册', score: 0.72 },
    ],
    reasoning: '知识咨询类问题，语料库两篇高相关文档命中，RAG 路由置信度充足',
  },
  {
    id: 'tr-4502',
    input: '把这个 Go 服务的 panic 栈看一下，定位崩溃原因\npanic: runtime error: invalid memory address or nil pointer dereference',
    strategy: 'llm',
    intent_type: 'code_analysis',
    intent_confidence: 0.96,
    route_type: 'code_analysis',
    route_target: 'code-review',
    status: 'success',
    latency_ms: 6420,
    timestamp: '2026-08-29T10:52:47Z',
    enriched_skills: ['code-review'],
    corpus_matches: [],
    reasoning: 'panic 栈片段 + 崩溃定位诉求，LLM 分类高置信命中代码分析线路',
  },
  {
    id: 'tr-4476',
    input: '给值班群发一条 Webhook 通知：订单服务 5xx 已恢复，持续 12 分钟',
    strategy: 'hybrid',
    intent_type: 'skill',
    intent_confidence: 0.93,
    route_type: 'skill',
    route_target: 'webhook-notify',
    status: 'failed',
    latency_ms: 4050,
    timestamp: '2026-08-28T18:34:10Z',
    enriched_skills: ['webhook-notify'],
    corpus_matches: [],
    reasoning: '明确的通知类技能调用，但外部 Webhook 端点处于熔断状态（7 次失败），执行失败待重试',
  },
  {
    id: 'tr-4431',
    input: '多节点同时 NotReady，集群还能调度吗？',
    strategy: 'hybrid',
    intent_type: 'workflow',
    intent_confidence: 0.9,
    route_type: 'fta',
    route_target: 'node-notready-diagnosis',
    status: 'success',
    latency_ms: 18920,
    timestamp: '2026-08-27T21:19:38Z',
    enriched_skills: ['k8s-diagnostics', 'log-analysis'],
    corpus_matches: [{ name: 'K8s 节点健康排查手册', score: 0.88 }],
    reasoning: '多节点故障属高严重度场景，路由至 FTA 进行结构化根因分析并给出调度影响评估',
  },
  {
    id: 'tr-4409',
    input: 'RDS 自动备份策略默认保留几天？',
    strategy: 'hybrid',
    intent_type: 'rag',
    intent_confidence: 0.9,
    route_type: 'rag',
    route_target: 'ops-knowledge-base',
    status: 'success',
    latency_ms: 1980,
    timestamp: '2026-08-27T09:44:12Z',
    enriched_skills: [],
    corpus_matches: [{ name: 'RDS 备份与恢复 FAQ', score: 0.95 }],
    reasoning: '产品事实型问答，FAQ 文档高分命中，RAG 直接引用作答',
  },
  {
    id: 'tr-4385',
    input: '你好，介绍一下 Resolve Agent 系统的整体架构',
    strategy: 'rule',
    intent_type: 'direct',
    intent_confidence: 0.99,
    route_type: 'direct',
    route_target: 'llm-direct',
    status: 'success',
    latency_ms: 1180,
    timestamp: '2026-08-26T15:22:05Z',
    enriched_skills: [],
    corpus_matches: [],
    reasoning: '问候/介绍类开放问题，规则前置匹配直接回复，无需进入业务线路',
  },
];

// ─── Mock Solutions ───
export const mockSolutions: TroubleshootingSolution[] = [
  {
    id: 'sol-001',
    title: 'K8s Pod CrashLoopBackOff 排查方案',
    problem_symptoms: 'Pod 频繁重启，状态为 CrashLoopBackOff，容器日志显示 OOMKilled 或应用启动失败',
    key_information: '1. kubectl describe pod 输出的 Events 和 Last State\n2. 容器 exit code（137=OOM, 1=应用错误）\n3. 节点资源使用率（kubectl top nodes）',
    troubleshooting_steps: '1. 检查 Pod Events 和容器状态\n2. 分析容器退出码确定失败类型\n3. 检查资源配额和 limits 设置\n4. 分析应用日志定位根因',
    resolution_steps: '1. OOM: 调整 memory limits 或优化应用内存使用\n2. 应用错误: 修复代码或配置问题\n3. 镜像问题: 检查镜像版本和拉取策略',
    domain: 'kubernetes',
    component: 'pod',
    severity: 'high',
    tags: ['k8s', 'pod', 'crashloop', 'oom'],
    search_keywords: 'CrashLoopBackOff OOMKilled pod restart',
    version: 1,
    status: 'active',
    source_uri: '',
    rag_collection_id: 'solutions',
    rag_document_id: 'sol-001',
    related_skill_names: ['k8s-pod-crash'],
    related_workflow_ids: [],
    metadata: {},
    created_by: 'system',
    created_at: '2026-07-15T10:00:00Z',
    updated_at: '2026-08-01T08:30:00Z',
  },
  {
    id: 'sol-002',
    title: 'RDS MySQL 主从复制延迟排查',
    problem_symptoms: '从库复制延迟持续增大，Seconds_Behind_Master 值异常，应用读请求获取到过时数据',
    key_information: '1. SHOW SLAVE STATUS 输出\n2. 主库 binlog 写入速率\n3. 从库 relay log 应用速率\n4. 大事务或 DDL 操作记录',
    troubleshooting_steps: '1. 检查从库复制状态（IO Thread / SQL Thread）\n2. 分析主库慢查询和大事务\n3. 检查网络延迟和带宽\n4. 评估从库硬件资源',
    resolution_steps: '1. 大事务: 拆分大批量操作为小批次\n2. 网络: 优化主从网络链路\n3. 资源: 升级从库规格或开启并行复制',
    domain: 'database',
    component: 'mysql-replication',
    severity: 'high',
    tags: ['rds', 'mysql', 'replication', 'lag'],
    search_keywords: 'replication lag Seconds_Behind_Master slave delay',
    version: 1,
    status: 'active',
    source_uri: '',
    rag_collection_id: 'solutions',
    rag_document_id: 'sol-002',
    related_skill_names: [],
    related_workflow_ids: ['wf-rds-replication-lag'],
    metadata: {},
    created_by: 'system',
    created_at: '2026-07-20T14:00:00Z',
    updated_at: '2026-08-05T11:20:00Z',
  },
  {
    id: 'sol-003',
    title: 'SLB 后端健康检查失败排查',
    problem_symptoms: 'SLB 健康检查显示后端服务器异常，流量未转发到部分实例，导致服务降级',
    key_information: '1. SLB 健康检查配置（端口、路径、间隔）\n2. 后端 ECS 安全组规则\n3. 应用健康检查端点响应状态',
    troubleshooting_steps: '1. 确认健康检查端口和路径配置\n2. 检查 ECS 安全组是否放行健康检查端口\n3. 手动 curl 健康检查端点验证\n4. 检查应用进程和端口监听状态',
    resolution_steps: '1. 安全组: 添加 SLB 健康检查 IP 段放行规则\n2. 应用: 确保健康检查端点返回 200\n3. 配置: 调整健康检查超时和阈值参数',
    domain: 'network',
    component: 'slb',
    severity: 'medium',
    tags: ['slb', 'health-check', 'load-balancer'],
    search_keywords: 'SLB health check failed backend unhealthy',
    version: 1,
    status: 'active',
    source_uri: '',
    rag_collection_id: 'solutions',
    rag_document_id: 'sol-003',
    related_skill_names: [],
    related_workflow_ids: [],
    metadata: {},
    created_by: 'system',
    created_at: '2026-08-01T09:00:00Z',
    updated_at: '2026-08-10T16:45:00Z',
  },
  // ── kudig 结构化标准方案语料 ──
  {
    id: 'sol-kudig-001',
    title: 'API Server 故障排查指南',
    problem_symptoms: 'API Server 无响应或请求超时，kubectl 命令返回 "Unable to connect to the server" 或 "connection refused"，集群内 Pod 无法通过 Service Account 访问 API，审计日志中出现大量 429/503 错误',
    key_information: '1. kube-apiserver Pod 日志（kubectl logs -n kube-system kube-apiserver-*）\n2. etcd 健康状态及延迟指标\n3. API Server 审计日志（--audit-log-path）\n4. API Priority and Fairness 配置（FlowSchema / PriorityLevelConfiguration）\n5. 证书有效期（openssl x509 -enddate）',
    troubleshooting_steps: '1. 检查 kube-apiserver Pod 运行状态和重启次数\n2. 验证 etcd 集群健康（etcdctl endpoint health）\n3. 检查 TLS 证书是否过期\n4. 分析 API Server 请求延迟和队列深度\n5. 检查 APF 限流配置是否合理\n6. 排查 Webhook 配置是否阻塞请求',
    resolution_steps: '1. 证书过期: 使用 kubeadm certs renew 续签\n2. etcd 故障: 修复 etcd 成员或从备份恢复\n3. 过载: 调整 APF FlowSchema 优先级和并发限制\n4. Webhook 阻塞: 设置 failurePolicy=Ignore 或修复 Webhook 服务',
    domain: 'kubernetes',
    component: 'api-server',
    severity: 'high',
    tags: ['k8s', 'api-server', 'control-plane', 'etcd', 'certificate', 'apf'],
    search_keywords: 'apiserver connection refused 503 429 certificate expired etcd unhealthy',
    version: 1,
    status: 'active',
    source_uri: 'https://raw.githubusercontent.com/kudig-io/kudig-database/main/topic-structural-trouble-shooting/01-control-plane/api-server.md',
    rag_collection_id: 'kudig-solutions',
    rag_document_id: '',
    related_skill_names: [],
    related_workflow_ids: [],
    metadata: { source: 'kudig', category: '01-control-plane' },
    created_by: 'kudig-importer',
    created_at: '2026-08-10T08:00:00Z',
    updated_at: '2026-08-10T08:00:00Z',
  },
  {
    id: 'sol-kudig-002',
    title: 'etcd 集群故障排查指南',
    problem_symptoms: 'etcd 响应缓慢或不可用，API Server 报 "etcdserver: request timed out"，集群 Leader 频繁切换，etcd 数据库大小持续增长触发告警',
    key_information: '1. etcdctl endpoint status / endpoint health 输出\n2. etcd 成员列表及 Leader 信息\n3. etcd 磁盘 I/O 延迟（WAL fsync duration）\n4. etcd 数据库大小和碎片率\n5. etcd 网络延迟（peer round-trip time）',
    troubleshooting_steps: '1. 检查所有 etcd 成员健康状态\n2. 分析 Leader 选举历史和切换频率\n3. 检查磁盘 I/O 性能（fdatasync 延迟应 < 10ms）\n4. 检查数据库大小是否接近配额（默认 2GB）\n5. 排查网络分区导致的脑裂问题',
    resolution_steps: '1. 磁盘慢: 迁移到 SSD 或调整 I/O 调度器\n2. 数据库过大: 执行 etcdctl compact + defrag\n3. 成员故障: 移除并重新加入成员\n4. 数据损坏: 从快照恢复 etcd 数据',
    domain: 'kubernetes',
    component: 'etcd',
    severity: 'high',
    tags: ['k8s', 'etcd', 'control-plane', 'storage', 'leader-election'],
    search_keywords: 'etcd timeout leader election disk io compact defrag snapshot restore',
    version: 1,
    status: 'active',
    source_uri: 'https://raw.githubusercontent.com/kudig-io/kudig-database/main/topic-structural-trouble-shooting/01-control-plane/etcd.md',
    rag_collection_id: 'kudig-solutions',
    rag_document_id: '',
    related_skill_names: [],
    related_workflow_ids: [],
    metadata: { source: 'kudig', category: '01-control-plane' },
    created_by: 'kudig-importer',
    created_at: '2026-08-10T08:00:00Z',
    updated_at: '2026-08-10T08:00:00Z',
  },
  {
    id: 'sol-kudig-003',
    title: 'Pod 生命周期故障排查指南',
    problem_symptoms: 'Pod 处于 Pending/CrashLoopBackOff/ImagePullBackOff/Unknown 等异常状态，容器频繁重启且 backoff 时间持续增长，Init Container 执行失败导致主容器无法启动',
    key_information: '1. kubectl describe pod 输出（Events、Conditions、Container States）\n2. 容器退出码（137=OOM/SIGKILL, 1=应用错误, 126=权限问题, 127=命令未找到）\n3. Pod QoS 等级和资源配额（requests/limits）\n4. 节点资源使用率和调度约束\n5. PodSandbox 和 Pause 容器状态',
    troubleshooting_steps: '1. 检查 Pod Events 确定失败阶段（调度/拉镜像/启动/运行）\n2. 分析容器退出码和 Last State\n3. 检查节点资源是否充足（kubectl top nodes）\n4. 验证 PVC 挂载、ConfigMap/Secret 是否存在\n5. 检查 SecurityContext 和 PodSecurityPolicy/Standards\n6. 排查 DNS 解析和网络连通性',
    resolution_steps: '1. OOMKilled: 增加 memory limits 或优化应用内存\n2. ImagePullBackOff: 检查镜像名称/凭证/仓库可达性\n3. 调度失败: 调整 nodeSelector/tolerations 或扩容节点\n4. 启动失败: 修复 command/args/env 配置',
    domain: 'kubernetes',
    component: 'pod',
    severity: 'medium',
    tags: ['k8s', 'pod', 'lifecycle', 'crashloop', 'oom', 'scheduling'],
    search_keywords: 'pod pending crashloopbackoff imagepullbackoff oomkilled exit code scheduling',
    version: 1,
    status: 'active',
    source_uri: 'https://raw.githubusercontent.com/kudig-io/kudig-database/main/topic-structural-trouble-shooting/05-workloads/01-pod-troubleshooting.md',
    rag_collection_id: 'kudig-solutions',
    rag_document_id: '',
    related_skill_names: ['k8s-pod-crash'],
    related_workflow_ids: [],
    metadata: { source: 'kudig', category: '05-workloads' },
    created_by: 'kudig-importer',
    created_at: '2026-08-10T08:00:00Z',
    updated_at: '2026-08-10T08:00:00Z',
  },
  {
    id: 'sol-kudig-004',
    title: 'CoreDNS 域名解析故障排查指南',
    problem_symptoms: 'Pod 内 DNS 解析失败，nslookup/dig 返回 SERVFAIL 或超时，Service 域名 (*.svc.cluster.local) 无法解析，外部域名解析异常',
    key_information: '1. CoreDNS Pod 日志和运行状态\n2. CoreDNS Corefile 配置\n3. kube-dns Service ClusterIP 和 Endpoints\n4. Pod 的 /etc/resolv.conf 内容\n5. 节点上游 DNS 服务器可达性',
    troubleshooting_steps: '1. 检查 CoreDNS Pod 是否正常运行\n2. 验证 kube-dns Service 的 Endpoints 是否指向 CoreDNS Pod\n3. 在故障 Pod 中执行 nslookup kubernetes.default\n4. 检查 CoreDNS 配置（Corefile）是否正确\n5. 确认 Pod resolv.conf 中 nameserver 指向 kube-dns ClusterIP\n6. 排查上游 DNS 转发链路',
    resolution_steps: '1. CoreDNS 崩溃: 检查资源限制并重启\n2. 配置错误: 修复 Corefile 中的 forward/upstream 配置\n3. Endpoints 空: 检查 CoreDNS Deployment 和标签选择器\n4. 网络隔离: 检查 NetworkPolicy 是否阻断 DNS 流量（UDP 53）',
    domain: 'kubernetes',
    component: 'coredns',
    severity: 'medium',
    tags: ['k8s', 'dns', 'coredns', 'networking', 'service-discovery'],
    search_keywords: 'dns coredns resolve servfail nslookup dig resolv.conf cluster.local',
    version: 1,
    status: 'active',
    source_uri: 'https://raw.githubusercontent.com/kudig-io/kudig-database/main/topic-structural-trouble-shooting/03-networking/dns.md',
    rag_collection_id: 'kudig-solutions',
    rag_document_id: '',
    related_skill_names: [],
    related_workflow_ids: [],
    metadata: { source: 'kudig', category: '03-networking' },
    created_by: 'kudig-importer',
    created_at: '2026-08-10T08:00:00Z',
    updated_at: '2026-08-10T08:00:00Z',
  },
  {
    id: 'sol-kudig-005',
    title: 'PV/PVC 存储故障排查指南',
    problem_symptoms: 'PVC 长时间处于 Pending 状态无法绑定，Pod 挂载卷失败报 "FailedMount" 或 "FailedAttachVolume"，存储卷扩容后容量未生效，数据读写异常或 I/O 错误',
    key_information: '1. PVC 状态和 Events（kubectl describe pvc）\n2. PV 信息和 reclaimPolicy\n3. StorageClass 配置和 provisioner\n4. CSI Driver Pod 日志\n5. 云厂商存储服务状态和配额',
    troubleshooting_steps: '1. 检查 PVC 状态和绑定的 PV\n2. 检查 StorageClass 是否存在及 provisioner 是否可用\n3. 查看 CSI Driver Pod 日志排查 provisioning/attach 错误\n4. 验证节点是否支持挂载（cloud provider 权限/配额）\n5. 检查 Pod 的 volumeMounts 和 volumes 配置一致性',
    resolution_steps: '1. PVC Pending: 创建匹配的 PV 或检查 StorageClass provisioner\n2. Attach 失败: 检查云盘配额/节点挂载数量限制\n3. Mount 失败: 检查文件系统类型和 fsGroup 权限\n4. 扩容不生效: 确认 StorageClass 支持 allowVolumeExpansion 并重启 Pod',
    domain: 'kubernetes',
    component: 'pvc',
    severity: 'medium',
    tags: ['k8s', 'storage', 'pv', 'pvc', 'csi', 'storageclass'],
    search_keywords: 'pvc pending pv bind mount attach csi storage class volume expansion',
    version: 1,
    status: 'active',
    source_uri: 'https://raw.githubusercontent.com/kudig-io/kudig-database/main/topic-structural-trouble-shooting/04-storage/pv-pvc.md',
    rag_collection_id: 'kudig-solutions',
    rag_document_id: '',
    related_skill_names: [],
    related_workflow_ids: [],
    metadata: { source: 'kudig', category: '04-storage' },
    created_by: 'kudig-importer',
    created_at: '2026-08-10T08:00:00Z',
    updated_at: '2026-08-10T08:00:00Z',
  },
  {
    id: 'sol-004',
    title: 'Redis 缓存击穿排查方案',
    problem_symptoms: '热点 Key 过期瞬间大量请求穿透到数据库，RDS QPS 突刺至平时 10 倍以上，应用响应延迟显著上升',
    key_information: '1. Redis 慢日志与 Key 过期监控\n2. RDS QPS 与连接数突刺曲线\n3. 应用访问日志中的慢请求分布\n4. 热点 Key 统计（redis-cli --hotkeys）',
    troubleshooting_steps: '1. 对比 Key 过期时间与 RDS 流量突刺时间点\n2. 确认是否存在单点热点 Key\n3. 检查应用是否使用互斥锁或逻辑过期策略\n4. 评估缓存 TTL 设置合理性',
    resolution_steps: '1. 为热点 Key 添加互斥锁重建缓存\n2. 使用逻辑过期避免集中失效\n3. 对高频 Key 设置随机化 TTL\n4. 引入本地缓存二级兜底',
    domain: 'database',
    component: 'redis',
    severity: 'critical',
    tags: ['redis', 'cache', 'hotspot', 'rds'],
    search_keywords: 'cache breakdown hotkey 穿透 击穿 ttl redis qps spike',
    version: 1,
    status: 'active',
    source_uri: '',
    rag_collection_id: 'solutions',
    rag_document_id: 'sol-004',
    related_skill_names: [],
    related_workflow_ids: [],
    metadata: {},
    created_by: 'system',
    created_at: '2026-08-04T09:30:00Z',
    updated_at: '2026-08-20T14:10:00Z',
  },
  {
    id: 'sol-005',
    title: 'Nginx 502 网关错误排查方案',
    problem_symptoms: 'Nginx 反向代理返回 502 Bad Gateway，upstream 日志出现 connect() failed 或 no live upstreams',
    key_information: '1. Nginx error_log 中 upstream 错误详情\n2. 后端服务进程与端口监听状态\n3. 后端响应时间与连接队列\n4. upstream keepalive 与超时配置',
    troubleshooting_steps: '1. 查看 error_log 定位 upstream 失败原因\n2. 检查后端服务是否存活并可连通\n3. 验证 proxy_connect_timeout / proxy_read_timeout 配置\n4. 检查后端连接数是否打满',
    resolution_steps: '1. 后端宕机: 重启服务并补充健康检查\n2. 超时: 调整 proxy 超时参数\n3. 连接打满: 扩容 upstream 或开启 keepalive',
    domain: 'network',
    component: 'nginx',
    severity: 'medium',
    tags: ['nginx', '502', 'gateway', 'upstream'],
    search_keywords: 'nginx 502 bad gateway upstream connect failed timeout',
    version: 1,
    status: 'draft',
    source_uri: '',
    rag_collection_id: 'solutions',
    rag_document_id: 'sol-005',
    related_skill_names: [],
    related_workflow_ids: [],
    metadata: {},
    created_by: 'user',
    created_at: '2026-08-28T11:00:00Z',
    updated_at: '2026-08-28T11:00:00Z',
  },
  {
    id: 'sol-006',
    title: 'K8s 1.22 升级前检查清单',
    problem_symptoms: '集群从 1.22 升级前需确认 deprecated API 使用情况、节点版本偏差与addon 兼容性，避免升级后负载不可用',
    key_information: '1. kubent / pluto 扫描的 deprecated API 清单\n2. kubelet 版本偏差（不超过 minor ±1）\n3. CNI / CSI 版本兼容矩阵\n4. PodDisruptionBudget 与升级并发配置',
    troubleshooting_steps: '1. 扫描集群内资源引用的废弃 API\n2. 核对节点版本偏差\n3. 评估 CNI/CSI/Ingress 组件兼容性\n4. 制定升级批次与回滚预案',
    resolution_steps: '1. 废弃 API: 迁移 workload 至新版本 API 组\n2. 节点偏差: 先升级 kubelet 再升级控制面\n3. 组件不兼容: 升级 addon 至兼容版本',
    domain: 'kubernetes',
    component: 'upgrade',
    severity: 'low',
    tags: ['k8s', 'upgrade', 'deprecated-api', 'checklist'],
    search_keywords: 'k8s upgrade deprecated api kubelet skew addon compatibility',
    version: 2,
    status: 'archived',
    source_uri: '',
    rag_collection_id: 'solutions',
    rag_document_id: 'sol-006',
    related_skill_names: [],
    related_workflow_ids: [],
    metadata: {},
    created_by: 'system',
    created_at: '2026-06-15T10:00:00Z',
    updated_at: '2026-08-18T09:00:00Z',
  },
];

export const mockSolutionExecutions: Record<string, SolutionExecution[]> = {
  'sol-001': [
    {
      id: 'exec-001',
      solution_id: 'sol-001',
      executor: 'agent-mega-001',
      trigger_context: { ticket_id: 'INC-2026-0888', route: 'fta' },
      status: 'success',
      outcome_notes: 'OOM 问题确认，调整 memory limits 后恢复',
      effectiveness_score: 0.92,
      duration_ms: 45000,
      started_at: '2026-08-26T10:30:00Z',
      completed_at: '2026-08-26T10:30:45Z',
      created_at: '2026-08-26T10:30:45Z',
    },
  ],
  'sol-002': [
    {
      id: 'exec-201',
      solution_id: 'sol-002',
      executor: 'agent-rag-003',
      trigger_context: { ticket_id: 'INC-2026-0889', alert_id: 'alert-db-001' },
      status: 'success',
      outcome_notes: '定位到夜间批量归档大事务，拆分批次后延迟回落至 3s 内',
      effectiveness_score: 0.87,
      duration_ms: 120000,
      started_at: '2026-08-27T02:15:00Z',
      completed_at: '2026-08-27T02:17:00Z',
      created_at: '2026-08-27T02:17:00Z',
    },
    {
      id: 'exec-202',
      solution_id: 'sol-002',
      executor: 'agent-mega-001',
      trigger_context: { incident_id: 'INC-2026-0892', source: 'escalation' },
      status: 'partial',
      outcome_notes: '延迟暂时缓解，建议开启并行复制并升级从库规格',
      effectiveness_score: 0.64,
      duration_ms: 210000,
      started_at: '2026-08-29T08:40:00Z',
      completed_at: '2026-08-29T08:43:30Z',
      created_at: '2026-08-29T08:43:30Z',
    },
  ],
  'sol-003': [
    {
      id: 'exec-301',
      solution_id: 'sol-003',
      executor: 'agent-fta-002',
      trigger_context: { ticket_id: 'INC-2026-0890', route: 'fta' },
      status: 'failed',
      outcome_notes: '确认 ECS 安全组未放行 SLB 健康检查网段，待网络组变更窗口处理',
      effectiveness_score: 0.22,
      duration_ms: 60000,
      started_at: '2026-08-28T16:20:00Z',
      completed_at: '2026-08-28T16:21:00Z',
      created_at: '2026-08-28T16:21:00Z',
    },
  ],
  'sol-004': [
    {
      id: 'exec-401',
      solution_id: 'sol-004',
      executor: 'agent-skill-004',
      trigger_context: { session_id: 'conv-003', keyword: 'redis 击穿' },
      status: 'success',
      outcome_notes: '热点 Key 命中，建议互斥锁重建并随机化 TTL',
      effectiveness_score: 0.78,
      duration_ms: 30000,
      started_at: '2026-08-30T11:05:00Z',
      completed_at: '2026-08-30T11:05:30Z',
      created_at: '2026-08-30T11:05:30Z',
    },
  ],
};

// ─── 长期记忆删除状态（deleteLongTermMemory 真实生效） ───
export const deletedLtmIds = new Set<string>();
