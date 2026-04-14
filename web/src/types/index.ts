// Agent types
export type AgentType = 'mega' | 'skill' | 'fta' | 'rag' | 'custom';
export type AgentStatus = 'active' | 'inactive' | 'error';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

// Agent Harness types (Agent = Model + Harness)
export type AgentMode = 'all_skills' | 'selector';
export type SandboxType = 'local' | 'container' | 'remote';
export type ContextStrategy = 'default' | 'compaction' | 'offloading';
export type HookType = 'pre_execution' | 'post_execution' | 'on_error' | 'on_exit';
export type HookAction = 'lint_check' | 'test_suite' | 'auto_retry' | 'compaction' | 'log_trace' | 'notify';

export interface HarnessHook {
  name: string;
  type: HookType;
  action: HookAction;
  enabled: boolean;
}

export interface HarnessConfig {
  system_prompt: string;
  tools: string[];
  skills: string[];
  memory_enabled: boolean;
  hooks: HarnessHook[];
  sandbox_type: SandboxType;
  context_strategy: ContextStrategy;
}

// Route types from Intelligent Selector
export type RouteType = 'fta' | 'skill' | 'rag' | 'code_analysis' | 'multi' | 'direct';

export interface RouteDecision {
  route_type: RouteType;
  route_target: string;
  confidence: number;
  parameters: Record<string, unknown>;
  reasoning: string;
  chain?: RouteDecision[];
}

// Intelligent Selector pipeline types
export type SelectorStrategy = 'hybrid' | 'llm' | 'rule';

export type IntentType = 'workflow' | 'skill' | 'rag' | 'code_analysis' | 'direct' | 'multi';

export interface IntentClassification {
  intent_type: IntentType;
  confidence: number;
  entities: string[];
  metadata: Record<string, unknown>;
  sub_intents: IntentType[];
  suggested_target: string;
}

export interface CorpusMatch {
  collection_id: string;
  collection_name: string;
  relevance_score: number;
  matched_keywords: string[];
  document_count: number;
}

export interface SelectorPipelineTrace {
  input: string;
  strategy: SelectorStrategy;
  intent: IntentClassification;
  enriched_context: {
    available_skills: string[];
    active_workflows: string[];
    rag_collections: CorpusMatch[];
    code_context: {
      language: string;
      has_code_blocks: boolean;
      detected_patterns: string[];
    } | null;
  };
  decision: RouteDecision;
  pipeline_latency_ms: number;
}

// FTA types
export type GateType = 'AND' | 'OR' | 'VOTING' | 'INHIBIT' | 'PRIORITY_AND';
export type EventType = 'top' | 'intermediate' | 'basic' | 'undeveloped';

export interface FTAEvent {
  id: string;
  name: string;
  description: string;
  type: EventType;
  evaluator: string;
  parameters: Record<string, unknown>;
}

export interface FTAGate {
  id: string;
  name: string;
  type: GateType;
  input_ids: string[];
  output_id: string;
  k_value?: number;
}

export interface FaultTree {
  id: string;
  name: string;
  top_event_id: string;
  events: FTAEvent[];
  gates: FTAGate[];
}

// Skill types
export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  entry_point: string;
  inputs: SkillParameter[];
  outputs: SkillParameter[];
  permissions: SkillPermissions;
}

export interface SkillParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface SkillPermissions {
  network_access: boolean;
  file_system_read: boolean;
  file_system_write: boolean;
  timeout_seconds: number;
}

// ResolveNet platform integration types
export interface ResolveNetConfig {
  endpoint: string;
  auth_method: string;
  tenant_id: string;
  sync_interval_seconds: number;
  status: 'connected' | 'disconnected' | 'error';
  latency_ms: number;
}

// Ops ticket types
export interface OpsTicket {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'approved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  assignee: string;
}

// Ops metrics types
export interface OpsMetrics {
  today_tickets: number;
  skill_executions: number;
  change_approvals: number;
  knowledge_entries: number;
}

// UI component types
export type StatusVariant = 'healthy' | 'degraded' | 'failed' | 'progressing' | 'unknown';

export type AgentStatusMap = Record<AgentStatus, StatusVariant>;

export const agentStatusToVariant: AgentStatusMap = {
  active: 'healthy',
  inactive: 'unknown',
  error: 'failed',
};

export const ticketStatusToVariant: Record<OpsTicket['status'], StatusVariant> = {
  pending: 'unknown',
  processing: 'progressing',
  completed: 'healthy',
  approved: 'healthy',
};

// Dashboard types
export interface TrendInfo {
  value: number;
  direction: 'up' | 'down' | 'flat';
}

export interface DashboardMetrics {
  today_tickets: number;
  skill_executions: number;
  change_approvals: number;
  knowledge_entries: number;
  ticket_trend: TrendInfo;
  execution_trend: TrendInfo;
  total_agents: number;
  active_agents: number;
  error_agents: number;
  today_executions: number;
  success_rate: number;
  avg_latency_ms: number;
  execution_trend_24h: number[];
}

export interface PlatformStatus {
  connection_status: 'connected' | 'disconnected' | 'degraded';
  endpoint: string;
  sync_interval_seconds: number;
  region: string;
  latency_ms: number;
  last_sync_at: string;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  goroutines: number;
  uptime_seconds: number;
}

export interface AgentOverview {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  success_rate: number;
  total_executions: number;
  avg_latency_ms: number;
  last_execution_at: string;
  error_count_24h: number;
  uptime_seconds: number;
  memory_mb: number;
}

export interface ActivityEvent {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_type: AgentType;
  event_type: 'execution' | 'error' | 'status_change' | 'deployment' | 'alert';
  description: string;
  status: ExecutionStatus | 'info' | 'warning';
  timestamp: string;
  duration_ms?: number;
  route_type?: RouteType;
}

export interface ExecutionStats {
  total: number;
  success: number;
  failed: number;
  running: number;
  avg_duration_ms: number;
  p99_duration_ms: number;
  by_route_type: RouteDistribution[];
  by_hour: HourlyExecution[];
}

export interface RouteDistribution {
  route_type: RouteType;
  count: number;
  percentage: number;
  avg_confidence: number;
}

export interface HourlyExecution {
  hour: string;
  count: number;
  success_count: number;
  failed_count: number;
}

export interface AlertItem {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  agent_id: string;
  agent_name: string;
  title: string;
  description: string;
  created_at: string;
  acknowledged: boolean;
}

// Extended Skill types
export interface SkillDetailInfo {
  name: string;
  display_name: string;
  version: string;
  description: string;
  status: string;
  author: string;
  icon: string;
  entry_point: string;
  inputs: SkillParameter[];
  outputs: SkillParameter[];
  permissions: SkillPermissions;
  install_date: string;
  last_executed: string;
  execution_count: number;
}

// Extended Workflow types
export interface WorkflowDetail {
  id: string;
  name: string;
  status: 'active' | 'draft' | 'archived';
  description: string;
  created_at: string;
  updated_at: string;
  node_count: number;
  last_executed: string | null;
  execution_count: number;
}

export interface WorkflowExecutionRecord {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: ExecutionStatus;
  started_at: string;
  completed_at: string | null;
  trigger: string;
  root_cause: string | null;
  nodes_evaluated: number;
  duration_ms: number;
}

// RAG Document types
export type DocumentFormat = 'pdf' | 'markdown' | 'txt' | 'html';
export type DocumentStatus = 'indexed' | 'processing' | 'failed';

export interface Document {
  id: string;
  collection_id: string;
  title: string;
  format: DocumentFormat;
  size_bytes: number;
  chunk_count: number;
  status: DocumentStatus;
  uploaded_at: string;
  updated_at: string;
}

export interface CollectionDetail {
  id: string;
  name: string;
  description: string;
  document_count: number;
  vector_count: number;
  embedding_model: string;
  created_at: string;
}

// Agent extended types
export interface AgentExecution {
  id: string;
  agent_id: string;
  input_preview: string;
  output_preview: string;
  status: ExecutionStatus;
  route_type: RouteType;
  confidence: number;
  duration_ms: number;
  created_at: string;
}

export interface AgentRuntimeStatus {
  uptime_seconds: number;
  total_executions: number;
  success_rate: number;
  avg_latency_ms: number;
  last_execution_at: string;
  error_count_24h: number;
  memory_mb: number;
}

// Model config types
export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  status: 'available' | 'unavailable';
  max_tokens: number;
  description: string;
}

// System settings types
export interface SystemSettings {
  resolve_net: ResolveNetConfig;
  platform: {
    server_address: string;
    runtime_address: string;
    version: string;
    commit: string;
    build_date: string;
  };
  models: ModelConfig[];
}
