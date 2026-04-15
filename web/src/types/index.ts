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
  skill_type: SkillType;
  scenario_config?: ScenarioConfig;
  inputs: SkillParameter[];
  outputs: SkillParameter[];
  permissions: SkillPermissions;
  install_date: string;
  last_executed: string;
  execution_count: number;
  level?: number;
  experience_points?: number;
  next_level_experience?: number;
  related_agent_count?: number;
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

// Troubleshooting Solution types
export type SolutionStatus = 'active' | 'archived' | 'draft';
export type SolutionSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface TroubleshootingSolution {
  id: string;
  title: string;
  problem_symptoms: string;
  key_information: string;
  troubleshooting_steps: string;
  resolution_steps: string;
  domain: string;
  component: string;
  severity: SolutionSeverity;
  tags: string[];
  search_keywords: string;
  version: number;
  status: SolutionStatus;
  source_uri: string;
  rag_collection_id: string;
  rag_document_id: string;
  related_skill_names: string[];
  related_workflow_ids: string[];
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SolutionExecution {
  id: string;
  solution_id: string;
  executor: string;
  trigger_context: Record<string, unknown>;
  status: string;
  outcome_notes: string;
  effectiveness_score: number;
  duration_ms: number;
  started_at: string;
  completed_at: string;
  created_at: string;
}

export interface SolutionSearchOptions {
  domain?: string;
  component?: string;
  severity?: string;
  tags?: string[];
  keyword?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

// ─── Agent Update types ───
export interface UpdateAgentRequest {
  name?: string;
  type?: string;
  model?: string;
  status?: string;
  mode?: AgentMode;
  system_prompt?: string;
  harness?: Partial<HarnessConfig>;
  config?: Record<string, unknown>;
}

// ─── Memory types ───
export interface Conversation {
  id: string;
  agent_id: string;
  user_id: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  token_count: number;
  sequence: number;
  created_at: string;
}

export interface LongTermMemory {
  id: string;
  agent_id: string;
  user_id: string;
  memory_type: 'summary' | 'preference' | 'pattern' | 'fact' | 'skill_learned';
  content: string;
  importance: number;
  access_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

// ─── Agent Execution Detail types ───
export interface AgentExecutionDetail extends AgentExecution {
  input_full: string;
  output_full: string;
  pipeline_trace: SelectorPipelineTrace | null;
  hook_logs: HookExecutionLog[];
  memory_context: ConversationMessage[];
  error_detail: string | null;
  timing_breakdown: TimingBreakdown;
}

export interface HookExecutionLog {
  hook_name: string;
  hook_type: HookType;
  status: 'success' | 'failed' | 'skipped';
  duration_ms: number;
  input_preview: string;
  output_preview: string;
  timestamp: string;
}

export interface TimingBreakdown {
  selector_ms: number;
  pre_hook_ms: number;
  llm_inference_ms: number;
  post_hook_ms: number;
  total_ms: number;
}

// ─── Agent Analytics types ───
export interface AgentAnalytics {
  agent_id: string;
  time_range: string;
  kpis: {
    success_rate: number;
    success_rate_trend: TrendInfo;
    avg_latency_ms: number;
    avg_latency_trend: TrendInfo;
    total_executions: number;
    execution_trend: TrendInfo;
    error_rate: number;
    error_rate_trend: TrendInfo;
  };
  execution_timeline: HourlyExecution[];
  latency_percentiles: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  route_distribution: RouteDistribution[];
  confidence_histogram: { bucket: string; count: number }[];
  top_errors: { error_type: string; count: number; last_seen: string }[];
}

// ─── Agent Template types ───
export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  category: 'ops' | 'knowledge' | 'analysis' | 'custom';
  icon: string;
  model: string;
  system_prompt: string;
  tools: string[];
  skills: string[];
  mode: AgentMode;
}

// ─── Health Diagnostics types ───
export type DiagnosticCheckStatus = 'pass' | 'warning' | 'fail';

export interface DiagnosticCheck {
  name: string;
  category: 'runtime' | 'config' | 'connectivity' | 'performance' | 'dependency';
  status: DiagnosticCheckStatus;
  message: string;
  detail: string | null;
}

export interface AgentDiagnosticsResult {
  agent_id: string;
  health_score: number;
  overall_status: 'healthy' | 'degraded' | 'failed';
  checks: DiagnosticCheck[];
  recent_errors: AgentExecution[];
  checked_at: string;
}

// ─── Deployment types ───
export type DeploymentState = 'deployed' | 'undeployed' | 'deploying' | 'scaling' | 'error';

export interface DeploymentInfo {
  agent_id: string;
  state: DeploymentState;
  replicas: number;
  desired_replicas: number;
  cpu_limit: string;
  memory_limit: string;
  auto_scale: boolean;
  uptime_seconds: number;
}

export interface DeploymentVersion {
  version: string;
  deployed_at: string;
  deployer: string;
  status: 'success' | 'failed' | 'rollback';
  config_changes: string;
}

export interface DeploymentLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
}

// ─── Multi-Agent Collaboration types ───
export interface CollaborationSession {
  id: string;
  name: string;
  pattern: 'sequential' | 'fan_out_fan_in' | 'supervisor_worker' | 'debate';
  agents: string[];
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  duration_ms: number;
}

// ─── Access Control types ───
export type AccessRole = 'viewer' | 'operator' | 'developer' | 'admin';

export interface AccessRule {
  id: string;
  agent_id: string;
  user_or_role: string;
  role: AccessRole;
  permissions: {
    view: boolean;
    execute: boolean;
    edit: boolean;
    admin: boolean;
  };
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  agent_id: string;
  user: string;
  action: string;
  detail: string;
  timestamp: string;
}

// Skill type classification
export type SkillType = 'general' | 'scenario';

export interface ScenarioConfig {
  domain: string;
  tags: string[];
  troubleshooting_flow: TroubleshootingStep[];
  output_template: SolutionOutputTemplate | null;
  severity_levels: string[];
}

export interface TroubleshootingStep {
  id: string;
  name: string;
  description: string;
  step_type: 'collect' | 'diagnose' | 'verify' | 'action';
  command: string | null;
  skill_ref: string | null;
  expected_output: string | null;
  condition: string | null;
  timeout_seconds: number;
  order: number;
}

export interface SolutionOutputTemplate {
  include_symptoms: boolean;
  include_evidence: boolean;
  include_steps: boolean;
  include_resolution: boolean;
  custom_sections: string[];
}

// ─── Code Analysis types ───
export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'error' | 'analyzed';

export interface CallGraphInfo {
  id: string;
  analysis_id: string;
  repository_url: string;
  branch: string;
  language: string;
  entry_point: string;
  node_count: number;
  edge_count: number;
  max_depth: number;
  status: AnalysisStatus;
  created_at?: string;
}

export interface TrafficCaptureInfo {
  id: string;
  name: string;
  source_type: string;
  target_service: string;
  status: AnalysisStatus;
  config: Record<string, unknown>;
  summary: Record<string, unknown>;
  labels: Record<string, string>;
  created_at?: string;
}

export interface TrafficGraphInfo {
  id: string;
  capture_id: string;
  name: string;
  status: AnalysisStatus;
  graph_data: Record<string, unknown>;
  nodes: TrafficGraphNode[];
  edges: TrafficGraphEdge[];
  analysis_report: string;
  suggestions: TrafficSuggestion[];
  created_at?: string;
}

export interface TrafficGraphNode {
  id: string;
  label: string;
  request_count: number;
  error_count: number;
  avg_latency_ms: number;
  protocols: string[];
}

export interface TrafficGraphEdge {
  id: string;
  source: string;
  target: string;
  request_count: number;
  error_count: number;
  avg_latency_ms: number;
  protocols: string[];
  methods: string[];
}

export interface TrafficSuggestion {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface XYFlowGraphData {
  nodes: XYFlowNode[];
  edges: XYFlowEdge[];
}

export interface XYFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    requestCount: number;
    errorCount: number;
    avgLatencyMs: number;
    protocols: string[];
  };
}

export interface XYFlowEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated: boolean;
  data: {
    requestCount: number;
    errorCount: number;
    avgLatencyMs: number;
    protocols: string[];
    methods: string[];
  };
}
