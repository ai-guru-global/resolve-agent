import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useCollections() {
  return useQuery({
    queryKey: ['rag', 'collections'],
    queryFn: api.listCollectionDetails,
  });
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: ['rag', 'collections', id],
    queryFn: () => api.getCollection(id),
    enabled: !!id,
  });
}

export function useDocuments(collectionId?: string) {
  return useQuery({
    queryKey: ['rag', 'documents', collectionId],
    queryFn: () => api.listDocuments(collectionId),
  });
}
