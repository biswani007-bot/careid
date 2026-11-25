# Milestone 2 — Explorer 2 Handoff Report
# Integration of Authentic Document Uploads in MedicalRecordUploadPage.tsx

**From**: Explorer 2 (`explorer_m2_2`)  
**To**: Orchestrator / Milestone 2 Worker  
**Date**: 2026-11-09  
**Target File**: `src/pages/ocr/MedicalRecordUploadPage.tsx`  
**State Folder**: `.agents/teamwork/explorer_m2_2/`

---

## 1. Observation

1. **Ephemeral Object URL Assigned as Permanent Storage Reference**:
   - In `src/pages/ocr/MedicalRecordUploadPage.tsx`, line 222:
     ```typescript
     const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
     ```
   - In line 499 (`handleSaveMedicalRecord`):
     ```typescript
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
     `uploadedFile.previewUrl` is assigned directly to the `storageUrl` field sent in the `POST /api/v1/doctors/patients/:patientProfileId/medical-records` payload. If the file is an image, it submits an ephemeral `blob:http://localhost:5173/<uuid>` URL. If the file is a PDF, `storageUrl` is undefined.

2. **Hardcoded Mock Attachment ID in OCR Submission**:
   - In `src/pages/ocr/MedicalRecordUploadPage.tsx`, lines 280–283 (`handleStartProcessing`):
     ```typescript
     submittedJob = await ocrService.submitOcrJob({
       medicalAttachmentId: 'attachment-uuid-1',
       documentType: selectedFormat === 'PDF' ? 'LAB_REPORT' : 'DIAGNOSTIC_IMAGE',
     });
     ```
     Because `processSelectedFile` only sets client state without transmitting the binary to the server, the OCR submission passes a dummy string `'attachment-uuid-1'`.

3. **Current State Model Lacks Server Metadata**:
   - In `src/pages/ocr/MedicalRecordUploadPage.tsx`, lines 42–48:
     ```typescript
     interface UploadedFileMeta {
       rawFile?: File;
       name: string;
       size: string;
       type: string;
       previewUrl?: string;
     }
     ```
     The interface lacks properties for authentic server UUID (`attachmentId`), server streaming URL (`storageUrl`), storage filesystem key (`storageKey`), and async transmission status (`isUploading`).

4. **Camera Scan Control Routes Through Generic Local Handler**:
   - In `src/pages/ocr/MedicalRecordUploadPage.tsx`, lines 660–670:
     ```tsx
     <div onClick={() => cameraInputRef.current?.click()} ...>
       <input
         ref={cameraInputRef}
         type="file"
         accept="image/*"
         capture="environment"
         onChange={handleFileInputChange}
         className="hidden"
       />
     ```
     The camera scan card triggers an input whose `onChange` handler delegates to `handleFileInputChange`, which only runs local validation without authentic backend upload. There is no dedicated `handleCameraCapture` handler for converting video canvas frames to a binary Blob/File.

5. **Live Backend Attachment Upload Verified**:
   - Probing `POST /api/v1/attachments` via multipart form-data (field `file`) against `https://360api.vnvision.in`:
     - Returns HTTP `201 Created`
     - Response structure:
       ```json
       {
         "id": "fd67e015-a8af-4754-87cc-e2e2abb015e5",
         "fileName": "att-787e5187-7859-4320-bb1a-465a57dd086a-1794207446598-scanned-lab-report.png",
         "originalName": "scanned-lab-report.png",
         "fileSize": 21855,
         "mimeType": "image/png",
         "category": "LAB_RESULT",
         "storageKey": "attachments/att-...",
         "storageUrl": "/api/v1/attachments/file/att-..."
       }
       ```
   - E2E tests `Feature 3: File Picker Computer Upload` (5/5 tests passing) and `Feature 4: Camera Scan Document Capture` (TC-F04-01 through TC-F04-03) verified this contract against the live backend.

---

## 2. Logic Chain

1. **Step 1: Cause of Mock OCR Submission**:
   - From Observation 2, `handleStartProcessing` uses `'attachment-uuid-1'` because Observation 1 shows that selecting a file via `processSelectedFile` never uploads binary data to the server.
   - Therefore, real OCR job submission is impossible until an authentic upload executes and returns a real backend attachment UUID.

2. **Step 2: Cause of Ephemeral `blob:` Leakage**:
   - From Observation 1, `uploadedFile.previewUrl` was overloaded as both a visual preview and the `storageUrl` payload reference.
   - Requirement R2 and E2E test `TC-F06-03` mandate that persisted medical records must never contain `blob:` URLs.
   - Therefore, `UploadedFileMeta` must decouple ephemeral client previews (`previewUrl`) from the authentic server stream URL (`storageUrl`).

3. **Step 3: Solution for Computer File Upload**:
   - Update `processSelectedFile` / `executeDocumentUpload`:
     - Validate file extension and size (<= 25 MB, > 0 bytes).
     - Assign ephemeral `previewUrl = URL.createObjectURL(file)` strictly for `<img>` rendering during local review.
     - Call `attachmentService.uploadAttachment(file, { originalName: file.name, category: 'LAB_RESULT', patientProfileId: patient.id })`.
     - Update `uploadedFile` state with `attachmentId: res.id`, `storageUrl: res.storageUrl`, `storageKey: res.storageKey`, `fileName: res.fileName`, and `isUploading: false`.

4. **Step 4: Solution for Camera Scan Control**:
   - Introduce `handleCameraCapture(blobOrFile, filename)`:
     - If input is a video canvas frame, convert via `canvas.toBlob(...)` and wrap into a `File` with name `careid_cam_capture_${Date.now()}.jpg` (matching `TC-F04-02`).
     - Check 0-byte boundary (reject if 0 bytes, matching `TC-B04-01`).
     - Handle permission errors gracefully without unhandled exceptions (matching `TC-B04-05`).
     - Upload directly to `POST /api/v1/attachments` via `attachmentService.uploadAttachment`.

5. **Step 5: Updating Handlers**:
   - In `handleStartProcessing`: Pass `medicalAttachmentId: uploadedFile.attachmentId`.
   - In `handleSaveMedicalRecord`: Set `storageUrl: uploadedFile.storageUrl` (`/api/v1/attachments/file/...`), with defensive check ensuring no `blob:` URL is transmitted.

---

## 3. Caveats

1. **Dependency on `src/services/attachmentService.ts`**:
   - The worker must ensure `src/services/attachmentService.ts` (designed by Explorer 1) is created and exported before or in tandem with updating `MedicalRecordUploadPage.tsx`.
2. **Backend Magic-Byte Validation**:
   - The backend validates true binary file headers (magic numbers). Synthetic non-image text files renamed to `.png` or `.pdf` will receive HTTP 400. In E2E tests and manual testing, real fixtures from `tests/e2e/helpers/fixtures.ts` must be used.
3. **Multi-Page PDF Import Coordination**:
   - Explorer 3 is investigating multi-page PDF rendering specifics and format chip UI constraints. The upload pipeline designed here accommodates PDF binaries natively without format-specific branching.

---

## 4. Conclusion

- The mock upload behavior in `MedicalRecordUploadPage.tsx` can be completely replaced by integrating `attachmentService.uploadAttachment()` within an updated `executeDocumentUpload` and `handleCameraCapture` pipeline.
- The `uploadedFile` state must store authentic server properties (`attachmentId`, `storageUrl`, `storageKey`, `fileName`) while isolating `previewUrl` exclusively for client-side visual display in `<img>` at line 1143.
- `medicalAttachmentId: 'attachment-uuid-1'` in line 281 must be replaced with `uploadedFile.attachmentId`.
- In `handleSaveMedicalRecord`, `storageUrl` must be set to `uploadedFile.storageUrl`.
- The exact unified diffs, state models, and test matrices are fully detailed in `analysis.md`.

---

## 5. Verification Method

### 1. TypeScript & Code Quality
```bash
npm run type-check
npm run lint
```
**Expected**: 0 errors, 0 warnings.

### 2. Feature 3: File Picker Computer Upload
```bash
node --experimental-strip-types tests/e2e/runner.ts --filter=TC-F03
```
**Expected**: All 5 test cases in `feature03_file_picker_upload.test.ts` pass:
- TC-F03-01: Upload PDF document via computer picker returns HTTP 201 and storageUrl
- TC-F03-02: Upload PNG image via computer picker returns HTTP 201 and image metadata
- TC-F03-03: Upload JPG image via computer picker returns HTTP 201 and valid attachment ID
- TC-F03-04: Upload DICOM binary via computer picker returns HTTP 201 or 400 format validation
- TC-F03-05: Uploaded attachment contains genuine checksum and initial version number 1

### 3. Feature 4: Camera Scan Document Capture
```bash
node --experimental-strip-types tests/e2e/runner.ts --filter=TC-F04
```
**Expected**: All 5 test cases in `feature04_camera_scan_capture.test.ts` pass:
- TC-F04-01: Converted camera frame blob uploads as authentic binary returning 201 Created
- TC-F04-02: Camera scan upload preserves JPEG mimeType and camera-generated filename
- TC-F04-03: Camera scan generates authentic storageKey under attachments prefix
- TC-F04-04: Camera scan attachment file is streamable via GET /api/v1/attachments/file/:filename
- TC-F04-05: Camera scan attachment binds to active patient profile ID

### 4. Feature 6: Eliminate Browser Object URL as Upload
```bash
node --experimental-strip-types tests/e2e/runner.ts --filter=TC-F06
```
**Expected**: All test cases in `feature06_eliminate_object_url.test.ts` pass:
- TC-F06-01: Server attachment UUID returned, not blob: URL
- TC-F06-02: Backend storageUrl formatted as authentic API endpoint (/api/v1/attachments/file/...)
- TC-F06-03: Medical record creation does not contain blob: URL
- TC-F06-04: Authentic storageUrl remains valid across multiple requests
- TC-F06-05: Attachment entity contains physical storageKey under attachments/

### 5. Invalidation Conditions
- Any occurrence of `medicalAttachmentId: 'attachment-uuid-1'` in `MedicalRecordUploadPage.tsx`.
- Any submission of a `blob:` URL in the `createMedicalRecord` payload.
- File upload failing silently without an error banner.
- Ephemeral `previewUrl` not being revoked on file removal or replacement.
