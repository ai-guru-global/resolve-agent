import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: api.listSkills,
  });
}

export function useSkillDetail(name: string) {
  return useQuery({
    queryKey: ['skills', name],
    queryFn: () => api.getSkill(name),
    enabled: !!name,
  });
}
