import type {
  DashboardMetrics,
  OpsTicket,
  PlatformStatus,
  SkillDetailInfo,
  WorkflowDetail,
  WorkflowExecutionRecord,
  Document,
  CollectionDetail,
  AgentExecution,
  AgentRuntimeStatus,
  SystemSettings,
  FaultTree,
  AgentMode,
  HarnessConfig,
  AgentOverview,
  ActivityEvent,
  ExecutionStats,
  AlertItem,
  TroubleshootingSolution,
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
  CallGraphInfo,
  TrafficCaptureInfo,
  TrafficGraphInfo,
} from '../types';
import {
  DEV_CODE_ANALYSIS_MOCKS_ENABLED,
} from './mockRuntime';

const API_BASE = '/api/v1';

// 后端是否可用的缓存，避免每次请求都探测
let backendAvailable: boolean | null = null;
let backendCheckPromise: Promise<boolean> | null = null;

async function checkBackend(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  if (backendCheckPromise) return backendCheckPromise;

  backendCheckPromise = fetch(`${API_BASE}/health`, {
    method: 'GET',
    signal: AbortSignal.timeout(1500),
  })
    .then((res) => {
      backendAvailable = res.ok;
      return res.ok;
    })
    .catch(() => {
      backendAvailable = false;
      return false;
    })
    .finally(() => {
      backendCheckPromise = null;
      setTimeout(() => { backendAvailable = null; }, 30000);
    });

  return backendCheckPromise;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// 真实 API 实现
const realApi = {
  health: () => request<{ status: string }>('/health'),
  listAgents: () => request<{ agents: Agent[]; total: number }>('/agents'),
  getAgent: (id: string) => request<Agent>(`/agents/${id}`),
  createAgent: (data: CreateAgentRequest) =>
    request<Agent>('/agents', { method: 'POST', body: JSON.stringify(data) }),
  deleteAgent: (id: string) =>
    request<void>(`/agents/${id}`, { method: 'DELETE' }),
  getAgentExecutions: (agentId: string) =>
    request<{ executions: AgentExecution[]; total: number }>(`/agents/${agentId}/executions`),
  getAgentStatus: (agentId: string) =>
    request<AgentRuntimeStatus>(`/agents/${agentId}/status`),
  listSkills: () => request<{ skills: Skill[]; total: number }>('/skills'),
  getSkill: (name: string) => request<SkillDetailInfo>(`/skills/${name}`),
  listWorkflows: () =>
    request<{ workflows: Workflow[]; total: number }>('/workflows'),
  listWorkflowDetails: () =>
    request<{ workflows: WorkflowDetail[]; total: number }>('/workflows?detail=true'),
  getWorkflow: (id: string) =>
    request<WorkflowDetail>(`/workflows/${id}`),
  getWorkflowFaultTree: (workflowId: string) =>
    request<FaultTree>(`/workflows/${workflowId}/fault-tree`),
  updateWorkflowFaultTree: (workflowId: string, tree: FaultTree) =>
    request<FaultTree>(`/workflows/${workflowId}/fault-tree`, {
      method: 'PUT',
      body: JSON.stringify(tree),
    }),
  createWorkflowFaultTree: (workflowId: string, tree: FaultTree) =>
    request<FaultTree>(`/workflows/${workflowId}/fault-tree`, {
      method: 'POST',
      body: JSON.stringify(tree),
    }),
  listWorkflowExecutions: (workflowId?: string) =>
    request<{ executions: WorkflowExecutionRecord[]; total: number }>(
      workflowId ? `/workflows/executions?workflow_id=${workflowId}` : '/workflows/executions',
    ),
  listCollections: () =>
    request<{ collections: Collection[]; total: number }>('/rag/collections'),
  listCollectionDetails: () =>
    request<{ collections: CollectionDetail[]; total: number }>('/rag/collections?detail=true'),
  getCollection: (id: string) =>
    request<CollectionDetail>(`/rag/collections/${id}`),
  listDocuments: (collectionId?: string) =>
    request<{ documents: Document[]; total: number }>(
      collectionId ? `/rag/documents?collection_id=${collectionId}` : '/rag/documents',
    ),
  getDashboardMetrics: () =>
    request<DashboardMetrics>('/dashboard/metrics'),
  listTickets: () =>
    request<{ tickets: OpsTicket[]; total: number }>('/tickets'),
  getPlatformStatus: () =>
    request<PlatformStatus>('/platform/status'),
  getSettings: () =>
    request<SystemSettings>('/settings'),
  executeAgent: (id: string, message: string) =>
    request<{ agent_id: string; response?: string; content?: string; metadata?: Record<string, unknown> }>(
      `/agents/${id}/execute`,
      { method: 'POST', body: JSON.stringify({ message }) },
    ),
  systemInfo: () =>
    request<{ version: string; commit: string; build_date: string }>('/system/info'),
  getAgentOverviews: () =>
    request<{ agents: AgentOverview[]; total: number }>('/dashboard/agents'),
  getActivityEvents: () =>
    request<{ events: ActivityEvent[]; total: number }>('/dashboard/activity'),
  getExecutionStats: () =>
    request<ExecutionStats>('/dashboard/execution-stats'),
  getAlerts: () =>
    request<{ alerts: AlertItem[]; total: number }>('/dashboard/alerts'),

  // Solution endpoints
  listSolutions: (params?: { domain?: string; severity?: string; status?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.domain) searchParams.set('domain', params.domain);
    if (params?.severity) searchParams.set('severity', params.severity);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();
    return request<{ solutions: TroubleshootingSolution[]; total: number }>(
      `/solutions${qs ? `?${qs}` : ''}`,
    );
  },
  getSolution: (id: string) =>
    request<TroubleshootingSolution>(`/solutions/${id}`),
  createSolution: (data: Partial<TroubleshootingSolution>) =>
    request<TroubleshootingSolution>('/solutions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSolution: (id: string, data: Partial<TroubleshootingSolution>) =>
    request<TroubleshootingSolution>(`/solutions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSolution: (id: string) =>
    request<void>(`/solutions/${id}`, { method: 'DELETE' }),
  searchSolutions: (opts: SolutionSearchOptions) =>
    request<{ solutions: TroubleshootingSolution[]; total: number }>(
      '/solutions/search',
      { method: 'POST', body: JSON.stringify(opts) },
    ),
  bulkCreateSolutions: (solutions: Partial<TroubleshootingSolution>[]) =>
    request<{ created: number }>('/solutions/bulk', {
      method: 'POST',
      body: JSON.stringify({ solutions }),
    }),
  listSolutionExecutions: (solutionId: string) =>
    request<{ executions: SolutionExecution[]; total: number }>(
      `/solutions/${solutionId}/executions`,
    ),
  recordSolutionExecution: (solutionId: string, data: Partial<SolutionExecution>) =>
    request<SolutionExecution>(`/solutions/${solutionId}/executions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Agent update
  updateAgent: (id: string, data: UpdateAgentRequest) =>
    request<Agent>(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Memory endpoints
  listConversations: (agentId: string) =>
    request<{ conversations: Conversation[]; total: number }>(`/memory/${agentId}/conversations`),
  getConversation: (conversationId: string) =>
    request<{ messages: ConversationMessage[]; total: number }>(`/memory/conversations/${conversationId}`),
  deleteConversation: (conversationId: string) =>
    request<void>(`/memory/conversations/${conversationId}`, { method: 'DELETE' }),
  searchLongTermMemory: (agentId: string) =>
    request<{ memories: LongTermMemory[]; total: number }>(`/memory/${agentId}/long-term`),
  deleteLongTermMemory: (memoryId: string) =>
    request<void>(`/memory/long-term/${memoryId}`, { method: 'DELETE' }),
  pruneMemories: () =>
    request<{ pruned: number }>('/memory/prune', { method: 'POST' }),

  // Execution detail
  getAgentExecutionDetail: (agentId: string, execId: string) =>
    request<AgentExecutionDetail>(`/agents/${agentId}/executions/${execId}`),

  // Analytics
  getAgentAnalytics: (agentId: string, timeRange: string) =>
    request<AgentAnalytics>(`/agents/${agentId}/analytics?range=${timeRange}`),

  // Diagnostics
  getAgentDiagnostics: (agentId: string) =>
    request<AgentDiagnosticsResult>(`/agents/${agentId}/diagnostics`),

  // Deployment
  getAgentDeployment: (agentId: string) =>
    request<DeploymentInfo>(`/agents/${agentId}/deployment`),
  getAgentDeploymentVersions: (agentId: string) =>
    request<{ versions: DeploymentVersion[] }>(`/agents/${agentId}/deployments`),
  getAgentLogs: (agentId: string) =>
    request<{ logs: DeploymentLog[] }>(`/agents/${agentId}/logs`),
  deployAgent: (agentId: string) =>
    request<DeploymentInfo>(`/agents/${agentId}/deploy`, { method: 'POST' }),
  undeployAgent: (agentId: string) =>
    request<void>(`/agents/${agentId}/undeploy`, { method: 'POST' }),
  scaleAgent: (agentId: string, replicas: number) =>
    request<DeploymentInfo>(`/agents/${agentId}/scale`, { method: 'PUT', body: JSON.stringify({ replicas }) }),

  // Collaboration
  listCollaborationSessions: () =>
    request<{ sessions: CollaborationSession[]; total: number }>('/agents/collaboration/sessions'),

  // Access control
  listAccessRules: (agentId: string) =>
    request<{ rules: AccessRule[]; total: number }>(`/agents/${agentId}/access`),
  getAuditLog: (agentId: string) =>
    request<{ entries: AuditLogEntry[]; total: number }>(`/agents/${agentId}/audit`),

  // Templates
  listAgentTemplates: () =>
    request<{ templates: AgentTemplate[]; total: number }>('/agents/templates'),

  // Code analysis endpoints
  listCallGraphs: (analysisId?: string) => {
    const qs = analysisId ? `?analysis_id=${analysisId}` : '';
    return request<{ call_graphs: CallGraphInfo[]; total: number }>(`/call-graphs${qs}`);
  },
  getCallGraph: (id: string) =>
    request<CallGraphInfo>(`/call-graphs/${id}`),
  deleteCallGraph: (id: string) =>
    request<void>(`/call-graphs/${id}`, { method: 'DELETE' }),
  listTrafficCaptures: () =>
    request<{ captures: TrafficCaptureInfo[]; total: number }>('/traffic/captures'),
  getTrafficCapture: (id: string) =>
    request<TrafficCaptureInfo>(`/traffic/captures/${id}`),
  deleteTrafficCapture: (id: string) =>
    request<void>(`/traffic/captures/${id}`, { method: 'DELETE' }),
  listTrafficGraphs: () =>
    request<{ graphs: TrafficGraphInfo[]; total: number }>('/traffic/graphs'),
  getTrafficGraph: (id: string) =>
    request<TrafficGraphInfo>(`/traffic/graphs/${id}`),
  deleteTrafficGraph: (id: string) =>
    request<void>(`/traffic/graphs/${id}`, { method: 'DELETE' }),
};

type ApiType = typeof realApi;

type ApiMethodName = keyof ApiType;
type ApiMethod = (...args: unknown[]) => Promise<unknown>;

const CODE_ANALYSIS_MOCK_METHODS = new Set<ApiMethodName>([
  'listCallGraphs',
  'getCallGraph',
  'deleteCallGraph',
  'listTrafficGraphs',
  'getTrafficGraph',
  'deleteTrafficGraph',
]);

const loadLegacyMockApi: () => Promise<Partial<ApiType> | null> = import.meta.env.DEV
  ? (() => {
      let legacyMockApiPromise: Promise<Partial<ApiType> | null> | null = null;

      return async () => {
        legacyMockApiPromise ??= import('./mock')
          .then((module) => module.mockApi as Partial<ApiType>)
          .catch((error) => {
            console.warn('[API] Failed to load legacy mock module', error);
            return null;
          });

        return legacyMockApiPromise;
      };
    })()
  : async () => null;

const loadCodeAnalysisMockMethod: (
  methodName: ApiMethodName,
) => Promise<ApiMethod | null> = import.meta.env.DEV
  ? async (methodName) => {
      if (!DEV_CODE_ANALYSIS_MOCKS_ENABLED || !CODE_ANALYSIS_MOCK_METHODS.has(methodName)) {
        return null;
      }

      switch (methodName) {
        case 'listCallGraphs':
        case 'getCallGraph':
        case 'deleteCallGraph': {
          const module = await import('../mocks/codeAnalysis/callGraphs');

          if (methodName === 'listCallGraphs') return module.listCallGraphsMock as ApiMethod;
          if (methodName === 'getCallGraph') return module.getCallGraphMock as ApiMethod;
          return module.deleteCallGraphMock as ApiMethod;
        }
        case 'listTrafficGraphs':
        case 'getTrafficGraph':
        case 'deleteTrafficGraph': {
          const module = await import('../mocks/codeAnalysis/trafficAnalysis');

          if (methodName === 'listTrafficGraphs') return module.listTrafficGraphsMock as ApiMethod;
          if (methodName === 'getTrafficGraph') return module.getTrafficGraphMock as ApiMethod;
          return module.deleteTrafficGraphMock as ApiMethod;
        }
        default:
          return null;
      }
    }
  : async () => null;

function createProxiedApi(): ApiType {
  const handler: ProxyHandler<ApiType> = {
    get(target, prop: string) {
      const methodName = prop as ApiMethodName;
      const realFn = target[methodName];
      if (typeof realFn !== 'function') return realFn;

      return async (...args: unknown[]) => {
        const codeAnalysisMockFn = await loadCodeAnalysisMockMethod(methodName);
        if (codeAnalysisMockFn) {
          return codeAnalysisMockFn(...args);
        }

        const legacyMockApi = await loadLegacyMockApi();
        const legacyMockFn = legacyMockApi?.[methodName];

        if (typeof legacyMockFn === 'function') {
          const isUp = await checkBackend();
          if (!isUp) {
            return (legacyMockFn as ApiMethod)(...args);
          }
        }

        try {
          return (realFn as ApiMethod)(...args);
        } catch (err) {
          if (typeof legacyMockFn === 'function') {
            console.warn(`[API] ${prop} failed, falling back to mock`, err);
            return (legacyMockFn as ApiMethod)(...args);
          }
          throw err;
        }
      };
    },
  };
  return new Proxy(realApi, handler);
}

export const api = createProxiedApi();

// Type definitions
export interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  mode: AgentMode;
  harness: HarnessConfig;
  config: Record<string, unknown>;
}

export interface CreateAgentRequest {
  name: string;
  type: string;
  model: string;
  system_prompt?: string;
}

export interface Skill {
  name: string;
  version: string;
  description: string;
  status: string;
  skill_type?: 'general' | 'scenario';
  domain?: string;
  tags?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  status: string;
}

export interface Collection {
  id: string;
  name: string;
  document_count: number;
  vector_count: number;
}
