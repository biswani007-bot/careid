## 2026-11-09T08:12:56Z
You are the Implementation Worker for Milestone 2: Authentic Document Binary Upload.
Working directory: d:\New folder\New folder\doctor web\doctor-web-frontend-main
Your state folder: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m2_1\
Original request path: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md
Project specification path: d:\New folder\New folder\doctor web\doctor-web-frontend-main\PROJECT.md

MANDATORY FIRST STEP:
Read `ORIGINAL_REQUEST.md` and `PROJECT.md` before starting work. Do NOT summarize or filter them.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You own exclusively:
- `src/services/attachmentService.ts` (create new file)
- `src/pages/ocr/MedicalRecordUploadPage.tsx`
Do NOT edit any other source code files.

INPUT ARTIFACTS TO READ:
1. `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m2_1\handoff.md`
2. `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m2_2\handoff.md`
3. `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_m2_3\handoff.md`

YOUR TASKS:
1. Create `src/services/attachmentService.ts`:
   - Implement `uploadAttachment(file: File | Blob, options?: AttachmentUploadOptions | string, ...): Promise<AttachmentUploadResponse>` using `apiClient.postFormData('/api/v1/attachments', formData)`.
   - Implement client-side pre-flight validation `validateAttachmentFile(file: File | Blob, fileName?: string): AttachmentValidationResult` enforcing:
     * Non-zero byte size (`file.size > 0`).
     * Max 25MB threshold (`file.size <= 25 * 1024 * 1024`).
     * Allowed extensions (`.pdf, .jpg, .jpeg, .png, .webp, .tiff, .dcm, .dicom`).
   - Export `getAttachmentFileUrl(fileName: string): string`.
2. Update `src/pages/ocr/MedicalRecordUploadPage.tsx`:
   - Update `UploadedFileMeta` to include `attachmentId?: string; storageUrl?: string; storageKey?: string; isUploading?: boolean;`.
   - Update `processSelectedFile` to upload the file to `POST /api/v1/attachments` via `attachmentService.uploadAttachment`, populating `attachmentId`, `storageUrl`, and `storageKey`.
   - Update `handleCameraCapture` to capture camera frames into a timestamped JPEG File (`careid_cam_capture_<ts>.jpg`), reject empty frames, and upload to `POST /api/v1/attachments`.
   - Update Multi-Page PDF Import (node 1:1242) with dedicated `pdfInputRef` (`accept=".pdf,application/pdf"`), preserving page order, original filename, and byte integrity.
   - Update `handleStartProcessing` to pass genuine `medicalAttachmentId: uploadedFile.attachmentId` to `ocrService.submitOcrJob()`. COMPLETELY ELIMINATE hardcoded dummy `'attachment-uuid-1'`.
   - Update `handleSaveRecord` to use authentic `storageUrl: uploadedFile.storageUrl || ...`. Strictly eliminate passing browser `blob:` Object URL as `storageUrl`.
   - Strictly preserve all approved Figma UI layouts, Tailwind classes, and styling across nodes 1:1167, 1:1217, 1:1229, 1:1242, 1:1253, 1:1270.

VERIFICATION REQUIREMENTS:
Run:
- `npm run type-check`
- `npm run lint`
- `npm run build`
- `node --experimental-strip-types tests/e2e/runner.ts --tier=1` (specifically verify Features 3, 4, 5, and 6 pass 100%)
All must pass with 0 errors.

OUTPUT REQUIREMENTS:
Write your complete report to:
`d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\worker_m2_1\handoff.md`.
Then send a completion message with summary of changes and verification results.
