import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getTrafficGraphMock,
  listTrafficGraphsMock,
  resetTrafficAnalysisMockState,
} from './trafficAnalysis';

function stubScenarioStorage(scenario?: string): void {
  vi.stubGlobal('window', {
    localStorage: {
      getItem: () => scenario ?? null,
    },
  });
}

describe('trafficAnalysis mock', () => {
  beforeEach(() => {
    resetTrafficAnalysisMockState();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a validated list payload and graph detail payload', async () => {
    stubScenarioStorage();

    const listResponse = await listTrafficGraphsMock();
    expect(listResponse.total).toBe(listResponse.graphs.length);
    expect(listResponse.graphs[0]).toMatchObject({
      id: expect.any(String),
      capture_id: expect.any(String),
      nodes: expect.any(Array),
      edges: expect.any(Array),
    });

    const detailResponse = await getTrafficGraphMock(listResponse.graphs[0]!.id);
    expect(detailResponse.nodes.length).toBeGreaterThan(0);
    expect(detailResponse.edges.length).toBeGreaterThan(0);
  });

  it('updates totals after deleting a graph', async () => {
    stubScenarioStorage();

    const { deleteTrafficGraphMock } = await import('./trafficAnalysis');
    const initialResponse = await listTrafficGraphsMock();
    await deleteTrafficGraphMock(initialResponse.graphs[0]!.id);

    const updatedResponse = await listTrafficGraphsMock();
    expect(updatedResponse.total).toBe(initialResponse.total - 1);
  });

  it('rejects invalid payload scenario through field validation', async () => {
    stubScenarioStorage('invalid');

    await expect(listTrafficGraphsMock()).rejects.toThrow(
      'traffic_graph.suggestion.priority has unsupported value "urgent"',
    );
  });
});
