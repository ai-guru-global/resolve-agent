import { useSearchParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDocuments, useCollection } from '@/hooks/useRAG';
import type { Document as DocType, StatusVariant } from '@/types';

const docStatusMap: Record<string, { label: string; variant: StatusVariant }> = {
  indexed: { label: '已索引', variant: 'healthy' },
  processing: { label: '处理中', variant: 'progressing' },
  failed: { label: '失败', variant: 'failed' },
};

const formatLabels: Record<string, { label: string; color: string }> = {
  pdf: { label: 'PDF', color: 'destructive' },
  markdown: { label: 'MD', color: 'default' },
  txt: { label: 'TXT', color: 'secondary' },
  html: { label: 'HTML', color: 'outline' },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documents() {
  const [searchParams] = useSearchParams();
  const collectionId = searchParams.get('collection') ?? undefined;

  const { data: docsData, isLoading: docsLoading } = useDocuments(collectionId);
  const { data: collection } = useCollection(collectionId ?? '');

  const documents = docsData?.documents ?? [];

  const columns: DataTableColumn<DocType>[] = [
    { key: 'title', label: '标题', render: (val) => <span className="font-medium">{String(val)}</span> },
    {
      key: 'format',
      label: '格式',
      render: (val) => {
        const fmt = formatLabels[String(val)];
        return fmt ? (
          <Badge variant={fmt.color as 'destructive' | 'default' | 'secondary' | 'outline'}>{fmt.label}</Badge>
        ) : (
          <span>{String(val)}</span>
        );
      },
    },
    {
      key: 'size_bytes',
      label: '大小',
      render: (val) => <span className="font-mono text-xs">{formatSize(Number(val))}</span>,
    },
    {
      key: 'chunk_count',
      label: '分块数',
      render: (val) => <span className="font-mono">{String(val)}</span>,
    },
    {
      key: 'status',
      label: '状态',
      render: (val) => {
        const s = docStatusMap[String(val)];
        return s ? <StatusBadge variant={s.variant} label={s.label} /> : <span>{String(val)}</span>;
      },
    },
    {
      key: 'uploaded_at',
      label: '上传时间',
      render: (val) => <span className="text-xs">{new Date(String(val)).toLocaleString('zh-CN')}</span>,
    },
  ];

  // Add collection column when not filtered
  if (!collectionId) {
    columns.splice(1, 0, {
      key: 'collection_id',
      label: '所属集合',
      render: (val) => <span className="font-mono text-xs">{String(val)}</span>,
    });
  }

  const breadcrumbs = [
    { label: '知识库集合', href: '/rag/collections' },
    { label: collection?.name ?? (collectionId ? collectionId : '全部文档') },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="运维文档"
        description={docsLoading ? undefined : `共 ${documents.length} 个文档`}
        breadcrumbs={breadcrumbs}
      />

      {!docsLoading && documents.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="暂无文档"
            description="上传运维知识文档，构建智能运维知识库，支持 PDF、Markdown、TXT 等格式"
          />
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>文档列表</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <DataTable columns={columns} data={documents} loading={docsLoading} emptyMessage="暂无文档" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
