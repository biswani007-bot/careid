# Handoff Report: Frontend Upload Health Record Survey & Architecture Analysis

**Agent**: Survey Subagent 2 (Frontend Upload Page Explorer)  
**Conversation ID**: `b113fb9d-b19a-42ca-bc61-527100c27a0e`  
**Caller ID**: `90607c31-ed2c-4214-ada9-7795dd6dd0e4`  
**Handoff Type**: Hard (Investigation complete)  
**Target File**: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_survey_frontend_1\handoff.md`  
**Analysis Reference**: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_survey_frontend_1\analysis.md`

---

## 1. Observation

1. **Route Mapping**:
   - `src/routes/index.tsx`, lines 285–316:
     ```tsx
     // 4. OCR & Document Processing
     {
       path: '/records/upload',
       element: <MedicalRecordUploadPage />,
     },
     ```
     `/records/upload`, `/records/ocr`, `/records/ocr/upload`, `/records/ocr/processing`, `/records/ocr/review`, and `/records/ocr/success` all route to `MedicalRecordUploadPage` within `ProtectedLayout` (`PatientLayout`).
   - `src/components/layout/PatientLayout.tsx`, lines 30–46:
     `isSpecialWorkstation` matches `/records/upload` and `/records/ocr`. It removes the top navbar search and notification header, keeps the full-height left navigation sidebar (`w-64`), and sets the main content area to full width with zero outer padding (`p-0 w-full`).

2. **Hardcoded OCR Job Attachment ID**:
   - `src/pages/ocr/MedicalRecordUploadPage.tsx`, lines 270–277:
     ```tsx
     // Step 1: Submit attachment for local CPU OCR processing
     // POST /api/v1/ocr/jobs
     let submittedJob: import('@/services/ocrService').BackendOcrJob;
     try {
       submittedJob = await ocrService.submitOcrJob({
         medicalAttachmentId: 'attachment-uuid-1',
         documentType: selectedFormat === 'PDF' ? 'LAB_REPORT' : 'DIAGNOSTIC_IMAGE',
       });
     }
     ```
     The user's chosen file (`rawFile`) is never uploaded to the backend before initiating the OCR job. Instead, the dummy string `'attachment-uuid-1'` is sent.

3. **Object URL Creation and Misuse**:
   - `src/pages/ocr/MedicalRecordUploadPage.tsx`, line 216:
     ```tsx
     const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
     ```
   - `src/pages/ocr/MedicalRecordUploadPage.tsx`, lines 486–497:
     ```tsx
     attachments: uploadedFile
       ? [
           {
             fileName: uploadedFile.name,
             originalName: uploadedFile.name,
             fileSize: uploadedFile.rawFile?.size || 1048576,
             mimeType: uploadedFile.type,
             storageUrl: uploadedFile.previewUrl,
             category: 'LAB_RESULT',
           },
         ]
       : undefined,
     ```
     `uploadedFile.previewUrl` (a temporary browser `blob:` Object URL) is passed as `storageUrl` when creating the persistent medical record on the backend. No backend file upload is executed.

4. **HTTP Client Binary Upload Incompatibility**:
   - `src/services/apiClient.ts`, lines 124–128:
     ```ts
     const headers: HeadersInit = {
       'Content-Type': 'application/json',
       Accept: 'application/json',
       ...options.headers,
     };
     ```
   - `src/services/apiClient.ts`, lines 238–243:
     ```ts
     post: <T>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
       apiRequest<T>(endpoint, {
         method: 'POST',
         headers,
         body: body !== undefined ? JSON.stringify(body) : undefined,
       }),
     ```
     Passing a `FormData` object to `apiClient.post` stringifies it to `"{}"` and sets `Content-Type: application/json`, preventing binary uploads.

5. **Patient Demographics Resolution Defect**:
   - `src/services/patientService.ts`, lines 854–876:
     In `getDoctorPatientProfile(patientId)`, the code queries `/api/v1/appointments/doctor/me` and searches for an appointment matching `patientId` to infer `firstName`, `lastName`, `mrn`, etc.
   - If no matching appointment exists, demographics fall back to `"Patient"`, `"Not Specified"`, etc.
   - Authoritative Postman collection request:
     `GET /api/v1/doctors/patients/:patientProfileId` (*"Get complete demographic information for an authorized patient"*, Postman folder `05. Doctor Portal`).
     And admin fallback: `GET /api/v1/admin/patients/:patientId`.
   - `Postman collection/CareID-Staging.postman_environment.json`, line 67:
     `"patientId": "787e5187-7859-4320-bb1a-465a57dd086a"`.

6. **Injected Mock Clinical Values**:
   - `src/pages/ocr/types.ts`, lines 289–296:
     ```ts
     if (labRows.length === 0) {
       // Default baseline CBC structure extracted from telemetry
       addLabRow('Hemoglobin', '13.2', 'g/dL', '12.0 - 15.5 g/dL');
       addLabRow('Hematocrit', '40.5', '%', '37.0 - 48.0 %');
       addLabRow('WBC Count', '6.8', 'x10^3/uL', '4.5 - 11.0 x10^3/uL');
       addLabRow('Platelet Count', '240', 'x10^3/uL', '150 - 450 x10^3/uL');
       addLabRow('RBC Count', '4.42', 'x10^6/uL', '3.90 - 5.20 x10^6/uL');
     }
     ```
     Whenever an OCR response lacks parsed lab rows, fabricated CBC values are injected into the review UI.

7. **Camera and Dropzone Controls**:
   - `src/pages/ocr/MedicalRecordUploadPage.tsx`, lines 643–655:
     Camera input uses `<input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" />`.
   - Lines 667–686:
     Dropzone uses `<input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.dicom,.dcm" className="hidden" />`.
   - Both delegate to `processSelectedFile(file)` (lines 196–226), which validates extension against `['.pdf', '.png', '.jpg', '.jpeg', '.dicom', '.dcm']` and size against `25 * 1024 * 1024` (25 MB).

8. **Build and Verification Commands**:
   - Executed `npm run type-check`: Finished with exit code `0` (Zero TypeScript errors).
   - Executed `npm run lint`: Finished with exit code `0` (Zero ESLint errors).
   - Executed `npm run build`: Finished with exit code `0` (Vite production build succeeded in 8.98s).

---

## 2. Logic Chain

1. From **Observation 2**, `MedicalRecordUploadPage.tsx` lines 270–277 passes `'attachment-uuid-1'` as the `medicalAttachmentId` to `ocrService.submitOcrJob()`.
2. From **Observation 3**, `MedicalRecordUploadPage.tsx` lines 486–497 stores `uploadedFile.previewUrl` (`URL.createObjectURL(file)`) as `storageUrl` when calling `patientService.createMedicalRecord()`.
3. From (1) and (2), the frontend currently creates an illusion of a completed upload locally in the browser without uploading any binary payload to the server. This directly violates Acceptance Criteria:
   - *"File uploads via camera, file picker, and PDF import return authentic backend attachment IDs."*
   - *"No local Object URLs are treated as completed uploads."*
4. From **Observation 4**, `apiClient.ts` stringifies all request bodies to JSON and forces `Content-Type: application/json`. Therefore, any attempt to upload `FormData` through `apiClient.post` would silently fail or produce `{}`. A multipart upload mechanism is strictly necessary.
5. From **Observation 5**, `patientService.getDoctorPatientProfile` relies on appointment presence instead of directly calling `GET /api/v1/doctors/patients/:patientProfileId`. Because test patient `787e5187-7859-4320-bb1a-465a57dd086a` may not have an active appointment scheduled with the authenticated doctor, demographics fail to resolve and display as generic placeholders.
6. From **Observation 6**, fabricated CBC telemetry is automatically appended whenever `labRows.length === 0`. This violates R6 (*"Remove all mock registries, hardcoded names/IDs, fake OCR responses, and placeholder responses across the workflow"*).
7. From **Observation 8**, the frontend project is structurally stable and strictly typed (zero build, lint, or type-check failures). Downstream integration changes can be implemented with high confidence without breaking existing architectural conventions.

---

## 3. Caveats

1. **Backend Attachment API Payload Format**: The Postman documentation for `POST /api/v1/attachments` lists `Accept: application/json` and multipart file upload. The implementer must ensure the `FormData` field name is either `file` or matches the backend controller expectation (`attachment` or `file`).
2. **DICOM Viewing**: Browsers cannot natively render DICOM binaries via standard `<img>` tags. Currently, DICOM files fall back to the static lab report asset in the review viewer. Genuine DICOM viewing requires either backend rasterization (as returned by `completedJob.pages`) or an external DICOM viewer (e.g. CornerstoneJS), but the OCR text and attachment linkage can still proceed through standard file upload.
3. **Staging API Rate Limiting**: The live backend (`https://360api.vnvision.in/api/v1`) returned HTTP 429 during an OTP request probe due to IP rate limits. Downstream test execution should reuse established sessions or valid stored tokens where possible.

---

## 4. Conclusion

The Upload Health Record page (`/records/upload`) is architecturally sound in terms of routing, layout, and UI state rendering, but currently operates on a pseudo-upload pipeline using browser blob URLs and hardcoded mock data.

To fulfill all requirements of `ORIGINAL_REQUEST.md`:
1. **HTTP Client**: Update `src/services/apiClient.ts` to support `multipart/form-data` (omit `Content-Type: application/json` when body is `FormData`).
2. **Binary Upload**: Implement `uploadAttachment` invoking `POST /api/v1/attachments` to acquire genuine attachment IDs and cloud storage URLs.
3. **Workflow Integration**: In `MedicalRecordUploadPage.tsx`, upload the file first, receive the real `attachmentId`, pass it to `POST /api/v1/ocr/jobs`, and use the returned `storageUrl` when saving to the medical record.
4. **Patient Context**: Update `patientService.getDoctorPatientProfile` to invoke `GET /api/v1/doctors/patients/:patientProfileId` and default standalone visits to Test Patient `787e5187-7859-4320-bb1a-465a57dd086a`.
5. **Mock Data Removal**: Delete fallback CBC telemetry from `src/pages/ocr/types.ts` (lines 289–296) and dynamicize ICD/CPT codes.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Route & Component Binding**:
   - Inspect `src/routes/index.tsx`, lines 285–316.
   - Inspect `src/components/layout/PatientLayout.tsx`, lines 30–46 (`isSpecialWorkstation`).
2. **Verify Hardcoded Attachment ID**:
   - Inspect `src/pages/ocr/MedicalRecordUploadPage.tsx`, line 275 (`attachment-uuid-1`).
3. **Verify Object URL Misuse**:
   - Inspect `src/pages/ocr/MedicalRecordUploadPage.tsx`, line 216 and line 493.
4. **Verify Mock Lab Fallbacks**:
   - Inspect `src/pages/ocr/types.ts`, lines 289–296.
5. **Verify Patient Demographics Lookup**:
   - Inspect `src/services/patientService.ts`, lines 854–876.
6. **Verify Build Baseline**:
   - Run `npm run type-check` (passes with code 0).
   - Run `npm run lint` (passes with code 0).
   - Run `npm run build` (passes with code 0).
7. **Verify Postman Authoritative Endpoints**:
   - Inspect `Postman collection/CareID-Staging.postman_collection.json` under folders:
     - `05. Doctor Portal` (`GET /api/v1/doctors/patients/:patientProfileId`, `POST /api/v1/doctors/patients/:patientProfileId/medical-records`)
     - `15. OCR & Document Verification` (`POST /api/v1/ocr/jobs`, `GET /api/v1/ocr/jobs/:id`)
     - `16. File Uploads & Attachments` (`POST /api/v1/attachments`)
