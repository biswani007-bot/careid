# CareID Backend — Phase 3.1 Regression Matrix

**Document Date:** October 29, 2026  
**Implementation Phase:** Phase 3.1 — Corrective Remediation (Independent Verification Gate Findings)  
**Repository:** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Target Environment:** Local Workspace / Staging Gateway (`https://360api.vnvision.in`)  
**Authorized Status Values:** `IMPLEMENTED AND TESTED`, `PARTIALLY IMPLEMENTED`, `BLOCKED`, `NOT REQUIRED`, `REQUIRES OWNER DECISION`

---

## 1. Master Remediation & Verification Matrix

| # | Remediated Defect | Affected Endpoints & Methods | Source Files Changed | Root Cause & Security Risk | Remediation Implemented | Verification Tests & Evidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Unscoped OCR Review Clinical Access** | `GET /api/v1/ocr/review`<br>`GET /api/v1/ocr/reviews/history`<br>`POST /api/v1/ocr/review/:jobId` | [`ocr.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/ocr/presentation/controllers/ocr.controller.ts)<br>[`ocr.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/ocr/application/use-cases/ocr.service.ts)<br>[`ocr.repository.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/ocr/infrastructure/database/ocr.repository.ts)<br>[`ocr.repository.interface.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/ocr/domain/repositories/ocr.repository.interface.ts) | `DOCTOR` and `STAFF` roles were allowed global access to review queues and history without verifying facility affiliation, risking cross-facility clinical data exposure. | Added `getUserActiveFacilityIds` and `getJobFacilityIds`. Non-admin clinical users must have active facility affiliation matching the OCR job. Fails closed with `403 Forbidden`. Authenticated via `req.user.userId`. | [`ocr-review-history.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/ocr/tests/ocr-review-history.spec.ts)<br>(32 tests pass) | **IMPLEMENTED AND TESTED** |
| **2** | **Non-Atomic OCR Review Writes & Race Conditions** | `POST /api/v1/ocr/review/:jobId` | [`ocr.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/ocr/application/use-cases/ocr.service.ts)<br>[`ocr.repository.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/ocr/infrastructure/database/ocr.repository.ts)<br>[`ocr.repository.interface.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/ocr/domain/repositories/ocr.repository.interface.ts) | Field corrections, verification record, audit logs, and status transitions ran as separate statements without transactions. Concurrent submissions could overwrite each other. | Enclosed all operations in `this.db.$transaction`. Added zero-schema concurrency guard (`updateMany` with `status: 'REVIEW_REQUIRED'`) throwing `409 Conflict` on race. Pre-validates duplicate fields and non-existent IDs with `400 Bad Request`. | [`phase-3.1-remediation.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.1-remediation.spec.ts)<br>[`ocr-review-history.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/ocr/tests/ocr-review-history.spec.ts) | **IMPLEMENTED AND TESTED** |
| **3** | **Inaccurate Patient Timeline Pagination Metadata** | `GET /api/v1/admin/patients/:patientId/medical-records/timeline` | [`admin.repository.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/infrastructure/database/admin.repository.ts) | `totalItems` was derived from in-memory array slice rather than true database count. Lack of secondary tie-breaker caused non-deterministic ordering when timestamps matched. | Refactored to run parallel `count()` queries on `medicalRecord` and `medicalAttachment`. Added deterministic tie-breaker `b.id.localeCompare(a.id)`. Capped fetch window to `Math.min(skip + safeLimit, 1000)`. | [`admin-patients-records.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/admin-patients-records.spec.ts)<br>[`phase-3.1-remediation.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.1-remediation.spec.ts) | **IMPLEMENTED AND TESTED** |
| **4** | **Unbounded Queries in Legacy Directory Endpoints** | `GET /api/v1/doctors`<br>`GET /api/v1/facilities`<br>`GET /api/v1/staff` | [`doctor.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/doctor/presentation/controllers/doctor.controller.ts), [`doctor.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/doctor/application/use-cases/doctor.service.ts), [`doctor.repository.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/doctor/infrastructure/database/doctor.repository.ts)<br>[`facility.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/facility/presentation/controllers/facility.controller.ts), [`facility.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/facility/application/use-cases/facility.service.ts), [`facility.repository.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/facility/infrastructure/database/facility.repository.ts)<br>[`staff.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/staff/presentation/controllers/staff.controller.ts), [`staff.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/staff/application/use-cases/staff.service.ts), [`staff.repository.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/staff/infrastructure/database/staff.repository.ts) | `findMany()` queries fetched all entities without bounds, risking heap exhaustion. Wrapping response in object envelope would break mobile/web client contracts. | Added optional `page` and `limit` with safe default (`limit=50`) and hard cap (`limit<=100`). Maintained exact array response formats (`DoctorProfileFullResponseDto[]`, etc.) and deterministic sorting (`createdAt: 'desc', id: 'desc'`). | [`phase-3.1-remediation.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.1-remediation.spec.ts)<br>[`doctor.service.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/doctor/tests/doctor.service.spec.ts)<br>[`facility.service.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/facility/tests/facility.service.spec.ts)<br>[`staff.service.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/staff/tests/staff.service.spec.ts) | **IMPLEMENTED AND TESTED** |

---

## 2. Role & Scope Authorization Test Matrix

| Role | `GET /ocr/review` | `GET /ocr/reviews/history` | `POST /ocr/review/:id` | `GET /admin/patients/:id/medical-records/timeline` | `GET /doctors` | `GET /facilities` | `GET /staff` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`SUPER_ADMIN`** | **ALLOW** (Global queue) | **ALLOW** (Global history) | **ALLOW** (Any job) | **ALLOW** (Any patient) | **ALLOW** (Paginated array) | **ALLOW** (Paginated array) | **ALLOW** (Paginated array) |
| **`ADMIN`** | **ALLOW** (Global queue) | **ALLOW** (Global history) | **ALLOW** (Any job) | **ALLOW** (Any patient) | **ALLOW** (Paginated array) | **ALLOW** (Paginated array) | **ALLOW** (Paginated array) |
| **`DOCTOR`** (Affiliated) | **ALLOW** (Scoped to own facilities) | **ALLOW** (Scoped to own facilities) | **ALLOW** (Matching facility job) | **DENY (403)** | **ALLOW** (Paginated array) | **ALLOW** (Paginated array) | **ALLOW** (Paginated array) |
| **`DOCTOR`** (Unaffiliated / Cross-Facility) | **DENY (403)** | **DENY (403)** | **DENY (403)** | **DENY (403)** | **ALLOW** (Paginated array) | **ALLOW** (Paginated array) | **ALLOW** (Paginated array) |
| **`STAFF`** (Affiliated) | **ALLOW** (Scoped to own facilities) | **ALLOW** (Scoped to own facilities) | **ALLOW** (Matching facility job) | **DENY (403)** | **ALLOW** (Paginated array) | **ALLOW** (Paginated array) | **ALLOW** (Paginated array) |
| **`STAFF`** (Unaffiliated / Cross-Facility) | **DENY (403)** | **DENY (403)** | **DENY (403)** | **DENY (403)** | **ALLOW** (Paginated array) | **ALLOW** (Paginated array) | **ALLOW** (Paginated array) |
| **`PATIENT`** | **DENY (403)** | **DENY (403)** | **DENY (403)** | **DENY (403)** | **ALLOW** (Public directory) | **ALLOW** (Public directory) | **DENY (403)** |
| **Anonymous** | **DENY (401)** | **DENY (401)** | **DENY (401)** | **DENY (401)** | **DENY (401)** | **DENY (401)** | **DENY (401)** |

---

## 3. Concurrency, Validation & Rollback Matrix

| Scenario | Input Condition | Expected Behavior | Prisma Transaction State | Test Result |
| :--- | :--- | :--- | :--- | :--- |
| **Valid Single Review** | Job in `REVIEW_REQUIRED`, valid reviewer, valid corrections | Job set to `COMPLETED`, fields updated, verification created, audit logs written | **COMMITTED** | **PASS** |
| **Concurrent Race Condition** | Job already transitioned from `REVIEW_REQUIRED` (or another user submitted first) | Throws `ConflictException (409)`: "OCR job is not in REVIEW_REQUIRED status or has already been reviewed" | **ROLLED BACK** (0 mutations persisted) | **PASS** |
| **Duplicate Field Correction** | Payload contains multiple corrections targeting the same `fieldId` | Throws `BadRequestException (400)`: "Duplicate correction for fieldId" | **ABORTED PRE-TRANSACTION** | **PASS** |
| **Non-Existent Field ID** | Payload contains `fieldId` that does not exist in job | Throws `BadRequestException (400)`: "Field ... does not exist in job" | **ABORTED PRE-TRANSACTION** | **PASS** |
| **Database Failure During Audit Log** | Simulated DB error during audit logging or verification creation | Throws error; transaction catches and rolls back | **ROLLED BACK** (ExtractedField and OCRJob unmutated) | **PASS** |

---

## 4. Pagination & Contract Compatibility Matrix

| Endpoint | Query Parameters | Default Behavior | Upper Limit Enforcement | Sort Order | Response Format | Compatibility Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /api/v1/admin/patients/:id/medical-records/timeline` | `page`, `limit` | `page=1, limit=20` | `limit <= 100` | Chronological descending with secondary `id` tie-breaker | `{ success, data: [...], pagination: { totalItems, totalPages, page, limit, hasNextPage, hasPreviousPage } }` | Fully verified; handles empty list, single page, multi-page |
| `GET /api/v1/doctors` | `page`, `limit` | `page=1, limit=50` | `limit <= 100` | `createdAt: 'desc', id: 'desc'` | `DoctorProfileFullResponseDto[]` (raw array) | Preserves client compatibility |
| `GET /api/v1/facilities` | `page`, `limit` | `page=1, limit=50` | `limit <= 100` | `createdAt: 'desc', id: 'desc'` | `FacilityFullResponseDto[]` (raw array) | Preserves client compatibility |
| `GET /api/v1/staff` | `page`, `limit` | `page=1, limit=50` | `limit <= 100` | `createdAt: 'desc', id: 'desc'` | `StaffFullResponseDto[]` (raw array) | Preserves client compatibility |

---

## 5. Automated Test Suite Execution Summary

```
Test Suites: 50 passed, 50 total
Tests:       736 passed, 736 total
Snapshots:   0 total
Time:        21.179 s
Ran all test suites.
```

- **Core Security Regressions:** `cors.util.spec.ts` (26 tests pass), `phase-2-security-regression.spec.ts` (25 tests pass), `proxy-trust.spec.ts` (pass).
- **Administrative & OCR Tests:** `admin-patients-records.spec.ts` (18 tests pass), `ocr-review-history.spec.ts` (32 tests pass), `phase-3.1-remediation.spec.ts` (12 tests pass).
- **Directory Service Tests:** `doctor.service.spec.ts` (5 tests pass), `facility.service.spec.ts` (4 tests pass), `staff.service.spec.ts` (5 tests pass).
- **Auth & System Health:** `auth.service.spec.ts` (pass), `password-login.spec.ts` (pass), `seed-and-auth-verification.spec.ts` (pass).

