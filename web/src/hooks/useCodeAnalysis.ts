import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export function useCallGraphs(analysisId?: string) {
  return useQuery({
    queryKey: ['call-graphs', analysisId],
    queryFn: () => api.listCallGraphs(analysisId),
  });
}

export function useCallGraph(id: string) {
  return useQuery({
    queryKey: ['call-graphs', id],
    queryFn: () => api.getCallGraph(id),
    enabled: !!id,
  });
}

export function useDeleteCallGraph() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCallGraph(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['call-graphs'] }),
  });
}

export function useTrafficCaptures() {
  return useQuery({
    queryKey: ['traffic-captures'],
    queryFn: () => api.listTrafficCaptures(),
  });
}

export function useTrafficCapture(id: string) {
  return useQuery({
    queryKey: ['traffic-captures', id],
    queryFn: () => api.getTrafficCapture(id),
    enabled: !!id,
  });
}

export function useDeleteTrafficCapture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTrafficCapture(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['traffic-captures'] }),
  });
}

export function useTrafficGraphs() {
  return useQuery({
    queryKey: ['traffic-graphs'],
    queryFn: () => api.listTrafficGraphs(),
  });
}

export function useTrafficGraph(id: string) {
  return useQuery({
    queryKey: ['traffic-graphs', id],
    queryFn: () => api.getTrafficGraph(id),
    enabled: !!id,
  });
}

export function useDeleteTrafficGraph() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTrafficGraph(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['traffic-graphs'] }),
  });
}
