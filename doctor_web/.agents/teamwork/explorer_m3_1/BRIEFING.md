# BRIEFING — 2026-11-09T09:07:00Z

## Mission
Investigate `ocrService.ts`, Postman collection, backend OCR endpoints, and attachmentService size constraints to design real OCR job processing and polling for Milestone 3 (R3).

## 🔒 My Identity
- Archetype: explorer
- Roles: [investigator, synthesizer]
- Working directory: d:\New folder\New folder\doctor web\doctor-web-frontend-main
- State folder: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m3_1\
- Original parent: 90607c31-ed2c-4214-ada9-7795dd6dd0e4
- Milestone: Milestone 3 (Real OCR Job Processing and Polling - R3)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Catalog all mock structures in `ocrService.ts`
- Examine Postman collection OCR endpoints
- Design authentic service methods for `ocrService.ts`
- Document `MAX_ATTACHMENT_SIZE_BYTES` adjustment in `attachmentService.ts`
- Formulate complete handoff report with step-by-step implementation plan for Worker

## Current Parent
- Conversation ID: 90607c31-ed2c-4214-ada9-7795dd6dd0e4
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/services/ocrService.ts`: Examined all models, methods, mock logic, missing statuses, and poll mechanism.
  - `src/services/attachmentService.ts`: Examined `MAX_ATTACHMENT_SIZE_BYTES` (25MB vs backend 15MB limit).
  - `src/services/apiClient.ts`: Examined HTTP envelope unwrapping, JWT injection, and ApiError handling.
  - `Postman collection/CareID-Staging.postman_collection.json`: Verified 6 core OCR endpoints, schemas, descriptions, and samples.
  - `tests/e2e/runner.ts` & test suites (Tiers 1-4): Executed master runner; 162/163 tests passing, verified OCR test contracts.
  - Live backend verification: Tested `POST /ocr/jobs`, `GET /ocr/jobs/:id`, `GET /fields`, `GET /text`, `GET /json`, and reprocess routes against `https://360api.vnvision.in`.
- **Key findings**:
  1. `BackendOcrJob['status']` in `ocrService.ts` was missing `REVIEW_REQUIRED`.
  2. `pollOcrJob` in `ocrService.ts` lacked `onStatusChange` callback, customizable `timeoutMs`, and termination check for `REVIEW_REQUIRED`. It also swallowed 404 errors.
  3. Missing `getOcrJobStatus` (currently named `getOcrJob`) and `getOcrJobJson` for `GET /api/v1/ocr/jobs/:id/json`.
  4. `reprocessOcrJob` should target `POST /api/v1/ocr/jobs/:jobId/reprocess` with fallback to `POST /api/v1/ocr/reprocess/:jobId`.
  5. `MedicalRecordUploadPage.tsx` lines 425-431 contained a mock fallback hack (`listOcrJobs({ limit: 1 })`) masking submission errors.
  6. Backend strictly enforces 15MB attachment limit; `MAX_ATTACHMENT_SIZE_BYTES` must be tuned to `15 * 1024 * 1024`.
- **Unexplored areas**: None for M3 scope.

## Key Decisions Made
- Designed unified and flexible signatures for `submitOcrJob` and `pollOcrJob` ensuring 100% backward compatibility with existing components while satisfying new contracts.
- Formulated precise code snippets and patch guidelines for the Worker.

## Artifact Index
- `.agents/teamwork/explorer_m3_1/DISPATCH.md` — Inbound instructions
- `.agents/teamwork/explorer_m3_1/BRIEFING.md` — Persistent working memory
- `.agents/teamwork/explorer_m3_1/progress.md` — Liveness heartbeat
- `.agents/teamwork/explorer_m3_1/handoff.md` — Final investigation handoff report
