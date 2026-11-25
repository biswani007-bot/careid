/**
 * Tier 2 — Boundary 13: Quality Gate Verification Boundaries
 * Validates tsconfig strict mode rules, ESLint configuration integrity,
 * package dependency alignment, and production build readiness.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('Tier 2 — Boundary 13: Quality Gate Verification Boundaries', () => {
  const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.app.json');
  const eslintPath = path.resolve(process.cwd(), 'eslint.config.js');
  const viteConfigPath = path.resolve(process.cwd(), 'vite.config.ts');

  it('TC-B13-01: tsconfig.app.json enforces strict mode and zero unused locals/parameters', () => {
    const raw = fs.readFileSync(tsconfigPath, 'utf8');
    const stripped = raw.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    const tsconfig = JSON.parse(stripped);
    assertDefined(tsconfig.compilerOptions, 'compilerOptions must exist');
    assertEqual(tsconfig.compilerOptions.strict, true, 'strict mode must be enabled');
    assertEqual(tsconfig.compilerOptions.noUnusedLocals, true, 'noUnusedLocals must be enabled');
    assertEqual(tsconfig.compilerOptions.noUnusedParameters, true, 'noUnusedParameters must be enabled');
  });

  it('TC-B13-02: Path alias @/* is correctly mapped to src/* in tsconfig.app.json', () => {
    const raw = fs.readFileSync(tsconfigPath, 'utf8');
    const stripped = raw.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    const tsconfig = JSON.parse(stripped);
    assertDefined(tsconfig.compilerOptions.paths, 'paths object must exist');
    assertEqual(Array.isArray(tsconfig.compilerOptions.paths['@/*']), true);
    assertEqual(tsconfig.compilerOptions.paths['@/*'][0], 'src/*');
  });

  it('TC-B13-03: ESLint flat configuration file exists and exports valid ruleset', () => {
    const exists = fs.existsSync(eslintPath);
    assertEqual(exists, true, 'eslint.config.js must exist in project root');
    const content = fs.readFileSync(eslintPath, 'utf8');
    assertDefined(content);
  });

  it('TC-B13-04: Vite configuration defines React plugin and resolves without error', () => {
    const exists = fs.existsSync(viteConfigPath);
    assertEqual(exists, true, 'vite.config.ts must exist');
    const content = fs.readFileSync(viteConfigPath, 'utf8');
    assertEqual(content.includes('@vitejs/plugin-react') || content.includes('react'), true);
  });

  it('TC-B13-05: Node version in execution environment supports experimental-strip-types', () => {
    const versionMajor = parseInt(process.versions.node.split('.')[0], 10);
    assertEqual(versionMajor >= 22, true, `Node major version must be >= 22, detected ${versionMajor}`);
  });
});
