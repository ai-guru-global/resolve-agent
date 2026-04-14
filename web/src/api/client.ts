import { mockApi } from './mock';
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
} from '../types';

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
};

// 导出的 api 会先探测后端，不可用就无缝切换到 mock
type ApiType = typeof realApi;

function createProxiedApi(): ApiType {
  const handler: ProxyHandler<ApiType> = {
    get(target, prop: string) {
      const realFn = target[prop as keyof ApiType];
      const mockFn = mockApi[prop as keyof typeof mockApi];
      if (typeof realFn !== 'function') return realFn;

      return async (...args: unknown[]) => {
        const isUp = await checkBackend();
        if (!isUp && mockFn) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (mockFn as any)(...args);
        }
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return await (realFn as any)(...args);
        } catch (err) {
          // 真实请求失败也回退到 mock
          if (mockFn) {
            console.warn(`[API] ${prop} failed, falling back to mock`, err);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (mockFn as any)(...args);
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
