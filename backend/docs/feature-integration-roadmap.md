# CareID — Feature Integration Roadmap and Architecture Plan

**Document Version:** 1.0.0  
**Planning Date:** October 26, 2026  
**Target Repository:** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Reference Baseline Snapshot:** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main - Copy`  
**Target Deployment Environment:** aaPanel Linux (PM2 Cluster + Nginx + PostgreSQL 15+)  
**Prerequisite Document:** [`docs/five-project-feature-comparison.md`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/docs/five-project-feature-comparison.md)

---

## 1. Strategic Integration Objectives & Constraints

This roadmap translates the discoveries from the five-project feature audit into an actionable, prioritized execution plan for the CareID NestJS backend. All recommendations adhere strictly to CareID's core architectural tenets:

1. **Preserve Database & Schema Stability:** Zero schema changes, migrations, or database alterations can be applied without explicit stakeholder approval.
2. **Preserve API Contract Compatibility:** Existing mobile (Flutter Patient/Doctor) and web (React Admin/Patient/Doctor) client applications must never be broken by backward-incompatible API changes.
3. **Strict Zero-Trust Clinical Data Isolation:** Patient privacy is non-negotiable. Direct cross-profile record access by physicians without patient consent remains prohibited.
4. **Zero Unapproved Infrastructure:** No Redis, Valkey, external queue workers, or paid cloud services can be mandated without formal infrastructure provisioning.
5. **No Direct Copy-Pasting of Foreign Code:** Reusable logic must be re-engineered to adhere to CareID's NestJS 11 modular architecture, TypeScript types, and Prisma conventions.

---

## 2. Priority 1 — Pre-Deployment Release Blockers

These items represent verified security vulnerabilities, authorization flaws, and data leakage risks identified in the pre-deployment security audit that **must be remediated and verified before deploying CareID to aaPanel**:

```
+----------------------------------------------------------------------------------------------------+
|                                PRIORITY 1: PRE-DEPLOYMENT BLOCKERS                                 |
+---------+--------------------+------------------------------------------+--------------------------+
| ID      | Severity           | Component / Target File                  | Action Required          |
+---------+--------------------+------------------------------------------+--------------------------+
| RB-01   | HIGH (BOLA/IDOR)   | NotificationController & Service         | Enforce caller ownership |
| RB-02   | HIGH (Role Bypass) | ObservabilityController                  | Apply RolesGuard & ADMIN |
| RB-03   | MEDIUM (Info Leak) | GlobalExceptionFilter                    | Sanitize error messages  |
| RB-04   | MEDIUM (Credential)| PinoLoggerModule (app.module.ts)         | Redact Auth & Cookie hdrs|
| RB-05   | MEDIUM (Data Safe) | ReportService.getDownloadToken           | Block PENDING/INFECTED dl|
+---------+--------------------+------------------------------------------+--------------------------+
```

### Detailed Remediation Steps

#### RB-01: Fix Broken Object Level Authorization (IDOR) on Notifications
- **Location:** [`src/modules/notifications/presentation/controllers/notification.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/presentation/controllers/notification.controller.ts#L47-L85) and [`src/modules/notifications/application/use-cases/notification.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/application/use-cases/notification.service.ts#L130-L169).
- **Remediation:**
  1. In `getNotifications`, enforce that non-administrative callers (`!isAdmin`) can only query their own notifications (`recipientUserId = req.user.userId`).
  2. In `getNotificationById`, `markAsRead`, and `softDeleteNotification`, verify that `notification.recipientUserId === callerUserId` or throw `ForbiddenException(403)`.
- **Test Requirement:** Add e2e test verifying that User B receives HTTP 403 when attempting to access User A's notification.

#### RB-02: Protect Observability Endpoints with `RolesGuard`
- **Location:** [`src/modules/observability/presentation/controllers/observability.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/observability/presentation/controllers/observability.controller.ts#L20-L216).
- **Remediation:**
  1. Apply `@UseGuards(AuthGuard('jwt'), RolesGuard)` and `@Roles(Role.ADMIN, Role.SUPER_ADMIN)` to all internal diagnostic routes (`/dashboard`, `/metrics`, `/logs`, `/traces`, `/jobs`, `/performance`, `/statistics`).
  2. Maintain `/health`, `/health/live`, and `/health/ready` as public endpoints for container and aaPanel health probes.
- **Test Requirement:** Add unit and controller test asserting that `PATIENT` and `DOCTOR` roles receive HTTP 403 on `/api/v1/observability/logs`.

#### RB-03: Sanitize Error Messages in `GlobalExceptionFilter`
- **Location:** [`src/common/filters/global-exception.filter.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/common/filters/global-exception.filter.ts#L34-L40).
- **Remediation:** In production (`process.env.NODE_ENV === 'production'`), mask raw Prisma database error strings and generic runtime error messages with a generic message (`'An unexpected error occurred. Please contact support.'`) while logging the full stack trace internally.
- **Test Requirement:** Test verifying that unhandled database exceptions do not expose table or column names to HTTP clients in production mode.

#### RB-04: Redact Sensitive HTTP Headers in Pino Access Logs
- **Location:** [`src/app.module.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/app.module.ts#L41-L46).
- **Remediation:** Configure `pinoHttp.redact` to strip `req.headers.authorization`, `req.headers.cookie`, `req.body.password`, and `req.body.otp`.
- **Test Requirement:** Verify that authenticated requests log `[Redacted]` in place of bearer tokens in log output.

#### RB-05: Block Downloads for Unscanned/Infected Attachments
- **Location:** [`src/modules/report/application/use-cases/report.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/report/application/use-cases/report.service.ts#L349-L367).
- **Remediation:** Check `attachment.virusScanStatus`: if status is `'PENDING'` or `'INFECTED'`, reject the download request with `BadRequestException(400)`.
- **Test Requirement:** Verify that calling `getDownloadToken` on an attachment with `virusScanStatus: 'PENDING'` throws HTTP 400.

---

## 3. Priority 2 — Safe Additions Compatible with Existing Schema

These features provide immediate clinical and operational value, require **zero Prisma schema migrations**, and do not break existing client contracts:

```
+----------------------------------------------------------------------------------------------------+
|                       PRIORITY 2: SAFE ADDITIONS (NO SCHEMA CHANGES REQUIRED)                      |
+---------+-----------------------------------+-----------------------------+------------------------+
| Feature | Description                       | Source Inspiration          | CareID Implementation  |
+---------+-----------------------------------+-----------------------------+------------------------+
| F-01    | WHO ICD-11 Terminology Search     | Project 4 (icd-11 monorepo) | New src/modules/icd11/ |
| F-02    | Attachment DTO Validation Defense | Security Audit SEC-AUD-08   | Class-validator update |
| F-03    | OpenAPI/Swagger Environment Gate  | Security Audit SEC-AUD-07   | main.ts toggle flag    |
+---------+-----------------------------------+-----------------------------+------------------------+
```

### 3.1 Feature F-01: WHO ICD-11 Diagnostic Terminology Service
- **Source Architecture:** Adapted from Project 4 (`icd-11-nextjs-nestjs-boilerplate-main/packages/backend/src/icd11/`).
- **CareID Current State:** `ClinicalDiagnosis` in `src/modules/medical-record/` stores free-text `code` and `description`.
- **Implementation Design:**
  1. Create `src/modules/icd11/` in CareID containing:
     - `icd11.module.ts` (imports `@nestjs/axios` and `@nestjs/cache-manager`).
     - `icd11.service.ts`: Handles WHO OAuth2 token caching, search, and hierarchy traversal.
     - `icd11.controller.ts`: Exposes authenticated search endpoints:
       - `POST /api/v1/icd11/search`: Flexisearch across ICD-11 MMS releases.
       - `GET /api/v1/icd11/entity/:id`: Direct entity code, title, and definition lookup.
       - `GET /api/v1/icd11/entity/:id/breadcrumbs`: Breadcrumb navigation for UI tree selectors.
  2. Configure in-memory caching (`CacheModule.register({ ttl: 3600, max: 1000 })`) to eliminate the need for Redis while respecting WHO API rate limits.
  3. Environment variables required: `WHO_CLIENT_ID`, `WHO_CLIENT_SECRET`, `WHO_API_BASE_URL` (optional, defaults to `https://id.who.int/icd/release/11/2024-01/mms`).
- **Value:** Equips doctors and clinical staff with instant search and autocomplete of global WHO-standardized diagnostic codes when authoring medical records, without touching the database schema.

### 3.2 Feature F-02: Attachment DTO Input Validation Hardening
- **Implementation:**
  - Update `CreateAttachmentDto` and `UploadReportDto` to enforce:
    - `@Max(15728640)` (15MB file size ceiling).
    - `@IsIn(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])` (MIME whitelist).
    - `@IsUrl({ require_tld: true, require_protocol: true })` on `storageUrl`.
- **Value:** Prevents storing malicious executable MIME types, oversized payloads, or arbitrary URLs.

### 3.3 Feature F-03: Environment-Gated OpenAPI/Swagger UI
- **Implementation:** In `src/main.ts`, mount Swagger only when `process.env.ENABLE_SWAGGER === 'true'` or when `NODE_ENV !== 'production'`.
- **Value:** Prevents unauthenticated external discovery of internal API surfaces in production.

---

## 4. Priority 3 — Approved API Extensions (Existing Schema)

These features extend CareID's clinical and operational capabilities using models and tables that **already exist** in `prisma/schema.prisma`:

```
+----------------------------------------------------------------------------------------------------+
|                         PRIORITY 3: APPROVED API EXTENSIONS (EXISTING SCHEMA)                      |
+---------+-----------------------------------+-----------------------------+------------------------+
| Feature | Description                       | Source Inspiration          | CareID Target Models   |
+---------+-----------------------------------+-----------------------------+------------------------+
| F-04    | Doctor Schedule Availability API  | Project 1 & Project 3       | DoctorScheduleSlot,    |
|         |                                   |                             | GeneratedSlot, Shift   |
| F-05    | Facility Room Occupancy Status    | Project 2 (Ward Management) | FacilityRoom           |
| F-06    | Patient Vitals Trend Query        | Project 1 & Project 2       | VitalSigns (MedicalRec)|
+---------+-----------------------------------+-----------------------------+------------------------+
```

### 4.1 Feature F-04: Doctor Schedule Availability Queries
- **Context:** While appointment booking is blocked, CareID's Prisma schema already contains full models for `DoctorScheduleSlot`, `GeneratedSlot`, `ShiftAssignment`, and `HolidayCalendar` in `src/modules/schedule/`.
- **Implementation:** Implement read-only controller endpoints in `ScheduleController`:
  - `GET /api/v1/schedules/doctors/:doctorId/available-slots?date=YYYY-MM-DD`: Queries pre-generated slots with `status: 'AVAILABLE'`.
- **Value:** Enables patient and doctor client apps to display doctor consultation hours and available clinical slots without modifying the database schema.

### 4.2 Feature F-05: Facility Room Occupancy Status
- **Context:** CareID contains `FacilityRoom` in `src/modules/facility/` with `roomNumber`, `roomType`, `capacity`, and `status`.
- **Implementation:** Add `GET /api/v1/facilities/:facilityId/rooms/occupancy` to aggregate room availability and capacity for facility administrators.

---

## 5. Priority 4 — Schema-Dependent & Clinically Sensitive Features

These capabilities provide substantial healthcare value but **require formal design review, stakeholder approval, Prisma schema migrations, and clinical governance sign-off**:

```
+----------------------------------------------------------------------------------------------------+
|                        PRIORITY 4: SCHEMA-DEPENDENT & CLINICALLY SENSITIVE                         |
+---------+-----------------------------------+-----------------------------+------------------------+
| Feature | Capability                        | Source Architecture         | Required Approvals     |
+---------+-----------------------------------+-----------------------------+------------------------+
| F-07    | Full Appointment Booking Engine   | Project 3 (hms_backend) &   | PO + DB Architect      |
|         |                                   | Project 2 (HMS-React)       | (Prisma Migration)     |
| F-08    | Patient Consent Token Flow (RFC)  | Documented in blocked RFC   | Clinical Governance +  |
|         |                                   | (blocked-features.md)       | Security Lead          |
| F-09    | Structured Digital Prescriptions  | Project 5 (medical-system)  | Clinical Director +    |
|         |                                   |                             | DB Architect           |
| F-10    | Out-of-Pocket Patient Invoicing   | Project 2 (HMS-React)       | Finance / Billing Lead |
+---------+-----------------------------------+-----------------------------+------------------------+
```

### 5.1 Feature F-07: Appointment Booking Engine
- **Prerequisite:** Approval to apply an offline schema migration adding:
  ```prisma
  model Appointment {
    id              String            @id @default(uuid())
    patientProfileId String           @map("patient_profile_id")
    doctorProfileId String            @map("doctor_profile_id")
    facilityId      String?           @map("facility_id")
    scheduledDate   DateTime          @map("scheduled_date")
    startTime       String            @map("start_time")
    endTime         String            @map("end_time")
    status          AppointmentStatus @default(SCHEDULED)
    type            AppointmentType   @default(IN_PERSON)
    reason          String?
    notes           String?
    cancellationReason String?        @map("cancellation_reason")
    createdAt       DateTime          @default(now()) @map("created_at")
    updatedAt       DateTime          @updatedAt @map("updated_at")

    patientProfile  PatientProfile    @relation(fields: [patientProfileId], references: [id])
    doctorProfile   DoctorProfile     @relation(fields: [doctorProfileId], references: [id])

    @@index([doctorProfileId, scheduledDate])
    @@index([patientProfileId, scheduledDate])
    @@map("appointments")
  }
  ```
- **Algorithms to Adopt from Project 3 (`hms_backend`):**
  1. Transactional double-booking prevention (`findFirst` with date/time check inside Prisma transaction).
  2. Next-available-date calculation for same-weekday rescheduling (`getNextAvailableDateForAppointment`).
  3. Bulk postponement with automatic notification queuing during physician emergency leave.
  4. Detection of unresolved past appointments (`getUnresolvedPastAppointments`).

### 5.2 Feature F-08: Cryptographic Patient-Consent Token Flow
- **Prerequisite:** Clinical Governance sign-off on the RFC documented in `docs/blocked-features-and-approvals.md`.
- **Workflow:**
  1. Patient selects a doctor and grants temporary clinical access (15–30 minutes) from the Patient App.
  2. Backend issues a signed, time-limited JWT consent token containing `patientProfileId` and `doctorProfileId`.
  3. Doctor App presents the token in the `X-Consent-Token` header when requesting patient records.
  4. Backend verifies token signature, non-expiry, and caller identity before returning medical records, maintaining complete privacy while enabling emergency care.

### 5.3 Feature F-09: Structured Digital Prescriptions
- **Prerequisite:** Approval to add `Prescription` and `PrescriptionItem` models.
- **Workflow:** Doctors generate structured prescriptions (`RX-YYYYMMDD-XXXXXX`) with medication name, strength, dosage form, frequency, duration, and clinical instructions.

---

## 6. Priority 5 — Defer or Reject

The following discovered components must be **explicitly rejected** from integration:

1. **Unauthenticated CRUD Endpoints (from Project 1):**  
   *Reason:* Complete lack of authentication and authorization violates healthcare data compliance standards (HIPAA/GDPR).
2. **Microsoft SQL Server Dialect & DDL (from Project 2):**  
   *Reason:* CareID runs on PostgreSQL 15+. SQL Server-specific syntax (`DATETIME2`, `NVARCHAR`, `BEGIN TRAN / BEGIN CATCH`) is incompatible.
3. **MongoDB / Mongoose Schemas (from Project 5):**  
   *Reason:* NoSQL document structures and Mongoose `ObjectId` cannot be joined to CareID's relational PostgreSQL models.
4. **Redis-Based Token Blacklisting (from Project 5):**  
   *Reason:* Redundant and violates zero-Redis constraint. CareID's existing PostgreSQL-backed refresh token rotation with `revokedAt` timestamp is persistent and superior.
5. **Direct Pharmacy Inventory / Stocking (from Project 2):**  
   *Reason:* CareID is a patient health record and clinical identity platform, not a physical retail pharmacy point-of-sale system.

---

## 7. Proposed Phased Implementation Order

```
+----------------------------------------------------------------------------------------------------+
|                                    PHASED IMPLEMENTATION TIMELINE                                  |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [PHASE 1: RELEASE BLOCKERS]  ---> [PHASE 2: SAFE EXTENSIONS]  ---> [PHASE 3: GOVERNED FEATURES]   |
|  • RB-01: Notification IDOR        • F-01: WHO ICD-11 Module        • F-07: Appointment Migration  |
|  • RB-02: Observability Roles      • F-02: DTO Input Hardening      • F-08: Consent Token Flow     |
|  • RB-03: Error Filter Masking     • F-03: Swagger Env Gating       • F-09: Digital Prescriptions  |
|  • RB-04: Pino Header Redaction    • F-04: Schedule Queries         • F-10: Patient Invoicing      |
|  • RB-05: Download Token Fix       • Full 327+ Test Suite Green     • Multi-Tenant Governance      |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

### Phase 1: Pre-Deployment Security Remediation (Immediate)
- Fix all 5 release-blocker findings (RB-01 through RB-05) in source code.
- Execute unit and regression test suite (`npm test`) — verify 327+ tests pass.
- Verify production build succeeds (`npm run build`).

### Phase 2: High-Value Safe Additions (Post-Release Sprint 1)
- Scaffold `src/modules/icd11/` in CareID using `@nestjs/axios` and in-memory `@nestjs/cache-manager`.
- Implement WHO OAuth2 client and flexisearch endpoints.
- Integrate ICD-11 search into the Doctor React and Mobile portals.
- Gate Swagger UI behind `ENABLE_SWAGGER` environment flag.

### Phase 3: Governed Schema & Clinical Evolution (Future Release)
- Submit Prisma schema RFC for `Appointment` and `Prescription` models to the Database Architect.
- Review and approve the Patient Consent Token workflow with Clinical Governance.
- Author offline SQL migration files in `prisma/migrations_offline/`.
- Implement appointment booking services adopting the rescheduling algorithms from Project 3.

---

## 8. Testing & Quality Assurance Requirements

Every proposed integration must meet rigorous testing criteria before merge:

1. **Unit Test Coverage:** Every new service method must have dedicated unit tests with mock repositories (e.g. `icd11.service.spec.ts`).
2. **Authorization & Boundary Tests:** Explicit tests asserting HTTP 403 Forbidden when unauthorized callers attempt to access protected endpoints.
3. **Regression Safety:** The existing 29 test suites (327 tests) must remain 100% green without modification to existing tests.
4. **Offline Migration Validation:** When schema migrations are approved, SQL scripts must be tested against isolated development PostgreSQL containers before staging execution.

---

## 9. Deployment, Infrastructure & Licensing Implications

1. **aaPanel Deployment Architecture:**
   - Single-node or multi-worker PM2 execution (`hvapi-backend`).
   - Nginx reverse proxy handling SSL termination and perimeter rate limiting on `/api/v1/auth/*`.
   - NestJS loopback binding to `127.0.0.1:3073` preventing bypass of Nginx.
2. **External Licensing Requirements:**
   - **WHO ICD-11 API:** Requires signing up for a free developer account at the WHO ICD-11 Maintenance and Tooling Portal (`https://icd.who.int/icdapi`). Commercial deployment must adhere to WHO terms of use, including displaying proper copyright and attribution notices in clinical UI screens.
3. **Infrastructure Cost:**
   - Phase 1 and Phase 2 require **zero additional infrastructure cost** (no Redis, no paid APIs, no additional cloud databases).

---

## 10. Recommended Immediate Next Task

The recommended first implementation task is:

**Task 1: Remediate the Two High-Risk Authorization Findings (RB-01 and RB-02)**
1. Implement ownership verification in [`NotificationController`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/presentation/controllers/notification.controller.ts) to resolve BOLA/IDOR (RB-01).
2. Add `@UseGuards(AuthGuard('jwt'), RolesGuard)` and `@Roles(Role.ADMIN, Role.SUPER_ADMIN)` to [`ObservabilityController`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/observability/presentation/controllers/observability.controller.ts) to protect internal system telemetry (RB-02).
3. Validate fixes with dedicated unit tests and confirm `npm test` passes cleanly.

This directly unblocks the deployment pipeline while maintaining 100% compatibility with existing client applications and database schemas.
