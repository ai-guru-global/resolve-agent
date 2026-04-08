import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: api.listWorkflowDetails,
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflows', id],
    queryFn: () => api.getWorkflow(id),
    enabled: !!id,
  });
}

export function useWorkflowFaultTree(workflowId: string) {
  return useQuery({
    queryKey: ['workflows', workflowId, 'fault-tree'],
    queryFn: () => api.getWorkflowFaultTree(workflowId),
    enabled: !!workflowId,
  });
}

export function useWorkflowExecutions(workflowId?: string) {
  return useQuery({
    queryKey: ['workflows', 'executions', workflowId],
    queryFn: () => api.listWorkflowExecutions(workflowId),
  });
}
