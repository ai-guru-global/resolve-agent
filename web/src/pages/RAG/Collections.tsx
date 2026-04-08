import { Link } from 'react-router-dom';
import { Database } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollections } from '@/hooks/useRAG';

export default function Collections() {
  const { data, isLoading } = useCollections();

  const collections = data?.collections ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="知识库集合"
        description={isLoading ? undefined : `共 ${collections.length} 个集合`}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : collections.length === 0 ? (
        <Card>
          <EmptyState
            icon={Database}
            title="暂无知识库集合"
            description="请通过 CLI 或 API 创建向量知识库集合，用于 RAG 检索增强生成"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <Link key={col.id} to={`/rag/documents?collection=${col.id}`}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{col.name}</CardTitle>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {col.document_count} 文档
                    </Badge>
                  </div>
                  {'description' in col && (
                    <CardDescription>{(col as { description: string }).description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    {col.vector_count.toLocaleString()} 向量
                  </span>
                  {'embedding_model' in col && (
                    <span className="font-mono text-xs">{(col as { embedding_model: string }).embedding_model}</span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
