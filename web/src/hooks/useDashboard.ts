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
