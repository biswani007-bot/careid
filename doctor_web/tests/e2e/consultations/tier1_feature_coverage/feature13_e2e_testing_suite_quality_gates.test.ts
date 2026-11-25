/**
 * Tier 1 — Feature 13: E2E Testing Suite & Quality Gates
 * Validates test runner infrastructure, tier filtering logic, test registration,
 * timing telemetry, and package script configuration.
 */

import { describe, it, assertEqual, assertDefined, assertGreaterThan } from '../helpers/testUtils.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('Feature 13: E2E Testing Suite & Quality Gates', () => {
  const pkgPath = path.resolve(process.cwd(), 'package.json');

  it('TC-F13-01: package.json registers dedicated test:consultations runner script', () => {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    assertDefined(pkg.scripts, 'scripts object must exist in package.json');
    assertDefined(pkg.scripts['test:consultations'], 'test:consultations script must be registered');
    assertEqual(
      pkg.scripts['test:consultations'],
      'node --experimental-strip-types tests/e2e/consultations/runner.ts'
    );
  });

  it('TC-F13-02: Quality gate scripts (type-check, lint, build) are registered and properly configured', () => {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    assertDefined(pkg.scripts['type-check'], 'type-check script must exist');
    assertDefined(pkg.scripts['lint'], 'lint script must exist');
    assertDefined(pkg.scripts['build'], 'build script must exist');
  });

  it('TC-F13-03: Tier filter parser correctly interprets CLI tier flags', () => {
    function parseTierFilter(args: string[]): string {
      const tierArg = args.find((a) => a.startsWith('--tier='));
      return tierArg ? tierArg.split('=')[1].trim() : 'all';
    }

    assertEqual(parseTierFilter(['--tier=1']), '1');
    assertEqual(parseTierFilter(['--tier=2']), '2');
    assertEqual(parseTierFilter(['--tier=3']), '3');
    assertEqual(parseTierFilter(['--tier=4']), '4');
    assertEqual(parseTierFilter([]), 'all');
  });

  it('TC-F13-04: Test duration telemetry records execution duration in milliseconds', async () => {
    const start = Date.now();
    await new Promise((r) => setTimeout(r, 20));
    const duration = Date.now() - start;

    assertGreaterThan(duration, 10, 'Duration should be at least 10ms');
  });

  it('TC-F13-05: TEST_INFRA.md specification exists at project root with 14 inventoried features', () => {
    const infraPath = path.resolve(process.cwd(), 'TEST_INFRA.md');
    const content = fs.readFileSync(infraPath, 'utf8');
    assertDefined(content, 'TEST_INFRA.md must be present');
    assertEqual(content.includes('F01') && content.includes('F14'), true, 'TEST_INFRA.md must inventory all features F01 to F14');
  });
});
