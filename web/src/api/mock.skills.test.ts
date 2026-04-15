import { describe, expect, it } from 'vitest';
import { mockApi } from './mock';

describe('skills detail mock coverage', () => {
  it('returns detail for scenario skills that exist in the list only dataset', async () => {
    const detail = await mockApi.getSkill('SKILL-NET-001');

    expect(detail.name).toBe('SKILL-NET-001');
    expect(detail.display_name).toBe('DNS 解析失败诊断');
    expect(detail.skill_type).toBe('scenario');
    expect(detail.scenario_config?.domain).toBe('network');
    expect(detail.level).toBeGreaterThan(0);
    expect(detail.experience_points).toBeGreaterThan(0);
  });
});
