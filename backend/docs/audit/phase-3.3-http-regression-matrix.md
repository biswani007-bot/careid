# CareID Backend — Phase 3.3: HTTP Runtime Regression Matrix

**Execution Date:** 2026-10-30T03:10:45Z  
**Runtime Target:** `http://127.0.0.1:3000/api/v1` (NestJS 11 local runtime)  
**Database Target:** `postgresql://postgres:postgres@127.0.0.1:5432/hvapi_db?schema=public` (Docker `careid-test-postgres`)  
**Production Reference:** `https://360api.vnvision.in` (Untouched)  
**Total Checks:** 43  
**Passed:** 43 (100.0%)  
**Failed:** 0 (0.0%)  

---

## Complete 43-Point HTTP Runtime Verification Matrix

| Check ID | Test Category | HTTP Method & Endpoint | Auth Role | Request Payload / Query Params | Expected Status | Actual Status | Latency | Result | Key Assertion & Behavioral Proof |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Database Safety | `SQL SELECT current_database()` | Direct DB | `SELECT current_database(), inet_server_addr()` | Valid DB | `hvapi_db` | 35ms | **PASS** | Confirmed target is local Docker container (`172.17.0.2:5432`). |
| **SEC-02** | Health Check | `GET /api/v1/health` | None | None | 200 OK | 200 OK | 24ms | **PASS** | Server is healthy and reachable; returns `{ status: 'ok', service: 'HVAPI Backend' }`. |
| **AUTH-01** | Authentication | `POST /api/v1/auth/password/login` | None | `{ identifier: 'admin@careid.test', password: '***' }` | 200 OK | 200 OK | 374ms | **PASS** | Platform Admin logged in; issued genuine JWT access token. |
| **AUTH-02** | Authentication | `POST /api/v1/auth/otp/verify` | None | `{ challengeId: '...', otpCode: '123456' }` (`+16505550003`) | 200 OK | 200 OK | 244ms | **PASS** | Doctor A authenticated via verified test OTP; genuine JWT issued. |
| **AUTH-03** | Authentication | `POST /api/v1/auth/otp/verify` | None | `{ challengeId: '...', otpCode: '123456' }` (`+16505550006`) | 200 OK | 200 OK | 199ms | **PASS** | Staff A authenticated via verified test OTP; genuine JWT issued. |
| **AUTH-04** | Authentication | `POST /api/v1/auth/otp/verify` | None | `{ challengeId: '...', otpCode: '123456' }` (`+16505550004`) | 200 OK | 200 OK | 203ms | **PASS** | Patient authenticated via verified test OTP; genuine JWT issued. |
| **AUTH-05** | Authentication | `POST /api/v1/auth/otp/verify` | None | `{ challengeId: '...', otpCode: '123456' }` (`+16505550007`) | 200 OK | 200 OK | 190ms | **PASS** | Doctor B (Facility B) authenticated via verified test OTP; genuine JWT issued. |
| **TL-01** | Timeline Deep Pagination | `GET /api/v1/admin/patients/:id/medical-records/timeline` | `ADMIN` | `page=1&limit=20` | 200 OK | 200 OK | 48ms | **PASS** | Initial page returns 20 items; `totalItems: 1040`, `totalPages: 52`, `hasNextPage: true`. |
| **TL-02** | Timeline Ordering | `GET /api/v1/admin/patients/:id/medical-records/timeline` | `ADMIN` | `page=1&limit=20` (Analysis) | Deterministic | Monotonic | 5ms | **PASS** | Top 10 items with equal timestamps sorted deterministically by secondary tie-breaker `id DESC`. |
| **TL-03** | Timeline Boundary | `GET /api/v1/admin/patients/:id/medical-records/timeline` | `ADMIN` | `page=50&limit=20` | 200 OK | 200 OK | 19ms | **PASS** | Returns items 981–1000; `hasNextPage: true`, `hasPreviousPage: true`. |
| **TL-04** | Timeline 1000-Item Threshold | `GET /api/v1/admin/patients/:id/medical-records/timeline` | `ADMIN` | `page=51&limit=20` | 200 OK | 200 OK | 17ms | **PASS** | **Proves 1000-record truncation eliminated.** Returns items 1001–1020; 0 duplicate IDs with page 50. |
| **TL-05** | Timeline Terminal Page | `GET /api/v1/admin/patients/:id/medical-records/timeline` | `ADMIN` | `page=52&limit=20` | 200 OK | 200 OK | 14ms | **PASS** | Final page (items 1021–1040); `hasNextPage: false`, `hasPreviousPage: true`. |
| **TL-06** | Timeline Out-of-Range | `GET /api/v1/admin/patients/:id/medical-records/timeline` | `ADMIN` | `page=999&limit=20` | 200 OK | 200 OK | 9ms | **PASS** | Out-of-range returns graceful empty array `[]`; `totalItems: 1040` preserved. |
| **TL-07** | Timeline Schema Envelope | `GET /api/v1/admin/patients/:id/medical-records/timeline` | `ADMIN` | Validation | Valid Shape | Valid Shape | 2ms | **PASS** | Envelope matches `{ success: true, statusCode: 200, message, data: [...], meta }`. |
| **OCR-01** | Active Referral Access | `GET /api/v1/ocr/review` | `DOCTOR` (Fac A) | Query pending review queue | 200 OK | 200 OK | 48ms | **PASS** | Doctor A affiliated with Facility A can access OCR job linked to active referral. |
| **OCR-02** | Cross-Facility Isolation | `POST /api/v1/ocr/review/:id` | `DOCTOR` (Fac B) | `{ reviewStatus: 'APPROVED' }` | 403 Forbidden | 403 Forbidden | 41ms | **PASS** | Doctor B (Facility B) strictly rejected when attempting to review Facility A's job. |
| **OCR-03** | Completed Referral Rejection | `POST /api/v1/ocr/review/:id` | `DOCTOR` (Fac A) | `{ reviewStatus: 'APPROVED' }` | 403 Forbidden | 403 Forbidden | 28ms | **PASS** | Completed historical referral does NOT grant facility review authorization. |
| **OCR-04** | Cancelled Referral Rejection | `POST /api/v1/ocr/review/:id` | `DOCTOR` (Fac A) | `{ reviewStatus: 'APPROVED' }` | 403 Forbidden | 403 Forbidden | 20ms | **PASS** | Cancelled referral does NOT grant facility review authorization. |
| **OCR-05** | Soft-Deleted Referral Rejection | `POST /api/v1/ocr/review/:id` | `DOCTOR` (Fac A) | `{ reviewStatus: 'APPROVED' }` | 403 Forbidden | 403 Forbidden | 17ms | **PASS** | Soft-deleted referral (`isDeleted: true`) does NOT grant facility review authorization. |
| **OCR-06** | Expired Referral Rejection | `POST /api/v1/ocr/review/:id` | `DOCTOR` (Fac A) | `{ reviewStatus: 'APPROVED' }` | 403 Forbidden | 403 Forbidden | 17ms | **PASS** | Expired referral (`expiresAt < now`) does NOT grant facility review authorization. |
| **OCR-07** | Direct ReferralAttachment Active | `POST /api/v1/ocr/review/:id` | `DOCTOR` (Fac A) | `{ reviewStatus: 'APPROVED', reviewNotes: '...' }` | 200 OK | 200 OK | 34ms | **PASS** | Direct attachment on active referral grants authorized Facility A doctor access. |
| **OCR-08** | Direct ReferralAttachment Cross-Facility | `POST /api/v1/ocr/review/:id` | `DOCTOR` (Fac B) | `{ reviewStatus: 'APPROVED' }` | 403 Forbidden | 403 Forbidden | 16ms | **PASS** | Direct attachment on Facility A referral rejected for Facility B doctor. |
| **OCR-09** | Direct ReferralAttachment Completed | `POST /api/v1/ocr/review/:id` | `DOCTOR` (Fac A) | `{ reviewStatus: 'APPROVED' }` | 403 Forbidden | 403 Forbidden | 19ms | **PASS** | Direct attachment on completed referral rejected for Facility A doctor. |
| **OCR-10** | Global Admin Review Scope | `POST /api/v1/ocr/review/:id` | `ADMIN` | `{ reviewStatus: 'APPROVED', reviewNotes: 'Override' }` | 200 OK | 200 OK | 9ms | **PASS** | Platform Admin has global authorization to review OCR jobs across all facilities. |
| **TX-01** | Missing Corrections Validation | `POST /api/v1/ocr/review/:id` | `DOCTOR` (Fac A) | `{ reviewStatus: 'CORRECTED', corrections: [] }` | 400 Bad Request | 400 Bad Request | 4ms | **PASS** | Rejected: corrections must be provided when `reviewStatus` is `CORRECTED`. |
| **TX-02** | Transaction Rollback Integrity | DB State Inspection | System | Query OCR Job status in PostgreSQL | Unmodified | Unmodified | 5ms | **PASS** | Database rolled back cleanly; job remained in `REVIEW_REQUIRED` state. |
| **TX-03** | Duplicate Field Validation | `POST /api/v1/ocr/review/:id` | `DOCTOR` (Fac A) | `{ corrections: [{ fieldName: 'a' }, { fieldName: 'a' }] }` | 400 Bad Request | 400 Bad Request | 22ms | **PASS** | Rejected: duplicate correction supplied for the same field within single review. |
| **CONC-01** | Concurrency Race Condition | Simultaneous `POST /api/v1/ocr/review/:id` | `DOCTOR` (Fac A) | Simultaneous Worker 1 & Worker 2 review submissions | Exactly 1 `200`, 1 `409` | 1 `200`, 1 `409` | 43ms | **PASS** | **Optimistic concurrency lock verified.** Exactly one request succeeded, one received 409 Conflict. |
| **CONC-02** | Database Atomicity Check | DB State Inspection | System | Count verifications in `ocr_verifications` | Exactly 1 | Exactly 1 | 5ms | **PASS** | Zero orphan rows or duplicate verifications created under high concurrency. |
| **DIR-01** | Facilities Pagination Limit | `GET /api/v1/facilities` | `ADMIN` | `page=1&limit=3` vs `page=2&limit=3` | 200 OK | 200 OK | 25ms | **PASS** | Sequential pages return disjoint sets with stable pagination. |
| **DIR-02** | Facilities Response Contract | `GET /api/v1/facilities` | `ADMIN` | `page=1&limit=3` | Raw Array | Raw Array | 2ms | **PASS** | Contract preserved: `data` field contains raw array `[...]` of facility objects. |
| **DIR-03** | Facilities Max Limit Clamp | `GET /api/v1/facilities` | `ADMIN` | `limit=500` | 200 OK | 200 OK | 11ms | **PASS** | Safe upper bound enforcement: `limit=500` safely clamped to `<= 100`. |
| **DIR-04** | Doctors Directory Pagination | `GET /api/v1/doctors` | `ADMIN` | `page=1&limit=2` & `limit=500` | 200 OK | 200 OK | 17ms | **PASS** | Contract preserved: raw array in `data`; `limit=500` clamped to `<= 100`. |
| **DIR-05** | Staff Directory Pagination | `GET /api/v1/staff` | `ADMIN` | `page=1&limit=2` & `limit=500` | 200 OK | 200 OK | 20ms | **PASS** | Contract preserved: raw array in `data`; `limit=500` clamped to `<= 100`. |
| **SEC-03** | Unauthenticated Timeline | `GET /api/v1/admin/patients/:id/medical-records/timeline` | None | None | 401 Unauthorized | 401 Unauthorized | 3ms | **PASS** | JWT guard rejected unauthenticated access. |
| **SEC-04** | Unauthenticated OCR Review | `GET /api/v1/ocr/review` | None | None | 401 Unauthorized | 401 Unauthorized | 2ms | **PASS** | JWT guard rejected unauthenticated access. |
| **SEC-05** | Unauthenticated Doctors | `GET /api/v1/doctors` | None | None | 401 Unauthorized | 401 Unauthorized | 3ms | **PASS** | JWT guard rejected unauthenticated access. |
| **RBAC-01** | Patient -> Admin Timeline | `GET /api/v1/admin/patients/:id/medical-records/timeline` | `PATIENT` | None | 403 Forbidden | 403 Forbidden | 2ms | **PASS** | RBAC guard rejected non-admin user attempting admin timeline. |
| **RBAC-02** | Patient -> OCR Review | `GET /api/v1/ocr/review` | `PATIENT` | None | 403 Forbidden | 403 Forbidden | 2ms | **PASS** | RBAC guard rejected patient attempting clinical document verification. |
| **RBAC-03** | Doctor -> Staff Directory | `GET /api/v1/staff` | `DOCTOR` | None | 403 Forbidden | 403 Forbidden | 1ms | **PASS** | RBAC guard rejected doctor attempting administrative staff directory. |
| **INJ-01** | SQL Injection Defense | `GET /api/v1/admin/patients/:id/.../timeline` | `ADMIN` | `page=1' OR 1=1--&limit=20` | 400 Bad Request | 400 Bad Request | 3ms | **PASS** | Parameter validation pipe rejected malicious SQL string before reaching DB. |
| **INJ-02** | Negative Limit Validation | `GET /api/v1/admin/patients/:id/.../timeline` | `ADMIN` | `page=1&limit=-10` | 400 Bad Request | 400 Bad Request | 2ms | **PASS** | Class-validator rejected negative limit parameter (`limit must not be less than 1`). |
| **LEAK-01** | Data Leakage Prevention | Error Responses Inspection | System | Scan error response bodies for stack traces/SQL | Zero Leaks | Zero Leaks | 2ms | **PASS** | Zero database schema, SQL syntax, or internal file paths leaked in error responses. |

---

## Performance Summary

- **Fastest HTTP Operation:** 1ms (`RBAC-03: Doctor -> Staff Directory` rejection)
- **Average Database Query Latency:** ~18ms across all pagination and authorization checks
- **Concurrency Test Latency:** 43ms (2 simultaneous transactional review requests)
- **Deep Pagination Latency (Items 1001–1020):** 17ms (SQL `UNION ALL` across records and attachments)
- **Tear-Down Duration:** 88ms (Clean deletion of all synthetic entities)

