/**
 * CareID E2E Test Suite - Test Utilities & Runner Infrastructure
 * Provides standardized assertion primitives, execution timers, and suite registries.
 */

export interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export interface SuiteDefinition {
  name: string;
  tests: Array<{
    name: string;
    fn: () => Promise<void> | void;
    timeoutMs?: number;
  }>;
}

const registeredSuites: SuiteDefinition[] = [];
let currentSuite: SuiteDefinition | null = null;

/**
 * Register a test suite
 */
export function describe(suiteName: string, suiteFn: () => void) {
  const previousSuite = currentSuite;
  const newSuite: SuiteDefinition = { name: suiteName, tests: [] };
  registeredSuites.push(newSuite);
  currentSuite = newSuite;

  try {
    suiteFn();
  } finally {
    currentSuite = previousSuite;
  }
}

/**
 * Register an individual test case
 */
export function it(testName: string, testFn: () => Promise<void> | void, timeoutMs: number = 20000) {
  if (!currentSuite) {
    describe('Default Suite', () => {
      it(testName, testFn, timeoutMs);
    });
    return;
  }
  currentSuite.tests.push({ name: testName, fn: testFn, timeoutMs });
}

/**
 * Get all registered test suites
 */
export function getRegisteredSuites(): SuiteDefinition[] {
  return registeredSuites;
}

/**
 * Clear registry
 */
export function clearRegisteredSuites() {
  registeredSuites.length = 0;
  currentSuite = null;
}

// -----------------------------------------------------------------------------
// Assertion Primitives
// -----------------------------------------------------------------------------

export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed: expected true but received false');
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      `${message ? message + ' - ' : ''}Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
}

export function assertNotEqual<T>(actual: T, expected: T, message?: string) {
  if (actual === expected) {
    throw new Error(
      `${message ? message + ' - ' : ''}Expected value to NOT equal ${JSON.stringify(expected)}`
    );
  }
}

export function assertIncludes(haystack: string | unknown[], needle: unknown, message?: string) {
  if (typeof haystack === 'string') {
    if (!haystack.includes(String(needle))) {
      throw new Error(
        `${message ? message + ' - ' : ''}Expected "${haystack}" to contain "${String(needle)}"`
      );
    }
  } else if (Array.isArray(haystack)) {
    if (!haystack.includes(needle)) {
      throw new Error(
        `${message ? message + ' - ' : ''}Expected array to contain ${JSON.stringify(needle)}`
      );
    }
  }
}

export function assertMatches(actual: string, pattern: RegExp, message?: string) {
  if (!pattern.test(actual)) {
    throw new Error(
      `${message ? message + ' - ' : ''}Expected "${actual}" to match pattern ${pattern.toString()}`
    );
  }
}

export function assertDefined<T>(val: T | undefined | null, message?: string): asserts val is T {
  if (val === undefined || val === null) {
    throw new Error(message || 'Expected value to be defined and not null');
  }
}

export function assertGreaterThan(actual: number, expected: number, message?: string) {
  if (actual <= expected) {
    throw new Error(
      `${message ? message + ' - ' : ''}Expected ${actual} to be strictly greater than ${expected}`
    );
  }
}

export function assertInRange(actual: number, min: number, max: number, message?: string) {
  if (actual < min || actual > max) {
    throw new Error(
      `${message ? message + ' - ' : ''}Expected ${actual} to be between ${min} and ${max}`
    );
  }
}
