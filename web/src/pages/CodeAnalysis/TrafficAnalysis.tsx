import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Eye,
  Loader2,
  Network,
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
import { MetricCard } from '@/components/MetricCard';
import TrafficGraphViewer from '@/components/TrafficGraph/TrafficGraphViewer';
import {
  useTrafficGraphs,
  useTrafficGraph,
  useDeleteTrafficGraph,
} from '@/hooks/useCodeAnalysis';
import type { XYFlowGraphData, TrafficGraphInfo } from '@/types';

export default function TrafficAnalysis() {
  const {
    data,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useTrafficGraphs();
  const deleteGraph = useDeleteTrafficGraph();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const graphs = data?.graphs ?? [];

  // Compute aggregate metrics
  const totalServices = new Set(
    graphs.flatMap((g) => g.nodes?.map((n) => n.id) ?? []),
  ).size;
  const totalEdges = graphs.reduce((s, g) => s + (g.edges?.length ?? 0), 0);
  const analyzedCount = graphs.filter((g) => g.status === 'analyzed' || g.analysis_report).length;

  return (
    <div className="space-y-6">
      <CodeAnalysisMockBanner />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Traffic Graphs" value={isLoading ? '--' : String(graphs.length)} icon={Network} />
        <MetricCard label="Unique Services" value={isLoading ? '--' : String(totalServices)} icon={Activity} />
        <MetricCard label="Service Edges" value={isLoading ? '--' : String(totalEdges)} icon={Network} />
        <MetricCard label="Analyzed" value={isLoading ? '--' : String(analyzedCount)} icon={AlertTriangle} />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Traffic Topology Snapshots</p>
          <p className="text-xs text-muted-foreground">
            {graphs.length} graphs available
          </p>
        </div>
        {isFetching && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Refreshing
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-5 w-3/4 rounded bg-muted" /></CardHeader>
              <CardContent className="space-y-3">
                <div className="h-32 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Traffic Graphs Unavailable"
          description={error instanceof Error ? error.message : 'Failed to load traffic analysis graphs.'}
          action={{ label: 'Retry', onClick: () => void refetch() }}
        />
      ) : graphs.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No Traffic Graphs"
          description="Run a traffic analysis to capture and visualise service dependencies."
          action={{ label: 'Reload', onClick: () => void refetch() }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {graphs.map((graph) => (
            <TrafficGraphCard
              key={graph.id}
              graph={graph}
              onView={() => setSelectedId(graph.id)}
              onDelete={() => deleteGraph.mutate(graph.id)}
              isDeleting={deleteGraph.isPending}
            />
          ))}
        </div>
      )}

      {selectedId && (
        <TrafficGraphDialog
          graphId={selectedId}
          open={!!selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function TrafficGraphCard({
  graph,
  isDeleting,
  onView,
  onDelete,
}: {
  graph: TrafficGraphInfo;
  isDeleting: boolean;
  onView: () => void;
  onDelete: () => void;
}) {
  const nodeCount = graph.nodes?.length ?? 0;
  const edgeCount = graph.edges?.length ?? 0;
  const hasSuggestions = (graph.suggestions?.length ?? 0) > 0;

  return (
    <Card className="group border-border/60 transition-colors hover:border-primary/30">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1 flex-1 min-w-0">
          <CardTitle className="text-sm font-medium truncate">
            {graph.name || `Graph ${graph.id.slice(0, 8)}`}
          </CardTitle>
          {graph.capture_id && (
            <p className="text-xs text-muted-foreground">
              Capture: {graph.capture_id.slice(0, 8)}
            </p>
          )}
        </div>
        <Badge
          variant={
            graph.status === 'completed' || graph.status === 'analyzed'
              ? 'default'
              : 'secondary'
          }
          className="ml-2 shrink-0"
        >
          {graph.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="text-lg font-bold">{nodeCount}</div>
            <div className="text-muted-foreground">Services</div>
          </div>
          <div>
            <div className="text-lg font-bold">{edgeCount}</div>
            <div className="text-muted-foreground">Edges</div>
          </div>
          <div>
            <div className="text-lg font-bold">{graph.suggestions?.length ?? 0}</div>
            <div className="text-muted-foreground">Suggestions</div>
          </div>
        </div>

        {hasSuggestions && (
          <div className="mt-3 space-y-1">
            {graph.suggestions.slice(0, 2).map((s, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-orange-500" />
                <span className="text-muted-foreground line-clamp-1">{s.title}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
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

function TrafficGraphDialog({
  graphId,
  open,
  onClose,
}: {
  graphId: string;
  open: boolean;
  onClose: () => void;
}) {
  const {
    data: graph,
    error,
    isError,
    isLoading,
    refetch,
  } = useTrafficGraph(graphId);

  const xyData: XYFlowGraphData | null = graph
    ? {
        nodes: (graph.nodes ?? []).map((n, i) => ({
          id: n.id,
          type: 'serviceNode',
          position: { x: (i % 4) * 280, y: Math.floor(i / 4) * 160 },
          data: {
            label: n.label,
            requestCount: n.request_count,
            errorCount: n.error_count,
            avgLatencyMs: n.avg_latency_ms,
            protocols: n.protocols,
          },
        })),
        edges: (graph.edges ?? []).map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'trafficEdge',
          animated: e.error_count > 0,
          data: {
            requestCount: e.request_count,
            errorCount: e.error_count,
            avgLatencyMs: e.avg_latency_ms,
            protocols: e.protocols,
            methods: e.methods,
          },
        })),
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {graph?.name || `Traffic Graph ${graphId.slice(0, 8)}`}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3">
            <div className="h-[280px] animate-pulse rounded-lg bg-muted" />
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          </div>
        )}

        {isError && (
          <EmptyState
            icon={AlertTriangle}
            title="Traffic Graph Detail Failed"
            description={error instanceof Error ? error.message : 'Unable to load traffic graph detail.'}
            action={{ label: 'Retry', onClick: () => void refetch() }}
            className="py-8"
          />
        )}

        {!isLoading && !isError && <TrafficGraphViewer graphData={xyData} />}

        {!isLoading && !isError && graph?.analysis_report && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold">Analysis Report</h3>
            <div className="prose prose-sm dark:prose-invert max-h-[300px] overflow-y-auto rounded-md border p-4">
              <pre className="whitespace-pre-wrap text-xs">{graph.analysis_report}</pre>
            </div>
          </div>
        )}

        {!isLoading && !isError && graph?.suggestions && graph.suggestions.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold">Suggestions</h3>
            <div className="space-y-2">
              {graph.suggestions.map((s, i) => (
                <div key={i} className="rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        s.priority === 'high'
                          ? 'destructive'
                          : s.priority === 'medium'
                            ? 'default'
                            : 'secondary'
                      }
                      className="text-[10px]"
                    >
                      {s.priority}
                    </Badge>
                    <span className="text-sm font-medium">{s.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CodeAnalysisMockBanner() {
  if (!DEV_CODE_ANALYSIS_MOCKS_ENABLED) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
      <Network className="h-4 w-4 text-primary" />
      Running in development mock mode for Code Analysis data.
    </div>
  );
}
