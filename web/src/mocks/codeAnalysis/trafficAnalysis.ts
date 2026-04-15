import type {
  AnalysisStatus,
  TrafficGraphEdge,
  TrafficGraphInfo,
  TrafficGraphNode,
  TrafficSuggestion,
} from '@/types';
import {
  MockApiError,
  cloneMockData,
  expectArray,
  expectNumber,
  expectRecord,
  expectString,
  expectStringArray,
  resolveMockScenario,
  waitForMockLatency,
  type MockPaginationParams,
} from './shared';

interface TrafficGraphListResponse {
  graphs: TrafficGraphInfo[];
  total: number;
}

interface TrafficAnalysisMockPayload {
  pagination: MockPaginationParams;
  list: TrafficGraphInfo[];
  details: Record<string, TrafficGraphInfo>;
}

const DEFAULT_PAGINATION: MockPaginationParams = {
  page: 1,
  page_size: 10,
  total: 3,
};

const trafficGraphItems: TrafficGraphInfo[] = [
  {
    id: 'tg-checkout-critical-path',
    capture_id: 'capture-checkout-001',
    name: 'Checkout Critical Path',
    status: 'analyzed',
    graph_data: {
      environment: 'prod-cn-hz',
      window: '15m',
      sample_rate: 1,
    },
    nodes: [
      {
        id: 'api-gateway',
        label: 'api-gateway',
        request_count: 18204,
        error_count: 14,
        avg_latency_ms: 18,
        protocols: ['http'],
      },
      {
        id: 'checkout-service',
        label: 'checkout-service',
        request_count: 16892,
        error_count: 48,
        avg_latency_ms: 64,
        protocols: ['http', 'grpc'],
      },
      {
        id: 'payment-service',
        label: 'payment-service',
        request_count: 16540,
        error_count: 162,
        avg_latency_ms: 119,
        protocols: ['grpc'],
      },
      {
        id: 'risk-engine',
        label: 'risk-engine',
        request_count: 14820,
        error_count: 10,
        avg_latency_ms: 42,
        protocols: ['grpc'],
      },
    ],
    edges: [
      {
        id: 'edge-gw-checkout',
        source: 'api-gateway',
        target: 'checkout-service',
        request_count: 16892,
        error_count: 33,
        avg_latency_ms: 38,
        protocols: ['http'],
        methods: ['POST'],
      },
      {
        id: 'edge-checkout-payment',
        source: 'checkout-service',
        target: 'payment-service',
        request_count: 16540,
        error_count: 162,
        avg_latency_ms: 88,
        protocols: ['grpc'],
        methods: ['ChargeCard'],
      },
      {
        id: 'edge-checkout-risk',
        source: 'checkout-service',
        target: 'risk-engine',
        request_count: 14820,
        error_count: 10,
        avg_latency_ms: 42,
        protocols: ['grpc'],
        methods: ['ScoreOrder'],
      },
    ],
    analysis_report: 'Payment service p95 latency spikes after the checkout service fan-out. Error concentration is isolated to the gRPC charge path.',
    suggestions: [
      {
        title: 'Isolate payment service saturation',
        description: 'Increase payment worker concurrency and enable circuit breaking for the charge gRPC route.',
        priority: 'high',
      },
      {
        title: 'Reduce checkout fan-out retries',
        description: 'Cap retry attempts from checkout-service to payment-service during dependency degradation.',
        priority: 'medium',
      },
    ],
    created_at: '2026-04-15T09:40:00Z',
  },
  {
    id: 'tg-observability-mesh',
    capture_id: 'capture-observability-002',
    name: 'Observability Mesh',
    status: 'completed',
    graph_data: {
      environment: 'staging',
      window: '30m',
      sample_rate: 0.5,
    },
    nodes: [
      {
        id: 'otel-collector',
        label: 'otel-collector',
        request_count: 6820,
        error_count: 0,
        avg_latency_ms: 11,
        protocols: ['otlp', 'grpc'],
      },
      {
        id: 'metrics-writer',
        label: 'metrics-writer',
        request_count: 6411,
        error_count: 2,
        avg_latency_ms: 26,
        protocols: ['grpc'],
      },
      {
        id: 'trace-store',
        label: 'trace-store',
        request_count: 6110,
        error_count: 4,
        avg_latency_ms: 71,
        protocols: ['http'],
      },
    ],
    edges: [
      {
        id: 'edge-collector-writer',
        source: 'otel-collector',
        target: 'metrics-writer',
        request_count: 6411,
        error_count: 2,
        avg_latency_ms: 24,
        protocols: ['grpc'],
        methods: ['ExportMetrics'],
      },
      {
        id: 'edge-writer-store',
        source: 'metrics-writer',
        target: 'trace-store',
        request_count: 6110,
        error_count: 4,
        avg_latency_ms: 63,
        protocols: ['http'],
        methods: ['POST'],
      },
    ],
    analysis_report: 'The observability pipeline remains stable, with low error density and a single hotspot on trace-store ingestion latency.',
    suggestions: [
      {
        title: 'Tune trace-store ingestion pool',
        description: 'Increase trace-store async writer workers before enabling full-fidelity tracing in staging.',
        priority: 'low',
      },
    ],
    created_at: '2026-04-15T09:44:00Z',
  },
  {
    id: 'tg-traffic-replay',
    capture_id: 'capture-replay-003',
    name: 'Traffic Replay Verification',
    status: 'running',
    graph_data: {
      environment: 'pre-release',
      window: '5m',
      sample_rate: 1,
    },
    nodes: [
      {
        id: 'replay-gateway',
        label: 'replay-gateway',
        request_count: 1421,
        error_count: 0,
        avg_latency_ms: 22,
        protocols: ['http'],
      },
      {
        id: 'feature-flag-service',
        label: 'feature-flag-service',
        request_count: 1380,
        error_count: 3,
        avg_latency_ms: 17,
        protocols: ['http'],
      },
    ],
    edges: [
      {
        id: 'edge-replay-flag',
        source: 'replay-gateway',
        target: 'feature-flag-service',
        request_count: 1380,
        error_count: 3,
        avg_latency_ms: 17,
        protocols: ['http'],
        methods: ['GET'],
      },
    ],
    analysis_report: '',
    suggestions: [],
    created_at: '2026-04-15T09:47:00Z',
  },
];

function buildTrafficGraphDetails(items: TrafficGraphInfo[]): Record<string, TrafficGraphInfo> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

function buildDefaultPayload(): TrafficAnalysisMockPayload {
  return {
    pagination: {
      ...DEFAULT_PAGINATION,
      total: trafficGraphItems.length,
    },
    list: cloneMockData(trafficGraphItems),
    details: buildTrafficGraphDetails(cloneMockData(trafficGraphItems)),
  };
}

let currentPayload = buildDefaultPayload();

function assertAnalysisStatus(
  value: unknown,
  fieldName: string,
): AnalysisStatus {
  const status = expectString(value, fieldName);
  const allowedStatuses: AnalysisStatus[] = [
    'pending',
    'running',
    'completed',
    'error',
    'analyzed',
  ];

  if (!allowedStatuses.includes(status as AnalysisStatus)) {
    throw new MockApiError(`${fieldName} has unsupported status "${status}"`, 500, 'INVALID_STATUS');
  }

  return status as AnalysisStatus;
}

function validateTrafficNode(value: unknown): TrafficGraphNode {
  const record = expectRecord(value, 'traffic_graph.node');

  return {
    id: expectString(record.id, 'traffic_graph.node.id'),
    label: expectString(record.label, 'traffic_graph.node.label'),
    request_count: expectNumber(record.request_count, 'traffic_graph.node.request_count'),
    error_count: expectNumber(record.error_count, 'traffic_graph.node.error_count'),
    avg_latency_ms: expectNumber(record.avg_latency_ms, 'traffic_graph.node.avg_latency_ms'),
    protocols: expectStringArray(record.protocols, 'traffic_graph.node.protocols'),
  };
}

function validateTrafficEdge(value: unknown): TrafficGraphEdge {
  const record = expectRecord(value, 'traffic_graph.edge');

  return {
    id: expectString(record.id, 'traffic_graph.edge.id'),
    source: expectString(record.source, 'traffic_graph.edge.source'),
    target: expectString(record.target, 'traffic_graph.edge.target'),
    request_count: expectNumber(record.request_count, 'traffic_graph.edge.request_count'),
    error_count: expectNumber(record.error_count, 'traffic_graph.edge.error_count'),
    avg_latency_ms: expectNumber(record.avg_latency_ms, 'traffic_graph.edge.avg_latency_ms'),
    protocols: expectStringArray(record.protocols, 'traffic_graph.edge.protocols'),
    methods: expectStringArray(record.methods, 'traffic_graph.edge.methods'),
  };
}

function validateTrafficSuggestion(value: unknown): TrafficSuggestion {
  const record = expectRecord(value, 'traffic_graph.suggestion');
  const priority = expectString(record.priority, 'traffic_graph.suggestion.priority');

  if (!['high', 'medium', 'low'].includes(priority)) {
    throw new MockApiError(
      `traffic_graph.suggestion.priority has unsupported value "${priority}"`,
      500,
      'INVALID_PRIORITY',
    );
  }

  return {
    title: expectString(record.title, 'traffic_graph.suggestion.title'),
    description: expectString(record.description, 'traffic_graph.suggestion.description'),
    priority: priority as TrafficSuggestion['priority'],
  };
}

export function validateTrafficGraphInfo(value: unknown): TrafficGraphInfo {
  const record = expectRecord(value, 'traffic_graph');

  return {
    id: expectString(record.id, 'traffic_graph.id'),
    capture_id: expectString(record.capture_id, 'traffic_graph.capture_id'),
    name: expectString(record.name, 'traffic_graph.name'),
    status: assertAnalysisStatus(record.status, 'traffic_graph.status'),
    graph_data: expectRecord(record.graph_data, 'traffic_graph.graph_data'),
    nodes: expectArray(record.nodes, 'traffic_graph.nodes').map((item) => validateTrafficNode(item)),
    edges: expectArray(record.edges, 'traffic_graph.edges').map((item) => validateTrafficEdge(item)),
    analysis_report: typeof record.analysis_report === 'string' ? record.analysis_report : '',
    suggestions: expectArray(record.suggestions, 'traffic_graph.suggestions')
      .map((item) => validateTrafficSuggestion(item)),
    created_at: record.created_at ? expectString(record.created_at, 'traffic_graph.created_at') : undefined,
  };
}

export function validateTrafficGraphListResponse(value: unknown): TrafficGraphListResponse {
  const record = expectRecord(value, 'traffic_graph_list_response');

  return {
    graphs: expectArray(record.graphs, 'traffic_graph_list_response.graphs')
      .map((item) => validateTrafficGraphInfo(item)),
    total: expectNumber(record.total, 'traffic_graph_list_response.total'),
  };
}

export function resetTrafficAnalysisMockState(): void {
  currentPayload = buildDefaultPayload();
}

function getScenarioPayload(): TrafficAnalysisMockPayload {
  const scenario = resolveMockScenario('traffic-analysis');

  if (scenario === 'empty') {
    return {
      pagination: { ...DEFAULT_PAGINATION, total: 0 },
      list: [],
      details: {},
    };
  }

  if (scenario === 'error') {
    throw new MockApiError(
      'Mock traffic analysis service could not load graph topology.',
      502,
      'TRAFFIC_GRAPH_UPSTREAM_ERROR',
    );
  }

  if (scenario === 'invalid') {
    const invalidGraph = trafficGraphItems[0];
    const invalidSuggestion = invalidGraph?.suggestions[0];

    if (!invalidGraph || !invalidSuggestion) {
      throw new MockApiError('Mock traffic analysis seed data is missing.', 500, 'MISSING_SEED_DATA');
    }

    return {
      pagination: { ...DEFAULT_PAGINATION, total: 1 },
      list: [
        {
          ...invalidGraph,
          suggestions: [
            {
              ...invalidSuggestion,
              priority: 'urgent' as TrafficSuggestion['priority'],
            },
          ],
        },
      ],
      details: {},
    };
  }

  return currentPayload;
}

export async function listTrafficGraphsMock(): Promise<TrafficGraphListResponse> {
  await waitForMockLatency(260);

  const payload = getScenarioPayload();
  return validateTrafficGraphListResponse({
    graphs: cloneMockData(payload.list),
    total: payload.list.length,
  });
}

export async function getTrafficGraphMock(id: string): Promise<TrafficGraphInfo> {
  await waitForMockLatency(180);

  const payload = getScenarioPayload();
  const graph = payload.details[id];

  if (!graph) {
    throw new MockApiError(`Mock traffic graph "${id}" not found.`, 404, 'TRAFFIC_GRAPH_NOT_FOUND');
  }

  return validateTrafficGraphInfo(cloneMockData(graph));
}

export async function deleteTrafficGraphMock(id: string): Promise<void> {
  await waitForMockLatency(120);

  const graph = currentPayload.details[id];
  if (!graph) {
    throw new MockApiError(`Mock traffic graph "${id}" not found.`, 404, 'TRAFFIC_GRAPH_NOT_FOUND');
  }

  const nextList = currentPayload.list.filter((item) => item.id !== id);
  currentPayload = {
    pagination: {
      ...currentPayload.pagination,
      total: nextList.length,
    },
    list: nextList,
    details: buildTrafficGraphDetails(nextList),
  };
}

export const trafficAnalysisMockDataset = {
  pagination: DEFAULT_PAGINATION,
  list: trafficGraphItems,
  details: buildTrafficGraphDetails(trafficGraphItems),
};
