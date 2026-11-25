# E2E Test Suite Architecture & Technical Analysis Report

**Author**: E2E Test Suite Architect (`test_writer_e2e_1`)  
**State Folder**: `.agents/teamwork/test_writer_e2e_1/`  
**Date**: November 9, 2026  
**Target Backend**: `https://360api.vnvision.in/api/v1`  
**Subject**: Upload Health Record (`/records/upload`) and OCR Review Workflow  

---

## 1. Executive Summary

As the designated E2E Test Suite Architect for the CareID Doctor Web Portal, I have designed, constructed, and validated a comprehensive, opaque-box, 4-Tier E2E test infrastructure comprising **43 test suites** and **163 test cases** executing natively via Node.js v25 against the live backend `https://360api.vnvision.in/api/v1`.

The test suite requires zero external third-party test runners, operates without synthetic mocks or client-side timer simulations, and strictly verifies authentic HTTP response codes, multipart MIME parsing, PP-OCRv4 neural OCR state transitions, clinical entity extraction, and electronic health record persistence.

---

## 2. 4-Tier Test Architecture & Methodology

### Tier 1 — Core Feature Coverage (15 Suites, 75 Test Cases)
Provides >= 5 isolated functional tests for all 15 inventoried features in `PROJECT.md`:
1. **Feature 1 (`feature01_multipart_client.test.ts`)**: Multipart FormData transport, boundary header calculation, auth injection, filename preservation, and metadata persistence.
2. **Feature 2 (`feature02_patient_demographics.test.ts`)**: Resolves target patient `787e5187-7859-4320-bb1a-465a57dd086a` returning authentic demographics (`Marcus Doe`, `+16505550004`, `1990-01-01`, `Male`, `O+`).
3. **Feature 3 (`feature03_file_picker_upload.test.ts`)**: Binary upload across PDF, PNG, JPG, and DICOM, asserting HTTP 201/validation codes and SHA-256 checksums.
4. **Feature 4 (`feature04_camera_scan_capture.test.ts`)**: Camera frame binary conversion, JPEG mimeType validation, storageKey assignment, and private file streaming via `/attachments/file/:filename`.
5. **Feature 5 (`feature05_multipage_pdf_import.test.ts`)**: Multi-page PDF binary integrity, page order preservation, exact filename retention, and byte size calculation.
6. **Feature 6 (`feature06_eliminate_object_url.test.ts`)**: Rejection of `blob:` URLs as completed uploads, enforcement of server `storageUrl: "/api/v1/attachments/file/..."`, and persistent UUID tracking.
7. **Feature 7 (`feature07_real_ocr_job_submission.test.ts`)**: Submits authentic attachment IDs to `POST /api/v1/ocr/jobs` for `LAB_REPORT` and `DIAGNOSTIC_IMAGE`, rejecting dummy `attachment-uuid-1`.
8. **Feature 8 (`feature08_ocr_status_polling.test.ts`)**: Status polling against `GET /api/v1/ocr/jobs/:id`, verifying `overallConfidence`, extraction engine (`PP-OCRv4-Mobile-CPU`), and `processingTimeMs`.
9. **Feature 9 (`feature09_structured_fields_extraction.test.ts`)**: Retrieves extracted fields (`/fields`), raw OCR text (`/text`), and formatted JSON (`/json`), validating confidence intervals.
10. **Feature 10 (`feature10_dynamic_review_binding.test.ts`)**: Dynamically binds demographics, clinical test rows, facility, and collection dates to review models with confidence thresholds.
11. **Feature 11 (`feature11_clinical_value_editing.test.ts`)**: Doctor editing of test parameters, units, values, adding new lab rows, deleting rows, and correcting divergences.
12. **Feature 12 (`feature12_mock_data_removal.test.ts`)**: Verifies total elimination of dummy UUIDs (`attachment-uuid-1`), synthetic fallback rows, fake delays, and masks.
13. **Feature 13 (`feature13_medical_record_persistence.test.ts`)**: Submits verified clinical notes and encounters to `POST .../medical-records` with status `FINAL`.
14. **Feature 14 (`feature14_duplicate_submission_prevention.test.ts`)**: Mutex locks, double-click protection, and success state transitions preventing concurrent submissions.
15. **Feature 15 (`feature15_recent_uploads_sync.test.ts`)**: Synchronizes Recent Uploads list from live backend records and maps statuses to `Verified` or `Needs Review`.

### Tier 2 — Boundary & Corner Cases (15 Suites, 75 Test Cases)
Provides >= 5 boundary, negative, and stress tests for all 15 feature areas:
- **0-byte empty files** and **26MB oversize rejection** (413 Payload Too Large / 400).
- **Unsupported executable types** (`.sh`, `.exe`) and path traversal filenames (`../../../etc/passwd`).
- **Non-existent patient and job UUIDs** (404 Not Found) and non-UUID malformed strings.
- **Security protections**: `javascript:` URI, `data:text/html` URI, and `file:///` local protocol injection rejection in attachment storage URLs.
- **CRLF injection** in multipart boundary headers caught safely by runtime HTTP parsers.
- **Extreme clinical values**: Negative numbers for base excess, qualitative values ("Trace"), and massive clinical notes payloads (50,000+ characters).
- **State safety**: Double-click race condition deduplication, offline network interruptions, and AbortController cleanup.

### Tier 3 — Cross-Feature Integration Workflows (5 Suites, 5 Workflows)
Multi-step clinical journeys across interconnected features:
1. **Camera to Persistence (`cross01_camera_to_clinical_persistence.test.ts`)**: Camera scan -> upload -> OCR review -> editing 5 hematology parameters -> medical record persistence -> verification in patient chart.
2. **Multi-Page PDF to Sync (`cross02_pdf_polling_correction_recent_sync.test.ts`)**: Multi-page PDF import -> polling status transitions -> structured extraction -> doctor correction of low confidence fields -> save to record -> immediate Recent Uploads table synchronization.
3. **Patient Safety Interlock (`cross03_patient_mismatch_hard_stop.test.ts`)**: Upload document with divergent patient ID/name (`+19998887777`) -> Safety Interlock detects mismatch against active chart (`+16505550004`) -> save button strictly locked with mismatch modal -> doctor corrects MRN -> save permitted and verified.
4. **OCR Worker Recovery (`cross04_ocr_failure_recovery_flow.test.ts`)**: OCR job failure simulation -> doctor retry/reprocess trigger -> manual entry fallback enabled -> successful record creation.
5. **Multi-Modal Batch Ingestion (`cross05_multi_format_batch_workflow.test.ts`)**: Sequential upload of PNG, Radiology JPEG, and Pathology PDF -> composite diagnostic record linking all 3 distinct document types.

### Tier 4 — Real-World Specialty Clinical Scenarios (8 Suites, 8 Scenarios)
Authentic outpatient and inpatient hospital medical panels:
1. **Complete Blood Count (`clinical01_complete_blood_count.test.ts`)**: 11 hematology parameters (Hemoglobin, Hematocrit, RBC, WBC, Platelets, MCV, MCH, MCHC, RDW, Neutrophils, Lymphocytes) with clinical reference ranges.
2. **Lipid Panel (`clinical02_lipid_profile.test.ts`)**: Cholesterol, HDL, LDL, Triglycerides, VLDL, and cardiac risk ratio.
3. **Comprehensive Metabolic Panel (`clinical03_comprehensive_metabolic_panel.test.ts`)**: 14 parameters (Glucose, BUN, Creatinine, eGFR, Sodium, Potassium, CO2, Calcium, Protein, Albumin, Bilirubin, ALP, AST, ALT).
4. **Thyroid Function Panel (`clinical04_thyroid_function_panel.test.ts`)**: TSH, Free T3, Free T4, Total T3, Anti-TPO antibodies.
5. **Diagnostic Radiography (`clinical05_diagnostic_imaging_radiology.test.ts`)**: Chest X-ray imaging, cardiothoracic ratio, pulmonary vasculature, and radiologist impression.
6. **Surgical Pathology (`clinical06_multipage_pathology_summary.test.ts`)**: 3-page biopsy summary, gross description, histological margin clearance, and diagnosis.
7. **Complete Urinalysis (`clinical07_urinalysis_microscopic.test.ts`)**: Color, clarity, specific gravity, pH, protein, glucose, ketones, microscopic RBC/WBC.
8. **Emergency STAT Cardiac Panel (`clinical08_cardiac_biomarkers_emergency.test.ts`)**: High-sensitivity Troponin I, CK-MB, Myoglobin, NT-proBNP.

---

## 3. Live Backend Discoveries & Architectural Contracts

1. **Authentication Session Architecture**:
   - Live OTP endpoint `POST /api/v1/auth/otp/request` enforces strict rate limits (HTTP 429).
   - Our test infrastructure implements disk (`.token_cache.json`) and in-memory JWT token caching, validating via `GET /auth/me` and refreshing via `POST /auth/token/refresh` with `refreshToken`.

2. **Attachment Upload Specifications**:
   - `POST /api/v1/attachments` accepts `multipart/form-data` with form field `file`.
   - Magic byte validation is enforced for PDF, JPEG, PNG, WEBP.
   - Streaming private files is provided via `GET /api/v1/attachments/file/:filename` (HTTP 200).

3. **Medical Record Persistence Contract & Implementation Defect**:
   - **Critical Finding**: `POST /api/v1/doctors/patients/:patientProfileId/medical-records` utilizes NestJS `CreateMedicalRecordDto` which strictly forbids `attachments` in the POST body (`BadRequestException: property attachments should not exist`).
   - The authoritative Postman collection specifies that clinical attachments are linked to medical records via `POST /api/v1/medical-records/:id/attachments` with form fields `file`, `category: 'LAB_RESULT'`, and `patientProfileId`.

---

## 4. Implementation Defects to Escalate to Implementers

1. **Defect 1 (CRITICAL — Save Record 400)**:
   - *File*: `src/pages/ocr/MedicalRecordUploadPage.tsx` lines 486–497.
   - *Observation*: `handleSaveToRecord` includes `attachments: [...]` in the payload passed to `patientService.createMedicalRecord`. The backend returns `400 Bad Request: property attachments should not exist`.
   - *Fix Action for Implementer*: Submit `CreateMedicalRecordDto` without the `attachments` property to `createMedicalRecord`. After the record is created with `id`, upload and link the document via `POST /api/v1/medical-records/:id/attachments` (with form field `patientProfileId`).

2. **Defect 2 (Milestone 1 — Patient Demographics 403 / Fallback)**:
   - *File*: `src/services/patientService.ts` lines 810–850.
   - *Observation*: `getPatientById` does not call `GET /api/v1/doctors/patients/:patientProfileId` and instead calls appointment endpoints, falling back to synthetic names.
   - *Fix Action for Implementer*: Call `GET /api/v1/doctors/patients/:patientProfileId` for doctor sessions to resolve real patient demographics (`Marcus Doe`).

3. **Defect 3 (Milestone 2 & 3 — Dummy Attachment ID)**:
   - *File*: `src/pages/ocr/MedicalRecordUploadPage.tsx` line 275.
   - *Observation*: Submits dummy string `medicalAttachmentId: 'attachment-uuid-1'`.
   - *Fix Action for Implementer*: Wire the genuine attachment ID returned from `POST /api/v1/attachments`.

4. **Defect 4 (Milestone 2 — Blob URL as Completed Upload)**:
   - *File*: `src/pages/ocr/MedicalRecordUploadPage.tsx` line 216.
   - *Observation*: Creates local `URL.createObjectURL(file)` without uploading the binary to the server.
   - *Fix Action for Implementer*: Call `attachmentService.uploadAttachment` or `apiHelper.uploadMultipartAttachment` to obtain server `id` and `storageUrl`.

5. **Defect 5 (Milestone 4 — Synthetic Fallback Rows)**:
   - *File*: `src/pages/ocr/types.ts` lines 289–296.
   - *Observation*: Injects 5 synthetic CBC rows when OCR returns empty rows.
   - *Fix Action for Implementer*: Remove the hardcoded 5 fallback rows so the review UI reflects only authentic extracted parameters.
