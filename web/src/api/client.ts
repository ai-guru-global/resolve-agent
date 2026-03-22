const API_BASE = '/api/v1';

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

export const api = {
  // Health
  health: () => request<{ status: string }>('/health'),

  // Agents
  listAgents: () => request<{ agents: Agent[]; total: number }>('/agents'),
  getAgent: (id: string) => request<Agent>(`/agents/${id}`),
  createAgent: (data: CreateAgentRequest) =>
    request<Agent>('/agents', { method: 'POST', body: JSON.stringify(data) }),
  deleteAgent: (id: string) =>
    request<void>(`/agents/${id}`, { method: 'DELETE' }),

  // Skills
  listSkills: () => request<{ skills: Skill[]; total: number }>('/skills'),

  // Workflows
  listWorkflows: () =>
    request<{ workflows: Workflow[]; total: number }>('/workflows'),

  // RAG
  listCollections: () =>
    request<{ collections: Collection[]; total: number }>('/rag/collections'),

  // System
  systemInfo: () =>
    request<{ version: string; commit: string; build_date: string }>(
      '/system/info',
    ),
};

// Type definitions
export interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
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
