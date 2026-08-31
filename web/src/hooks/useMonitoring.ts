import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useTraces() {
  return useQuery({
    queryKey: ['traces'],
    queryFn: api.getTraces,
  });
}

export function useMonitoringOverview() {
  return useQuery({
    queryKey: ['monitoring', 'overview'],
    queryFn: api.getMonitoringOverview,
  });
}
