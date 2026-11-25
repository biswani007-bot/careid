/**
 * CareID Consultations & Treatment Lifecycle - Test Utilities & Runner Infrastructure
 * Standardized assertion primitives, timing telemetry, and test registry.
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
  tier: 1 | 2 | 3 | 4;
  tests: Array<{
    name: string;
    fn: () => Promise<void> | void;
    timeoutMs?: number;
  }>;
}

const registeredSuites: SuiteDefinition[] = [];
let currentSuite: SuiteDefinition | null = null;

/**
 * Register a test suite with explicit tier
 */
export function describeSuite(suiteName: string, tier: 1 | 2 | 3 | 4, suiteFn: () => void) {
  const previousSuite = currentSuite;
  const newSuite: SuiteDefinition = { name: suiteName, tier, tests: [] };
  registeredSuites.push(newSuite);
  currentSuite = newSuite;

  try {
    suiteFn();
  } finally {
    currentSuite = previousSuite;
  }
}

/**
 * Standard describe shorthand (infers tier from suite name or defaults to 1)
 */
export function describe(suiteName: string, suiteFn: () => void) {
  let tier: 1 | 2 | 3 | 4 = 1;
  const lower = suiteName.toLowerCase();
  if (lower.startsWith('feature') || lower.includes('tier 1')) {
    tier = 1;
  } else if (lower.includes('tier 2') || lower.includes('boundary')) {
    tier = 2;
  } else if (lower.includes('tier 3') || lower.includes('cross-feature') || lower.includes('cross feature')) {
    tier = 3;
  } else if (lower.includes('tier 4') || lower.includes('clinical') || lower.includes('scenario')) {
    tier = 4;
  }
  describeSuite(suiteName, tier, suiteFn);
}

/**
 * Register an individual test case
 */
export function it(testName: string, testFn: () => Promise<void> | void, timeoutMs: number = 25000) {
  if (!currentSuite) {
    describeSuite('Default Suite', 1, () => {
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

export function assertGreaterThanOrEqual(actual: number, expected: number, message?: string) {
  if (actual < expected) {
    throw new Error(
      `${message ? message + ' - ' : ''}Expected ${actual} to be >= ${expected}`
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

export async function assertThrowsAsync(
  fn: () => Promise<unknown>,
  expectedErrorOrStatus?: string | number | RegExp,
  message?: string
) {
  let threw = false;
  try {
    await fn();
  } catch (err: unknown) {
    threw = true;
    const msg = err instanceof Error ? err.message : String(err);
    if (expectedErrorOrStatus !== undefined) {
      if (typeof expectedErrorOrStatus === 'number') {
        const hasStatus = (err as { statusCode?: number; status?: number })?.statusCode === expectedErrorOrStatus ||
          (err as { statusCode?: number; status?: number })?.status === expectedErrorOrStatus ||
          msg.includes(String(expectedErrorOrStatus));
        if (!hasStatus) {
          throw new Error(
            `${message ? message + ' - ' : ''}Expected error with status ${expectedErrorOrStatus}, got: ${msg}`
          );
        }
      } else if (typeof expectedErrorOrStatus === 'string') {
        if (!msg.toLowerCase().includes(expectedErrorOrStatus.toLowerCase())) {
          throw new Error(
            `${message ? message + ' - ' : ''}Expected error message to include "${expectedErrorOrStatus}", got: "${msg}"`
          );
        }
      } else if (expectedErrorOrStatus instanceof RegExp) {
        if (!expectedErrorOrStatus.test(msg)) {
          throw new Error(
            `${message ? message + ' - ' : ''}Expected error matching ${expectedErrorOrStatus}, got: "${msg}"`
          );
        }
      }
    }
  }
  if (!threw) {
    throw new Error(message || 'Expected asynchronous function to throw an error, but it succeeded.');
  }
}
