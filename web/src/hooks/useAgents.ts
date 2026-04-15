import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type CreateAgentRequest } from '../api/client';
import type { UpdateAgentRequest } from '../types';

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: api.listAgents,
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ['agents', id],
    queryFn: () => api.getAgent(id),
    enabled: !!id,
  });
}

export function useAgentExecutions(id: string) {
  return useQuery({
    queryKey: ['agents', id, 'executions'],
    queryFn: () => api.getAgentExecutions(id),
    enabled: !!id,
  });
}

export function useAgentRuntimeStatus(id: string) {
  return useQuery({
    queryKey: ['agents', id, 'status'],
    queryFn: () => api.getAgentStatus(id),
    enabled: !!id,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAgentRequest) => api.createAgent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAgentRequest }) => api.updateAgent(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agents', variables.id] });
    },
  });
}

export function useAgentConversations(agentId: string) {
  return useQuery({
    queryKey: ['agents', agentId, 'conversations'],
    queryFn: () => api.listConversations(agentId),
    enabled: !!agentId,
  });
}

export function useConversationMessages(conversationId: string) {
  return useQuery({
    queryKey: ['conversations', conversationId, 'messages'],
    queryFn: () => api.getConversation(conversationId),
    enabled: !!conversationId,
  });
}

export function useAgentLongTermMemory(agentId: string) {
  return useQuery({
    queryKey: ['agents', agentId, 'long-term-memory'],
    queryFn: () => api.searchLongTermMemory(agentId),
    enabled: !!agentId,
  });
}

export function useAgentExecutionDetail(agentId: string, execId: string) {
  return useQuery({
    queryKey: ['agents', agentId, 'executions', execId],
    queryFn: () => api.getAgentExecutionDetail(agentId, execId),
    enabled: !!agentId && !!execId,
  });
}

export function useAgentAnalytics(agentId: string, timeRange: string) {
  return useQuery({
    queryKey: ['agents', agentId, 'analytics', timeRange],
    queryFn: () => api.getAgentAnalytics(agentId, timeRange),
    enabled: !!agentId,
  });
}

export function useAgentDiagnostics(agentId: string) {
  return useQuery({
    queryKey: ['agents', agentId, 'diagnostics'],
    queryFn: () => api.getAgentDiagnostics(agentId),
    enabled: !!agentId,
  });
}

export function useAgentDeployment(agentId: string) {
  return useQuery({
    queryKey: ['agents', agentId, 'deployment'],
    queryFn: () => api.getAgentDeployment(agentId),
    enabled: !!agentId,
  });
}

export function useAgentDeploymentVersions(agentId: string) {
  return useQuery({
    queryKey: ['agents', agentId, 'deployment-versions'],
    queryFn: () => api.getAgentDeploymentVersions(agentId),
    enabled: !!agentId,
  });
}

export function useAgentLogs(agentId: string) {
  return useQuery({
    queryKey: ['agents', agentId, 'logs'],
    queryFn: () => api.getAgentLogs(agentId),
    enabled: !!agentId,
  });
}

export function useAgentTemplates() {
  return useQuery({
    queryKey: ['agent-templates'],
    queryFn: api.listAgentTemplates,
  });
}

export function useCollaborationSessions() {
  return useQuery({
    queryKey: ['collaboration-sessions'],
    queryFn: api.listCollaborationSessions,
  });
}

export function useAgentAccessRules(agentId: string) {
  return useQuery({
    queryKey: ['agents', agentId, 'access'],
    queryFn: () => api.listAccessRules(agentId),
    enabled: !!agentId,
  });
}

export function useAgentAuditLog(agentId: string) {
  return useQuery({
    queryKey: ['agents', agentId, 'audit'],
    queryFn: () => api.getAuditLog(agentId),
    enabled: !!agentId,
  });
}
