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
