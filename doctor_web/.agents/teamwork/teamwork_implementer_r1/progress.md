# Progress Report: Patient Selection & Start Consult Workflow Fix

## Task Summary
Fix the defect where selecting a patient from the Patient Directory and clicking "Start Consult" navigates to the Treatment Offer Creation page displaying "No Patient Selected". The selected patient must remain correctly identified and hydrated throughout the complete navigation workflow.

## Root Cause Analysis
1. **Broken Patient ID Propagation on Start Consult CTA**: In `PatientProfilePage.tsx` (lines 277-282), the "Start Consult" button handler executed `navigate('/treatment-offers/new/step-1')` without passing the patient profile UUID in the URL query string (`?patientId=...`) or in `location.state`. Consequently, `TreatmentOfferCreatePage.tsx` received an empty `targetPatientId` and fell back to displaying "No Patient Selected".
2. **Missing Start Consult Row Action in Patient Directory**: `PatientDirectoryPage.tsx` table actions only had "View Patient Profile" and "View Health Records". If a clinician wished to start a consultation directly from the directory row, no direct action was wired, forcing indirect navigation.
3. **Fragile State Reconciliation in TreatmentOfferCreatePage**: In `TreatmentOfferCreatePage.tsx`, `hubPayload?.patientId || queryPatientId` prioritized transient `location.state` over the URL query parameter `patientId`. If `location.state` was lost during a page refresh or browser reload, or if conflicting state existed from a previous session, patient hydration broke. Furthermore, if `targetPatientId` was invalid, the component masked the error by rendering dummy fallback text `"Patient Record"` and `"CAREID-PT"` rather than retaining the explicit "No Patient Selected" requirement and displaying an actionable error notice.
4. **Stale State Leakage in `usePatientProfile` Hook**: In `src/hooks/usePatients.ts`, `usePatientProfile` retained previous patient data during async fetch transitions instead of immediately resetting to null on `patientId` change, causing potential stale data display when switching patients.

## Completed Changes
1. **`src/pages/patients/PatientProfilePage.tsx`**:
   - Updated "Start Consult" button to navigate to `/treatment-offers/new/step-1?patientId=${encodeURIComponent(targetId)}` and pass full state payload.
   - Imported `calculateAge` to populate demographic age.
2. **`src/pages/patients/PatientDirectoryPage.tsx`**:
   - Added `handleStartConsult(patient)` handler.
   - Added `Video` icon button in directory row actions with `title="Start Consult"` and `aria-label="Start Consult"`.
3. **`src/pages/treatment-offers/TreatmentOfferCreatePage.tsx`**:
   - Prioritized `queryPatientId = searchParams.get('patientId')` as the authoritative source of truth.
   - Guarded against conflicting `location.state` from other patients.
   - Hydrated all 9 required clinical demographics (full name, patient profile ID, Health Vault ID / MRN, age, gender, date of birth, blood group, allergies, insurance status).
   - Displayed authentic patient profile ID badge (`ID: {resolvedPatientId}`).
   - Ensured Treatment Offer Summary card displays `{hasSelectedPatient ? `${patientName} (CID ${patientCid})` : 'No Patient Selected'}`.
   - Provided proper error handling without crashing when an invalid `patientId` is supplied, retaining the explicit "No Patient Selected" state with "Select Patient from Directory" CTA.
   - Guarded `handleProceedToReview` and `handleSaveDraft` to mandate a valid resolved patient before proposal generation.
4. **`src/hooks/usePatients.ts`**:
   - Updated `usePatientProfile` to immediately reset `patient` and `error` to null on `patientId` change, eliminating stale state during transitions.
   - Added cancellation flag to ignore out-of-order in-flight responses.
5. **Auxiliary Consult Entry Points**:
   - `MedicalRecordsPage.tsx`: Wired `Start Consultation` button to navigate to `/treatment-offers/new/step-1?patientId=${encodeURIComponent(activePatientId)}`.
   - `RecordDetailPage.tsx`: Preserved `patientId` in URL query string on `Start Consultation`.
   - `CriticalReportReviewPage.tsx`: Preserved `patientId` in URL query string on `Proceed to Treatment Proposal`.
   - `Sidebar.tsx` & `PatientLayout.tsx`: Preserved active patient in `New Consultation` button when viewing patient profile.
6. **E2E Test Suite**:
   - Created `tests/e2e/consultations/patient_selection_workflow.test.ts` validating all 10 acceptance criteria against the live backend API.
   - Registered in master consultation runner (`tests/e2e/consultations/runner.ts`).
