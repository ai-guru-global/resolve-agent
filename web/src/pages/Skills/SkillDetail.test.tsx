// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SkillDetailInfo } from '@/types';
import SkillDetail from './SkillDetail';

const getSkillMock = vi.fn();

vi.mock('@/api/client', () => ({
  api: {
    getSkill: (...args: unknown[]) => getSkillMock(...args),
  },
}));

function renderPage(initialPath = '/skills/SKILL-NET-001') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/skills/:name" element={<SkillDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const skillFixture: SkillDetailInfo = {
  name: 'SKILL-NET-001',
  display_name: 'DNS 解析失败诊断',
  version: '1.0',
  description: '用于诊断 CoreDNS 和集群内服务发现异常。',
  status: 'installed',
  author: 'ResolveNet Team',
  icon: '🌐',
  entry_point: 'skills/skill_net_001/skill.py',
  skill_type: 'scenario',
  scenario_config: {
    domain: 'network',
    tags: ['DNS', 'CoreDNS'],
    troubleshooting_flow: [
      {
        id: 'collect-dns-events',
        name: '收集 DNS 事件',
        description: '检查最近的 DNS 解析异常记录',
        step_type: 'collect',
        command: 'kubectl logs -n kube-system deploy/coredns',
        skill_ref: null,
        expected_output: 'dns_events',
        condition: null,
        timeout_seconds: 20,
        order: 1,
      },
    ],
    output_template: {
      include_symptoms: true,
      include_evidence: true,
      include_steps: true,
      include_resolution: true,
      custom_sections: [],
    },
    severity_levels: ['low', 'medium', 'high'],
  },
  inputs: [
    { name: 'target', type: 'string', description: '待排查服务', required: true },
  ],
  outputs: [
    { name: 'root_cause', type: 'string', description: '根因', required: false },
  ],
  permissions: {
    network_access: true,
    file_system_read: true,
    file_system_write: false,
    timeout_seconds: 90,
  },
  install_date: '2026-04-01T08:00:00Z',
  last_executed: '2026-04-12T09:30:00Z',
  execution_count: 245,
  level: 4,
  experience_points: 3680,
  next_level_experience: 4200,
  related_agent_count: 2,
};

describe('SkillDetail page', () => {
  afterEach(() => {
    getSkillMock.mockReset();
  });

  it('renders complete skill detail content from route param', async () => {
    getSkillMock.mockResolvedValue(skillFixture);

    renderPage();

    await screen.findByRole('heading', { name: 'DNS 解析失败诊断' });

    expect(screen.getByText('Lv.4')).toBeTruthy();
    expect(screen.getByText('3680 XP')).toBeTruthy();
    expect(screen.getByText('关联 Agents')).toBeTruthy();
    expect(screen.getByText('收集 DNS 事件')).toBeTruthy();
    expect(screen.getByText('4200 XP')).toBeTruthy();
    await waitFor(() => {
      expect(getSkillMock).toHaveBeenCalledWith('SKILL-NET-001');
    });
  });

  it('renders error feedback when detail loading fails', async () => {
    getSkillMock.mockRejectedValue(new Error('Skill not found'));

    renderPage('/skills/unknown-skill');

    await screen.findByText('Skill not found');
    expect(screen.getByRole('button', { name: '重试加载' })).toBeTruthy();
    expect(screen.getByText('返回技能列表')).toBeTruthy();
  });
});
