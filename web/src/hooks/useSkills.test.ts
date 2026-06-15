import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';
import { useSkills, useSkillDetail } from './useSkills';

const listSkillsMock = vi.fn();
const getSkillMock = vi.fn();

vi.mock('@/api/client', () => ({
  api: {
    listSkills: (...args: unknown[]) => listSkillsMock(...args),
    getSkill: (...args: unknown[]) => getSkillMock(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useSkills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches skills list on mount', async () => {
    const skills = [{ name: 'web-search' }, { name: 'log-analyzer' }];
    listSkillsMock.mockResolvedValue(skills);

    const { result } = renderHook(() => useSkills(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(skills);
    expect(listSkillsMock).toHaveBeenCalledOnce();
  });

  it('returns error state on failure', async () => {
    listSkillsMock.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSkills(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});

describe('useSkillDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches skill detail by name', async () => {
    const skill = { name: 'web-search', description: 'Search the web', version: '1.0' };
    getSkillMock.mockResolvedValue(skill);

    const { result } = renderHook(() => useSkillDetail('web-search'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(skill);
    expect(getSkillMock).toHaveBeenCalledWith('web-search');
  });

  it('does not fetch when name is empty', () => {
    const { result } = renderHook(() => useSkillDetail(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(getSkillMock).not.toHaveBeenCalled();
  });
});
