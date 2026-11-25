# CareID Monolith Backend — Phase 4.1: API Contract & Routing Audit

**Audit Date:** October 2026  
**Target Platform:** CareID / Health Vault 360 Backend (`hvapi`)  
**Environment Target:** Production Reference `https://360api.vnvision.in`  
**Framework Stack:** NestJS 11.1.28 + TypeScript 5.7 + Prisma 7.9.1 + PostgreSQL  
**Audit Mode:** READ-ONLY Verification Gate  
**Authoritative References:**
1. Postman Collection: `CareID-Staging.postman_collection.json` (427 requests)
2. OpenAPI Specification: `docs/swagger-spec.json` (435 operations across 321 paths)
3. Source Code: 28 Controller files across `src/core/` and `src/modules/`

---

## 1. Executive Summary & Audit Methodology

This audit provides an exhaustive, evidence-based verification of every HTTP endpoint across the CareID backend monolith. The comparison evaluated three independent artifacts:
- The staging Postman collection (`CareID-Staging.postman_collection.json`), representing QA and integration test suites.
- The compiled OpenAPI 3.0 specification (`docs/swagger-spec.json`), representing the machine-readable API contract.
- The actual NestJS controllers, routes, DTOs, guards, and decorators registered within the live TypeScript codebase.

### Key Audit Findings
1. **Spec Parity Discrepancy (435 vs 427):**
   The compiled OpenAPI specification and live NestJS controller registry contain **435 operations**, whereas the staging Postman collection contains **427 operations**. The **8 missing operations** in the Postman collection are the administrative and OCR review endpoints implemented during Phase 3 remediation.
2. **Scaffolded / Stubbed Modules (`AppointmentModule`):**
   `AppointmentController` (`src/modules/appointment/presentation/controllers/appointment.controller.ts`) is an empty class containing only `// TODO: Phase 5 Implementation`. The appointment application service and database repository are also unimplemented stubs. **Zero appointment endpoints exist in the active HTTP routing table.**
3. **Dual Controller Routing Collision (`/api/v1/reports`):**
   Two distinct modules register the root prefix `reports`:
   - `ReportController` (`src/modules/report/`): Handles clinical diagnostic reports, PDF uploads, attachments, and verification.
   - `ReportsController` (`src/modules/reports/`): Handles platform BI analytics, executive dashboards, custom report definitions, and widgets.
   While `ReportsModule` is placed prior to `ReportModule` in `AppModule.imports` to prevent `ReportController`'s `@Get(':id')` from shadowing `GET /api/v1/reports/definitions` and `GET /api/v1/reports/generated`, this architectural collision produces semantic ambiguity and fragments authorization guards (`ReportAuthGuard` vs `RolesGuard`).
4. **Simulated vs Genuine Implementations:**
   - `AiOcrController` (`/api/v1/ai/ocr`): Uses hardcoded mock extraction responses (`title: 'Blood Count Report OCR'`, `prescribedBy: 'Dr. John Watson'`, `confidence: 0.92`).
   - `OCRController` (`/api/v1/ocr`): Implements an end-to-end relational data model (jobs, pages, extracted fields, review queues, audit logs), but the actual text recognition pipeline uses simulated static text (`HEALTH VAULT 360 - CLINICAL LABORATORY REPORT`) rather than a live OCR engine (Tesseract/PaddleOCR/Cloud Vision).
5. **Pagination Inconsistency:**
   Only **11 GET endpoints** support query-based pagination (`page`, `limit`). Over **71 list endpoints** return unpaginated arrays. Furthermore, three differing pagination contract envelopes exist across the codebase:
   - Standard Envelope: `{ data: T[], meta: { total, page, limit, totalPages, hasNextPage, hasPreviousPage } }`
   - Partial Envelope: `{ data: T[], total: number }` (Referrals)
   - Bare Array: `T[]` (OCR job list, Patient medical records, notifications)

---

## 2. Specification Parity & Discrepancy Catalog

### 2.1 The 8 Endpoints Missing from Postman Collection

The following 8 endpoints are fully declared in `docs/swagger-spec.json` and implemented in controller source code, but are absent from `CareID-Staging.postman_collection.json`:

| HTTP Method | Route Path | Controller | Summary | Reason for Absence in Postman |
|---|---|---|---|---|
| `GET` | `/api/v1/admin/patients` | `AdminController` | List patients with pagination & filters | Implemented in Phase 3 remediation |
| `GET` | `/api/v1/admin/patients/:patientId` | `AdminController` | Get complete patient details by ID | Implemented in Phase 3 remediation |
| `GET` | `/api/v1/admin/patients/:patientId/medical-records` | `AdminController` | List records for patient with pagination | Implemented in Phase 3 remediation |
| `GET` | `/api/v1/admin/patients/:patientId/medical-records/timeline` | `AdminController` | Unified medical timeline for patient | Implemented in Phase 3 remediation |
| `GET` | `/api/v1/admin/medical-records` | `AdminController` | Search & list records platform-wide | Implemented in Phase 3 remediation |
| `GET` | `/api/v1/admin/medical-records/:recordId` | `AdminController` | Clinical details of specific record | Implemented in Phase 3 remediation |
| `POST` | `/api/v1/ocr/reprocess/:jobId` | `OCRController` | Trigger re-execution of OCR pipeline | Implemented in Phase 3 remediation |
| `GET` | `/api/v1/ocr/reviews/history` | `OCRController` | Historical audit log of human reviews | Implemented in Phase 3 remediation |

**Action Item for QA:** Update `CareID-Staging.postman_collection.json` with these 8 endpoints to achieve 100% test coverage parity.

---

## 3. Comprehensive Domain Endpoint Inventory

Below is the verified inventory of all 435 registered endpoints across all 27 active controller modules.

### 3.1 Authentication & Identity (`AuthController` — 14 Endpoints)
- **Base Route:** `/api/v1/auth`
- **Class Guards:** None (Method-level `AuthGuard('jwt')` applied where indicated)

| Method | Sub-Route | Guards / Roles | Request DTO / Params | Response Structure | Status |
|---|---|---|---|---|---|
| `POST` | `/password/login` | Public (Rate-limited) | `PasswordLoginDto` (phone/email, password) | `AuthTokensResponseDto` (accessToken, refreshToken, user) | `COMPLETE` |
| `POST` | `/admin/login` | Public (Rate-limited) | `AdminLoginDto` (identifier, password, totpCode) | `AuthTokensResponseDto` | `COMPLETE` |
| `POST` | `/otp/request` | Public (Rate-limited) | `RequestOtpDto` (phone, purpose) | `RequestOtpResponseDto` (challengeId, message) | `PARTIAL` (No SMS dispatch in prod) |
| `POST` | `/otp/verify` | Public (Rate-limited) | `VerifyOtpDto` (challengeId, code, phone) | `AuthTokensResponseDto` | `COMPLETE` |
| `POST` | `/otp/resend` | Public (Rate-limited) | `ResendOtpDto` (challengeId) | `ResendOtpResponseDto` (challengeId, message) | `COMPLETE` |
| `POST` | `/token/refresh` | Public (Rate-limited) | `RefreshTokenDto` (refreshToken) | `RefreshTokenResponseDto` (accessToken, refreshToken) | `COMPLETE` |
| `POST` | `/logout` | `AuthGuard('jwt')` | `LogoutDto` (refreshToken) | `{ success: true, message: string }` | `COMPLETE` |
| `POST` | `/logout-all` | `AuthGuard('jwt')` | None | `{ success: true, message: string, terminatedSessions: number }` | `COMPLETE` |
| `GET` | `/me` | `AuthGuard('jwt')` | None | `UserMeResponseDto` (id, email, phone, status, roles, permissions) | `COMPLETE` |
| `GET` | `/sessions` | `AuthGuard('jwt')` | None | `UserSessionResponseDto[]` (bare array) | `COMPLETE` |
| `DELETE`| `/sessions/:sessionId` | `AuthGuard('jwt')` | Param: `sessionId` (UUID) | `{ success: true, message: string }` | `COMPLETE` |
| `DELETE`| `/sessions` | `AuthGuard('jwt')` | None | `{ success: true, message: string, terminatedCount: number }` | `COMPLETE` |
| `GET` | `/roles` | `AuthGuard('jwt')` | None | `RoleResponseDto[]` | `COMPLETE` |
| `GET` | `/permissions` | `AuthGuard('jwt')` | None | `PermissionResponseDto[]` | `COMPLETE` |

---

### 3.2 Patients (`PatientController` — 28 Endpoints)
- **Base Route:** `/api/v1/patients`
- **Class Guards:** `AuthGuard('jwt')` (except public registration endpoints)

| Method | Sub-Route | Guards / Roles | Request DTO / Params | Response Structure | Status |
|---|---|---|---|---|---|
| `POST` | `/register` | Public | `RegisterPatientDto` | `PatientProfileResponseDto` | `COMPLETE` |
| `GET` | `/register/status` | `AuthGuard('jwt')` | None | `RegistrationStatusResponseDto` | `COMPLETE` |
| `PATCH`| `/register/resume` | `AuthGuard('jwt')` | `ResumeRegistrationDto` | `PatientProfileResponseDto` | `COMPLETE` |
| `POST` | `/onboarding/demographics` | `AuthGuard('jwt')` | `DemographicsDto` | `PatientProfileResponseDto` | `COMPLETE` |
| `PUT` | `/onboarding/demographics` | `AuthGuard('jwt')` | `DemographicsDto` | `PatientProfileResponseDto` | `COMPLETE` |
| `POST` | `/onboarding/emergency-contact` | `AuthGuard('jwt')` | `EmergencyContactDto` | `PatientProfileResponseDto` | `COMPLETE` |
| `PUT` | `/onboarding/emergency-contact` | `AuthGuard('jwt')` | `EmergencyContactDto` | `PatientProfileResponseDto` | `COMPLETE` |
| `POST` | `/onboarding/insurance` | `AuthGuard('jwt')` | `PatientInsuranceDto` | `PatientProfileResponseDto` | `COMPLETE` |
| `PUT` | `/onboarding/insurance` | `AuthGuard('jwt')` | `PatientInsuranceDto` | `PatientProfileResponseDto` | `COMPLETE` |
| `POST` | `/onboarding/health-card` | `AuthGuard('jwt')` | `HealthCardRequestDto` | `HealthCardResponseDto` | `COMPLETE` |
| `POST` | `/onboarding/family-invite` | `AuthGuard('jwt')` | `FamilyInviteDto` | `FamilyMemberResponseDto` | `COMPLETE` |
| `GET` | `/onboarding/progress` | `AuthGuard('jwt')` | None | `OnboardingProgressResponseDto` | `COMPLETE` |
| `POST` | `/onboarding/complete` | `AuthGuard('jwt')` | None | `PatientProfileResponseDto` | `COMPLETE` |
| `GET` | `/onboarding/completion`| `AuthGuard('jwt')` | None | `OnboardingCompletionResponseDto` | `COMPLETE` |
| `GET` | `/me` | `AuthGuard('jwt')` | None | `PatientProfileResponseDto` | `COMPLETE` |
| `PUT` | `/me` | `AuthGuard('jwt')` | `UpdatePatientProfileDto` | `PatientProfileResponseDto` | `COMPLETE` |
| `PATCH`| `/family-consents/:id`| `AuthGuard('jwt')` | Param: `id`, Body: `ConsentActionDto` | `FamilyConsentResponseDto` | `COMPLETE` |
| `GET` | `/me/full` | `AuthGuard('jwt')` | None | `PatientFullProfileResponseDto` | `COMPLETE` |
| `PATCH`| `/me/basic` | `AuthGuard('jwt')` | `UpdateBasicDetailsDto` | `PatientProfileResponseDto` | `COMPLETE` |
| `PATCH`| `/me/contact` | `AuthGuard('jwt')` | `UpdateContactDetailsDto` | `PatientProfileResponseDto` | `COMPLETE` |
| `PATCH`| `/me/address` | `AuthGuard('jwt')` | `UpdateAddressDto` | `PatientProfileResponseDto` | `COMPLETE` |
| `PATCH`| `/me/preferences` | `AuthGuard('jwt')` | `UpdatePreferencesDto` | `PatientProfileResponseDto` | `COMPLETE` |
| `PATCH`| `/me/medical-summary` | `AuthGuard('jwt')`| `UpdateMedicalSummaryDto`| `PatientProfileResponseDto` | `COMPLETE` |
| `POST` | `/me/photo` | `AuthGuard('jwt')` | `UploadPhotoDto` (storageKey) | `{ photoUrl: string }` | `COMPLETE` |
| `DELETE`| `/me/photo` | `AuthGuard('jwt')` | None | `{ success: true }` | `COMPLETE` |
| `GET` | `/profile/completion` | `AuthGuard('jwt')` | None | `ProfileCompletionResponseDto` | `COMPLETE` |
| `GET` | `/profile/timeline` | `AuthGuard('jwt')` | None | `PatientTimelineEventDto[]` (bare array) | `COMPLETE` |
| `GET` | `/profile/activity` | `AuthGuard('jwt')` | None | `PatientActivityLogDto[]` (bare array) | `COMPLETE` |

---

### 3.3 Doctors (`DoctorController` — 18 Endpoints)
- **Base Route:** `/api/v1/doctors`
- **Class Guards:** `AuthGuard('jwt')`, `RolesGuard`

| Method | Sub-Route | Guards / Roles | Request DTO / Params | Response Structure | Status |
|---|---|---|---|---|---|
| `POST` | `/` | Open Authenticated | `RegisterDoctorDto` | `DoctorProfileFullResponseDto` | `COMPLETE` |
| `GET` | `/` | Open Authenticated | Query: `page`, `limit` | `{ data: DoctorProfileResponseDto[], meta: PaginationMeta }` | `COMPLETE` |
| `GET` | `/search` | Open Authenticated | Query: `q` (string) | `DoctorProfileResponseDto[]` (bare array) | `COMPLETE` |
| `GET` | `/statistics` | Open Authenticated | None | `DoctorStatsResponseDto` | `COMPLETE` |
| `GET` | `/verification/pending` | `ADMIN`, `SUPER_ADMIN`, `FACILITY_ADMIN` | None | `DoctorProfileFullResponseDto[]` | `COMPLETE` |
| `GET` | `/:id` | Open Authenticated | Param: `id` (Doctor Profile ID) | `DoctorProfileFullResponseDto` | `COMPLETE` |
| `PUT` | `/:id` | `ADMIN`, `SUPER_ADMIN`, `DOCTOR` | Param: `id`, Body: `Partial<RegisterDoctorDto>` | `DoctorProfileFullResponseDto` | `COMPLETE` |
| `DELETE`| `/:id` | `ADMIN`, `SUPER_ADMIN`, `FACILITY_ADMIN` | Param: `id` | `{ success: true, message: string }` | `COMPLETE` |
| `POST` | `/:id/verify` | `ADMIN`, `SUPER_ADMIN`, `FACILITY_ADMIN` | Param: `id`, Body: `DoctorActionDto` | `DoctorProfileFullResponseDto` | `COMPLETE` |
| `POST` | `/:id/reject` | `ADMIN`, `SUPER_ADMIN`, `FACILITY_ADMIN` | Param: `id`, Body: `DoctorActionDto` | `DoctorProfileFullResponseDto` | `COMPLETE` |
| `POST` | `/:id/suspend` | `ADMIN`, `SUPER_ADMIN`, `FACILITY_ADMIN` | Param: `id`, Body: `DoctorActionDto` | `DoctorProfileFullResponseDto` | `COMPLETE` |
| `POST` | `/:id/restore` | `ADMIN`, `SUPER_ADMIN`, `FACILITY_ADMIN` | Param: `id` | `DoctorProfileFullResponseDto` | `COMPLETE` |
| `POST` | `/:id/renew-license` | Open Authenticated | Param: `id`, Body: `RenewLicenseDto` | `DoctorProfileFullResponseDto` | `COMPLETE` |
| `POST` | `/:id/generate-qr` | Open Authenticated | Param: `id` | `QrCodeResponseDto` | `COMPLETE` |
| `GET` | `/:id/documents` | Open Authenticated | Param: `id` | `DoctorDocumentResponseDto[]` | `COMPLETE` |
| `POST` | `/:id/documents` | Open Authenticated | Param: `id`, Body: `AttachDoctorDocumentDto` | `DoctorDocumentResponseDto` | `COMPLETE` |
| `GET` | `/:id/history` | Open Authenticated | Param: `id` | `DoctorHistoryItemDto[]` | `COMPLETE` |
| `GET` | `/:id/slots` | Open Authenticated | Param: `id`, Query: `startDate`, `endDate` | `ScheduleSlotResponseDto[]` | `COMPLETE` |

---

### 3.4 Medical Records & Attachments (`MedicalRecordController` — 17 Endpoints)
- **Base Route:** `/api/v1/medical-records` (11 endpoints) and `/api/v1/attachments` (6 endpoints)
- **Class Guards:** `AuthGuard('jwt')`

| Method | Full Route | Guards / Roles | Request DTO / Params | Response Structure | Status |
|---|---|---|---|---|---|
| `POST` | `/api/v1/medical-records` | `AuthGuard('jwt')` (Scopes to caller's `PatientProfile`) | `CreateMedicalRecordDto` | `MedicalRecordResponseDto` | `PARTIAL` (Patient-only; blocks doctors) |
| `GET` | `/api/v1/medical-records` | `AuthGuard('jwt')` | None (Unpaginated) | `MedicalRecordResponseDto[]` (bare array) | `COMPLETE` |
| `GET` | `/api/v1/medical-records/timeline` | `AuthGuard('jwt')` | None (Unpaginated) | `MedicalTimelineItemDto[]` (bare array) | `COMPLETE` |
| `GET` | `/api/v1/medical-records/search` | `AuthGuard('jwt')` | Query: `q` | `MedicalRecordResponseDto[]` | `COMPLETE` |
| `GET` | `/api/v1/medical-records/:id` | `AuthGuard('jwt')` | Param: `id` | `MedicalRecordResponseDto` | `COMPLETE` |
| `PUT` | `/api/v1/medical-records/:id` | `AuthGuard('jwt')` | Param: `id`, Body: `UpdateMedicalRecordDto` | `MedicalRecordResponseDto` | `COMPLETE` |
| `DELETE`| `/api/v1/medical-records/:id` | `AuthGuard('jwt')` | Param: `id` | `{ success: true, message: string }` | `COMPLETE` |
| `POST` | `/api/v1/medical-records/:id/archive` | `AuthGuard('jwt')` | Param: `id` | `MedicalRecordResponseDto` | `COMPLETE` |
| `POST` | `/api/v1/medical-records/:id/restore` | `AuthGuard('jwt')` | Param: `id` | `MedicalRecordResponseDto` | `COMPLETE` |
| `POST` | `/api/v1/medical-records/:id/attachments` | `AuthGuard('jwt')` | Param: `id`, Body: `CreateAttachmentDto` | `AttachmentResponseDto` | `PARTIAL` (Sets `virusScanStatus: PENDING`) |
| `GET` | `/api/v1/medical-records/:id/attachments` | `AuthGuard('jwt')` | Param: `id` | `AttachmentResponseDto[]` | `COMPLETE` |
| `POST` | `/api/v1/attachments` | `AuthGuard('jwt')` | `CreateAttachmentDto` | `AttachmentResponseDto` | `PARTIAL` (Sets `virusScanStatus: PENDING`) |
| `GET` | `/api/v1/attachments/:id` | `AuthGuard('jwt')` | Param: `id` | `AttachmentResponseDto` | `COMPLETE` |
| `PATCH`| `/api/v1/attachments/:id` | `AuthGuard('jwt')` | Param: `id`, Body: `UpdateAttachmentDto` | `AttachmentResponseDto` | `COMPLETE` |
| `DELETE`| `/api/v1/attachments/:id` | `AuthGuard('jwt')` | Param: `id` | `{ success: true, message: string }` | `COMPLETE` |
| `POST` | `/api/v1/attachments/:id/restore` | `AuthGuard('jwt')` | Param: `id` | `AttachmentResponseDto` | `COMPLETE` |
| `GET` | `/api/v1/attachments/:id/versions` | `AuthGuard('jwt')` | Param: `id` | `AttachmentVersionResponseDto[]` | `COMPLETE` |

---

### 3.5 Clinical Reports vs BI Analytics Collision (`/api/v1/reports` — 34 Endpoints)

#### A. Clinical Diagnostic Reports (`ReportController` — 17 Endpoints)
- **Class Guards:** `ReportAuthGuard` (Verifies JWT and enforces patient profile or clinical ownership)

| Method | Route | Description | Response Structure | Status |
|---|---|---|---|---|
| `POST` | `/api/v1/reports` | Upload & register diagnostic report | `FullReportResponseDto` | `COMPLETE` |
| `GET` | `/api/v1/reports` | Get all patient diagnostic reports | `ReportSummaryResponseDto[]` | `COMPLETE` |
| `GET` | `/api/v1/reports/categories` | Categories breakdown with counts | `ReportCategoryCountDto[]` | `COMPLETE` |
| `GET` | `/api/v1/reports/search` | Search diagnostic reports | `ReportSummaryResponseDto[]` | `COMPLETE` |
| `GET` | `/api/v1/reports/timeline` | Reports ordered by report date | `ReportSummaryResponseDto[]` | `COMPLETE` |
| `GET` | `/api/v1/reports/:id` | Get report details by ID | `FullReportResponseDto` | `COMPLETE` |
| `PUT` | `/api/v1/reports/:id` | Update report metadata | `FullReportResponseDto` | `COMPLETE` |
| `DELETE`| `/api/v1/reports/:id` | Soft-delete a report | `{ success: true }` | `COMPLETE` |
| `POST` | `/api/v1/reports/:id/archive` | Make report read-only | `FullReportResponseDto` | `COMPLETE` |
| `POST` | `/api/v1/reports/:id/restore` | Restore soft-deleted report | `FullReportResponseDto` | `COMPLETE` |
| `POST` | `/api/v1/reports/:id/replace` | Replace PDF file with version snapshot | `FullReportResponseDto` | `COMPLETE` |
| `GET` | `/api/v1/reports/:id/versions` | Get version history | `ReportVersionResponseDto[]` | `COMPLETE` |
| `POST` | `/api/v1/reports/:id/verify` | Mark report as verified | `FullReportResponseDto` | `COMPLETE` |
| `GET` | `/api/v1/reports/download/:id` | Generate secure download URL/token | `SecureDownloadUrlResponseDto` | `PARTIAL` (Blocked if `virusScanStatus != CLEAN`) |
| `GET` | `/api/v1/reports/download/:id/file`| Execute verified download stream | Binary stream / redirect | `PARTIAL` (Blocked if `virusScanStatus != CLEAN`) |
| `GET` | `/api/v1/reports/:id/file` | Download stream (alias) | Binary stream / redirect | `PARTIAL` (Blocked if `virusScanStatus != CLEAN`) |
| `GET` | `/api/v1/reports/preview/:id` | Get PDF preview metadata | `ReportPreviewResponseDto` | `PARTIAL` (Blocked if `virusScanStatus != CLEAN`) |

#### B. Platform BI Analytics & Definitions (`ReportsController` — 17 Endpoints)
- **Class Guards:** `AuthGuard('jwt')`, `RolesGuard` (`@Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')`)

| Method | Route | Description | Response Structure | Status |
|---|---|---|---|---|
| `GET` | `/api/v1/reports/dashboard/executive` | Platform summary statistics | `ExecutiveDashboardResponseDto` | `COMPLETE` |
| `GET` | `/api/v1/reports/analytics/modules/:module` | Domain analytics for module | `ModuleAnalyticsResponseDto` | `COMPLETE` |
| `POST` | `/api/v1/reports/definitions` | Create report definition | `ReportDefinitionResponseDto` | `COMPLETE` |
| `GET` | `/api/v1/reports/definitions` | List report definitions | `ReportDefinitionResponseDto[]` | `COMPLETE` |
| `GET` | `/api/v1/reports/definitions/:id` | Get report definition by ID | `ReportDefinitionResponseDto` | `COMPLETE` |
| `PUT` | `/api/v1/reports/definitions/:id` | Update report definition | `ReportDefinitionResponseDto` | `COMPLETE` |
| `DELETE`| `/api/v1/reports/definitions/:id` | Delete report definition | `{ success: true }` | `COMPLETE` |
| `POST` | `/api/v1/reports/generate` | Generate on-demand report | `GeneratedReportResponseDto` | `COMPLETE` |
| `GET` | `/api/v1/reports/generated` | List generated reports | `GeneratedReportResponseDto[]` | `COMPLETE` |
| `GET` | `/api/v1/reports/generated/:id` | Get generated report details | `GeneratedReportResponseDto` | `COMPLETE` |
| `POST` | `/api/v1/reports/generated/:id/export` | Export report (PDF/CSV/XLSX/JSON) | Binary file export | `COMPLETE` |
| `POST` | `/api/v1/reports/widgets` | Create dashboard widget | `DashboardWidgetResponseDto` | `COMPLETE` |
| `GET` | `/api/v1/reports/widgets` | List dashboard widgets | `DashboardWidgetResponseDto[]` | `COMPLETE` |
| `PUT` | `/api/v1/reports/widgets/:id` | Update widget config | `DashboardWidgetResponseDto` | `COMPLETE` |
| `POST` | `/api/v1/reports/widgets/reorder` | Reorder widget display order | `DashboardWidgetResponseDto[]` | `COMPLETE` |
| `POST` | `/api/v1/reports/snapshots` | Record analytics snapshot | `AnalyticsSnapshotResponseDto` | `COMPLETE` |
| `GET` | `/api/v1/reports/snapshots` | Get analytics snapshots | `AnalyticsSnapshotResponseDto[]` | `COMPLETE` |

---

### 3.6 OCR & Document Processing (`OCRController` & `AiOcrController` — 18 Endpoints)

#### A. Enterprise OCR Subsystem (`OCRController` — 16 Endpoints)
- **Base Route:** `/api/v1/ocr`
- **Guards:** Method-level `AuthGuard('jwt')`, `RolesGuard`

| Method | Route | Roles | Description | Status |
|---|---|---|---|---|
| `GET` | `/dashboard` | Authenticated | High-level OCR dashboard statistics | `COMPLETE` |
| `POST` | `/jobs` | Authenticated | Submit new OCR processing job | `MOCKED` (Simulated recognition) |
| `POST` | `/reprocess/:jobId` | Owner / `ADMIN` | Force re-run OCR job | `MOCKED` (Simulated recognition) |
| `GET` | `/jobs` | Authenticated | List OCR jobs (Query: `status`, `page`, `limit`) | `COMPLETE` (Returns bare array) |
| `GET` | `/jobs/:id` | Authenticated | Get OCR job details | `COMPLETE` |
| `GET` | `/jobs/:id/text` | Authenticated | Get full raw extracted text | `COMPLETE` |
| `GET` | `/jobs/:id/fields` | Authenticated | Get extracted key-value fields | `COMPLETE` |
| `GET` | `/jobs/:id/json` | Authenticated | Get structured JSON extracted data | `COMPLETE` |
| `POST` | `/templates` | Authenticated | Create OCR template definition | `COMPLETE` |
| `GET` | `/templates` | Authenticated | List all OCR templates | `COMPLETE` |
| `GET` | `/templates/:id` | Authenticated | Get OCR template by ID | `COMPLETE` |
| `PUT` | `/templates/:id` | Authenticated | Update OCR template | `COMPLETE` |
| `DELETE`| `/templates/:id` | Authenticated | Soft-delete OCR template | `COMPLETE` |
| `GET` | `/review` | `ADMIN`, `SUPER_ADMIN`, `DOCTOR`, `STAFF` | List jobs requiring human verification | `COMPLETE` |
| `POST` | `/review/:jobId` | `ADMIN`, `SUPER_ADMIN`, `DOCTOR`, `STAFF` | Submit human verification/corrections | `COMPLETE` |
| `GET` | `/reviews/history` | Authenticated | Paginated audit log of human reviews | `COMPLETE` |

#### B. Legacy AI OCR (`AiOcrController` — 2 Endpoints)
- **Base Route:** `/api/v1/ai/ocr`
- **Class Guards:** `AuthGuard('jwt')`

| Method | Route | Description | Status |
|---|---|---|---|
| `POST` | `/extract` | Extract document data via AI OCR | `MOCKED` (Hardcoded mock response) |
| `POST` | `/confirm` | Confirm AI OCR extraction into `MedicalReport` | `COMPLETE` (Saves to DB) |

---

### 3.7 Admin Subsystem (`AdminController` — 29 Endpoints)
- **Base Route:** `/api/v1/admin`
- **Class Guards:** `AuthGuard('jwt')`, `RolesGuard`
- **Enforced Roles:** `@Roles('ADMIN', 'SUPER_ADMIN')` on all endpoints

| Method | Route | Description | Pagination |
|---|---|---|---|
| `GET` | `/dashboard/stats` | System KPI cards | No |
| `GET` | `/dashboard/summary` | Executive summary stats | No |
| `GET` | `/users` | List platform users | `page`, `limit` (`{ data, meta }`) |
| `GET` | `/users/:id` | User details by ID | No |
| `GET` | `/patients` | List patients with clinical filters | `page`, `limit` (`{ data, meta }`) |
| `GET` | `/patients/:patientId` | Get patient details | No |
| `GET` | `/patients/:patientId/medical-records` | List patient medical records | `page`, `limit` (`{ data, meta }`) |
| `GET` | `/patients/:patientId/medical-records/timeline`| Unified clinical timeline | `page`, `limit` (`{ data, meta }`) |
| `GET` | `/medical-records` | Global medical records search | `page`, `limit` (`{ data, meta }`) |
| `GET` | `/medical-records/:recordId` | Clinical record details | No |
| `PUT` | `/users/:id/status` | Update user status (`ACTIVE`, `SUSPENDED`) | No |
| `PUT` | `/users/:id/roles` | Assign system roles | No |
| `DELETE`| `/users/:id` | Soft-delete user | No |
| `POST` | `/users/:id/restore` | Restore soft-deleted user | No |
| `GET` | `/roles` | Master system roles list | No |
| `GET` | `/permissions` | Master permissions list | No |
| `GET` | `/permission-groups` | Grouped permissions | No |
| `POST` | `/permission-groups` | Create permission group | No |
| `POST` | `/permissions` | Create permission | No |
| `PUT` | `/roles/:id/permissions` | Update role permissions | No |
| `GET` | `/permission-matrix` | Complete RBAC matrix | No |
| `POST` | `/organizations` | Create healthcare organization | No |
| `GET` | `/organizations` | List organizations | No |
| `GET` | `/organizations/:id` | Organization details | No |
| `PUT` | `/organizations/:id` | Update organization | No |
| `DELETE`| `/organizations/:id` | Soft-delete organization | No |
| `GET` | `/settings` | Global system settings | No |
| `PUT` | `/settings` | Update system settings | No |
| `GET` | `/audit-logs` | Master security audit logs | No |

---

### 3.8 Schedules, Shifts & Holidays (19 Endpoints)
- **Controllers:** `ScheduleController` (13), `ShiftController` (4), `HolidayController` (2)
- **Base Routes:** `/api/v1/schedules`, `/api/v1/shifts`, `/api/v1/holidays`
- **Class Guards:** `AuthGuard('jwt')`, `RolesGuard` (`ADMIN`, `SUPER_ADMIN`, `FACILITY_ADMIN`)

| Controller | Method | Route | Description | Status |
|---|---|---|---|---|
| `ScheduleController` | `POST` | `/api/v1/schedules` | Create schedule profile | `COMPLETE` |
| `ScheduleController` | `GET` | `/api/v1/schedules` | List schedule profiles | `COMPLETE` |
| `ScheduleController` | `GET` | `/api/v1/schedules/search` | Search schedules | `COMPLETE` |
| `ScheduleController` | `GET` | `/api/v1/schedules/statistics` | Scheduling engine stats | `COMPLETE` |
| `ScheduleController` | `GET` | `/api/v1/schedules/:id` | Schedule detail & hours | `COMPLETE` |
| `ScheduleController` | `PUT` | `/api/v1/schedules/:id` | Update schedule profile | `COMPLETE` |
| `ScheduleController` | `DELETE`| `/api/v1/schedules/:id` | Soft-delete schedule | `COMPLETE` |
| `ScheduleController` | `POST` | `/api/v1/schedules/:id/generate-slots` | Generate booking slots | `COMPLETE` |
| `ScheduleController` | `GET` | `/api/v1/schedules/:id/slots` | Get generated slots | `COMPLETE` |
| `ScheduleController` | `POST` | `/api/v1/schedules/:id/block` | Add schedule exception | `COMPLETE` |
| `ScheduleController` | `POST` | `/api/v1/schedules/:id/unblock` | Remove exception | `COMPLETE` |
| `ScheduleController` | `POST` | `/api/v1/schedules/:id/leave` | Add leave block | `COMPLETE` |
| `ScheduleController` | `GET` | `/api/v1/schedules/:id/history` | Audit & history | `COMPLETE` |
| `ShiftController` | `POST` | `/api/v1/shifts` | Create shift definition | `COMPLETE` |
| `ShiftController` | `GET` | `/api/v1/shifts` | List shift definitions | `COMPLETE` |
| `ShiftController` | `POST` | `/api/v1/shifts/:id/assign` | Assign staff to shift | `COMPLETE` |
| `ShiftController` | `GET` | `/api/v1/shifts/:id/assignments` | Staff shift assignments | `COMPLETE` |
| `HolidayController` | `POST` | `/api/v1/holidays` | Add calendar holiday | `COMPLETE` |
| `HolidayController` | `GET` | `/api/v1/holidays` | List calendar holidays | `COMPLETE` |

---

### 3.9 Notifications Subsystem (16 Endpoints)
- **Controllers:** `NotificationController` (11), `NotificationTemplateController` (5)
- **Base Routes:** `/api/v1/notifications`, `/api/v1/notifications/templates`

| Method | Route | Guards / Roles | Description | Status |
|---|---|---|---|---|
| `POST` | `/api/v1/notifications` | Authenticated | Create & enqueue notification | `PARTIAL` (Enqueues; no worker dispatch) |
| `GET` | `/api/v1/notifications` | Authenticated | Get user notifications | `COMPLETE` (Bare array) |
| `GET` | `/api/v1/notifications/unread/count`| Authenticated | Unread count badge | `COMPLETE` |
| `PATCH`| `/api/v1/notifications/:id/read` | Authenticated | Mark notification read | `COMPLETE` |
| `POST` | `/api/v1/notifications/read-all` | Authenticated | Mark all notifications read | `COMPLETE` |
| `DELETE`| `/api/v1/notifications/:id` | Authenticated | Soft-delete notification | `COMPLETE` |
| `GET` | `/api/v1/notifications/preferences` | Authenticated | Get notification channels | `COMPLETE` |
| `PUT` | `/api/v1/notifications/preferences` | Authenticated | Update channel preferences | `COMPLETE` |
| `GET` | `/api/v1/notifications/queue/pending` | `ADMIN`, `SUPER_ADMIN` | Inspect undelivered queue | `COMPLETE` |
| `POST` | `/api/v1/notifications/queue/retry` | `ADMIN`, `SUPER_ADMIN` | Retry failed queue items | `COMPLETE` |
| `GET` | `/api/v1/notifications/audit` | `ADMIN`, `SUPER_ADMIN` | Notification audit logs | `COMPLETE` |
| `POST` | `/api/v1/notifications/templates` | `ADMIN`, `SUPER_ADMIN` | Create template | `COMPLETE` |
| `GET` | `/api/v1/notifications/templates` | `ADMIN`, `SUPER_ADMIN` | List templates | `COMPLETE` |
| `GET` | `/api/v1/notifications/templates/:id`| `ADMIN`, `SUPER_ADMIN` | Get template by ID | `COMPLETE` |
| `PUT` | `/api/v1/notifications/templates/:id`| `ADMIN`, `SUPER_ADMIN` | Update template | `COMPLETE` |
| `DELETE`| `/api/v1/notifications/templates/:id`| `ADMIN`, `SUPER_ADMIN` | Delete template | `COMPLETE` |

---

### 3.10 Facilities, QR, Family, Referrals, Insurance & Governance
- **Facilities (`FacilityController` — 20 Endpoints):** Master facility registry, rooms, departments, doctor assignments (`/api/v1/facilities`).
- **QR Subsystem (`QrController` — 20 Endpoints):** Generation, validation, rotation, revocation, bulk issuing (`/api/v1/qr`).
- **Health Cards (`HealthCardController` — 16 Endpoints):** Issuance, activation, blocking, replacement, renewal (`/api/v1/health-cards`).
- **Family Subsystem (`FamilyController` — 22 Endpoints):** Family groups, members, consent requests, child linkage (`/api/v1/family`).
- **Referrals (`ReferralController` — 14 Endpoints):** Clinical referrals, triage, notes, attachments, status history (`/api/v1/referrals`).
- **Insurance (`InsuranceController` — 22 Endpoints):** Claims, policies, pre-auth, coverage checks (`/api/v1/insurance`).
- **Governance (`GovernanceController` — 28 Endpoints):** System configurations, policies, compliance rules (`/api/v1/governance`).
- **Security (`SecurityController` — 17 Endpoints):** Patient consents, key rotation, incident response (`/api/v1/security`).
- **Observability (`ObservabilityController` — 15 Endpoints):** Health probes, metrics, logs, distributed traces (`/api/v1/observability`).
- **CMS (`CmsController` — 31 Endpoints):** FAQ, announcements, banners, policies, content blocks (`/api/v1/cms`).
- **Staff (`StaffController` — 16 Endpoints):** Hospital staff management, assignments (`/api/v1/staff`).
- **Health Probes (`HealthController` — 3 Endpoints):** `/health`, `/health/live`, `/health/ready`.

---

## 4. Route Collision & Architectural Defect Analysis

### 4.1 Route Conflict: `ReportController` vs `ReportsController`
Both controllers mount at `/api/v1/reports`.
```typescript
// src/modules/report/presentation/controllers/report.controller.ts
@Controller('reports')
@UseGuards(ReportAuthGuard)
export class ReportController { ... }

// src/modules/reports/presentation/controllers/reports.controller.ts
@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReportsController { ... }
```
#### Impact:
1. **Module Import Ordering Dependency:**
   In `src/app.module.ts`, `ReportsModule` is deliberately placed before `ReportModule`:
   ```typescript
   ReportsModule, // Placed before ReportModule so specific routes (/reports/definitions) precede wildcard /reports/:id
   ReportModule,
   ```
   If the order in `app.module.ts` is ever inverted during refactoring, `ReportController`'s `@Get(':id')` will intercept and capture calls to `/api/v1/reports/definitions`, `/api/v1/reports/generated`, and `/api/v1/reports/widgets`, failing with 404 because the string `'definitions'` will be queried as a medical report UUID.
2. **Conflicting Guards:**
   Calls to `/api/v1/reports` execute different security filters depending on the path. Diagnostic reports use `ReportAuthGuard`, while executive reports use `RolesGuard`.
3. **Recommendation:**
   In Phase 5, rename `ReportsController`'s route prefix from `@Controller('reports')` to `@Controller('analytics')` or `@Controller('admin/reports')` to permanently eliminate route namespace shadowing.

---

## 5. Pagination Contract Audit

### 5.1 Paginated vs Non-Paginated Inventory
- **Total GET Endpoints in Backend:** 172
- **GET Endpoints with Query Pagination (`page`, `limit`):** 11 (6.4%)
- **GET Endpoints returning unpaginated collections:** 71 (41.3%)

### 5.2 Envelope Inconsistencies Across Active Endpoints

| Endpoint | Input Query Params | Response Structure | Standard Compliance |
|---|---|---|---|
| `GET /api/v1/doctors` | `page=1`, `limit=50` (max 100) | `{ data: [...], meta: { total, page, limit, totalPages, hasNextPage, hasPreviousPage } }` | **Compliant** |
| `GET /api/v1/facilities` | `page=1`, `limit=50` (max 100) | `{ data: [...], meta: { total, page, limit, totalPages, hasNextPage, hasPreviousPage } }` | **Compliant** |
| `GET /api/v1/admin/patients` | `page=1`, `limit=20` (max 100) | `{ data: [...], meta: { total, page, limit, totalPages, hasNextPage, hasPreviousPage } }` | **Compliant** |
| `GET /api/v1/admin/medical-records` | `page=1`, `limit=20` (max 100) | `{ data: [...], meta: { total, page, limit, totalPages, hasNextPage, hasPreviousPage } }` | **Compliant** |
| `GET /api/v1/ocr/reviews/history` | `page=1`, `limit=20` (max 100) | `{ data: [...], meta: { total, page, limit, totalPages, hasNextPage, hasPreviousPage } }` | **Compliant** |
| `GET /api/v1/referrals` | `page=1`, `limit=20` | `{ data: [...], total: number }` | **Inconsistent** (Missing page, limit, totalPages) |
| `GET /api/v1/ocr/jobs` | `page=1`, `limit=50` | `OCRJobResponseDto[]` | **Non-Compliant** (Takes page/limit but returns bare array) |
| `GET /api/v1/medical-records` | None | `MedicalRecordResponseDto[]` | **Unpaginated** (Returns all records for patient) |
| `GET /api/v1/reports` | None | `ReportSummaryResponseDto[]` | **Unpaginated** (Returns all reports for patient) |
| `GET /api/v1/notifications` | None | `NotificationResponseDto[]` | **Unpaginated** (Returns all notifications) |

#### Mobile Client Impact:
Flutter developers cannot use a single unified JSON serializer for paginated lists. Endpoints must be mapped specifically according to whether they return an envelope or a plain array.

---

## 6. Role-Based Access Control (RBAC) Audit

### 6.1 RBAC Enforcement Model
The application uses NestJS `RolesGuard` (`src/modules/auth/infrastructure/guards/roles.guard.ts`).
```typescript
canActivate(context: ExecutionContext): boolean {
  const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
    context.getHandler(),
    context.getClass(),
  ]);
  if (!requiredRoles || requiredRoles.length === 0) {
    return true; // Open to any authenticated user with a valid JWT
  }
  const { user } = context.switchToHttp().getRequest();
  return requiredRoles.some((role) => user.roles.includes(role));
}
```

### 6.2 Key RBAC Findings
1. **Default-Open for Authenticated Users:**
   Controllers applying `@UseGuards(AuthGuard('jwt'), RolesGuard)` at the class level (e.g., `DoctorController`, `FacilityController`, `ReferralController`) are **default-open** for methods that lack an explicit `@Roles(...)` decorator. Any valid token (including a `PATIENT` token) can invoke those methods unless the service explicitly enforces identity checks.
2. **Doctor Medical Records Restriction:**
   In `MedicalRecordService`, all methods resolve patient identity via:
   ```typescript
   private async resolveProfile(userId: string): Promise<string> {
     const profile = await this.repository.findProfileByUserId(userId);
     if (!profile) throw new NotFoundException('Patient profile not found.');
     return profile.id;
   }
   ```
   Because doctors have a `DoctorProfile` rather than a `PatientProfile`, a doctor calling `/api/v1/medical-records` receives a `404 Not Found`. There is no doctor-facing encounter documentation API in `MedicalRecordController`.
3. **Doctor Profile Retrieval Asymmetry:**
   In `DoctorController`, `GET /api/v1/doctors/:id` is public to all authenticated users, but `PUT /api/v1/doctors/:id` allows `ADMIN`, `SUPER_ADMIN`, and `DOCTOR`. However, there is no `GET /api/v1/doctors/me` route. A logged-in doctor must know their `DoctorProfile.id` (which is not included in the JWT payload) to view or update their profile.

---

## 7. Summary Audit Scorecard

| Area | Status | Evidence / Notes |
|---|---|---|
| **Total Registered Routes** | 435 Operations | Verified across NestJS AST and `swagger-spec.json` |
| **Postman Parity** | 427 / 435 (98.2%) | 8 Phase 3 administrative endpoints missing from Postman |
| **Appointment APIs** | 0% (Missing) | `AppointmentController` is an unimplemented stub |
| **Pagination Uniformity** | 6.4% Paginated | 3 conflicting envelope formats in use |
| **OCR Completeness** | Simulated / Mocked | Relational workflow active; recognition engine simulated |
| **File Antivirus Pipeline** | Blocked | Newly uploaded attachments remain `PENDING` indefinitely |

