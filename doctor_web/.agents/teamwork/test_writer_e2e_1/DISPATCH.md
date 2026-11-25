## 2026-11-09T07:03:16Z
Sender: 90607c31-ed2c-4214-ada9-7795dd6dd0e4
Priority: MESSAGE_PRIORITY_HIGH

You are the E2E Test Suite Architect for the CareID Doctor Web Portal project.
Working directory: d:\New folder\New folder\doctor web\doctor-web-frontend-main
Your state folder: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\test_writer_e2e_1\
Original request path: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md
Project specification path: d:\New folder\New folder\doctor web\doctor-web-frontend-main\PROJECT.md

MANDATORY FIRST STEP:
Read `ORIGINAL_REQUEST.md` and `PROJECT.md` before starting work. Do NOT summarize or filter them.

YOUR MISSION:
Design and build the comprehensive, opaque-box E2E test infrastructure and test suites for the Upload Health Record page (`/records/upload`) and OCR review workflow against the live backend `https://360api.vnvision.in`.

TEST CASE DESIGN METHODOLOGY (4 Tiers):
1. Tier 1 — Feature Coverage (>=5 test cases per feature for all 15 inventoried features in PROJECT.md):
   - Isolations of patient context resolution, document uploads (picker, camera, multi-page PDF), OCR job submission, status polling, field extraction, clinical review editing, medical record persistence, Recent Uploads.
2. Tier 2 — Boundary & Corner Cases (>=5 test cases per feature):
   - Boundary tests: empty files, 25MB max size limit, invalid mime types, non-existent patient IDs, OCR job failures, empty lab rows, network errors.
3. Tier 3 — Cross-Feature Combinations (pairwise interactions):
   - Camera scan + multi-row clinical editing + persistence.
   - Multi-page PDF + OCR polling + doctor correction + recent uploads refresh.
   - Patient ID mismatch hard stop modal integration.
4. Tier 4 — Real-World Application Scenarios (>=8 realistic clinical scenarios):
   - Realistic blood test report (CBC), lipid profile, diagnostic image upload, multi-page clinical lab summary.

DELIVERABLES:
1. Create `TEST_INFRA.md` at project root adhering to the template in the orchestrator instructions.
2. Implement test suites and runners under `tests/e2e/` (check `package.json` to utilize existing test runners or install/script as appropriate without breaking existing npm scripts).
3. Ensure tests execute genuinely and verify authentic responses against requirements.
4. When test suite is built and ready, create `TEST_READY.md` at project root with exact test runner command, coverage summary table, and feature checklist.
5. Write your complete report to `.agents/teamwork/test_writer_e2e_1/analysis.md` and `handoff.md`, and send a completion message back.
