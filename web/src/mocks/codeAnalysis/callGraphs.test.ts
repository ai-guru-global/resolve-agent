import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCallGraphMock,
  listCallGraphsMock,
  resetCallGraphsMockState,
} from './callGraphs';

function stubScenarioStorage(scenario?: string): void {
  vi.stubGlobal('window', {
    localStorage: {
      getItem: () => scenario ?? null,
    },
  });
}

describe('callGraphs mock', () => {
  beforeEach(() => {
    resetCallGraphsMockState();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a validated list payload and detail payload', async () => {
    stubScenarioStorage();

    const listResponse = await listCallGraphsMock();
    expect(listResponse.total).toBe(listResponse.call_graphs.length);
    expect(listResponse.call_graphs[0]).toMatchObject({
      id: expect.any(String),
      analysis_id: expect.any(String),
      repository_url: expect.any(String),
      entry_point: expect.any(String),
    });

    const detailResponse = await getCallGraphMock(listResponse.call_graphs[0]!.id);
    expect(detailResponse.id).toBe(listResponse.call_graphs[0]!.id);
    expect(detailResponse.status).toMatch(/completed|running|error|pending|analyzed/);
  });

  it('updates totals after deleting an item', async () => {
    stubScenarioStorage();

    const { deleteCallGraphMock } = await import('./callGraphs');
    const initialResponse = await listCallGraphsMock();
    await deleteCallGraphMock(initialResponse.call_graphs[0]!.id);

    const updatedResponse = await listCallGraphsMock();
    expect(updatedResponse.total).toBe(initialResponse.total - 1);
  });

  it('supports explicit error simulation', async () => {
    stubScenarioStorage('error');

    await expect(listCallGraphsMock()).rejects.toThrow(
      'Mock call graph service temporarily unavailable.',
    );
  });
});
