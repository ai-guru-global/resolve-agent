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
} from '../types';

// ─── 延迟模拟，让体验更真实 ───
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randomDelay = () => delay(200 + Math.random() * 400);

// ─── Agents ───
let mockAgents: Agent[] = [
  {
    id: 'agent-mega-001',
    name: 'ACK 集群运维助手',
    type: 'mega',
    status: 'active',
    config: {
      model: 'qwen-max',
      system_prompt: '你是一个专注于阿里云 ACK 容器服务的运维助手。负责集群健康巡检、Pod 异常诊断、节点扩缩容决策。',
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
    config: {
      model: 'qwen-plus',
      skills: ['ticket-handler', 'consulting-qa'],
      auto_assign: true,
      created_at: '2026-03-12T09:00:00Z',
    },
  },
  {
    id: 'agent-custom-005',
    name: 'SLB 流量分析',
    type: 'custom',
    status: 'inactive',
    config: {
      model: 'qwen-turbo',
      system_prompt: '分析 SLB 实例的流量模式，识别异常流量峰值，给出弹性伸缩建议。',
      data_source: 'prometheus',
      created_at: '2026-03-15T11:00:00Z',
    },
  },
  {
    id: 'agent-mega-006',
    name: '变更风险评估',
    type: 'mega',
    status: 'error',
    config: {
      model: 'qwen-max',
      system_prompt: '评估运维变更操作的风险等级，检查变更窗口合规性，生成变更审批建议。',
      risk_threshold: 0.6,
      created_at: '2026-03-18T16:00:00Z',
    },
  },
  {
    id: 'agent-fta-007',
    name: 'RDS 主从同步诊断',
    type: 'fta',
    status: 'active',
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
  { name: 'ticket-handler', version: '1.2.0', description: '自动分析运维工单，提取关键信息，评估优先级，生成处理建议', status: 'installed' },
  { name: 'consulting-qa', version: '1.1.0', description: '基于阿里云产品文档和最佳实践的智能问答，覆盖 ECS/ACK/RDS/OSS 等', status: 'installed' },
  { name: 'log-analyzer', version: '2.0.1', description: '多源日志聚合分析，支持 SLS、Kafka、文件日志的模式识别和异常检测', status: 'installed' },
  { name: 'metric-alerter', version: '1.0.3', description: '基于 Prometheus 指标的智能告警，支持动态阈值和趋势预测', status: 'installed' },
  { name: 'change-reviewer', version: '0.9.0', description: '变更单自动审核，检查回滚方案完整性和变更窗口合规性', status: 'installed' },
  { name: 'hello-world', version: '0.1.0', description: '技能框架验证用的基础测试技能', status: 'installed' },
];

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
};

// ─── Workflows (enriched) ───
const mockWorkflows: Workflow[] = [
  { id: 'wf-001', name: 'K8s 节点 NotReady 故障树', status: 'active' },
  { id: 'wf-002', name: 'RDS 主从同步延迟诊断', status: 'active' },
  { id: 'wf-003', name: 'SLB 后端健康检查失败排查', status: 'draft' },
  { id: 'wf-004', name: 'ECS 实例 CPU 打满分析', status: 'active' },
  { id: 'wf-005', name: 'DNS 解析异常故障树', status: 'archived' },
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
];

// ─── RAG Collections (enriched) ───
const mockCollections: Collection[] = [
  { id: 'col-ops-kb-001', name: '阿里云产品运维手册', document_count: 347, vector_count: 12840 },
  { id: 'col-ops-kb-002', name: '历史故障复盘文档', document_count: 156, vector_count: 5230 },
  { id: 'col-ops-kb-003', name: 'K8s 最佳实践', document_count: 89, vector_count: 3410 },
  { id: 'col-ops-kb-004', name: '内部运维 SOP 流程', document_count: 63, vector_count: 2150 },
  { id: 'col-ops-kb-005', name: '安全基线与合规指南', document_count: 42, vector_count: 1680 },
];

const mockCollectionDetails: CollectionDetail[] = [
  { id: 'col-ops-kb-001', name: '阿里云产品运维手册', description: '覆盖 ECS、ACK、RDS、SLB、OSS 等核心产品的运维操作指南', document_count: 347, vector_count: 12840, embedding_model: 'text-embedding-v2', created_at: '2026-01-15T08:00:00Z' },
  { id: 'col-ops-kb-002', name: '历史故障复盘文档', description: '生产环境历史故障的 RCA 报告和复盘总结', document_count: 156, vector_count: 5230, embedding_model: 'text-embedding-v2', created_at: '2026-01-20T10:00:00Z' },
  { id: 'col-ops-kb-003', name: 'K8s 最佳实践', description: 'Kubernetes 集群管理、Pod 调度、网络策略、安全加固等最佳实践', document_count: 89, vector_count: 3410, embedding_model: 'text-embedding-v2', created_at: '2026-02-01T14:00:00Z' },
  { id: 'col-ops-kb-004', name: '内部运维 SOP 流程', description: '标准化运维操作流程，包含变更管理、应急响应、巡检等', document_count: 63, vector_count: 2150, embedding_model: 'text-embedding-v2', created_at: '2026-02-10T09:00:00Z' },
  { id: 'col-ops-kb-005', name: '安全基线与合规指南', description: 'CIS Benchmark、等保 2.0、安全基线配置检查', document_count: 42, vector_count: 1680, embedding_model: 'text-embedding-v2', created_at: '2026-02-15T16:00:00Z' },
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
];

// ─── Dashboard 数据 ───
const mockDashboardMetrics: DashboardMetrics = {
  today_tickets: 23,
  skill_executions: 156,
  change_approvals: 8,
  knowledge_entries: 2847,
  ticket_trend: { value: 12, direction: 'up' },
  execution_trend: { value: 5, direction: 'up' },
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
      config: {
        model: data.model,
        system_prompt: data.system_prompt ?? '',
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
};
