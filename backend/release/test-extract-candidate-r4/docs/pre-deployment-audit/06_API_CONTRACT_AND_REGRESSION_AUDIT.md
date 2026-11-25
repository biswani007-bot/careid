# 06 — API CONTRACT AND REGRESSION AUDIT
**Project:** CareID Healthcare Ecosystem (Backend API)  
**Date:** November 18, 2026  
**Auditor:** Principal Software Architect, Senior QA Automation Lead  
**Audit Mode:** STRICT READ-ONLY FORENSIC CONTRACT & TEST AUDIT  

---

## 1. AUTOMATED TEST EVIDENCE AUDIT & DISCREPANCY RECONCILIATION

### 1.1. Reported Baseline vs Forensic Execution
The supplied engineering reports claimed the following test execution baseline:
- `phase-12-master-engineering-repair.spec.ts`: 8 tests
- `admin.service.spec.ts`: 124 tests
- `appointment.service.spec.ts`: 15 tests
- `treatment-offer.service.spec.ts`: 22 tests
- **Reported Total:** 169 tests

### 1.2. Actual Test Runner Results
Executing Jest directly on the exact four test files:

```bash
npx jest \
  src/modules/admin/tests/phase-12-master-engineering-repair.spec.ts \
  src/modules/admin/tests/admin.service.spec.ts \
  src/modules/appointment/tests/appointment.service.spec.ts \
  src/modules/treatment-offer/tests/treatment-offer.service.spec.ts \
  --verbose
```

**Actual Execution Result:**
- `phase-12-master-engineering-repair.spec.ts`: **8 passed**
- `admin.service.spec.ts`: **15 passed** (14 `it()` blocks)
- `appointment.service.spec.ts`: **15 passed**
- `treatment-offer.service.spec.ts`: **36 passed**
- **Actual Total:** **74 tests passed (0 failures, 16.38s)**

```text
Test Suites: 4 passed, 4 total
Tests:       74 passed, 74 total
Snapshots:   0 total
Time:        16.385 s
```

### 1.3. Root Cause of the Discrepancy
- The figure of 124 tests previously reported for `admin.service.spec.ts` was an error in documentation. `admin.service.spec.ts` contains exactly 14 `it()` test blocks.
- The entire `src/modules/admin/tests/` directory contains 10 separate `.spec.ts` files comprising 132 tests total (`admin-doctor-creation.spec.ts`, `admin-doctor-registration.spec.ts`, `admin-patients-records.spec.ts`, `phase-11-admin-restoration.spec.ts`, `phase-12-e2e-journeys.spec.ts`, etc.).
- While all 74 executed unit tests passed with 100% success, the claim of 169 tests in those specific 4 files was factually inaccurate.

### 1.4. Mock vs Real Database Usage
- **All 74 tests execute against in-memory Jest mocks (`jest.fn()`).**
- **Zero unit tests connect to or execute against a real PostgreSQL database.**
- Concurrency locks (`FOR UPDATE`), database transaction aborts, unique constraint collisions, and foreign key cascades are simulated in JavaScript, not executed against PostgreSQL engine internals.
- **Auditor Note:** Mocked unit tests confirm domain logic and exception throwing, but do NOT prove real staging database behavior.

---

## 2. API CONTRACT RECONCILIATION & DISCREPANCIES

### 2.1. Pre-Operative Readiness Checklist Contract

| Field Name | Documented in Prior Runbook / Matrix | Actual in `UpdateReadinessDto` | Present in Postman Collection | Authoritative Contract Status |
|---|---|---|---|---|
| `fastingConfirmed` | Missing in Runbook cURL | Present (`boolean`) | Present (`true`) | **AUTHORITATIVE** |
| `medicationHoldConfirmed` | Missing in Runbook cURL | Present (`boolean`) | Present (`true`) | **AUTHORITATIVE** |
| `transportationArranged` | Missing in Runbook cURL | Present (`boolean`) | Present (`true`) | **AUTHORITATIVE** |
| `consentVerified` | Missing in Runbook cURL | Present (`boolean`) | Present (`true`) | **AUTHORITATIVE** |
| `vitalsWithinThreshold` | Missing in Runbook cURL | Present (`boolean`) | Present (`true`) | **AUTHORITATIVE** |
| `labWorkConfirmed` | Documented in Runbook cURL | **Not in DTO** | Not in Postman | **OBSOLETE / INVALID** |
| `consentSigned` | Documented in Runbook cURL | **Not in DTO** | Not in Postman | **OBSOLETE / INVALID** |
| `fastingCompliant` | Documented in Runbook cURL | **Not in DTO** | Not in Postman | **OBSOLETE / INVALID** |
| `anesthesiaCleared` | Documented in Runbook cURL | **Not in DTO** | Not in Postman | **OBSOLETE / INVALID** |
| `imagingUploaded` | Documented in Runbook cURL | **Not in DTO** | Not in Postman | **OBSOLETE / INVALID** |

**Forensic Finding:**  
`C:\Users\PABANI\CareID_Doctor_application\CareID-Staging.postman_collection.json` (line 33326) confirms the authoritative contract is top-level boolean fields (`fastingConfirmed`, `medicationHoldConfirmed`, `transportationArranged`, `consentVerified`, `vitalsWithinThreshold`). Sending the nested `"checklist": { "labWorkConfirmed": false, ... }` payload causes `class-validator` to ignore the fields, resulting in all 5 required checks evaluating to false, which permanently blocks a `decision: 'GO'`.

### 2.2. Patient Check-In Payload Contract

| Attribute | Documented in Matrix | Actual in `AppointmentCheckInDto` | Present in Postman Collection | Authoritative Status |
|---|---|---|---|---|
| Bed Assignment Field | `bedNumber: string` | `bedOrBayNumber?: string` | `bedOrBayNumber: "PRE-OP-BAY-03"` | **`bedOrBayNumber` is Authoritative** |
| Intake Notes Field | `intakeNotes: string` | `notes?: string` | `notes: "Patient checked in..."` | **`notes` is Authoritative** |
| Vitals Object | `{ vitals: ... }` | `{ vitals: ... }` | `{ vitals: ... }` | **Aligned** |

**Forensic Finding:**  
If a client submits `bedNumber` instead of `bedOrBayNumber`, the DTO parser ignores it and falls back to default `'PRE-OP-BAY-1'`. Clients must use `bedOrBayNumber` as defined in `AppointmentCheckInDto` and Postman collection item 33362.

### 2.3. OCR Supported Extensions Contract
- **Documented in Acceptance Matrix:** 6 formats (`.pdf`, `.png`, `.jpg`, `.jpeg`, `.tiff`, `.bmp`).
- **Actual Code Implementation (`ocr.service.ts` line 456):** 8 formats (`.png`, `.jpg`, `.jpeg`, `.tiff`, `.tif`, `.bmp`, `.webp`, `.pdf`).
- **Status:** The code is more permissive than documented; both `.webp` and `.tif` are supported.

---

## 3. FRONTEND BACKWARD COMPATIBILITY EVALUATION

| Frontend Application | Stack / Repository | Evaluated Compatibility | Compatibility Assessment |
|---|---|---|---|
| **Doctor Web** | React / TypeScript (`careiddoctor.vnvision.in`) | **COMPATIBLE** | No breaking changes to `TreatmentOfferDto` or `FinancingPackageDto`. Normalizing `tenureMonths` prevents errors if Doctor Web sends a single integer. |
| **Doctor Mobile** | Flutter (`CareID_Doctor_application`) | **COMPATIBLE** | Postman collection in Doctor Mobile app repo confirms 100% alignment with backend DTOs for readiness and check-in. |
| **Patient Mobile** | Flutter (`Care_ID_Patient_App-main`) | **COMPATIBLE** | Offer acceptance and appointment viewing payloads remain unchanged. |
| **Admin Web** | Next.js (`360api.vnvision.in`) | **COMPATIBLE & RESTORED** | Lucas Vance patient profile fix resolves the HTTP 500 crash on page 12 pagination. |

---

## 4. CONCLUSION

Frontend API contracts are **BACKWARD-COMPATIBLE**. The test suite is **100% PASSING (74/74 tests)**. Documentation errors regarding checklist field names and test counts are fully reconciled.
