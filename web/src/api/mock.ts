/**
 * Mock 数据层 —— 模拟真实运维场景
 * 所有数据基于阿里云 ACK / ECS / RDS / SLB 等真实运维场景构造
 */

import type { Agent, CreateAgentRequest } from './client';
import type {
  FaultTree,
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
  MonitoringOverview,
} from '../types';

import { defaultHarness, delay, randomDelay } from './mock/shared';
import { mockSkillDetails, mockSkills } from './mock/skills';
import { mockFaultTrees, mockWorkflowDetails, mockWorkflowExecutions, mockWorkflows } from './mock/workflows';
import { mockCollectionDetails, mockCollections, mockDocuments } from './mock/rag';
import {
  buildHookLogs,
  buildMemoryContext,
  buildPipelineTrace,
  buildTiming,
  deletedLtmIds,
  executeResponses,
  mockAgentExecutions,
  mockAgentOverviews,
  mockAgentStatuses,
  mockActivityEvents,
  mockAdaptiveWeights,
  mockAlerts,
  mockCircuitBreakers,
  mockDashboardMetrics,
  mockExecutionStats,
  mockFeedbackSignals,
  mockPlatformStatus,
  mockSettings,
  mockSolutionExecutions,
  mockSolutions,
  mockSystemMetrics,
  mockTickets,
  mockTraces,
} from './mock/ops';

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
      skills: ['log-analyzer', 'metric-alerter', 'consulting-qa', 'k8s-pod-crash', 'SKILL-POD-001', 'SKILL-NODE-001'],
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
      created_at: '2026-07-01T08:00:00Z',
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
      skills: ['log-analyzer', 'metric-alerter', 'k8s-pod-crash', 'SKILL-NODE-001'],
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
      created_at: '2026-07-05T10:30:00Z',
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
      created_at: '2026-07-10T14:00:00Z',
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
      skills: ['ticket-handler', 'consulting-qa', 'rds-replication-lag'],
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
      created_at: '2026-07-12T09:00:00Z',
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
      skills: ['metric-alerter', 'SKILL-NET-003'],
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
      created_at: '2026-07-15T11:00:00Z',
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
      created_at: '2026-07-18T16:00:00Z',
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
      skills: ['log-analyzer', 'rds-replication-lag', 'SKILL-NET-002'],
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
      created_at: '2026-07-20T13:00:00Z',
    },
  },
];

// ─── Deployment Runtime（模块级可变状态：部署/下线/扩缩容/配置真实持久化） ───
const deploymentRuntime: Record<string, { state: DeploymentInfo['state']; replicas: number; auto_scale: boolean }> = {};

function getDeploymentRuntime(agentId: string) {
  const existing = deploymentRuntime[agentId];
  if (existing) return existing;
  const agent = mockAgents.find((a) => a.id === agentId);
  const init = {
    state: (agent?.status === 'inactive' ? 'undeployed' : 'deployed') as DeploymentInfo['state'],
    replicas: agent?.status === 'inactive' ? 0 : 1,
    auto_scale: agentId === 'agent-mega-001',
  };
  deploymentRuntime[agentId] = init;
  return init;
}

function buildDeploymentInfo(agentId: string): DeploymentInfo {
  const rt = getDeploymentRuntime(agentId);
  return {
    agent_id: agentId,
    state: rt.state,
    replicas: rt.state === 'undeployed' ? 0 : rt.replicas,
    desired_replicas: rt.state === 'undeployed' ? 0 : rt.replicas,
    cpu_limit: '500m',
    memory_limit: '512Mi',
    auto_scale: rt.auto_scale,
    uptime_seconds: rt.state === 'undeployed' ? 0 : (mockAgentStatuses[agentId]?.uptime_seconds ?? 0),
  };
}

// ─── Mock API 实现 ───
export const mockApi = {
  health: async () => {
    await randomDelay();
    return { status: 'ok' };
  },

  // ── Agents ──
  listAgents: async () => {
    await randomDelay();
    return { agents: mockAgents.map((a) => ({ ...a, last_execution_at: mockAgentStatuses[a.id]?.last_execution_at })), total: mockAgents.length };
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
    const relatedAgentCount = mockAgents.filter((a) => (a.harness?.skills ?? []).includes(name)).length;
    return { ...skill, related_agent_count: relatedAgentCount };
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
    return { ...mockSettings, models: [...(mockSettings.models ?? [])] };
  },

  // ── System ──
  systemInfo: async () => {
    await randomDelay();
    return {
      version: '0.6.0',
      commit: 'a3f7c2e',
      build_date: '2026-08-07T10:00:00Z',
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

  // ── Traces ──
  getTraces: async () => {
    await randomDelay();
    return { traces: [...mockTraces], total: mockTraces.length };
  },

  // ── Monitoring Overview ──
  getMonitoringOverview: async (): Promise<MonitoringOverview> => {
    await randomDelay();
    return {
      alerts: [...mockAlerts],
      total: mockAlerts.length,
      system_metrics: [...mockSystemMetrics],
      feedback_signals: [...mockFeedbackSignals],
      circuit_breakers: [...mockCircuitBreakers],
      adaptive_weights: [...mockAdaptiveWeights],
    };
  },

  // ── Solutions ──
  listSolutions: async (params?: { domain?: string; severity?: string; status?: string; limit?: number; offset?: number }) => {
    await randomDelay();
    let results = [...mockSolutions];
    if (params?.domain) results = results.filter((s) => s.domain === params.domain);
    if (params?.severity) results = results.filter((s) => s.severity === params.severity);
    if (params?.status) results = results.filter((s) => s.status === params.status);
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? results.length;
    const page = results.slice(offset, offset + limit);
    return { solutions: page, total: results.length };
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
    if (opts.component) results = results.filter((s) => s.component === opts.component);
    if (opts.severity) results = results.filter((s) => s.severity === opts.severity);
    if (opts.status) results = results.filter((s) => s.status === opts.status);
    if (opts.tags && opts.tags.length > 0) {
      results = results.filter((s) => opts.tags!.every((t) => s.tags.includes(t)));
    }
    if (opts.keyword) {
      const kw = opts.keyword.toLowerCase();
      results = results.filter(
        (s) =>
          s.title.toLowerCase().includes(kw) ||
          s.problem_symptoms.toLowerCase().includes(kw) ||
          s.search_keywords.toLowerCase().includes(kw),
      );
    }
    const offset = opts.offset ?? 0;
    const limit = opts.limit ?? results.length;
    const page = results.slice(offset, offset + limit);
    return { solutions: page, total: results.length };
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
        ...defaultHarness,
        ...agent.harness,
        ...(data.harness ?? {}),
        system_prompt: data.system_prompt ?? data.harness?.system_prompt ?? agent.harness?.system_prompt ?? '',
      },
      config: {
        ...agent.config,
        ...(data.config ?? {}),
        model: data.model ?? agent.config?.model,
      },
    };
    mockAgents[idx] = updated;
    return updated;
  },

  // ── Memory ──
  listConversations: async (agentId: string) => {
    await randomDelay();
    const conversations: Conversation[] = [
      { id: 'conv-001', agent_id: agentId, user_id: 'user-zhangming', message_count: 12, created_at: '2026-08-08T09:00:00Z', updated_at: '2026-08-08T09:12:00Z' },
      { id: 'conv-002', agent_id: agentId, user_id: 'user-liqiang', message_count: 8, created_at: '2026-08-07T14:00:00Z', updated_at: '2026-08-07T14:30:00Z' },
      { id: 'conv-003', agent_id: agentId, user_id: 'user-wangfang', message_count: 5, created_at: '2026-08-06T10:00:00Z', updated_at: '2026-08-06T10:15:00Z' },
    ];
    return { conversations, total: conversations.length };
  },

  getConversation: async (_conversationId: string) => {
    await randomDelay();
    const messages: ConversationMessage[] = [
      { id: 'msg-001', conversation_id: _conversationId, role: 'system', content: '你是一个专注于阿里云 ACK 容器服务的运维助手。', token_count: 45, sequence: 0, created_at: '2026-08-08T09:00:00Z' },
      { id: 'msg-002', conversation_id: _conversationId, role: 'user', content: 'ACK 集群 cn-hangzhou-prod 有节点 NotReady，帮我排查一下', token_count: 32, sequence: 1, created_at: '2026-08-08T09:01:00Z' },
      { id: 'msg-003', conversation_id: _conversationId, role: 'assistant', content: '好的，我来检查集群状态。发现节点 cn-hz-03 处于 NotReady 状态，原因是 kubelet 心跳超时。正在进一步分析网络策略...', token_count: 68, sequence: 2, created_at: '2026-08-08T09:01:30Z' },
      { id: 'msg-004', conversation_id: _conversationId, role: 'user', content: '是不是最近有人改了 NetworkPolicy？', token_count: 18, sequence: 3, created_at: '2026-08-08T09:02:00Z' },
      { id: 'msg-005', conversation_id: _conversationId, role: 'assistant', content: '确认了，变更单 CHG-2024-0156 在 10:23 修改了 calico NetworkPolicy，误将 kubelet 10250 端口的入方向流量 deny 掉了。建议恢复该规则。', token_count: 85, sequence: 4, created_at: '2026-08-08T09:02:30Z' },
    ];
    return { messages, total: messages.length };
  },

  deleteConversation: async (_conversationId: string) => {
    await delay(300);
  },

  searchLongTermMemory: async (agentId: string) => {
    await randomDelay();
    const all: LongTermMemory[] = [
      { id: 'ltm-001', agent_id: agentId, user_id: 'user-zhangming', memory_type: 'pattern', content: 'NetworkPolicy 变更是导致节点 NotReady 的常见原因，应优先检查最近的 calico 规则变更', importance: 0.92, access_count: 15, metadata: {}, created_at: '2026-07-15T10:00:00Z', updated_at: '2026-08-08T09:12:00Z', expires_at: null },
      { id: 'ltm-002', agent_id: agentId, user_id: 'user-liqiang', memory_type: 'fact', content: '集群 cn-hangzhou-prod 使用 Flannel VXLAN 网络模式，非 Calico', importance: 0.78, access_count: 8, metadata: {}, created_at: '2026-07-20T14:00:00Z', updated_at: '2026-08-05T11:00:00Z', expires_at: null },
      { id: 'ltm-003', agent_id: agentId, user_id: 'user-wangfang', memory_type: 'summary', content: '用户 wangfang 主要关注 RDS 相关问题，偏好简洁的排查步骤而非详细分析', importance: 0.65, access_count: 4, metadata: {}, created_at: '2026-08-01T09:00:00Z', updated_at: '2026-08-06T10:15:00Z', expires_at: '2026-07-01T00:00:00Z' },
      { id: 'ltm-004', agent_id: agentId, user_id: 'system', memory_type: 'skill_learned', content: '对于内存 OOM 问题，检查 /proc/meminfo 和 dmesg 日志比查看 Prometheus 指标更高效', importance: 0.85, access_count: 22, metadata: {}, created_at: '2026-07-10T08:00:00Z', updated_at: '2026-08-07T16:00:00Z', expires_at: null },
    ];
    const memories = all.filter((m) => !deletedLtmIds.has(m.id));
    return { memories, total: memories.length };
  },

  deleteLongTermMemory: async (memoryId: string) => {
    await delay(300);
    deletedLtmIds.add(memoryId);
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
    const trace = buildPipelineTrace(base);
    const hooks = buildHookLogs(base);
    const detail: AgentExecutionDetail = {
      ...base,
      input_full: base.input_preview.replace('...', '。请提供详细的分析报告，包括可能的根因和修复建议。'),
      output_full: base.output_preview.replace('...', '。\n\n**详细分析**\n\n经过多维度排查，已确认问题根因，处置建议与风险提示见上。'),
      pipeline_trace: trace,
      hook_logs: hooks,
      memory_context: buildMemoryContext(base),
      error_detail: base.status === 'failed'
        ? `${base.output_preview.replace('分析失败：', '')}\n\n目标集群 API Server (10.0.1.100:6443) 连接超时，指数退避重试 3 次（2s/4s/8s）均失败。\n排查建议：检查 kubeconfig 凭证有效期、安全组 6443 端口放行策略与专线隧道状态。`
        : null,
      timing_breakdown: buildTiming(base, trace, hooks),
    };
    return detail;
  },

  // ── Analytics ──
  getAgentAnalytics: async (agentId: string, _timeRange: string) => {
    await randomDelay();
    const status = mockAgentStatuses[agentId];
    const agent = mockAgents.find((a) => a.id === agentId);
    const type = agent?.type ?? 'custom';

    // 按 Agent 类型差异化画像：mega 高流量平稳 / fta 长尾高延迟 / rag 中等 / skill 突发型
    const profiles: Record<string, {
      timeline: { hour: string; count: number; success_count: number; failed_count: number }[];
      percentiles: { p50: number; p75: number; p90: number; p95: number; p99: number };
      errors: { error_type: string; count: number; last_seen: string }[];
      routes: { route_type: 'fta' | 'skill' | 'rag' | 'code_analysis' | 'multi' | 'direct'; count: number; percentage: number; avg_confidence: number }[];
    }> = {
      mega: {
        timeline: [
          { hour: '00', count: 38, success_count: 37, failed_count: 1 },
          { hour: '04', count: 24, success_count: 24, failed_count: 0 },
          { hour: '08', count: 96, success_count: 93, failed_count: 3 },
          { hour: '12', count: 142, success_count: 138, failed_count: 4 },
          { hour: '16', count: 128, success_count: 125, failed_count: 3 },
          { hour: '20', count: 71, success_count: 69, failed_count: 2 },
        ],
        percentiles: { p50: 920, p75: 1480, p90: 2680, p95: 5340, p99: 14720 },
        errors: [
          { error_type: 'API Server 连接超时', count: 6, last_seen: '2026-08-31T08:12:00Z' },
          { error_type: 'LLM 推理超时', count: 4, last_seen: '2026-08-30T22:10:00Z' },
          { error_type: '技能执行失败', count: 3, last_seen: '2026-08-30T14:00:00Z' },
        ],
        routes: [
          { route_type: 'fta', count: 186, percentage: 34, avg_confidence: 0.87 },
          { route_type: 'skill', count: 152, percentage: 28, avg_confidence: 0.93 },
          { route_type: 'rag', count: 109, percentage: 20, avg_confidence: 0.89 },
          { route_type: 'direct', count: 65, percentage: 12, avg_confidence: 0.95 },
          { route_type: 'multi', count: 33, percentage: 6, avg_confidence: 0.82 },
        ],
      },
      fta: {
        timeline: [
          { hour: '00', count: 3, success_count: 3, failed_count: 0 },
          { hour: '04', count: 1, success_count: 1, failed_count: 0 },
          { hour: '08', count: 9, success_count: 8, failed_count: 1 },
          { hour: '12', count: 14, success_count: 12, failed_count: 2 },
          { hour: '16', count: 11, success_count: 10, failed_count: 1 },
          { hour: '20', count: 6, success_count: 5, failed_count: 1 },
        ],
        percentiles: { p50: 8400, p75: 12600, p90: 18900, p95: 23400, p99: 31200 },
        errors: [
          { error_type: '证据收集超时', count: 4, last_seen: '2026-08-30T14:45:00Z' },
          { error_type: '故障树节点执行失败', count: 2, last_seen: '2026-08-29T21:19:00Z' },
          { error_type: 'API Server 连接超时', count: 2, last_seen: '2026-08-28T09:30:00Z' },
        ],
        routes: [
          { route_type: 'fta', count: 41, percentage: 93, avg_confidence: 0.88 },
          { route_type: 'multi', count: 3, percentage: 7, avg_confidence: 0.8 },
        ],
      },
      rag: {
        timeline: [
          { hour: '00', count: 8, success_count: 8, failed_count: 0 },
          { hour: '04', count: 4, success_count: 4, failed_count: 0 },
          { hour: '08', count: 31, success_count: 30, failed_count: 1 },
          { hour: '12', count: 47, success_count: 46, failed_count: 1 },
          { hour: '16', count: 39, success_count: 38, failed_count: 1 },
          { hour: '20', count: 22, success_count: 22, failed_count: 0 },
        ],
        percentiles: { p50: 1640, p75: 2210, p90: 3180, p95: 4260, p99: 6840 },
        errors: [
          { error_type: 'Embedding 服务超时', count: 3, last_seen: '2026-08-30T15:26:00Z' },
          { error_type: '向量库检索超时', count: 2, last_seen: '2026-08-29T11:40:00Z' },
        ],
        routes: [
          { route_type: 'rag', count: 148, percentage: 96, avg_confidence: 0.91 },
          { route_type: 'direct', count: 6, percentage: 4, avg_confidence: 0.94 },
        ],
      },
      skill: {
        timeline: [
          { hour: '00', count: 2, success_count: 2, failed_count: 0 },
          { hour: '04', count: 1, success_count: 1, failed_count: 0 },
          { hour: '08', count: 18, success_count: 16, failed_count: 2 },
          { hour: '12', count: 11, success_count: 10, failed_count: 1 },
          { hour: '16', count: 26, success_count: 22, failed_count: 4 },
          { hour: '20', count: 9, success_count: 8, failed_count: 1 },
        ],
        percentiles: { p50: 2680, p75: 3940, p90: 6120, p95: 9480, p99: 18600 },
        errors: [
          { error_type: '外部 Webhook 熔断', count: 5, last_seen: '2026-08-31T09:45:00Z' },
          { error_type: '工单网关限流', count: 4, last_seen: '2026-08-31T09:47:00Z' },
          { error_type: '技能执行超时', count: 2, last_seen: '2026-08-30T16:20:00Z' },
        ],
        routes: [
          { route_type: 'skill', count: 61, percentage: 91, avg_confidence: 0.92 },
          { route_type: 'multi', count: 6, percentage: 9, avg_confidence: 0.84 },
        ],
      },
      custom: {
        timeline: [
          { hour: '00', count: 1, success_count: 1, failed_count: 0 },
          { hour: '04', count: 0, success_count: 0, failed_count: 0 },
          { hour: '08', count: 4, success_count: 4, failed_count: 0 },
          { hour: '12', count: 7, success_count: 7, failed_count: 0 },
          { hour: '16', count: 5, success_count: 5, failed_count: 0 },
          { hour: '20', count: 2, success_count: 2, failed_count: 0 },
        ],
        percentiles: { p50: 1120, p75: 1680, p90: 2740, p95: 3920, p99: 8100 },
        errors: [
          { error_type: '数据源连接失败', count: 1, last_seen: '2026-08-27T10:15:00Z' },
        ],
        routes: [
          { route_type: 'rag', count: 12, percentage: 63, avg_confidence: 0.88 },
          { route_type: 'direct', count: 7, percentage: 37, avg_confidence: 0.93 },
        ],
      },
    };
    const p = (profiles[type] ?? profiles.custom)!;

    const analytics: AgentAnalytics = {
      agent_id: agentId,
      time_range: _timeRange,
      kpis: {
        success_rate: status?.success_rate ?? 0.9,
        success_rate_trend: { value: 2.1, direction: 'up' },
        avg_latency_ms: status?.avg_latency_ms ?? p.percentiles.p50,
        avg_latency_trend: { value: 5, direction: 'down' },
        total_executions: status?.total_executions ?? 100,
        execution_trend: { value: 8, direction: 'up' },
        error_rate: 1 - (status?.success_rate ?? 0.9),
        error_rate_trend: { value: 1.5, direction: 'down' },
      },
      execution_timeline: p.timeline,
      latency_percentiles: p.percentiles,
      route_distribution: p.routes,
      confidence_histogram: [
        { bucket: '0.5-0.6', count: 12 },
        { bucket: '0.6-0.7', count: 28 },
        { bucket: '0.7-0.8', count: 65 },
        { bucket: '0.8-0.9', count: 142 },
        { bucket: '0.9-1.0', count: 93 },
      ],
      top_errors: p.errors,
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
        { name: 'Skills 可用性', category: 'config', status: 'pass', message: `所有 ${agent?.harness?.skills.length ?? 0} 个 Skills 可用`, detail: null },
        { name: 'Tools 可达性', category: 'config', status: isError ? 'fail' : 'pass', message: isError ? 'change-management-api 连接失败' : '所有 Tools 连接正常', detail: isError ? '连续 37 次调用超时，最后成功时间 2026-08-07T18:00:00Z' : null },
        { name: 'LLM 端点', category: 'connectivity', status: 'pass', message: `模型 ${agent?.config?.model ?? '未知'} 可用`, detail: null },
        { name: '向量库连接', category: 'connectivity', status: 'pass', message: 'Milvus 连接正常', detail: null },
        { name: '成功率', category: 'performance', status: (status?.success_rate ?? 1) < 0.8 ? 'fail' : 'pass', message: `当前成功率 ${((status?.success_rate ?? 0) * 100).toFixed(1)}%`, detail: (status?.success_rate ?? 1) < 0.8 ? '低于 80% 阈值' : null },
        { name: '延迟', category: 'performance', status: (status?.avg_latency_ms ?? 0) > 5000 ? 'warning' : 'pass', message: `平均延迟 ${status?.avg_latency_ms ?? 0}ms`, detail: null },
        { name: 'Hooks 功能', category: 'dependency', status: 'pass', message: `${agent?.harness?.hooks.filter(h => h.enabled).length ?? 0} 个 Hook 正常运行`, detail: null },
      ],
      recent_errors: failedExecs.slice(0, 5),
      checked_at: new Date().toISOString(),
    };
    return result;
  },

  // ── Deployment ──
  getAgentDeployment: async (agentId: string) => {
    await randomDelay();
    return buildDeploymentInfo(agentId);
  },

  getAgentDeploymentVersions: async (_agentId: string) => {
    await randomDelay();
    const versions: DeploymentVersion[] = [
      { version: 'v0.9.3', deployed_at: '2026-08-08T05:00:00Z', deployer: 'system', status: 'success', config_changes: '更新系统提示词，调整 temperature 参数' },
      { version: 'v0.9.2', deployed_at: '2026-08-05T14:00:00Z', deployer: 'zhangming', status: 'success', config_changes: '添加 change-reviewer 技能' },
      { version: 'v0.9.1', deployed_at: '2026-08-01T10:00:00Z', deployer: 'liqiang', status: 'success', config_changes: '初始部署' },
    ];
    return { versions };
  },

  getAgentLogs: async (_agentId: string) => {
    await randomDelay();
    const logs: DeploymentLog[] = [
      { timestamp: '2026-08-08T09:12:01Z', level: 'info', message: '[agent] Execution completed: aexec-001, route=multi, duration=1230ms' },
      { timestamp: '2026-08-08T09:12:00Z', level: 'info', message: '[selector] Route decision: multi (confidence=0.91)' },
      { timestamp: '2026-08-08T09:11:59Z', level: 'info', message: '[hook] pre_execution: compaction completed in 12ms' },
      { timestamp: '2026-08-08T09:05:00Z', level: 'error', message: '[agent] Execution failed: change-management-api timeout after 30s' },
      { timestamp: '2026-08-08T09:00:00Z', level: 'info', message: '[memory] Loaded 12 messages from conversation conv-001' },
      { timestamp: '2026-08-08T08:30:00Z', level: 'info', message: '[agent] Execution completed: aexec-002, route=multi, duration=1540ms' },
      { timestamp: '2026-08-08T05:00:00Z', level: 'info', message: '[deploy] Agent restarted: v0.9.2 → v0.9.3' },
      { timestamp: '2026-08-08T04:59:00Z', level: 'warn', message: '[runtime] Memory usage 256MB approaching 300MB threshold' },
    ];
    return { logs };
  },

  deployAgent: async (agentId: string) => {
    await delay(1000);
    const rt = getDeploymentRuntime(agentId);
    rt.state = 'deployed';
    if (rt.replicas === 0) rt.replicas = 1;
    return buildDeploymentInfo(agentId);
  },

  undeployAgent: async (agentId: string) => {
    await delay(800);
    const rt = getDeploymentRuntime(agentId);
    rt.state = 'undeployed';
    rt.replicas = 0;
  },

  scaleAgent: async (agentId: string, replicas: number) => {
    await delay(600);
    const rt = getDeploymentRuntime(agentId);
    rt.state = 'deployed';
    rt.replicas = replicas;
    return buildDeploymentInfo(agentId);
  },

  updateAgentDeploymentConfig: async (agentId: string, config: { auto_scale: boolean }) => {
    await delay(400);
    const rt = getDeploymentRuntime(agentId);
    rt.auto_scale = config.auto_scale;
    return buildDeploymentInfo(agentId);
  },

  // ── Collaboration ──
  listCollaborationSessions: async () => {
    await randomDelay();
    const sessions: CollaborationSession[] = [
      { id: 'collab-001', name: '跨系统故障联合诊断', pattern: 'fan_out_fan_in', agents: ['agent-mega-001', 'agent-fta-002', 'agent-rag-003'], status: 'completed', started_at: '2026-08-31T08:00:00Z', completed_at: '2026-08-31T08:05:00Z', duration_ms: 300000 },
      { id: 'collab-002', name: 'K8s + RDS 关联分析', pattern: 'sequential', agents: ['agent-fta-002', 'agent-fta-007'], status: 'completed', started_at: '2026-08-30T16:00:00Z', completed_at: '2026-08-30T16:10:00Z', duration_ms: 600000 },
      { id: 'collab-003', name: '大促容量保障巡检', pattern: 'fan_out_fan_in', agents: ['agent-mega-001', 'agent-mega-006', 'agent-custom-005'], status: 'running', started_at: '2026-08-31T09:30:00Z', completed_at: null, duration_ms: 0 },
      { id: 'collab-004', name: '工单批量归档流水线', pattern: 'supervisor_worker', agents: ['agent-mega-006', 'agent-skill-004'], status: 'failed', started_at: '2026-08-29T14:20:00Z', completed_at: '2026-08-29T14:26:40Z', duration_ms: 400000 },
      { id: 'collab-005', name: '变更窗口合规预审', pattern: 'debate', agents: ['agent-mega-006', 'agent-fta-002', 'agent-rag-003'], status: 'completed', started_at: '2026-08-28T20:00:00Z', completed_at: '2026-08-28T20:07:30Z', duration_ms: 450000 },
    ];
    return { sessions, total: sessions.length };
  },

  // ── Access Control ──
  listAccessRules: async (agentId: string) => {
    await randomDelay();
    const rules: AccessRule[] = [
      { id: 'acl-001', agent_id: agentId, user_or_role: 'admin', role: 'admin', permissions: { view: true, execute: true, edit: true, admin: true }, created_at: '2026-07-01T08:00:00Z' },
      { id: 'acl-002', agent_id: agentId, user_or_role: 'sre-team', role: 'operator', permissions: { view: true, execute: true, edit: false, admin: false }, created_at: '2026-07-05T10:00:00Z' },
      { id: 'acl-003', agent_id: agentId, user_or_role: 'dev-team', role: 'viewer', permissions: { view: true, execute: false, edit: false, admin: false }, created_at: '2026-07-10T14:00:00Z' },
      { id: 'acl-004', agent_id: agentId, user_or_role: 'platform-team', role: 'developer', permissions: { view: true, execute: true, edit: true, admin: false }, created_at: '2026-07-18T09:30:00Z' },
    ];
    return { rules, total: rules.length };
  },

  getAuditLog: async (_agentId: string) => {
    await randomDelay();
    const entries: AuditLogEntry[] = [
      { id: 'audit-001', agent_id: _agentId, user: 'zhangming', action: 'execute', detail: '执行了故障排查任务', timestamp: '2026-08-08T09:12:00Z' },
      { id: 'audit-002', agent_id: _agentId, user: 'system', action: 'deploy', detail: '自动部署 v0.9.3', timestamp: '2026-08-08T05:00:00Z' },
      { id: 'audit-003', agent_id: _agentId, user: 'liqiang', action: 'edit', detail: '修改系统提示词', timestamp: '2026-08-05T14:00:00Z' },
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
