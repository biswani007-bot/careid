# CareID Doctor Web — Master Goal 004: Verified Defect Register

**Project**: CAREID — Health Vault 360  
**Title**: Comprehensive Inventory of Identified, Verified, and Remediated Defects  
**Artifact ID**: `DOCTOR_WEB_GOAL004_VERIFIED_DEFECT_REGISTER`  
**Execution Timestamp**: 2026-11-21T13:50:00Z  
**Total Cataloged Defects**: 9 | **Remediated**: 9 | **Outstanding P0/P1**: 0  

---

## Defect Inventory

### Defect 1: BUILD-DEFECT-01
- **Severity**: P0 — Critical Build Failure
- **Affected Area**: Frontend build system (`doctor_web`)
- **Reproduction**: Running `npm run build` in `doctor_web/` resulted in 10 TypeScript compilation errors (`TS6133`, `TS2339`).
- **Root Cause**: Unused imported icons in `AuditExportCenterPage.tsx` and `EhrIntegrationPage.tsx`; unused role check variable in `AuthContext.tsx`; incorrect property access (`user?.doctorProfile?.id` instead of `user?.id`) in `ScheduleManagementPage.tsx`.
- **Status**: **RESOLVED**. Build passes with 0 errors.

### Defect 2: SEC-DEFECT-01
- **Severity**: P0 — Security / Authorization Bypass
- **Affected Area**: Backend Messaging Module (`messaging.service.ts`)
- **Reproduction**: An authenticated doctor was able to read conversation messages and post to threads between unrelated clinicians and patients.
- **Root Cause**: `getConversationById`, `getMessages`, `sendMessage`, and `markAsRead` omitted participant validation checks against `c.doctorProfile.userId` and `c.patientProfile.userId`.
- **Status**: **RESOLVED**. Enforced strict participant check returning `403 Forbidden`.

### Defect 3: SEC-DEFECT-02
- **Severity**: P0 — Clinical Integrity / Unauthorized Modification
- **Affected Area**: Backend Scheduling Module (`schedule.service.ts`, `schedule.controller.ts`)
- **Reproduction**: A doctor could issue `PUT /schedules/:id` or generate slots on a schedule belonging to another doctor without permission checks.
- **Root Cause**: Controller endpoints lacked `@Req()` user injection into service calls; service lacked schedule doctorProfile ownership checks for non-admin callers.
- **Status**: **RESOLVED**. Passed user context and enforced doctor ownership check returning `403 Forbidden`.

### Defect 4: AUDIT-DEFECT-01
- **Severity**: P1 — Functional Bug / Missing Route
- **Affected Area**: Frontend Audit Export Center (`AuditExportCenterPage.tsx`)
- **Reproduction**: Navigating to `/reports/exports` generated network request to `GET /api/v1/audit/logs` returning `404 Not Found`.
- **Root Cause**: Endpoint route mismatch; backend security audit trail is served at `/api/v1/security/audit`.
- **Status**: **RESOLVED**. Pointed fetch to `/api/v1/security/audit` and mapped response fields.

### Defect 5: OUTCOMES-DEFECT-01
- **Severity**: P1 — Access Control Misconfiguration
- **Affected Area**: Backend Reports Controller (`reports.controller.ts`)
- **Reproduction**: Authenticated doctors received `403 Forbidden` when opening Clinical Outcomes at `/reports/outcomes` querying `GET /api/v1/reports/analytics/modules/patient`.
- **Root Cause**: `ReportsController` class-level decorator restricted access to `ADMIN`, `SUPER_ADMIN`, and `FACILITY_ADMIN`. Method `getModuleAnalytics` lacked method-level `@Roles(..., 'DOCTOR')`.
- **Status**: **RESOLVED**. Added `@Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN', 'DOCTOR')` to `getModuleAnalytics`.

### Defect 6: ENV-DEFECT-01
- **Severity**: P1 — Integration Environment Connection Refusal
- **Affected Area**: Frontend build configuration (`doctor_web/.env`) & Nginx bundle
- **Reproduction**: Browser interactions on `http://localhost:5173` attempted API calls to `http://localhost:3000` instead of the integration backend at `http://localhost:3001`.
- **Root Cause**: Static bundle compiled with default port 3000; `.env` specified `VITE_API_BASE_URL="http://localhost:3000"`.
- **Status**: **RESOLVED**. Updated `.env` to `http://localhost:3001`, recompiled production bundle, copied to container `/usr/share/nginx/html`, and reloaded Nginx.

### Defect 7: EHR-DEFECT-01
- **Severity**: P2 — Synthetic UI Metric
- **Affected Area**: Frontend EHR Monitor (`EhrIntegrationPage.tsx`)
- **Reproduction**: Latency card displayed static "12ms" with synthetic `setTimeout` on manual sync without querying backend.
- **Root Cause**: Lack of dynamic network measurement to platform health endpoint.
- **Status**: **RESOLVED**. Connected latency measurement to live round-trip time of `/api/v1/health`.

### Defect 8: SCHED-DEFECT-01
- **Severity**: P1 — Clinical Multi-Tenant Isolation & Schedule Save Failure
- **Affected Area**: Frontend Schedule Management (`ScheduleManagementPage.tsx`)
- **Reproduction**: Clinician without an existing schedule visited `/settings/schedule`. Due to fallback `list[0]`, the UI displayed the schedule of another clinician (`drSarahJenkins`). When saving edits, the frontend submitted `updateSchedule(foreignScheduleId)`, resulting in a `403 Forbidden` error.
- **Root Cause**: Unsafe fallback `|| list[0]` in schedule selection logic: `list.find(...) || list[0] || null`.
- **Status**: **RESOLVED**. Removed `|| list[0]`, defaulting strictly to `null` so doctors without an existing schedule trigger `createSchedule` and cannot accidentally target foreign schedules.

### Defect 9: TEST-DEFECT-01
- **Severity**: P1 — Integration Test Suite Throttling Flakiness
- **Affected Area**: Backend Rate Limiting (`auth-rate-limiter.service.ts`, `test-inbox.controller.ts`)
- **Reproduction**: Running test suites back-to-back (`test_batch3_security.cjs`, `test_goal003_suite.cjs`, `test_goal004_regression.cjs`) resulted in HTTP 429 Too Many Requests on `POST /api/v1/auth/otp/request` for test phone `+16505550003`, blocking subsequent test runs.
- **Root Cause**: Strict production rate limiter (3 OTP requests per 10 minutes) applied uniformly to synthetic test phone numbers (`+1...555...`) even within sandbox test environments (`ENABLE_LOCAL_SMS_INBOX=true`).
- **Status**: **RESOLVED**. Exempted synthetic sandbox test phone numbers when `ENABLE_LOCAL_SMS_INBOX=true && NODE_ENV !== 'production'`, and added test rate limit reset capability to `TestInboxController`.
