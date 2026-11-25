# CareID Patient App — Backend Implementation Audit Report

**Audit Target:** Health Vault 360 Enterprise API (`hvapi-main`)  
**Repository Path:** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Auditor:** Senior NestJS Auditor, PostgreSQL/Prisma Specialist & Flutter Integration Architect  
**Audit Date:** October 25, 2026  
**Audit Status:** Complete  
**Client Target:** CareID Patient Flutter App  
**Reported Remote Gateway:** `https://360api.vnvision.in` | **API Prefix:** `/api/v1`  

---

## 1. Executive Summary

An audit was conducted on the `hvapi-main` repository to evaluate the claims made in the **CareID Patient App — Backend Team Response & Integration Specification** and determine actual readiness for Flutter client integration.

### Core Findings
1. **Database Schema & P2021 Error:** The reported `DatabaseError(P2021): The table public.users does not exist` is confirmed as a deployment and provisioning defect. The Prisma schema (`prisma/schema.prisma`) defines `model User` mapped to `"users"`, but no Prisma migration directory (`prisma/migrations`) exists in the repository. The target remote database was never initialized or migrated.
2. **Hardcoded OTP Vulnerability (Critical):** `POST /api/v1/auth/otp/request` and `POST /api/v1/auth/otp/resend` hardcode `const rawOtp = '123456'` directly in `AuthService` without environment switches. No SMS gateway (Twilio, SNS, etc.) is integrated.
3. **Broken Refresh Token Lookup (High):** `AuthService.refreshToken` hashes incoming refresh tokens using `bcrypt.hash(token, 10)` and attempts to query the database using exact equality (`where: { tokenHash }`). Because `bcrypt` uses random salts, this lookup will **always return null**, rendering the replay-attack detection and token rotation flow non-functional as designed.
4. **No Multipart/Binary Uploads (Architectural Reality):** Zero controllers in the monolith handle `multipart/form-data` or binary uploads. `POST /api/v1/attachments`, `POST /api/v1/insurance/ocr/scan`, and `POST /api/v1/patients/me/photo` are strictly **JSON metadata registration** endpoints expecting pre-existing URLs and storage keys.
5. **Mocked OCR Engine:** `POST /api/v1/insurance/ocr/scan` returns hardcoded mock extracted values (`Blue Shield OCR Candidate`, `POL987654321`) with confidence `0.95`. No computer vision or OCR model is executed.
6. **Onboarding API Readiness:** The core onboarding routes (Steps 1–4, progress calculation, emergency contacts, demographics, and insurance link) are implemented and functional, provided the client submits JSON conforming to the verified DTO schemas.

---

## 2. Claim-Verification Matrix

| # | Claim | Evidence Inspected | Status | Risk | Recommended Action |
|:---|:---|:---|:---|:---|:---|
| 1 | API Base URL (`https://360api.vnvision.in`) and Global Prefix (`/api/v1`) | `src/main.ts:26-31`, `docs/deployment/ENVIRONMENT_VARIABLES.md`, `docs/deployment/README.md` | **VERIFIED** | Low | Flutter client should use `https://360api.vnvision.in/api/v1`. |
| 2 | Availability of all 10 reported patient and auth onboarding endpoints | `src/modules/auth/presentation/controllers/auth.controller.ts`, `src/modules/patient/presentation/controllers/patient.controller.ts` | **VERIFIED** | Low | All 10 routes exist and match reported paths. |
| 3 | OTP generation, expiry, verification, attempt limits, and resends | `src/modules/auth/application/use-cases/auth.service.ts:36-107` | **PARTIALLY VERIFIED** | High | 5-min expiry and 3-attempt lock are enforced; but raw OTP is hardcoded to `'123456'` without rate-limiting on initial request. |
| 4 | OTP `123456` is strictly limited to safe dev/test | `src/modules/auth/application/use-cases/auth.service.ts:42,69` | **CONTRADICTED** | **CRITICAL** | `const rawOtp = '123456'` is hardcoded unconditionally across all environments. |
| 5 | SMS provider integration and delivery/error handling | `src/modules/auth/`, `src/modules/notifications/` | **CONTRADICTED** | **HIGH** | No SMS provider (Twilio, AWS SNS, etc.) is integrated in `AuthService`. Message returned is purely simulated. |
| 6 | Access & Refresh Token lifetimes, rotation, and revocation | `src/modules/auth/application/use-cases/auth.service.ts:117-208` | **PARTIALLY VERIFIED** | **HIGH** | Access token (15m) and Refresh token (7d) are signed via JWT. Replay attack check is broken due to random-salt bcrypt DB lookup. |
| 7 | Patient registration and onboarding steps 1–4 | `src/modules/patient/application/use-cases/patient.service.ts:27-180` | **VERIFIED** | Low | Step 1 (`register`), Step 2 (`demographics`), Step 3 (`emergency-contact`), and Step 4 (`insurance`) work sequentially. |
| 8 | Medical summary and address endpoints, validation, persistence | `src/modules/patient/presentation/controllers/patient.controller.ts:192,208`, `patient.service.ts:405,454` | **VERIFIED** | Low | `PATCH /patients/me/address` and `PATCH /patients/me/medical-summary` persist to `patient_profiles`. |
| 9 | Insurance-card registration, upload, retrieval, and OCR | `src/modules/insurance/presentation/controllers/insurance.controller.ts:196-218`, `insurance.service.ts:448-485` | **PARTIALLY VERIFIED** | Medium | Endpoints exist, but OCR returns static mock data. `confirmOcrScan` does not increment `onboardingStep`. |
| 10 | `POST /api/v1/attachments` accepts binary files | `src/modules/medical-record/presentation/controllers/medical-record.controller.ts:133`, `create-attachment.dto.ts` | **CONTRADICTED** | **HIGH** | Accepts only JSON metadata (`fileName`, `fileSize`, `mimeType`, `storageKey`, `storageUrl`). No multipart support. |
| 11 | Attachment storage location, access controls, ownership | `src/modules/medical-record/application/use-cases/medical-record.service.ts:243-320` | **VERIFIED** | Low | Attachment records are bound to `patientProfileId`. Access control denies other patients (`ForbiddenException`). |
| 12 | Malware/content checks exist on uploaded files | `src/modules/medical-record/application/use-cases/medical-record.service.ts:280` | **CONTRADICTED** | Medium | `virusScanStatus: 'CLEAN'` is hardcoded as an unintegrated placeholder. |
| 13 | Patient data isolation across records | `src/modules/patient/application/use-cases/patient.service.ts`, `medical-record.service.ts` | **PARTIALLY VERIFIED** | Medium | Patient profiles and records enforce `patientProfileId`. However, `updateFamilyConsent` lacks caller verification. |
| 14 | Prisma mappings and root cause of `P2021` | `prisma/schema.prisma:25-43`, `src/database/database.service.ts` | **VERIFIED** | **HIGH** | Model mapping `model User -> @@map("users")` is correct. The remote DB simply has not had migrations deployed. |
| 15 | Swagger completeness and DTO match | `docs/swagger-spec.json`, NestJS controller decorators | **VERIFIED** | Low | Swagger spec accurately documents 308 paths and 422 operations. |
| 16 | Postman collection completeness | `Health-Vault-360-API.postman_collection.json` | **VERIFIED** | Low | Collection contains 27 subsystem folders and 422 requests with automated auth test scripts. |
| 17 | Reported count of 308 paths, 422 endpoints, 23 test suites, 125 tests | Repository test runner & JSON inspection | **VERIFIED** | Low | Exact match: 308 paths, 422 operations, 23 suites, 125 tests. |
| 18 | Build and test results & mock usage | Jest test runner, `src/modules/*/tests/` | **VERIFIED** | Low | Build succeeds (`nest build`). Tests pass (125/125), but tests use unit mocks (`jest.fn()`), not real PostgreSQL. |
| 19 | Error response formats, status codes, envelope | `src/common/filters/global-exception.filter.ts`, `response-transform.interceptor.ts` | **VERIFIED** | Low | Standard success envelope `{ success: true, statusCode, message, data, meta }` and error envelope confirmed. |
| 20 | Inconsistencies for CareID Patient app | Cross-cutting analysis | **VERIFIED** | Medium | Documented: Card upload is metadata-only, OCR is mock, OCR confirmation bypasses step increment. |

---

## 3. Confirmed Bugs & Security Findings

### Finding 1: Unconditional Hardcoded OTP Bypass
* **Severity:** **CRITICAL**
* **File:** `src/modules/auth/application/use-cases/auth.service.ts#L42,L69`
* **Evidence:**
  ```typescript
  const rawOtp = '123456';
  const otpHash = await bcrypt.hash(rawOtp, 10);
  ```
* **Reproduction Steps:**
  1. Call `POST /api/v1/auth/otp/request` with any phone number.
  2. Call `POST /api/v1/auth/otp/verify` with `challengeId` and `otpCode: "123456"`.
  3. Login succeeds and issues valid JWTs regardless of environment or phone ownership.
* **Impact:** In a public environment, any account can be accessed by any user entering `123456`.
* **Required Resolution:** Implement real SMS provider integration (Twilio/AWS SNS) and cryptographically secure OTP generation (`crypto.randomInt(100000, 999999)`), with `'123456'` restricted strictly to `NODE_ENV === 'test'` or explicit whitelist.

### Finding 2: Broken Refresh Token Replay Detection (Bcrypt Query Bug)
* **Severity:** **HIGH**
* **File:** `src/modules/auth/application/use-cases/auth.service.ts#L160-L168` & `src/modules/auth/infrastructure/database/auth.repository.ts#L106-L108`
* **Evidence:**
  ```typescript
  // In auth.service.ts
  const tokenHash = await bcrypt.hash(dto.refreshToken, 10);
  const tokenRecord = await this.authRepository.findRefreshToken(tokenHash);

  // In auth.repository.ts
  async findRefreshToken(tokenHash: string): Promise<RefreshTokenEntity | null> {
    return (await this.db.refreshToken.findFirst({ where: { tokenHash } })) as RefreshTokenEntity | null;
  }
  ```
* **Impact:** `bcrypt.hash()` incorporates a random 128-bit salt each time it is invoked. Querying `WHERE tokenHash = $1` will never match an existing record. `tokenRecord` is always `null`. Consequently, revoked token detection and replay attack prevention fail silently.
* **Required Resolution:** Store and query deterministic cryptographic hashes (e.g. SHA-256) for token lookup, or query by session/user ID and verify via `bcrypt.compare()`.

### Finding 3: Missing Remote Database Migrations (Root Cause of P2021)
* **Severity:** **HIGH** (Deployment Blocker)
* **File:** `prisma/schema.prisma` vs remote database instance
* **Evidence:** `DatabaseError(P2021): The table public.users does not exist in the current database.`
* **Investigation:** The repository contains no `prisma/migrations` folder. Neither `prisma migrate deploy` nor `prisma db push` was executed against the database hosting `360api.vnvision.in`.
* **Required Resolution:** DevOps must execute `npx prisma db push` (or generate and run migrations) against the target PostgreSQL instance.

### Finding 4: OCR Confirmation Does Not Advance Onboarding Step
* **Severity:** **MEDIUM**
* **File:** `src/modules/insurance/application/use-cases/insurance.service.ts#L466-L485`
* **Evidence:**
  `InsuranceService.confirmOcrScan` creates a policy in `insurance_policies`, but fails to update `patient_profiles.onboarding_step` to `4`.
* **Impact:** If Flutter uses `POST /api/v1/insurance/ocr/confirm`, the policy is saved, but `GET /api/v1/patients/onboarding/progress` will still report Step 4 as incomplete.
* **Required Resolution for Flutter:** Use `POST /api/v1/patients/onboarding/insurance` to finalize Step 4.

### Finding 5: Missing Caller Authorization on Family Consent Update
* **Severity:** **MEDIUM**
* **File:** `src/modules/patient/application/use-cases/patient.service.ts#L286-L311`
* **Evidence:** `updateFamilyConsent(consentId, dto)` updates consent status without checking if the authenticated `userId` matches the invitee or profile owner.
* **Impact:** Any authenticated user who knows a `consentId` can accept or reject family linkage invitations.

---

## 4. Attachment & OCR Architectural Clarification

A critical architectural distinction must be communicated to the Flutter engineering team:

```
[Flutter App] ──(1) Upload binary to Object Store / S3 / CDN──> [Storage Provider]
      │                                                                │
      │                                                    Returns storageUrl & storageKey
      │                                                                │
      ▼                                                                ▼
[Flutter App] ──(2) POST /api/v1/attachments (JSON Metadata)──> [HVAPI Backend]
```

1. **No Binary Multipart Support:** The backend does not accept multipart image files directly.
2. **Contract:** Flutter must upload the image (e.g., front/back of insurance card) to the cloud storage bucket/CDN, obtain the URL and key, and call `POST /api/v1/attachments` with `CreateAttachmentDto`.
3. **OCR Engine:** `POST /api/v1/insurance/ocr/scan` is a mock stub. It does not inspect the image at `imageUrl`.

---

## 5. Local Testing & Verification Results

All tests were executed locally without connecting to remote or production databases:
* **TypeScript Compilation:** Passed (`npm run build` completed with code 0).
* **Unit Test Suite:** Passed (23 test suites, 125 tests).
* **Dependency Check:** `prisma: ^7.9.1` added to `devDependencies` in `package.json` to resolve local CLI execution and match `@prisma/client: ^7.9.1`.

---

## 6. Files Changed During Audit

| File | Change Description | Justification |
|:---|:---|:---|
| `package.json` | Added `"prisma": "^7.9.1"` to `devDependencies` | Enables `npm run prisma:generate` and local compilation matching `@prisma/client` without network fetch. |
| `docs/careid-patient-endpoint-inventory.json` | Created verified machine-readable endpoint inventory | Precise route and DTO mapping for Flutter developers. |
| `docs/careid-patient-backend-audit.md` | Created official audit report | Documents audit findings, bug verifications, and architectural constraints. |

---

## 7. Remaining Risks & Required Approvals

1. **Remote Database Migration Approval:** DevOps must apply Prisma schema migrations to `https://360api.vnvision.in`.
2. **Production SMS Provider Integration:** Architecture team approval needed for selecting and configuring an SMS provider (Twilio, AWS SNS) before production launch.
3. **Production File Upload Storage Architecture:** Clarification required on pre-signed S3/GCS bucket credentials for direct client mobile uploads.
