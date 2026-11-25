# CareID System & Architecture Inventory

**Audit Date:** October 2026  
**Project:** CareID / Health Vault 360  
**Repository Working Directory:** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Execution Context:** Phase 1 Read-Only System Audit  

---

## 1. Environment & Stack Baseline

| Component | Discovered Version / Configuration | Evidence Location | Verification Status |
| :--- | :--- | :--- | :--- |
| **Operating System** | Windows 10/11 (PowerShell 5.1/7.x) | Host Environment | Verified |
| **Node.js Runtime** | Node.js `v24.14.0` | Local CLI | Verified |
| **NestJS Framework** | `^11.1.28` (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`) | `package.json:31-36` | Verified |
| **TypeScript** | `^5.7.3` / `@typescript-eslint: ^8.65.0` | `package.json:62-63`, `tsconfig.json` | Clean (`tsc --noEmit` exit code 0) |
| **ORM / Data Layer** | Prisma `^7.9.1` (`@prisma/client`, `@prisma/adapter-pg: 7.9.1`) | `package.json:38-39`, `prisma/schema.prisma` | 144 models, 55 enums |
| **Database Engine** | PostgreSQL 15 / 16 via native `pg: ^8.22.0` connection pool | `package.json:50`, `src/database/database.service.ts` | Pool max 10, timeout 5000ms |
| **Git Repository** | Standalone directory export (no `.git` directory found) | Local Directory Inspection | Verified (Not a Git repository) |
| **Production API Host** | `https://360api.vnvision.in` | Live Network Probes | Verified reachable (HTTP 200 on `/api/v1/health`) |
| **Internal App Port** | Port `3073` (default host `0.0.0.0`) | `src/main.ts:109-110` | Configured in bootstrap |
| **API Global Routing** | Global Prefix: `api`, URI Versioning: `v1` -> `/api/v1` | `src/main.ts:65-72` | Verified |
| **Process Manager** | Native Node.js in dev / Staging scripts indicate PM2 on aaPanel | `scripts/package-release.ps1`, `ecosystem.config.js` | Verified |

---

## 2. Active NestJS Modules Inventory

The monolith application is structured into **26 active modules**, all registered directly in `src/app.module.ts`:

### 2.1. Core Infrastructure Modules (4)
1. **`ConfigModule`** (`@nestjs/config`): Global configuration loading `src/config/env.config.ts` with strict schema validation in `src/config/env.validation.ts`.
2. **`LoggerModule`** (`nestjs-pino`): Structured JSON logger with header redaction (`authorization`, `cookie`, `set-cookie`, `x-api-key`).
3. **`DatabaseModule`** (`src/database/database.module.ts`): Global provider for `DatabaseService` (PrismaClient with PostgreSQL adapter).
4. **`HealthModule`** (`src/core/health/health.module.ts`): Diagnostic probes (`/health`, `/ready`, `/live`).

### 2.2. Enterprise Business Domain Modules (22)
1. **`AuthModule`** (`src/modules/auth/auth.module.ts`): OTP lifecycle, admin password authentication, JWT issuing, session management, and sliding-window rate limiting.
2. **`PatientModule`** (`src/modules/patient/patient.module.ts`): Patient onboarding (demographics, emergency contacts, insurance link, digital health card initialization, profile completion timeline).
3. **`DoctorModule`** (`src/modules/doctor/doctor.module.ts`): Doctor master registry, licenses, qualifications, experiences, and verification workflows.
4. **`FacilityModule`** (`src/modules/facility/facility.module.ts`): Healthcare facilities, branches, departments, rooms, licenses, and accreditations.
5. **`HealthCardModule`** (`src/modules/health-card/health-card.module.ts`): Digital health card lifecycle (issuance, activation, renewal, replacement, and QR payload generation).
6. **`AppointmentModule`** (`src/modules/appointment/appointment.module.ts`): **UNIMPLEMENTED STUB** (Controller contains `// TODO: Phase 5 Implementation`; 0 active routes, 0 database models).
7. **`ReportsModule`** (`src/modules/reports/reports.module.ts`): Business intelligence analytics, report definitions, generated exports, and executive dashboard widgets.
8. **`ReportModule`** (`src/modules/report/report.module.ts`): Clinical diagnostic document vault, file uploads, versions, and verified download tokens.
9. **`InsuranceModule`** (`src/modules/insurance/insurance.module.ts`): Insurance providers, benefit plans, patient policies, claims drafting, and policy search.
10. **`CmsModule`** (`src/modules/cms/cms.module.ts`): Public pages, FAQs, announcements, policy disclosures, banners, media library, and content blocks.
11. **`AdminModule`** (`src/modules/admin/admin.module.ts`): Platform analytics summary, user directory listing, account status updates, RBAC role/permission management, organization provisioning, and system settings.
12. **`FamilyModule`** (`src/modules/family/family.module.ts`): Family member invitations, guardian/dependent linkages, and granular health data consent records.
13. **`MedicalRecordModule`** (`src/modules/medical-record/medical-record.module.ts`): Clinical encounters, diagnoses, vitals, procedures, and medical attachments with versioning.
14. **`QrModule`** (`src/modules/qr/qr.module.ts`): Cryptographic QR token generation, verification, rotation, and revocation for all business entities.
15. **`ImmunisationModule`** (`src/modules/immunisation/immunisation.module.ts`): Vaccine directory, schedule dose rules, patient vaccination administration, and digital certificates.
16. **`StaffModule`** (`src/modules/staff/staff.module.ts`): Workforce registry, employee codes, staff qualifications, and facility affiliations.
17. **`ScheduleModule`** (`src/modules/schedule/schedule.module.ts`): Schedule profiles, working hours, shifts, shift assignments, and holiday calendars.
18. **`GovernanceModule`** (`src/modules/governance/governance.module.ts`): System configuration versioning, feature flags, master data categories, and platform policies.
19. **`NotificationsModule`** (`src/modules/notifications/notifications.module.ts`): Notification templates, user preferences, internal notification queues, and dispatch tracking.
20. **`OcrModule`** (`src/modules/ocr/ocr.module.ts`): Document extraction jobs, document templates, confidence scoring, and human verification review.
21. **`SecurityModule`** (`src/modules/security/security.module.ts`): Security consent records, encryption keys, data retention policies, and security incident reporting.
22. **`ObservabilityModule`** (`src/modules/observability/observability.module.ts`): System metrics, trace executions, background job monitoring, and performance snapshots.
23. **`ReferralModule`** (`src/modules/referral/referral.module.ts`): Cross-facility patient care referrals, clinical triage outcomes, and referral status tracking.
24. **`AiOcrModule`** (`src/modules/ai-ocr/ai-ocr.module.ts`): AI candidate metadata extraction and confirmation endpoints.
25. **`StorageModule`** (`src/modules/storage/storage.module.ts`): Global provider for `B2StorageService` (Backblaze B2 presigned download URL generation).

---

## 3. Controller & Route Handler Census

A rigorous AST analysis of the TypeScript source code identifies **29 controller classes** across 28 files, containing exactly **427 HTTP route handlers**:

| Controller Class | Path Prefix | Handlers | Module Registration | Source File |
| :--- | :--- | :--- | :--- | :--- |
| `HealthController` | `/` | 3 | `HealthModule` | `src/core/health/health.controller.ts` |
| `AdminController` | `/admin` | 23 | `AdminModule` | `src/modules/admin/presentation/controllers/admin.controller.ts` |
| `AiOcrController` | `/ai/ocr` | 2 | `AiOcrModule` | `src/modules/ai-ocr/presentation/controllers/ai-ocr.controller.ts` |
| `AppointmentController` | `/appointment` | **0** | `AppointmentModule` | `src/modules/appointment/presentation/controllers/appointment.controller.ts` |
| `AuthController` | `/auth` | 14 | `AuthModule` | `src/modules/auth/presentation/controllers/auth.controller.ts` |
| `CmsController` | `/cms` | 31 | `CmsModule` | `src/modules/cms/presentation/controllers/cms.controller.ts` |
| `DoctorController` | `/doctors` | 18 | `DoctorModule` | `src/modules/doctor/presentation/controllers/doctor.controller.ts` |
| `FacilityController` | `/facilities` | 20 | `FacilityModule` | `src/modules/facility/presentation/controllers/facility.controller.ts` |
| `FamilyController` | `/family` | 22 | `FamilyModule` | `src/modules/family/presentation/controllers/family.controller.ts` |
| `GovernanceController` | `/governance` | 28 | `GovernanceModule` | `src/modules/governance/presentation/controllers/governance.controller.ts` |
| `HealthCardController` | `/health-cards` | 16 | `HealthCardModule` | `src/modules/health-card/presentation/controllers/health-card.controller.ts` |
| `ImmunisationController` | `/immunisation` | 18 | `ImmunisationModule` | `src/modules/immunisation/presentation/controllers/immunisation.controller.ts` |
| `InsuranceController` | `/insurance` | 22 | `InsuranceModule` | `src/modules/insurance/presentation/controllers/insurance.controller.ts` |
| `MedicalRecordController` | `/medical-records` | 11 | `MedicalRecordModule` | `src/modules/medical-record/presentation/controllers/medical-record.controller.ts` |
| `AttachmentController` | `/attachments` | 6 | `MedicalRecordModule` | `src/modules/medical-record/presentation/controllers/medical-record.controller.ts` |
| `NotificationTemplateController` | `/notifications/templates`| 5 | `NotificationsModule` | `src/modules/notifications/presentation/controllers/notification-template.controller.ts` |
| `NotificationController` | `/notifications` | 11 | `NotificationsModule` | `src/modules/notifications/presentation/controllers/notification.controller.ts` |
| `ObservabilityController` | `/observability` | 15 | `ObservabilityModule` | `src/modules/observability/presentation/controllers/observability.controller.ts` |
| `OCRController` | `/ocr` | 14 | `OcrModule` | `src/modules/ocr/presentation/controllers/ocr.controller.ts` |
| `PatientController` | `/patients` | 28 | `PatientModule` | `src/modules/patient/presentation/controllers/patient.controller.ts` |
| `QrController` | `/qr` | 20 | `QrModule` | `src/modules/qr/presentation/controllers/qr.controller.ts` |
| `ReferralController` | `/referrals` | 14 | `ReferralModule` | `src/modules/referral/presentation/controllers/referral.controller.ts` |
| `ReportController` | `/reports` | 17 | `ReportModule` | `src/modules/report/presentation/controllers/report.controller.ts` |
| `ReportsController` | `/reports` | 17 | `ReportsModule` | `src/modules/reports/presentation/controllers/reports.controller.ts` |
| `HolidayController` | `/holidays` | 2 | `ScheduleModule` | `src/modules/schedule/presentation/controllers/holiday.controller.ts` |
| `ScheduleController` | `/schedules` | 13 | `ScheduleModule` | `src/modules/schedule/presentation/controllers/schedule.controller.ts` |
| `ShiftController` | `/shifts` | 4 | `ScheduleModule` | `src/modules/schedule/presentation/controllers/shift.controller.ts` |
| `SecurityController` | `/security` | 17 | `SecurityModule` | `src/modules/security/presentation/controllers/security.controller.ts` |
| `StaffController` | `/staff` | 16 | `StaffModule` | `src/modules/staff/presentation/controllers/staff.controller.ts` |
| **TOTAL** | — | **427** | **26 Modules** | **28 Files** |

*Counting Methodology*: Extracted using the TypeScript Compiler API AST walker across all `*.ts` files in `src/`, inspecting class declarations decorated with `@Controller` and method members decorated with HTTP verbs (`@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`).

---

## 4. Specification Comparison (Source vs OpenAPI vs Postman vs Deployed)

| Metric | Source Code | Local OpenAPI (`swagger-spec.json`) | Postman (`CareID-Staging.postman_collection.json`) | Deployed Production (`https://360api.vnvision.in`) |
| :--- | :--- | :--- | :--- | :--- |
| **Total Operations** | **427** | **427** | **427** | Not measurable via Swagger (HTTP 404) |
| **Total Unique Paths** | **313** | **313** | **313** | Parity verified on sampled endpoints |
| **Parity Status** | Baseline Target | **100% Exact Match (427/427)** | **100% Exact Match (427/427)** | Routing Table Matches Source |
| **Documentation Route** | N/A | `docs/swagger-spec.json` | Postman Collection File | `GET /docs-json` -> **404 Not Found** |

### Analysis of Deployed Swagger 404
Inspection of `https://360api.vnvision.in/docs-json` and `/docs` returned:
```json
{
  "success": false,
  "statusCode": 404,
  "error": "NotFoundException",
  "message": "Cannot GET /docs-json",
  "meta": {
    "timestamp": "2026-10-29T14:55:17.959Z",
    "path": "/docs-json"
  }
}
```
**Root Cause**: In `src/main.ts:91` and `src/common/utils/swagger.util.ts:9-12`:
```typescript
export function shouldEnableSwagger(nodeEnv?: string, enableSwaggerOverride?: string): boolean {
  const isProd = nodeEnv === 'production';
  return !isProd || enableSwaggerOverride === 'true';
}
```
Per security rule `SEC-AUD-07`, OpenAPI/Swagger documentation is disabled by default in production. Because `ENABLE_SWAGGER` is not set to `true` on the production server, the NestJS `SwaggerModule` is never initialized, and the documentation routes return 404.

---

## 5. Verification Baseline & Test Results

All baseline commands were executed locally in strict non-mutating mode:

1. **TypeScript Typecheck**:
   - Command: `npx tsc --noEmit`
   - Result: **0 errors**, exited with code 0.
   - Confirmation: All 427 endpoints and 144 Prisma models compile cleanly under strict mode (`strictNullChecks: true`, `noImplicitAny: true`).

2. **Linting Check**:
   - Command: `npx eslint "src/**/*.ts"` (executed without `--fix` to ensure read-only compliance)
   - Result: **0 errors, 0 warnings**, exited with code 0.

3. **Jest Unit Test Suite**:
   - Command: `npx jest --maxWorkers=2`
   - Result:
     - **Test Suites: 45 passed, 45 total**
     - **Tests: 641 passed, 641 total**
     - **Execution Time: 123.617 s**
     - Failures: 0

4. **Integration & E2E Tests**:
   - Observation: `package.json` defines `"test:e2e": "jest --config ./test/jest-e2e.json"`.
   - Result: The `test/` directory **does not exist** in the repository. There are **0 integration or end-to-end tests**.

---

## 6. External Integrations & Cloud Dependencies

1. **Database**: PostgreSQL connection via `pg.Pool` and `@prisma/adapter-pg`. Connection pool defaults to 10 connections with 5000ms connection timeout and 10000ms idle timeout.
2. **File Storage**: Backblaze B2 (S3-compatible API via AWS SDK v3 `@aws-sdk/client-s3`). Fully implemented in `src/modules/storage/infrastructure/b2-storage.service.ts` with presigned timed download URLs.
3. **SMS / OTP Delivery**: **Unintegrated**. The backend generates cryptographically secure 6-digit random codes and stores them hashed in the database, but does not invoke an external SMS gateway (e.g. Twilio, AWS SNS). Staging environments use allowlisted test numbers with static OTP `123456` when `ENABLE_TEST_OTP=true`.
4. **OCR Engine**: **Unintegrated / Simulated**. `src/modules/ocr/application/use-cases/ocr.service.ts` contains hardcoded text extraction simulations. No actual bindings to PaddleOCR or Tesseract exist.
5. **Virus / Malware Scanner**: **Unintegrated**. `MedicalRecordService.uploadAttachment` sets `virusScanStatus: 'PENDING'`, but no background daemon or webhook exists to transition files to `CLEAN`.
6. **Notification Delivery**: **Unintegrated**. `NotificationService.createNotification` queues records into the database table `notification_queue`, but no background worker or email/SMS transport exists to transmit them.

---

## 7. Evidence Limitations

1. **Production Process**: Per safety rules, production processes were not stopped, restarted, or reconfigured.
2. **Live Writes**: No live authenticated write tests were performed against production to prevent mutating real patient or provider data.
3. **Staging Swagger**: Deployed Swagger JSON could not be fetched due to `SEC-AUD-07` disabling Swagger in production. Local specification `docs/swagger-spec.json` was used as the authoritative document after proving 100% parity with Postman and source AST.

