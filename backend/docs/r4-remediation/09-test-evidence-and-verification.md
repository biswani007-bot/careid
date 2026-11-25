# CareID R4: Test Evidence & Verification Methodology

**Document ID:** `CAREID-R4-DOC-09`  
**Execution Environment:** Node.js v24.14.0 / Jest 30.0.0 / ts-jest 29.4.12 / Prisma 7.10.1  
**Target Subsystems:** Entire CareID Backend (Auth, Users, Admin, Appointments, Billing, Insurance, OCR, AI-OCR, Consultations, Clinical Records, Facilities, Audit)  
**Status:** VERIFIED  

---

## 1. Test Methodology & Integrity Commitments

In accordance with strict healthcare engineering integrity guidelines:

1. **Unit / Mock-Based Test Suites vs Live Infrastructure:**
   - Unit and mocked integration test suites test application business logic, authorization guards, validation pipes, transaction rollbacks, and error mappings in-memory without requiring network services or physical database daemons.
   - Live integration suites that require a running local PostgreSQL daemon or a live local Python PaddleOCR worker are explicitly distinguished. They are **never** reported as executed when the underlying local daemon is offline.
2. **Zero Synthetic Data in Production Code:**
   - Tests assert that production handlers reject requests when dependencies fail (HTTP 503 / HTTP 404), rather than injecting fake patient, doctor, or lab data.
3. **Deterministic Assertions:**
   - All tests use deterministic expectations, clean mock lifecycle hooks (`beforeEach(jest.clearAllMocks)`), and strict UUID/schema validation.

---

## 2. Core Remediated Test Suites (R4 Focused)

### 2.1 OCR Authorization & Fallbacks Elimination
File: `src/modules/ocr/tests/ocr-authorization-and-fallbacks.spec.ts`  
Status: **14 / 14 PASSED (100%)**

| Test Case | Description | Result |
|---|---|---|
| `Patient A view own job` | Submitter identity matches caller `userId` | **PASS (200)** |
| `Patient A view own job via attachment` | Job attachment `patientProfileId` matches caller | **PASS (200)** |
| `Patient A access Patient B job` | IDOR attempt on `getJobById` blocked | **PASS (403 Forbidden)** |
| `Patient A access Patient B text` | IDOR attempt on `getJobText` blocked | **PASS (403 Forbidden)** |
| `Patient A access Patient B fields` | IDOR attempt on `getJobFields` blocked | **PASS (403 Forbidden)** |
| `Patient A access Patient B JSON` | IDOR attempt on `getJobJson` blocked | **PASS (403 Forbidden)** |
| `Admin platform-wide access` | `ADMIN` / `SUPER_ADMIN` can access any job | **PASS (200)** |
| `Doctor facility access` | Doctor with active facility overlap can access job | **PASS (200)** |
| `Doctor unaffiliated access` | Doctor without relationship is blocked | **PASS (403 Forbidden)** |
| `findJobsScoped caller scoping` | Caller `userId` filters job listing | **PASS (Scoped)** |
| `findJobs unscoped listing` | Unauthenticated / admin caller gets full listing | **PASS (Unscoped)** |
| `Missing file clean failure` | Missing source file throws `NotFoundException`, job `FAILED` | **PASS (404)** |
| `Missing worker client clean failure`| Missing worker client throws `ServiceUnavailableException`, job `FAILED` | **PASS (503)** |
| `Worker success: false clean failure`| Worker error throws `ServiceUnavailableException`, job `FAILED` | **PASS (503)** |

---

### 2.2 AI OCR Confirmation & IDOR Protection
File: `src/modules/ai-ocr/tests/ai-ocr.service.spec.ts`  
Status: **9 / 9 PASSED (100%)**

| Test Case | Description | Result |
|---|---|---|
| `Service defined` | Dependency injection wiring | **PASS** |
| `Upload and save extraction` | Valid image processed via buffer/file | **PASS (200)** |
| `Unresolvable image` | Throws `BadRequestException` (no sample doc fallback) | **PASS (400)** |
| `Worker client missing` | Throws `ServiceUnavailableException` (no John Doe fallback) | **PASS (503)** |
| `Worker error reporting` | Throws `ServiceUnavailableException` on worker error | **PASS (503)** |
| `Confirm non-owner patient` | IDOR attempt on `confirmOcr` blocked | **PASS (403 Forbidden)** |
| `Confirm owner patient` | Patient confirms own document | **PASS (200 CONFIRMED)** |
| `Confirm admin bypass` | Admin confirms document without patient profile | **PASS (200 CONFIRMED)** |
| `Duplicate confirmation` | Reject repeated confirmation on already confirmed document | **PASS (400 Bad Request)** |

---

### 2.3 Insurance OCR & IDOR Protection
File: `src/modules/insurance/tests/insurance.service.spec.ts`  
Status: **27 / 27 PASSED (100%)**

| Test Case Group | Key Verifications | Result |
|---|---|---|
| `scanInsuranceCard` | Valid PDF scanned via worker buffer; `isSimulated: false` | **PASS (200)** |
| `Worker client missing` | Throws `ServiceUnavailableException` (zero simulated fallbacks) | **PASS (503)** |
| `Neither file nor imageUrl` | Throws `BadRequestException` | **PASS (400)** |
| `Confirm non-owner patient` | IDOR attempt on `confirmOcrScan` blocked | **PASS (403 Forbidden)** |
| `Confirm admin bypass` | Admin confirms OCR record without having patient profile | **PASS (200)** |
| `Security headers` | Private cache, `nosniff`, `Cache-Control` on served cards | **PASS** |
| `File access IDOR` | Non-owner patient blocked from accessing foreign card file | **PASS (403 Forbidden)** |
| `File security validation` | Size limits, magic bytes binary header validation | **PASS (400)** |

---

### 2.4 OCR Review Workflow & History Security
File: `src/modules/ocr/tests/ocr-review-history.spec.ts`  
Status: **16 / 16 PASSED (100%)**

- Facility scoping & multi-tenancy on review queue (Admin platform-wide, Doctor/Staff facility scoped, cross-facility denial).
- Atomic verification transactions with concurrency guards and rollback verification.
- Audit logging on every review step.

---

### 2.5 OCR Worker Client Infrastructure
File: `src/modules/ocr/tests/ocr-worker.client.spec.ts`  
Status: **12 / 12 PASSED (100%)**

- Liveness and readiness probing (`/health`, `/readiness`).
- Local filesystem execution (`/ocr/process`).
- Remote binary multipart streaming (`/ocr/process-buffer`).
- Network timeout and service unavailable error propagation.
