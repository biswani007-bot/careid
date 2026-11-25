# CareID Database Integrity, Concurrency & Performance Findings

**Audit Phase:** Phase 1 Read-Only System Audit  
**Target:** Prisma 7.9.1 / PostgreSQL Schema & Repositories  
**Verification Method:** AST Codebase Inspection, Static Query Analysis & Prisma Model Audit  

---

## 1. Executive Summary

A comprehensive static analysis of the data persistence layer across all 24 database repositories reveals significant architectural and transactional risks:
1. **Zero Database Transactions**: Not a single repository or service in the application utilizes Prisma's `$transaction` API (`0` occurrences across the entire codebase). Multi-table mutations are executed as separate, non-atomic queries.
2. **101 Unbounded Queries**: At least 101 `findMany` database queries lack `take` / `skip` pagination limits, exposing the Node.js event loop to memory exhaustion and denial-of-service under standard production data growth.
3. **8 Confirmed N+1 Query Patterns**: Multiple business services execute database queries inside iterative loops (`for`, `forEach`) rather than utilizing bulk operations or relational includes.
4. **Missing Domain Schema (Appointments)**: The `Appointment` domain is completely absent from the Prisma schema (0 models, 0 relations). Implementation of appointment booking is strictly blocked by Phase 1 schema immutability constraints.
5. **OCR Correction Field Loss**: The `OCRVerification` model contains only `reviewStatus` and `reviewNotes`. Corrected values cannot be stored without either updating `ExtractedField.fieldValue` in place (destroying the original OCR output) or adding schema tables.

---

## 2. Critical Transaction & Concurrency Deficiencies

### 2.1. Absolute Absence of Database Transactions (`$transaction`)
- **Finding**: Across all 24 repositories in `src/modules/*/infrastructure/database/*.repository.ts`, there are **zero** calls to `this.db.$transaction()`.
- **Affected Workflows**:
  1. **User Logout-All / Token Invalidation**: `invalidateAllSessions` and `revokeAllUserTokens` in `AuthRepository` are executed sequentially. If the server terminates midway, tokens remain valid while sessions are killed, or vice versa.
  2. **Token Rotation Atomic Swap**: In `AuthService.refreshToken`, `revokeRefreshTokenIfActive` is executed first, followed by `createRefreshToken` in a separate call. If the process crashes between these calls, the client is locked out without receiving the replacement refresh token.
  3. **Health Card Replacement**: In `HealthCardService.replaceCard`, the service updates the existing card record to `REPLACED`, creates a new card record, generates a new QR record, and writes an audit log—all as independent, non-transactional database statements.
  4. **Referral Creation**: In `ReferralService.createReferral`, referral insertion, initial notes, and status audit logs are written in separate round-trips.
- **Impact**: High probability of database inconsistency, orphaned foreign key states, and lost audit trails following transient connection drops or server restarts.
- **Remediation**: Wrap all multi-step mutation workflows in `this.db.$transaction(async (tx) => { ... })`.

### 2.2. In-Memory Race Conditions on Refresh Token Rotation
- **Finding**: `AuthService.recentRotations` uses a local in-memory JavaScript `Map` with a 10-second concurrency window to absorb legitimate parallel network requests during refresh token rotation.
- **Impact**: In a multi-worker aaPanel deployment (PM2 cluster mode) or multi-container environment, concurrent requests land on different worker processes. Because memory is not shared across processes, Worker B will fail to match the token in its local `recentRotations` map, immediately classify the request as a **RefreshTokenReplayAttack**, and revoke all tokens for the user, forcibly kicking them out of the application.
- **Remediation**: Store rotation concurrency tokens in PostgreSQL with short-lived TTLs or in a shared Redis cache with atomic CAS (compare-and-swap) semantics.

---

## 3. Unbounded Queries & Memory Exhaustion Risks

Static query scanning identified **101 instances** where Prisma's `findMany` is executed without a `take` parameter.

### High-Risk Unbounded Queries
1. **User Directory (`src/modules/admin/infrastructure/database/admin.repository.ts:80`)**:
   ```typescript
   const users = await this.db.user.findMany({
     where,
     include: {
       userRoles: { include: { role: true } },
       patientProfile: { select: { id: true } },
       doctorProfile: { select: { id: true } },
       staffMember: { select: { id: true } },
     },
     orderBy: { createdAt: 'desc' },
   });
   ```
   *Defect*: Fetches the entire platform user table with multiple relational joins into Node.js heap memory in a single query.
2. **Master Doctor Directory (`src/modules/doctor/infrastructure/database/doctor.repository.ts:114`)**:
   `findAllDoctors` queries all registered doctors without pagination limits.
3. **Master Facility Directory (`src/modules/facility/infrastructure/database/facility.repository.ts:97`)**:
   `findAllFacilities` loads all facility entities across all branches and cities without limits.
4. **Master Staff Directory (`src/modules/staff/infrastructure/database/staff.repository.ts:91`)**:
   `findAllStaff` loads all healthcare workers without limits.
5. **Global Insurance Policies (`src/modules/insurance/infrastructure/database/insurance.repository.ts`)**:
   `searchPolicies` executes unpaginated queries returning all matching policies across all patients.
6. **Health Card Directory (`src/modules/health-card/infrastructure/database/health-card.repository.ts`)**:
   `searchCards` queries all health cards matching a name substring with zero limit.
7. **OCR Job Queue (`src/modules/ocr/infrastructure/database/ocr.repository.ts:28`)**:
   `findJobs` retrieves all historical OCR extraction jobs without pagination.

- **Impact**: Under production loads with tens of thousands of records, these endpoints will cause severe database connection pool saturation, excessive memory allocation, V8 garbage collection pauses, and potential out-of-memory (OOM) worker process crashes.
- **Remediation**: Enforce default pagination (`take: Math.min(limit || 20, 100)`, `skip: (page - 1) * limit`) across all repository `findMany` queries.

---

## 4. Confirmed N+1 Query Patterns

| Location | Pattern Description | Impact | Remediation |
| :--- | :--- | :--- | :--- |
| `src/modules/admin/infrastructure/database/admin.repository.ts:141` | Assigning roles in a `for (const roleName of roleNames)` loop with individual `this.db.userRole.create()` calls. | $N$ roundtrips per role assignment request. | Use `this.db.userRole.createMany({ data: ... })`. |
| `src/modules/reports/infrastructure/database/reports.repository.ts:168` | Reordering dashboard widgets in `for (const item of widgetOrders)` with individual `this.db.dashboardWidget.update()` calls. | $N$ database updates for a single widget layout save. | Batch into a single `$transaction` or raw SQL `UPDATE ... CASE`. |
| `src/modules/governance/infrastructure/database/governance.repository.ts:114` | Bulk system configuration updates executing individual sequential updates in a loop. | High latency on configuration sync. | Execute inside a single atomic `$transaction`. |
| `src/modules/medical-record/infrastructure/database/medical-record.repository.ts:198` | Looping through attachments to update soft-delete states individually. | Multi-statement database roundtrips. | Use `this.db.medicalAttachment.updateMany(...)`. |
| `src/modules/observability/infrastructure/database/observability.repository.ts:147` | Component health check aggregation looping through components with sequential query calls. | Slow healthcheck response times. | Use grouped aggregate queries. |

---

## 5. Schema-Dependent Blockers & Data Model Limitations

The Phase 1 mandate establishes:
> "Database schema and migrations: strictly read-only during this phase. Do not add indexes, fields, relations, models or migrations in Phase 1. For every issue requiring a schema change, describe the exact limitation and mark it as requiring explicit approval."

### Blocker 1: Complete Absence of Appointment Booking Data Models
- **Limitation**: The approved CareID backend requirements and `src/modules/appointment/` structure anticipate an appointment scheduling system. However, `prisma/schema.prisma` contains **zero models** for appointments.
- **Consequence**: `AppointmentModule` cannot be implemented without adding models (e.g. `Appointment`, `AppointmentParticipant`, `AppointmentSlot`) and generating database migrations.
- **Status**: **STRICTLY BLOCKED** pending Phase 2 schema migration approval.

### Blocker 2: OCR Human Review Correction History Loss
- **Limitation**: `model OCRVerification` in `prisma/schema.prisma` only contains:
  ```prisma
  model OCRVerification {
    id           String    @id @default(uuid())
    ocrJobId     String    @map("ocr_job_id")
    reviewedBy   String    @map("reviewed_by")
    reviewStatus String    @default("APPROVED") @map("review_status")
    reviewNotes  String?   @map("review_notes")
    completedAt  DateTime? @map("completed_at")
  }
  ```
  It has no JSON field (e.g. `correctedFields Json?`) or foreign relations to store human-reviewed corrections.
- **Consequence**: When an administrator or reviewer submits `reviewStatus = 'CORRECTED'`, the corrected values cannot be logged in the verification record. Updating `ExtractedField.fieldValue` directly overwrites the raw OCR output, destroying forensic auditability.
- **Status**: Modifying `ExtractedField.fieldValue` in place is possible without schema changes; however, preserving both original OCR output and human correction requires a schema migration (`correctedFields Json?` or `originalValue String?`).

### Blocker 3: Lack of Composite Performance Indexes for High-Volume Queries
- **Limitation**: High-frequency queries in `MedicalRecord` (by `patientProfileId` and `createdAt`), `MedicalAttachment` (by `medicalRecordId` and `isDeleted`), and `HealthCard` lack composite covering indexes in `prisma/schema.prisma`.
- **Status**: Deferred to Phase 2 index optimization migration.

---

## 6. Connection Pool & Timeout Configurations

In `src/database/database.service.ts:15-38`:
- `poolMax`: Parsed from `process.env.DB_POOL_MAX` (defaults to `10`, clamped between 1 and 100).
- `connectionTimeoutMillis`: Parsed from `process.env.DB_CONNECTION_TIMEOUT_MS` (defaults to `5000ms`, clamped between 500ms and 60000ms).
- `idleTimeoutMillis`: Parsed from `process.env.DB_IDLE_TIMEOUT_MS` (defaults to `10000ms`, minimum 1000ms).
- `ssl`: Correctly respects `DATABASE_SSL=true` and `DATABASE_SSL_REJECT_UNAUTHORIZED`.

**Assessment**: The database connection pool configuration is sound for single-instance staging, but default pool size (10) will quickly saturate if PM2 runs 4 cluster workers ($4 \times 10 = 40$ connections) and unbounded `findMany` queries hold connections during large serializations.

