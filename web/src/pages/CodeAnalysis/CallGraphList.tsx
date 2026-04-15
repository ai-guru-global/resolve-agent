import { useState } from 'react';
import {
  AlertTriangle,
  Eye,
  GitBranch,
  Loader2,
  Trash2,
} from 'lucide-react';
import { DEV_CODE_ANALYSIS_MOCKS_ENABLED } from '@/api/mockRuntime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/EmptyState';
import {
  useCallGraph,
  useCallGraphs,
  useDeleteCallGraph,
} from '@/hooks/useCodeAnalysis';
import type { CallGraphInfo } from '@/types';

export default function CallGraphList() {
  const {
    data,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useCallGraphs();
  const deleteGraph = useDeleteCallGraph();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const graphs = data?.call_graphs ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <CodeAnalysisMockBanner />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="h-5 w-3/4 rounded bg-muted" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-20 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <CodeAnalysisMockBanner />
        <EmptyState
          icon={AlertTriangle}
          title="Call Graphs Unavailable"
          description={error instanceof Error ? error.message : 'Failed to load call graph records.'}
          action={{ label: 'Retry', onClick: () => void refetch() }}
        />
      </div>
    );
  }

  if (graphs.length === 0) {
    return (
      <div className="space-y-4">
        <CodeAnalysisMockBanner />
        <EmptyState
          icon={GitBranch}
          title="No Call Graphs"
          description="Run a static analysis to generate call graphs from your repositories."
          action={{ label: 'Reload', onClick: () => void refetch() }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CodeAnalysisMockBanner />
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Call Graph Inventory</p>
          <p className="text-xs text-muted-foreground">
            {graphs.length} records loaded
          </p>
        </div>
        {isFetching && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Refreshing
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {graphs.map((graph) => (
          <CallGraphCard
            key={graph.id}
            graph={graph}
            onView={() => setSelectedId(graph.id)}
            onDelete={() => deleteGraph.mutate(graph.id)}
            isDeleting={deleteGraph.isPending}
          />
        ))}
      </div>

      {selectedId && (
        <CallGraphDialog
          graphId={selectedId}
          open={selectedId !== null}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function CallGraphCard({
  graph,
  isDeleting,
  onDelete,
  onView,
}: {
  graph: CallGraphInfo;
  isDeleting: boolean;
  onDelete: () => void;
  onView: () => void;
}) {
  return (
    <Card className="group border-border/60 transition-colors hover:border-primary/30">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle className="truncate text-sm font-medium">
            {graph.entry_point || graph.id.slice(0, 8)}
          </CardTitle>
          <p className="truncate text-xs text-muted-foreground">
            {graph.repository_url || 'Local analysis'}
          </p>
        </div>
        <Badge
          variant={graph.status === 'completed' ? 'default' : 'secondary'}
          className="ml-2 shrink-0 capitalize"
        >
          {graph.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="text-lg font-bold">{graph.node_count}</div>
            <div className="text-muted-foreground">Nodes</div>
          </div>
          <div>
            <div className="text-lg font-bold">{graph.edge_count}</div>
            <div className="text-muted-foreground">Edges</div>
          </div>
          <div>
            <div className="text-lg font-bold">{graph.max_depth}</div>
            <div className="text-muted-foreground">Depth</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {graph.language && (
            <Badge variant="outline" className="text-[10px]">
              {graph.language}
            </Badge>
          )}
          {graph.branch && (
            <Badge variant="outline" className="text-[10px]">
              {graph.branch}
            </Badge>
          )}
        </div>

        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onView}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CallGraphDialog({
  graphId,
  onClose,
  open,
}: {
  graphId: string;
  onClose: () => void;
  open: boolean;
}) {
  const {
    data: graph,
    error,
    isError,
    isLoading,
    refetch,
  } = useCallGraph(graphId);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{graph?.entry_point || `Call Graph ${graphId.slice(0, 8)}`}</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
          </div>
        )}

        {isError && (
          <EmptyState
            icon={AlertTriangle}
            title="Call Graph Detail Failed"
            description={error instanceof Error ? error.message : 'Unable to load call graph detail.'}
            action={{ label: 'Retry', onClick: () => void refetch() }}
            className="py-8"
          />
        )}

        {!isLoading && !isError && graph && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <CallGraphDetailField label="Repository" value={graph.repository_url} />
              <CallGraphDetailField label="Analysis ID" value={graph.analysis_id} />
              <CallGraphDetailField label="Branch" value={graph.branch} />
              <CallGraphDetailField label="Language" value={graph.language} />
              <CallGraphDetailField label="Created At" value={graph.created_at ?? 'N/A'} />
              <CallGraphDetailField label="Status" value={graph.status} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <MetricTile label="Nodes" value={graph.node_count} />
              <MetricTile label="Edges" value={graph.edge_count} />
              <MetricTile label="Depth" value={graph.max_depth} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CallGraphDetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 break-all text-sm font-medium">{value}</div>
    </div>
  );
}

function MetricTile({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function CodeAnalysisMockBanner() {
  if (!DEV_CODE_ANALYSIS_MOCKS_ENABLED) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
      <GitBranch className="h-4 w-4 text-primary" />
      Running in development mock mode for Code Analysis data.
    </div>
  );
}
