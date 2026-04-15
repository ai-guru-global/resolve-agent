export interface MockRuntimeEnv {
  dev: boolean;
  mockDisabled?: boolean;
  forceRealCodeAnalysis?: boolean;
}

export function areDevMocksEnabled(env: MockRuntimeEnv): boolean {
  return env.dev && !env.mockDisabled;
}

export function shouldUseCodeAnalysisMocks(env: MockRuntimeEnv): boolean {
  return areDevMocksEnabled(env) && !env.forceRealCodeAnalysis;
}

export const DEV_MOCK_ENV: MockRuntimeEnv = {
  dev: import.meta.env.DEV,
  mockDisabled: import.meta.env.VITE_ENABLE_MOCK === 'false',
  forceRealCodeAnalysis: import.meta.env.VITE_CODE_ANALYSIS_FORCE_REAL === 'true',
};

export const DEV_MOCKS_ENABLED = areDevMocksEnabled(DEV_MOCK_ENV);
export const DEV_CODE_ANALYSIS_MOCKS_ENABLED = shouldUseCodeAnalysisMocks(DEV_MOCK_ENV);
