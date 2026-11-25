# Comprehensive Investigation Report — Module A: Consultations & Treatment Lifecycle (`/treatment-offers`)

**Timestamp**: 2026-11-09T17:18:00Z  
**Investigator**: explorer_survey_module_a_1 (Teamwork Explorer)  
**Target Module**: Module A — Consultations & Treatment Lifecycle Dashboard (`/treatment-offers`)  
**Workspace**: `d:\New folder\New folder\doctor web\doctor-web-frontend-main`  
**State Folder**: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_survey_module_a_1`

---

## 1. Observation

### 1.1 Route Configuration & Layout Structure
- **Route Definition**:
  - Located in `src/routes/index.tsx` at lines 427–430:
    ```tsx
    // src/routes/index.tsx:427-430
    {
      path: '/treatment-offers',
      element: <TreatmentOffersDashboardPage />,
    },
    ```
  - Layout Wrapper: The route is nested inside `ProtectedLayout` (`src/routes/index.tsx`: lines 54–74, 184), which verifies authentication via `useAuth().isAuthenticated` and renders `<PatientLayout />` (`src/components/layout/PatientLayout.tsx`).
  - Layout Hierarchy:
    - `App.tsx` -> `RouterProvider` (`router`)
    - `ProtectedLayout` (`src/routes/index.tsx`: line 73 renders `<PatientLayout />`)
    - `PatientLayout.tsx`:
      - CareID Header (logo, search input, notifications button, doctor avatar & profile menu).
      - Left Sidebar (`isPatientsRoute` triggers on `/treatment-offers`).
      - Breadcrumbs bar (`src/components/layout/Breadcrumbs.tsx`).
      - `<Outlet />` containing `<TreatmentOffersDashboardPage />`.
  - Component Container (`src/pages/treatment-offers/TreatmentOffersDashboardPage.tsx`: line 108):
    - Root DOM: `<div className="flex flex-col gap-6 w-full max-w-[1280px] mx-auto pb-16 font-['Plus_Jakarta_Sans',sans-serif] text-[#0f172a]">`
    - Structural Subsections:
      1. Header Banner (lines 110–138): Title "Treatment Offer & Clinical Consultation Lifecycle", badge "18-Stage Trajectory", doctor name & facility display, and CTA button "New Consultation / Treatment Offer" navigating to `/treatment-offers/new/step-1`.
      2. Top Metric Cards (lines 141–197): 4-column responsive grid displaying "Total Consultations", "Active / Scheduled", "Accepted & Financed", and "Procedures Completed".
      3. 18-Step Pipeline Stepper (lines 199–233): Card with title "CareID 18-Stage Clinical & Financing Trajectory" and a 9-column responsive grid of 18 navigation pills.
      4. Consultation Listing Card (lines 236–452): Card containing tab filter buttons ("All", "Active", "Accepted", "Completed"), search bar, refresh button, and consultation items list.

### 1.2 Dashboard Statistics Implementation & Static/Mock Values
- **Code Location**: `src/pages/treatment-offers/TreatmentOffersDashboardPage.tsx`, lines 76–84:
  ```tsx
  // Statistics
  const stats = useMemo(() => {
    const total = consultations.length;
    const active = consultations.filter((c) => c.status === 'SCHEDULED' || c.status === 'CONFIRMED' || c.status === 'IN_PROGRESS').length;
    const accepted = consultations.filter((c) => c.offerStatus === 'ACCEPTED' || c.offerStatus === 'PROCEDURE_READY').length;
    const completed = consultations.filter((c) => c.status === 'COMPLETED' || c.offerStatus === 'COMPLETED').length;

    return { total, active, accepted, completed };
  }, [consultations]);
  ```
- **Observations on Statistics Data Flow**:
  1. Numbers are computed dynamically via `useMemo` from `consultations: ConsultationItem[]`.
  2. While the calculations themselves are not hardcoded static numbers in the JSX, the underlying data fed to `stats` comes from `consultationService.listConsultations()`, which mixes real appointment calls with static/mock attributes and local browser storage.
  3. Static Procedural & Facility Injections in `consultationService.ts` (lines 148–174):
     - Every appointment received from `/api/v1/appointments/doctor/me` is stamped with:
       - `cptCode: 'CPT #93458'` (hardcoded static string)
       - `procedureName: 'Left Heart Catheterization with Coronary Angiogram'` (hardcoded static string)
       - `facilityName: String(fac.name || 'Metro General Hospital')` (hardcoded fallback)
       - `doctorName: 'Attending Physician'` (hardcoded fallback)
       - `offerStatus: status === 'COMPLETED' ? 'COMPLETED' : 'DISPATCHED'` (simulated mapping)
  4. Local Storage Fallback Injection (`consultationService.ts`: lines 204–236):
     - Reads `localStorage.getItem('careid_treatment_offers_store')`.
     - Injects saved offers with default fallback `status: 'IN_PROGRESS'`, `offerStatus: 'ACCEPTED'`, `appointmentTime: '10:00 AM'`.
  5. **Crucial Backend Gap in Current Implementation**:
     - The backend has a dedicated endpoint: `GET /api/v1/doctors/treatment-offers` (documented in Postman: `05. Doctor Portal > List authored treatment proposals`).
     - Current `consultationService.ts` **never calls** `GET /api/v1/doctors/treatment-offers`!
     - As a result, treatment proposals authored by the doctor on the backend are completely missing from statistics and listings unless stored in the browser's local storage.
     - There is no single official backend statistics endpoint for consultations (e.g. `/api/v1/doctors/consultations/statistics` does not exist; `GET /api/v1/doctors/statistics` returns platform-wide doctor directory counts: `{ totalDoctors, verifiedDoctors, pendingDoctors, suspendedDoctors }`).

### 1.3 18-Stage Clinical & Financing Trajectory Definition, Rendering & State
- **Definition**: Defined in `src/pages/treatment-offers/TreatmentOffersDashboardPage.tsx` at lines 86–105:
  ```tsx
  const lifecycleStages = [
    { num: 1, name: 'CPT Selection', path: '/treatment-offers/new/step-1' },
    { num: 2, name: 'Pricing & Discount', path: '/treatment-offers/new/step-2' },
    { num: 3, name: 'Financing Package', path: '/treatment-offers/new/step-3' },
    { num: 4, name: 'Terms & Remarks', path: '/treatment-offers/new/step-4' },
    { num: 5, name: 'Attestation', path: '/treatment-offers/new/step-5' },
    { num: 6, name: 'Clinical Review', path: '/treatment-offers/TR-8921/review' },
    { num: 7, name: 'Dispatched Status', path: '/treatment-offers/TR-8921/status' },
    { num: 8, name: 'Offer Accepted', path: '/treatment-offers/TR-8921/accepted' },
    { num: 9, name: 'Pre-Op Clearance', path: '/treatment-offers/TR-8921/clearance' },
    { num: 10, name: 'Suite Scheduling', path: '/treatment-offers/TR-8921/schedule' },
    { num: 11, name: 'Hold Review', path: '/treatment-offers/TR-8921/schedule/review' },
    { num: 12, name: 'Slot Confirmed', path: '/treatment-offers/TR-8921/scheduled' },
    { num: 13, name: 'Appointment Ledger', path: '/treatment-offers/TR-8921/appointment' },
    { num: 14, name: 'Pre-Op Readiness', path: '/treatment-offers/TR-8921/pre-op' },
    { num: 15, name: 'Day-of-Checkin', path: '/treatment-offers/TR-8921/check-in' },
    { num: 16, name: 'Cath Lab Safety', path: '/treatment-offers/TR-8921/cath-lab-safety' },
    { num: 17, name: 'Encounter Induction', path: '/treatment-offers/TR-8921/encounter' },
    { num: 18, name: 'Active Documentation', path: '/treatment-offers/TR-8921/in-progress' },
  ];
  ```
- **Rendering**: Lines 213–232:
  - Rendered as an interactive 18-stage grid (`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-2`).
  - Each item is a clickable `<button>` with a numeric circle (`stage.num`), title (`stage.name`), and `ChevronRight` icon.
  - Hover states: `hover:bg-purple-50 hover:border-purple-300`, `group-hover:text-[#3f1d8b]`.
- **Navigation & State Handling**:
  - `onClick={() => navigate(stage.path)}`.
  - Stages 1–5 navigate to `/treatment-offers/new/step-1` through `step-5` (TreatmentOfferCreatePage).
  - Stages 6–18 **hardcode the mock offer ID `TR-8921`** directly in the route path!
  - There is currently no active stage highlighting or backend lifecycle status binding on these 18 buttons in the dashboard (all pills look identical in idle state).
  - Downstream pages (e.g. `TreatmentOfferAcceptedPage.tsx:29`, `ClinicalHandoffPage.tsx:29`, `ProcedureSchedulingPage.tsx:40`) load state from `(location.state as TreatmentOfferState) || DEFAULT_OFFER_STATE`. When navigating directly from this stepper, `location.state` is undefined, causing downstream pages to fall back to the static `DEFAULT_OFFER_STATE` mock object (`offerId: 'TR-8921'`, `patientId: 'PT-ACTIVE'`).

### 1.4 Consultation Listing: Tables, Cards, Filtering & Actions
- **Rendering**: Lines 345–450 in `TreatmentOffersDashboardPage.tsx`:
  - Card list divided by `divide-y divide-slate-100`.
  - Patient Monogram: 2-character uppercase monogram derived from `item.patientName` (`lines 347–352`).
  - Patient Identification: Displays `item.patientName` and `item.patientMrn` in monospace font badge.
  - Status Badge (lines 372–382):
    - `COMPLETED`: `bg-emerald-50 text-emerald-700 border-emerald-200`
    - `IN_PROGRESS`: `bg-amber-50 text-amber-700 border-amber-200`
    - Default/Scheduled: `bg-purple-50 text-[#3f1d8b] border-purple-200`
  - Clinical Information: `item.procedureName || item.title`.
  - Date & Facility: `item.appointmentDate • item.appointmentTime || '10:00 AM'`, `item.facilityName`, and `item.cptCode`.
- **Filtering Logic** (lines 65–71):
  - `'all'`: displays all items matching `searchQuery`.
  - `'active'`: `c.status === 'SCHEDULED' || c.status === 'CONFIRMED' || c.status === 'IN_PROGRESS'`
  - `'accepted'`: `c.offerStatus === 'ACCEPTED' || c.offerStatus === 'PROCEDURE_READY'`
  - `'completed'`: `c.status === 'COMPLETED' || c.offerStatus === 'COMPLETED'`
- **Patient Search** (lines 54–63):
  - Matches `searchQuery.toLowerCase()` against `patientName`, `patientMrn`, `procedureName`, and `title`.
- **Manual Refresh** (lines 296–303):
  - `<button onClick={fetchConsultations}>` with `<RotateCw className={cn('size-3.5', isLoading && 'animate-spin')} />`.
- **Action Triggers**:
  1. "Create Offer" button (lines 405–424):
     - Navigates to `/treatment-offers/new/step-1`.
     - Injects navigation state:
       ```tsx
       state: {
         patientId: item.patientProfileId,
         patientName: item.patientName,
         patientCid: item.patientMrn,
         patientGender: item.patientGender,
         facility: item.facilityName,
         cptCode: item.cptCode || 'CPT #93458',
         procedureName: item.procedureName || 'Left Heart Catheterization with Coronary Angiogram',
         clinicalNecessity: item.chiefComplaint || 'Diagnostic assessment and coronary angiography evaluation.',
       }
       ```
  2. "Proceed Lifecycle" button (lines 426–446):
     - Navigates to `/treatment-offers/${item.offerId || 'TR-8921'}/accepted`.
     - Injects navigation state:
       ```tsx
       state: {
         offerId: item.offerId || 'TR-8921',
         patientId: item.patientProfileId,
         patientName: item.patientName,
         patientCid: item.patientMrn,
         procedureName: item.procedureName || 'Left Heart Catheterization with Coronary Angiogram',
         facility: item.facilityName,
         attendingDoctor: user.fullName || 'Attending Physician',
       }
       ```

### 1.5 Comprehensive Inventory of Mock Data & Hardcoded Entities in Module A

| Category | File & Location | Mock / Hardcoded Entity | Description / Current Behavior |
|:---|:---|:---|:---|
| **Mock IDs** | `TreatmentOffersDashboardPage.tsx:92-104` | `TR-8921` | Hardcoded in 13 lifecycle stage paths (`/treatment-offers/TR-8921/...`). |
| **Mock IDs** | `TreatmentOffersDashboardPage.tsx:429, 431` | `TR-8921` | Fallback offerId in "Proceed Lifecycle" button click handler. |
| **Mock IDs** | `types.ts:146-187` | `TR-8921`, `PT-ACTIVE`, `#CID-ACTIVE`, `#REF-4491` | Default mock values in `DEFAULT_OFFER_STATE`. |
| **Mock IDs** | `types.ts:228-250` | `#PROC-2026-93458`, `TR-8921`, `PT-ACTIVE` | Default mock values in `DEFAULT_APPOINTMENT_RECORD`. |
| **Static Procedural Data** | `consultationService.ts:170` | `cptCode: 'CPT #93458'` | Injected into every live appointment returned from backend. |
| **Static Procedural Data** | `consultationService.ts:171` | `procedureName: 'Left Heart Catheterization with Coronary Angiogram'` | Injected into every live appointment returned from backend. |
| **Static Procedural Data** | `TreatmentOffersDashboardPage.tsx:415-416` | `cptCode || 'CPT #93458'`, `procedureName || 'Left Heart...'` | Fallback values passed to `step-1` on "Create Offer" click. |
| **Static Facilities** | `consultationService.ts:149` | `fac.name || 'Metro General Hospital'` | Fallback facility name when backend facility is missing or partial. |
| **Static Facilities** | `TreatmentOffersDashboardPage.tsx:125` | `user.organization || 'Metro General Hospital'` | Fallback facility in header banner. |
| **Static Doctor Info** | `TreatmentOffersDashboardPage.tsx:125, 437` | `user.fullName || 'Attending Clinician'` / `'Attending Physician'` | Fallback clinician string. |
| **Static Time/Date** | `consultationService.ts:152, 226` | `startTime || '09:30 AM'`, `'10:00 AM'` | Fallback appointment times. |
| **Local Storage Stores** | `consultationService.ts:119-120` | `careid_treatment_offers_store`, `careid_active_encounters_store` | Local storage keys simulating backend database persistence for treatment proposals. |
| **Mock Progression Array** | `TreatmentOffersDashboardPage.tsx:86-105` | `lifecycleStages` | 18-stage array pointing to hardcoded paths rather than dynamic offer instances. |
| **Toast Timers** | Downstream lifecycle pages | `setTimeout(() => setToastMessage(null), 3500)` | Client-side timer for simulated toast dismissals. |

### 1.6 Existing Service Files, Types, and API Calls

#### Existing Services:
1. `src/services/consultationService.ts`:
   - Methods:
     - `listConsultations()`: queries `GET /api/v1/appointments/doctor/me` and `GET /api/v1/doctors/patients/:id/medical-records`, then merges `careid_treatment_offers_store`.
     - `createClinicalEncounter()`: calls `POST /api/v1/doctors/patients/:patientProfileId/encounters`.
     - `createMedicalRecord()`: calls `POST /api/v1/doctors/patients/:patientProfileId/medical-records`.
     - `updateClinicalEncounter()`: calls `PUT /api/v1/doctors/patients/:patientProfileId/medical-records/:recordId`.
     - `getFinancingOptions()`: calls `GET /api/v1/financing/options`.
     - `getFinancingOffers()`: calls `GET /api/v1/financing/offers`.
     - `applyForFinancing()`: calls `POST /api/v1/financing/apply`.
     - `getFinancingApplications()`: calls `GET /api/v1/financing/applications`.
     - `updateAppointmentStatus()`: calls `PUT /api/v1/appointments/:id/status`.
     - `getTreatmentOffers()`, `getTreatmentOfferById()`, `saveTreatmentOffer()`: client-side localStorage accessors.
2. `src/services/dashboardService.ts`:
   - `getDoctorProfile()`: calls `GET /api/v1/doctors/me`.
   - `getDoctorAppointments()`: calls `GET /api/v1/appointments/doctor/me`.
   - `updateAppointmentStatus()`: calls `PUT /api/v1/appointments/:id/status`.
   - `getDoctorStatistics()`: calls `GET /api/v1/doctors/statistics` (doctor directory stats).
3. `src/services/patientService.ts`:
   - `getPatientDemographics()`: calls `GET /api/v1/doctors/patients/:id`.
4. `src/pages/treatment-offers/types.ts`:
   - Defines `TreatmentOfferState`, `FinancingPackageOption`, `FINANCING_PACKAGES_MAP`, `DEFAULT_OFFER_STATE`, `ProceduralSlot`, `AppointmentRecord`, `DEFAULT_APPOINTMENT_RECORD`.

#### Authoritative Postman Endpoints (CareID-Staging.postman_collection.json):
- `POST /api/v1/doctors/treatment-offers`: Create draft treatment proposal (DTO verified against live server).
- `GET /api/v1/doctors/treatment-offers`: List authored treatment proposals (`status`, `patientId`, `search`, `page`, `limit`).
- `GET /api/v1/doctors/treatment-offers/:offerId`: Get treatment offer details.
- `PUT /api/v1/doctors/treatment-offers/:offerId`: Update draft treatment offer.
- `POST /api/v1/doctors/treatment-offers/:offerId/dispatch`: Lock draft & dispatch offer to patient.
- `GET /api/v1/doctors/treatment-offers/:offerId/status`: Inspect live lifecycle status.
- `POST /api/v1/doctors/treatment-offers/:offerId/cancel`: Cancel treatment proposal with reason.
- `GET /api/v1/appointments/doctor/me`: Doctor appointments listing.
- `PUT /api/v1/appointments/:id/status`: Update appointment status (`CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
- `POST /api/v1/doctors/patients/:patientProfileId/encounters`: Document clinical encounter, diagnoses, vitals, procedures.

### 1.7 Live Backend Verification Results against `https://360api.vnvision.in`
- Verification Tool: Node.js HTTPS script with refreshed JWT Bearer Token.
- Backend Status:
  - `GET /api/v1/ready` -> HTTP 200 OK (`database: connected`, timestamp `2026-11-09T11:42:37Z`).
  - `GET /api/v1/doctors/me` -> HTTP 200 OK (Doctor: "Dr. Sarah Jenkins, MD", ID: `1f06067b-e229-4707-84e2-afa27da2e4cd`, Specialty: `Cardiology`).
  - `GET /api/v1/appointments/doctor/me` -> HTTP 200 OK:
    - Appointment 1: ID `1b5ae56a-d2ac-4884-9c32-7d50ef8d9547`, status `CANCELLED`, date `2026-11-22`, patient: `Marcus Doe` (MRN: `PT-CAREID-2026-0004`), facility: `Metro General Hospital`.
    - Appointment 2: ID `7162dfe6-87c3-4858-854e-b871db677044`, status `SCHEDULED`, date `2026-11-15`, patient: `Marcus Doe` (MRN: `PT-CAREID-2026-0004`), facility: `Metro General Hospital`.
  - `GET /api/v1/doctors/treatment-offers` -> HTTP 200 OK (`{ success: true, data: { data: [], total: 0, page: 1, limit: 20 } }`).
  - `GET /api/v1/financing/options` -> HTTP 200 OK (returns 3 genuine options: `opt-zerocost-care`, `opt-surgery-flex`, `opt-wellness-quick`).
  - `GET /api/v1/doctors/patients/787e5187-7859-4320-bb1a-465a57dd086a` -> HTTP 200 OK (returns full demographics for Marcus Doe).
  - `POST /api/v1/doctors/treatment-offers` schema probe -> Validated exact required DTO fields: `patientProfileId` (UUID), `facilityId` (UUID), `clinicalIndication` (string), `validUntil` (ISO8601), `procedures` (array of objects with `procedureCode`, `procedureName`, `unitCost`).

---

## 2. Logic Chain

1. **Premise 1 (Current Dashboard Data Source)**:
   - Observation 1.1 & 1.2 demonstrate that `TreatmentOffersDashboardPage` derives its stats and listing solely from `consultationService.listConsultations()`.
   - Observation 1.2 demonstrates that `consultationService.listConsultations()` calls only `/api/v1/appointments/doctor/me` and merges `localStorage.getItem('careid_treatment_offers_store')`.
   - Observation 1.6 & 1.7 demonstrate that the backend has an official endpoint `GET /api/v1/doctors/treatment-offers` which returns live treatment offers authored by the doctor, but this endpoint is completely uncalled in the frontend.

2. **Premise 2 (Inaccuracy of Dashboard Metrics)**:
   - Because `GET /api/v1/doctors/treatment-offers` is omitted, the `Total Consultations`, `Active / Scheduled`, `Accepted & Financed`, and `Procedures Completed` cards represent only appointments and locally cached offers.
   - Any treatment offer accepted or financed on another device or directly through the patient portal will not appear in the stats unless retrieved via `GET /api/v1/doctors/treatment-offers`.
   - Therefore, unifying `GET /api/v1/appointments/doctor/me` with `GET /api/v1/doctors/treatment-offers` is necessary to produce authentic live metrics.

3. **Premise 3 (18-Stage Stepper Disconnection)**:
   - Observation 1.3 demonstrates that stages 6 through 18 in `lifecycleStages` hardcode the path `/treatment-offers/TR-8921/...`.
   - Observation 1.5 shows that `TR-8921` is a static mock ID from `types.ts:183`.
   - When a clinician clicks any stage pill from the dashboard, the application navigates to a mock path with empty `location.state`, causing the downstream page to load `DEFAULT_OFFER_STATE` with mock patient `PT-ACTIVE` and mock procedure `Left Heart Catheterization`.
   - Furthermore, the authoritative Postman collection contains endpoints for Treatment Offers (draft, update, dispatch, status, cancel), Appointments (status, reschedule, cancel), and Encounters (encounters documentation), but has **no endpoints** for Pre-Op Clearance, Suite Scheduling, Hold Review, Pre-Op Readiness checklist, or Cath Lab WHO Safety check-in.
   - Therefore, per Project Requirement R1 and R2, missing stages must be clearly identified and must not simulate fake transitions or invent unauthorized endpoints.

4. **Premise 4 (Action Triggers & Consultation Listing Gaps)**:
   - Observation 1.4 demonstrates that when a user clicks "Create Offer", the component passes hardcoded fallback CPT and procedure names (`cptCode || 'CPT #93458'`) instead of real procedure catalog codes.
   - When a user clicks "Proceed Lifecycle", it navigates to `/treatment-offers/${item.offerId || 'TR-8921'}/accepted`.
   - For an appointment that does not yet have an offer created on the backend, this passes `'TR-8921'` and opens the accepted offer page with fake data.
   - Therefore, "Proceed Lifecycle" should either:
     - Navigate to the offer's current genuine stage if `item.offerId` exists and has been fetched from `GET /api/v1/doctors/treatment-offers`.
     - Or trigger offer creation if no proposal exists yet for that consultation.

---

## 3. Caveats

1. **Backend Endpoint Availability for Downstream Stages**:
   - Out of the 18 trajectory stages, only Stages 1–8 (Creation through Patient Acceptance/Rejection), Stage 13 (Appointment details), and Stages 17–18 (Clinical Encounter documentation) have backing endpoints in the authoritative Postman collection.
   - Stages 9, 10, 11, 14, 15, 16 (Pre-Op Clearance, Cath Lab Suite scheduling, Hold Review, Pre-Op checklist, Day-of-Checkin, and Cath Lab Safety) have no dedicated endpoints in `CareID-Staging.postman_collection.json`. Per requirement R1 ("mark that functionality as NOT IMPLEMENTED rather than inventing replacement endpoints"), these gaps must be flagged for the implementation team.
2. **`GET /api/v1/doctors/patients` Database Error**:
   - The bulk patient list endpoint `GET /api/v1/doctors/patients` currently returns 500 InternalServerError on the staging server (`An unexpected database error occurred`). However, patient details are successfully populated via `GET /api/v1/appointments/doctor/me` (which embeds the full `patient` object) and `GET /api/v1/doctors/patients/:patientProfileId` (which returns full demographic data).
3. **No Direct Statistics Endpoint**:
   - There is no single `/api/v1/doctors/consultations/statistics` endpoint. Metric counts must be calculated by aggregating live records from `GET /api/v1/appointments/doctor/me` and `GET /api/v1/doctors/treatment-offers`.

---

## 4. Conclusion

1. **Dashboard Statistics**:
   - Currently implemented via `useMemo` in `TreatmentOffersDashboardPage.tsx` using `consultationService.listConsultations()`.
   - Must be upgraded to combine live appointments (`GET /api/v1/appointments/doctor/me`) and live authored treatment offers (`GET /api/v1/doctors/treatment-offers`).
   - Static procedural defaults (`CPT #93458`, `Left Heart Catheterization`, `Metro General Hospital`) must be eliminated.

2. **18-Stage Lifecycle Trajectory**:
   - The dashboard stepper (`lifecycleStages`) hardcodes `TR-8921` for 13 of the 18 steps.
   - The stepper should dynamically reference the most recently active or selected treatment offer ID (or the first active offer from the backend list) rather than static `TR-8921`.
   - Downstream stages must reflect authentic backend status: Stages 1–8 and 17–18 connect to live APIs; Stages 9–12 and 14–16 must be handled strictly according to the documented Postman contract without simulated transitions.

3. **Consultation Listing**:
   - Must fetch both appointments and treatment offers using `apiClient.ts`.
   - "Create Offer" action should forward genuine patient profile ID, patient name, and MRN to Step 1 without hardcoding fallback CPT codes.
   - "Proceed Lifecycle" action should check for genuine `offerId` from the backend and navigate to the offer's genuine status page.
   - Zero `localStorage` mock stores (`careid_treatment_offers_store`) should be relied upon for primary data.

---

## 5. Verification Method

### 5.1 Independent Codebase Inspection
1. **Route and Layout**:
   - Inspect `src/routes/index.tsx` (lines 427–430) and `src/components/layout/PatientLayout.tsx` (lines 50–57) to verify `/treatment-offers` route registration and layout mounting.
2. **Mock References**:
   - Run grep command in powershell:
     ```powershell
     Select-String -Path src/pages/treatment-offers/TreatmentOffersDashboardPage.tsx -Pattern "TR-8921", "CPT #93458"
     ```
   - Verify that `TR-8921` appears at lines 92–104, 429, 431, and `CPT #93458` at line 415.
3. **Consultation Service**:
   - Inspect `src/services/consultationService.ts` (lines 128–238) to verify that `listConsultations` does not call `GET /api/v1/doctors/treatment-offers` and injects static `cptCode: 'CPT #93458'`.

### 5.2 Live API Contract Verification
Execute the following verification script using Node.js:
```powershell
node -e "
const https = require('https');
const cache = JSON.parse(require('fs').readFileSync('.token_cache.json', 'utf8'));

// Verify Treatment Offers API exists
const req = https.request({
  hostname: '360api.vnvision.in',
  path: '/api/v1/doctors/treatment-offers',
  method: 'GET',
  headers: { 'Authorization': 'Bearer ' + cache.accessToken, 'Accept': 'application/json' }
}, res => {
  console.log('Treatment Offers HTTP Status:', res.statusCode);
  res.on('data', d => console.log('Response sample:', d.toString().slice(0, 200)));
});
req.end();
"
```
- **Expected Result**: HTTP 200 with JSON envelope `{ success: true, data: { data: [], total: 0 } }`.

### 5.3 Quality Gate Verification
Run the standard project verification commands:
```powershell
npm run type-check
npm run lint
npm run build
```
- All commands should complete cleanly before and after any implementation changes.

---
*End of Investigation Report for Module A.*
