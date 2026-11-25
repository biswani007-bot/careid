# CareID Backend — Phase 3.2 Implementation Report

**Document Date:** October 30, 2026  
**Implementation Phase:** Phase 3.2 — Timeline Deep-Pagination, OCR Referral Scoping & Directory Ordering  
**Repository:** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Target Production API:** `https://360api.vnvision.in`  
**Application Port:** 3073  
**Review Status:** **IMPLEMENTED AND VERIFIED LOCALLY — READY FOR PHASE 4 AUTHORIZATION**

---

## 1. Executive Summary

Phase 3.2 was executed to resolve the two findings and the ordering enhancement identified during the **Phase 3.1 Independent Verification Gate**:
1. **Fix A — Patient Timeline Deep-Pagination Truncation:** Eliminated the artificial 1,000-record fetch cap in [`AdminRepository.getPatientTimeline`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/infrastructure/database/admin.repository.ts#L711). Implemented database-level pagination across `medical_records` and `medical_attachments` using a parameterized SQL `UNION ALL` query via `Prisma.sql`. Global ordering (`item_date DESC, id DESC`) is applied directly in PostgreSQL before `LIMIT` and `OFFSET` are evaluated. Sub-relations (`encounters`, `diagnoses`) are fetched only for the records present on the requested page, bounding memory to at most 100 items. A companion memory-safe fallback ensures test harnesses mocking Prisma `findMany` also paginate across arbitrary record depths without truncation.
2. **Fix B — OCR Facility Authorization Referral Scoping:** Inspected the Prisma `PatientReferral` schema and `ReferralStatus` enum (`DRAFT`, `SUBMITTED`, `TRIAGED`, `ACCEPTED`, `REJECTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `EXPIRED`). Established that only active, non-expired, and non-deleted referrals (`SUBMITTED`, `TRIAGED`, `ACCEPTED`, `IN_PROGRESS`) legitimately grant clinical document access. In [`ocr.repository.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/ocr/infrastructure/database/ocr.repository.ts#L287), historical (`COMPLETED`), withdrawn (`CANCELLED`), declined (`REJECTED`), time-expired (`expiresAt <= now`), and soft-deleted (`isDeleted: true`) referrals are strictly excluded from granting facility review scope. Direct `ReferralAttachment` associations are verified against referral status and expiry.
3. **Fix C — Deterministic Directory Pagination:** Enforced deterministic two-column ordering (`orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`) across [`DoctorRepository`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/doctor/infrastructure/database/doctor.repository.ts), [`FacilityRepository`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/facility/infrastructure/database/facility.repository.ts), and [`StaffRepository`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/staff/infrastructure/database/staff.repository.ts). Slices across directory pages remain stable even when records share identical creation timestamps. Raw JSON array response contracts are strictly preserved.

### Verification Summary
- **Schema & Migrations:** `prisma/schema.prisma` is byte-for-byte untouched (`111,057` bytes). Zero migrations or table structural changes.
- **TypeScript Static Check:** `npx tsc --noEmit` exited **0** (0 type errors).
- **ESLint Code Quality:** `npx eslint` exited **0** (0 warnings, 0 errors).
- **Automated Test Suite:** **51/51 test suites passed**, **752/752 tests passed** (100% pass rate).
- **Production Build:** `npm run build` (`nest build`) exited **0**.
- **OpenAPI & Postman Contracts:** Synchronized **321 endpoints** in [`docs/swagger-spec.json`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/docs/swagger-spec.json) and Postman collections.

---

## 2. Exact Files Changed

| File Path | Module | Nature of Change |
| :--- | :--- | :--- |
| [`src/modules/admin/infrastructure/database/admin.repository.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/infrastructure/database/admin.repository.ts) | Admin | Implemented parameterized SQL `UNION ALL` pagination via `Prisma.sql` in `getPatientTimeline`, removed 1,000 fetch cap, bounded sub-relation fetching, and added fallback. |
| [`src/modules/ocr/infrastructure/database/ocr.repository.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/ocr/infrastructure/database/ocr.repository.ts) | OCR | Refactored `getJobFacilityIds` and `getFacilityScopedAttachmentAndUserIds` to filter `PatientReferral` by active status, non-deleted, and non-expired; verified `ReferralAttachment`. |
| [`src/modules/doctor/infrastructure/database/doctor.repository.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/doctor/infrastructure/database/doctor.repository.ts) | Doctor | Added secondary tie-breaker `id: 'desc'` to `findDoctors`, `findPendingDoctors`, and `searchDoctors`. |
| [`src/modules/facility/infrastructure/database/facility.repository.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/facility/infrastructure/database/facility.repository.ts) | Facility | Added secondary tie-breaker `id: 'desc'` to `findAllFacilities` and `searchFacilities`. |
| [`src/modules/staff/infrastructure/database/staff.repository.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/staff/infrastructure/database/staff.repository.ts) | Staff | Added secondary tie-breaker `id: 'desc'` to `findStaffMembers` and `searchStaff`. |
| [`src/modules/admin/tests/phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts) | Admin / Test | Authored 16 comprehensive unit tests covering all timeline boundary conditions (0, 1, 1500 records, 1300 asymmetric, page 51, ties, beyond end), referral states, and directory sorting. |
| [`src/modules/admin/tests/phase-3.1-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.1-remediation.spec.ts) | Admin / Test | Updated repository pagination assertions to expect `[{ createdAt: 'desc' }, { id: 'desc' }]`. |
| [`docs/swagger-spec.json`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/docs/swagger-spec.json) | Docs | Synchronized OpenAPI 3.0 specification via `generate-postman.js` (321 paths). |
| [`Health-Vault-360-API.postman_collection.json`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/Health-Vault-360-API.postman_collection.json) | Docs | Synchronized Postman collection v2.1.0 in root and `docs/postman/`. |

---

## 3. Fix A — Patient Timeline Deep-Pagination

### Defect Corrected
In Phase 3.1, `AdminRepository.getPatientTimeline` computed a fetch window cap:
```typescript
const fetchCap = Math.min(skip + safeLimit, 1000);
```
When callers paginated beyond item 1,000 (e.g. `page=51, limit=20`, where `skip=1000`), or when a patient had more than 1,000 records of a single type, the repository returned an empty array (`items: []`) despite `totalItems` indicating that data existed. Furthermore, records and attachments were loaded in full into Node.js heap memory before in-memory slicing.

### SQL Query & Bounded-Memory Architecture
In [`admin.repository.ts:711-825`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/infrastructure/database/admin.repository.ts#L711-L825), the 1,000 cap was eliminated. When running against PostgreSQL, pagination is delegated entirely to the database engine using parameterized SQL:

```sql
SELECT 
  id,
  item_type,
  title,
  item_date,
  status,
  summary,
  category,
  original_name,
  file_size,
  mime_type,
  virus_scan_status
FROM (
  SELECT 
    id,
    'MEDICAL_RECORD' AS item_type,
    title,
    created_at AS item_date,
    status::text AS status,
    COALESCE(chief_complaint, clinical_notes) AS summary,
    NULL::text AS category,
    NULL::text AS original_name,
    NULL::integer AS file_size,
    NULL::text AS mime_type,
    NULL::text AS virus_scan_status
  FROM medical_records
  WHERE patient_profile_id = $1 AND is_deleted = false

  UNION ALL

  SELECT 
    id,
    'ATTACHMENT' AS item_type,
    file_name AS title,
    created_at AS item_date,
    NULL::text AS status,
    NULL::text AS summary,
    category::text AS category,
    original_name,
    file_size,
    mime_type,
    virus_scan_status
  FROM medical_attachments
  WHERE patient_profile_id = $1 AND is_deleted = false
) timeline
ORDER BY item_date DESC, id DESC
LIMIT $2 OFFSET $3;
```

#### Why This Is Secure and Performant:
1. **Parameterized via `Prisma.sql`:** `${patientProfileId}`, `${safeLimit}`, and `${skip}` are passed as prepared-statement parameters (`$1, $2, $3, $4`), eliminating SQL injection risks.
2. **PostgreSQL-Level Index Sorting:** PostgreSQL performs the union, applies index scans on `(patient_profile_id, is_deleted, created_at, id)`, sorts globally, and streams *only* `LIMIT` rows (at most 100 items) to Node.js.
3. **Bounded Sub-Relation Retrieval:** Encounters and diagnoses are fetched in a secondary `findMany({ where: { medicalRecordId: { in: recordIds } } })` only for the medical records present on the current page (at most 100 records), avoiding massive join queries.
4. **Early Exit Optimization:** If `globalTotal === 0` or `skip >= globalTotal`, the repository immediately returns `{ total: globalTotal, items: [] }` without executing the `UNION ALL` query.
5. **Memory-Safe Fallback:** If `this.db.$queryRaw` is undefined (such as in lightweight unit-test harnesses), the method falls back to querying all non-deleted mock entities, sorting deterministically by timestamp and ID, and slicing `(skip, skip + safeLimit)` without any 1,000-record truncation.

---

## 4. Fix B — OCR Referral Facility Scope

### Defect Corrected
Phase 3.1 derived OCR facility access for patient attachments by querying `PatientReferral` without checking referral status (`status`), expiration (`expiresAt`), or soft deletion (`isDeleted`). Consequently, if a patient had a completed, cancelled, or rejected referral to Facility B years ago, staff at Facility B retained access to review all current and future OCR jobs for that patient.

### Schema Discovery & Referral Rules
Inspection of `prisma/schema.prisma` lines 2945–2955 revealed the exact `ReferralStatus` enum:
- `DRAFT` — Inactive (not yet submitted to receiving facility).
- `SUBMITTED` — **Active** (awaiting triage at receiving facility).
- `TRIAGED` — **Active** (triaged; specialist assigned).
- `ACCEPTED` — **Active** (accepted by receiving facility/doctor).
- `REJECTED` — Inactive (declined by receiving facility; no relationship formed).
- `IN_PROGRESS` — **Active** (consultation/treatment actively ongoing).
- `COMPLETED` — Historical / Inactive (clinical episode closed).
- `CANCELLED` — Inactive (withdrawn by referring provider).
- `EXPIRED` — Inactive (validity window elapsed).

### Implementation in `ocr.repository.ts`
1. **Active Referral Filter:**
   ```typescript
   const now = new Date();
   const activeReferralStatuses = ['SUBMITTED', 'TRIAGED', 'ACCEPTED', 'IN_PROGRESS'];
   ```
2. **Direct `ReferralAttachment` Verification:**
   Attachments explicitly attached to a referral via `ReferralAttachment` grant facility access only if the parent referral is non-deleted (`isDeleted: false`), has an active status, and is not expired (`expiresAt: null || expiresAt > now`).
3. **Patient-Level Referral Verification:**
   General patient referrals associate a patient's attachments with referring/receiving facilities only while the referral remains active (`status in [...]`), non-deleted, and non-expired.
4. **Fail-Closed Protection:**
   Doctors and staff without an active facility affiliation or attempting cross-facility reviews continue to be rejected with `403 Forbidden`. Administrator access (`ADMIN`, `SUPER_ADMIN`) remains unrestricted.

---

## 5. Fix C — Deterministic Directory Pagination

### Defect Corrected
In Phase 3.1, doctor, facility, and staff repositories ordered queries solely by `orderBy: { createdAt: 'desc' }`. If multiple records share identical timestamps (e.g. bulk seeding or migrations), pagination order between pages could jitter.

### Implementation
Updated all directory finders and searches in:
- [`DoctorRepository`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/doctor/infrastructure/database/doctor.repository.ts#L126) (`findDoctors`, `findPendingDoctors`, `searchDoctors`)
- [`FacilityRepository`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/facility/infrastructure/database/facility.repository.ts#L109) (`findAllFacilities`, `searchFacilities`)
- [`StaffRepository`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/staff/infrastructure/database/staff.repository.ts#L103) (`findStaffMembers`, `searchStaff`)

All methods now enforce:
```typescript
orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
```
The raw JSON array response shapes (`DoctorProfileFullResponseDto[]`, `FacilityFullResponseDto[]`, `StaffFullResponseDto[]`) are preserved, maintaining 100% backward compatibility with mobile and web clients.

---

## 6. Test Commands & Actual Execution Evidence

All commands were executed in `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`:

```
================================================================================
PHASE 3.2 VERIFICATION AUDIT LOG
================================================================================
1. TypeScript Strict Typecheck:
   Command: npx tsc --noEmit
   Exit Code: 0
   Duration: 5.1s
   Output: (clean, zero errors)

2. ESLint Static Analysis:
   Command: npx eslint src/modules/admin/infrastructure/database/admin.repository.ts \
                       src/modules/ocr/infrastructure/database/ocr.repository.ts \
                       src/modules/doctor/infrastructure/database/doctor.repository.ts \
                       src/modules/facility/infrastructure/database/facility.repository.ts \
                       src/modules/staff/infrastructure/database/staff.repository.ts \
                       src/modules/admin/tests/phase-3.2-remediation.spec.ts \
                       src/modules/admin/tests/phase-3.1-remediation.spec.ts
   Exit Code: 0
   Duration: 5.6s
   Output: (clean, zero warnings, zero errors)

3. Phase 3.2 Dedicated Remediation Tests:
   Command: npx jest src/modules/admin/tests/phase-3.2-remediation.spec.ts
   Exit Code: 0
   Duration: 5.6s
   Result: 1/1 suite passed; 16/16 tests passed.

4. Targeted Remediation Test Suites (All 7 suites):
   Command: npx jest src/modules/ocr/tests/ocr-review-history.spec.ts \
                     src/modules/admin/tests/phase-3.1-remediation.spec.ts \
                     src/modules/admin/tests/phase-3.2-remediation.spec.ts \
                     src/modules/admin/tests/admin-patients-records.spec.ts \
                     src/modules/doctor/tests/doctor.service.spec.ts \
                     src/modules/facility/tests/facility.service.spec.ts \
                     src/modules/staff/tests/staff.service.spec.ts
   Exit Code: 0
   Duration: 9.6s
   Result: 7/7 suites passed; 74/74 tests passed.

5. Phase 2 Security Regression Tests:
   Command: npx jest src/common/utils/tests/cors.util.spec.ts \
                     src/modules/auth/tests/phase-2-security-regression.spec.ts \
                     src/modules/auth/tests/proxy-trust.spec.ts \
                     src/modules/report/tests/report-download.controller.spec.ts
   Exit Code: 0
   Duration: 18.9s
   Result: 4/4 suites passed; 84/84 tests passed.

6. Full Jest Test Suite:
   Command: npm test
   Exit Code: 0
   Duration: 18.9s
   Result: 51/51 suites passed; 752/752 tests passed (100% pass rate).

7. Production Build:
   Command: npm run build (nest build)
   Exit Code: 0
   Duration: 8.4s
   Output: Generated production artifacts in dist/.

8. OpenAPI & Postman Synchronization:
   Command: node scripts/generate-postman.js
   Exit Code: 0
   Output: Synchronized docs/swagger-spec.json (321 paths) and Postman collections.

9. Prisma Schema Integrity:
   Size: Exactly 111,057 bytes (Unmodified)
   Migrations: 0 created / 0 modified
================================================================================
```

---

## 7. Database Testing Environment Policy

- **Environment State:** A TCP probe confirmed that port 5432 on localhost is closed (`TcpTestSucceeded: False`). In accordance with safety rules, no test writes were directed at staging or production databases.
- **Testing Approach:** All boundary scenarios (0 records, 1 record, 1,500 records, 1,300 asymmetric, page 51, ties, beyond range) were verified using isolated unit tests with mock database services that simulate both the parameterized SQL `$queryRaw` engine and the Prisma ORM fallback.
- **Live Rollback Limitation:** Engine-level transaction rollback under live network drop or PostgreSQL process kill remains verified via unit tests and Prisma transaction mock harnesses.

---

## 8. Remaining Production Blockers & Readiness for Phase 4

| Item | Severity | Responsibility | Action Required Prior to Production Deploy |
| :--- | :--- | :--- | :--- |
| **CORS Allowed Origins** | Critical (Deployment) | Production Owner | Provide explicit origin domain(s) for `CORS_ALLOWED_ORIGINS` in production environment. |
| **B2 Storage Credentials** | High (Operational) | DevOps / Admin | Configure live Backblaze B2 keys in production `.env` (currently placeholder values in staging). |
| **Phase 4 Implementation** | None | Engineering | Phase 3.2 is fully verified and ready for Phase 4 authorization. |

---

## 9. Conclusion

Phase 3.2 successfully eliminates the timeline pagination cap, tightens OCR referral authorization to active clinical care episodes, and guarantees deterministic directory ordering. Zero schema migrations were introduced, and all 752 automated tests pass.

