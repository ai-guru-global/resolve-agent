import type { HarnessConfig } from '../../types';

// ─── 延迟模拟，让体验更真实 ───
export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const randomDelay = () => delay(200 + Math.random() * 400);

// ─── Default Harness Configs ───
export const defaultHarness: HarnessConfig = {
  system_prompt: '',
  tools: [],
  skills: [],
  memory_enabled: true,
  hooks: [
    { name: '执行日志', type: 'post_execution', action: 'log_trace', enabled: true },
  ],
  sandbox_type: 'container',
  context_strategy: 'default',
};
