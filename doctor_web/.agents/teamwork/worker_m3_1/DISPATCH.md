## 2026-11-09T09:08:03Z
You are the Implementation Worker for Milestone 3: Real OCR Job Processing and Polling (R3).
Your state folder: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m3_1\
Working directory: d:\New folder\New folder\doctor web\doctor-web-frontend-main

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mandatory Files to Read Before Modifying Code:
1. d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md
2. d:\New folder\New folder\doctor web\doctor-web-frontend-main\PROJECT.md
3. Explorer handoffs:
   - d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m3_1\handoff.md
   - d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m3_2\handoff.md
   - d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m3_3\handoff.md

Your Exclusive Write Ownership:
- src/services/ocrService.ts
- src/services/attachmentService.ts
- src/pages/ocr/MedicalRecordUploadPage.tsx

Tasks to Implement:
1. In `src/services/attachmentService.ts`:
   - Tune `MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024` (15MB) matching the live backend constraint discovered by Challenger 2 and verified by Explorers. Update validation message accordingly.

2. In `src/services/ocrService.ts`:
   - Update `BackendOcrJob` status type to include `'PENDING' | 'PROCESSING' | 'REVIEW_REQUIRED' | 'COMPLETED' | 'FAILED'`.
   - Update `pollOcrJob`:
     * Must treat both `'COMPLETED'` and `'REVIEW_REQUIRED'` as successful terminal statuses.
     * Must treat `'FAILED'` as terminal failure and throw an descriptive Error.
     * Accept flexible options / backward-compatible parameters:
       `pollOcrJob(jobId: string, optionsOrOnProgress?: ((status: string) => void) | { onStatusChange?: (status: string) => void; intervalMs?: number; timeoutMs?: number }, timeoutMs?: number): Promise<BackendOcrJob>`
     * Enforce a clock-based polling timeout guard (`timeoutMs = 60000` or configurable); throw Error on timeout.
     * Invoke callback with authentic status changes.
   - Implement/export:
     * `submitOcrJob(payload: { medicalAttachmentId: string; documentType?: string }): Promise<BackendOcrJob>`
     * `getOcrJobStatus(jobId: string): Promise<BackendOcrJob>`
     * `getOcrJobFields(jobId: string): Promise<ExtractedOcrField[]>` (and keep `getOcrFields` alias)
     * `getOcrJobText(jobId: string): Promise<{ text: string }>` (and keep `getOcrText` alias)
     * `getOcrJobJson(jobId: string): Promise<any>`
     * `reprocessOcrJob(jobId: string): Promise<BackendOcrJob>`
   - Clean up any dead/simulated progress code in `ocrService.ts`.

3. In `src/pages/ocr/MedicalRecordUploadPage.tsx`:
   - In `handleStartProcessing`:
     * Strictly ELIMINATE the `listOcrJobs({ limit: 1 })` fallback hack (previously lines 424-432). If `ocrService.submitOcrJob` fails, report the error honestly; do not bind unrelated historical jobs.
     * Strictly ELIMINATE all artificial `setTimeout` delay gates (e.g. 500ms and 400ms).
     * Strictly ELIMINATE all synthetic progress percentage increments (e.g. `setProcessingProgress(20 -> 50 -> 80 -> 100)`).
     * Connect real `pollOcrJob` with `onStatusChange` callback:
       - `PENDING`: "Queued for processing..."
       - `PROCESSING`: "Extracting clinical telemetry..."
       - `REVIEW_REQUIRED` / `COMPLETED`: "OCR Extraction Complete", transition to review view as soon as data is ready.
       - `FAILED`: display error state in modal with retry/reprocess options, do NOT advance to review.
     * Ensure `medicalAttachmentId: uploadedFile.attachmentId` is passed directly.
     * Preserve 100% of Figma layout nodes (1:1088, 1:1134, 1:1145, 1:1136, 1:1142, 1:1253, 1:1270) and Tailwind design tokens.

4. Verification Commands (MUST RUN AND PASS):
   - `npm run type-check` (must exit 0 with 0 errors)
   - `npm run lint` (must exit 0 with 0 errors)
   - `npm run build` (must exit 0 with 0 errors)
   - `node --experimental-strip-types tests/e2e/runner.ts --tier=1`
   - `node --experimental-strip-types tests/e2e/runner.ts --tier=2`

5. Write your complete handoff report to `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m3_1\handoff.md` and message the orchestrator when finished.

