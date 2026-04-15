export type CodeAnalysisMockScenario = 'default' | 'empty' | 'error' | 'invalid';

export interface MockPaginationParams {
  page: number;
  page_size: number;
  total: number;
}

const MOCK_SCENARIO_PREFIX = 'resolveagent:mock:code-analysis:';

export class MockApiError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
    public readonly code = 'MOCK_ERROR',
  ) {
    super(message);
    this.name = 'MockApiError';
  }
}

export class MockValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MockValidationError';
  }
}

export function cloneMockData<T>(value: T): T {
  return structuredClone(value);
}

export async function waitForMockLatency(ms = 220): Promise<void> {
  await new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

export function resolveMockScenario(tabKey: string): CodeAnalysisMockScenario {
  if (typeof window === 'undefined') {
    return 'default';
  }

  const rawValue = window.localStorage
    .getItem(`${MOCK_SCENARIO_PREFIX}${tabKey}`)
    ?.trim()
    .toLowerCase();

  if (
    rawValue === 'empty'
    || rawValue === 'error'
    || rawValue === 'invalid'
  ) {
    return rawValue;
  }

  return 'default';
}

export function expectRecord(
  value: unknown,
  fieldName: string,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new MockValidationError(`${fieldName} must be an object`);
  }

  return value as Record<string, unknown>;
}

export function expectString(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new MockValidationError(`${fieldName} must be a non-empty string`);
  }

  return value;
}

export function expectNumber(
  value: unknown,
  fieldName: string,
): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new MockValidationError(`${fieldName} must be a valid number`);
  }

  return value;
}

export function expectStringArray(
  value: unknown,
  fieldName: string,
): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new MockValidationError(`${fieldName} must be a string array`);
  }

  return value;
}

export function expectArray(
  value: unknown,
  fieldName: string,
): unknown[] {
  if (!Array.isArray(value)) {
    throw new MockValidationError(`${fieldName} must be an array`);
  }

  return value;
}
