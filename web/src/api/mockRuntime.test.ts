import { describe, expect, it } from 'vitest';
import {
  areDevMocksEnabled,
  shouldForceCodeAnalysisMocks,
} from './mockRuntime';

describe('mock runtime switches', () => {
  it('enables mocks only in development when not explicitly disabled', () => {
    expect(
      areDevMocksEnabled({
        dev: true,
      }),
    ).toBe(true);

    expect(
      areDevMocksEnabled({
        dev: true,
        mockDisabled: true,
      }),
    ).toBe(false);

    expect(
      areDevMocksEnabled({
        dev: false,
      }),
    ).toBe(false);
  });

  it('enables mocks in production builds only via the fallback flag', () => {
    expect(
      areDevMocksEnabled({
        dev: false,
        mockFallback: true,
      }),
    ).toBe(true);

    expect(
      areDevMocksEnabled({
        dev: false,
        mockFallback: true,
        mockDisabled: true,
      }),
    ).toBe(false);
  });

  it('forces code-analysis mocks only for backend-less static demo deploys', () => {
    // 开发态默认走真实端点（后端不在时经统一回退路径落 mock）
    expect(
      shouldForceCodeAnalysisMocks({
        dev: true,
      }),
    ).toBe(false);

    // 静态演示部署（无后端）抢先 mock
    expect(
      shouldForceCodeAnalysisMocks({
        dev: false,
        mockFallback: true,
      }),
    ).toBe(true);

    // 显式强制真实端点优先于演示部署
    expect(
      shouldForceCodeAnalysisMocks({
        dev: false,
        mockFallback: true,
        forceRealCodeAnalysis: true,
      }),
    ).toBe(false);

    // 全局禁用 mock 时不得抢先
    expect(
      shouldForceCodeAnalysisMocks({
        dev: false,
        mockFallback: true,
        mockDisabled: true,
      }),
    ).toBe(false);
  });
});
