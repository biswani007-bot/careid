# Dispatch Log

## 2026-11-09T05:34:13Z

CareID Doctor Web Portal: strictly implement live backend API integration for the existing Upload Health Record page (`/records/upload`) and OCR review workflow against `https://360api.vnvision.in`.

Working directory: d:\New folder\New folder\doctor web\doctor-web-frontend-main
Integrity mode: development

Authoritative API Contract: `D:\New folder\New folder\doctor web\doctor-web-frontend-main\Postman collection\`
Test Patient ID: `787e5187-7859-4320-bb1a-465a57dd086a`

## Requirements

### R1. Live Patient Context Resolution
Resolve the selected patient from the live backend using the actual patient profile API (test patient `787e5187-7859-4320-bb1a-465a57dd086a`), retrieving the real patient name, Health ID / MRN, DOB, gender, and profile ID without hardcoded values. Ensure uploaded documents associate with the resolved patient.

### R2. Document Upload Integration
Support genuine binary file upload across existing UI options (scan with camera using existing capture control, computer upload supporting PDF/PNG/JPG/DICOM, and multi-page PDF import preserving page order) preserving original filenames and validating file type and size against backend constraints. Do not use browser Object URLs as substitutes for backend uploads.

### R3. Real OCR Processing and Job Management
Integrate real OCR workflow matching the Postman collection (create OCR job with uploaded attachment ID, poll backend job status for documented statuses such as PENDING/PROCESSING/COMPLETED/FAILED, retrieve extracted fields and raw text, and reprocess failed jobs if supported) with no simulated timers or fake progress.

### R4. OCR Review Dynamic Binding and Clinical Value Editing
Bind backend-extracted data dynamically to the existing OCR Review UI (demographics, facility, collection date, report type, clinical test names/values/units/confidence) preserving multi-page navigation and enabling editing without injecting fake values.

### R5. Medical Record Persistence and Recent Uploads
Save verified clinical information and actual attachment references to the patient's medical records via the backend endpoint, preventing duplicate submissions, and refresh Recent Uploads with real backend records.

### R6. Complete Mock Data Removal and UI Preservation
Remove all mock registries, hardcoded names/IDs, fake OCR responses, and placeholder responses across the workflow, while preserving the approved Figma UI layout, styling, and elements exactly. Do not modify backend code or database schemas.

## Verification Resources
- Environment authentication: Use existing doctor session or credentials configured in the environment / local storage.
- Test assets: Use sample document files (PDF/images/DICOM) and fixtures available in the repository.

## Acceptance Criteria

### Patient Context & Upload Verification
- [ ] Resolving patient `787e5187-7859-4320-bb1a-465a57dd086a` retrieves real demographics from the backend.
- [ ] File uploads via camera, file picker, and PDF import return authentic backend attachment IDs.
- [ ] No local Object URLs are treated as completed uploads.

### OCR & Review Verification
- [ ] OCR job creation returns a real job ID and polls authentic backend status until completion or failure.
- [ ] Extracted fields in the OCR Review page reflect actual backend response data.
- [ ] Edited values are submitted to the medical record creation endpoint with backend confirmation.

### System Verification & Code Quality
- [ ] Saved records appear in Recent Uploads and persist across browser refresh.
- [ ] `npm run type-check`, `npm run lint`, and `npm run build` pass with zero errors.
- [ ] Final report tables A through E (Implemented APIs, Missing Backend APIs, Files Modified, Mock Data Removal, Testing) are provided as specified.


## 2026-11-09T11:23:27Z

CareID Doctor Web: Strictly implement existing backend APIs in the Consultations / Treatment Lifecycle page (`/treatment-offers`) and New Consultation / Treatment Offer creation workflow (`/treatment-offers/new/step-1` to `step-4`) against `https://360api.vnvision.in`, removing all mock/hardcoded data while strictly preserving the UI pixel-for-pixel.

Working directory: d:\New folder\New folder\doctor web\doctor-web-frontend-main
Integrity mode: development

Authoritative API Contract: `D:\New folder\New folder\doctor web\doctor-web-frontend-main\Postman collection\`
API Base URL: `https://360api.vnvision.in`

## Requirements

### R1. Pre-Implementation Investigation & API Contract Mapping
Inspect the complete updated Postman collection and the existing React routes, components, hooks, services, types, and state management. Map every relevant endpoint for doctor consultations, patient consultation history, consultation creation/documentation, treatment offers, CPT/procedure selection, hospital baseline pricing, discounts, financing options and packages, terms and remarks, attestation, clinical review, offer dispatch, patient acceptance/rejection, and appointment/procedure lifecycle. If an endpoint is missing from Postman, mark that functionality as NOT IMPLEMENTED rather than inventing replacement endpoints, request parameters, payload fields, response structures, or business logic.

### R2. Module A — Consultations & Treatment Lifecycle Integration (`/treatment-offers`)
Integrate live backend data into the Consultations / Treatment Lifecycle page:
- Dashboard Statistics: Calculate Total Consultations, Active / Scheduled, Accepted & Financed, and Procedures Completed from actual backend data or official backend statistics endpoints; never use static numbers.
- 18-Stage Clinical & Financing Trajectory: Connect each existing stage (CPT Selection, Pricing & Discount, Financing Package, Terms & Remarks, Attestation, Clinical Review, Dispatched Status, Offer Accepted, Pre-Op Clearance, Suite Scheduling, Hold Review, Slot Confirmed, Appointment Ledger, Pre-Op Readiness, Day-of-Checkin, Cath Lab Safety, Encounter Induction, Active Procedure) to documented backend lifecycle data. Display actual lifecycle status, preserve existing stage navigation, and never mark a stage completed or simulate stage progression without backend confirmation.
- Consultation Listing: Implement all consultations, active consultations, accepted consultations, and completed consultations filtering, patient search, manual refresh, actual patient information, procedure information, consultation status, appointment date/time, and existing actions (Create Offer, Proceed Lifecycle) using only backend data.

### R3. Module B — Multi-Step Treatment Offer Creation Workflow (`/treatment-offers/new/step-1` to `step-4`)
Implement the complete existing multi-step creation workflow against actual APIs:
- Step 1 (Select Financing Options): Load actual patient information, available CPT/procedure options, clinical context/referral information where supported, hospital baseline pricing, applicable discounts, and financing options using backend-provided pricing rules without inventing CPT codes, prices, discounts, or financing packages.
- Step 2 (Configure Treatment Offer): Persist selected procedure, save clinical necessity summary, integrate terms and remarks, attestation, and financing details conforming strictly to the exact DTO and validation rules from Postman.
- Step 3 (Review & Send to Patient): Display actual offer details, submit the offer using the documented endpoint, show success only after backend confirmation, and handle API validation errors correctly.
- Step 4 (Patient Acceptance): Fetch actual patient acceptance status (accepted, rejected, pending, expired) from backend responses without simulated patient acceptance.
- Workflow Rules: Preserve existing step navigation, persist data according to the actual backend workflow across steps and browser refresh, prevent duplicate submissions, handle reopening of existing offers, and do not lose previously saved data when navigating.

### R4. Complete Mock & Hardcoded Data Removal
Search the entire relevant modules and remove all static consultation arrays, hardcoded patient objects, static dashboard statistics, fake CPT/procedure lists, hardcoded hospital prices, static discounts, hardcoded financing packages, fake acceptance statuses, simulated lifecycle transitions, mock API responses, setTimeout/setInterval-based fake operations, and placeholder patient/consultation IDs. Replace with real backend integrations; show existing empty states when the backend returns no data and do not introduce fallback demo data when API requests fail.

### R5. Architecture & Live Backend Constraints
Reuse existing `apiClient.ts`, authentication tokens, and JWT handling. Create or extend dedicated services for consultations and treatment offers with TypeScript interfaces aligned to actual backend DTOs. Implement proper loading, error, and empty states using existing UI patterns, handle pagination and response envelopes per the actual API, prevent duplicate submissions, avoid unnecessary repeated requests, and ensure patient-specific data isolation without storing sensitive clinical information unnecessarily in local storage. Do not modify backend source code, database schemas, migrations, or production records.

### R6. Strict UI Preservation
Preserve the existing UI layout, colors, typography, spacing, dimensions, icons, button labels, cards, sections, 18-stage trajectory design, and multi-step workflow design exactly as shown in the reference screenshots. Do not add, remove, or modify any UI components.

## Verification Resources
- Postman Collection: `D:\New folder\New folder\doctor web\doctor-web-frontend-main\Postman collection\`
- Backend API: `https://360api.vnvision.in`
- Authentication & Test Context: Use existing doctor session and credentials configured in the environment / local storage, and query active test patients from the live backend / Postman collection.

## Acceptance Criteria

### Module A Verification
- [ ] Dashboard statistics (Total Consultations, Active / Scheduled, Accepted & Financed, Procedures Completed) are calculated from live backend data or official endpoints with zero static numbers.
- [ ] The 18-stage trajectory reflects actual backend lifecycle status, advances only upon genuine backend confirmation, and does not simulate stage progression.
- [ ] Consultation listing loads authentic records, and All/Active/Accepted/Completed filters, patient search, and manual refresh function correctly with backend data.

### Module B Verification
- [ ] Step 1 loads real patient information, procedure/CPT catalogs, baseline hospital pricing, discounts, and financing packages from live APIs.
- [ ] Step 2 persists clinical necessity, terms, remarks, attestation, and financing details conforming strictly to documented Postman DTOs.
- [ ] Step 3 submits the offer to the documented endpoint, displays validation errors if returned, and confirms success only upon authentic backend confirmation.
- [ ] Step 4 fetches authentic patient acceptance status from the backend without simulation.
- [ ] Navigating between steps or refreshing the page retains saved offer data without duplicate submissions.

### Data Integrity & Quality Gates
- [ ] Zero mock data, fake timers, or hardcoded consultation/pricing/patient objects remain in the consultation and treatment offer modules.
- [ ] Existing UI components, styling, layout, typography, and visual structure remain pixel-for-pixel identical to the existing design.
- [ ] `npm run type-check` completes with zero errors.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes successfully.
- [ ] Final implementation report includes:
  - Table A: Implemented APIs (Endpoint, Method, Frontend Usage, Verification)
  - Table B: Missing Backend APIs (Functionality, Missing Endpoint, Priority, Backend Developer Action)
  - Table C: Files Modified (File and Purpose)
  - Table D: Mock Data Removed (Hardcoded/Simulated Value Removed and Replacement)
  - Table E: Workflow Verification (Status: PASS / FAIL / BLOCKED for each workflow step)
  - Table F: Quality Gates (TypeScript, ESLint, production build results)
  - Table G: Remaining Issues (Backend limitations, failed endpoints, unimplemented functionality)
