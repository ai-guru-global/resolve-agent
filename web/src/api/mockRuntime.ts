export interface MockRuntimeEnv {
  dev: boolean;
  // 生产构建也启用 mock 回退，用于无后端的静态演示部署（如 GitHub Pages）
  mockFallback?: boolean;
  mockDisabled?: boolean;
  forceRealCodeAnalysis?: boolean;
}

export function areDevMocksEnabled(env: MockRuntimeEnv): boolean {
  return (env.dev || env.mockFallback === true) && !env.mockDisabled;
}

// code-analysis 六方法（call-graphs / traffic graphs）默认走真实端点——
// 后端路由已全部就绪（见 pkg/server/router.go）。仅无后端的静态演示部署
// （mockFallback）需要抢先 mock；开发态后端不在或请求失败时，经 client.ts
// 的统一回退路径落 mock，与其余方法行为一致。
export function shouldForceCodeAnalysisMocks(env: MockRuntimeEnv): boolean {
  return (
    env.mockFallback === true &&
    !env.mockDisabled &&
    env.forceRealCodeAnalysis !== true
  );
}

export const DEV_MOCK_ENV: MockRuntimeEnv = {
  dev: import.meta.env.DEV,
  mockFallback: import.meta.env.VITE_MOCK_FALLBACK === '1',
  mockDisabled: import.meta.env.VITE_ENABLE_MOCK === 'false',
  forceRealCodeAnalysis: import.meta.env.VITE_CODE_ANALYSIS_FORCE_REAL === 'true',
};

export const DEV_MOCKS_ENABLED = areDevMocksEnabled(DEV_MOCK_ENV);
export const CODE_ANALYSIS_FORCE_MOCK = shouldForceCodeAnalysisMocks(DEV_MOCK_ENV);
