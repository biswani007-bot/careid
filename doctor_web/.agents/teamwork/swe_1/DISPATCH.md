## 2026-11-09T15:00:19Z

This is a single self-contained fix; keep it small and focused. Fix the bug where selecting a patient from the Patient Directory and clicking Start Consult navigates to the Treatment Offer Creation page displaying "No Patient Selected" in doctor-web-frontend-main. The selected patient must remain correctly identified and hydrated throughout the complete navigation workflow.

Working directory: d:\New folder\New folder\doctor web\doctor-web-frontend-main
Integrity mode: development

## Requirements

### R1. Root Cause Investigation & Patient ID Propagation
Inspect the patient directory page, patient profile page, Start Consult button handlers, New Consultation handler, patient selection state management, React Router navigation, and TreatmentOfferCreatePage.tsx. Capture the authentic backend patient profile UUID, preserve it across navigation, and pass it to the treatment offer creation page. Resolve the patient using the authenticated backend endpoint GET /api/v1/doctors/patients/:patientProfileId. Do not use MRN, mobile number, display name, client-generated ID, or hardcoded/mock UUIDs.

### R2. Navigation Consistency & Direct Link Support
Support all three entry points consistently:
- Flow A (Patient Directory): /patients -> Select Patient -> Start Consult -> Treatment Offer Creation
- Flow B (Patient Profile): /patients/:id -> Start Consult -> Treatment Offer Creation
- Flow C (New Consultation): New Consultation -> Select Patient from Directory -> Select Patient -> Start Consult -> Treatment Offer Creation
All three flows must resolve the same selected patient correctly. Preserve patient identity across page refreshes and direct URL navigation using the patient UUID in the URL where appropriate, without relying exclusively on transient location.state. If the patient ID is missing or invalid, retain the explicit "No Patient Selected" state and require an explicit selection; never silently select another patient.

### R3. Patient Context Hydration & State Management
Hydrate the patient context card on the treatment offer creation page using the authenticated patient API response data, populating: full name, patient profile ID, Health Vault ID / MRN, age, gender, date of birth, blood group, allergies, and insurance status. Ensure the Treatment Offer Summary uses the identical patient identity. Eliminate conflicting patient-selection sources, prevent duplicate requests, handle asynchronous profile loading and API errors, and clear previous patient data when a different patient is selected to avoid stale state.

### R4. Strict Implementation Constraints
Do not change the existing UI design, components, colors, typography, spacing, or layouts. Do not add new UI components or features. Do not modify backend APIs, and do not introduce hardcoded or mock patient data. Reuse existing services and components wherever possible, adhering strictly to the existing Postman API contract. Provide a final report covering root cause, modified files, navigation flow comparison, patient ID propagation mechanism, backend API verification, test results, and UI preservation confirmation.

## Verification Resources
- Existing repository test suites and scripts (npm test, relevant patient-selection and consultation E2E tests)
- Quality gate commands: npm run type-check, npm run lint, npm run build

## Acceptance Criteria

### Patient Selection & Workflow Navigation
- [ ] Selecting Marcus Doe (or any patient) from the Patient Directory captures the authentic backend patient profile UUID.
- [ ] Clicking Start Consult from the directory opens Treatment Offer Creation with the correct patient context loaded and no "No Patient Selected" message.
- [ ] Clicking Start Consult from Patient Profile (/patients/:id) resolves and loads the same patient.
- [ ] Starting New Consultation and selecting a patient from the directory resolves and loads the same patient.
- [ ] Refreshing the treatment offer creation page preserves the selected patient identity.
- [ ] Navigating directly to the treatment offer creation URL with a valid patientId loads the correct patient profile.
- [ ] Navigating to the treatment offer creation URL without a patientId displays the "No Patient Selected" state.
- [ ] Navigating to the treatment offer creation URL with an invalid patientId displays proper error handling without crashing.
- [ ] Switching from Patient A to Patient B clears previous patient state with no stale data displayed.
- [ ] Submitting a new treatment offer submits the correct patient profile UUID.

### Quality & Regression Verification
- [ ] npm run type-check passes with zero errors.
- [ ] npm run lint passes with zero errors.
- [ ] npm run build succeeds without errors.
- [ ] Relevant patient-selection and consultation E2E tests pass.
- [ ] Existing UI design, layout, typography, and styling remain strictly unchanged.

---
Working directory: d:\New folder\New folder\doctor web\doctor-web-frontend-main
State folder: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\swe_1\
Original request path: d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\ORIGINAL_REQUEST.md
