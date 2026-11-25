# CareID Backend — Phase 3.2 Regression Matrix

**Document Date:** October 30, 2026  
**Implementation Phase:** Phase 3.2 — Timeline Deep-Pagination, OCR Referral Scoping & Directory Ordering  
**Repository:** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Target Environment:** Local Workspace / Staging Gateway (`https://360api.vnvision.in`)  
**Authorized Status Values:** `IMPLEMENTED AND TESTED`, `PARTIALLY IMPLEMENTED`, `BLOCKED`, `NOT REQUIRED`, `REQUIRES OWNER DECISION`

---

## 1. Master Remediation & Boundary Verification Matrix

| # | Workstream / Defect | Evaluated Behavior | Implementation Mechanism | Test Case & Location | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A.1** | **Fix A: Empty Timeline** | Patient has 0 records and 0 attachments | Returns `{ total: 0, items: [] }` immediately without hitting database union query | [`phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts#L41) (A.1) | **IMPLEMENTED AND TESTED** |
| **A.2** | **Fix A: Single Record** | Patient has exactly 1 medical record | Slices correctly, returns `{ total: 1, items: [rec] }` | [`phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts#L51) (A.2) | **IMPLEMENTED AND TESTED** |
| **A.3** | **Fix A: 1,500 Records (Page 51 Boundary)** | Patient has 1,500 records, 0 attachments. Request page 51 with limit 20 (items 1001–1020). | Database-level SQL `UNION ALL` with `LIMIT 20 OFFSET 1000`. Eliminates 1,000 cap; returns records 1001 to 1020 | [`phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts#L80) (A.3) | **IMPLEMENTED AND TESTED** |
| **A.4** | **Fix A: Asymmetric Dataset (1,200 Recs, 100 Atts)** | 1,300 total items; continuous chronological interleaving | Unified SQL stream ordered by `item_date DESC, id DESC`; page 50 correctly contains records and attachments | [`phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts#L108) (A.4) | **IMPLEMENTED AND TESTED** |
| **A.5** | **Fix A: >1,000 Attachments (Page 51 Boundary)** | Patient has 1,100 attachments, 0 records. Request page 51 (items 1001–1020). | Database-level SQL `UNION ALL` returns attachments 1001 to 1020 without truncation | [`phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts#L137) (A.5) | **IMPLEMENTED AND TESTED** |
| **A.6** | **Fix A: Identical Timestamps Tie-Breaker** | Multiple records and attachments share exact same millisecond date | Deterministic secondary sort `id DESC` (`b.id.localeCompare(a.id)`); ordering is 100% reproducible | [`phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts#L164) (A.6) | **IMPLEMENTED AND TESTED** |
| **A.7** | **Fix A: Page Beyond Total Items** | Caller requests `page=10, limit=20` when total items is 100 (`skip=180 > 100`) | Returns `{ total: 100, items: [] }` immediately without table scan | [`phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts#L220) (A.7) | **IMPLEMENTED AND TESTED** |
| **A.8** | **Fix A: Fallback Bounded Memory** | Test environment without `$queryRaw` mocking `findMany` | Slices all mocked items across arbitrary depths without 1,000 fetch cap | [`phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts#L228) (A.8) | **IMPLEMENTED AND TESTED** |
| **B.1** | **Fix B: Active Referral Scope** | Referral in `SUBMITTED`, `TRIAGED`, `ACCEPTED`, or `IN_PROGRESS` status | Grants facility review scope to both `referringFacilityId` and `receivingFacilityId` | [`phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts#L278) (B.1) | **IMPLEMENTED AND TESTED** |
| **B.2** | **Fix B: Inactive Referral Exclusion** | Referral in `COMPLETED`, `CANCELLED`, `REJECTED`, `EXPIRED`, or `DRAFT` status | Strictly excluded from facility review queue and history. Cross-facility access denied (403) | [`phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts#L318) (B.2) | **IMPLEMENTED AND TESTED** |
| **B.3** | **Fix B: Direct Referral Attachment Linking** | Attachment explicitly linked to referral via `ReferralAttachment` | Verified against referral status and expiry. Active referral grants access | [`phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts#L340) (B.3) | **IMPLEMENTED AND TESTED** |
| **B.4** | **Fix B: Deleted Referral Exclusion** | Referral with `isDeleted: true` | Soft-deleted referrals are completely ignored; no facility access granted | [`phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts#L372) (B.4) | **IMPLEMENTED AND TESTED** |
| **B.5** | **Fix B: Unaffiliated Clinical Fail-Closed** | Doctor or staff member without active facility affiliation submits review | Fails closed with `403 Forbidden` (`Active healthcare facility affiliation is required...`) | [`phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts#L404) (B.5) | **IMPLEMENTED AND TESTED** |
| **C.1** | **Fix C: Doctor Directory Ordering** | `GET /api/v1/doctors` | Enforces `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`. Returns raw array | [`phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts#L435) (C.1) | **IMPLEMENTED AND TESTED** |
| **C.2** | **Fix C: Facility Directory Ordering** | `GET /api/v1/facilities` | Enforces `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`. Returns raw array | [`phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts#L449) (C.2) | **IMPLEMENTED AND TESTED** |
| **C.3** | **Fix C: Staff Directory Ordering** | `GET /api/v1/staff` | Enforces `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`. Returns raw array | [`phase-3.2-remediation.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/phase-3.2-remediation.spec.ts#L463) (C.3) | **IMPLEMENTED AND TESTED** |

---

## 2. Core Security & System Regression Matrix

| Control Category | Test Suite File | Passed Tests | Security Guarantee Enforced | Status |
| :--- | :--- | :--- | :--- | :--- |
| **CORS Security** | [`cors.util.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/common/utils/tests/cors.util.spec.ts) | 26 / 26 | Strict allowlist, rejects wildcards, discards malformed/insecure URLs (`javascript:`, `file:`, `data:`). Fails closed in production. | **VERIFIED** |
| **Auth & RBAC** | [`phase-2-security-regression.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/auth/tests/phase-2-security-regression.spec.ts) | 25 / 25 | Password authentication, role guards, token lifecycle, refresh token rotation, patient ownership enforcement. | **VERIFIED** |
| **Proxy Trust** | [`proxy-trust.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/auth/tests/proxy-trust.spec.ts) | 24 / 24 | Rejects boolean `true`, wildcard `*`, and broad CIDRs (`/0`, `/8`, `/12`, `/16`). Falls back safely to `'loopback'`. | **VERIFIED** |
| **Report Download Gate** | [`report-download.controller.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/report/tests/report-download.controller.spec.ts) | 9 / 9 | Blocks downloads for `PENDING` and `INFECTED` files. Permits downloads only when scanner marks `CLEAN`. | **VERIFIED** |
| **OCR Atomicity & Concurrency** | [`ocr-review-history.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/ocr/tests/ocr-review-history.spec.ts) | 32 / 32 | Interactive Prisma transactions (`$transaction`), status transition guard (`409 Conflict`), duplicate correction rejection (`400 Bad Request`). | **VERIFIED** |
| **Admin Patient & Records** | [`admin-patients-records.spec.ts`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/tests/admin-patients-records.spec.ts) | 18 / 18 | Patient search, record listing, timeline mapping, missing patient 404, exclusion of password hashes and refresh tokens. | **VERIFIED** |
| **Directory Services** | `doctor.service.spec.ts`<br>`facility.service.spec.ts`<br>`staff.service.spec.ts` | 14 / 14 | Paginated directory queries, bounds, raw array response contracts preserved. | **VERIFIED** |

---

## 3. Full Test Suite Execution Summary

```
================================================================================
JEST FULL SUITE EXECUTION SUMMARY
================================================================================
Test Suites: 51 passed, 51 total
Tests:       752 passed, 752 total
Snapshots:   0 total
Time:        18.923 s
Ran all test suites.
================================================================================
```

All 51 test suites pass with 100% success rate across all modules.

