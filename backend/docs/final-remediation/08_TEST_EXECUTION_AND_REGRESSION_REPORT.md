# CAREID MASTER BACKEND — TEST EXECUTION & REGRESSION REPORT

**Document ID:** CRID-DOC-REM-08  
**Test Framework:** Jest 30.x + ts-jest 29.x  
**Execution Timestamp:** 2026-11-18T08:45:00.000Z  
**Runtime:** Node.js v24.14.0 on Windows Server / x64  
**Coverage Target:** CareID Healthcare Ecosystem Backend API  

---

## 1. Test Execution Summary

| Metric | Result |
|---|---|
| Total Unit Test Suites Executed | 93 Suites |
| Total Unit Tests Executed | 1,411 Tests |
| Unit Tests Passing | **1,411 Tests (100% Pass Rate)** |
| Unit Tests Failing | 0 Tests |
| New Purpose-Built Regression Suites | 2 Suites (18 Tests) |
| Live DB Integration Suites (Excluded from offline build) | 2 Suites (Requires live PostgreSQL 127.0.0.1:5432) |
| Compilation Verification (`nest build`) | **Exit Code 0 (Clean Compilation)** |

---

## 2. Key Test Suites Passing

### New Remediation Suites
1. **`src/modules/appointment/tests/appointment-hold-durability.spec.ts`**
   - 11 Tests, 0 Failures (15.64 s)
   - Verified: Hold creation with DB serialization, simulated process restart crash recovery, automatic expired hold slot unlock, creator-only release, staff/admin override release, creator booking conversion, foreign user hold hijacking rejection, check-in physiological vitals validation, patient privacy scoping, doctor privacy scoping.
2. **`src/modules/treatment-offer/tests/discount-facility-authorization.spec.ts`**
   - 7 Tests, 0 Failures (16.16 s)
   - Verified: Non-staff rejection, attending physician self-approval rejection, out-of-facility staff supervisor rejection, in-facility staff supervisor approval with audit generation, platform admin cross-facility approval, >30% platform ceiling rejection.

### Existing Subsystem Suites Passing
- `src/modules/appointment/tests/appointment.service.spec.ts` (PASS)
- `src/modules/appointment/tests/appointment.controller.spec.ts` (PASS)
- `src/modules/appointment/tests/appointment-stages-11-16.spec.ts` (PASS)
- `src/modules/treatment-offer/tests/treatment-offer.service.spec.ts` (PASS)
- `src/modules/treatment-offer/tests/treatment-offer-stage8-9.spec.ts` (PASS)
- `src/modules/admin/tests/admin.service.spec.ts` (PASS)
- `src/modules/admin/tests/phase-12-master-engineering-repair.spec.ts` (PASS)
- `src/modules/admin/tests/admin-doctor-creation.spec.ts` (PASS)
- `src/modules/admin/tests/admin-patients-records.spec.ts` (PASS)
- `src/modules/admin/tests/phase-11-admin-restoration.spec.ts` (PASS)
- `src/modules/admin/tests/phase-2-deep-verification.spec.ts` (PASS)
- `src/modules/admin/tests/phase-3.1-remediation.spec.ts` (PASS)
- `src/modules/admin/tests/phase-3.2-remediation.spec.ts` (PASS)
- `src/modules/auth/tests/password-login.spec.ts` (PASS)
- `src/modules/auth/tests/proxy-trust.spec.ts` (PASS)
- `src/modules/auth/tests/phase-2-security-regression.spec.ts` (PASS)
- `src/common/utils/tests/file-security.util.spec.ts` (PASS)
- `src/common/utils/tests/cors.util.spec.ts` (PASS)
- `src/common/logger/tests/pino-redaction.spec.ts` (PASS)

---

## 3. Live vs In-Memory Test Reconciliation

The forensic pre-deployment audit identified that previous reports claimed 169 tests across 4 files, which was a reporting confusion with the 132 tests in all 10 admin test files. The accurate baseline is now firmly established:
- **Total Mocked / Unit Tests:** 1,411 tests across 93 test suites, all passing cleanly.
- **Live Integration Tests:** Suites named `*real-pg*`, `*live*`, or `*integration.spec*` connect to live local PostgreSQL or live HTTP endpoints on port 3073. These suites are intended for CI/CD environments where local PostgreSQL is running and seeded.

---
**Verified By:** QA Automation Lead & DevOps Release Engineer  
**Status:** ALL TESTS VERIFIED & DOCUMENTED
