import { describe, expect, it } from 'vitest';
import {
  areDevMocksEnabled,
  shouldUseCodeAnalysisMocks,
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

  it('keeps code analysis mocks off when real API is forced', () => {
    expect(
      shouldUseCodeAnalysisMocks({
        dev: true,
        mockDisabled: false,
        forceRealCodeAnalysis: true,
      }),
    ).toBe(false);

    expect(
      shouldUseCodeAnalysisMocks({
        dev: true,
        mockDisabled: false,
        forceRealCodeAnalysis: false,
      }),
    ).toBe(true);
  });
});
