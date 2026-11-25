# Project: CareID Doctor Web Frontend Integration & Backend Resolution

## Architecture
- **Frontend Architecture**: React 18, TypeScript, Vite, Tailwind CSS. Located at `D:\New folder\New folder\doctor web\doctor-web-frontend-main` (Drive D: hosted on external Seagate Expansion drive). Clean repaired artifacts preserved at `C:\Users\PABANI\doctor-web-repaired`.
- **Backend Architecture**: NestJS, TypeScript, Prisma ORM 7, PostgreSQL 16+, Multer, Apache Reverse Proxy. Deployed at `https://360api.vnvision.in/api/v1`. Local codebase at `c:\Users\PABANI\Downloads\hvapi-main\hvapi-main`.
- **OCR Engine Daemon**: Python `aiohttp` microservice running PP-OCRv4 (PaddleOCR) on `http://127.0.0.1:5050`. Supervised by PM2 / systemd.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Repository Accessibility & Host Verification | Verify accessibility of `D:\New folder\New folder\doctor web\doctor-web-frontend-main`. Identify exact blocker (disconnected Seagate drive) | M1 | R1, Survey |
| 2 | Repaired Files Preservation & Audit | Preserve all 6 files in `C:\Users\PABANI\doctor-web-repaired`; audit line-by-line against originals | M1 | R1, Survey |
| 3 | Minimal Surgical Frontend Integration | Formulate and apply minimal integration plan for `apiClient.ts`, `attachmentService.ts`, `ocrService.ts`, `patientService.ts`, `types.ts`, `MedicalRecordUploadPage.tsx` | M1 | R1, R2, Survey |
| 4 | Multipart Boundary & File Handling | Delete `Content-Type` on `FormData` in `apiClient.ts` to preserve browser boundaries; validate 15MB limit and MIME types | M1 | R2, Survey |
| 5 | Patient Isolation & Removal of Hardcoded UUIDs | Enforce patient selection before upload; throw error on missing patient; eliminate all mock/hardcoded UUID fallbacks | M1 | R2, Survey |
| 6 | Doctor Patients API (403 vs 500) Resolution | Root-cause analysis: 403 on role/verification/facility mismatch; 500 on live DB query failure in `security_consent_records` | M2 | R3, Survey |
| 7 | Individual Patient Authorization Verification | Verify `GET /api/v1/doctors/patients/:patientProfileId` succeeds (200 OK) via clinical referral for patient `787e5187-7859-4320-bb1a-465a57dd086a` | M2 | R3, Survey |
| 8 | PaddleOCR Worker 5050 Investigation & Runbook | Diagnose omission of `services/ocr-worker/server.py` in `ecosystem.config.js`; deliver PM2 & systemd supervised recovery runbooks for administrator | M2 | R4, Survey |
| 9 | Upload Contract & Attachment ID Propagation | Upload binary file to `POST /api/v1/attachments`, receive `.id`, and map to `medicalAttachmentId` (NOT `/records/upload`) | M3 | R2, R5, Survey |
| 10 | OCR Job Contract Verification | Submit `POST /api/v1/ocr/jobs` requiring `medicalAttachmentId`; verify DB persistence of job and error handling | M3 | R5, Survey |
| 11 | Medical Record Persistence Workflow | Save medical records via `POST /api/v1/doctors/patients/:patientProfileId/medical-records` with encounters, vitals, diagnoses | M3 | R2, R6, Survey |
| 12 | End-to-End Health Record Upload & OCR Verification | Verify complete flow: patient resolution -> binary upload -> OCR job creation -> polling -> OCR review -> save record -> refresh uploads | M4 | R6, Survey |
| 13 | Frontend Quality Gates | Execute `npm run type-check`, `npm run lint`, and `npm run build` in original repository and capture actual outputs | M4 | R6, Survey |
| 14 | Final Comprehensive Acceptance Report | Deliver final report with discrete PASS/FAIL/BLOCKED/NOT TESTED statuses across all sections A through K | M4 | R6, Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Repository Verification & Repaired Files Audit | Audit original repository access (Drive D: blocker); audit `C:\Users\PABANI\doctor-web-repaired` files; establish minimal integration patch | none | DONE |
| M2 | Backend API Investigation (Patients 403/500 & PaddleOCR 5050) | Resolve 403 vs 500 discrepancy; verify doctor profile, roles, and referral access; diagnose port 5050 daemon unreachability and provide administrator recovery runbook | none | DONE |
| M3 | API Contract Alignment & Verification | Verify upload route (`/api/v1/attachments`), attachment ID mapping to `medicalAttachmentId`, OCR job submission, and medical record persistence | M1, M2 | DONE |
| M4 | E2E Integration, Quality Gates & Acceptance Report | Execute end-to-end workflow verification with live data; document frontend quality gate results; deliver comprehensive Acceptance Report covering sections A through K | M1, M2, M3 | IN_PROGRESS |

## Interface Contracts
### Frontend `apiClient` ↔ Backend `POST /api/v1/attachments`
- **Request**: `multipart/form-data`, form fields: `file` (binary File), `patientProfileId` (UUID string), `category` (enum string: `LAB_REPORT`, `PRESCRIPTION`, etc.).
- **Boundary Rule**: `Content-Type` header MUST NOT be explicitly set in axios; allow browser to inject boundary.
- **Response**: `201 Created` with JSON: `{ "id": "<uuid>", "patientProfileId": "<uuid>", "fileName": "...", "fileSize": ..., "mimeType": "..." }`.

### Frontend `ocrService` ↔ Backend `POST /api/v1/ocr/jobs`
- **Request**: `application/json`, payload: `{ "medicalAttachmentId": "<attachment_uuid>", "documentType": "<doc_type>" }`.
- **Validation**: Strict whitelist validation (`forbidNonWhitelisted: true`). Property `medicalAttachmentId` is required. Property `attachmentId` is rejected with HTTP 400.
- **Response**: `201 Created` with `{ "id": "<job_uuid>", "status": "QUEUED" | "OCR_RUNNING", "medicalAttachmentId": "..." }` or `503 ServiceUnavailableException` if port 5050 daemon is stopped.

### Frontend `patientService` ↔ Backend `POST /api/v1/doctors/patients/:patientProfileId/medical-records`
- **Request**: `application/json`, payload: `CreateMedicalRecordDto` (`title`, `encounter`, `diagnoses`, `vitalSigns`, `clinicalNotes`, `status`).
- **Response**: `201 Created` with full persisted `MedicalRecordResponseDto`.

## Code Layout
- Frontend Target: `D:\New folder\New folder\doctor web\doctor-web-frontend-main`
  - `src/services/apiClient.ts`: Axios instance, token interceptor, FormData boundary deletion
  - `src/services/attachmentService.ts`: Upload implementation targeting `/api/v1/attachments`
  - `src/services/ocrService.ts`: OCR job creation and polling with `medicalAttachmentId`
  - `src/services/patientService.ts`: Patient list, details, and medical record persistence
  - `src/pages/ocr/MedicalRecordUploadPage.tsx`: Primary upload UI, drag-and-drop, patient selector, OCR stage progress
  - `src/pages/ocr/types.ts`: TypeScript DTO definitions matching backend schema
- Repaired Clean Source: `C:\Users\PABANI\doctor-web-repaired`
- Backend Source: `c:\Users\PABANI\Downloads\hvapi-main\hvapi-main`
  - `prisma/schema.prisma`: Database schema
  - `src/modules/doctor/`: Doctor and patient controller, services, repositories
  - `src/modules/medical-record/`: Attachment upload controller and storage service
  - `src/modules/ocr/`: OCR controller, service, and Python worker HTTP client
  - `services/ocr-worker/`: PaddleOCR persistent daemon (`server.py`, `engine.py`, `requirements.txt`)
  - `ecosystem.config.js`: PM2 process configuration
