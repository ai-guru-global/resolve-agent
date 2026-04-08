import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type CreateAgentRequest } from '../api/client';

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
