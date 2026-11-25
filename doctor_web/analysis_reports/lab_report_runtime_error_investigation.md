# CAREID DOCTOR WEB — LAB REPORT PAGE RUNTIME ERROR FORENSIC REPORT

**Date:** November 10, 2026  
**Route Under Audit:** `/records/labs?patientId=:patientId`  
**Target File:** `src/pages/records/LabReportPage.tsx`  
**Backend Base URL:** `https://360api.vnvision.in/api/v1`  
**Target Patient:** Marcus Doe (`787e5187-7859-4320-bb1a-465a57dd086a`), MRN: `PT-CAREID-2026-0004`  
**Reported Exception:** `Cannot read properties of undefined (reading 'firstName')`  
**Reported Stack Trace Location:** `LabReportPage.tsx:300:90`  

---

## 1. Root Cause Analysis

### 1.1 The Exact Vulnerable Code Expression
In `src/pages/records/LabReportPage.tsx`:
```tsx
const patientName =
  patient?.fullName ||
  (record as unknown as { patient?: { firstName?: string; lastName?: string } }).patient?.firstName
    ? `${(record as unknown as { patient: { firstName?: string; lastName?: string } }).patient.firstName || ''} ${(record as unknown as { patient: { firstName?: string; lastName?: string } }).patient.lastName || ''}`.trim()
    : 'Authorized Patient';
```

### 1.2 Why the Error Occurred
1. **Backend Payload Structure:**  
   When the doctor queries a medical record from `GET /api/v1/doctors/patients/:patientProfileId/medical-records` or `GET /api/v1/medical-records/:id`, the backend entity `MedicalRecord` does **not** include an embedded `patient` relation object (`'patient' in record === false`).
2. **The Asynchronous Timing Hole:**  
   When `record` was fetched, but `patient` demographics were still resolving asynchronously (or if `patient.fullName` was undefined), the code evaluated the ternary condition:  
   `(record as unknown as ...).patient?.firstName ? ...`  
   Because `record.patient` is undefined, `(record as unknown as ...).patient?.firstName` evaluated to `undefined` (falsy).
3. **The Unsafe Cast Access:**  
   In certain branch conditions where `record.patient` was expected, the right-hand evaluation attempted direct dot-access:  
   `...(record as unknown as { patient: { firstName?: string; lastName?: string } }).patient.firstName`  
   Because `patient` was undefined on `record`, JavaScript threw:  
   `TypeError: Cannot read properties of undefined (reading 'firstName')`.

### 1.3 Audit of Other Affected Files
The identical unsafe cast pattern was discovered and fixed in:
- `src/pages/records/RadiologyViewerPage.tsx`
- `src/pages/records/RecordDetailPage.tsx`
- `src/services/reportService.ts`

---

## 2. Asynchronous Lifecycle & Race Condition Fix

### 2.1 Decoupling `fetchLabData` from `isListLoading`
- **Issue:** On mount with `/records/labs?patientId=787e5187-...`, `isListLoading` was in the `useCallback` dependency array. When `isListLoading` transitioned from `true` to `false`, it triggered a duplicate, redundant API fetch.
- **Fix:** Added `awaitingListResolution`:
  ```tsx
  const queryPatientId = searchParams.get('patientId') || searchParams.get('id');
  const awaitingListResolution = !queryPatientId && isListLoading;
  ```
  When `queryPatientId` is present, `fetchLabData` executes immediately once without waiting for `usePatientList`.

### 2.2 Controlled Textarea Reversion Fix
- **Issue:** Erasing clinical notes in `LabReportPage.tsx` caused the textarea to revert back to `record.clinicalNotes` because of `value={clinicalNotes || (record.clinicalNotes || '')}`.
- **Fix:** Populated `clinicalNotes` into state upon record loading (`setClinicalNotes(rec.clinicalNotes || '')`) and bound `value={clinicalNotes}` directly.

### 2.3 Elimination of Hardcoded Patient Fallbacks
- In `src/services/reportService.ts`, hardcoded strings `'Marcus Doe'` and `'PT-CAREID-2026-0004'` were eliminated and replaced with authentic resolution via `patientService.getDoctorPatientProfile(targetPatientId)`.

---

## 3. Safe Dynamic Patient Name Resolution Order

Across all four affected records modules, patient naming now uses the resilient, safe fallback chain:
```tsx
const recPatient = (record as unknown as { patient?: { firstName?: string; lastName?: string; fullName?: string } }).patient;

const patientName =
  patient?.fullName?.trim() ||
  [patient?.firstName, patient?.lastName].filter(Boolean).join(' ').trim() ||
  recPatient?.fullName?.trim() ||
  [recPatient?.firstName, recPatient?.lastName].filter(Boolean).join(' ').trim() ||
  (patient?.patientNumber ? `Patient #${patient.patientNumber}` : '') ||
  (record.patientProfileId ? `Patient #${record.patientProfileId.slice(0, 8)}` : 'Patient Record');
```

---

## 4. Verification Evidence Matrix

An automated test script ([`tests/verify_lab_report_page_fix.cjs`](file:///d:/New%20folder/New%20folder/doctor%20web/doctor-web-frontend-main/tests/verify_lab_report_page_fix.cjs)) was executed against the staging backend:

| Test Case | Scenario | Verification Result |
| :--- | :--- | :---: |
| **Test 1** | Inspect Marcus Doe profile API (`GET /doctors/patients/787e...`) | **200 OK** (`firstName: "Marcus", lastName: "Doe"`) |
| **Test 2** | Inspect Medical Record structure | **200 OK** (`'patient' in record === false`) |
| **Test 3** | Original Crash Reproduction | Caught `TypeError: Cannot read properties of undefined (reading 'firstName')` on old code. Fixed mapping produces `"Marcus Doe"` without error. |
| **Test 4** | Non-existent Patient ID (`00000000-...`) | **404 Not Found** cleanly surfaced to error state |
| **Test 5a** | Missing name fields | Produces clean fallback without hardcoded fake names |
| **Test 5b** | Empty records array (`[]`) | Transitions cleanly to "No Laboratory Reports Found" |
| **Test 5c** | Diagnostic lab matching | Correctly identifies laboratory panel |

### Quality Gates
- **`npm run type-check`**: **PASSED (0 errors)**
- **`npm run lint`**: **PASSED (0 errors, 0 warnings)**
- **`npm run build`**: **PASSED (1676 modules transformed, dist built cleanly in 5.56s)**

