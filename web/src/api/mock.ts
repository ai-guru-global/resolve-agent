/**
 * Mock 数据层 —— 模拟真实运维场景
 * 所有数据基于阿里云 ACK / ECS / RDS / SLB 等真实运维场景构造
 */

import type { Agent, CreateAgentRequest, Skill, Workflow, Collection } from './client';
import type {
  OpsTicket,
  DashboardMetrics,
  PlatformStatus,
  SkillDetailInfo,
  WorkflowDetail,
  WorkflowExecutionRecord,
  Document,
  CollectionDetail,
  AgentExecution,
  AgentRuntimeStatus,
  ModelConfig,
  SystemSettings,
  FaultTree,
  HarnessConfig,
  AgentOverview,
  ActivityEvent,
  ExecutionStats,
  AlertItem,
  TroubleshootingSolution,
  SolutionSeverity,
  SolutionExecution,
  SolutionSearchOptions,
  UpdateAgentRequest,
  Conversation,
  ConversationMessage,
  LongTermMemory,
  AgentExecutionDetail,
  AgentAnalytics,
  AgentDiagnosticsResult,
  DeploymentInfo,
  DeploymentVersion,
  DeploymentLog,
  CollaborationSession,
  AccessRule,
  AuditLogEntry,
  AgentTemplate,
  ScenarioConfig,
} from '../types';

// ─── 延迟模拟，让体验更真实 ───
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randomDelay = () => delay(200 + Math.random() * 400);

// ─── Default Harness Configs ───
const defaultHarness: HarnessConfig = {
  system_prompt: '',
  tools: [],
  skills: [],
  memory_enabled: true,
  hooks: [
    { name: '执行日志', type: 'post_execution', action: 'log_trace', enabled: true },
  ],
  sandbox_type: 'container',
  context_strategy: 'default',
};

// ─── Agents ───
let mockAgents: Agent[] = [
  {
    id: 'agent-mega-001',
    name: 'ACK 集群运维助手',
    type: 'mega',
    status: 'active',
    mode: 'selector',
    harness: {
      system_prompt: '你是一个专注于阿里云 ACK 容器服务的运维助手。负责集群健康巡检、Pod 异常诊断、节点扩缩容决策。',
      tools: ['kubectl', 'prometheus-query', 'helm'],
      skills: ['log-analyzer', 'metric-alerter', 'consulting-qa'],
      memory_enabled: true,
      hooks: [
        { name: '执行日志', type: 'post_execution', action: 'log_trace', enabled: true },
        { name: '错误自动重试', type: 'on_error', action: 'auto_retry', enabled: true },
        { name: '上下文压缩', type: 'pre_execution', action: 'compaction', enabled: true },
      ],
      sandbox_type: 'container',
      context_strategy: 'compaction',
    },
    config: {
      model: 'qwen-max',
      max_tokens: 4096,
      temperature: 0.3,
      created_at: '2026-03-01T08:00:00Z',
    },
  },
  {
    id: 'agent-fta-002',
    name: '故障根因分析引擎',
    type: 'fta',
    status: 'active',
    mode: 'selector',
    harness: {
      system_prompt: '你是一个故障树分析引擎，基于 FTA 方法论进行系统性根因定位。',
      tools: ['fault-tree-engine', 'log-query', 'metric-query'],
      skills: ['log-analyzer', 'metric-alerter'],
      memory_enabled: true,
      hooks: [
        { name: '执行日志', type: 'post_execution', action: 'log_trace', enabled: true },
        { name: '测试验证', type: 'post_execution', action: 'test_suite', enabled: true },
      ],
      sandbox_type: 'container',
      context_strategy: 'offloading',
    },
    config: {
      model: 'qwen-plus',
      fault_tree_id: 'ft-k8s-node-notready',
      auto_execute: true,
      max_depth: 5,
      created_at: '2026-03-05T10:30:00Z',
    },
  },
  {
    id: 'agent-rag-003',
    name: '运维知识问答',
    type: 'rag',
    status: 'active',
    mode: 'selector',
    harness: {
      system_prompt: '你是运维知识问答助手，基于 RAG 语义检索提供精准的运维知识回答。',
      tools: ['vector-search', 'cross-encoder-rerank'],
      skills: ['consulting-qa'],
      memory_enabled: true,
      hooks: [
        { name: '执行日志', type: 'post_execution', action: 'log_trace', enabled: true },
      ],
      sandbox_type: 'local',
      context_strategy: 'default',
    },
    config: {
      model: 'qwen-turbo',
      collection_id: 'col-ops-kb-001',
      top_k: 5,
      similarity_threshold: 0.72,
      created_at: '2026-03-10T14:00:00Z',
    },
  },
  {
    id: 'agent-skill-004',
    name: '工单自动处理',
    type: 'skill',
    status: 'active',
    mode: 'all_skills',
    harness: {
      system_prompt: '你是工单自动处理引擎，并行调用所有绑定技能处理运维工单。',
      tools: ['ticket-api', 'notification-api'],
      skills: ['ticket-handler', 'consulting-qa'],
      memory_enabled: false,
      hooks: [
        { name: '执行日志', type: 'post_execution', action: 'log_trace', enabled: true },
        { name: '结果通知', type: 'post_execution', action: 'notify', enabled: true },
      ],
      sandbox_type: 'container',
      context_strategy: 'default',
    },
    config: {
      model: 'qwen-plus',
      auto_assign: true,
      created_at: '2026-03-12T09:00:00Z',
    },
  },
  {
    id: 'agent-custom-005',
    name: 'SLB 流量分析',
    type: 'custom',
    status: 'inactive',
    mode: 'all_skills',
    harness: {
      system_prompt: '分析 SLB 实例的流量模式，识别异常流量峰值，给出弹性伸缩建议。',
      tools: ['prometheus-query', 'slb-api'],
      skills: ['metric-alerter'],
      memory_enabled: false,
      hooks: [
        { name: '执行日志', type: 'post_execution', action: 'log_trace', enabled: true },
      ],
      sandbox_type: 'remote',
      context_strategy: 'default',
    },
    config: {
      model: 'qwen-turbo',
      data_source: 'prometheus',
      created_at: '2026-03-15T11:00:00Z',
    },
  },
  {
    id: 'agent-mega-006',
    name: '变更风险评估',
    type: 'mega',
    status: 'error',
    mode: 'selector',
    harness: {
      system_prompt: '评估运维变更操作的风险等级，检查变更窗口合规性，生成变更审批建议。',
      tools: ['change-management-api', 'compliance-checker'],
      skills: ['change-reviewer'],
      memory_enabled: true,
      hooks: [
        { name: '执行日志', type: 'post_execution', action: 'log_trace', enabled: true },
        { name: '合规校验', type: 'pre_execution', action: 'lint_check', enabled: true },
        { name: '错误自动重试', type: 'on_error', action: 'auto_retry', enabled: false },
      ],
      sandbox_type: 'container',
      context_strategy: 'compaction',
    },
    config: {
      model: 'qwen-max',
      risk_threshold: 0.6,
      created_at: '2026-03-18T16:00:00Z',
    },
  },
  {
    id: 'agent-fta-007',
    name: 'RDS 主从同步诊断',
    type: 'fta',
    status: 'active',
    mode: 'selector',
    harness: {
      system_prompt: '专注于 RDS MySQL 主从同步延迟的故障树分析诊断。',
      tools: ['fault-tree-engine', 'rds-api', 'metric-query'],
      skills: ['log-analyzer'],
      memory_enabled: true,
      hooks: [
        { name: '执行日志', type: 'post_execution', action: 'log_trace', enabled: true },
      ],
      sandbox_type: 'container',
      context_strategy: 'offloading',
    },
    config: {
      model: 'qwen-plus',
      fault_tree_id: 'ft-rds-replication-lag',
      check_interval_seconds: 60,
      created_at: '2026-03-20T13:00:00Z',
    },
  },
];

// ─── Skills ───
const mockSkills: Skill[] = [
  { name: 'ticket-handler', version: '1.2.0', description: '自动分析运维工单，提取关键信息，评估优先级，生成处理建议', status: 'installed', skill_type: 'general' },
  { name: 'consulting-qa', version: '1.1.0', description: '基于阿里云产品文档和最佳实践的智能问答，覆盖 ECS/ACK/RDS/OSS 等', status: 'installed', skill_type: 'general' },
  { name: 'log-analyzer', version: '2.0.1', description: '多源日志聚合分析，支持 SLS、Kafka、文件日志的模式识别和异常检测', status: 'installed', skill_type: 'general' },
  { name: 'metric-alerter', version: '1.0.3', description: '基于 Prometheus 指标的智能告警，支持动态阈值和趋势预测', status: 'installed', skill_type: 'general' },
  { name: 'change-reviewer', version: '0.9.0', description: '变更单自动审核，检查回滚方案完整性和变更窗口合规性', status: 'installed', skill_type: 'general' },
  { name: 'hello-world', version: '0.1.0', description: '技能框架验证用的基础测试技能', status: 'installed', skill_type: 'general' },
  { name: 'k8s-pod-crash', version: '1.0.0', description: 'Kubernetes Pod CrashLoopBackOff 场景化排查，自动采集事件/日志/资源状态并输出结构化排查方案', status: 'installed', skill_type: 'scenario', domain: 'kubernetes', tags: ['k8s', 'pod', 'crash', 'oom'] },
  { name: 'rds-replication-lag', version: '0.8.0', description: 'RDS MySQL 主从复制延迟诊断，检测复制线程状态、慢查询阻塞及网络延迟', status: 'installed', skill_type: 'scenario', domain: 'database', tags: ['rds', 'mysql', 'replication', 'lag'] },
  // Kudig topic-skills (scenario-type, imported from kudig-database)
  { name: 'SKILL-NODE-001', version: '1.0', description: 'Node NotReady 是 Kubernetes 集群中爆炸半径最大的故障类型之一。当节点进入 NotReady 状态时，Kubernetes 控制平面将在 pod-eviction-timeout 后开始驱逐该节点上的所有非 DaemonSet Pod', status: 'installed', skill_type: 'scenario', domain: 'node', tags: ['NotReady', 'NodeNotReady', '节点不可用', 'kubelet'] },
  { name: 'SKILL-POD-001', version: '1.0', description: 'CrashLoopBackOff 和 OOMKilled 是生产环境中最常见的 Pod 级别故障。CrashLoopBackOff: 容器反复退出，kubelet 以指数退避策略不断尝试重启容器。OOMKilled: Linux 内核的 OOM Killer 终止了容器进程', status: 'installed', skill_type: 'scenario', domain: 'pod', tags: ['CrashLoopBackOff', 'OOMKilled', '容器崩溃', 'exit code 137'] },
  { name: 'SKILL-POD-002', version: '1.0', description: 'Pod Pending 状态表示容器无法被调度到节点，可能由于资源不足、节点选择器不匹配、污点等原因导致', status: 'installed', skill_type: 'scenario', domain: 'pod', tags: ['Pending', 'Pod Pending', '调度失败', 'unschedulable'] },
  { name: 'SKILL-NET-001', version: '1.0', description: 'DNS 解析失败是 Kubernetes 网络故障中最常见的问题之一。CoreDNS 是集群内服务发现的核心组件，DNS 解析异常会导致服务间无法通信', status: 'installed', skill_type: 'scenario', domain: 'network', tags: ['DNS', 'CoreDNS', 'resolved', '域名解析'] },
  { name: 'SKILL-NET-002', version: '1.0', description: 'Service 连通性故障可能由 Endpoints 不健康、kube-proxy 异常、网络策略阻止或 CNI 故障引起', status: 'installed', skill_type: 'scenario', domain: 'network', tags: ['Service', '连同性', 'Endpoints', 'Connection refused'] },
  { name: 'SKILL-SEC-001', version: '1.0', description: '证书过期是生产环境中导致服务不可用的常见原因。kubelet、apiserver、etcd 之间的 TLS 证书过期会导致组件无法通信', status: 'installed', skill_type: 'scenario', domain: 'security', tags: ['Certificate', 'TLS', '证书过期', 'expired'] },
  { name: 'SKILL-STORE-001', version: '1.0', description: 'PVC 存储故障可能由 StorageClass 配置错误、CSI driver 异常、节点存储满或 PVC/PV 绑定问题引起', status: 'installed', skill_type: 'scenario', domain: 'storage', tags: ['PVC', 'Storage', 'PersistentVolume', '挂载失败'] },
  { name: 'SKILL-WORK-001', version: '1.0', description: 'Deployment Rollout 失败可能由于镜像拉取错误、资源配额不足、探针配置错误或 Readiness 失败导致', status: 'installed', skill_type: 'scenario', domain: 'workload', tags: ['Deployment', 'Rollout', 'ImagePullBackOff', '探针'] },
  { name: 'SKILL-SEC-002', version: '1.0', description: 'RBAC/Quota 故障包括 ServiceAccount 权限不足、RoleBinding 缺失、ResourceQuota 或 LimitRange 限制导致的工作负载无法创建', status: 'installed', skill_type: 'scenario', domain: 'security', tags: ['RBAC', 'Quota', '权限', 'Forbidden', 'ResourceQuota'] },
  { name: 'SKILL-IMAGE-001', version: '1.0', description: '镜像拉取失败可能由于镜像不存在、registry 认证失败、网络不通或节点缺少镜像拉取权限导致', status: 'installed', skill_type: 'scenario', domain: 'image', tags: ['ImagePullBackOff', 'ErrImagePull', 'registry', '镜像拉取'] },
  { name: 'SKILL-CP-001', version: '1.0', description: '控制平面故障包括 etcd 集群异常、kube-apiserver 不可用、kube-controller-manager 或 kube-scheduler 异常，可能导致集群范围的服务中断', status: 'installed', skill_type: 'scenario', domain: 'control-plane', tags: ['etcd', 'apiserver', 'control-plane', 'controlplane'] },
  { name: 'SKILL-SCALE-001', version: '1.0', description: '自动扩缩容故障包括 HPA/VPA/CA 无法正常工作，可能由于指标采集失败、资源瓶颈或副本数达到上限导致', status: 'installed', skill_type: 'scenario', domain: 'scaling', tags: ['HPA', 'VPA', 'Autoscaling', '扩缩容', 'replicas'] },
  { name: 'SKILL-NET-003', version: '1.0', description: 'Ingress/Gateway 故障可能由于 Ingress Controller 异常、域名解析问题、证书问题或后端服务不可达导致', status: 'installed', skill_type: 'scenario', domain: 'network', tags: ['Ingress', 'Gateway', 'nginx', '域名'] },
  { name: 'SKILL-CONFIG-001', version: '1.0', description: 'ConfigMap/Secret 故障包括配置未同步、Secret 缺失、挂载路径错误或 ConfigMap 变更未触发 Pod 更新', status: 'installed', skill_type: 'scenario', domain: 'configuration', tags: ['ConfigMap', 'Secret', '配置', '挂载'] },
  { name: 'SKILL-MONITOR-001', version: '1.0', description: '监控告警故障包括 Prometheus 采集失败、Alertmanager 通知异常、指标数据缺失或告警规则配置错误', status: 'installed', skill_type: 'scenario', domain: 'observability', tags: ['Prometheus', 'Alertmanager', '告警', 'metrics'] },
  { name: 'SKILL-LOG-001', version: '1.0', description: '日志采集故障包括日志丢失、采集延迟、日志格式解析错误或日志后端存储异常', status: 'installed', skill_type: 'scenario', domain: 'observability', tags: ['Logging', '日志', 'FluentBit', 'SLS'] },
  { name: 'SKILL-PERF-001', version: '1.0', description: '性能瓶颈诊断包括 CPU 节流、内存泄漏、IO 延迟高、网络带宽饱和或存储吞吐不足', status: 'installed', skill_type: 'scenario', domain: 'performance', tags: ['CPU', 'Memory', 'IO', 'Performance', '瓶颈', 'Throttling'] },
  { name: 'SKILL-SEC-003', version: '1.0', description: '安全事件响应包括未授权访问检测、异常行为分析、漏洞利用排查和安全事件遏制', status: 'installed', skill_type: 'scenario', domain: 'security', tags: ['Security', 'Incident', 'Vulnerability', '安全事件'] },
];

const generatedSkillDisplayNames: Record<string, string> = {
  'SKILL-NODE-001': '节点 NotReady 诊断与修复',
  'SKILL-POD-001': 'Pod CrashLoopBackOff 与 OOMKilled 诊断',
  'SKILL-POD-002': 'Pod Pending 诊断与修复',
  'SKILL-NET-001': 'DNS 解析失败诊断',
  'SKILL-NET-002': 'Service 连通性故障诊断',
  'SKILL-SEC-001': '证书过期诊断与修复',
  'SKILL-STORE-001': 'PVC 存储故障诊断',
  'SKILL-WORK-001': 'Deployment Rollout 失败诊断',
  'SKILL-SEC-002': 'RBAC/Quota 故障诊断',
  'SKILL-IMAGE-001': '镜像拉取失败诊断',
  'SKILL-CP-001': '控制平面故障诊断',
  'SKILL-SCALE-001': '自动扩缩容故障诊断',
  'SKILL-NET-003': 'Ingress/Gateway 故障诊断',
  'SKILL-CONFIG-001': 'ConfigMap/Secret 故障诊断',
  'SKILL-MONITOR-001': '监控告警故障诊断',
  'SKILL-LOG-001': '日志采集故障诊断',
  'SKILL-PERF-001': '性能瓶颈诊断',
  'SKILL-SEC-003': '安全事件响应',
};

const generatedSkillIcons: Record<string, string> = {
  'SKILL-NODE-001': '🖥️',
  'SKILL-POD-001': '💥',
  'SKILL-POD-002': '⏳',
  'SKILL-NET-001': '🌐',
  'SKILL-NET-002': '🔗',
  'SKILL-SEC-001': '🔐',
  'SKILL-STORE-001': '💾',
  'SKILL-WORK-001': '🚀',
  'SKILL-SEC-002': '👮',
  'SKILL-IMAGE-001': '📦',
  'SKILL-CP-001': '⚙️',
  'SKILL-SCALE-001': '📈',
  'SKILL-NET-003': '🚪',
  'SKILL-CONFIG-001': '📋',
  'SKILL-MONITOR-001': '📉',
  'SKILL-LOG-001': '📝',
  'SKILL-PERF-001': '⚡',
  'SKILL-SEC-003': '🛡️',
};

function formatSkillDisplayName(name: string): string {
  if (generatedSkillDisplayNames[name]) {
    return generatedSkillDisplayNames[name];
  }

  if (name.startsWith('SKILL-')) {
    return name.replace(/^SKILL-/, '').replace(/-/g, ' ');
  }

  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function inferSkillLevel(executionCount: number): number {
  return Math.min(10, Math.max(1, Math.floor(executionCount / 120) + 1));
}

function inferExperiencePoints(executionCount: number): number {
  return executionCount * 15 + 120;
}

function createScenarioFlow(skill: Skill): ScenarioConfig['troubleshooting_flow'] {
  const domain = skill.domain ?? 'general';
  const tags = skill.tags ?? [];

  return [
    {
      id: `${skill.name}-collect-context`,
      name: '收集上下文',
      description: `收集 ${domain} 场景的基础上下文、日志与事件信息`,
      step_type: 'collect',
      command: null,
      skill_ref: null,
      expected_output: 'context_bundle',
      condition: null,
      timeout_seconds: 20,
      order: 1,
    },
    {
      id: `${skill.name}-diagnose-signal`,
      name: '诊断关键异常',
      description: `结合标签 ${tags.join(' / ') || 'default'} 分析关键异常信号`,
      step_type: 'diagnose',
      command: null,
      skill_ref: null,
      expected_output: 'diagnosis_report',
      condition: null,
      timeout_seconds: 15,
      order: 2,
    },
    {
      id: `${skill.name}-recommend-action`,
      name: '生成修复建议',
      description: '输出结构化修复建议、优先级和回归验证要点',
      step_type: 'action',
      command: null,
      skill_ref: null,
      expected_output: 'resolution_plan',
      condition: null,
      timeout_seconds: 10,
      order: 3,
    },
  ];
}

function buildSkillDetailFromList(skill: Skill): SkillDetailInfo {
  const executionCount = 80 + skill.name.length * 17;
  const level = inferSkillLevel(executionCount);
  const experiencePoints = inferExperiencePoints(executionCount);

  return {
    name: skill.name,
    display_name: formatSkillDisplayName(skill.name),
    version: skill.version,
    description: skill.description,
    status: skill.status,
    author: 'ResolveNet Team',
    icon: generatedSkillIcons[skill.name] ?? '⚡',
    entry_point: `skills/${skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}/skill.py`,
    skill_type: skill.skill_type ?? 'general',
    scenario_config: skill.skill_type === 'scenario'
      ? {
          domain: skill.domain ?? 'general',
          tags: skill.tags ?? [],
          troubleshooting_flow: createScenarioFlow(skill),
          output_template: {
            include_symptoms: true,
            include_evidence: true,
            include_steps: true,
            include_resolution: true,
            custom_sections: [],
          },
          severity_levels: ['low', 'medium', 'high', 'critical'],
        }
      : undefined,
    inputs: skill.skill_type === 'scenario'
      ? [
          { name: 'target', type: 'string', description: '待排查对象标识', required: true },
          { name: 'namespace', type: 'string', description: '相关命名空间或服务空间', required: false },
        ]
      : [
          { name: 'input', type: 'string', description: '技能输入内容', required: true },
          { name: 'context', type: 'object', description: '附加上下文', required: false },
        ],
    outputs: skill.skill_type === 'scenario'
      ? [
          { name: 'root_cause', type: 'string', description: '诊断出的根因', required: false },
          { name: 'resolution_plan', type: 'object', description: '结构化修复方案', required: false },
        ]
      : [
          { name: 'result', type: 'string', description: '技能执行结果', required: false },
          { name: 'metadata', type: 'object', description: '执行元数据', required: false },
        ],
    permissions: {
      network_access: skill.skill_type === 'scenario',
      file_system_read: true,
      file_system_write: false,
      timeout_seconds: skill.skill_type === 'scenario' ? 90 : 30,
    },
    install_date: '2026-04-01T08:00:00Z',
    last_executed: '2026-04-12T09:30:00Z',
    execution_count: executionCount,
    level,
    experience_points: experiencePoints,
    next_level_experience: experiencePoints + 500,
    related_agent_count: 2,
  };
}

// ─── Skill Details ───
const mockSkillDetails: Record<string, SkillDetailInfo> = {
  'ticket-handler': {
    name: 'ticket-handler',
    display_name: '工单处理',
    version: '1.2.0',
    description: '自动分析运维工单，提取关键信息，评估优先级，生成处理建议',
    status: 'installed',
    author: 'ResolveNet Team',
    icon: '🎫',
    entry_point: 'skills/ticket_handler/main.py',
    skill_type: 'general',
    inputs: [
      { name: 'ticket_content', type: 'string', description: '工单内容描述', required: true },
      { name: 'action', type: 'string', description: '操作类型: analyze | summarize | suggest', required: true },
      { name: 'context', type: 'object', description: '附加上下文信息', required: false },
    ],
    outputs: [
      { name: 'result', type: 'string', description: '处理结果', required: false },
      { name: 'component', type: 'string', description: '涉及组件', required: false },
      { name: 'priority', type: 'string', description: '优先级评估', required: false },
    ],
    permissions: {
      network_access: true,
      file_system_read: true,
      file_system_write: false,
      timeout_seconds: 30,
    },
    install_date: '2026-03-01T08:00:00Z',
    last_executed: '2026-04-08T09:12:00Z',
    execution_count: 1247,
  },
  'consulting-qa': {
    name: 'consulting-qa',
    display_name: '咨询问答',
    version: '1.1.0',
    description: '基于阿里云产品文档和最佳实践的智能问答，覆盖 ECS/ACK/RDS/OSS 等',
    status: 'installed',
    author: 'ResolveNet Team',
    icon: '💬',
    entry_point: 'skills/consulting_qa/main.py',
    skill_type: 'general',
    inputs: [
      { name: 'question', type: 'string', description: '用户提问', required: true },
      { name: 'category', type: 'string', description: '问题分类', required: false },
    ],
    outputs: [
      { name: 'answer', type: 'string', description: '回答内容', required: false },
      { name: 'confidence', type: 'number', description: '置信度', required: false },
      { name: 'sources', type: 'array', description: '参考来源', required: false },
    ],
    permissions: {
      network_access: false,
      file_system_read: true,
      file_system_write: false,
      timeout_seconds: 15,
    },
    install_date: '2026-03-02T10:00:00Z',
    last_executed: '2026-04-08T08:45:00Z',
    execution_count: 892,
  },
  'log-analyzer': {
    name: 'log-analyzer',
    display_name: '日志分析',
    version: '2.0.1',
    description: '多源日志聚合分析，支持 SLS、Kafka、文件日志的模式识别和异常检测',
    status: 'installed',
    author: 'ResolveNet Team',
    icon: '📊',
    entry_point: 'skills/log_analyzer/main.py',
    skill_type: 'general',
    inputs: [
      { name: 'log_source', type: 'string', description: '日志来源 (SLS project/logstore 或文件路径)', required: true },
      { name: 'time_range', type: 'string', description: '时间范围 (如 "1h", "6h", "1d")', required: true },
      { name: 'pattern', type: 'string', description: '匹配模式或关键字', required: false },
    ],
    outputs: [
      { name: 'anomalies', type: 'array', description: '检测到的异常列表', required: false },
      { name: 'summary', type: 'string', description: '分析摘要', required: false },
      { name: 'severity', type: 'string', description: '严重程度 (info/warning/error/critical)', required: false },
    ],
    permissions: {
      network_access: true,
      file_system_read: true,
      file_system_write: false,
      timeout_seconds: 60,
    },
    install_date: '2026-03-05T14:00:00Z',
    last_executed: '2026-04-08T09:30:00Z',
    execution_count: 2156,
  },
  'metric-alerter': {
    name: 'metric-alerter',
    display_name: '指标告警',
    version: '1.0.3',
    description: '基于 Prometheus 指标的智能告警，支持动态阈值和趋势预测',
    status: 'installed',
    author: 'ResolveNet Team',
    icon: '📈',
    entry_point: 'skills/metric_alerter/main.py',
    skill_type: 'general',
    inputs: [
      { name: 'metric_query', type: 'string', description: 'PromQL 查询表达式', required: true },
      { name: 'threshold_config', type: 'object', description: '阈值配置 (静态/动态)', required: true },
      { name: 'window', type: 'string', description: '检测时间窗口', required: false },
    ],
    outputs: [
      { name: 'alert_status', type: 'string', description: '告警状态 (normal/warning/critical)', required: false },
      { name: 'prediction', type: 'object', description: '趋势预测结果', required: false },
      { name: 'recommendations', type: 'array', description: '优化建议', required: false },
    ],
    permissions: {
      network_access: true,
      file_system_read: false,
      file_system_write: false,
      timeout_seconds: 45,
    },
    install_date: '2026-03-08T09:00:00Z',
    last_executed: '2026-04-08T09:00:00Z',
    execution_count: 3421,
  },
  'change-reviewer': {
    name: 'change-reviewer',
    display_name: '变更审核',
    version: '0.9.0',
    description: '变更单自动审核，检查回滚方案完整性和变更窗口合规性',
    status: 'installed',
    author: 'ResolveNet Team',
    icon: '🔍',
    entry_point: 'skills/change_reviewer/main.py',
    skill_type: 'general',
    inputs: [
      { name: 'change_request', type: 'object', description: '变更申请单内容', required: true },
      { name: 'rollback_plan', type: 'string', description: '回滚方案描述', required: true },
      { name: 'change_window', type: 'string', description: '变更窗口时间', required: false },
    ],
    outputs: [
      { name: 'risk_level', type: 'string', description: '风险等级 (low/medium/high/critical)', required: false },
      { name: 'compliance_check', type: 'object', description: '合规检查结果', required: false },
      { name: 'approval_suggestion', type: 'string', description: '审批建议', required: false },
    ],
    permissions: {
      network_access: false,
      file_system_read: true,
      file_system_write: false,
      timeout_seconds: 30,
    },
    install_date: '2026-03-10T11:00:00Z',
    last_executed: '2026-04-07T18:30:00Z',
    execution_count: 156,
  },
  'hello-world': {
    name: 'hello-world',
    display_name: '测试技能',
    version: '0.1.0',
    description: '技能框架验证用的基础测试技能',
    status: 'installed',
    author: 'ResolveNet Team',
    icon: '👋',
    entry_point: 'skills/hello_world/main.py',
    skill_type: 'general',
    inputs: [
      { name: 'message', type: 'string', description: '输入消息', required: true },
    ],
    outputs: [
      { name: 'reply', type: 'string', description: '回复消息', required: false },
    ],
    permissions: {
      network_access: false,
      file_system_read: false,
      file_system_write: false,
      timeout_seconds: 10,
    },
    install_date: '2026-02-20T16:00:00Z',
    last_executed: '2026-04-05T15:00:00Z',
    execution_count: 42,
  },
  'k8s-pod-crash': {
    name: 'k8s-pod-crash',
    display_name: 'K8s Pod 崩溃排查',
    version: '1.0.0',
    description: 'Kubernetes Pod CrashLoopBackOff 场景化排查，自动采集事件/日志/资源状态并输出结构化排查方案',
    status: 'installed',
    author: 'ResolveNet Team',
    icon: '🔥',
    entry_point: 'skills/k8s_pod_crash/skill.py',
    skill_type: 'scenario',
    scenario_config: {
      domain: 'kubernetes',
      tags: ['k8s', 'pod', 'crash', 'oom', 'crashloopbackoff'],
      troubleshooting_flow: [
        { id: 'collect-pod-events', name: '采集 Pod 事件', description: '获取 Pod 相关的 Kubernetes Events', step_type: 'collect', command: 'kubectl get events --field-selector involvedObject.name={pod_name} -n {namespace}', skill_ref: null, expected_output: 'events_json', condition: null, timeout_seconds: 15, order: 1 },
        { id: 'collect-container-status', name: '采集容器状态', description: '获取 Pod 中各容器的运行状态和重启次数', step_type: 'collect', command: 'kubectl get pod {pod_name} -n {namespace} -o json', skill_ref: null, expected_output: 'container_statuses', condition: null, timeout_seconds: 10, order: 2 },
        { id: 'diagnose-exit-code', name: '诊断退出码', description: '分析容器退出码，判断 OOM / 应用错误 / 信号终止', step_type: 'diagnose', command: null, skill_ref: null, expected_output: 'exit_code_diagnosis', condition: null, timeout_seconds: 5, order: 3 },
        { id: 'collect-resource-usage', name: '采集资源用量', description: '获取 Pod 实际 CPU / Memory 使用情况', step_type: 'collect', command: 'kubectl top pod {pod_name} -n {namespace}', skill_ref: null, expected_output: 'resource_metrics', condition: null, timeout_seconds: 15, order: 4 },
        { id: 'collect-logs', name: '采集容器日志', description: '拉取最近重启周期的容器日志 (含 previous)', step_type: 'collect', command: 'kubectl logs {pod_name} -n {namespace} --previous --tail=200', skill_ref: null, expected_output: 'container_logs', condition: null, timeout_seconds: 20, order: 5 },
        { id: 'diagnose-oom', name: '诊断 OOM', description: '判断是否因 memory limits 不足导致 OOMKilled', step_type: 'diagnose', command: null, skill_ref: null, expected_output: 'oom_diagnosis', condition: 'exit_code == 137', timeout_seconds: 5, order: 6 },
        { id: 'verify-resource-limits', name: '校验资源配置', description: '比较实际用量与 requests/limits 配置是否合理', step_type: 'verify', command: null, skill_ref: null, expected_output: 'resource_verification', condition: null, timeout_seconds: 5, order: 7 },
        { id: 'action-recommend', name: '生成修复建议', description: '综合所有诊断信息，生成结构化修复方案', step_type: 'action', command: null, skill_ref: null, expected_output: 'structured_solution', condition: null, timeout_seconds: 10, order: 8 },
      ],
      output_template: { include_symptoms: true, include_evidence: true, include_steps: true, include_resolution: true, custom_sections: [] },
      severity_levels: ['low', 'medium', 'high', 'critical'],
    },
    inputs: [
      { name: 'namespace', type: 'string', description: 'Kubernetes 命名空间', required: true },
      { name: 'pod_name', type: 'string', description: '目标 Pod 名称', required: true },
      { name: 'container_name', type: 'string', description: '容器名称 (多容器 Pod 时指定)', required: false },
    ],
    outputs: [
      { name: 'structured_solution', type: 'object', description: '结构化排查方案 (四要素)', required: false },
      { name: 'severity', type: 'string', description: '问题严重程度', required: false },
      { name: 'root_cause', type: 'string', description: '根因分类', required: false },
    ],
    permissions: {
      network_access: true,
      file_system_read: true,
      file_system_write: false,
      timeout_seconds: 120,
    },
    install_date: '2026-04-01T10:00:00Z',
    last_executed: '2026-04-12T10:30:00Z',
    execution_count: 89,
  },
  'rds-replication-lag': {
    name: 'rds-replication-lag',
    display_name: 'RDS 复制延迟诊断',
    version: '0.8.0',
    description: 'RDS MySQL 主从复制延迟诊断，检测复制线程状态、慢查询阻塞及网络延迟',
    status: 'installed',
    author: 'ResolveNet Team',
    icon: '🗄️',
    entry_point: 'skills/rds_replication_lag/skill.py',
    skill_type: 'scenario',
    scenario_config: {
      domain: 'database',
      tags: ['rds', 'mysql', 'replication', 'lag', 'slave'],
      troubleshooting_flow: [
        { id: 'check-slave-status', name: '检查从库状态', description: '执行 SHOW SLAVE STATUS 获取复制线程状态', step_type: 'collect', command: 'SHOW SLAVE STATUS', skill_ref: null, expected_output: 'slave_status', condition: null, timeout_seconds: 10, order: 1 },
        { id: 'check-slow-queries', name: '检查慢查询', description: '查询是否存在长事务或大批量 DML 阻塞复制', step_type: 'collect', command: 'SELECT * FROM information_schema.processlist WHERE time > 10', skill_ref: null, expected_output: 'slow_queries', condition: null, timeout_seconds: 10, order: 2 },
        { id: 'diagnose-thread-state', name: '诊断线程状态', description: '分析 IO Thread 和 SQL Thread 是否正常运行', step_type: 'diagnose', command: null, skill_ref: null, expected_output: 'thread_diagnosis', condition: null, timeout_seconds: 5, order: 3 },
        { id: 'check-network-latency', name: '检查网络延迟', description: '测试主从实例间的网络延迟', step_type: 'collect', command: null, skill_ref: null, expected_output: 'network_latency', condition: null, timeout_seconds: 15, order: 4 },
        { id: 'action-recommend', name: '生成修复建议', description: '综合诊断结果，生成修复方案', step_type: 'action', command: null, skill_ref: null, expected_output: 'structured_solution', condition: null, timeout_seconds: 10, order: 5 },
      ],
      output_template: { include_symptoms: true, include_evidence: true, include_steps: true, include_resolution: true, custom_sections: [] },
      severity_levels: ['low', 'medium', 'high', 'critical'],
    },
    inputs: [
      { name: 'instance_id', type: 'string', description: 'RDS 实例 ID', required: true },
      { name: 'region', type: 'string', description: '地域', required: true },
    ],
    outputs: [
      { name: 'structured_solution', type: 'object', description: '结构化排查方案 (四要素)', required: false },
      { name: 'replication_delay', type: 'number', description: '当前复制延迟秒数', required: false },
    ],
    permissions: {
      network_access: true,
      file_system_read: false,
      file_system_write: false,
      timeout_seconds: 90,
    },
    install_date: '2026-04-05T14:00:00Z',
    last_executed: '2026-04-11T16:20:00Z',
    execution_count: 34,
  },
};

for (const skill of mockSkills) {
  if (!mockSkillDetails[skill.name]) {
    mockSkillDetails[skill.name] = buildSkillDetailFromList(skill);
  }
}

// ─── Workflows (enriched) ───
const mockWorkflows: Workflow[] = [
  { id: 'wf-001', name: 'K8s 节点 NotReady 故障树', status: 'active' },
  { id: 'wf-002', name: 'RDS 主从同步延迟诊断', status: 'active' },
  { id: 'wf-003', name: 'SLB 后端健康检查失败排查', status: 'draft' },
  { id: 'wf-004', name: 'ECS 实例 CPU 打满分析', status: 'active' },
  { id: 'wf-005', name: 'DNS 解析异常故障树', status: 'archived' },
  // Kudig topic-fta entries
  { id: 'wf-kudig-node', name: 'Node 节点异常故障树', status: 'active' },
  { id: 'wf-kudig-pod', name: 'Pod 异常故障树', status: 'active' },
  { id: 'wf-kudig-apiserver', name: 'API Server 异常故障树', status: 'active' },
  { id: 'wf-kudig-etcd', name: 'Etcd 异常故障树', status: 'active' },
  { id: 'wf-kudig-dns', name: 'DNS 解析异常故障树', status: 'active' },
  { id: 'wf-kudig-ingress', name: 'Ingress/Gateway 故障树', status: 'active' },
  { id: 'wf-kudig-deployment', name: 'Deployment 异常故障树', status: 'active' },
  { id: 'wf-kudig-statefulset', name: 'StatefulSet 异常故障树', status: 'active' },
  { id: 'wf-kudig-daemonset', name: 'DaemonSet 异常故障树', status: 'active' },
  { id: 'wf-kudig-job', name: 'Job/CronJob 异常故障树', status: 'active' },
  { id: 'wf-kudig-hpa', name: 'HPA 扩缩容异常故障树', status: 'active' },
  { id: 'wf-kudig-vpa', name: 'VPA 异常故障树', status: 'active' },
  { id: 'wf-kudig-csi', name: 'CSI 存储异常故障树', status: 'active' },
  { id: 'wf-kudig-rbac', name: 'RBAC 权限异常故障树', status: 'active' },
  { id: 'wf-kudig-certificate', name: 'Certificate 证书异常故障树', status: 'active' },
  { id: 'wf-kudig-scheduler', name: 'Scheduler 调度异常故障树', status: 'active' },
  { id: 'wf-kudig-controller', name: 'Controller Manager 异常故障树', status: 'active' },
  { id: 'wf-kudig-monitoring', name: 'Monitoring 监控异常故障树', status: 'active' },
  { id: 'wf-kudig-service', name: 'Service 连通性异常故障树', status: 'active' },
  { id: 'wf-kudig-nodepool', name: 'NodePool 节点池异常故障树', status: 'active' },
  { id: 'wf-kudig-pdb', name: 'PDB 驱散异常故障树', status: 'active' },
  { id: 'wf-kudig-autoscaler', name: 'Cluster Autoscaler 异常故障树', status: 'active' },
  { id: 'wf-kudig-cluster-upgrade', name: '集群升级异常故障树', status: 'active' },
  { id: 'wf-kudig-gateway', name: 'Gateway API 异常故障树', status: 'active' },
  { id: 'wf-kudig-service-mesh', name: 'Service Mesh Istio 异常故障树', status: 'active' },
  { id: 'wf-kudig-gitops', name: 'GitOps ArgoCD 异常故障树', status: 'active' },
  { id: 'wf-kudig-gpu', name: 'GPU 节点异常故障树', status: 'active' },
  { id: 'wf-kudig-helm', name: 'Helm Release 异常故障树', status: 'active' },
  { id: 'wf-kudig-crd', name: 'CRD/Operator 异常故障树', status: 'active' },
  { id: 'wf-kudig-networkpolicy', name: 'NetworkPolicy 异常故障树', status: 'active' },
  { id: 'wf-kudig-psp', name: 'PSP/SCC 策略异常故障树', status: 'active' },
  { id: 'wf-kudig-resourcequota', name: 'ResourceQuota 异常故障树', status: 'active' },
  { id: 'wf-kudig-webhook', name: 'Webhook Admission 异常故障树', status: 'active' },
  { id: 'wf-kudig-backup', name: 'Backup/Restore 异常故障树', status: 'active' },
  { id: 'wf-kudig-cloudprovider', name: 'Cloud Provider 异常故障树', status: 'active' },
  { id: 'wf-kudig-terway', name: 'Terway CNI 异常故障树', status: 'active' },
  { id: 'wf-kudig-monitoring-extra', name: 'Monitoring Extra 监控扩展异常故障树', status: 'active' },
];

const mockWorkflowDetails: WorkflowDetail[] = [
  {
    id: 'wf-001',
    name: 'K8s 节点 NotReady 故障树',
    status: 'active',
    description: '基于 K8s 节点状态、kubelet 日志、网络策略分析 NotReady 根因',
    created_at: '2026-03-01T08:00:00Z',
    updated_at: '2026-04-05T14:30:00Z',
    node_count: 8,
    last_executed: '2026-04-08T08:15:00Z',
    execution_count: 47,
  },
  {
    id: 'wf-002',
    name: 'RDS 主从同步延迟诊断',
    status: 'active',
    description: '分析 MySQL 主从同步延迟的根本原因，涵盖大事务、规格不足、网络延迟等场景',
    created_at: '2026-03-05T10:00:00Z',
    updated_at: '2026-04-03T09:00:00Z',
    node_count: 7,
    last_executed: '2026-04-07T16:20:00Z',
    execution_count: 31,
  },
  {
    id: 'wf-003',
    name: 'SLB 后端健康检查失败排查',
    status: 'draft',
    description: '排查 SLB 后端服务器健康检查失败，包括端口不通、超时、HTTP 状态码异常',
    created_at: '2026-03-15T14:00:00Z',
    updated_at: '2026-03-20T11:00:00Z',
    node_count: 6,
    last_executed: null,
    execution_count: 0,
  },
  {
    id: 'wf-004',
    name: 'ECS 实例 CPU 打满分析',
    status: 'active',
    description: '定位 ECS 实例 CPU 使用率持续 > 90% 的根本原因，分析进程、调度、资源配置',
    created_at: '2026-03-10T09:00:00Z',
    updated_at: '2026-04-06T16:00:00Z',
    node_count: 9,
    last_executed: '2026-04-08T07:45:00Z',
    execution_count: 63,
  },
  {
    id: 'wf-005',
    name: 'DNS 解析异常故障树',
    status: 'archived',
    description: '诊断 DNS 解析失败或超时问题，覆盖 CoreDNS、VPC DNS、外部解析链路',
    created_at: '2026-02-20T16:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
    node_count: 5,
    last_executed: '2026-02-28T22:10:00Z',
    execution_count: 12,
  },
  // Kudig topic-fta entries
  { id: 'wf-kudig-node', name: 'Node 节点异常故障树', status: 'active', description: '覆盖节点不可用/不稳定的关键成因：节点状态、kubelet、运行时、系统资源、内核与网络、存储、证书与时间、控制面依赖', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 9, last_executed: '2026-04-12T14:20:00Z', execution_count: 23 },
  { id: 'wf-kudig-pod', name: 'Pod 异常故障树', status: 'active', description: '覆盖 Pod 启动、运行、终止阶段的异常：CrashLoopBackOff、OOMKilled、Pending、ImagePullBackOff', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 11, last_executed: '2026-04-12T16:00:00Z', execution_count: 67 },
  { id: 'wf-kudig-apiserver', name: 'API Server 异常故障树', status: 'active', description: '覆盖 APIServer 不可用/性能劣化的关键成因：进程与配置、认证鉴权、请求排队与限流、依赖组件、证书与时间', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 8, last_executed: '2026-04-11T09:00:00Z', execution_count: 15 },
  { id: 'wf-kudig-etcd', name: 'Etcd 异常故障树', status: 'active', description: '覆盖 Etcd 集群异常的关键成因：进程与资源、WAL 与快照、磁盘 IO、网络分区、leadership 变更', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 10, last_executed: '2026-04-10T22:30:00Z', execution_count: 9 },
  { id: 'wf-kudig-dns', name: 'DNS 解析异常故障树', status: 'active', description: '覆盖 CoreDNS 异常、DNS 解析失败的根本成因：Pod 层面、节点层面、集群层面、网络策略', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 7, last_executed: '2026-04-12T10:15:00Z', execution_count: 31 },
  { id: 'wf-kudig-ingress', name: 'Ingress/Gateway 故障树', status: 'active', description: '覆盖 Ingress Controller 异常、域名解析问题、证书问题的故障路径', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 6, last_executed: '2026-04-11T15:45:00Z', execution_count: 18 },
  { id: 'wf-kudig-deployment', name: 'Deployment 异常故障树', status: 'active', description: '覆盖 Deployment Rollout 失败、ReplicaSet 不健康的根因：镜像拉取、资源配额、探针配置', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 8, last_executed: '2026-04-12T08:30:00Z', execution_count: 42 },
  { id: 'wf-kudig-statefulset', name: 'StatefulSet 异常故障树', status: 'active', description: '覆盖 StatefulSet 异常的根本成因：PVC 挂载、序号分配、headless Service', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 7, last_executed: '2026-04-10T16:20:00Z', execution_count: 11 },
  { id: 'wf-kudig-daemonset', name: 'DaemonSet 异常故障树', status: 'active', description: '覆盖 DaemonSet Pod 调度失败或异常的根本成因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 6, last_executed: '2026-04-11T11:00:00Z', execution_count: 8 },
  { id: 'wf-kudig-job', name: 'Job/CronJob 异常故障树', status: 'active', description: '覆盖 Job 失败、CronJob 未按计划执行的根本成因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 7, last_executed: '2026-04-12T09:00:00Z', execution_count: 14 },
  { id: 'wf-kudig-hpa', name: 'HPA 扩缩容异常故障树', status: 'active', description: '覆盖 HPA 无法扩缩容、缩容到 0 或扩容失败的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 8, last_executed: '2026-04-11T14:30:00Z', execution_count: 19 },
  { id: 'wf-kudig-vpa', name: 'VPA 异常故障树', status: 'active', description: '覆盖 VPA 推荐值异常、更新失败的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 6, last_executed: '2026-04-10T12:00:00Z', execution_count: 6 },
  { id: 'wf-kudig-csi', name: 'CSI 存储异常故障树', status: 'active', description: '覆盖 PersistentVolume 挂载失败、CSI driver 异常的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 9, last_executed: '2026-04-12T11:15:00Z', execution_count: 12 },
  { id: 'wf-kudig-rbac', name: 'RBAC 权限异常故障树', status: 'active', description: '覆盖 ServiceAccount 权限不足、RoleBinding/ClusterRoleBinding 配置错误的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 7, last_executed: '2026-04-11T16:00:00Z', execution_count: 27 },
  { id: 'wf-kudig-certificate', name: 'Certificate 证书异常故障树', status: 'active', description: '覆盖 kubelet/apiserver/etcd 证书过期或无效的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 6, last_executed: '2026-04-12T07:45:00Z', execution_count: 21 },
  { id: 'wf-kudig-scheduler', name: 'Scheduler 调度异常故障树', status: 'active', description: '覆盖 Pod 无法调度、调度延迟的根本成因：资源不足、亲和性冲突、污点', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 9, last_executed: '2026-04-11T13:20:00Z', execution_count: 33 },
  { id: 'wf-kudig-controller', name: 'Controller Manager 异常故障树', status: 'active', description: '覆盖 kube-controller-manager 异常的根本成因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 7, last_executed: '2026-04-10T20:00:00Z', execution_count: 7 },
  { id: 'wf-kudig-monitoring', name: 'Monitoring 监控异常故障树', status: 'active', description: '覆盖 Prometheus 采集失败、Alertmanager 通知异常的根本成因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 8, last_executed: '2026-04-12T06:30:00Z', execution_count: 16 },
  { id: 'wf-kudig-service', name: 'Service 连通性异常故障树', status: 'active', description: '覆盖 Service 无法访问、Endpoints 不健康的根本成因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 7, last_executed: '2026-04-11T10:00:00Z', execution_count: 24 },
  { id: 'wf-kudig-nodepool', name: 'NodePool 节点池异常故障树', status: 'active', description: '覆盖节点池扩缩容异常、节点加入失败的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 8, last_executed: '2026-04-12T13:00:00Z', execution_count: 10 },
  { id: 'wf-kudig-pdb', name: 'PDB 驱散异常故障树', status: 'active', description: '覆盖 PodDisruptionBudget 导致驱逐失败或无法完成的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 6, last_executed: '2026-04-11T08:15:00Z', execution_count: 5 },
  { id: 'wf-kudig-autoscaler', name: 'Cluster Autoscaler 异常故障树', status: 'active', description: '覆盖 Cluster Autoscaler 无法扩容或缩容节点的根本成因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 8, last_executed: '2026-04-12T15:30:00Z', execution_count: 9 },
  { id: 'wf-kudig-cluster-upgrade', name: '集群升级异常故障树', status: 'active', description: '覆盖集群升级失败、节点升级过程中异常的根本成因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 10, last_executed: '2026-04-11T22:00:00Z', execution_count: 4 },
  { id: 'wf-kudig-gateway', name: 'Gateway API 异常故障树', status: 'active', description: '覆盖 Gateway API 资源异常、HTTPRoute 绑定失败的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 7, last_executed: '2026-04-10T18:00:00Z', execution_count: 8 },
  { id: 'wf-kudig-service-mesh', name: 'Service Mesh Istio 异常故障树', status: 'active', description: '覆盖 Istio 网格内服务无法通信、Sidecar 注入异常的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 9, last_executed: '2026-04-12T10:45:00Z', execution_count: 13 },
  { id: 'wf-kudig-gitops', name: 'GitOps ArgoCD 异常故障树', status: 'active', description: '覆盖 ArgoCD 同步失败、应用状态异常的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 8, last_executed: '2026-04-11T20:30:00Z', execution_count: 11 },
  { id: 'wf-kudig-gpu', name: 'GPU 节点异常故障树', status: 'active', description: '覆盖 GPU 节点不可用、DevicePlugin 异常的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 8, last_executed: '2026-04-12T17:00:00Z', execution_count: 7 },
  { id: 'wf-kudig-helm', name: 'Helm Release 异常故障树', status: 'active', description: '覆盖 Helm Release 升级失败、回滚异常的根本成因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 7, last_executed: '2026-04-11T12:00:00Z', execution_count: 15 },
  { id: 'wf-kudig-crd', name: 'CRD/Operator 异常故障树', status: 'active', description: '覆盖 CustomResourceDefinition 异常、Operator 无法正常工作的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 9, last_executed: '2026-04-12T08:00:00Z', execution_count: 6 },
  { id: 'wf-kudig-networkpolicy', name: 'NetworkPolicy 异常故障树', status: 'active', description: '覆盖 NetworkPolicy 配置后流量不通的根本成因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 6, last_executed: '2026-04-11T17:30:00Z', execution_count: 20 },
  { id: 'wf-kudig-psp', name: 'PSP/SCC 策略异常故障树', status: 'active', description: '覆盖 PodSecurityPolicy 或 SecurityContextConstraints 导致 Pod 创建失败的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 6, last_executed: '2026-04-10T14:00:00Z', execution_count: 5 },
  { id: 'wf-kudig-resourcequota', name: 'ResourceQuota 异常故障树', status: 'active', description: '覆盖 ResourceQuota/LimitRange 导致资源创建失败的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 7, last_executed: '2026-04-11T09:45:00Z', execution_count: 18 },
  { id: 'wf-kudig-webhook', name: 'Webhook Admission 异常故障树', status: 'active', description: '覆盖 MutatingWebhook/ValidatingWebhook 导致资源创建/更新失败的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 7, last_executed: '2026-04-12T12:00:00Z', execution_count: 9 },
  { id: 'wf-kudig-backup', name: 'Backup/Restore 异常故障树', status: 'active', description: '覆盖 Velero 备份失败、恢复异常的根本成因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 8, last_executed: '2026-04-11T23:00:00Z', execution_count: 4 },
  { id: 'wf-kudig-cloudprovider', name: 'Cloud Provider 异常故障树', status: 'active', description: '覆盖阿里云/AWS/GCP 云厂商特定资源异常的根本成因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 10, last_executed: '2026-04-12T14:00:00Z', execution_count: 8 },
  { id: 'wf-kudig-terway', name: 'Terway CNI 异常故障树', status: 'active', description: '覆盖阿里云 Terway CNI 网络异常的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 7, last_executed: '2026-04-11T19:00:00Z', execution_count: 6 },
  { id: 'wf-kudig-monitoring-extra', name: 'Monitoring Extra 监控扩展异常故障树', status: 'active', description: '覆盖 Metrics Server、Prometheus Adapter 等监控扩展组件异常的根因', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z', node_count: 7, last_executed: '2026-04-10T21:00:00Z', execution_count: 5 },
];

// ─── Fault Trees ───
const mockFaultTrees: Record<string, FaultTree> = {
  'wf-001': {
    id: 'ft-k8s-node-notready',
    name: 'K8s 节点 NotReady 故障树',
    top_event_id: 'evt-top-001',
    events: [
      { id: 'evt-top-001', name: '节点 NotReady', description: 'K8s 节点进入 NotReady 状态', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-mid-001', name: '网络故障', description: '节点网络通信异常', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-mid-002', name: '资源耗尽', description: '节点计算资源不足', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-mid-003', name: 'kubelet 异常', description: 'kubelet 进程异常', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-basic-001', name: 'NetworkPolicy 误配置', description: 'calico 网络策略阻断 kubelet 心跳', type: 'basic', evaluator: 'check_network_policy', parameters: { namespace: 'kube-system' } },
      { id: 'evt-basic-002', name: '安全组规则变更', description: '安全组入方向规则阻断 10250 端口', type: 'basic', evaluator: 'check_security_group', parameters: { port: 10250 } },
      { id: 'evt-basic-003', name: '内存 OOM', description: '节点内存使用率 > 95% 触发 OOM Killer', type: 'basic', evaluator: 'check_memory', parameters: { threshold: 0.95 } },
      { id: 'evt-basic-004', name: '磁盘空间不足', description: '节点磁盘使用率 > 90%', type: 'basic', evaluator: 'check_disk', parameters: { threshold: 0.9 } },
      { id: 'evt-basic-005', name: 'kubelet 进程崩溃', description: 'kubelet 进程 OOM 或 panic', type: 'basic', evaluator: 'check_kubelet_status', parameters: {} },
      { id: 'evt-basic-006', name: '证书过期', description: 'kubelet 客户端证书过期', type: 'basic', evaluator: 'check_cert_expiry', parameters: { component: 'kubelet' } },
    ],
    gates: [
      { id: 'gate-001', name: 'NotReady 原因', type: 'OR', input_ids: ['evt-mid-001', 'evt-mid-002', 'evt-mid-003'], output_id: 'evt-top-001' },
      { id: 'gate-002', name: '网络故障原因', type: 'OR', input_ids: ['evt-basic-001', 'evt-basic-002'], output_id: 'evt-mid-001' },
      { id: 'gate-003', name: '资源耗尽原因', type: 'OR', input_ids: ['evt-basic-003', 'evt-basic-004'], output_id: 'evt-mid-002' },
      { id: 'gate-004', name: 'kubelet 异常原因', type: 'OR', input_ids: ['evt-basic-005', 'evt-basic-006'], output_id: 'evt-mid-003' },
    ],
  },
  'wf-002': {
    id: 'ft-rds-replication-lag',
    name: 'RDS 主从同步延迟诊断',
    top_event_id: 'evt-rds-top',
    events: [
      { id: 'evt-rds-top', name: '主从同步延迟', description: 'Seconds_Behind_Master > 阈值', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-rds-mid-001', name: 'SQL 线程延迟', description: 'SQL 回放线程落后', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-rds-mid-002', name: 'IO 线程延迟', description: 'binlog 接收线程落后', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-rds-basic-001', name: '大事务阻塞', description: '单条 SQL 影响行数 > 10 万', type: 'basic', evaluator: 'check_large_transactions', parameters: { row_threshold: 100000 } },
      { id: 'evt-rds-basic-002', name: '从库规格不足', description: '从库 CPU/IO 性能弱于主库', type: 'basic', evaluator: 'check_replica_spec', parameters: {} },
      { id: 'evt-rds-basic-003', name: '并行复制未开启', description: 'slave_parallel_workers = 0', type: 'basic', evaluator: 'check_parallel_replication', parameters: {} },
      { id: 'evt-rds-basic-004', name: '网络带宽瓶颈', description: '跨可用区带宽不足', type: 'basic', evaluator: 'check_network_bandwidth', parameters: {} },
      { id: 'evt-rds-basic-005', name: 'binlog 过大', description: '单个 binlog 文件超过 1GB', type: 'basic', evaluator: 'check_binlog_size', parameters: { max_size_mb: 1024 } },
    ],
    gates: [
      { id: 'gate-rds-001', name: '延迟原因', type: 'OR', input_ids: ['evt-rds-mid-001', 'evt-rds-mid-002'], output_id: 'evt-rds-top' },
      { id: 'gate-rds-002', name: 'SQL 线程延迟原因', type: 'OR', input_ids: ['evt-rds-basic-001', 'evt-rds-basic-002', 'evt-rds-basic-003'], output_id: 'evt-rds-mid-001' },
      { id: 'gate-rds-003', name: 'IO 线程延迟原因', type: 'OR', input_ids: ['evt-rds-basic-004', 'evt-rds-basic-005'], output_id: 'evt-rds-mid-002' },
    ],
  },
  // Kudig topic-fta fault trees
  'wf-kudig-node': {
    id: 'ft-kudig-node', name: 'Node 节点异常故障树', top_event_id: 'evt-node-top',
    events: [
      { id: 'evt-node-top', name: '节点 NotReady/Unavailable', description: 'K8s 节点进入 NotReady 或不可用状态', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-node-mid-001', name: ' kubelet 异常', description: 'kubelet 进程状态异常', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-node-mid-002', name: '系统资源耗尽', description: 'CPU/内存/磁盘资源耗尽', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-node-mid-003', name: '网络异常', description: '节点网络通信故障', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-node-mid-004', name: '运行时异常', description: '容器运行时 Docker/containerd 异常', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-node-basic-001', name: 'kubelet 进程崩溃', description: 'kubelet OOM 或 panic', type: 'basic', evaluator: 'check_kubelet_status', parameters: {} },
      { id: 'evt-node-basic-002', name: '证书过期', description: 'kubelet 客户端证书过期', type: 'basic', evaluator: 'check_cert_expiry', parameters: { component: 'kubelet' } },
      { id: 'evt-node-basic-003', name: '内存 OOM', description: '节点内存使用率 > 95%', type: 'basic', evaluator: 'check_memory', parameters: { threshold: 0.95 } },
      { id: 'evt-node-basic-004', name: '磁盘空间不足', description: '节点磁盘使用率 > 90%', type: 'basic', evaluator: 'check_disk', parameters: { threshold: 0.9 } },
      { id: 'evt-node-basic-005', name: 'NetworkPolicy 阻断', description: '网络策略阻断 kubelet 心跳', type: 'basic', evaluator: 'check_network_policy', parameters: { namespace: 'kube-system' } },
      { id: 'evt-node-basic-006', name: '安全组阻断', description: '安全组规则阻断 10250 端口', type: 'basic', evaluator: 'check_security_group', parameters: { port: 10250 } },
      { id: 'evt-node-basic-007', name: 'Docker hang', description: 'containerd/Docker 服务无响应', type: 'basic', evaluator: 'check_container_runtime', parameters: {} },
    ],
    gates: [
      { id: 'gate-node-001', name: '节点异常原因', type: 'OR', input_ids: ['evt-node-mid-001', 'evt-node-mid-002', 'evt-node-mid-003', 'evt-node-mid-004'], output_id: 'evt-node-top' },
      { id: 'gate-node-002', name: 'kubelet 异常原因', type: 'OR', input_ids: ['evt-node-basic-001', 'evt-node-basic-002'], output_id: 'evt-node-mid-001' },
      { id: 'gate-node-003', name: '资源耗尽原因', type: 'OR', input_ids: ['evt-node-basic-003', 'evt-node-basic-004'], output_id: 'evt-node-mid-002' },
      { id: 'gate-node-004', name: '网络异常原因', type: 'OR', input_ids: ['evt-node-basic-005', 'evt-node-basic-006'], output_id: 'evt-node-mid-003' },
      { id: 'gate-node-005', name: '运行时异常原因', type: 'OR', input_ids: ['evt-node-basic-007'], output_id: 'evt-node-mid-004' },
    ],
  },
  'wf-kudig-pod': {
    id: 'ft-kudig-pod', name: 'Pod 异常故障树', top_event_id: 'evt-pod-top',
    events: [
      { id: 'evt-pod-top', name: 'Pod 异常', description: 'Pod 处于异常状态', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-pod-mid-001', name: '启动阶段异常', description: 'Pod 启动阶段失败', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-pod-mid-002', name: '运行阶段异常', description: 'Pod 运行中异常退出', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-pod-mid-003', name: '调度阶段异常', description: 'Pod 无法被调度', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-pod-basic-001', name: 'CrashLoopBackOff', description: '容器重复崩溃重启', type: 'basic', evaluator: 'check_crashloop', parameters: {} },
      { id: 'evt-pod-basic-002', name: 'OOMKilled', description: '容器内存超限被 kill', type: 'basic', evaluator: 'check_oom', parameters: {} },
      { id: 'evt-pod-basic-003', name: 'ImagePullBackOff', description: '镜像拉取失败', type: 'basic', evaluator: 'check_image_pull', parameters: {} },
      { id: 'evt-pod-basic-004', name: 'Pending 调度失败', description: '资源不足或亲和性冲突', type: 'basic', evaluator: 'check_pod_pending', parameters: {} },
      { id: 'evt-pod-basic-005', name: 'PVC 挂载失败', description: '持久化卷挂载异常', type: 'basic', evaluator: 'check_pvc_mount', parameters: {} },
      { id: 'evt-pod-basic-006', name: '探针检测失败', description: 'liveness/readiness 探针失败', type: 'basic', evaluator: 'check_probe', parameters: {} },
    ],
    gates: [
      { id: 'gate-pod-001', name: 'Pod 异常原因', type: 'OR', input_ids: ['evt-pod-mid-001', 'evt-pod-mid-002', 'evt-pod-mid-003'], output_id: 'evt-pod-top' },
      { id: 'gate-pod-002', name: '启动阶段异常', type: 'OR', input_ids: ['evt-pod-basic-003', 'evt-pod-basic-005', 'evt-pod-basic-006'], output_id: 'evt-pod-mid-001' },
      { id: 'gate-pod-003', name: '运行阶段异常', type: 'OR', input_ids: ['evt-pod-basic-001', 'evt-pod-basic-002', 'evt-pod-basic-006'], output_id: 'evt-pod-mid-002' },
      { id: 'gate-pod-004', name: '调度阶段异常', type: 'OR', input_ids: ['evt-pod-basic-004', 'evt-pod-basic-005'], output_id: 'evt-pod-mid-003' },
    ],
  },
  'wf-kudig-apiserver': {
    id: 'ft-kudig-apiserver', name: 'API Server 异常故障树', top_event_id: 'evt-apiserver-top',
    events: [
      { id: 'evt-apiserver-top', name: 'API Server 不可用', description: 'APIServer 无法访问或响应慢', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-apiserver-mid-001', name: '进程与配置异常', description: 'kube-apiserver 进程异常', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-apiserver-mid-002', name: '认证鉴权异常', description: '认证或鉴权失败', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-apiserver-mid-003', name: '请求排队与限流', description: '请求堆积或被限流', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-apiserver-mid-004', name: '依赖组件异常', description: 'etcd 连接异常', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-apiserver-basic-001', name: 'apiserver 进程崩溃', description: 'kube-apiserver OOM 或 panic', type: 'basic', evaluator: 'check_apiserver_process', parameters: {} },
      { id: 'evt-apiserver-basic-002', name: 'etcd 连接失败', description: '无法连接后端 etcd', type: 'basic', evaluator: 'check_etcd_connect', parameters: {} },
      { id: 'evt-apiserver-basic-003', name: '证书过期', description: 'apiserver 证书过期', type: 'basic', evaluator: 'check_cert_expiry', parameters: { component: 'apiserver' } },
      { id: 'evt-apiserver-basic-004', name: '请求限流触发', description: 'API 限流导致拒绝请求', type: 'basic', evaluator: 'check_rate_limit', parameters: {} },
      { id: 'evt-apiserver-basic-005', name: '认证 Token 无效', description: 'ServiceAccount Token 过期', type: 'basic', evaluator: 'check_sa_token', parameters: {} },
    ],
    gates: [
      { id: 'gate-apiserver-001', name: 'APIServer 异常', type: 'OR', input_ids: ['evt-apiserver-mid-001', 'evt-apiserver-mid-002', 'evt-apiserver-mid-003', 'evt-apiserver-mid-004'], output_id: 'evt-apiserver-top' },
      { id: 'gate-apiserver-002', name: '进程异常', type: 'OR', input_ids: ['evt-apiserver-basic-001', 'evt-apiserver-basic-003'], output_id: 'evt-apiserver-mid-001' },
      { id: 'gate-apiserver-003', name: '依赖异常', type: 'OR', input_ids: ['evt-apiserver-basic-002'], output_id: 'evt-apiserver-mid-004' },
    ],
  },
  'wf-kudig-etcd': {
    id: 'ft-kudig-etcd', name: 'Etcd 异常故障树', top_event_id: 'evt-etcd-top',
    events: [
      { id: 'evt-etcd-top', name: 'Etcd 集群异常', description: 'Etcd 不可用或性能劣化', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-etcd-mid-001', name: '进程与资源异常', description: 'etcd 进程或资源问题', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-etcd-mid-002', name: '磁盘 IO 异常', description: '磁盘性能问题', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-etcd-mid-003', name: '网络分区', description: '网络分区导致脑裂', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-etcd-basic-001', name: 'etcd 进程崩溃', description: 'etcd OOM 或 panic', type: 'basic', evaluator: 'check_etcd_process', parameters: {} },
      { id: 'evt-etcd-basic-002', name: '磁盘空间不足', description: 'etcd 数据盘空间耗尽', type: 'basic', evaluator: 'check_disk', parameters: { threshold: 0.9 } },
      { id: 'evt-etcd-basic-003', name: 'WAL 写入缓慢', description: 'Write-Ahead Log 写入延迟', type: 'basic', evaluator: 'check_wal_latency', parameters: {} },
      { id: 'evt-etcd-basic-004', name: 'leader 选举失败', description: 'leader 节点故障后无法重新选举', type: 'basic', evaluator: 'check_etcd_leader', parameters: {} },
    ],
    gates: [
      { id: 'gate-etcd-001', name: 'Etcd 异常', type: 'OR', input_ids: ['evt-etcd-mid-001', 'evt-etcd-mid-002', 'evt-etcd-mid-003'], output_id: 'evt-etcd-top' },
      { id: 'gate-etcd-002', name: '进程资源', type: 'OR', input_ids: ['evt-etcd-basic-001', 'evt-etcd-basic-002'], output_id: 'evt-etcd-mid-001' },
    ],
  },
  'wf-kudig-dns': {
    id: 'ft-kudig-dns', name: 'DNS 解析异常故障树', top_event_id: 'evt-dns-top',
    events: [
      { id: 'evt-dns-top', name: 'DNS 解析失败', description: '集群内 DNS 解析异常', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-dns-mid-001', name: 'CoreDNS Pod 异常', description: 'CoreDNS Pod 状态异常', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-dns-mid-002', name: '节点层面 DNS 异常', description: '节点 DNS 配置错误', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-dns-mid-003', name: '网络策略阻断', description: 'NetworkPolicy 阻断 DNS 流量', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-dns-basic-001', name: 'CoreDNS Pod 不健康', description: 'CoreDNS Pod 非 Running', type: 'basic', evaluator: 'check_coredns_pods', parameters: {} },
      { id: 'evt-dns-basic-002', name: 'CoreDNS 配置错误', description: 'Corefile 配置异常', type: 'basic', evaluator: 'check_coredns_config', parameters: {} },
      { id: 'evt-dns-basic-003', name: 'resolv.conf 错误', description: '节点 /etc/resolv.conf 配置错误', type: 'basic', evaluator: 'check_resolv_conf', parameters: {} },
      { id: 'evt-dns-basic-004', name: 'DNS NPC 阻断', description: 'NetworkPolicy 阻断 DNS', type: 'basic', evaluator: 'check_network_policy', parameters: { port: 53 } },
    ],
    gates: [
      { id: 'gate-dns-001', name: 'DNS 异常', type: 'OR', input_ids: ['evt-dns-mid-001', 'evt-dns-mid-002', 'evt-dns-mid-003'], output_id: 'evt-dns-top' },
      { id: 'gate-dns-002', name: 'CoreDNS 异常', type: 'OR', input_ids: ['evt-dns-basic-001', 'evt-dns-basic-002'], output_id: 'evt-dns-mid-001' },
    ],
  },
  'wf-kudig-ingress': {
    id: 'ft-kudig-ingress', name: 'Ingress/Gateway 故障树', top_event_id: 'evt-ingress-top',
    events: [
      { id: 'evt-ingress-top', name: 'Ingress 访问异常', description: '通过 Ingress 访问服务失败', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-ingress-mid-001', name: 'Ingress Controller 异常', description: 'Ingress Controller 不健康', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-ingress-mid-002', name: '域名解析异常', description: 'DNS 解析失败', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-ingress-mid-003', name: '证书异常', description: 'TLS 证书问题', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-ingress-basic-001', name: 'Ingress Controller Pod 不健康', description: 'nginx-ingress/ambassador 等异常', type: 'basic', evaluator: 'check_ingress_controller', parameters: {} },
      { id: 'evt-ingress-basic-002', name: 'Ingress 资源注解错误', description: 'Ingress annotation 配置错误', type: 'basic', evaluator: 'check_ingress_config', parameters: {} },
      { id: 'evt-ingress-basic-003', name: '证书过期', description: 'TLS 证书过期或无效', type: 'basic', evaluator: 'check_cert_expiry', parameters: { component: 'ingress' } },
      { id: 'evt-ingress-basic-004', name: '域名未解析', description: 'DNS A 记录不存在', type: 'basic', evaluator: 'check_dns_record', parameters: {} },
    ],
    gates: [
      { id: 'gate-ingress-001', name: 'Ingress 异常', type: 'OR', input_ids: ['evt-ingress-mid-001', 'evt-ingress-mid-002', 'evt-ingress-mid-003'], output_id: 'evt-ingress-top' },
    ],
  },
  'wf-kudig-deployment': {
    id: 'ft-kudig-deployment', name: 'Deployment 异常故障树', top_event_id: 'evt-deploy-top',
    events: [
      { id: 'evt-deploy-top', name: 'Deployment Rollout 失败', description: 'Deployment 更新或创建失败', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-deploy-mid-001', name: 'ReplicaSet 不健康', description: 'RS 无法创建预期数量的 Pod', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-deploy-mid-002', name: '镜像拉取失败', description: '镜像无法拉取', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-deploy-mid-003', name: '资源配额不足', description: '资源不足导致调度失败', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-deploy-basic-001', name: 'ImagePullBackOff', description: '镜像拉取失败', type: 'basic', evaluator: 'check_image_pull', parameters: {} },
      { id: 'evt-deploy-basic-002', name: '资源不足', description: 'CPU/内存不足无法调度', type: 'basic', evaluator: 'check_resource_quota', parameters: {} },
      { id: 'evt-deploy-basic-003', name: '探针失败', description: 'liveness/readiness 探针连续失败', type: 'basic', evaluator: 'check_probe', parameters: {} },
      { id: 'evt-deploy-basic-004', name: '版本冲突', description: 'Revision 冲突', type: 'basic', evaluator: 'check_revision', parameters: {} },
    ],
    gates: [
      { id: 'gate-deploy-001', name: 'Rollout 失败', type: 'OR', input_ids: ['evt-deploy-mid-001', 'evt-deploy-mid-002', 'evt-deploy-mid-003'], output_id: 'evt-deploy-top' },
      { id: 'gate-deploy-002', name: 'RS 不健康', type: 'OR', input_ids: ['evt-deploy-basic-001', 'evt-deploy-basic-002', 'evt-deploy-basic-003', 'evt-deploy-basic-004'], output_id: 'evt-deploy-mid-001' },
    ],
  },
  'wf-kudig-statefulset': {
    id: 'ft-kudig-statefulset', name: 'StatefulSet 异常故障树', top_event_id: 'evt-sts-top',
    events: [
      { id: 'evt-sts-top', name: 'StatefulSet Pod 不健康', description: 'StatefulSet Pod 处于异常状态', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-sts-mid-001', name: 'PVC 挂载异常', description: '持久卷挂载失败', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-sts-mid-002', name: '序号分配异常', description: 'Pod 序号命名或启动顺序异常', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-sts-basic-001', name: 'PVC Pending', description: 'PVC 一直处于 Pending 状态', type: 'basic', evaluator: 'check_pvc_pending', parameters: {} },
      { id: 'evt-sts-basic-002', name: '存储类不存在', description: 'StorageClass 未找到', type: 'basic', evaluator: 'check_storage_class', parameters: {} },
      { id: 'evt-sts-basic-003', name: 'headless Service 错误', description: 'headless Service 配置错误', type: 'basic', evaluator: 'check_headless_svc', parameters: {} },
    ],
    gates: [
      { id: 'gate-sts-001', name: 'STS 异常', type: 'OR', input_ids: ['evt-sts-mid-001', 'evt-sts-mid-002'], output_id: 'evt-sts-top' },
      { id: 'gate-sts-002', name: 'PVC 异常', type: 'OR', input_ids: ['evt-sts-basic-001', 'evt-sts-basic-002'], output_id: 'evt-sts-mid-001' },
    ],
  },
  'wf-kudig-daemonset': {
    id: 'ft-kudig-daemonset', name: 'DaemonSet 异常故障树', top_event_id: 'evt-ds-top',
    events: [
      { id: 'evt-ds-top', name: 'DaemonSet Pod 不健康', description: 'DaemonSet Pod 调度失败或异常', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-ds-mid-001', name: '调度失败', description: 'DaemonSet Pod 无法调度到节点', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-ds-mid-002', name: '节点层面异常', description: '节点资源或配置问题', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-ds-basic-001', name: '污点不容忍', description: 'Pod 无法容忍节点污点', type: 'basic', evaluator: 'check_taint_tolerance', parameters: {} },
      { id: 'evt-ds-basic-002', name: '节点资源不足', description: '节点 CPU/内存不足', type: 'basic', evaluator: 'check_node_resources', parameters: {} },
      { id: 'evt-ds-basic-003', name: '镜像拉取失败', description: 'DaemonSet 镜像拉取失败', type: 'basic', evaluator: 'check_image_pull', parameters: {} },
    ],
    gates: [
      { id: 'gate-ds-001', name: 'DS 异常', type: 'OR', input_ids: ['evt-ds-mid-001', 'evt-ds-mid-002'], output_id: 'evt-ds-top' },
      { id: 'gate-ds-002', name: '调度失败', type: 'OR', input_ids: ['evt-ds-basic-001', 'evt-ds-basic-002', 'evt-ds-basic-003'], output_id: 'evt-ds-mid-001' },
    ],
  },
  'wf-kudig-job': {
    id: 'ft-kudig-job', name: 'Job/CronJob 异常故障树', top_event_id: 'evt-job-top',
    events: [
      { id: 'evt-job-top', name: 'Job/CronJob 异常', description: 'Job 执行失败或 CronJob 未按计划执行', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-job-mid-001', name: 'Job 执行失败', description: 'Job 中容器退出非 0', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-job-mid-002', name: 'CronJob 未触发', description: '定时任务未按计划执行', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-job-basic-001', name: '容器退出码非 0', description: 'Job 容器异常退出', type: 'basic', evaluator: 'check_job_exit_code', parameters: {} },
      { id: 'evt-job-basic-002', name: '超过 deadline', description: 'Job 超过 activeDeadlineSeconds', type: 'basic', evaluator: 'check_job_deadline', parameters: {} },
      { id: 'evt-job-basic-003', name: 'CronJob Suspended', description: 'CronJob 被暂停', type: 'basic', evaluator: 'check_cronjob_suspended', parameters: {} },
      { id: 'evt-job-basic-004', name: '时钟偏差', description: '控制节点时钟不同步导致调度偏差', type: 'basic', evaluator: 'check_ntp_sync', parameters: {} },
    ],
    gates: [
      { id: 'gate-job-001', name: 'Job/CronJob 异常', type: 'OR', input_ids: ['evt-job-mid-001', 'evt-job-mid-002'], output_id: 'evt-job-top' },
      { id: 'gate-job-002', name: 'Job 失败', type: 'OR', input_ids: ['evt-job-basic-001', 'evt-job-basic-002'], output_id: 'evt-job-mid-001' },
    ],
  },
  'wf-kudig-hpa': {
    id: 'ft-kudig-hpa', name: 'HPA 扩缩容异常故障树', top_event_id: 'evt-hpa-top',
    events: [
      { id: 'evt-hpa-top', name: 'HPA 扩缩容异常', description: 'HPA 无法扩缩容或行为异常', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-hpa-mid-001', name: '扩容失败', description: 'HPA 尝试扩容但失败', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-hpa-mid-002', name: '缩容到 0', description: 'HPA 将副本数缩容至 0', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-hpa-mid-003', name: '指标采集异常', description: 'Prometheus 指标获取失败', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-hpa-basic-001', name: '资源不足', description: '集群资源不足无法扩容', type: 'basic', evaluator: 'check_cluster_resources', parameters: {} },
      { id: 'evt-hpa-basic-002', name: 'HPA 条件阻止', description: 'HPA 的 scale 条件阻止扩容', type: 'basic', evaluator: 'check_hpa_conditions', parameters: {} },
      { id: 'evt-hpa-basic-003', name: '指标服务器异常', description: 'metrics-server 未运行', type: 'basic', evaluator: 'check_metrics_server', parameters: {} },
      { id: 'evt-hpa-basic-004', name: '行为策略限制', description: 'HPA behavior 配置阻止缩容', type: 'basic', evaluator: 'check_hpa_behavior', parameters: {} },
    ],
    gates: [
      { id: 'gate-hpa-001', name: 'HPA 异常', type: 'OR', input_ids: ['evt-hpa-mid-001', 'evt-hpa-mid-002', 'evt-hpa-mid-003'], output_id: 'evt-hpa-top' },
    ],
  },
  'wf-kudig-csi': {
    id: 'ft-kudig-csi', name: 'CSI 存储异常故障树', top_event_id: 'evt-csi-top',
    events: [
      { id: 'evt-csi-top', name: 'CSI 存储异常', description: 'PersistentVolume 挂载失败或 CSI 操作异常', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-csi-mid-001', name: '驱动异常', description: 'CSI Driver 组件异常', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-csi-mid-002', name: '存储资源异常', description: '后端存储资源问题', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-csi-basic-001', name: 'CSI Driver Pod 不健康', description: 'CSI Driver 插件异常退出', type: 'basic', evaluator: 'check_csi_driver', parameters: {} },
      { id: 'evt-csi-basic-002', name: 'NodePlugin 异常', description: 'Node Plugin 注册失败', type: 'basic', evaluator: 'check_node_plugin', parameters: {} },
      { id: 'evt-csi-basic-003', name: '存储类参数错误', description: 'StorageClass 参数配置错误', type: 'basic', evaluator: 'check_storage_class', parameters: {} },
      { id: 'evt-csi-basic-004', name: '云盘配额不足', description: '云盘 quota 达到上限', type: 'basic', evaluator: 'check_cloud_quota', parameters: {} },
    ],
    gates: [
      { id: 'gate-csi-001', name: 'CSI 异常', type: 'OR', input_ids: ['evt-csi-mid-001', 'evt-csi-mid-002'], output_id: 'evt-csi-top' },
    ],
  },
  'wf-kudig-rbac': {
    id: 'ft-kudig-rbac', name: 'RBAC 权限异常故障树', top_event_id: 'evt-rbac-top',
    events: [
      { id: 'evt-rbac-top', name: 'RBAC 权限异常', description: 'ServiceAccount 权限不足或越权', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-rbac-mid-001', name: '权限不足', description: '无法创建/删除/修改资源', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-rbac-mid-002', name: '绑定配置错误', description: 'RoleBinding/ClusterRoleBinding 配置错误', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-rbac-basic-001', name: 'Role/ClusterRole 缺失规则', description: '必要的权限规则未配置', type: 'basic', evaluator: 'check_rbac_role', parameters: {} },
      { id: 'evt-rbac-basic-002', name: 'Subject 配置错误', description: 'RoleBinding subject 指向错误的 SA', type: 'basic', evaluator: 'check_rbac_subject', parameters: {} },
      { id: 'evt-rbac-basic-003', name: 'SA Token 未挂载', description: 'ServiceAccount Token 未挂载到 Pod', type: 'basic', evaluator: 'check_sa_token_mount', parameters: {} },
    ],
    gates: [
      { id: 'gate-rbac-001', name: 'RBAC 异常', type: 'OR', input_ids: ['evt-rbac-mid-001', 'evt-rbac-mid-002'], output_id: 'evt-rbac-top' },
    ],
  },
  'wf-kudig-certificate': {
    id: 'ft-kudig-certificate', name: 'Certificate 证书异常故障树', top_event_id: 'evt-cert-top',
    events: [
      { id: 'evt-cert-top', name: '证书异常', description: 'kubelet/apiserver/etcd 证书过期或无效', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-cert-mid-001', name: '证书过期', description: '证书已过有效期', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-cert-mid-002', name: '证书链验证失败', description: '证书链不完整或被篡改', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-cert-basic-001', name: 'kubelet 证书过期', description: 'kubelet 客户端证书过期', type: 'basic', evaluator: 'check_cert_expiry', parameters: { component: 'kubelet' } },
      { id: 'evt-cert-basic-002', name: 'apiserver 证书过期', description: 'apiserver server 证书过期', type: 'basic', evaluator: 'check_cert_expiry', parameters: { component: 'apiserver' } },
      { id: 'evt-cert-basic-003', name: 'etcd 证书过期', description: 'etcd peer/client 证书过期', type: 'basic', evaluator: 'check_cert_expiry', parameters: { component: 'etcd' } },
      { id: 'evt-cert-basic-004', name: 'CSR 未批准', description: 'CertificateSigningRequest 未被批准', type: 'basic', evaluator: 'check_csr_approved', parameters: {} },
    ],
    gates: [
      { id: 'gate-cert-001', name: '证书异常', type: 'OR', input_ids: ['evt-cert-mid-001', 'evt-cert-mid-002'], output_id: 'evt-cert-top' },
      { id: 'gate-cert-002', name: '过期', type: 'OR', input_ids: ['evt-cert-basic-001', 'evt-cert-basic-002', 'evt-cert-basic-003', 'evt-cert-basic-004'], output_id: 'evt-cert-mid-001' },
    ],
  },
  'wf-kudig-scheduler': {
    id: 'ft-kudig-scheduler', name: 'Scheduler 调度异常故障树', top_event_id: 'evt-sched-top',
    events: [
      { id: 'evt-sched-top', name: 'Pod 调度失败', description: 'Pod 无法被调度到合适的节点', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-sched-mid-001', name: '资源不足', description: '节点资源不满足 Pod 需求', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-sched-mid-002', name: '亲和性冲突', description: '节点/Pod 亲和性条件不满足', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-sched-mid-003', name: '污点不容忍', description: 'Pod 无法容忍节点污点', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-sched-mid-004', name: '调度器异常', description: 'kube-scheduler 组件异常', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-sched-basic-001', name: 'CPU/内存不足', description: '节点 CPU 或内存不足', type: 'basic', evaluator: 'check_node_resources', parameters: {} },
      { id: 'evt-sched-basic-002', name: 'PVC 无法绑定', description: 'PVC 一直 Pending', type: 'basic', evaluator: 'check_pvc_pending', parameters: {} },
      { id: 'evt-sched-basic-003', name: '节点亲和性冲突', description: 'nodeAffinity 条件不满足', type: 'basic', evaluator: 'check_node_affinity', parameters: {} },
      { id: 'evt-sched-basic-004', name: '调度器未运行', description: 'kube-scheduler Pod 未 Running', type: 'basic', evaluator: 'check_scheduler_running', parameters: {} },
    ],
    gates: [
      { id: 'gate-sched-001', name: '调度失败', type: 'OR', input_ids: ['evt-sched-mid-001', 'evt-sched-mid-002', 'evt-sched-mid-003', 'evt-sched-mid-004'], output_id: 'evt-sched-top' },
      { id: 'gate-sched-002', name: '资源不足', type: 'OR', input_ids: ['evt-sched-basic-001', 'evt-sched-basic-002'], output_id: 'evt-sched-mid-001' },
    ],
  },
  'wf-kudig-monitoring': {
    id: 'ft-kudig-monitoring', name: 'Monitoring 监控异常故障树', top_event_id: 'evt-monitor-top',
    events: [
      { id: 'evt-monitor-top', name: '监控告警异常', description: 'Prometheus 采集失败或 Alertmanager 通知异常', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-monitor-mid-001', name: 'Prometheus 采集失败', description: '指标采集端异常', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-monitor-mid-002', name: 'Alertmanager 通知失败', description: '告警通知未发出', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-monitor-basic-001', name: 'Prometheus Pod 不健康', description: 'Prometheus Server 异常', type: 'basic', evaluator: 'check_prometheus', parameters: {} },
      { id: 'evt-monitor-basic-002', name: 'ServiceMonitor 配置错误', description: 'ServiceMonitor 资源定义错误', type: 'basic', evaluator: 'check_servicemonitor', parameters: {} },
      { id: 'evt-monitor-basic-003', name: 'Alertmanager Pod 不健康', description: 'Alertmanager 异常', type: 'basic', evaluator: 'check_alertmanager', parameters: {} },
      { id: 'evt-monitor-basic-004', name: '告警抑制规则错误', description: '告警被其他规则抑制', type: 'basic', evaluator: 'check_alert_inhibit', parameters: {} },
    ],
    gates: [
      { id: 'gate-monitor-001', name: '监控异常', type: 'OR', input_ids: ['evt-monitor-mid-001', 'evt-monitor-mid-002'], output_id: 'evt-monitor-top' },
    ],
  },
  'wf-kudig-service': {
    id: 'ft-kudig-service', name: 'Service 连通性异常故障树', top_event_id: 'evt-svc-top',
    events: [
      { id: 'evt-svc-top', name: 'Service 不可达', description: 'Service 无法访问或连通性异常', type: 'top', evaluator: '', parameters: {} },
      { id: 'evt-svc-mid-001', name: 'Endpoints 不健康', description: 'Service Endpoints 异常', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-svc-mid-002', name: '网络连通性故障', description: 'Pod 网络连通性问题', type: 'intermediate', evaluator: '', parameters: {} },
      { id: 'evt-svc-basic-001', name: 'Pod 未就绪', description: '后端 Pod 非 Ready 状态', type: 'basic', evaluator: 'check_pod_ready', parameters: {} },
      { id: 'evt-svc-basic-002', name: 'Selector 不匹配', description: 'Service selector 未匹配到 Pod', type: 'basic', evaluator: 'check_svc_selector', parameters: {} },
      { id: 'evt-svc-basic-003', name: '连接被 NetworkPolicy 阻断', description: 'NetworkPolicy 阻止了连接', type: 'basic', evaluator: 'check_network_policy', parameters: {} },
      { id: 'evt-svc-basic-004', name: 'Service Type 问题', description: 'LoadBalancer/NodePort 配置异常', type: 'basic', evaluator: 'check_svc_type', parameters: {} },
    ],
    gates: [
      { id: 'gate-svc-001', name: 'Service 异常', type: 'OR', input_ids: ['evt-svc-mid-001', 'evt-svc-mid-002'], output_id: 'evt-svc-top' },
      { id: 'gate-svc-002', name: 'Endpoints 异常', type: 'OR', input_ids: ['evt-svc-basic-001', 'evt-svc-basic-002'], output_id: 'evt-svc-mid-001' },
    ],
  },
};

// ─── Workflow Executions ───
const mockWorkflowExecutions: WorkflowExecutionRecord[] = [
  {
    id: 'exec-001',
    workflow_id: 'wf-001',
    workflow_name: 'K8s 节点 NotReady 故障树',
    status: 'completed',
    started_at: '2026-04-08T08:15:00Z',
    completed_at: '2026-04-08T08:15:12Z',
    trigger: 'alert-node-notready-cn-hz-03',
    root_cause: 'NetworkPolicy 误配置导致 kubelet 心跳包被 Drop',
    nodes_evaluated: 8,
    duration_ms: 12340,
  },
  {
    id: 'exec-002',
    workflow_id: 'wf-001',
    workflow_name: 'K8s 节点 NotReady 故障树',
    status: 'completed',
    started_at: '2026-04-07T14:30:00Z',
    completed_at: '2026-04-07T14:30:18Z',
    trigger: 'alert-node-notready-cn-hz-07',
    root_cause: '节点内存 OOM，kubelet 进程被 Kill',
    nodes_evaluated: 6,
    duration_ms: 18200,
  },
  {
    id: 'exec-003',
    workflow_id: 'wf-002',
    workflow_name: 'RDS 主从同步延迟诊断',
    status: 'completed',
    started_at: '2026-04-07T16:20:00Z',
    completed_at: '2026-04-07T16:20:25Z',
    trigger: 'alert-rds-replication-lag-rm-2ze-001',
    root_cause: '大事务阻塞：批量 UPDATE 影响 52 万行',
    nodes_evaluated: 7,
    duration_ms: 25100,
  },
  {
    id: 'exec-004',
    workflow_id: 'wf-004',
    workflow_name: 'ECS 实例 CPU 打满分析',
    status: 'completed',
    started_at: '2026-04-08T07:45:00Z',
    completed_at: '2026-04-08T07:45:30Z',
    trigger: 'alert-ecs-cpu-high-i-2ze-abc',
    root_cause: 'Java 应用 Full GC 频繁，Eden 区配置过小',
    nodes_evaluated: 9,
    duration_ms: 30500,
  },
  {
    id: 'exec-005',
    workflow_id: 'wf-004',
    workflow_name: 'ECS 实例 CPU 打满分析',
    status: 'failed',
    started_at: '2026-04-07T22:10:00Z',
    completed_at: '2026-04-07T22:10:45Z',
    trigger: 'alert-ecs-cpu-high-i-2ze-xyz',
    root_cause: null,
    nodes_evaluated: 4,
    duration_ms: 45000,
  },
  {
    id: 'exec-006',
    workflow_id: 'wf-001',
    workflow_name: 'K8s 节点 NotReady 故障树',
    status: 'running',
    started_at: '2026-04-08T09:50:00Z',
    completed_at: null,
    trigger: 'alert-node-notready-cn-sh-02',
    root_cause: null,
    nodes_evaluated: 3,
    duration_ms: 0,
  },
  {
    id: 'exec-007',
    workflow_id: 'wf-002',
    workflow_name: 'RDS 主从同步延迟诊断',
    status: 'completed',
    started_at: '2026-04-06T11:00:00Z',
    completed_at: '2026-04-06T11:00:15Z',
    trigger: 'alert-rds-replication-lag-rm-2ze-003',
    root_cause: '从库规格不足，CPU 使用率 98%',
    nodes_evaluated: 5,
    duration_ms: 15200,
  },
  // Kudig topic-fta executions
  { id: 'exec-kudig-001', workflow_id: 'wf-kudig-node', workflow_name: 'Node 节点异常故障树', status: 'completed', started_at: '2026-04-12T14:20:00Z', completed_at: '2026-04-12T14:20:18Z', trigger: 'alert-node-notready-cn-hz-05', root_cause: 'kubelet 进程 OOM 被 kill', nodes_evaluated: 9, duration_ms: 18200 },
  { id: 'exec-kudig-002', workflow_id: 'wf-kudig-pod', workflow_name: 'Pod 异常故障树', status: 'completed', started_at: '2026-04-12T16:00:00Z', completed_at: '2026-04-12T16:00:31Z', trigger: 'alert-pod-crashloop-cn-hz-01', root_cause: 'OOMKilled — 容器内存限制 512Mi 不足', nodes_evaluated: 11, duration_ms: 31400 },
  { id: 'exec-kudig-003', workflow_id: 'wf-kudig-pod', workflow_name: 'Pod 异常故障树', status: 'completed', started_at: '2026-04-11T10:30:00Z', completed_at: '2026-04-11T10:30:22Z', trigger: 'alert-pod-crashloop-cn-sh-02', root_cause: 'CrashLoopBackOff — exit code 1 应用启动脚本错误', nodes_evaluated: 8, duration_ms: 22300 },
  { id: 'exec-kudig-004', workflow_id: 'wf-kudig-apiserver', workflow_name: 'API Server 异常故障树', status: 'completed', started_at: '2026-04-11T09:00:00Z', completed_at: '2026-04-11T09:00:28Z', trigger: 'alert-apiserver-latency-high', root_cause: 'etcd 写入延迟过高，磁盘 IO 瓶颈', nodes_evaluated: 8, duration_ms: 28100 },
  { id: 'exec-kudig-005', workflow_id: 'wf-kudig-etcd', workflow_name: 'Etcd 异常故障树', status: 'completed', started_at: '2026-04-10T22:30:00Z', completed_at: '2026-04-10T22:30:15Z', trigger: 'alert-etcd-leader-change', root_cause: '网络抖动导致 leader 重新选举', nodes_evaluated: 10, duration_ms: 15200 },
  { id: 'exec-kudig-006', workflow_id: 'wf-kudig-dns', workflow_name: 'DNS 解析异常故障树', status: 'completed', started_at: '2026-04-12T10:15:00Z', completed_at: '2026-04-12T10:15:08Z', trigger: 'alert-dns-resolution-fail', root_cause: 'CoreDNS Pod 被驱逐，coredns 配置丢失', nodes_evaluated: 7, duration_ms: 8200 },
  { id: 'exec-kudig-007', workflow_id: 'wf-kudig-dns', workflow_name: 'DNS 解析异常故障树', status: 'completed', started_at: '2026-04-11T08:45:00Z', completed_at: '2026-04-11T08:45:12Z', trigger: 'alert-dns-timeout', root_cause: 'Node /etc/resolv.conf nameserver 配置被覆盖', nodes_evaluated: 6, duration_ms: 12100 },
  { id: 'exec-kudig-008', workflow_id: 'wf-kudig-ingress', workflow_name: 'Ingress/Gateway 故障树', status: 'completed', started_at: '2026-04-11T15:45:00Z', completed_at: '2026-04-11T15:45:19Z', trigger: 'alert-ingress-5xx', root_cause: 'Ingress Controller 证书过期', nodes_evaluated: 6, duration_ms: 19400 },
  { id: 'exec-kudig-009', workflow_id: 'wf-kudig-deployment', workflow_name: 'Deployment 异常故障树', status: 'completed', started_at: '2026-04-12T08:30:00Z', completed_at: '2026-04-12T08:30:42Z', trigger: 'alert-deploy-rollout-stuck', root_cause: 'ImagePullBackOff — 私有镜像仓库认证过期', nodes_evaluated: 8, duration_ms: 42300 },
  { id: 'exec-kudig-010', workflow_id: 'wf-kudig-deployment', workflow_name: 'Deployment 异常故障树', status: 'completed', started_at: '2026-04-11T14:00:00Z', completed_at: '2026-04-11T14:00:25Z', trigger: 'alert-deploy-replicasset-unhealthy', root_cause: 'liveness 探针连续失败 3 次，容器被重启', nodes_evaluated: 7, duration_ms: 25200 },
  { id: 'exec-kudig-011', workflow_id: 'wf-kudig-statefulset', workflow_name: 'StatefulSet 异常故障树', status: 'completed', started_at: '2026-04-10T16:20:00Z', completed_at: '2026-04-10T16:20:14Z', trigger: 'alert-statefulset-pvc-pending', root_cause: 'PVC 一直 Pending — 存储类不存在', nodes_evaluated: 7, duration_ms: 14200 },
  { id: 'exec-kudig-012', workflow_id: 'wf-kudig-daemonset', workflow_name: 'DaemonSet 异常故障树', status: 'completed', started_at: '2026-04-11T11:00:00Z', completed_at: '2026-04-11T11:00:09Z', trigger: 'alert-daemonset-pod-not-scheduled', root_cause: '节点污点 NoSchedule 未被 Pod 容忍', nodes_evaluated: 6, duration_ms: 9100 },
  { id: 'exec-kudig-013', workflow_id: 'wf-kudig-job', workflow_name: 'Job/CronJob 异常故障树', status: 'completed', started_at: '2026-04-12T09:00:00Z', completed_at: '2026-04-12T09:00:18Z', trigger: 'alert-job-failed', root_cause: '容器退出码 1 — 数据清洗脚本 SQL 语法错误', nodes_evaluated: 7, duration_ms: 18200 },
  { id: 'exec-kudig-014', workflow_id: 'wf-kudig-hpa', workflow_name: 'HPA 扩缩容异常故障树', status: 'completed', started_at: '2026-04-11T14:30:00Z', completed_at: '2026-04-11T14:30:11Z', trigger: 'alert-hpa-not-scaling', root_cause: 'metrics-server 未运行，HPA 无法获取指标', nodes_evaluated: 8, duration_ms: 11200 },
  { id: 'exec-kudig-015', workflow_id: 'wf-kudig-vpa', workflow_name: 'VPA 异常故障树', status: 'completed', started_at: '2026-04-10T12:00:00Z', completed_at: '2026-04-10T12:00:07Z', trigger: 'alert-vpa-update-failed', root_cause: 'VPA 推荐值超出资源限制范围', nodes_evaluated: 6, duration_ms: 7300 },
  { id: 'exec-kudig-016', workflow_id: 'wf-kudig-csi', workflow_name: 'CSI 存储异常故障树', status: 'completed', started_at: '2026-04-12T11:15:00Z', completed_at: '2026-04-12T11:15:22Z', trigger: 'alert-pvc-attach-failed', root_cause: 'CSI driver 插件异常退出，卷挂载失败', nodes_evaluated: 9, duration_ms: 22100 },
  { id: 'exec-kudig-017', workflow_id: 'wf-kudig-rbac', workflow_name: 'RBAC 权限异常故障树', status: 'completed', started_at: '2026-04-11T16:00:00Z', completed_at: '2026-04-11T16:00:13Z', trigger: 'alert-sa-permission-denied', root_cause: 'RoleBinding 未绑定正确的 ClusterRole', nodes_evaluated: 7, duration_ms: 13100 },
  { id: 'exec-kudig-018', workflow_id: 'wf-kudig-certificate', workflow_name: 'Certificate 证书异常故障树', status: 'completed', started_at: '2026-04-12T07:45:00Z', completed_at: '2026-04-12T07:45:09Z', trigger: 'alert-kubelet-cert-expiring', root_cause: 'kubelet 证书 30 天后过期，需手动续期', nodes_evaluated: 6, duration_ms: 9400 },
  { id: 'exec-kudig-019', workflow_id: 'wf-kudig-scheduler', workflow_name: 'Scheduler 调度异常故障树', status: 'completed', started_at: '2026-04-11T13:20:00Z', completed_at: '2026-04-11T13:20:27Z', trigger: 'alert-pod-unschedulable', root_cause: 'CPU 资源不足，节点所有可用 CPU 被占满', nodes_evaluated: 9, duration_ms: 27100 },
  { id: 'exec-kudig-020', workflow_id: 'wf-kudig-scheduler', workflow_name: 'Scheduler 调度异常故障树', status: 'failed', started_at: '2026-04-12T17:00:00Z', completed_at: '2026-04-12T17:00:30Z', trigger: 'alert-pod-unschedulable-2', root_cause: null, nodes_evaluated: 3, duration_ms: 30000 },
  { id: 'exec-kudig-021', workflow_id: 'wf-kudig-controller', workflow_name: 'Controller Manager 异常故障树', status: 'completed', started_at: '2026-04-10T20:00:00Z', completed_at: '2026-04-10T20:00:11Z', trigger: 'alert-controller-manager-down', root_cause: 'kube-controller-manager Pod 被OOMKill', nodes_evaluated: 7, duration_ms: 11200 },
  { id: 'exec-kudig-022', workflow_id: 'wf-kudig-monitoring', workflow_name: 'Monitoring 监控异常故障树', status: 'completed', started_at: '2026-04-12T06:30:00Z', completed_at: '2026-04-12T06:30:19Z', trigger: 'alert-prometheus-target-down', root_cause: 'Prometheus 采集 target 超时，网络策略阻断', nodes_evaluated: 8, duration_ms: 19200 },
  { id: 'exec-kudig-023', workflow_id: 'wf-kudig-service', workflow_name: 'Service 连通性异常故障树', status: 'completed', started_at: '2026-04-11T10:00:00Z', completed_at: '2026-04-11T10:00:08Z', trigger: 'alert-svc-endpoints-empty', root_cause: 'Service selector 写错，匹配不到后端 Pod', nodes_evaluated: 7, duration_ms: 8100 },
  { id: 'exec-kudig-024', workflow_id: 'wf-kudig-service', workflow_name: 'Service 连通性异常故障树', status: 'completed', started_at: '2026-04-12T13:30:00Z', completed_at: '2026-04-12T13:30:15Z', trigger: 'alert-svc-connection-refused', root_cause: '后端 Pod 全部非 Ready，NetworkPolicy 阻断', nodes_evaluated: 7, duration_ms: 15200 },
  { id: 'exec-kudig-025', workflow_id: 'wf-kudig-nodepool', workflow_name: 'NodePool 节点池异常故障树', status: 'completed', started_at: '2026-04-12T13:00:00Z', completed_at: '2026-04-12T13:00:22Z', trigger: 'alert-nodepool-scale-fail', root_cause: 'Cluster Autoscaler 无法扩容，云厂商配额不足', nodes_evaluated: 8, duration_ms: 22200 },
  { id: 'exec-kudig-026', workflow_id: 'wf-kudig-pdb', workflow_name: 'PDB 驱散异常故障树', status: 'completed', started_at: '2026-04-11T08:15:00Z', completed_at: '2026-04-11T08:15:06Z', trigger: 'alert-pdb-burst-allowed-0', root_cause: 'PDB minAvailable 配置过高，阻断正常驱逐', nodes_evaluated: 6, duration_ms: 6200 },
  { id: 'exec-kudig-027', workflow_id: 'wf-kudig-autoscaler', workflow_name: 'Cluster Autoscaler 异常故障树', status: 'completed', started_at: '2026-04-12T15:30:00Z', completed_at: '2026-04-12T15:30:14Z', trigger: 'alert-autoscaler-scale-fail', root_cause: 'Cluster Autoscaler 参数区域配置错误', nodes_evaluated: 8, duration_ms: 14200 },
  { id: 'exec-kudig-028', workflow_id: 'wf-kudig-cluster-upgrade', workflow_name: '集群升级异常故障树', status: 'completed', started_at: '2026-04-11T22:00:00Z', completed_at: '2026-04-11T22:00:48Z', trigger: 'alert-cluster-upgrade-failed', root_cause: '节点升级超时，控制面组件版本不兼容', nodes_evaluated: 10, duration_ms: 48100 },
  { id: 'exec-kudig-029', workflow_id: 'wf-kudig-gateway', workflow_name: 'Gateway API 异常故障树', status: 'completed', started_at: '2026-04-10T18:00:00Z', completed_at: '2026-04-10T18:00:11Z', trigger: 'alert-gateway-route-conflict', root_cause: 'HTTPRoute 绑定冲突，重复的 hostname', nodes_evaluated: 7, duration_ms: 11200 },
  { id: 'exec-kudig-030', workflow_id: 'wf-kudig-service-mesh', workflow_name: 'Service Mesh Istio 异常故障树', status: 'completed', started_at: '2026-04-12T10:45:00Z', completed_at: '2026-04-12T10:45:17Z', trigger: 'alert-istio-sidecar-injection-fail', root_cause: 'Sidecar 注入失败，namespace 标签配置错误', nodes_evaluated: 9, duration_ms: 17300 },
  { id: 'exec-kudig-031', workflow_id: 'wf-kudig-gitops', workflow_name: 'GitOps ArgoCD 异常故障树', status: 'completed', started_at: '2026-04-11T20:30:00Z', completed_at: '2026-04-11T20:30:24Z', trigger: 'alert-argocd-sync-failed', root_cause: 'ArgoCD Image Updater 配置错误，镜像 Tag 不存在', nodes_evaluated: 8, duration_ms: 24200 },
  { id: 'exec-kudig-032', workflow_id: 'wf-kudig-gpu', workflow_name: 'GPU 节点异常故障树', status: 'completed', started_at: '2026-04-12T17:00:00Z', completed_at: '2026-04-12T17:00:31Z', trigger: 'alert-gpu-device-plugin-fail', root_cause: 'GPU 节点 DevicePlugin 注册失败，驱动版本不兼容', nodes_evaluated: 8, duration_ms: 31400 },
  { id: 'exec-kudig-033', workflow_id: 'wf-kudig-helm', workflow_name: 'Helm Release 异常故障树', status: 'completed', started_at: '2026-04-11T12:00:00Z', completed_at: '2026-04-11T12:00:19Z', trigger: 'alert-helm-release-fail', root_cause: 'Helm Release values 参数类型错误', nodes_evaluated: 7, duration_ms: 19200 },
  { id: 'exec-kudig-034', workflow_id: 'wf-kudig-crd', workflow_name: 'CRD/Operator 异常故障树', status: 'completed', started_at: '2026-04-12T08:00:00Z', completed_at: '2026-04-12T08:00:12Z', trigger: 'alert-crd-conversion-fail', root_cause: 'CRD conversion webhook 配置缺失', nodes_evaluated: 9, duration_ms: 12200 },
  { id: 'exec-kudig-035', workflow_id: 'wf-kudig-networkpolicy', workflow_name: 'NetworkPolicy 异常故障树', status: 'completed', started_at: '2026-04-11T17:30:00Z', completed_at: '2026-04-11T17:30:08Z', trigger: 'alert-networkpolicy-pod-isolation', root_cause: 'NetworkPolicy 默认 deny-all，未配置例外规则', nodes_evaluated: 6, duration_ms: 8100 },
  { id: 'exec-kudig-036', workflow_id: 'wf-kudig-psp', workflow_name: 'PSP/SCC 策略异常故障树', status: 'completed', started_at: '2026-04-10T14:00:00Z', completed_at: '2026-04-10T14:00:05Z', trigger: 'alert-psp-pod-rejected', root_cause: 'PodSecurityPolicy 拒绝了 privileged 容器', nodes_evaluated: 6, duration_ms: 5200 },
  { id: 'exec-kudig-037', workflow_id: 'wf-kudig-resourcequota', workflow_name: 'ResourceQuota 异常故障树', status: 'completed', started_at: '2026-04-11T09:45:00Z', completed_at: '2026-04-11T09:45:16Z', trigger: 'alert-quota-exceeded', root_cause: 'Namespace CPU quota 耗尽，新 Pod 无法调度', nodes_evaluated: 7, duration_ms: 16200 },
  { id: 'exec-kudig-038', workflow_id: 'wf-kudig-webhook', workflow_name: 'Webhook Admission 异常故障树', status: 'completed', started_at: '2026-04-12T12:00:00Z', completed_at: '2026-04-12T12:00:21Z', trigger: 'alert-webhook-cert-expired', root_cause: 'MutatingWebhook 证书过期，请求被拒绝', nodes_evaluated: 7, duration_ms: 21200 },
  { id: 'exec-kudig-039', workflow_id: 'wf-kudig-backup', workflow_name: 'Backup/Restore 异常故障树', status: 'completed', started_at: '2026-04-11T23:00:00Z', completed_at: '2026-04-11T23:00:14Z', trigger: 'alert-velero-backup-failed', root_cause: 'Velero s3 bucket 凭证过期', nodes_evaluated: 8, duration_ms: 14200 },
  { id: 'exec-kudig-040', workflow_id: 'wf-kudig-cloudprovider', workflow_name: 'Cloud Provider 异常故障树', status: 'completed', started_at: '2026-04-12T14:00:00Z', completed_at: '2026-04-12T14:00:09Z', trigger: 'alert-alibaba-cloud-api-throttling', root_cause: '阿里云 API 调用频率超过限额', nodes_evaluated: 10, duration_ms: 9200 },
  { id: 'exec-kudig-041', workflow_id: 'wf-kudig-terway', workflow_name: 'Terway CNI 异常故障树', status: 'completed', started_at: '2026-04-11T19:00:00Z', completed_at: '2026-04-11T19:00:18Z', trigger: 'alert-terway-eni-ip-exhausted', root_cause: 'Terway ENI IP 地址池耗尽', nodes_evaluated: 7, duration_ms: 18200 },
];

// ─── RAG Collections (enriched) ───
const mockCollections: Collection[] = [
  { id: 'col-ops-kb-001', name: '阿里云产品运维手册', document_count: 347, vector_count: 12840 },
  { id: 'col-ops-kb-002', name: '历史故障复盘文档', document_count: 156, vector_count: 5230 },
  { id: 'col-ops-kb-003', name: 'K8s 最佳实践', document_count: 89, vector_count: 3410 },
  { id: 'col-ops-kb-004', name: '内部运维 SOP 流程', document_count: 63, vector_count: 2150 },
  { id: 'col-ops-kb-005', name: '安全基线与合规指南', document_count: 42, vector_count: 1680 },
  // kudig-database domain collections
  { id: 'col-kudig-d01', name: 'kudig: K8s 架构概览', document_count: 28, vector_count: 1120 },
  { id: 'col-kudig-d02', name: 'kudig: K8s 设计原则', document_count: 24, vector_count: 960 },
  { id: 'col-kudig-d03', name: 'kudig: 控制平面', document_count: 32, vector_count: 1280 },
  { id: 'col-kudig-d04', name: 'kudig: 工作负载管理', document_count: 30, vector_count: 1200 },
  { id: 'col-kudig-d05', name: 'kudig: 网络', document_count: 41, vector_count: 1640 },
  { id: 'col-kudig-d06', name: 'kudig: 存储', document_count: 22, vector_count: 880 },
  { id: 'col-kudig-d07', name: 'kudig: 安全', document_count: 26, vector_count: 1040 },
  { id: 'col-kudig-d08', name: 'kudig: 可观测性', document_count: 28, vector_count: 1120 },
  { id: 'col-kudig-d09', name: 'kudig: 平台运维', document_count: 20, vector_count: 800 },
  { id: 'col-kudig-d10', name: 'kudig: 扩展机制', document_count: 18, vector_count: 720 },
  { id: 'col-kudig-d11', name: 'kudig: AI 基础设施', document_count: 36, vector_count: 1440 },
  { id: 'col-kudig-d12', name: 'kudig: 故障排查', document_count: 42, vector_count: 1680 },
  { id: 'col-kudig-d13', name: 'kudig: Docker 容器', document_count: 16, vector_count: 640 },
  { id: 'col-kudig-d14', name: 'kudig: Linux 基础', document_count: 14, vector_count: 560 },
  { id: 'col-kudig-d15', name: 'kudig: 网络基础', document_count: 12, vector_count: 480 },
  { id: 'col-kudig-d16', name: 'kudig: 存储基础', document_count: 10, vector_count: 400 },
  { id: 'col-kudig-d17', name: 'kudig: 云服务商', document_count: 14, vector_count: 560 },
  { id: 'col-kudig-d18', name: 'kudig: 生产运维', document_count: 18, vector_count: 720 },
  { id: 'col-kudig-d19', name: 'kudig: 技术论文', document_count: 12, vector_count: 480 },
  { id: 'col-kudig-d20', name: 'kudig: 监控告警', document_count: 16, vector_count: 640 },
  { id: 'col-kudig-d21', name: 'kudig: 日志管理', document_count: 14, vector_count: 560 },
  { id: 'col-kudig-d22', name: 'kudig: 安全运维', document_count: 12, vector_count: 480 },
  { id: 'col-kudig-d23', name: 'kudig: 灾备恢复', document_count: 10, vector_count: 400 },
  { id: 'col-kudig-d24', name: 'kudig: 容量规划', document_count: 8, vector_count: 320 },
  { id: 'col-kudig-d25', name: 'kudig: 成本优化', document_count: 10, vector_count: 400 },
  { id: 'col-kudig-d26', name: 'kudig: SRE 实践', document_count: 14, vector_count: 560 },
  { id: 'col-kudig-d27', name: 'kudig: 混沌工程', document_count: 8, vector_count: 320 },
  { id: 'col-kudig-d28', name: 'kudig: 服务网格', document_count: 12, vector_count: 480 },
  { id: 'col-kudig-d29', name: 'kudig: GitOps', document_count: 10, vector_count: 400 },
  { id: 'col-kudig-d30', name: 'kudig: 多集群管理', document_count: 8, vector_count: 320 },
  { id: 'col-kudig-d31', name: 'kudig: 硬件基础', document_count: 12, vector_count: 480 },
  { id: 'col-kudig-d32', name: 'kudig: YAML 清单', document_count: 36, vector_count: 1440 },
  { id: 'col-kudig-d33', name: 'kudig: K8s 事件', document_count: 20, vector_count: 800 },
  { id: 'col-kudig-d34', name: 'kudig: CNCF 全景', document_count: 218, vector_count: 8720 },
  { id: 'col-kudig-d35', name: 'kudig: eBPF', document_count: 14, vector_count: 560 },
  { id: 'col-kudig-d36', name: 'kudig: 平台工程', document_count: 16, vector_count: 640 },
  { id: 'col-kudig-d37', name: 'kudig: 边缘计算', document_count: 10, vector_count: 400 },
  { id: 'col-kudig-d38', name: 'kudig: WebAssembly', document_count: 8, vector_count: 320 },
  { id: 'col-kudig-d39', name: 'kudig: API 网关', document_count: 12, vector_count: 480 },
  { id: 'col-kudig-d40', name: 'kudig: AIOps', document_count: 18, vector_count: 720 },
];

const mockCollectionDetails: CollectionDetail[] = [
  { id: 'col-ops-kb-001', name: '阿里云产品运维手册', description: '覆盖 ECS、ACK、RDS、SLB、OSS 等核心产品的运维操作指南', document_count: 347, vector_count: 12840, embedding_model: 'text-embedding-v2', created_at: '2026-01-15T08:00:00Z' },
  { id: 'col-ops-kb-002', name: '历史故障复盘文档', description: '生产环境历史故障的 RCA 报告和复盘总结', document_count: 156, vector_count: 5230, embedding_model: 'text-embedding-v2', created_at: '2026-01-20T10:00:00Z' },
  { id: 'col-ops-kb-003', name: 'K8s 最佳实践', description: 'Kubernetes 集群管理、Pod 调度、网络策略、安全加固等最佳实践', document_count: 89, vector_count: 3410, embedding_model: 'text-embedding-v2', created_at: '2026-02-01T14:00:00Z' },
  { id: 'col-ops-kb-004', name: '内部运维 SOP 流程', description: '标准化运维操作流程，包含变更管理、应急响应、巡检等', document_count: 63, vector_count: 2150, embedding_model: 'text-embedding-v2', created_at: '2026-02-10T09:00:00Z' },
  { id: 'col-ops-kb-005', name: '安全基线与合规指南', description: 'CIS Benchmark、等保 2.0、安全基线配置检查', document_count: 42, vector_count: 1680, embedding_model: 'text-embedding-v2', created_at: '2026-02-15T16:00:00Z' },
  // kudig-database domain collection details
  { id: 'col-kudig-d01', name: 'kudig: K8s 架构概览', description: 'Kubernetes 架构全景图、核心组件关系、集群拓扑与设计理念', document_count: 28, vector_count: 1120, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d02', name: 'kudig: K8s 设计原则', description: '声明式 API、控制器模式、终态驱动、松耦合架构等设计哲学', document_count: 24, vector_count: 960, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d03', name: 'kudig: 控制平面', description: 'API Server、etcd、Scheduler、Controller Manager 深度解析', document_count: 32, vector_count: 1280, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d04', name: 'kudig: 工作负载管理', description: 'Deployment、StatefulSet、DaemonSet、Job/CronJob 工作负载全解', document_count: 30, vector_count: 1200, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d05', name: 'kudig: 网络', description: 'CNI、Service、Ingress、NetworkPolicy、DNS 等网络子系统', document_count: 41, vector_count: 1640, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d06', name: 'kudig: 存储', description: 'PV/PVC、StorageClass、CSI 驱动、动态供给与数据持久化', document_count: 22, vector_count: 880, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d07', name: 'kudig: 安全', description: 'RBAC、PSP/PSA、Secret 管理、镜像安全、审计日志', document_count: 26, vector_count: 1040, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d08', name: 'kudig: 可观测性', description: 'Metrics、Logging、Tracing 三支柱，Prometheus/Grafana/OpenTelemetry', document_count: 28, vector_count: 1120, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d09', name: 'kudig: 平台运维', description: '集群升级、证书轮换、etcd 备份、节点运维与扩缩容', document_count: 20, vector_count: 800, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d10', name: 'kudig: 扩展机制', description: 'CRD、Operator、Webhook、Aggregated API、扩展调度器', document_count: 18, vector_count: 720, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d11', name: 'kudig: AI 基础设施', description: 'GPU 调度、AI 训练平台、推理服务、MLOps on K8s', document_count: 36, vector_count: 1440, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d12', name: 'kudig: 故障排查', description: 'Pod 异常、节点问题、网络故障、存储异常等排查方法论', document_count: 42, vector_count: 1680, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d13', name: 'kudig: Docker 容器', description: 'Docker 原理、镜像构建、容器运行时、containerd/CRI-O', document_count: 16, vector_count: 640, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d14', name: 'kudig: Linux 基础', description: 'Namespace、Cgroup、文件系统、进程管理等容器底层技术', document_count: 14, vector_count: 560, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d15', name: 'kudig: 网络基础', description: 'TCP/IP、iptables/nftables、VXLAN、BGP 等网络基础知识', document_count: 12, vector_count: 480, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d16', name: 'kudig: 存储基础', description: '块存储、文件存储、对象存储、分布式存储原理', document_count: 10, vector_count: 400, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d17', name: 'kudig: 云服务商', description: '阿里云 ACK、AWS EKS、GCP GKE 等托管 K8s 服务对比', document_count: 14, vector_count: 560, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d18', name: 'kudig: 生产运维', description: '生产级 K8s 集群的运维策略、SLA 管理与故障演练', document_count: 18, vector_count: 720, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d19', name: 'kudig: 技术论文', description: 'Borg、Omega、K8s 相关学术论文与技术白皮书', document_count: 12, vector_count: 480, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d20', name: 'kudig: 监控告警', description: 'Prometheus、AlertManager、Grafana、自定义指标与告警策略', document_count: 16, vector_count: 640, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d21', name: 'kudig: 日志管理', description: 'EFK/PLG 日志栈、结构化日志、日志采集与分析', document_count: 14, vector_count: 560, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d22', name: 'kudig: 安全运维', description: '供应链安全、运行时防护、漏洞扫描、合规审计', document_count: 12, vector_count: 480, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d23', name: 'kudig: 灾备恢复', description: '跨区域灾备、Velero 备份、RTO/RPO 策略、故障切换', document_count: 10, vector_count: 400, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d24', name: 'kudig: 容量规划', description: '资源配额、LimitRange、VPA/HPA、集群容量评估', document_count: 8, vector_count: 320, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d25', name: 'kudig: 成本优化', description: '资源利用率优化、Spot 实例、FinOps 与成本可视化', document_count: 10, vector_count: 400, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d26', name: 'kudig: SRE 实践', description: 'SLI/SLO/SLA、错误预算、On-Call、事故管理流程', document_count: 14, vector_count: 560, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d27', name: 'kudig: 混沌工程', description: 'Chaos Mesh、LitmusChaos、故障注入与韧性验证', document_count: 8, vector_count: 320, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d28', name: 'kudig: 服务网格', description: 'Istio、Linkerd、Envoy、流量管理与 mTLS', document_count: 12, vector_count: 480, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d29', name: 'kudig: GitOps', description: 'ArgoCD、FluxCD、声明式交付与持续部署', document_count: 10, vector_count: 400, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d30', name: 'kudig: 多集群管理', description: '联邦集群、Submariner、多集群网络与统一调度', document_count: 8, vector_count: 320, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d31', name: 'kudig: 硬件基础', description: 'CPU/内存/磁盘/网卡硬件知识与性能调优', document_count: 12, vector_count: 480, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d32', name: 'kudig: YAML 清单', description: '常用 K8s 资源 YAML 模板与配置最佳实践', document_count: 36, vector_count: 1440, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d33', name: 'kudig: K8s 事件', description: 'K8s Event 类型、含义、排查关联与事件驱动运维', document_count: 20, vector_count: 800, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d34', name: 'kudig: CNCF 全景', description: 'CNCF 218 个项目全景解读，覆盖云原生技术栈各层', document_count: 218, vector_count: 8720, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d35', name: 'kudig: eBPF', description: 'eBPF 原理、Cilium、网络可观测性与安全策略', document_count: 14, vector_count: 560, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d36', name: 'kudig: 平台工程', description: '内部开发者平台、Backstage、自助服务门户', document_count: 16, vector_count: 640, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d37', name: 'kudig: 边缘计算', description: 'KubeEdge、OpenYurt、边缘节点管理与边云协同', document_count: 10, vector_count: 400, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d38', name: 'kudig: WebAssembly', description: 'WASM 运行时、WasmEdge、Spin、Wasm on K8s', document_count: 8, vector_count: 320, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d39', name: 'kudig: API 网关', description: 'APISIX、Kong、Higress、Gateway API 与流量治理', document_count: 12, vector_count: 480, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
  { id: 'col-kudig-d40', name: 'kudig: AIOps', description: 'AIOps 平台建设、智能告警、异常检测、根因分析', document_count: 18, vector_count: 720, embedding_model: 'bge-large-zh', created_at: '2026-04-15T10:00:00Z' },
];

// ─── RAG Documents ───
const mockDocuments: Document[] = [
  // col-ops-kb-001: 阿里云产品运维手册
  { id: 'doc-001', collection_id: 'col-ops-kb-001', title: 'ACK 集群升级操作手册.pdf', format: 'pdf', size_bytes: 2456000, chunk_count: 48, status: 'indexed', uploaded_at: '2026-02-01T08:00:00Z', updated_at: '2026-03-15T10:00:00Z' },
  { id: 'doc-002', collection_id: 'col-ops-kb-001', title: 'ECS 实例故障排查 SOP.md', format: 'markdown', size_bytes: 156000, chunk_count: 23, status: 'indexed', uploaded_at: '2026-02-05T14:00:00Z', updated_at: '2026-03-20T09:00:00Z' },
  { id: 'doc-003', collection_id: 'col-ops-kb-001', title: 'RDS 备份恢复最佳实践.pdf', format: 'pdf', size_bytes: 1890000, chunk_count: 35, status: 'indexed', uploaded_at: '2026-02-10T11:00:00Z', updated_at: '2026-03-10T15:00:00Z' },
  { id: 'doc-004', collection_id: 'col-ops-kb-001', title: 'SLB 配置指南.md', format: 'markdown', size_bytes: 98000, chunk_count: 15, status: 'indexed', uploaded_at: '2026-02-12T09:00:00Z', updated_at: '2026-02-12T09:00:00Z' },
  // col-ops-kb-002: 历史故障复盘
  { id: 'doc-005', collection_id: 'col-ops-kb-002', title: 'INC-2024-0673 RDS 主从同步复盘.md', format: 'markdown', size_bytes: 67000, chunk_count: 12, status: 'indexed', uploaded_at: '2026-02-20T16:00:00Z', updated_at: '2026-02-20T16:00:00Z' },
  { id: 'doc-006', collection_id: 'col-ops-kb-002', title: 'INC-2024-0521 K8s 集群网络风暴.pdf', format: 'pdf', size_bytes: 1234000, chunk_count: 28, status: 'indexed', uploaded_at: '2026-02-22T10:00:00Z', updated_at: '2026-02-22T10:00:00Z' },
  { id: 'doc-007', collection_id: 'col-ops-kb-002', title: 'INC-2024-0445 DNS 解析异常.md', format: 'markdown', size_bytes: 45000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-02-25T14:00:00Z', updated_at: '2026-02-25T14:00:00Z' },
  // col-ops-kb-003: K8s 最佳实践
  { id: 'doc-008', collection_id: 'col-ops-kb-003', title: 'K8s Pod 调度策略.md', format: 'markdown', size_bytes: 89000, chunk_count: 16, status: 'indexed', uploaded_at: '2026-03-01T08:00:00Z', updated_at: '2026-03-01T08:00:00Z' },
  { id: 'doc-009', collection_id: 'col-ops-kb-003', title: 'Helm Chart 最佳实践.md', format: 'markdown', size_bytes: 72000, chunk_count: 14, status: 'indexed', uploaded_at: '2026-03-05T10:00:00Z', updated_at: '2026-03-05T10:00:00Z' },
  { id: 'doc-010', collection_id: 'col-ops-kb-003', title: '容器镜像安全扫描.pdf', format: 'pdf', size_bytes: 980000, chunk_count: 20, status: 'indexed', uploaded_at: '2026-03-08T14:00:00Z', updated_at: '2026-03-08T14:00:00Z' },
  // col-ops-kb-004: 内部运维 SOP
  { id: 'doc-011', collection_id: 'col-ops-kb-004', title: '变更管理 SOP v2.1.pdf', format: 'pdf', size_bytes: 1560000, chunk_count: 30, status: 'indexed', uploaded_at: '2026-03-10T09:00:00Z', updated_at: '2026-04-01T11:00:00Z' },
  { id: 'doc-012', collection_id: 'col-ops-kb-004', title: '应急响应流程.md', format: 'markdown', size_bytes: 112000, chunk_count: 18, status: 'indexed', uploaded_at: '2026-03-12T16:00:00Z', updated_at: '2026-03-12T16:00:00Z' },
  // col-ops-kb-005: 安全基线
  { id: 'doc-013', collection_id: 'col-ops-kb-005', title: 'CIS Benchmark K8s 1.28.pdf', format: 'pdf', size_bytes: 3200000, chunk_count: 65, status: 'indexed', uploaded_at: '2026-03-15T08:00:00Z', updated_at: '2026-03-15T08:00:00Z' },
  { id: 'doc-014', collection_id: 'col-ops-kb-005', title: '等保 2.0 合规检查清单.pdf', format: 'pdf', size_bytes: 2100000, chunk_count: 42, status: 'indexed', uploaded_at: '2026-03-18T10:00:00Z', updated_at: '2026-03-18T10:00:00Z' },
  { id: 'doc-015', collection_id: 'col-ops-kb-001', title: 'OSS 跨区域复制配置.txt', format: 'txt', size_bytes: 23000, chunk_count: 5, status: 'processing', uploaded_at: '2026-04-08T09:30:00Z', updated_at: '2026-04-08T09:30:00Z' },
  // kudig-database domain documents — every collection has documents
  // domain-1: K8s 架构概览
  { id: 'doc-kudig-001', collection_id: 'col-kudig-d01', title: 'Kubernetes 架构全景图.md', format: 'markdown', size_bytes: 45000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-002', collection_id: 'col-kudig-d01', title: 'K8s 核心组件交互流程.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-003', collection_id: 'col-kudig-d01', title: '集群拓扑与高可用部署.md', format: 'markdown', size_bytes: 42000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-2: K8s 设计原则
  { id: 'doc-kudig-004', collection_id: 'col-kudig-d02', title: '声明式 API 设计哲学.md', format: 'markdown', size_bytes: 32000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-005', collection_id: 'col-kudig-d02', title: '控制器模式与终态驱动.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-3: 控制平面
  { id: 'doc-kudig-006', collection_id: 'col-kudig-d03', title: '控制平面架构总览.md', format: 'markdown', size_bytes: 52000, chunk_count: 10, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-007', collection_id: 'col-kudig-d03', title: 'etcd 集群运维指南.md', format: 'markdown', size_bytes: 41000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-008', collection_id: 'col-kudig-d03', title: 'API Server 深度解析.md', format: 'markdown', size_bytes: 48000, chunk_count: 9, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-4: 工作负载管理
  { id: 'doc-kudig-009', collection_id: 'col-kudig-d04', title: 'Deployment 滚动更新策略.md', format: 'markdown', size_bytes: 35000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-010', collection_id: 'col-kudig-d04', title: 'StatefulSet 有状态应用管理.md', format: 'markdown', size_bytes: 44000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-5: 网络
  { id: 'doc-kudig-011', collection_id: 'col-kudig-d05', title: 'CNI 插件对比与选型.md', format: 'markdown', size_bytes: 56000, chunk_count: 11, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-012', collection_id: 'col-kudig-d05', title: 'Service 与 Ingress 深度解析.md', format: 'markdown', size_bytes: 48000, chunk_count: 9, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-013', collection_id: 'col-kudig-d05', title: 'NetworkPolicy 网络策略实战.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-6: 存储
  { id: 'doc-kudig-014', collection_id: 'col-kudig-d06', title: 'PV/PVC 持久化存储详解.md', format: 'markdown', size_bytes: 40000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-015', collection_id: 'col-kudig-d06', title: 'CSI 驱动开发与集成.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-7: 安全
  { id: 'doc-kudig-016', collection_id: 'col-kudig-d07', title: 'RBAC 权限模型详解.md', format: 'markdown', size_bytes: 35000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-017', collection_id: 'col-kudig-d07', title: 'Pod Security Admission 实践.md', format: 'markdown', size_bytes: 33000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-8: 可观测性
  { id: 'doc-kudig-018', collection_id: 'col-kudig-d08', title: 'Prometheus 监控体系搭建.md', format: 'markdown', size_bytes: 62000, chunk_count: 12, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-019', collection_id: 'col-kudig-d08', title: 'OpenTelemetry 全链路追踪.md', format: 'markdown', size_bytes: 45000, chunk_count: 9, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-9: 平台运维
  { id: 'doc-kudig-020', collection_id: 'col-kudig-d09', title: '集群升级滚动策略.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-021', collection_id: 'col-kudig-d09', title: 'etcd 备份与恢复.md', format: 'markdown', size_bytes: 30000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-10: 扩展机制
  { id: 'doc-kudig-022', collection_id: 'col-kudig-d10', title: 'CRD 与 Operator 开发指南.md', format: 'markdown', size_bytes: 55000, chunk_count: 10, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-023', collection_id: 'col-kudig-d10', title: 'Webhook 准入控制器.md', format: 'markdown', size_bytes: 32000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-11: AI 基础设施
  { id: 'doc-kudig-024', collection_id: 'col-kudig-d11', title: 'GPU 调度与 AI 训练平台.md', format: 'markdown', size_bytes: 58000, chunk_count: 11, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-025', collection_id: 'col-kudig-d11', title: 'KubeRay 推理服务部署.md', format: 'markdown', size_bytes: 42000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-12: 故障排查
  { id: 'doc-kudig-026', collection_id: 'col-kudig-d12', title: 'Pod CrashLoopBackOff 排查.md', format: 'markdown', size_bytes: 32000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-027', collection_id: 'col-kudig-d12', title: '节点 NotReady 故障诊断.md', format: 'markdown', size_bytes: 39000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-028', collection_id: 'col-kudig-d12', title: 'OOM Killed 根因分析.md', format: 'markdown', size_bytes: 28000, chunk_count: 5, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-13: Docker 容器
  { id: 'doc-kudig-029', collection_id: 'col-kudig-d13', title: 'Docker 镜像构建最佳实践.md', format: 'markdown', size_bytes: 34000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-030', collection_id: 'col-kudig-d13', title: 'containerd 与 CRI-O 运行时.md', format: 'markdown', size_bytes: 40000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-14: Linux 基础
  { id: 'doc-kudig-031', collection_id: 'col-kudig-d14', title: 'Linux Namespace 与 Cgroup.md', format: 'markdown', size_bytes: 46000, chunk_count: 9, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-032', collection_id: 'col-kudig-d14', title: '内核参数调优指南.md', format: 'markdown', size_bytes: 30000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-15: 网络基础
  { id: 'doc-kudig-033', collection_id: 'col-kudig-d15', title: 'iptables 与 nftables 详解.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-034', collection_id: 'col-kudig-d15', title: 'VXLAN 隧道与 BGP 路由.md', format: 'markdown', size_bytes: 35000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-16: 存储基础
  { id: 'doc-kudig-035', collection_id: 'col-kudig-d16', title: '分布式存储原理.md', format: 'markdown', size_bytes: 42000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-036', collection_id: 'col-kudig-d16', title: 'Ceph 与 Rook 存储方案.md', format: 'markdown', size_bytes: 37000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-17: 云服务商
  { id: 'doc-kudig-037', collection_id: 'col-kudig-d17', title: 'ACK vs EKS vs GKE 对比.md', format: 'markdown', size_bytes: 50000, chunk_count: 10, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-038', collection_id: 'col-kudig-d17', title: '托管 K8s 服务选型指南.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-18: 生产运维
  { id: 'doc-kudig-039', collection_id: 'col-kudig-d18', title: '生产集群 Day-2 运维手册.md', format: 'markdown', size_bytes: 55000, chunk_count: 10, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-040', collection_id: 'col-kudig-d18', title: 'SLA 保障与故障演练.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-19: 技术论文
  { id: 'doc-kudig-041', collection_id: 'col-kudig-d19', title: 'Borg 论文解读.md', format: 'markdown', size_bytes: 48000, chunk_count: 9, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-042', collection_id: 'col-kudig-d19', title: 'Omega 调度器设计.md', format: 'markdown', size_bytes: 40000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-20: 监控告警
  { id: 'doc-kudig-043', collection_id: 'col-kudig-d20', title: 'AlertManager 告警策略配置.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-044', collection_id: 'col-kudig-d20', title: '自定义 Metrics 与 PromQL.md', format: 'markdown', size_bytes: 42000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-21: 日志管理
  { id: 'doc-kudig-045', collection_id: 'col-kudig-d21', title: 'EFK 日志栈部署.md', format: 'markdown', size_bytes: 44000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-046', collection_id: 'col-kudig-d21', title: 'Loki + Grafana 日志方案.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-22: 安全运维
  { id: 'doc-kudig-047', collection_id: 'col-kudig-d22', title: '供应链安全与镜像签名.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-048', collection_id: 'col-kudig-d22', title: 'Falco 运行时安全监控.md', format: 'markdown', size_bytes: 32000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-23: 灾备恢复
  { id: 'doc-kudig-049', collection_id: 'col-kudig-d23', title: 'Velero 备份恢复指南.md', format: 'markdown', size_bytes: 40000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-050', collection_id: 'col-kudig-d23', title: '跨区域灾备与故障切换.md', format: 'markdown', size_bytes: 35000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-24: 容量规划
  { id: 'doc-kudig-051', collection_id: 'col-kudig-d24', title: 'VPA/HPA 自动伸缩策略.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-052', collection_id: 'col-kudig-d24', title: '集群容量评估方法论.md', format: 'markdown', size_bytes: 30000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-25: 成本优化
  { id: 'doc-kudig-053', collection_id: 'col-kudig-d25', title: 'FinOps 云成本治理.md', format: 'markdown', size_bytes: 34000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-054', collection_id: 'col-kudig-d25', title: 'Spot 实例与资源优化.md', format: 'markdown', size_bytes: 28000, chunk_count: 5, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-26: SRE 实践
  { id: 'doc-kudig-055', collection_id: 'col-kudig-d26', title: 'SLI/SLO/SLA 定义与度量.md', format: 'markdown', size_bytes: 42000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-056', collection_id: 'col-kudig-d26', title: '错误预算与 On-Call 实践.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-27: 混沌工程
  { id: 'doc-kudig-057', collection_id: 'col-kudig-d27', title: 'Chaos Mesh 故障注入.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-058', collection_id: 'col-kudig-d27', title: '韧性验证与 GameDay 演练.md', format: 'markdown', size_bytes: 30000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-28: 服务网格
  { id: 'doc-kudig-059', collection_id: 'col-kudig-d28', title: 'Istio 服务网格全解.md', format: 'markdown', size_bytes: 56000, chunk_count: 11, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-060', collection_id: 'col-kudig-d28', title: 'Envoy 数据面与 mTLS.md', format: 'markdown', size_bytes: 40000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-29: GitOps
  { id: 'doc-kudig-061', collection_id: 'col-kudig-d29', title: 'ArgoCD 声明式交付.md', format: 'markdown', size_bytes: 44000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-062', collection_id: 'col-kudig-d29', title: 'FluxCD 持续部署实践.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-30: 多集群管理
  { id: 'doc-kudig-063', collection_id: 'col-kudig-d30', title: '联邦集群与多集群调度.md', format: 'markdown', size_bytes: 42000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-064', collection_id: 'col-kudig-d30', title: 'Submariner 跨集群网络.md', format: 'markdown', size_bytes: 34000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-31: 硬件基础
  { id: 'doc-kudig-065', collection_id: 'col-kudig-d31', title: 'CPU/内存硬件知识.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-066', collection_id: 'col-kudig-d31', title: '网卡与磁盘性能调优.md', format: 'markdown', size_bytes: 32000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-32: YAML 清单
  { id: 'doc-kudig-067', collection_id: 'col-kudig-d32', title: 'Deployment YAML 模板大全.md', format: 'markdown', size_bytes: 50000, chunk_count: 10, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-068', collection_id: 'col-kudig-d32', title: 'Service/Ingress YAML 示例.md', format: 'markdown', size_bytes: 45000, chunk_count: 9, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-33: K8s 事件
  { id: 'doc-kudig-069', collection_id: 'col-kudig-d33', title: 'K8s Event 类型与含义.md', format: 'markdown', size_bytes: 42000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-070', collection_id: 'col-kudig-d33', title: '事件驱动运维与告警关联.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-071', collection_id: 'col-kudig-d33', title: 'Warning Event 排查手册.md', format: 'markdown', size_bytes: 30000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-34: CNCF 全景
  { id: 'doc-kudig-072', collection_id: 'col-kudig-d34', title: 'Prometheus 项目全解.md', format: 'markdown', size_bytes: 28000, chunk_count: 5, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-073', collection_id: 'col-kudig-d34', title: 'Envoy 项目全解.md', format: 'markdown', size_bytes: 31000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-074', collection_id: 'col-kudig-d34', title: 'Helm 项目全解.md', format: 'markdown', size_bytes: 26000, chunk_count: 5, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-075', collection_id: 'col-kudig-d34', title: 'Cilium 项目全解.md', format: 'markdown', size_bytes: 32000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-35: eBPF
  { id: 'doc-kudig-076', collection_id: 'col-kudig-d35', title: 'eBPF 原理与 Cilium 实践.md', format: 'markdown', size_bytes: 47000, chunk_count: 9, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-077', collection_id: 'col-kudig-d35', title: 'eBPF 网络可观测性.md', format: 'markdown', size_bytes: 35000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-36: 平台工程
  { id: 'doc-kudig-078', collection_id: 'col-kudig-d36', title: 'Backstage 内部开发者门户.md', format: 'markdown', size_bytes: 40000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-079', collection_id: 'col-kudig-d36', title: '平台工程成熟度模型.md', format: 'markdown', size_bytes: 34000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-37: 边缘计算
  { id: 'doc-kudig-080', collection_id: 'col-kudig-d37', title: 'KubeEdge 边缘节点管理.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-081', collection_id: 'col-kudig-d37', title: 'OpenYurt 边云协同架构.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-38: WebAssembly
  { id: 'doc-kudig-082', collection_id: 'col-kudig-d38', title: 'WasmEdge 运行时入门.md', format: 'markdown', size_bytes: 30000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-083', collection_id: 'col-kudig-d38', title: 'Spin 框架与 Wasm on K8s.md', format: 'markdown', size_bytes: 28000, chunk_count: 5, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-39: API 网关
  { id: 'doc-kudig-084', collection_id: 'col-kudig-d39', title: 'Gateway API 规范解读.md', format: 'markdown', size_bytes: 40000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-085', collection_id: 'col-kudig-d39', title: 'APISIX 与 Higress 对比.md', format: 'markdown', size_bytes: 35000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // domain-40: AIOps
  { id: 'doc-kudig-086', collection_id: 'col-kudig-d40', title: 'AIOps 平台建设指南.md', format: 'markdown', size_bytes: 52000, chunk_count: 10, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'doc-kudig-087', collection_id: 'col-kudig-d40', title: '智能告警与异常检测.md', format: 'markdown', size_bytes: 44000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
];

// ─── Dashboard 数据 ───
const mockDashboardMetrics: DashboardMetrics = {
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

const mockTickets: OpsTicket[] = [
  { id: 'INC-2024-0891', title: 'ECS 实例 CPU 持续高负载告警', status: 'processing', priority: 'high', created_at: '10 分钟前', assignee: '张明' },
  { id: 'INC-2024-0890', title: 'SLB 后端服务健康检查失败', status: 'pending', priority: 'critical', created_at: '25 分钟前', assignee: '李强' },
  { id: 'INC-2024-0889', title: 'RDS 主从同步延迟超过阈值', status: 'completed', priority: 'medium', created_at: '1 小时前', assignee: '王芳' },
  { id: 'INC-2024-0888', title: 'K8s 节点 NotReady 状态', status: 'approved', priority: 'high', created_at: '2 小时前', assignee: '赵伟' },
  { id: 'INC-2024-0887', title: 'OSS Bucket 跨区域复制失败', status: 'processing', priority: 'medium', created_at: '3 小时前', assignee: '陈静' },
  { id: 'INC-2024-0886', title: 'ACK Ingress 证书即将过期', status: 'pending', priority: 'high', created_at: '4 小时前', assignee: '刘洋' },
  { id: 'INC-2024-0885', title: 'ECS 安全组规则变更审核', status: 'approved', priority: 'low', created_at: '5 小时前', assignee: '周琳' },
  { id: 'INC-2024-0884', title: 'Redis 内存使用率告警', status: 'completed', priority: 'medium', created_at: '6 小时前', assignee: '孙磊' },
];

const mockPlatformStatus: PlatformStatus = {
  connection_status: 'connected',
  endpoint: 'resolvenet.internal:443',
  sync_interval_seconds: 30,
  region: 'alibaba-cloud-east-01',
  latency_ms: 12,
  last_sync_at: '2026-04-08T09:45:00Z',
  cpu_usage_percent: 34,
  memory_usage_percent: 62,
  goroutines: 128,
  uptime_seconds: 172800,
};

// ─── Agent Execution History ───
const mockAgentExecutions: Record<string, AgentExecution[]> = {
  'agent-mega-001': [
    { id: 'aexec-001', agent_id: 'agent-mega-001', input_preview: 'ACK 集群 cn-hangzhou-prod 节点池扩容评估...', output_preview: '当前集群负载率 78%，建议扩容 2 个节点...', status: 'completed', route_type: 'multi', confidence: 0.91, duration_ms: 1230, created_at: '2026-04-08T09:12:00Z' },
    { id: 'aexec-002', agent_id: 'agent-mega-001', input_preview: 'production 命名空间 Pod 异常诊断...', output_preview: '发现 3 个 CrashLoopBackOff 的 Pod，原因是镜像拉取失败...', status: 'completed', route_type: 'multi', confidence: 0.88, duration_ms: 1540, created_at: '2026-04-08T08:30:00Z' },
    { id: 'aexec-003', agent_id: 'agent-mega-001', input_preview: 'etcd 集群健康检查...', output_preview: '3/3 members healthy，DB size 2.1GB，建议定期 compact...', status: 'completed', route_type: 'direct', confidence: 0.95, duration_ms: 890, created_at: '2026-04-07T16:00:00Z' },
    { id: 'aexec-004', agent_id: 'agent-mega-001', input_preview: 'HPA 配置审查...', output_preview: '当前 HPA min=2 max=10，建议调整 target CPU 到 70%...', status: 'completed', route_type: 'direct', confidence: 0.82, duration_ms: 1100, created_at: '2026-04-07T14:20:00Z' },
  ],
  'agent-fta-002': [
    { id: 'aexec-005', agent_id: 'agent-fta-002', input_preview: 'K8s 节点 cn-hz-03 NotReady...', output_preview: '根因定位：NetworkPolicy 误配置导致 kubelet 心跳被 Drop...', status: 'completed', route_type: 'fta', confidence: 0.87, duration_ms: 12340, created_at: '2026-04-08T08:15:00Z' },
    { id: 'aexec-006', agent_id: 'agent-fta-002', input_preview: '节点 cn-hz-07 进入 NotReady...', output_preview: '根因定位：节点内存 OOM，kubelet 进程被 Kill...', status: 'completed', route_type: 'fta', confidence: 0.92, duration_ms: 18200, created_at: '2026-04-07T14:30:00Z' },
    { id: 'aexec-007', agent_id: 'agent-fta-002', input_preview: '多节点同时 NotReady 告警...', output_preview: '分析失败：无法连接到目标集群 API Server...', status: 'failed', route_type: 'fta', confidence: 0.45, duration_ms: 30000, created_at: '2026-04-06T22:00:00Z' },
  ],
  'agent-rag-003': [
    { id: 'aexec-008', agent_id: 'agent-rag-003', input_preview: 'RDS MySQL 主从同步延迟怎么排查?', output_preview: '常见原因包括大事务阻塞、从库规格不足、binlog 传输延迟...', status: 'completed', route_type: 'rag', confidence: 0.84, duration_ms: 650, created_at: '2026-04-08T09:00:00Z' },
    { id: 'aexec-009', agent_id: 'agent-rag-003', input_preview: 'ACK Ingress 如何配置 HTTPS?', output_preview: '通过 annotations 配置 SLB 证书，支持自动续期...', status: 'completed', route_type: 'rag', confidence: 0.91, duration_ms: 480, created_at: '2026-04-08T08:00:00Z' },
    { id: 'aexec-010', agent_id: 'agent-rag-003', input_preview: 'ECS 磁盘在线扩容步骤是什么?', output_preview: '1. 控制台扩容云盘 2. SSH 登录执行 growpart 3. resize2fs...', status: 'completed', route_type: 'rag', confidence: 0.89, duration_ms: 520, created_at: '2026-04-07T15:30:00Z' },
  ],
  'agent-skill-004': [
    { id: 'aexec-011', agent_id: 'agent-skill-004', input_preview: 'INC-2024-0891 ECS CPU 高负载工单...', output_preview: '优先级 P1，影响范围：生产环境 cn-hangzhou，建议立即响应...', status: 'completed', route_type: 'skill', confidence: 0.93, duration_ms: 820, created_at: '2026-04-08T09:12:00Z' },
    { id: 'aexec-012', agent_id: 'agent-skill-004', input_preview: 'INC-2024-0890 SLB 健康检查失败...', output_preview: '优先级 P0，涉及组件 SLB + ECS，已自动指派给 SRE 值班...', status: 'completed', route_type: 'skill', confidence: 0.96, duration_ms: 750, created_at: '2026-04-08T08:45:00Z' },
    { id: 'aexec-013', agent_id: 'agent-skill-004', input_preview: 'INC-2024-0885 安全组规则变更审核...', output_preview: '优先级 P3，常规变更，建议在变更窗口内执行...', status: 'completed', route_type: 'skill', confidence: 0.88, duration_ms: 680, created_at: '2026-04-07T10:00:00Z' },
  ],
  'agent-fta-007': [
    { id: 'aexec-014', agent_id: 'agent-fta-007', input_preview: 'RDS rm-2ze-001 同步延迟 15s...', output_preview: '根因：批量 UPDATE 影响 52 万行导致 SQL 线程阻塞...', status: 'completed', route_type: 'fta', confidence: 0.89, duration_ms: 25100, created_at: '2026-04-07T16:20:00Z' },
    { id: 'aexec-015', agent_id: 'agent-fta-007', input_preview: 'RDS rm-2ze-003 同步延迟 8s...', output_preview: '根因：从库 CPU 使用率 98%，建议升级从库规格...', status: 'completed', route_type: 'fta', confidence: 0.85, duration_ms: 15200, created_at: '2026-04-06T11:00:00Z' },
  ],
};

// ─── Agent Runtime Status ───
const mockAgentStatuses: Record<string, AgentRuntimeStatus> = {
  'agent-mega-001': { uptime_seconds: 172800, total_executions: 1247, success_rate: 0.96, avg_latency_ms: 1180, last_execution_at: '2026-04-08T09:12:00Z', error_count_24h: 3, memory_mb: 256 },
  'agent-fta-002': { uptime_seconds: 172800, total_executions: 523, success_rate: 0.91, avg_latency_ms: 15600, last_execution_at: '2026-04-08T08:15:00Z', error_count_24h: 5, memory_mb: 512 },
  'agent-rag-003': { uptime_seconds: 172800, total_executions: 2891, success_rate: 0.98, avg_latency_ms: 550, last_execution_at: '2026-04-08T09:00:00Z', error_count_24h: 1, memory_mb: 384 },
  'agent-skill-004': { uptime_seconds: 172800, total_executions: 1893, success_rate: 0.97, avg_latency_ms: 760, last_execution_at: '2026-04-08T09:12:00Z', error_count_24h: 2, memory_mb: 192 },
  'agent-custom-005': { uptime_seconds: 0, total_executions: 89, success_rate: 0.85, avg_latency_ms: 2100, last_execution_at: '2026-03-28T18:00:00Z', error_count_24h: 0, memory_mb: 0 },
  'agent-mega-006': { uptime_seconds: 3600, total_executions: 342, success_rate: 0.42, avg_latency_ms: 8900, last_execution_at: '2026-04-08T06:00:00Z', error_count_24h: 37, memory_mb: 890 },
  'agent-fta-007': { uptime_seconds: 172800, total_executions: 267, success_rate: 0.94, avg_latency_ms: 20100, last_execution_at: '2026-04-07T16:20:00Z', error_count_24h: 1, memory_mb: 480 },
};

// ─── Settings ───
const mockSettings: SystemSettings = {
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
    build_date: '2026-04-07T10:00:00Z',
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
const executeResponses: Record<string, (message: string) => { content: string; metadata: Record<string, unknown> }> = {
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
> 📎 来源：历史故障复盘 INC-2024-0673`,
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
const mockAgentOverviews: AgentOverview[] = [
  { id: 'agent-mega-001', name: 'ACK 集群运维助手', type: 'mega', status: 'active', success_rate: 0.96, total_executions: 1247, avg_latency_ms: 1180, last_execution_at: '2026-04-08T09:12:00Z', error_count_24h: 3, uptime_seconds: 172800, memory_mb: 256 },
  { id: 'agent-fta-002', name: '故障根因分析引擎', type: 'fta', status: 'active', success_rate: 0.91, total_executions: 523, avg_latency_ms: 15600, last_execution_at: '2026-04-08T08:15:00Z', error_count_24h: 5, uptime_seconds: 172800, memory_mb: 512 },
  { id: 'agent-rag-003', name: '运维知识问答', type: 'rag', status: 'active', success_rate: 0.98, total_executions: 2891, avg_latency_ms: 550, last_execution_at: '2026-04-08T09:00:00Z', error_count_24h: 1, uptime_seconds: 172800, memory_mb: 384 },
  { id: 'agent-skill-004', name: '工单自动处理', type: 'skill', status: 'active', success_rate: 0.97, total_executions: 1893, avg_latency_ms: 760, last_execution_at: '2026-04-08T09:12:00Z', error_count_24h: 2, uptime_seconds: 172800, memory_mb: 192 },
  { id: 'agent-custom-005', name: 'SLB 流量分析', type: 'custom', status: 'inactive', success_rate: 0.85, total_executions: 89, avg_latency_ms: 2100, last_execution_at: '2026-03-28T18:00:00Z', error_count_24h: 0, uptime_seconds: 0, memory_mb: 0 },
  { id: 'agent-mega-006', name: '变更风险评估', type: 'mega', status: 'error', success_rate: 0.42, total_executions: 342, avg_latency_ms: 8900, last_execution_at: '2026-04-08T06:00:00Z', error_count_24h: 37, uptime_seconds: 3600, memory_mb: 890 },
  { id: 'agent-fta-007', name: 'RDS 主从同步诊断', type: 'fta', status: 'active', success_rate: 0.94, total_executions: 267, avg_latency_ms: 20100, last_execution_at: '2026-04-07T16:20:00Z', error_count_24h: 1, uptime_seconds: 172800, memory_mb: 480 },
];

// ─── Activity Events ───
const mockActivityEvents: ActivityEvent[] = [
  { id: 'evt-001', agent_id: 'agent-mega-001', agent_name: 'ACK 集群运维助手', agent_type: 'mega', event_type: 'execution', description: 'ACK 集群 cn-hangzhou-prod 节点池扩容评估完成', status: 'completed', timestamp: '2026-04-08T09:12:00Z', duration_ms: 1230, route_type: 'multi' },
  { id: 'evt-002', agent_id: 'agent-skill-004', agent_name: '工单自动处理', agent_type: 'skill', event_type: 'execution', description: 'INC-2024-0891 ECS CPU 高负载工单分析完成', status: 'completed', timestamp: '2026-04-08T09:12:00Z', duration_ms: 820, route_type: 'skill' },
  { id: 'evt-003', agent_id: 'agent-mega-006', agent_name: '变更风险评估', agent_type: 'mega', event_type: 'error', description: '合规检查 API 超时，连续第 3 次失败', status: 'failed', timestamp: '2026-04-08T09:05:00Z', duration_ms: 30000 },
  { id: 'evt-004', agent_id: 'agent-rag-003', agent_name: '运维知识问答', agent_type: 'rag', event_type: 'execution', description: 'RDS MySQL 主从同步延迟排查知识检索', status: 'completed', timestamp: '2026-04-08T09:00:00Z', duration_ms: 650, route_type: 'rag' },
  { id: 'evt-005', agent_id: 'agent-fta-002', agent_name: '故障根因分析引擎', agent_type: 'fta', event_type: 'execution', description: 'K8s 节点 NotReady 故障树分析完成', status: 'completed', timestamp: '2026-04-08T08:15:00Z', duration_ms: 12340, route_type: 'fta' },
  { id: 'evt-006', agent_id: 'agent-fta-002', agent_name: '故障根因分析引擎', agent_type: 'fta', event_type: 'execution', description: 'K8s 节点 cn-hz-03 NotReady 诊断中', status: 'running', timestamp: '2026-04-08T09:50:00Z' },
  { id: 'evt-007', agent_id: 'agent-mega-006', agent_name: '变更风险评估', agent_type: 'mega', event_type: 'alert', description: 'Agent 错误率超过阈值 (42% > 10%)', status: 'warning', timestamp: '2026-04-08T06:00:00Z' },
  { id: 'evt-008', agent_id: 'agent-skill-004', agent_name: '工单自动处理', agent_type: 'skill', event_type: 'execution', description: 'INC-2024-0890 SLB 健康检查失败工单处理', status: 'completed', timestamp: '2026-04-08T08:45:00Z', duration_ms: 750, route_type: 'skill' },
  { id: 'evt-009', agent_id: 'agent-custom-005', agent_name: 'SLB 流量分析', agent_type: 'custom', event_type: 'status_change', description: 'Agent 已停止，最后执行于 2026-03-28', status: 'info', timestamp: '2026-03-28T18:00:00Z' },
  { id: 'evt-010', agent_id: 'agent-fta-007', agent_name: 'RDS 主从同步诊断', agent_type: 'fta', event_type: 'execution', description: 'RDS rm-2ze-001 同步延迟诊断完成', status: 'completed', timestamp: '2026-04-07T16:20:00Z', duration_ms: 25100, route_type: 'fta' },
  { id: 'evt-011', agent_id: 'agent-mega-001', agent_name: 'ACK 集群运维助手', agent_type: 'mega', event_type: 'execution', description: 'etcd 集群健康检查完成', status: 'completed', timestamp: '2026-04-07T16:00:00Z', duration_ms: 890, route_type: 'direct' },
  { id: 'evt-012', agent_id: 'agent-mega-006', agent_name: '变更风险评估', agent_type: 'mega', event_type: 'deployment', description: 'Agent 重启 (v0.9.2 → v0.9.3)', status: 'info', timestamp: '2026-04-08T05:00:00Z' },
];

// ─── Execution Stats ───
const mockExecutionStats: ExecutionStats = {
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
const mockAlerts: AlertItem[] = [
  { id: 'alert-001', severity: 'critical', agent_id: 'agent-mega-006', agent_name: '变更风险评估', title: 'Agent 错误率过高', description: '过去 24h 错误率 42%，远超 10% 阈值。合规检查 API 连续超时。', created_at: '2026-04-08T06:00:00Z', acknowledged: false },
  { id: 'alert-002', severity: 'high', agent_id: 'agent-fta-002', agent_name: '故障根因分析引擎', title: '根因分析执行失败', description: '多节点 NotReady 告警时无法连接 API Server，分析中断。', created_at: '2026-04-06T22:00:00Z', acknowledged: false },
  { id: 'alert-003', severity: 'medium', agent_id: 'agent-mega-001', agent_name: 'ACK 集群运维助手', title: '内存使用接近阈值', description: 'Agent 进程内存 256MB，接近 300MB 警戒线。', created_at: '2026-04-08T04:30:00Z', acknowledged: true },
  { id: 'alert-004', severity: 'low', agent_id: 'agent-custom-005', agent_name: 'SLB 流量分析', title: 'Agent 已停止超过 10 天', description: '最后执行时间 2026-03-28，建议检查是否需要重启。', created_at: '2026-04-07T09:00:00Z', acknowledged: true },
];

// ─── Mock Solutions ───
const mockSolutions: TroubleshootingSolution[] = [
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
    created_at: '2026-03-15T10:00:00Z',
    updated_at: '2026-04-01T08:30:00Z',
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
    created_at: '2026-03-20T14:00:00Z',
    updated_at: '2026-04-05T11:20:00Z',
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
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-10T16:45:00Z',
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
    created_at: '2026-04-10T08:00:00Z',
    updated_at: '2026-04-10T08:00:00Z',
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
    created_at: '2026-04-10T08:00:00Z',
    updated_at: '2026-04-10T08:00:00Z',
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
    created_at: '2026-04-10T08:00:00Z',
    updated_at: '2026-04-10T08:00:00Z',
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
    created_at: '2026-04-10T08:00:00Z',
    updated_at: '2026-04-10T08:00:00Z',
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
    created_at: '2026-04-10T08:00:00Z',
    updated_at: '2026-04-10T08:00:00Z',
  },
];

const mockSolutionExecutions: Record<string, SolutionExecution[]> = {
  'sol-001': [
    {
      id: 'exec-001',
      solution_id: 'sol-001',
      executor: 'agent-mega-001',
      trigger_context: { ticket_id: 'TK-2026041201' },
      status: 'success',
      outcome_notes: 'OOM 问题确认，调整 memory limits 后恢复',
      effectiveness_score: 0.92,
      duration_ms: 45000,
      started_at: '2026-04-12T10:30:00Z',
      completed_at: '2026-04-12T10:30:45Z',
      created_at: '2026-04-12T10:30:45Z',
    },
  ],
};

// ─── Mock API 实现 ───
export const mockApi = {
  health: async () => {
    await randomDelay();
    return { status: 'ok' };
  },

  // ── Agents ──
  listAgents: async () => {
    await randomDelay();
    return { agents: [...mockAgents], total: mockAgents.length };
  },

  getAgent: async (id: string) => {
    await randomDelay();
    const agent = mockAgents.find((a) => a.id === id);
    if (!agent) throw new Error('Agent not found');
    return { ...agent };
  },

  createAgent: async (data: CreateAgentRequest) => {
    await delay(600);
    const newAgent: Agent = {
      id: `agent-${data.type}-${String(Date.now()).slice(-4)}`,
      name: data.name,
      type: data.type,
      status: 'active',
      mode: 'selector',
      harness: {
        ...defaultHarness,
        system_prompt: data.system_prompt ?? '',
      },
      config: {
        model: data.model,
        created_at: new Date().toISOString(),
      },
    };
    mockAgents = [newAgent, ...mockAgents];
    return newAgent;
  },

  deleteAgent: async (id: string) => {
    await delay(400);
    mockAgents = mockAgents.filter((a) => a.id !== id);
  },

  getAgentExecutions: async (agentId: string) => {
    await randomDelay();
    const executions = mockAgentExecutions[agentId] ?? [];
    return { executions: [...executions], total: executions.length };
  },

  getAgentStatus: async (agentId: string) => {
    await randomDelay();
    const status = mockAgentStatuses[agentId];
    if (!status) throw new Error('Agent status not found');
    return { ...status };
  },

  executeAgent: async (id: string, message: string) => {
    await delay(800 + Math.random() * 1200);
    const agent = mockAgents.find((a) => a.id === id);
    const agentType = agent?.type ?? 'mega';
    const responder = executeResponses[agentType] ?? executeResponses.mega!;
    const result = responder!(message);
    return {
      agent_id: id,
      response: result.content,
      content: result.content,
      metadata: result.metadata,
    };
  },

  // ── Skills ──
  listSkills: async () => {
    await randomDelay();
    return { skills: [...mockSkills], total: mockSkills.length };
  },

  getSkill: async (name: string) => {
    await randomDelay();
    const skill = mockSkillDetails[name];
    if (!skill) throw new Error('Skill not found');
    return { ...skill };
  },

  // ── Workflows ──
  listWorkflows: async () => {
    await randomDelay();
    return { workflows: [...mockWorkflows], total: mockWorkflows.length };
  },

  listWorkflowDetails: async () => {
    await randomDelay();
    return { workflows: [...mockWorkflowDetails], total: mockWorkflowDetails.length };
  },

  getWorkflow: async (id: string) => {
    await randomDelay();
    const wf = mockWorkflowDetails.find((w) => w.id === id);
    if (!wf) throw new Error('Workflow not found');
    return { ...wf };
  },

  getWorkflowFaultTree: async (workflowId: string) => {
    await randomDelay();
    const tree = mockFaultTrees[workflowId];
    if (!tree) throw new Error('Fault tree not found');
    return { ...tree, events: [...tree.events], gates: [...tree.gates] };
  },

  updateWorkflowFaultTree: async (workflowId: string, tree: FaultTree) => {
    await randomDelay();
    mockFaultTrees[workflowId] = { ...tree };
    return tree;
  },

  createWorkflowFaultTree: async (workflowId: string, tree: FaultTree) => {
    await randomDelay();
    mockFaultTrees[workflowId] = { ...tree };
    return tree;
  },

  listWorkflowExecutions: async (workflowId?: string) => {
    await randomDelay();
    const executions = workflowId
      ? mockWorkflowExecutions.filter((e) => e.workflow_id === workflowId)
      : mockWorkflowExecutions;
    return { executions: [...executions], total: executions.length };
  },

  // ── RAG ──
  listCollections: async () => {
    await randomDelay();
    return { collections: [...mockCollections], total: mockCollections.length };
  },

  listCollectionDetails: async () => {
    await randomDelay();
    return { collections: [...mockCollectionDetails], total: mockCollectionDetails.length };
  },

  getCollection: async (id: string) => {
    await randomDelay();
    const col = mockCollectionDetails.find((c) => c.id === id);
    if (!col) throw new Error('Collection not found');
    return { ...col };
  },

  listDocuments: async (collectionId?: string) => {
    await randomDelay();
    const docs = collectionId
      ? mockDocuments.filter((d) => d.collection_id === collectionId)
      : mockDocuments;
    return { documents: [...docs], total: docs.length };
  },

  // ── Dashboard ──
  getDashboardMetrics: async () => {
    await randomDelay();
    return { ...mockDashboardMetrics };
  },

  listTickets: async () => {
    await randomDelay();
    return { tickets: [...mockTickets], total: mockTickets.length };
  },

  getPlatformStatus: async () => {
    await randomDelay();
    return { ...mockPlatformStatus };
  },

  // ── Settings ──
  getSettings: async () => {
    await randomDelay();
    return { ...mockSettings, models: [...mockSettings.models] };
  },

  // ── System ──
  systemInfo: async () => {
    await randomDelay();
    return {
      version: '0.6.0',
      commit: 'a3f7c2e',
      build_date: '2026-04-07T10:00:00Z',
    };
  },

  // ── Dashboard Extensions ──
  getAgentOverviews: async () => {
    await randomDelay();
    return { agents: [...mockAgentOverviews], total: mockAgentOverviews.length };
  },

  getActivityEvents: async () => {
    await randomDelay();
    return { events: [...mockActivityEvents], total: mockActivityEvents.length };
  },

  getExecutionStats: async () => {
    await randomDelay();
    return { ...mockExecutionStats, by_route_type: [...mockExecutionStats.by_route_type], by_hour: [...mockExecutionStats.by_hour] };
  },

  getAlerts: async () => {
    await randomDelay();
    return { alerts: [...mockAlerts], total: mockAlerts.length };
  },

  // ── Solutions ──
  listSolutions: async () => {
    await randomDelay();
    return { solutions: [...mockSolutions], total: mockSolutions.length };
  },

  getSolution: async (id: string) => {
    await randomDelay();
    const sol = mockSolutions.find((s) => s.id === id);
    if (!sol) throw new Error('Solution not found');
    return { ...sol };
  },

  createSolution: async (data: Partial<TroubleshootingSolution>) => {
    await delay(600);
    const newSol: TroubleshootingSolution = {
      id: `sol-${String(Date.now()).slice(-6)}`,
      title: data.title ?? '',
      problem_symptoms: data.problem_symptoms ?? '',
      key_information: data.key_information ?? '',
      troubleshooting_steps: data.troubleshooting_steps ?? '',
      resolution_steps: data.resolution_steps ?? '',
      domain: data.domain ?? '',
      component: data.component ?? '',
      severity: data.severity ?? 'medium',
      tags: data.tags ?? [],
      search_keywords: data.search_keywords ?? '',
      version: 1,
      status: data.status ?? 'active',
      source_uri: '',
      rag_collection_id: '',
      rag_document_id: '',
      related_skill_names: data.related_skill_names ?? [],
      related_workflow_ids: data.related_workflow_ids ?? [],
      metadata: data.metadata ?? {},
      created_by: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockSolutions.unshift(newSol);
    return newSol;
  },

  updateSolution: async (id: string, data: Partial<TroubleshootingSolution>) => {
    await delay(400);
    const idx = mockSolutions.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Solution not found');
    const updated = { ...mockSolutions[idx], ...data, updated_at: new Date().toISOString() } as TroubleshootingSolution;
    mockSolutions[idx] = updated;
    return updated;
  },

  deleteSolution: async (id: string) => {
    await delay(400);
    const idx = mockSolutions.findIndex((s) => s.id === id);
    if (idx !== -1) mockSolutions.splice(idx, 1);
  },

  searchSolutions: async (opts: SolutionSearchOptions) => {
    await randomDelay();
    let results = [...mockSolutions];
    if (opts.domain) results = results.filter((s) => s.domain === opts.domain);
    if (opts.severity) results = results.filter((s) => s.severity === opts.severity);
    if (opts.keyword) {
      const kw = opts.keyword.toLowerCase();
      results = results.filter(
        (s) =>
          s.title.toLowerCase().includes(kw) ||
          s.problem_symptoms.toLowerCase().includes(kw) ||
          s.search_keywords.toLowerCase().includes(kw),
      );
    }
    return { solutions: results, total: results.length };
  },

  bulkCreateSolutions: async (solutions: Partial<TroubleshootingSolution>[]) => {
    await delay(800);
    for (const data of solutions) {
      const newSolution: TroubleshootingSolution = {
        id: data.id ?? `sol-${String(Date.now()).slice(-6)}`,
        title: data.title ?? '',
        problem_symptoms: data.problem_symptoms ?? '',
        key_information: data.key_information ?? '',
        troubleshooting_steps: data.troubleshooting_steps ?? '',
        resolution_steps: data.resolution_steps ?? '',
        domain: data.domain ?? '',
        component: data.component ?? '',
        severity: (data.severity as SolutionSeverity) ?? 'medium',
        tags: data.tags ?? [],
        search_keywords: data.search_keywords ?? '',
        version: data.version ?? 1,
        status: (data.status as 'active' | 'archived' | 'draft') ?? 'active',
        source_uri: data.source_uri ?? '',
        rag_collection_id: data.rag_collection_id ?? '',
        rag_document_id: data.rag_document_id ?? '',
        related_skill_names: data.related_skill_names ?? [],
        related_workflow_ids: data.related_workflow_ids ?? [],
        metadata: data.metadata ?? {},
        created_by: data.created_by ?? 'kudig-importer',
        created_at: data.created_at ?? new Date().toISOString(),
        updated_at: data.updated_at ?? new Date().toISOString(),
      };
      mockSolutions.push(newSolution);
    }
    return { created: solutions.length };
  },

  listSolutionExecutions: async (solutionId: string) => {
    await randomDelay();
    const execs = mockSolutionExecutions[solutionId] ?? [];
    return { executions: [...execs], total: execs.length };
  },

  recordSolutionExecution: async (solutionId: string, data: Partial<SolutionExecution>) => {
    await delay(400);
    const exec: SolutionExecution = {
      id: `exec-${String(Date.now()).slice(-6)}`,
      solution_id: solutionId,
      executor: data.executor ?? '',
      trigger_context: data.trigger_context ?? {},
      status: data.status ?? 'success',
      outcome_notes: data.outcome_notes ?? '',
      effectiveness_score: data.effectiveness_score ?? 0,
      duration_ms: data.duration_ms ?? 0,
      started_at: data.started_at ?? new Date().toISOString(),
      completed_at: data.completed_at ?? new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    return exec;
  },

  // ── Agent Update ──
  updateAgent: async (id: string, data: UpdateAgentRequest) => {
    await delay(600);
    const idx = mockAgents.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Agent not found');
    const agent = mockAgents[idx]!;
    const updated: Agent = {
      ...agent,
      name: data.name ?? agent.name,
      type: data.type ?? agent.type,
      status: data.status ?? agent.status,
      mode: data.mode ?? agent.mode,
      harness: {
        ...agent.harness,
        ...(data.harness ?? {}),
        system_prompt: data.system_prompt ?? data.harness?.system_prompt ?? agent.harness.system_prompt,
      },
      config: {
        ...agent.config,
        ...(data.config ?? {}),
        model: data.model ?? agent.config.model,
      },
    };
    mockAgents[idx] = updated;
    return updated;
  },

  // ── Memory ──
  listConversations: async (agentId: string) => {
    await randomDelay();
    const conversations: Conversation[] = [
      { id: 'conv-001', agent_id: agentId, user_id: 'user-zhangming', message_count: 12, created_at: '2026-04-08T09:00:00Z', updated_at: '2026-04-08T09:12:00Z' },
      { id: 'conv-002', agent_id: agentId, user_id: 'user-liqiang', message_count: 8, created_at: '2026-04-07T14:00:00Z', updated_at: '2026-04-07T14:30:00Z' },
      { id: 'conv-003', agent_id: agentId, user_id: 'user-wangfang', message_count: 5, created_at: '2026-04-06T10:00:00Z', updated_at: '2026-04-06T10:15:00Z' },
    ];
    return { conversations, total: conversations.length };
  },

  getConversation: async (_conversationId: string) => {
    await randomDelay();
    const messages: ConversationMessage[] = [
      { id: 'msg-001', conversation_id: _conversationId, role: 'system', content: '你是一个专注于阿里云 ACK 容器服务的运维助手。', token_count: 45, sequence: 0, created_at: '2026-04-08T09:00:00Z' },
      { id: 'msg-002', conversation_id: _conversationId, role: 'user', content: 'ACK 集群 cn-hangzhou-prod 有节点 NotReady，帮我排查一下', token_count: 32, sequence: 1, created_at: '2026-04-08T09:01:00Z' },
      { id: 'msg-003', conversation_id: _conversationId, role: 'assistant', content: '好的，我来检查集群状态。发现节点 cn-hz-03 处于 NotReady 状态，原因是 kubelet 心跳超时。正在进一步分析网络策略...', token_count: 68, sequence: 2, created_at: '2026-04-08T09:01:30Z' },
      { id: 'msg-004', conversation_id: _conversationId, role: 'user', content: '是不是最近有人改了 NetworkPolicy？', token_count: 18, sequence: 3, created_at: '2026-04-08T09:02:00Z' },
      { id: 'msg-005', conversation_id: _conversationId, role: 'assistant', content: '确认了，变更单 CHG-2024-0156 在 10:23 修改了 calico NetworkPolicy，误将 kubelet 10250 端口的入方向流量 deny 掉了。建议恢复该规则。', token_count: 85, sequence: 4, created_at: '2026-04-08T09:02:30Z' },
    ];
    return { messages, total: messages.length };
  },

  deleteConversation: async (_conversationId: string) => {
    await delay(300);
  },

  searchLongTermMemory: async (agentId: string) => {
    await randomDelay();
    const memories: LongTermMemory[] = [
      { id: 'ltm-001', agent_id: agentId, user_id: 'user-zhangming', memory_type: 'pattern', content: 'NetworkPolicy 变更是导致节点 NotReady 的常见原因，应优先检查最近的 calico 规则变更', importance: 0.92, access_count: 15, metadata: {}, created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-08T09:12:00Z', expires_at: null },
      { id: 'ltm-002', agent_id: agentId, user_id: 'user-liqiang', memory_type: 'fact', content: '集群 cn-hangzhou-prod 使用 Flannel VXLAN 网络模式，非 Calico', importance: 0.78, access_count: 8, metadata: {}, created_at: '2026-03-20T14:00:00Z', updated_at: '2026-04-05T11:00:00Z', expires_at: null },
      { id: 'ltm-003', agent_id: agentId, user_id: 'user-wangfang', memory_type: 'summary', content: '用户 wangfang 主要关注 RDS 相关问题，偏好简洁的排查步骤而非详细分析', importance: 0.65, access_count: 4, metadata: {}, created_at: '2026-04-01T09:00:00Z', updated_at: '2026-04-06T10:15:00Z', expires_at: '2026-07-01T00:00:00Z' },
      { id: 'ltm-004', agent_id: agentId, user_id: 'system', memory_type: 'skill_learned', content: '对于内存 OOM 问题，检查 /proc/meminfo 和 dmesg 日志比查看 Prometheus 指标更高效', importance: 0.85, access_count: 22, metadata: {}, created_at: '2026-03-10T08:00:00Z', updated_at: '2026-04-07T16:00:00Z', expires_at: null },
    ];
    return { memories, total: memories.length };
  },

  deleteLongTermMemory: async (_memoryId: string) => {
    await delay(300);
  },

  pruneMemories: async () => {
    await delay(500);
    return { pruned: 3 };
  },

  // ── Execution Detail ──
  getAgentExecutionDetail: async (_agentId: string, execId: string) => {
    await randomDelay();
    const base = Object.values(mockAgentExecutions).flat().find((e) => e.id === execId);
    if (!base) throw new Error('Execution not found');
    const detail: AgentExecutionDetail = {
      ...base,
      input_full: base.input_preview.replace('...', '。请提供详细的分析报告，包括可能的根因和修复建议。'),
      output_full: base.output_preview.replace('...', '。\n\n**详细分析**\n\n经过多维度排查，确认问题根因如下...'),
      pipeline_trace: {
        input: base.input_preview,
        strategy: 'hybrid',
        intent: { intent_type: 'workflow', confidence: 0.87, entities: ['node', 'NotReady'], metadata: {}, sub_intents: [], suggested_target: 'ft-k8s-node-notready' },
        enriched_context: { available_skills: ['log-analyzer', 'metric-alerter'], active_workflows: ['wf-001'], rag_collections: [], code_context: null },
        decision: { route_type: base.route_type, route_target: 'ft-k8s-node-notready', confidence: base.confidence, parameters: {}, reasoning: '匹配 FTA 故障树分析场景' },
        pipeline_latency_ms: 45,
      },
      hook_logs: [
        { hook_name: '上下文压缩', hook_type: 'pre_execution', status: 'success', duration_ms: 12, input_preview: '历史上下文 8 条消息', output_preview: '压缩为 3 条核心消息', timestamp: '2026-04-08T09:12:00Z' },
        { hook_name: '执行日志', hook_type: 'post_execution', status: 'success', duration_ms: 5, input_preview: '执行结果', output_preview: '已记录到 trace-001', timestamp: '2026-04-08T09:12:01Z' },
      ],
      memory_context: [
        { id: 'ctx-001', conversation_id: 'conv-001', role: 'system', content: '你是 ACK 运维助手', token_count: 20, sequence: 0, created_at: '2026-04-08T09:00:00Z' },
        { id: 'ctx-002', conversation_id: 'conv-001', role: 'user', content: base.input_preview, token_count: 32, sequence: 1, created_at: '2026-04-08T09:12:00Z' },
      ],
      error_detail: base.status === 'failed' ? '连接超时：无法连接到目标集群 API Server (10.0.1.100:6443)，超过 30s 重试上限' : null,
      timing_breakdown: { selector_ms: 45, pre_hook_ms: 12, llm_inference_ms: base.duration_ms - 70, post_hook_ms: 5, total_ms: base.duration_ms },
    };
    return detail;
  },

  // ── Analytics ──
  getAgentAnalytics: async (agentId: string, _timeRange: string) => {
    await randomDelay();
    const status = mockAgentStatuses[agentId];
    const analytics: AgentAnalytics = {
      agent_id: agentId,
      time_range: _timeRange,
      kpis: {
        success_rate: status?.success_rate ?? 0.9,
        success_rate_trend: { value: 2.1, direction: 'up' },
        avg_latency_ms: status?.avg_latency_ms ?? 1000,
        avg_latency_trend: { value: 5, direction: 'down' },
        total_executions: status?.total_executions ?? 100,
        execution_trend: { value: 8, direction: 'up' },
        error_rate: 1 - (status?.success_rate ?? 0.9),
        error_rate_trend: { value: 1.5, direction: 'down' },
      },
      execution_timeline: [
        { hour: '00', count: 5, success_count: 5, failed_count: 0 },
        { hour: '04', count: 2, success_count: 2, failed_count: 0 },
        { hour: '08', count: 15, success_count: 14, failed_count: 1 },
        { hour: '12', count: 22, success_count: 21, failed_count: 1 },
        { hour: '16', count: 18, success_count: 17, failed_count: 1 },
        { hour: '20', count: 10, success_count: 9, failed_count: 1 },
      ],
      latency_percentiles: { p50: 800, p75: 1200, p90: 2500, p95: 5000, p99: 15000 },
      route_distribution: [
        { route_type: 'fta', count: 120, percentage: 35, avg_confidence: 0.87 },
        { route_type: 'skill', count: 95, percentage: 28, avg_confidence: 0.93 },
        { route_type: 'rag', count: 68, percentage: 20, avg_confidence: 0.89 },
        { route_type: 'direct', count: 40, percentage: 12, avg_confidence: 0.95 },
        { route_type: 'multi', count: 17, percentage: 5, avg_confidence: 0.82 },
      ],
      confidence_histogram: [
        { bucket: '0.5-0.6', count: 12 },
        { bucket: '0.6-0.7', count: 28 },
        { bucket: '0.7-0.8', count: 65 },
        { bucket: '0.8-0.9', count: 142 },
        { bucket: '0.9-1.0', count: 93 },
      ],
      top_errors: [
        { error_type: 'API Server 连接超时', count: 5, last_seen: '2026-04-08T06:00:00Z' },
        { error_type: 'LLM 推理超时', count: 3, last_seen: '2026-04-07T22:10:00Z' },
        { error_type: '技能执行失败', count: 2, last_seen: '2026-04-07T14:00:00Z' },
      ],
    };
    return analytics;
  },

  // ── Diagnostics ──
  getAgentDiagnostics: async (agentId: string) => {
    await delay(800);
    const agent = mockAgents.find((a) => a.id === agentId);
    const status = mockAgentStatuses[agentId];
    const isError = agent?.status === 'error';
    const executions = mockAgentExecutions[agentId] ?? [];
    const failedExecs = executions.filter((e) => e.status === 'failed');
    const result: AgentDiagnosticsResult = {
      agent_id: agentId,
      health_score: isError ? 35 : 92,
      overall_status: isError ? 'failed' : 'healthy',
      checks: [
        { name: '运行时进程', category: 'runtime', status: isError ? 'warning' : 'pass', message: isError ? '进程频繁重启' : '进程运行正常', detail: null },
        { name: '内存使用', category: 'runtime', status: (status?.memory_mb ?? 0) > 800 ? 'warning' : 'pass', message: `当前内存 ${status?.memory_mb ?? 0} MB`, detail: null },
        { name: 'Skills 可用性', category: 'config', status: 'pass', message: `所有 ${agent?.harness.skills.length ?? 0} 个 Skills 可用`, detail: null },
        { name: 'Tools 可达性', category: 'config', status: isError ? 'fail' : 'pass', message: isError ? 'change-management-api 连接失败' : '所有 Tools 连接正常', detail: isError ? '连续 37 次调用超时，最后成功时间 2026-04-07T18:00:00Z' : null },
        { name: 'LLM 端点', category: 'connectivity', status: 'pass', message: `模型 ${agent?.config.model ?? '未知'} 可用`, detail: null },
        { name: '向量库连接', category: 'connectivity', status: 'pass', message: 'Milvus 连接正常', detail: null },
        { name: '成功率', category: 'performance', status: (status?.success_rate ?? 1) < 0.8 ? 'fail' : 'pass', message: `当前成功率 ${((status?.success_rate ?? 0) * 100).toFixed(1)}%`, detail: (status?.success_rate ?? 1) < 0.8 ? '低于 80% 阈值' : null },
        { name: '延迟', category: 'performance', status: (status?.avg_latency_ms ?? 0) > 5000 ? 'warning' : 'pass', message: `平均延迟 ${status?.avg_latency_ms ?? 0}ms`, detail: null },
        { name: 'Hooks 功能', category: 'dependency', status: 'pass', message: `${agent?.harness.hooks.filter(h => h.enabled).length ?? 0} 个 Hook 正常运行`, detail: null },
      ],
      recent_errors: failedExecs.slice(0, 5),
      checked_at: new Date().toISOString(),
    };
    return result;
  },

  // ── Deployment ──
  getAgentDeployment: async (agentId: string) => {
    await randomDelay();
    const agent = mockAgents.find((a) => a.id === agentId);
    const info: DeploymentInfo = {
      agent_id: agentId,
      state: agent?.status === 'inactive' ? 'undeployed' : 'deployed',
      replicas: agent?.status === 'inactive' ? 0 : 1,
      desired_replicas: 1,
      cpu_limit: '500m',
      memory_limit: '512Mi',
      auto_scale: false,
      uptime_seconds: mockAgentStatuses[agentId]?.uptime_seconds ?? 0,
    };
    return info;
  },

  getAgentDeploymentVersions: async (_agentId: string) => {
    await randomDelay();
    const versions: DeploymentVersion[] = [
      { version: 'v0.9.3', deployed_at: '2026-04-08T05:00:00Z', deployer: 'system', status: 'success', config_changes: '更新系统提示词，调整 temperature 参数' },
      { version: 'v0.9.2', deployed_at: '2026-04-05T14:00:00Z', deployer: 'zhangming', status: 'success', config_changes: '添加 change-reviewer 技能' },
      { version: 'v0.9.1', deployed_at: '2026-04-01T10:00:00Z', deployer: 'liqiang', status: 'success', config_changes: '初始部署' },
    ];
    return { versions };
  },

  getAgentLogs: async (_agentId: string) => {
    await randomDelay();
    const logs: DeploymentLog[] = [
      { timestamp: '2026-04-08T09:12:01Z', level: 'info', message: '[agent] Execution completed: aexec-001, route=multi, duration=1230ms' },
      { timestamp: '2026-04-08T09:12:00Z', level: 'info', message: '[selector] Route decision: multi (confidence=0.91)' },
      { timestamp: '2026-04-08T09:11:59Z', level: 'info', message: '[hook] pre_execution: compaction completed in 12ms' },
      { timestamp: '2026-04-08T09:05:00Z', level: 'error', message: '[agent] Execution failed: change-management-api timeout after 30s' },
      { timestamp: '2026-04-08T09:00:00Z', level: 'info', message: '[memory] Loaded 12 messages from conversation conv-001' },
      { timestamp: '2026-04-08T08:30:00Z', level: 'info', message: '[agent] Execution completed: aexec-002, route=multi, duration=1540ms' },
      { timestamp: '2026-04-08T05:00:00Z', level: 'info', message: '[deploy] Agent restarted: v0.9.2 → v0.9.3' },
      { timestamp: '2026-04-08T04:59:00Z', level: 'warn', message: '[runtime] Memory usage 256MB approaching 300MB threshold' },
    ];
    return { logs };
  },

  deployAgent: async (agentId: string) => {
    await delay(1000);
    return { agent_id: agentId, state: 'deployed' as const, replicas: 1, desired_replicas: 1, cpu_limit: '500m', memory_limit: '512Mi', auto_scale: false, uptime_seconds: 0 };
  },

  undeployAgent: async (_agentId: string) => {
    await delay(800);
  },

  scaleAgent: async (agentId: string, replicas: number) => {
    await delay(600);
    return { agent_id: agentId, state: 'deployed' as const, replicas, desired_replicas: replicas, cpu_limit: '500m', memory_limit: '512Mi', auto_scale: false, uptime_seconds: 172800 };
  },

  // ── Collaboration ──
  listCollaborationSessions: async () => {
    await randomDelay();
    const sessions: CollaborationSession[] = [
      { id: 'collab-001', name: '跨系统故障联合诊断', pattern: 'fan_out_fan_in', agents: ['agent-mega-001', 'agent-fta-002', 'agent-rag-003'], status: 'completed', started_at: '2026-04-08T08:00:00Z', completed_at: '2026-04-08T08:05:00Z', duration_ms: 300000 },
      { id: 'collab-002', name: 'K8s + RDS 关联分析', pattern: 'sequential', agents: ['agent-fta-002', 'agent-fta-007'], status: 'completed', started_at: '2026-04-07T16:00:00Z', completed_at: '2026-04-07T16:10:00Z', duration_ms: 600000 },
    ];
    return { sessions, total: sessions.length };
  },

  // ── Access Control ──
  listAccessRules: async (agentId: string) => {
    await randomDelay();
    const rules: AccessRule[] = [
      { id: 'acl-001', agent_id: agentId, user_or_role: 'admin', role: 'admin', permissions: { view: true, execute: true, edit: true, admin: true }, created_at: '2026-03-01T08:00:00Z' },
      { id: 'acl-002', agent_id: agentId, user_or_role: 'sre-team', role: 'operator', permissions: { view: true, execute: true, edit: false, admin: false }, created_at: '2026-03-05T10:00:00Z' },
      { id: 'acl-003', agent_id: agentId, user_or_role: 'dev-team', role: 'viewer', permissions: { view: true, execute: false, edit: false, admin: false }, created_at: '2026-03-10T14:00:00Z' },
    ];
    return { rules, total: rules.length };
  },

  getAuditLog: async (_agentId: string) => {
    await randomDelay();
    const entries: AuditLogEntry[] = [
      { id: 'audit-001', agent_id: _agentId, user: 'zhangming', action: 'execute', detail: '执行了故障排查任务', timestamp: '2026-04-08T09:12:00Z' },
      { id: 'audit-002', agent_id: _agentId, user: 'system', action: 'deploy', detail: '自动部署 v0.9.3', timestamp: '2026-04-08T05:00:00Z' },
      { id: 'audit-003', agent_id: _agentId, user: 'liqiang', action: 'edit', detail: '修改系统提示词', timestamp: '2026-04-05T14:00:00Z' },
    ];
    return { entries, total: entries.length };
  },

  // ── Templates ──
  listAgentTemplates: async () => {
    await randomDelay();
    const templates: AgentTemplate[] = [
      { id: 'tpl-001', name: 'ACK 运维助手', description: '专注于阿里云 ACK 容器服务的综合运维智能体', type: 'mega', category: 'ops', icon: '🎯', model: 'qwen-max', system_prompt: '你是一个专注于阿里云 ACK 容器服务的运维助手。', tools: ['kubectl', 'prometheus-query', 'helm'], skills: ['log-analyzer', 'metric-alerter'], mode: 'selector' },
      { id: 'tpl-002', name: '故障分析引擎', description: '基于 FTA 方法论的系统性根因分析引擎', type: 'fta', category: 'analysis', icon: '🔍', model: 'qwen-plus', system_prompt: '你是一个故障树分析引擎。', tools: ['fault-tree-engine', 'log-query'], skills: ['log-analyzer'], mode: 'selector' },
      { id: 'tpl-003', name: '知识问答助手', description: '基于 RAG 语义检索的运维知识问答', type: 'rag', category: 'knowledge', icon: '📚', model: 'qwen-turbo', system_prompt: '你是运维知识问答助手。', tools: ['vector-search'], skills: ['consulting-qa'], mode: 'selector' },
      { id: 'tpl-004', name: '工单处理引擎', description: '自动分析和处理运维工单', type: 'skill', category: 'ops', icon: '🎫', model: 'qwen-plus', system_prompt: '你是工单自动处理引擎。', tools: ['ticket-api', 'notification-api'], skills: ['ticket-handler'], mode: 'all_skills' },
    ];
    return { templates, total: templates.length };
  },
};
