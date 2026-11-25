# Handoff Report: Patient Selection & Start Consult Complete Workflow Fix

## 1. Root Cause Summary
- **Root Cause 1 (Patient Profile Page Navigation)**: In `src/pages/patients/PatientProfilePage.tsx` (lines 277-282), the "Start Consult" button handler invoked `navigate('/treatment-offers/new/step-1')` without passing the patient profile UUID in the URL query string (`?patientId=...`) or in `location.state`. Consequently, `TreatmentOfferCreatePage.tsx` received an empty `targetPatientId` and fell back to displaying "No Patient Selected".
- **Root Cause 2 (Missing Directory Table Row Action)**: In `src/pages/patients/PatientDirectoryPage.tsx`, the table actions column only provided "View Patient Profile" and "View Health Records". There was no direct "Start Consult" action button on directory rows.
- **Root Cause 3 (Fragile State Reconciliation & Mock Fallbacks in TreatmentOfferCreatePage)**: In `src/pages/treatment-offers/TreatmentOfferCreatePage.tsx`, `hubPayload?.patientId || queryPatientId` prioritized transient `location.state` over the URL query parameter `patientId`. If `location.state` was lost during a page refresh or browser reload, or if conflicting state existed from a previous session, patient hydration broke. Furthermore, if `targetPatientId` was invalid, the component masked the error by rendering dummy fallback text `"Patient Record"` and `"CAREID-PT"` rather than retaining the explicit "No Patient Selected" requirement and displaying an actionable error notice.
- **Root Cause 4 (Stale State Retention in `usePatientProfile`)**: In `src/hooks/usePatients.ts`, `usePatientProfile` retained previous patient data during async fetch transitions instead of immediately resetting to null on `patientId` change, causing potential stale data display when switching patients.

---

## 2. Modified Files
1. **`src/hooks/usePatients.ts`**:
   - Updated `usePatientProfile` to immediately clear previous patient data and errors (`setPatient(null)`, `setError(null)`) upon `patientId` change, eliminating stale state during patient transitions.
   - Added an active cancellation flag to ignore out-of-order in-flight responses.
2. **`src/pages/patients/PatientProfilePage.tsx`**:
   - Fixed "Start Consult" button to navigate to `/treatment-offers/new/step-1?patientId=${encodeURIComponent(targetId)}` with full demographic state payload.
   - Imported `calculateAge` for demographic age calculation.
3. **`src/pages/patients/PatientDirectoryPage.tsx`**:
   - Added `handleStartConsult(patient)` handler navigating to `/treatment-offers/new/step-1?patientId=${encodeURIComponent(patient.id)}`.
   - Added a `Video` icon button in table row actions with `title="Start Consult"` and `aria-label="Start Consult"`.
4. **`src/pages/treatment-offers/TreatmentOfferCreatePage.tsx`**:
   - Made `searchParams.get('patientId')` the authoritative primary source of truth, preventing transient state from conflicting.
   - Hydrated all 9 required clinical demographics (full name, patient profile ID, Health Vault ID / MRN, age, gender, date of birth, blood group, allergies, insurance status).
   - Displayed authentic patient profile ID badge (`ID: {resolvedPatientId}`).
   - Ensured Treatment Offer Summary card displays `{hasSelectedPatient ? `${patientName} (CID ${patientCid})` : 'No Patient Selected'}`.
   - Handled invalid `patientId` values gracefully by displaying an explicit error message, retaining "No Patient Selected" badge, and displaying the "Select Patient from Directory" button without crashing.
   - Guarded `handleProceedToReview` and `handleSaveDraft` to mandate a valid resolved patient before proposal generation.
5. **Auxiliary Navigation Entry Points**:
   - `src/pages/records/MedicalRecordsPage.tsx`: Preserved `activePatientId` in query param on `Start Consultation`.
   - `src/pages/records/RecordDetailPage.tsx`: Preserved `targetPatientId` in query param on `Start Consultation`.
   - `src/pages/reports/CriticalReportReviewPage.tsx`: Preserved `report.patientId` in query param on `Proceed to Treatment Proposal`.
   - `src/components/layout/Sidebar.tsx` & `src/components/layout/PatientLayout.tsx`: Preserved active patient in `New Consultation` button when viewing patient profile.
6. **Test Suite Registration**:
   - `tests/e2e/consultations/helpers/consultationApiHelper.ts`: Added helper method `getDoctorPatientProfile`.
   - `tests/e2e/consultations/patient_selection_workflow.test.ts`: Created new comprehensive test suite covering all 10 acceptance criteria.
   - `tests/e2e/consultations/runner.ts`: Registered new test suite in master runner.

---

## 3. Navigation Flow Comparison
- **Flow A (Patient Directory)**:
  - *Previous*: Clinician navigated `/patients` -> clicked patient row -> landed on `/patients/:id` -> clicked "Start Consult" -> navigated to `/treatment-offers/new/step-1` (no patient ID query param or state) -> displayed "No Patient Selected".
  - *Now*: Clinician navigates `/patients` -> clicks "Start Consult" action on row OR selects patient to view profile and clicks "Start Consult" -> navigates to `/treatment-offers/new/step-1?patientId=${patient.id}` -> patient profile resolved from live backend and context hydrated.
- **Flow B (Patient Profile)**:
  - *Previous*: Clinician at `/patients/:id` clicked "Start Consult" -> navigated to `/treatment-offers/new/step-1` with no parameters -> displayed "No Patient Selected".
  - *Now*: Clinician at `/patients/:id` clicks "Start Consult" -> navigates to `/treatment-offers/new/step-1?patientId=${patient.id}` with authentic backend UUID -> patient profile resolved and hydrated.
- **Flow C (New Consultation)**:
  - *Previous*: Clinician clicked "New Consultation" in sidebar -> opened `/treatment-offers/new/step-1` -> displayed "No Patient Selected" -> clicked "Select Patient from Directory" -> `/patients` -> clicked patient -> `/patients/:id` -> clicked "Start Consult" -> landed on `/treatment-offers/new/step-1` with "No Patient Selected" again.
  - *Now*: Clinician clicks "New Consultation" -> lands on `/treatment-offers/new/step-1` displaying "No Patient Selected" -> clicks "Select Patient from Directory" -> `/patients` -> selects patient -> clicks "Start Consult" -> navigates to `/treatment-offers/new/step-1?patientId=${patient.id}` -> patient identity resolved and loaded.

---

## 4. Patient ID Propagation Mechanism
- URL query parameter `?patientId=${encodeURIComponent(targetPatientId)}` is strictly authoritative for direct link support and browser refreshes.
- If `location.state` is present from internal routing, it provides instant zero-latency rendering while the authoritative profile is refreshed in the background.
- If `location.state` conflicts with `queryPatientId`, the URL parameter takes precedence, eliminating cross-patient state pollution.
- `usePatientProfile` queries `GET /api/v1/doctors/patients/:patientProfileId` using the authenticated clinician session token.
- Submitting the offer via `treatmentOfferService.createTreatmentOffer` transmits the authentic backend UUID (`patientProfileId: resolvedPatientId`).

---

## 5. Backend API Verification
- Authenticated endpoint: `GET /api/v1/doctors/patients/:patientProfileId`
- Verified against live backend `https://360api.vnvision.in/api/v1`
- Test Patient: Marcus Doe (`787e5187-7859-4320-bb1a-465a57dd086a`)
- Returns authentic HTTP 200 payload with complete clinical demographics, health card, vitals, allergies, and insurance policy.
- Verified adversarial input (`00000000-0000-0000-0000-000000000000`) returns HTTP 404 without frontend crash.

---

## 6. Acceptance Criteria Checklist
- [x] Selecting Marcus Doe (or any patient) from the Patient Directory captures the authentic backend patient profile UUID.
- [x] Clicking Start Consult from the directory opens Treatment Offer Creation with the correct patient context loaded and no "No Patient Selected" message.
- [x] Clicking Start Consult from Patient Profile (/patients/:id) resolves and loads the same patient.
- [x] Starting New Consultation and selecting a patient from the directory resolves and loads the same patient.
- [x] Refreshing the treatment offer creation page preserves the selected patient identity.
- [x] Navigating directly to the treatment offer creation URL with a valid patientId loads the correct patient profile.
- [x] Navigating to the treatment offer creation URL without a patientId displays the "No Patient Selected" state.
- [x] Navigating to the treatment offer creation URL with an invalid patientId displays proper error handling without crashing.
- [x] Switching from Patient A to Patient B clears previous patient state with no stale data displayed.
- [x] Submitting a new treatment offer submits the correct patient profile UUID.
- [x] `npm run type-check` passes with zero errors.
- [x] `npm run lint` passes with zero errors.
- [x] `npm run build` succeeds without errors.
- [x] Relevant patient-selection and consultation E2E tests pass (43/43 suites, 179/179 tests pass).
- [x] Existing UI design, layout, typography, and styling remain strictly unchanged.

---

## 7. Verification Record
- **Deep Verification (ran actual tests)**:
  - `npm run type-check`: Passed with 0 errors (`tsc -b --noEmit`).
  - `npm run lint`: Passed with 0 errors (`eslint .`).
  - `npm run build`: Succeeded in 5.33s with complete production bundle generation (`tsc -b && vite build`).
  - `npm run test:consultations`: Executed master test runner with 43 suites against live backend `https://360api.vnvision.in/api/v1`; 179 of 179 test cases passed (100% pass rate in 274.15s), including all 10 dedicated acceptance criteria in `patient_selection_workflow.test.ts`.
- **Shallow Verification (manual run only)**:
  - Eyeballed visual token classes and CSS styling on the context card to ensure existing UI layout, typography, and styling remain strictly preserved.
- **Unverified aspects**:
  - Real browser hardware camera capture and WebRTC media streaming for the simulated telehealth modal (outside the scope of treatment offer routing).
  - Storage quota limits on legacy mobile browsers when storing multiple recent patient search entries.

---

## 8. Known Issues
- `None` — All 43 test suites and 179 test cases pass against the live staging backend API, and type-check, lint, and build quality gates pass cleanly with zero errors.
