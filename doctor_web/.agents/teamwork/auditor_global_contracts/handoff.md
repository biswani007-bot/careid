# FORENSIC AUDIT REPORT: CareID Stages 6–15 Static Verification & Global API Contract Analysis

**Auditor**: Forensic Auditor (auditor_global_contracts)  
**Date**: November 9, 2026  
**Workspace**: `d:\New folder\New folder\doctor web\doctor-web-frontend-main`  
**Integrity Mode**: Demo (per `ORIGINAL_REQUEST.md`)  
**Verdict**: **PARTIAL COMPLIANCE / CONTRACT GAPS IDENTIFIED** (Static Quality Gates PASS; Zero Code Modifications; 4 Stages have NO Backend API in Postman; 3 Stages bypass available Postman APIs)

---

## 1. Observation

### 1.1 Static Verification Commands Output
All quality verification commands were executed from the workspace root:

1. **TypeScript Type Check**:
   - Command: `npm run type-check` (`tsc -b --noEmit`)
   - Exit Code: `0`
   - Stdout:
     ```
     > doctor-web-frontend@0.1.0 type-check
     > tsc -b --noEmit
     ```
   - Stderr: *(None)*

2. **ESLint Code Quality**:
   - Command: `npm run lint` (`eslint .`)
   - Exit Code: `0`
   - Stdout:
     ```
     > doctor-web-frontend@0.1.0 lint
     > eslint .
     ```
   - Stderr: *(None)*

3. **Vite Production Build**:
   - Command: `npm run build` (`tsc -b && vite build`)
   - Exit Code: `0`
   - Duration: `7.08s`
   - Stdout:
     ```
     vite v6.4.5 building for production...
     transforming...
     ✓ 1673 modules transformed.
     rendering chunks...
     computing gzip size...
     dist/index.html                                      0.94 kB │ gzip:   0.54 kB
     dist/assets/patient-avatar-hero-Bl82rVt4.png         5.53 kB
     dist/assets/careid-card-logo-Bjm3fhnY.png           19.04 kB
     dist/assets/scanned-lab-report-DXtgyO6y.png         21.86 kB
     dist/assets/cath-lab-fluoroscopy-DptCxNGo.png       35.93 kB
     dist/assets/careid-security-shield-BMneS90f.png    133.68 kB
     dist/assets/careid-logo-CHIgI4ME.png               285.04 kB
     dist/assets/careid-auth-logo-C790OuH6.png          516.53 kB
     dist/assets/careid-cloud-mark-Bqgtf55b.png         954.92 kB
     dist/assets/index-C7s3Y_td.css                     107.31 kB │ gzip:  16.77 kB
     dist/assets/index-Cm09t7Eh.js                    1,307.65 kB │ gzip: 275.79 kB
     ✓ built in 7.08s
     ```

### 1.2 Workspace Integrity & Git Audit
1. **Git Status & Repository Check**:
   - Command: `git status`
   - Exit Code: `1`
   - Output: `fatal: not a git repository (or any of the parent directories): .git`
   - Forensic Finding: The directory `doctor-web-frontend-main` is an extracted archive release and does not contain a `.git` version control database.
2. **File Modification & Baseline Integrity**:
   - Recursive file inspection of `src/` revealed the newest file timestamp was `09-11-2026 22:20:19` (`src/pages/patients/PatientProfilePage.tsx`).
   - Stages 1 through 5 files (`src/pages/treatment-offers/TreatmentOfferCreatePage.tsx`, timestamp `09-11-2026 22:12:32`) were untouched during this audit session.
   - Zero source code files, zero configuration files, and zero UI components were modified during this audit session.
   - Only agent state metadata files (`.agents/teamwork/auditor_global_contracts/`) and compilation artifacts (`dist/`, `tsconfig.tsbuildinfo`) were written.

### 1.3 Postman Collection Scope & Structure
Authoritative source file inspected: `Postman collection/CareID-Staging.postman_collection.json`  
- **Collection Name**: `CareID API — Staging Integration Collection (November 6, 2026 Release)`
- **Top-Level Folders Count**: `27`
- **Total Requests in Collection**: `559`

Key Top-Level Folders Audited:
- `01. Environment & Health Checks` (3 requests)
- `02. Authentication & OTP` (9 requests)
- `03. User Profile & Account` (8 requests)
- `04. Admin Portal & System Operations` (39 requests)
- `05. Doctor Portal` (39 requests)
- `06. Patient App` (33 requests)
- `07. Digital Health Cards & Passes` (16 requests)
- `08. Medical Records (General, Dental & Vision)` (28 requests)
- `09. Facilities & Branches` (20 requests)
- `10. Appointments, Schedules & Shifts` (29 requests)
- `14. Notifications & Alerts` (29 requests)
- `15. OCR & Document Verification` (19 requests)
- `16. File Uploads & Attachments` (8 requests)
- `20. Clinical Reports & Analytics` (34 requests)
- `27. Healthcare Financing & Financial Assistance` (9 requests)

---

## 2. Logic Chain & Stage-by-Stage Forensic Analysis (Stages 6–15)

```
[Postman Collection (559 reqs)]  <-- Cross-Audit -->  [Frontend src/routes/index.tsx & src/pages/]
                 │                                                           │
       ┌─────────┴─────────────────────────────────────────┐                 │
       │                                                   │                 │
[Available Endpoints]                             [Missing Endpoints]        │
• Doctor Treatment Offers (7)                     • Pre-Op Clearance         │
• Patient Offer Accept/Reject (2)                 • Hold Review / Temp Hold  │
• Appointments (Book, List, Status)               • Pre-Op Readiness Gates   │
• Facilities & Rooms                              • Dedicated Day-of-Checkin │
       │                                                   │                 │
       ▼                                                   ▼                 ▼
Stage 6, 7, 8: Fully Integrated             Stage 9, 11, 14, 15: Missing Backend APIs
Stage 10, 12, 13: Bypassed Available APIs   Frontend Uses Facade / Local State / Toasts
```

### Stage 6: Clinical Review
- **Route**: `/treatment-offers/:id/review`
- **Component**: `src/pages/treatment-offers/TreatmentOfferReviewPage.tsx` (762 lines)
- **Backend API Contract (Postman)**:
  * `GET /api/v1/doctors/treatment-offers/:offerId` (Folder `05. Doctor Portal`)
    - Method: `GET`
    - URL: `{{baseUrl}}/api/v1/doctors/treatment-offers/:offerId`
    - Response: `TreatmentOfferDTO` containing `offerNumber`, `patientProfileId`, `procedures`, `netPayable`, `status`, `version`.
  * `POST /api/v1/doctors/treatment-offers/:offerId/dispatch` (Folder `05. Doctor Portal`)
    - Method: `POST`
    - URL: `{{baseUrl}}/api/v1/doctors/treatment-offers/:offerId/dispatch`
    - Request Body: `{ "expectedVersion": <number> }`
    - Response: Updated `TreatmentOfferDTO` with `status: "DISPATCHED"`, `dispatchedAt: "<ISO timestamp>"`, optimistic locking `version: 2`.
- **Frontend Observation**:
  - `TreatmentOfferReviewPage.tsx` lines 145–160 invoke `treatmentOfferService.getTreatmentOffer(id)` on mount and upon direct URL access.
  - Line 213: `treatmentOfferService.dispatchTreatmentOffer(offer.offerId, expectedVersion)` submits the lock & dispatch request live to the backend.
  - Successfully advances to `/treatment-offers/:id/status`.
- **Logic Assessment**: **AUTHENTIC & FULLY IMPLEMENTED**. Both query and mutation contracts match Postman Folder 05.

### Stage 7: Dispatched Status
- **Route**: `/treatment-offers/:id/status` & `/treatment-offers/:id/sent`
- **Component**: `src/pages/treatment-offers/TreatmentOfferStatusPage.tsx` (787 lines)
- **Backend API Contract (Postman)**:
  * `GET /api/v1/doctors/treatment-offers/:offerId/status` (Folder `05. Doctor Portal`)
    - Method: `GET`
    - URL: `{{baseUrl}}/api/v1/doctors/treatment-offers/:offerId/status`
    - Response: `{ "id": "...", "offerNumber": "...", "status": "DISPATCHED", "isExpired": false, "validUntil": "...", "version": 1, "dispatchedAt": "...", "patientViewedAt": "...", "patientRespondedAt": "..." }`
  * `POST /api/v1/doctors/treatment-offers/:offerId/cancel` (Folder `05. Doctor Portal`)
    - Method: `POST`
    - URL: `{{baseUrl}}/api/v1/doctors/treatment-offers/:offerId/cancel`
    - Request Body: `{ "cancellationReason": "string", "expectedVersion": <number> }`
    - Response: `TreatmentOfferDTO` with `status: "CANCELLED"`.
- **Frontend Observation**:
  - `TreatmentOfferStatusPage.tsx` line 144 calls `treatmentOfferService.getTreatmentOfferStatus(id)`.
  - Line 256: `treatmentOfferService.cancelTreatmentOffer(offer.offerId, cancelReason, expectedVersion)` cancels offer live.
  - Polling interval periodically checks lifecycle state; when `status === 'RATIFIED_ACCEPTED'`, navigates to Stage 8.
- **Logic Assessment**: **AUTHENTIC & FULLY IMPLEMENTED**.

### Stage 8: Offer Accepted
- **Route**: `/treatment-offers/:id/accepted`
- **Component**: `src/pages/treatment-offers/TreatmentOfferAcceptedPage.tsx` (852 lines)
- **Backend API Contract (Postman)**:
  * `GET /api/v1/doctors/treatment-offers/:offerId` (Folder `05. Doctor Portal`)
    - Returns ratified state: `status: "RATIFIED_ACCEPTED"`, `patientRespondedAt`, `financingEligible`.
  * `POST /api/v1/patients/treatment-offers/:offerId/accept` (Folder `06. Patient App`)
    - Method: `POST`
    - Request Body: `{ "signatureConsent": true, "patientResponseNotes": "string", "expectedVersion": <number> }`
- **Frontend Observation**:
  - `TreatmentOfferAcceptedPage.tsx` verifies that the offer status is `RATIFIED_ACCEPTED` or `ACCEPTED`.
  - Renders authentic financing terms and patient signature consent timestamps.
  - Action button "Proceed to Pre-Op Clearance" navigates to `/treatment-offers/:id/clearance`.
- **Logic Assessment**: **AUTHENTIC & FULLY IMPLEMENTED**.

### Stage 9: Pre-Op Clearance
- **Route**: `/treatment-offers/:id/clearance`
- **Component**: `src/pages/treatment-offers/ClinicalHandoffPage.tsx` (777 lines)
- **Backend API Contract (Postman)**:
  * Audit result across all 559 requests: **ZERO pre-op clearance endpoints exist in Postman.**
  * No endpoint exists for `/api/v1/clearance`, `/api/v1/pre-op-clearance`, or clinical handoff state persistence.
- **Frontend Observation**:
  - `ClinicalHandoffPage.tsx` lines 74–97 query `treatmentOfferService.getTreatmentOffer(id)` and `patientService.getPatientById(patientProfileId)`.
  - Clearance gate cards (Cardiology clearance, Anesthesia consultation, Diagnostic ECG, Coagulation Labs) are present in UI but clearance statuses are static local component state.
  - Line 119: `handleAdvanceToScheduling` simply executes:
    `navigate('/treatment-offers/' + offer.offerId + '/schedule', { state: offer });`
  - Zero backend persistence occurs.
- **Logic Assessment**: **PARTIALLY IMPLEMENTED (UI Shell Complete; Backend API Missing in Postman)**.

### Stage 10: Suite Scheduling
- **Route**: `/treatment-offers/:id/schedule`
- **Component**: `src/pages/treatment-offers/ProcedureSchedulingPage.tsx` (`initialMode="select"`, 1472 lines)
- **Backend API Contract (Postman)**:
  * Relevant endpoints available in Postman:
    - `GET /api/v1/facilities/:id/rooms` (Folder `09. Facilities & Branches`)
    - `GET /api/v1/doctors/:id/slots` (Folder `05. Doctor Portal`)
    - `GET /api/v1/schedules/:id/slots` (Folder `10. Appointments, Schedules & Shifts`)
- **Frontend Observation**:
  - Lines 455–514 contain hardcoded suites and slots ("Cath Lab Suite 3", "08:30 AM – 10:00 AM", "Selected • Handoff Hold").
  - The component does not call `GET /api/v1/facilities/:id/rooms` or `GET /api/v1/schedules/:id/slots`.
  - Line 145: `handleProceedToReview` navigates to `/treatment-offers/:id/schedule/review` carrying React Router state without any backend scheduling reservation.
- **Logic Assessment**: **PARTIALLY IMPLEMENTED (Bypasses Available Postman Scheduling APIs; Uses Hardcoded Slots)**.

### Stage 11: Hold Review
- **Route**: `/treatment-offers/:id/schedule/review`
- **Component**: `src/pages/treatment-offers/ProcedureSchedulingPage.tsx` (`initialMode="review"`)
- **Backend API Contract (Postman)**:
  * Audit result across all 559 requests: **ZERO temporary slot hold or hold review endpoints exist in Postman.**
  * Postman has calendar exception blocking (`POST /api/v1/schedules/:id/block`), but no hold expiration or release endpoint for procedure suites.
- **Frontend Observation**:
  - Displays "Slot Confirmation & Final Review" (Figma 1:10786).
  - Line 304: `onClick={() => triggerToast('Slot hold verified: Active for 42 mins.')}` simulates hold verification via toast.
  - Line 155: `handleConfirmBooking` transitions state to `confirmed` without backend verification.
- **Logic Assessment**: **PARTIALLY IMPLEMENTED (UI Shell Complete; Backend Hold API Missing in Postman; Toast Simulation)**.

### Stage 12: Slot Confirmed
- **Route**: `/treatment-offers/:id/scheduled`
- **Component**: `src/pages/treatment-offers/ProcedureSchedulingPage.tsx` (`initialMode="confirmed"`)
- **Backend API Contract (Postman)**:
  * Postman has authentic booking endpoint:
    - `POST /api/v1/appointments` (Folder `10. Appointments, Schedules & Shifts`)
    - Method: `POST`
    - Request Body:
      ```json
      {
        "doctorProfileId": "string",
        "patientProfileId": "string",
        "facilityId": "string",
        "appointmentDate": "2026-11-15",
        "startTime": "09:30",
        "endTime": "11:00",
        "durationMinutes": 90,
        "type": "IN_PERSON",
        "reason": "Diagnostic catheterization",
        "notes": "Procedure scheduled from treatment offer"
      }
      ```
    - Response (201 Created): Returns appointment object with `id`, `appointmentNumber`, `status: "CONFIRMED"`.
- **Frontend Observation**:
  - `ProcedureSchedulingPage.tsx` line 155:
    ```typescript
    const handleConfirmBooking = () => {
      setMode('confirmed');
      navigate(`/treatment-offers/${offer.offerId}/scheduled`, { state: offer });
      triggerToast('Procedure #PROC-2026-93458 locked into Cath Lab Suite 3.');
    };
    ```
  - Does NOT call `POST /api/v1/appointments`. The appointment is not persisted in the database.
- **Logic Assessment**: **PARTIALLY IMPLEMENTED (Backend Booking API Exists in Postman but Frontend Does Not Call It; Fabricated Confirmation State)**.

### Stage 13: Appointment Ledger
- **Route**: `/treatment-offers/:id/appointment`
- **Component**: `src/pages/treatment-offers/AppointmentDetailsPage.tsx` (752 lines)
- **Backend API Contract (Postman)**:
  * `GET /api/v1/appointments/:id` (Folder `10. Appointments, Schedules & Shifts`)
  * `GET /api/v1/appointments/doctor/me` (Folder `10. Appointments, Schedules & Shifts`)
- **Frontend Observation**:
  - Lines 100–122: Instead of fetching an appointment by ID from `/api/v1/appointments/:id`, the component synthesizes an appointment object from the offer:
    ```typescript
    const appointment: AppointmentRecord = {
      appointmentId: offer.offerId ? `#PROC-${offer.offerId.slice(0, 8).toUpperCase()}` : '',
      scheduledTime: '09:30 AM – 11:00 AM EST',
      arrivalWindow: '07:30 AM EST (2 Hours Prior)',
      suite: 'Cath Lab Suite (Interventional Wing)',
      anesthesiaProtocol: 'MAC Tier 1 Standby (Mild conscious sedation / Local lidocaine 1%)',
      readinessPercentage: 60,
      ...
    };
    ```
- **Logic Assessment**: **PARTIALLY IMPLEMENTED (Backend API Exists in Postman but Frontend Synthesizes Mock Ledger from Treatment Offer)**.

### Stage 14: Pre-Op Readiness
- **Route**: `/treatment-offers/:id/pre-op`
- **Component**: `src/pages/treatment-offers/PreOpReadinessPage.tsx` (787 lines)
- **Backend API Contract (Postman)**:
  * Audit result across all 559 requests: **ZERO surgical pre-op readiness gate endpoints exist in Postman.**
- **Frontend Observation**:
  - Lines 136–157: Checklist has 11 gates. Interactive toggle states (`labCleared`, `anesthesiaCleared`) calculate dynamic readiness percentage:
    `const clearedCount = 8 + (labCleared ? 2 : 0) + (anesthesiaCleared ? 1 : 0);`
  - Line 151: `handleSignOffAndAdvance` validates clearance locally and navigates to `/check-in`. Zero backend persistence.
- **Logic Assessment**: **PARTIALLY IMPLEMENTED (UI Shell Complete; Backend API Missing in Postman)**.

### Stage 15: Day-of-Checkin
- **Route**: `/treatment-offers/:id/check-in` & `/treatment-offers/:id/day-of-checkin`
- **Component**: `src/pages/treatment-offers/DayOfCheckinPage.tsx` (703 lines)
- **Backend API Contract (Postman)**:
  * Audit result across all 559 requests: **ZERO dedicated Day-of-Checkin workflow endpoints exist in Postman.**
  * Generic status update endpoint `PUT /api/v1/appointments/:id/status` exists in Folder 10, but is not wired to check-in.
- **Frontend Observation**:
  - Line 114: `handleBeginVerification` executes `navigate('/treatment-offers/' + offer.offerId + '/cath-lab-safety', { state: offer });`.
  - Zero backend check-in API call is dispatched.
- **Logic Assessment**: **PARTIALLY IMPLEMENTED (UI Shell Complete; Backend Dedicated Check-In API Missing in Postman)**.

---

## 3. Global Summary Matrix (Stages 6–15)

| Stage | Name | Registered Route | Frontend Component | Postman API Available? | Status in Frontend | Backend Gap / Integrity Finding |
|:---:|:---|:---|:---|:---:|:---:|:---|
| **6** | Clinical Review | `/treatment-offers/:id/review` | `TreatmentOfferReviewPage` | ✅ YES (Folder 05) | Live API | Authentic lock & dispatch via `POST /api/v1/doctors/treatment-offers/:id/dispatch` |
| **7** | Dispatched Status | `/treatment-offers/:id/status` | `TreatmentOfferStatusPage` | ✅ YES (Folder 05) | Live API | Authentic status poll & cancel via `GET .../status` & `POST .../cancel` |
| **8** | Offer Accepted | `/treatment-offers/:id/accepted` | `TreatmentOfferAcceptedPage` | ✅ YES (Folder 05 & 06) | Live API | Validates `RATIFIED_ACCEPTED` status; test simulation helper available |
| **9** | Pre-Op Clearance | `/treatment-offers/:id/clearance` | `ClinicalHandoffPage` | ❌ **NO API** | Local State | Zero clearance APIs in Postman; checklist unpersisted |
| **10** | Suite Scheduling | `/treatment-offers/:id/schedule` | `ProcedureSchedulingPage` | ⚠️ YES (Folder 09 & 10) | Hardcoded | Postman room & slot APIs exist; frontend uses hardcoded slots |
| **11** | Hold Review | `/treatment-offers/:id/schedule/review` | `ProcedureSchedulingPage` | ❌ **NO API** | Local State / Toast | Zero hold review/reservation APIs in Postman; toast simulation |
| **12** | Slot Confirmed | `/treatment-offers/:id/scheduled` | `ProcedureSchedulingPage` | ⚠️ YES (Folder 10) | Fabricated | Postman `POST /api/v1/appointments` exists; frontend does not call it |
| **13** | Appointment Ledger | `/treatment-offers/:id/appointment` | `AppointmentDetailsPage` | ⚠️ YES (Folder 10) | Synthesized | Postman `GET /api/v1/appointments/:id` exists; frontend synthesizes ledger from offer |
| **14** | Pre-Op Readiness | `/treatment-offers/:id/pre-op` | `PreOpReadinessPage` | ❌ **NO API** | Local State | Zero pre-op readiness checklist APIs in Postman |
| **15** | Day-of-Checkin | `/treatment-offers/:id/check-in` | `DayOfCheckinPage` | ❌ **NO API** | Local State | Zero dedicated check-in APIs in Postman; generic appointment status not wired |

---

## 4. Caveats & Invalidation Conditions

1. **Backend Server Execution**: This forensic audit is static and contract-based against `Postman collection/CareID-Staging.postman_collection.json`. Dynamic network calls against the live staging server (`https://360api.vnvision.in/api/v1`) were not executed as part of this static audit.
2. **Postman Collection Versioning**: The findings are strictly based on `CareID API — Staging Integration Collection (November 6, 2026 Release)`. If a subsequent collection release adds endpoints for Pre-Op Clearance or Pre-Op Readiness, the "Missing Backend API" classification would be updated accordingly.
3. **Appointment Linkage Architecture**: In the CareID data model, a Treatment Offer is an authored financial/clinical proposal. Stages 10–13 currently lack a backend foreign-key binding mechanism to link a created `AppointmentDTO` back to a `TreatmentOfferDTO`.

---

## 5. Conclusion & Actionable Recommendations

1. **Quality Gates Passed**: Zero TypeScript errors, zero ESLint errors, and clean Vite production build (7.08s).
2. **Repository Integrity Maintained**: Stages 1 through 5 and all existing source code files remain 100% untouched.
3. **Backend API Readiness Split**:
   - **Stages 6–8**: Production-ready with live backend contracts.
   - **Stages 10, 12, 13**: Backend endpoints already exist in Postman Folders 09 & 10 (`/api/v1/facilities/:id/rooms`, `/api/v1/schedules/:id/slots`, `POST /api/v1/appointments`, `GET /api/v1/appointments/:id`). The frontend services need to wire these real endpoints rather than bypassing them with hardcoded slots and synthesized objects.
   - **Stages 9, 11, 14, 15**: Critical backend API gaps. The backend team must deliver official REST endpoints in the Postman collection for Pre-Op Clearance, Procedural Suite Holds, Pre-Op Checklist Gates, and Clinical Check-In.

---

## 6. Verification Method

To independently reproduce and verify this forensic audit:

1. **Run Static Verification**:
   ```powershell
   npm run type-check
   npm run lint
   npm run build
   ```
   *Expected: All 3 commands exit with code 0.*

2. **Verify Repository Cleanliness**:
   ```powershell
   Get-ChildItem -Path src -Recurse -File | Sort-Object LastWriteTime -Descending | Select-Object -First 5
   ```
   *Expected: Latest write time in src/ is prior to audit start (22:20:19).*

3. **Verify Postman Missing APIs**:
   ```powershell
   node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json')); const str = JSON.stringify(data).toLowerCase(); ['clearance', 'pre-op', 'checkin', 'cath-lab'].forEach(k => console.log(k, str.includes(k)));"
   ```
   *Expected: No procedural clearance or checklist endpoints exist.*
