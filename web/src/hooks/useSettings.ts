import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: api.getSettings,
  });
}
