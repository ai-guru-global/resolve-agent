import type { AnalysisStatus, CallGraphInfo } from '@/types';
import {
  MockApiError,
  cloneMockData,
  expectArray,
  expectNumber,
  expectRecord,
  expectString,
  resolveMockScenario,
  waitForMockLatency,
  type MockPaginationParams,
} from './shared';

interface CallGraphListResponse {
  call_graphs: CallGraphInfo[];
  total: number;
}

interface CallGraphsMockPayload {
  pagination: MockPaginationParams;
  list: CallGraphInfo[];
  details: Record<string, CallGraphInfo>;
}

const DEFAULT_PAGINATION: MockPaginationParams = {
  page: 1,
  page_size: 10,
  total: 4,
};

const defaultCallGraphItems: CallGraphInfo[] = [
  {
    id: 'cg-checkout-service',
    analysis_id: 'analysis-checkout-20260415',
    repository_url: 'https://github.com/resolveagent/checkout-service',
    branch: 'main',
    language: 'Go',
    entry_point: 'cmd/server/main.go',
    node_count: 128,
    edge_count: 246,
    max_depth: 12,
    status: 'completed',
    created_at: '2026-04-15T09:10:00Z',
  },
  {
    id: 'cg-payment-worker',
    analysis_id: 'analysis-payment-20260415',
    repository_url: 'https://github.com/resolveagent/payment-worker',
    branch: 'release/2026.04',
    language: 'Python',
    entry_point: 'app/worker.py',
    node_count: 84,
    edge_count: 153,
    max_depth: 9,
    status: 'completed',
    created_at: '2026-04-15T09:18:00Z',
  },
  {
    id: 'cg-ingress-gateway',
    analysis_id: 'analysis-ingress-20260415',
    repository_url: 'https://github.com/resolveagent/ingress-gateway',
    branch: 'feature/otel-hardening',
    language: 'TypeScript',
    entry_point: 'src/bootstrap.ts',
    node_count: 173,
    edge_count: 327,
    max_depth: 15,
    status: 'running',
    created_at: '2026-04-15T09:25:00Z',
  },
  {
    id: 'cg-order-aggregator',
    analysis_id: 'analysis-order-20260415',
    repository_url: 'https://github.com/resolveagent/order-aggregator',
    branch: 'main',
    language: 'Java',
    entry_point: 'com.resolveagent.order.Application',
    node_count: 211,
    edge_count: 451,
    max_depth: 18,
    status: 'error',
    created_at: '2026-04-15T09:31:00Z',
  },
];

function buildCallGraphDetails(items: CallGraphInfo[]): Record<string, CallGraphInfo> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

function buildDefaultPayload(): CallGraphsMockPayload {
  return {
    pagination: {
      ...DEFAULT_PAGINATION,
      total: defaultCallGraphItems.length,
    },
    list: cloneMockData(defaultCallGraphItems),
    details: buildCallGraphDetails(cloneMockData(defaultCallGraphItems)),
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

export function validateCallGraphInfo(value: unknown): CallGraphInfo {
  const record = expectRecord(value, 'call_graph');

  return {
    id: expectString(record.id, 'call_graph.id'),
    analysis_id: expectString(record.analysis_id, 'call_graph.analysis_id'),
    repository_url: expectString(record.repository_url, 'call_graph.repository_url'),
    branch: expectString(record.branch, 'call_graph.branch'),
    language: expectString(record.language, 'call_graph.language'),
    entry_point: expectString(record.entry_point, 'call_graph.entry_point'),
    node_count: expectNumber(record.node_count, 'call_graph.node_count'),
    edge_count: expectNumber(record.edge_count, 'call_graph.edge_count'),
    max_depth: expectNumber(record.max_depth, 'call_graph.max_depth'),
    status: assertAnalysisStatus(record.status, 'call_graph.status'),
    created_at: record.created_at ? expectString(record.created_at, 'call_graph.created_at') : undefined,
  };
}

export function validateCallGraphListResponse(value: unknown): CallGraphListResponse {
  const record = expectRecord(value, 'call_graph_list_response');
  const items = expectArray(record.call_graphs, 'call_graph_list_response.call_graphs')
    .map((item) => validateCallGraphInfo(item));

  return {
    call_graphs: items,
    total: expectNumber(record.total, 'call_graph_list_response.total'),
  };
}

export function resetCallGraphsMockState(): void {
  currentPayload = buildDefaultPayload();
}

function getScenarioPayload(): CallGraphsMockPayload {
  const scenario = resolveMockScenario('call-graphs');

  if (scenario === 'empty') {
    return {
      pagination: { ...DEFAULT_PAGINATION, total: 0 },
      list: [],
      details: {},
    };
  }

  if (scenario === 'error') {
    throw new MockApiError(
      'Mock call graph service temporarily unavailable.',
      503,
      'CALL_GRAPH_SERVICE_UNAVAILABLE',
    );
  }

  if (scenario === 'invalid') {
    const invalidItem = defaultCallGraphItems[0];
    if (!invalidItem) {
      throw new MockApiError('Mock call graph seed data is missing.', 500, 'MISSING_SEED_DATA');
    }

    return {
      pagination: { ...DEFAULT_PAGINATION, total: 1 },
      list: [
        {
          ...invalidItem,
          status: 'broken' as AnalysisStatus,
        },
      ],
      details: {},
    };
  }

  return currentPayload;
}

function filterByAnalysisId(items: CallGraphInfo[], analysisId?: string): CallGraphInfo[] {
  if (!analysisId) {
    return items;
  }

  return items.filter((item) => item.analysis_id === analysisId);
}

export async function listCallGraphsMock(
  analysisId?: string,
): Promise<CallGraphListResponse> {
  await waitForMockLatency();

  const payload = getScenarioPayload();
  const filteredItems = filterByAnalysisId(payload.list, analysisId);

  return validateCallGraphListResponse({
    call_graphs: cloneMockData(filteredItems),
    total: filteredItems.length,
  });
}

export async function getCallGraphMock(id: string): Promise<CallGraphInfo> {
  await waitForMockLatency(180);

  const payload = getScenarioPayload();
  const graph = payload.details[id];

  if (!graph) {
    throw new MockApiError(`Mock call graph "${id}" not found.`, 404, 'CALL_GRAPH_NOT_FOUND');
  }

  return validateCallGraphInfo(cloneMockData(graph));
}

export async function deleteCallGraphMock(id: string): Promise<void> {
  await waitForMockLatency(120);

  const graph = currentPayload.details[id];
  if (!graph) {
    throw new MockApiError(`Mock call graph "${id}" not found.`, 404, 'CALL_GRAPH_NOT_FOUND');
  }

  const nextList = currentPayload.list.filter((item) => item.id !== id);
  currentPayload = {
    pagination: {
      ...currentPayload.pagination,
      total: nextList.length,
    },
    list: nextList,
    details: buildCallGraphDetails(nextList),
  };
}

export const callGraphsMockDataset = {
  pagination: DEFAULT_PAGINATION,
  list: defaultCallGraphItems,
  details: buildCallGraphDetails(defaultCallGraphItems),
};
