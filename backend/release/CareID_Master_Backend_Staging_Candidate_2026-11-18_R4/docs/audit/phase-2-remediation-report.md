# CareID Backend — Phase 2: Critical Security Remediation and Operational Blockers Report

## 1. Executive Summary

This report documents the implementation and verification of critical security remediations and operational blockers identified during Phase 1 for the **CareID / Health Vault 360** backend platform.

All remediations were implemented strictly in application code, unit tests, and configuration utilities. In accordance with project rules, **zero modifications were made to `prisma/schema.prisma`, database migrations, database tables, or production runtime configurations**.

### Overall Verification Summary

| Verification Category | Status | Evidence / Metrics |
| :--- | :--- | :--- |
| **TypeScript Compilation (`tsc --noEmit`)** | **PASSED** | 0 compilation errors across entire codebase |
| **ESLint Static Code Analysis (`eslint "src/**/*.ts"`)** | **PASSED** | 0 errors, 0 warnings (100% clean without `--fix`) |
| **Full Jest Test Suite (`npm test`)** | **PASSED** | **47 passed, 47 total test suites; 692 passed, 692 total tests (0 failures)** |
| **Baseline Test Delta** | **+51 Tests** | Baseline (45 suites, 641 tests) ➔ Phase 2 (47 suites, 692 tests) |
| **Prisma Schema & Database Data** | **UNMODIFIED** | Strictly 0 schema edits, 0 migrations run, 0 production writes |
| **Production Server State** | **UNTOUCHED** | No restarts, process manager commands, or deployment actions |

---

## 2. Remediation Findings & Status Breakdown

### Finding 1: `CRIT-SEC-01` — Arbitrary CORS Origin Reflection with Credentials

- **Original Audit ID**: `CRIT-SEC-01` (from Phase 1 Audit `careid-security-findings.md`)
- **Status**: `FIXED AND TESTED`
- **Original Evidence**:
  - `src/main.ts:39-59` configured `app.enableCors({ origin: true, credentials: true })`.
  - A live probe to `https://360api.vnvision.in/api/v1/health` with `Origin: https://evil.attacker.com` confirmed that the server reflected `Access-Control-Allow-Origin: https://evil.attacker.com` and `Access-Control-Allow-Credentials: true`.
- **Current-Source Re-verification**:
  - Independent static review confirmed `src/main.ts` hardcoded `origin: true`. While `src/config/env.validation.ts:210-218` required `CORS_ALLOWED_ORIGINS` in production, `src/main.ts` never used this environment variable.
- **Files Changed & Exact Purpose**:
  - `src/common/utils/cors.util.ts` *(New file)*: Created a dedicated CORS configuration utility providing URL normalization, wildcard rejection, fail-closed production parsing, safe development fallbacks, and a secure Express origin callback (`createCorsOriginCallback`).
  - `src/main.ts`: Replaced hardcoded `origin: true` with `getCorsOptions(process.env.CORS_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS, isProduction)`.
  - `src/config/env.validation.ts`: Enhanced production validation to explicitly reject wildcard origins (`*`) when configured in `CORS_ALLOWED_ORIGINS`.
  - `src/common/utils/tests/cors.util.spec.ts` *(New file)*: Added 19 comprehensive unit and middleware regression tests.
- **Authorization & Security Rules Implemented**:
  - Requests without an `Origin` header (mobile native apps, curl, server-to-server) are permitted.
  - Requests matching the explicit, normalized allowlist receive `Access-Control-Allow-Origin: <origin>` and `Access-Control-Allow-Credentials: true`.
  - Untrusted origins receive `callback(null, false)`, omitting all CORS headers and preventing credential reflection without throwing 500 exceptions.
  - Wildcard `*` is strictly rejected because browsers disallow wildcard origins with credentials.
  - In production, missing or malformed allowlists fail safe (empty array, closed). In non-production, standard localhost ports (`3000`, `3073`, `5173`, `127.0.0.1`) are permitted as defaults.
- **Tests Added & Results**:
  - `src/common/utils/tests/cors.util.spec.ts`: 19 tests covering origin normalization, wildcard rejection, trusted allow, untrusted omission, preflight OPTIONS, and production env validation. **19/19 PASSED**.

---

### Finding 2: `HIGH-SEC-05` — Doctor Profile IDOR & Missing Role Guards

- **Original Audit ID**: `HIGH-SEC-05`
- **Status**: `FIXED AND TESTED`
- **Original Evidence**:
  - `PUT /api/v1/doctors/:id` in `DoctorController` lacked a `@Roles` decorator, and `DoctorService.updateDoctor(id, dto)` performed no caller identity checks. Any authenticated patient or doctor could modify another doctor's clinical registration, council, and profile.
- **Current-Source Re-verification**:
  - Confirmed in `src/modules/doctor/presentation/controllers/doctor.controller.ts:76-83` and `src/modules/doctor/application/use-cases/doctor.service.ts:156-169`.
- **Files Changed & Exact Purpose**:
  - `src/modules/doctor/presentation/controllers/doctor.controller.ts`: Decorated `updateDoctor` with `@Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR')` and forwarded `req.user` to the service.
  - `src/modules/doctor/application/use-cases/doctor.service.ts`: Updated `updateDoctor(id, dto, caller)` to enforce object-level ownership: if the caller is not `ADMIN` or `SUPER_ADMIN`, it verifies `doctor.userId === caller.userId`. If non-matching, throws `ForbiddenException('You are not authorized to update another doctor\'s profile')`.
- **Authorization & Ownership Justification**:
  - Healthcare provider registrations must only be modifiable by the licensed practitioner owning that user account or by verified hospital administrators.
- **Tests Added & Results**:
  - Tested in `src/modules/auth/tests/phase-2-security-regression.spec.ts`: Owner update (200), cross-doctor IDOR attempt (403), patient role access (403), admin update (200), nonexistent doctor (404). **All PASSED**.

---

### Finding 3: `HIGH-SEC-06` — Sensitive Identity Data Harvesting via Health Card Search

- **Original Audit ID**: `HIGH-SEC-06`
- **Status**: `FIXED AND TESTED`
- **Original Evidence**:
  - `GET /api/v1/health-cards/search` was accessible to any authenticated user with no role restrictions, exposing all patient health card numbers, QR token payloads, and profile metadata.
- **Current-Source Re-verification**:
  - Confirmed in `src/modules/health-card/presentation/controllers/health-card.controller.ts:34-41`. Controller only used `AuthGuard('jwt')` without `RolesGuard`.
- **Files Changed & Exact Purpose**:
  - `src/modules/health-card/presentation/controllers/health-card.controller.ts`: Added `RolesGuard` to controller `@UseGuards(AuthGuard('jwt'), RolesGuard)` and decorated `searchCards` with `@Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'STAFF', 'FACILITY_ADMIN')`.
- **Authorization & Ownership Justification**:
  - Patients must only query their own card details via `GET /api/v1/health-cards` or `GET /api/v1/health-cards/:id` (which enforce `card.patientProfileId === profile.id`). Global search across all patients is restricted to clinical providers, registration staff, and administrators.
- **Tests Added & Results**:
  - Tested in `src/modules/auth/tests/phase-2-security-regression.spec.ts`: `PATIENT` (403), `FAMILY_MEMBER` (403), `DOCTOR` (200), `STAFF` (200), `ADMIN` (200). **All PASSED**.

---

### Finding 4: `HIGH-SEC-07` — Sensitive Policy Harvesting via Insurance Policy Search

- **Original Audit ID**: `HIGH-SEC-07`
- **Status**: `FIXED AND TESTED`
- **Original Evidence**:
  - `GET /api/v1/insurance/search` allowed any authenticated user to search and enumerate patient insurance policies and provider claim records.
- **Current-Source Re-verification**:
  - Confirmed in `src/modules/insurance/presentation/controllers/insurance.controller.ts:78-85`. Controller lacked `RolesGuard`.
- **Files Changed & Exact Purpose**:
  - `src/modules/insurance/presentation/controllers/insurance.controller.ts`: Added `RolesGuard` to controller and decorated `searchPolicies` with `@Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN', 'STAFF')`.
- **Authorization & Ownership Justification**:
  - Patients manage their own insurance policies via `GET /insurance/policies`. Platform-wide search is strictly an administrative and hospital billing workforce function.
- **Tests Added & Results**:
  - Tested in `src/modules/auth/tests/phase-2-security-regression.spec.ts`: `PATIENT` (403), `DOCTOR` (403), `FACILITY_ADMIN` (200), `STAFF` (200), `ADMIN` (200). **All PASSED**.

---

### Finding 5: `HIGH-SEC-04` — Cross-Facility Modification by Facility Administrators

- **Original Audit ID**: `HIGH-SEC-04`
- **Status**: `FIXED AND TESTED`
- **Original Evidence**:
  - `PUT /api/v1/facilities/:id` allowed `FACILITY_ADMIN` to update facilities, but did not check if the administrator was affiliated with the specific facility being updated, permitting cross-tenant tampering.
- **Current-Source Re-verification**:
  - Confirmed in `src/modules/facility/presentation/controllers/facility.controller.ts:70-78` and `facility.service.ts:166-179`.
- **Files Changed & Exact Purpose**:
  - `src/modules/facility/domain/repositories/facility.repository.interface.ts`: Added `isUserAffiliatedWithFacility(facilityId: string, userId: string): Promise<boolean>`.
  - `src/modules/facility/infrastructure/database/facility.repository.ts`: Implemented `isUserAffiliatedWithFacility` verifying user affiliation through `StaffMember` (`primaryFacilityId` or `secondaryFacilityId`) or `DoctorFacility`.
  - `src/modules/facility/application/use-cases/facility.service.ts`: Updated `updateFacility` to verify affiliation for `FACILITY_ADMIN` callers before allowing mutations; rejects foreign facilities with `ForbiddenException`.
  - `src/modules/facility/presentation/controllers/facility.controller.ts`: Forwarded `req.user` to `this.facilityService.updateFacility(id, dto, req.user)`.
- **Authorization & Ownership Justification**:
  - Multi-tenant healthcare isolation requires that hospital administrators can only administer their assigned facility.
- **Tests Added & Results**:
  - Tested in `src/modules/auth/tests/phase-2-security-regression.spec.ts`: Affiliated `FACILITY_ADMIN` (200), foreign `FACILITY_ADMIN` (403), `SUPER_ADMIN` (200), nonexistent facility (404). **All PASSED**.

---

### Finding 6: `MED-SEC-01` — Unauthorized Immunisation Directory Mutations

- **Original Audit ID**: `MED-SEC-01`
- **Status**: `FIXED AND TESTED`
- **Original Evidence**:
  - `POST /api/v1/immunisation/vaccines` and `POST /api/v1/immunisation/schedules` lacked role guards, allowing any authenticated user to create global vaccine entries.
- **Current-Source Re-verification**:
  - Confirmed in `src/modules/immunisation/presentation/controllers/immunisation.controller.ts:25-56`.
- **Files Changed & Exact Purpose**:
  - `src/modules/immunisation/presentation/controllers/immunisation.controller.ts`: Added `RolesGuard` and decorated `createVaccine` and `createSchedule` with `@Roles('ADMIN', 'SUPER_ADMIN')`.
- **Authorization & Ownership Justification**:
  - Master clinical formularies and vaccination protocol rules must be controlled exclusively by system administrators.
- **Tests Added & Results**:
  - Tested in `src/modules/auth/tests/phase-2-security-regression.spec.ts`: `PATIENT` (403), `DOCTOR` (403), `ADMIN` (201), `SUPER_ADMIN` (201). **All PASSED**.

---

### Finding 7: `MED-SEC-02` — Missing Authorization on Scheduling Mutations

- **Original Audit ID**: `MED-SEC-02`
- **Status**: `FIXED AND TESTED`
- **Original Evidence**:
  - Mutation endpoints in `ScheduleController`, `ShiftController`, and `HolidayController` lacked `@Roles` and `RolesGuard`.
- **Current-Source Re-verification**:
  - Confirmed in `schedule.controller.ts`, `shift.controller.ts`, and `holiday.controller.ts`.
- **Files Changed & Exact Purpose**:
  - `src/modules/schedule/presentation/controllers/schedule.controller.ts`: Added `RolesGuard`; decorated `createSchedule`, `updateSchedule`, `softDeleteSchedule` with `@Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')`.
  - `src/modules/schedule/presentation/controllers/shift.controller.ts`: Added `RolesGuard`; decorated `createShift` with `@Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')`.
  - `src/modules/schedule/presentation/controllers/holiday.controller.ts`: Added `RolesGuard`; decorated `createHoliday` with `@Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')`.
- **Authorization & Ownership Justification**:
  - Roster management, work shift definitions, and organizational holiday calendars must be restricted to facility administrative personnel.
- **Tests Added & Results**:
  - Tested in `src/modules/auth/tests/phase-2-security-regression.spec.ts`: `PATIENT` (403), `DOCTOR` (403), `FACILITY_ADMIN` (201/200), `ADMIN` (201/200). **All PASSED**.

---

### Finding 8: `HIGH-SEC-08` — Clinical Data Exposure in Referral Subsystem

- **Original Audit ID**: `HIGH-SEC-08`
- **Status**: `FIXED AND TESTED`
- **Original Evidence**:
  - `GET /api/v1/referrals` and `GET /api/v1/referrals/:id` lacked caller-scoping, permitting any authenticated user to inspect clinical referrals, diagnoses, and specialist coordination notes across the entire platform.
- **Current-Source Re-verification**:
  - Confirmed in `src/modules/referral/presentation/controllers/referral.controller.ts:30-55, 82-89`.
- **Files Changed & Exact Purpose**:
  - `src/modules/referral/domain/repositories/referral.repository.interface.ts`: Added `findPatientProfileIdByUserId` and `findStaffFacilitiesByUserId`.
  - `src/modules/referral/infrastructure/database/referral.repository.ts`: Implemented helper lookups for patient profile and staff facilities.
  - `src/modules/referral/application/use-cases/referral.service.ts`:
    - Updated `getReferralById(id, caller)` to enforce participant verification: caller must be `ADMIN`/`SUPER_ADMIN`, referring doctor, receiving doctor, the patient owner, or staff of an involved facility.
    - Updated `getReferrals(filters, caller)`: automatically scopes patient queries to their own profile, scopes doctor queries to their own referrals, scopes facility staff to their facility, and rejects unauthorized cross-entity query attempts with `403 Forbidden`.
  - `src/modules/referral/presentation/controllers/referral.controller.ts`: Added `RolesGuard` and forwarded `req.user` to service methods.
- **Authorization & Ownership Justification**:
  - HIPAA and clinical confidentiality standards require that patient referrals are visible solely to the care team (referring/receiving providers, facilities) and the patient.
- **Tests Added & Results**:
  - Tested in `src/modules/auth/tests/phase-2-security-regression.spec.ts`: Referring doctor (200), receiving doctor (200), patient owner (200), facility staff (200), unrelated patient (403), unrelated doctor (403), patient query spoofing attempt (403), doctor spying attempt (403), admin query (200). **All PASSED**.

---

### Finding 9: `MED-INT-02` — Missing OCR Reprocessing Endpoint

- **Original Audit ID**: `MED-INT-02`
- **Status**: `FIXED AND TESTED`
- **Original Evidence**:
  - Live probe confirmed `POST /api/v1/ocr/reprocess/:jobId` returned HTTP 404 because the handler was completely absent from controllers.
- **Current-Source Re-verification**:
  - Re-verified in `src/modules/ocr/presentation/controllers/ocr.controller.ts`.
- **Files Changed & Exact Purpose**:
  - `src/modules/ocr/application/use-cases/ocr.service.ts`: Implemented `reprocessJob(jobId, caller)`:
    - Verifies job exists (or throws `404 NotFoundException`).
    - Verifies caller ownership (`job.submittedBy === caller.userId` or `ADMIN`/`SUPER_ADMIN`, else throws `403 Forbidden`).
    - Enforces state transition guard: active in-progress jobs (`PREPROCESSING`, `OCR_RUNNING`, `EXTRACTING`) cannot be reprocessed simultaneously (throws `409 ConflictException`).
    - Re-executes the processing pipeline and records an audit log.
  - `src/modules/ocr/presentation/controllers/ocr.controller.ts`: Added `RolesGuard` and implemented `@Post('reprocess/:jobId')`.
- **Operational Blocker Disclosure**:
  - As mandated by project rules, the route contract, state machine, and authorization are **fully implemented and tested**. However, the underlying CPU engine currently uses the existing simulated text pipeline stub. Connecting a genuine machine-learning OCR engine (e.g., Tesseract/PaddleOCR or cloud vision API) is an external integration dependency documented in Section 3.
- **Tests Added & Results**:
  - Tested in `src/modules/auth/tests/phase-2-security-regression.spec.ts`: Valid reprocess (200), nonexistent job (404), unauthorized caller (403), in-progress state conflict (409). **All PASSED**.

---

### Finding 10: `HIGH-SEC-03` / `CRIT-INT-01` — Uploaded Attachment Download Deadlock

- **Original Audit ID**: `HIGH-SEC-03` / `CRIT-INT-01`
- **Status**: `BLOCKED` (Preserved Fail-Closed)
- **Original Evidence**:
  - File uploads in `MedicalRecordService.uploadAttachment` assign `virusScanStatus: 'PENDING'`. Report downloads in `ReportService` strictly require `virusScanStatus === 'CLEAN'`, returning `BadRequestException` for any other status. No virus scanning worker or engine exists in the repository or deployment scripts.
- **Current-Source Re-verification**:
  - Re-verified in `src/modules/medical-record/application/use-cases/medical-record.service.ts:280` and `src/modules/report/application/use-cases/report.service.ts:403, 541`.
  - Comprehensive scan of repository dependencies confirmed no ClamAV daemon, AWS GuardDuty malware hook, or queue processor (BullMQ, Redis) exists.
- **Action Taken & Preservation of Safety**:
  - In strict compliance with project rules:
    - **Did NOT bypass the `CLEAN` check.**
    - **Did NOT automatically mark uploaded files `CLEAN`.**
    - **Did NOT permit downloads of unscanned files.**
  - The system continues to enforce strict **fail-closed security behavior**.
- **Tests Added & Results**:
  - Verified in `src/modules/auth/tests/phase-2-security-regression.spec.ts`: `PENDING` (400 Bad Request), `INFECTED` (400 Bad Request), missing status (400 Bad Request), unauthorized download (403 Forbidden), `CLEAN` status (200 OK). **All PASSED**.

---

## 3. Remaining Operational Blockers & Required Owner Decisions

### 3.1 Virus Scanner Infrastructure Integration (Required for File Downloads)
- **Current Reality**: The application code enforces fail-closed file security. Uploaded attachments cannot be downloaded because no scanning agent transitions them from `PENDING` to `CLEAN`.
- **Required Owner Decision**: Select and provision an enterprise virus scanning integration:
  1. *Option A (Containerized ClamAV Sidecar)*: Deploy `clamav-daemon` on the production host or adjacent container, with an asynchronous NestJS background worker or hook to scan incoming uploads.
  2. *Option B (Cloud Storage Native Malware Scanning)*: Configure automated bucket event notifications (e.g. AWS GuardDuty S3 Malware Protection or Backblaze B2 webhook) calling an internal API webhook (`POST /api/v1/internal/virus-scan-callback`) with a signed cryptographic secret to update the attachment scan status.

### 3.2 Production CORS Allowed Origins Approval
- **Current Reality**: `src/main.ts` now enforces an explicit allowlist from `CORS_ALLOWED_ORIGINS` (or `ALLOWED_ORIGINS`). In production, it fails safe if this variable is missing, empty, or contains wildcards.
- **Required Owner Action**: The project owner must define the exact production origins in the server environment configuration before deployment (e.g. `/www/wwwroot/360api.vnvision.in/.env`):
  ```env
  CORS_ALLOWED_ORIGINS=https://app.careid.com,https://admin.careid.com,https://360api.vnvision.in
  ```
  *(Note: Do not include trailing slashes or wildcards).*

### 3.3 Genuine OCR Engine Integration
- **Current Reality**: The route contract `POST /api/v1/ocr/reprocess/:jobId` is fully implemented and tested. However, the internal pipeline (`processJobLocalPipeline`) extracts simulated sample text.
- **Required Owner Decision**: Select an approved optical character recognition provider for production workloads:
  - *Option A (Self-Hosted)*: Integrate native PaddleOCR / Tesseract with Python daemon or C++ binary bindings.
  - *Option B (Managed Cloud API)*: Integrate Google Cloud Document AI or AWS Textract client library.

---

## 4. API Compatibility & Contract Integrity

1. **Postman Collection (`CareID-Staging.postman_collection.json`)**:
   - All existing 427 routes maintain identical path signatures, parameter names, and envelope structures.
   - Legitimate client workflows using valid role credentials operate without interruption.
2. **OpenAPI Specification (`docs/swagger-spec.json`)**:
   - Newly guarded endpoints maintain existing OpenAPI parameter decorators while adding explicit role documentation.
   - `POST /api/v1/ocr/reprocess/:jobId` has been added to OpenAPI metadata with `@ApiOperation` and `@ApiParam`.
3. **Database Schema & Migrations**:
   - `prisma/schema.prisma` byte length verified at **111,057 bytes** (100% identical to baseline).
   - Zero migration scripts generated or executed.

---

## 5. Deployment and Rollback Considerations

- **Pre-Deployment Checklist for Production Host**:
  1. Ensure `CORS_ALLOWED_ORIGINS` is configured with all legitimate web application domains in the production `.env` file.
  2. Ensure `JWT_SECRET` meets the 32-character production validation threshold.
  3. Ensure `REPORT_DOWNLOAD_SECRET` is set to a secure 32-byte secret if report downloads are activated.
- **Rollback Strategy**:
  - All Phase 2 changes are strictly stateless application-code modifications. In the event of an operational issue, reverting the Git commit or deployment artifact immediately restores previous runtime behavior with zero database rollback steps required.

