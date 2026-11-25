# CareID Master Backend — R4 Remediation Baseline Inventory

**Date:** 2026-11-18  
**Repository:** `c:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Baseline Release:** R3 (`CareID_Master_Backend_Staging_Candidate_2026-11-18_R3.zip`)  
**Status:** BASELINE INSPECTION COMPLETE  

---

## 1. Repository Structure & Modules

The CareID Master Backend (`hvapi`) is a monolithic NestJS 11 application structured in domain-driven modules under `src/modules/`:

```text
src/
├── app.module.ts
├── main.ts
├── common/             # Interceptors, guards, filters, pagination, utility functions
├── core/               # Health, metrics, config
├── database/           # Prisma service, seed scripts (local & staging)
└── modules/
    ├── admin/          # Admin user management, audit logs
    ├── ai-ocr/         # AI document extraction & confirmation
    ├── appointment/    # Scheduling, slot holds, check-in, checklists
    ├── auth/           # JWT, OTP authentication, roles, session management
    ├── cms/            # Content management
    ├── cpt/            # CPT clinical procedure codes
    ├── doctor/         # Doctor profiles, facility affiliations, clinical exports
    ├── facility/       # Healthcare facilities, rooms, procedure suites
    ├── family/         # Patient family members
    ├── financing/      # Patient financing applications
    ├── governance/     # Clinical governance & compliance
    ├── health-card/    # Digital health card & QR verification
    ├── insurance/      # Insurance providers, plans, policies, claims, card OCR
    ├── laboratory/     # Lab orders, test results
    ├── medical-record/ # Clinical vault, attachments, encounters
    ├── notifications/  # In-app, push, SMS notifications
    ├── observability/  # Metrics, audit trails
    ├── ocr/            # Core OCR jobs, templates, reviews, worker client
    ├── patient/        # Patient profiles, onboarding, emergency contacts
    ├── pet/            # Pet care module
    ├── pharmacy/       # Medications, inventory
    ├── prescription/   # Prescriptions, drug interactions
    ├── qr/             # Dynamic QR code generation
    ├── referral/       # Doctor referrals state machine
    ├── report/         # Clinical report uploads & PDF generation
    ├── security/       # Security policies & audit logging
    ├── support/        # Helpdesk tickets
    ├── treatment-offer/# Surgical treatment offers, pricing rules, discounts
    └── vision/         # Vision / ophthalmology clinical data
```

---

## 2. Relevant Source Files for R4 Remediation

### 2.1 OCR Core & Infrastructure
- `src/modules/ocr/presentation/controllers/ocr.controller.ts`
- `src/modules/ocr/application/use-cases/ocr.service.ts`
- `src/modules/ocr/infrastructure/database/ocr.repository.ts`
- `src/modules/ocr/domain/repositories/ocr.repository.interface.ts`
- `src/modules/ocr/infrastructure/clients/ocr-worker.client.ts`
- `src/modules/ocr/domain/services/document-field-extractor.ts`
- `src/modules/ocr/presentation/dto/ocr-enterprise.dto.ts`
- `src/modules/ocr/presentation/dto/ocr-response.dto.ts`

### 2.2 AI OCR Module
- `src/modules/ai-ocr/presentation/controllers/ai-ocr.controller.ts`
- `src/modules/ai-ocr/application/use-cases/ai-ocr.service.ts`
- `src/modules/ai-ocr/infrastructure/database/ai-ocr.repository.ts`
- `src/modules/ai-ocr/domain/repositories/ai-ocr.repository.interface.ts`
- `src/modules/ai-ocr/presentation/dto/ai-ocr.dto.ts`

### 2.3 Insurance OCR Module
- `src/modules/insurance/presentation/controllers/insurance.controller.ts`
- `src/modules/insurance/application/use-cases/insurance.service.ts`
- `src/modules/insurance/infrastructure/database/insurance.repository.ts`
- `src/modules/insurance/presentation/dto/insurance-ocr-scan.dto.ts`
- `src/modules/insurance/presentation/dto/insurance-ocr-confirm.dto.ts`

### 2.4 Dependency & Packaging Files
- `package.json`
- `package-lock.json`
- `prisma/schema.prisma`
- `scripts/package-staging-candidate-r4.js` (to be created)

---

## 3. Current OCR Architecture

### 3.1 Client to NestJS Communication
- Clients upload document images or PDFs via multipart requests or reference an existing `medicalAttachmentId`.
- NestJS API Gateway receives the document, performs local validation, and stores the raw binary in object storage (Backblaze B2) or local `data/uploads/`.
- `OCRJobService` or `AiOcrService` handles the processing.

### 3.2 NestJS to Standalone OCR Worker Communication
- Standalone worker endpoint: `https://careidocr.dokaan.in/internal/ocr/process` (or local `http://127.0.0.1:5050` in development).
- Authentication: Header `X-CareID-Internal-Secret: <CAREID_OCR_SECRET>`.
- Wire transfer formats:
  - `processBuffer(buffer, filename, documentType, pdfDpi)` sends multipart/form-data.
  - `processFile(filePath, documentType, pdfDpi)` sends JSON body with local file path (valid only when worker shares local filesystem).

### 3.3 Known Architectural Vulnerabilities in Current Baseline
1. **Unscoped OCR Job Retrieval (IDOR):**
   `GET /api/v1/ocr/jobs`, `/jobs/:id`, `/jobs/:id/text`, `/jobs/:id/fields`, `/jobs/:id/json` in `OCRController` and `OCRJobService` do not pass or evaluate caller identity or role. Any authenticated user can read any job.
2. **Unvalidated AI OCR Confirmation (IDOR):**
   `AiOcrService.confirmOcr` finds the caller's patient profile and the document by ID, but never verifies `doc.patientProfileId === profile.id`.
3. **Synthetic Success Fallbacks:**
   - In `AiOcrService`: If the worker client is missing or fails, hardcoded synthetic results for "John Doe" and "Dr. John Watson" with 0.94 confidence are returned.
   - In `OCRJobService`: If source file is missing, it falls back to `ocr-poc/sample_docs/01_lab_report.png`. If worker is missing, it constructs synthetic laboratory results for "John Doe".
   - In `InsuranceService`: Falls back to `sample-insurance-card.jpg` and static simulated policy details (`isSimulated: true`).
4. **Prisma Version Discrepancy:**
   `package.json` specifies `^7.9.1`, while `package-lock.json` resolved `prisma@7.10.1` and `@prisma/client@7.9.1`.

---

## 4. Existing Authorization Architecture

- Authentication: Passport JWT (`AuthGuard('jwt')`). The user payload `req.user` contains `{ userId, phone, role, roles }`.
- Role Guard: `RolesGuard` evaluates `@Roles(...)` metadata.
- Canonical Roles:
  - `PATIENT`: Must be restricted to own profile, own medical records, own OCR documents, and own appointments.
  - `DOCTOR`: Must be restricted to assigned appointments, active referrals, and affiliated facility records.
  - `STAFF` / `NURSE`: Scoped to assigned facility boundaries (`primaryFacilityId`, `secondaryFacilityId`).
  - `FACILITY_ADMIN`: Administrative control over facility assets and staff.
  - `ADMIN` / `SUPER_ADMIN`: System-wide oversight.

---

## 5. Existing Database Relationships

```text
User (1) ── (1) PatientProfile (1) ── (N) OcrDocument (1) ── (N) OcrExtraction
                                       └── (N) OcrReview
User (1) ── (1) DoctorProfile (1) ── (N) MedicalRecord ── (N) MedicalAttachment ── (N) OCRJob
                                                                                   ├── (N) OCRPage
                                                                                   ├── (N) ExtractedField
                                                                                   └── (N) OCRVerification
User (1) ── (1) StaffMember (1) ── [primaryFacilityId, secondaryFacilityId]
PatientProfile (1) ── (N) InsuranceOcrRecord
```

---

## 6. Existing Registered Endpoints vs Documented Endpoints

### 6.1 Actually Registered in `OCRController` (`/api/v1/ocr`)
1. `GET /api/v1/ocr/dashboard`
2. `GET /api/v1/ocr/statistics`
3. `POST /api/v1/ocr/jobs`
4. `POST /api/v1/ocr/reprocess/:jobId` (alias: `jobs/:jobId/reprocess`)
5. `GET /api/v1/ocr/jobs`
6. `GET /api/v1/ocr/jobs/:id`
7. `GET /api/v1/ocr/jobs/:id/text`
8. `GET /api/v1/ocr/jobs/:id/fields`
9. `GET /api/v1/ocr/jobs/:id/json`
10. `POST /api/v1/ocr/templates`
11. `GET /api/v1/ocr/templates`
12. `PUT /api/v1/ocr/templates/:id`
13. `DELETE /api/v1/ocr/templates/:id`
14. `GET /api/v1/ocr/reviews/history`
15. `GET /api/v1/ocr/review`
16. `POST /api/v1/ocr/review/:jobId`

### 6.2 Actually Registered in `AiOcrController` (`/api/v1/ai/ocr`)
1. `POST /api/v1/ai/ocr/extract`
2. `POST /api/v1/ai/ocr/confirm`

### 6.3 Actually Registered in `InsuranceController` (`/api/v1/insurance`)
1. `POST /api/v1/insurance/ocr` (aliases: `ocr/scan`, `ocr/extract`)
2. `GET /api/v1/insurance/ocr/file/:filename`
3. `GET /api/v1/insurance/ocr/:id`
4. `POST /api/v1/insurance/manual-review`
5. `POST /api/v1/insurance/ocr/confirm`

*(Note: Endpoints like `/api/v1/ocr/prescriptions/process`, `/lab-reports/process`, `/insurance/ocr/pre-auth` were planned in earlier documents but were never implemented in the controller layer).*

---

## 7. Known Baseline Test Status

- **Unit Test Suites (93 suites):** 1,416+ tests pass with 100% success rate when running mocked suites.
- **Offline Integration Suites:**
  - `src/modules/security/tests/security-audit-doctor-access.spec.ts` (Requires PostgreSQL `127.0.0.1:5432`)
  - `src/modules/treatment-offer/tests/treatment-offer-real-pg-integration.spec.ts` (Requires PostgreSQL `127.0.0.1:5432`)
  - `src/modules/ocr/tests/careid-ocr-live-endpoints.spec.ts` (Requires local OCR worker `127.0.0.1:5050`)
- These suites fail only because external live database/worker services are offline locally.

---

## 8. Files That Must NOT Be Modified

1. `prisma/schema.prisma` (Zero database schema migrations authorized)
2. `prisma/migrations/*` (All 7 existing migrations must remain unmodified)
3. Any frontend application repositories or code outside `hvapi-main`
4. Environment variable files for staging or production (`.env.production`, `.env.staging`)
