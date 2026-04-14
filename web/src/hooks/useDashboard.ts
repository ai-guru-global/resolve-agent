import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: api.getDashboardMetrics,
  });
}

export function useTickets() {
  return useQuery({
    queryKey: ['tickets'],
    queryFn: api.listTickets,
  });
}

export function usePlatformStatus() {
  return useQuery({
    queryKey: ['platform', 'status'],
    queryFn: api.getPlatformStatus,
  });
}

export function useAgentOverviews() {
  return useQuery({
    queryKey: ['dashboard', 'agent-overviews'],
    queryFn: api.getAgentOverviews,
  });
}

export function useActivityEvents() {
  return useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: api.getActivityEvents,
  });
}

export function useExecutionStats() {
  return useQuery({
    queryKey: ['dashboard', 'execution-stats'],
    queryFn: api.getExecutionStats,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ['dashboard', 'alerts'],
    queryFn: api.getAlerts,
  });
}
