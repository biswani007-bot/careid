# Dispatch: Worker Milestone 4 — E2E Testing, Quality Gates & Final 11-Point Report

## Objective
1. Create and execute a comprehensive E2E test suite `tests/e2e_support_module_test_suite.cjs` covering Tiers 1-4 against live staging (`https://360api.vnvision.in`).
2. Run and verify all quality gates: `npm run type-check`, `npm run lint`, `npm run build`, and all milestone test runners.
3. Compile the comprehensive 11-point Final Integration Report strictly covering all requirements from `ORIGINAL_REQUEST.md` R7 into `FINAL_INTEGRATION_REPORT.md` at the project root.

## Authoritative Inputs
- ORIGINAL_REQUEST.md: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\PROJECT.md`
- Milestone 1 Audit: `.agents/teamwork/auditor_m1/handoff.md`
- Milestone 2 Audit: `.agents/teamwork/auditor_m2/handoff.md`
- Milestone 3 Audit: `.agents/teamwork/auditor_m3/handoff.md`
- Token Cache: `.token_cache.json`

## Scope & Specifications
1. **Comprehensive E2E Test Suite (`tests/e2e_support_module_test_suite.cjs`)**:
   - **Tier 1 (Feature Coverage)**:
     - Route decoupling (`/settings/support` -> `/support`).
     - Sidebar and Header navigation to `/support`.
     - Settings tabs have exactly 3 tabs (Support tab absent).
     - Live FAQ query (`GET /api/v1/cms/faqs`).
     - Live ticket creation (`POST /api/v1/support/tickets`).
     - Live ticket listing (`GET /api/v1/support/tickets`).
     - Live reply creation (`POST /api/v1/support/tickets/:id/reply`).
     - Live reply listing (`GET /api/v1/support/tickets/:id/replies`).
     - Truthful unconfigured phone and SLA indicators.
   - **Tier 2 (Boundary & Corner Cases)**:
     - 400 Bad Request on empty ticket submission.
     - 404 Not Found on invalid ticket ID.
     - 400 Bad Request on empty reply message.
     - 403 Forbidden on admin-only CMS endpoint (`GET /api/v1/cms/blocks`).
     - Automatic token refresh on expired session.
   - **Tier 3 (Cross-Feature Combinations)**:
     - Lifecycle: Create ticket -> Retrieve by ID -> Post reply -> Retrieve replies -> Verify presence in paginated tickets list.
     - CMS pages search and policy DTO alignment.
   - **Tier 4 (Real-World Workload Scenarios)**:
     - Clinical workflow simulation: Doctor navigates to standalone Support page, views empty/published clinical FAQs, submits urgent procedural issue ticket, receives real monotonic ticket reference number, checks ticket status in history tab.
2. **Quality Gates Verification**:
   - Execute and capture exact outputs for:
     - `npm run type-check`
     - `npm run lint`
     - `npm run build`
     - `node tests/verify_milestone1_navigation.cjs`
     - `node tests/verify_milestone2_support_service.cjs`
     - `node tests/verify_milestone3_ui_integration.cjs`
     - `node tests/e2e_support_module_test_suite.cjs`
3. **11-Point Final Integration Report (`FINAL_INTEGRATION_REPORT.md`)**:
   Document in detail:
   1. Postman endpoints discovered (Folders 25 and 21)
   2. APIs successfully integrated
   3. Help Center integration status
   4. Support ticket integration status
   5. Ticket history integration status
   6. Contact/SLA data source & truthfulness verification
   7. Mock and hardcoded data removed (complete audit)
   8. Missing backend APIs and required DTO fields
   9. Files modified (with exact file-by-file summary)
   10. Live staging test results (all test runs and status codes)
   11. Build/type-check results (type-check, lint, vite build metrics)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Completion Requirements
Write handoff report to `.agents/teamwork/worker_m4/handoff.md`.


## 2026-11-11T15:51:30Z
You are assigned to implement Milestone 4 of the CareID Doctor Web Portal Support Module Integration.

Read your task dispatch file at:
d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m4\DISPATCH.md

Also read the authoritative requirements at:
d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md
and the project master plan at:
d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\PROJECT.md

Scope:
- Build and execute `tests/e2e_support_module_test_suite.cjs` covering Tiers 1-4 against live staging.
- Execute all quality gates (`npm run type-check`, `npm run lint`, `npm run build`, and all milestone test runners).
- Compile the comprehensive 11-point Final Integration Report strictly covering all requirements from `ORIGINAL_REQUEST.md` R7 into `FINAL_INTEGRATION_REPORT.md` at the project root.
- Write your comprehensive handoff report to `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m4\handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
