# Comprehensive Investigation Report: OCR Review Workflow, Dynamic Binding, Medical Record Persistence, and Mock Data Inventory

**Agent**: Survey Subagent 3 (OCR Review & Persistence Explorer)  
**Date**: 2026-11-09  
**Target Repository**: `doctor-web-frontend-main`  
**Authoritative Backend**: `https://360api.vnvision.in`  
**Test Patient ID**: `787e5187-7859-4320-bb1a-465a57dd086a`  

---

## 1. Executive Summary

This investigation delivers a forensic analysis of the existing frontend implementation of the OCR review workflow, dynamic data binding, clinical value editing, medical record persistence, Recent Uploads loading, and a complete inventory of synthetic/mock data.

### Key Findings:
1. **Unified Multi-Step Page Architecture**: All OCR routes (`/records/upload`, `/records/ocr`, `/records/ocr/upload`, `/records/ocr/processing`, `/records/ocr/review`, `/records/ocr/success`, `/ocr/upload`, `/ocr/verify/:id`) map to a single component: `MedicalRecordUploadPage.tsx` at `src/pages/ocr/MedicalRecordUploadPage.tsx`. Transitions between Upload, Processing, Review, and Success are managed via an internal state variable `currentStep: 'upload' | 'processing' | 'review' | 'success'`.
2. **Simulated Timers & Synthetic Progress**: OCR job progress in `handleStartProcessing` uses hardcoded step increments (`20% -> 50% -> 80% -> 100%`) rather than status-driven progress. The transition into the Review screen is delayed by artificial `setTimeout` timers (500ms on initial extraction, 400ms on reprocess retry).
3. **Hardcoded Dummy Attachment ID**: `handleStartProcessing` passes a hardcoded dummy attachment ID `'attachment-uuid-1'` to `ocrService.submitOcrJob()`. The actual selected/scanned document binary is never uploaded to the backend attachment service (`POST /api/v1/attachments`). Furthermore, if submission fails, it pulls the first available job from `ocrService.listOcrJobs({ limit: 1 })`.
4. **Synthetic Fallback Lab Values**: In `src/pages/ocr/types.ts` (lines 289–296), when backend OCR returns empty lab fields, `parseOcrFields()` injects 5 hardcoded Complete Blood Count (CBC) test parameters (Hemoglobin 13.2 g/dL, Hematocrit 40.5%, WBC Count 6.8 x10^3/uL, Platelet Count 240 x10^3/uL, RBC Count 4.42 x10^6/uL), violating the non-fabrication requirement.
5. **Persistence Payload Defects**: When "Save to Record" is submitted, the constructed `CreateMedicalRecordDto` links the attachment using a browser `blob:` Object URL (`uploadedFile.previewUrl`) instead of a genuine backend storage URL/attachment ID. Additionally, the backend review approval endpoint (`POST /api/v1/ocr/review/:jobId`) is never triggered.
6. **Recent Uploads Lifecycle**: The Recent Uploads section correctly loads real records from `patientService.getPatientMedicalRecords(patientId)` and refreshes upon record creation, but is bounded by the active patient chart context.
7. **Duplicate Submission Vulnerability**: The only concurrency guard is a local boolean `isSaving`. There is no idempotency token, post-submission lock, or backend duplication check.

---

## 2. OCR Review Workflow UI & Route Architecture

### 2.1 Route Configuration (`src/routes/index.tsx`)
In `src/routes/index.tsx` (lines 284–316), eight distinct route patterns are registered under the protected layout, all pointing to `MedicalRecordUploadPage`:

| Route Path | Associated Flow / Step | Component |
|---|---|---|
| `/records/upload` | Main Document Upload entry point (Upload State) | `MedicalRecordUploadPage` |
| `/records/ocr` | Alias for OCR workflow root | `MedicalRecordUploadPage` |
| `/records/ocr/upload` | Document capture & dropzone step | `MedicalRecordUploadPage` |
| `/records/ocr/processing` | OCR extraction spinner & progress meter | `MedicalRecordUploadPage` |
| `/records/ocr/review` | Dual-pane Document Review & Verification | `MedicalRecordUploadPage` |
| `/records/ocr/success` | Post-persistence confirmation screen | `MedicalRecordUploadPage` |
| `/ocr/upload` | Legacy/shorthand upload entry point | `MedicalRecordUploadPage` |
| `/ocr/verify/:id` | Direct link to review specific OCR job ID | `MedicalRecordUploadPage` |

### 2.2 Component State Machine (`src/pages/ocr/MedicalRecordUploadPage.tsx`)
The component manages workflow state via:
```typescript
const [currentStep, setCurrentStep] = useState<OcrWorkflowStep>(() => {
  if (location.pathname.includes('/review') || location.pathname.includes('/verify')) {
    return 'review';
  }
  if (location.pathname.includes('/processing')) {
    return 'processing';
  }
  if (location.pathname.includes('/success')) {
    return 'success';
  }
  return 'upload';
});
```

### 2.3 Step Transitions & Data Flow

```
[Upload State (Figma 1:1167)]
  ├── Patient Context: resolved via URL query (?patientId=...) or doctor's assigned list
  ├── File Ingestion: Camera / Computer Dropzone / PDF Import
  ├── Local Validation: format check (.pdf, .png, .jpg, .dicom), size check (<= 25 MB)
  └── User Action: Click "Start OCR Processing"
           │
           ▼
[Processing State (Figma 1:1088)]
  ├── Set step = 'processing', progress = 20%, stage = 0
  ├── Issue POST /api/v1/ocr/jobs (CRITICAL DEFECT: sends 'attachment-uuid-1')
  ├── Poll GET /api/v1/ocr/jobs/:id (ocrService.pollOcrJob)
  ├── Fetch GET /api/v1/ocr/jobs/:id/fields and GET /api/v1/ocr/jobs/:id/text
  ├── Parse fields into demographics & labRows (CRITICAL DEFECT: injects fake CBC rows if empty)
  └── Timer trigger: setTimeout(500ms) -> set step = 'review'
           │
           ▼
[Review & Verification State (Figma 1:1325)]
  ├── Left 60%: Document Canvas (preview image, zoom, rotate, page counter)
  ├── Right 40%: Editable form (Demographics, Report Details, Clinical Lab Table)
  ├── Clinical Interlock: Patient Mismatch Banner + Reconciliation Modal
  └── User Action: Click "Save to Record"
           │
           ▼
[Persistence & Success State (Figma 1:1513)]
  ├── Assemble CreateMedicalRecordDto (CRITICAL DEFECT: attaches blob Object URL)
  ├── Issue POST /api/v1/doctors/patients/:patientProfileId/medical-records
  ├── Refresh Recent Uploads via patientService.getPatientMedicalRecords(patientId)
  └── Render Success Screen with return/upload another actions
```

### 2.4 Representation of OCR Job Status & Simulated Timers
The processing screen (`currentStep === 'processing'`) displays:
- **Circular Progress Ring (Figma 1:1145)**:
  - Outer CSS pulse ring: `animate-ping opacity-30`
  - Orbit spinner: `animate-spin`
  - Document icon: `animate-pulse`
- **Textual Processing Stages (`OCR_PROCESSING_STAGES` in `src/pages/ocr/types.ts:57`)**:
  - `0`: "Reading document raster..."
  - `1`: "Extracting clinical entities & optical characters..."
  - `2`: "Analyzing confidence intervals & field anchors..."
  - `3`: "Normalizing medical nomenclature to EHR format..."
- **Simulated Timers & Fake Progress**:
  - `MedicalRecordUploadPage.tsx:265`: `setProcessingProgress(20)`
  - `MedicalRecordUploadPage.tsx:292`: `setProcessingProgress(50)`
  - `MedicalRecordUploadPage.tsx:301`: `setProcessingProgress(80)`
  - `MedicalRecordUploadPage.tsx:315`: `setProcessingProgress(100)`
  - `MedicalRecordUploadPage.tsx:325–328`:
    ```typescript
    setTimeout(() => {
      setCurrentStep('review');
      setIsProcessing(false);
    }, 500);
    ```
  - `MedicalRecordUploadPage.tsx:342`: `setProcessingProgress(40)` (in `handleRetryOcr`)
  - `MedicalRecordUploadPage.tsx:359`: `setProcessingProgress(100)` (in `handleRetryOcr`)
  - `MedicalRecordUploadPage.tsx:360–363`:
    ```typescript
    setTimeout(() => {
      setCurrentStep('review');
      setIsProcessing(false);
    }, 400);
    ```

---

## 3. Dynamic Binding & Clinical Value Editing

### 3.1 Field Inventory on the OCR Review UI (`data-node-id="1:1325"`)

The review screen is split into a 60% Left Panel and a 40% Right Panel:

#### Left Panel (60%, Document Viewer):
- **Viewer Toolbar (Figma 1:1343)**:
  - Page counter: `Page {currentPageIndex + 1} of {ocrPages.length || 1}`
  - Page navigation buttons: `Prev` (disabled if index 0), `Next` (disabled if index == length - 1)
  - Zoom controls: Zoom Out (`-15%`, min 50%), Zoom In (`+15%`, max 200%), zoom indicator `%`
  - Rotate button: `(rotationDegrees + 90) % 360`
  - Reset button: resets zoom to 100% and rotation to 0
- **Document Canvas (Figma 1:1365)**:
  - Overlays: "OCR Zone: Demographics" badge; if mismatch: "Mismatch: HV ID Scan Mismatch"
  - Image Element: `<img src={uploadedFile?.previewUrl || scannedLabReport} />`
  - **DEFECT**: The canvas always renders `uploadedFile?.previewUrl` (or static asset `scannedLabReport`). Changing `currentPageIndex` via Prev/Next does **not** swap the rendered page image!

#### Right Panel (40%, Extracted Data):
- **Header Badges (Figma 1:1369)**:
  - `{verifiedCount} Verified` (teal pill)
  - `{needsReviewCount} Needs Review` (rose pill) or `All Verified` (emerald pill)
- **Critical Safety Alert Banner (lines 1173–1222)**:
  - Rendered when `isPatientMismatch` is true
  - Displays: "CRITICAL SAFETY ALERT: PATIENT IDENTITY MISMATCH DETECTED"
  - Compares Active Target Chart (`patient.name`, `patient.healthVaultId`) vs Extracted Document Identity (`extractedName`, `extractedHvId`)
  - Actions: "Exit to Patient Directory", "View Reconciliation Details" (opens Hard Stop Modal)
- **Section 1: Patient Demographics (Figma 1:1381)**:
  1. `Patient Name`: Input text, bound to `extractedFields` (`id === 'patient_name'`)
  2. `HV ID`: Input text, bound to `extractedFields` (`id === 'hv_id'`); flagged with alert icon and warning note when mismatched
  3. `DOB`: Input text, bound to `extractedFields` (`id === 'dob'`)
  4. `Gender`: `<select>` element (`Female`, `Male`, `Other`, `Unknown`), bound to `extractedFields` (`id === 'gender'`)
- **Section 2: Report Details (Figma 1:1430)**:
  1. `Hospital / Facility`: Input text, bound to `extractedFields` (`id === 'hospital_facility'`); styled amber if confidence < 0.9
  2. `Collection Date`: Input text, bound to `extractedFields` (`id === 'collection_date'`)
  3. `Report Type`: Input text, bound to `extractedFields` (`id === 'report_type'`)
- **Section 3: Clinical Values (Figma 1:1467)**:
  - Dynamic Table with columns: `Test Name`, `Value`, `Unit`, `Actions` (Delete icon)
  - Header button: `+ Add Row` (`handleAddLabRow`)
  - Each cell is directly editable via inline inputs (`handleLabValueChange`)
- **Bottom Action Bar (Figma 1:1505)**:
  - Inline mismatch error indicator
  - "Cancel" button (`setCurrentStep('upload')`)
  - "Save to Record" button (`handleSaveToRecord`, disabled when `isSaving === true`)

### 3.2 State Management for Doctor Edits
1. **Demographic / Report Details**:
   - Stored in `extractedFields: ExtractedClinicalField[]`.
   - Handled via `handleFieldChange(id: string, newValue: string)`:
     ```typescript
     const handleFieldChange = (id: string, newValue: string) => {
       setMismatchError(null);
       setExtractedFields((prev) =>
         prev.map((f) => {
           if (f.id === id) {
             const isCorrected =
               patient &&
               id === 'hv_id' &&
               normalizeId(newValue) === normalizeId(patient.healthVaultId);
             return {
               ...f,
               value: newValue,
               status: isCorrected ? 'verified' : f.status,
               warningNote: isCorrected ? undefined : f.warningNote,
             };
           }
           return f;
         })
       );
     };
     ```
   - If the doctor corrects the `hv_id` to match the target patient's HealthVault ID, the status dynamically upgrades to `'verified'` and the warning note disappears.
2. **Clinical Lab Values**:
   - Stored in `labValues: ClinicalLabRow[]`.
   - Handled via `handleLabValueChange(id, field, val)`:
     Updates `testName`, `value`, or `unit` in-place on the matching row ID.
   - Row Addition (`handleAddLabRow`):
     Appends `{ id: 'lab_' + Date.now(), testName: 'New Test Parameter', value: '0.0', unit: 'mg/dL', status: 'normal' }`.
   - Row Deletion (`handleDeleteLabRow`):
     Filters out row matching the given ID.

### 3.3 Patient Safety Interlock & Cross-Patient Protection
- Calculated values:
  ```typescript
  const isTargetPatientMatch =
    patient &&
    (normalizeId(extractedHvId) === normalizeId(patient.healthVaultId) ||
      normalizeId(extractedHvId).includes(normalizeId(patient.id)) ||
      extractedName.trim().toLowerCase() === patient.name.trim().toLowerCase());

  const isPatientMismatch = Boolean(patient && extractedName && extractedHvId && !isTargetPatientMatch);
  ```
- If `isPatientMismatch` is true:
  - `handleSaveToRecord` blocks submission immediately.
  - Sets `showMismatchModal(true)` and displays the "Patient Identity Reconciliation Hard Stop" modal (Figma 1:1366 / lines 1562–1657).
  - Cross-patient commitment is strictly prevented.

### 3.4 Injected Fake / Hardcoded Clinical Values
The following fake clinical values are currently injected into the review state:

| Location | Injected Hardcoded Data | Reason / Defect |
|---|---|---|
| `src/pages/ocr/types.ts:289–296` | `Hemoglobin: 13.2 g/dL`, `Hematocrit: 40.5 %`, `WBC Count: 6.8 x10^3/uL`, `Platelet Count: 240 x10^3/uL`, `RBC Count: 4.42 x10^6/uL` | Fabricated fallback rows when OCR returns empty lab fields. Violates non-fabrication requirement. |
| `src/pages/ocr/types.ts:140` | `'CareID Diagnostics Lab'` | Fallback facility name when regex/field extraction misses. |
| `src/pages/ocr/types.ts:150` | `'Complete Blood Count (CBC)'` | Fallback report type when regex/field extraction misses. |
| `src/pages/ocr/types.ts:259, 270, 281` | Reference ranges: `'12.0 - 15.5 g/dL'`, `'4,500 - 11,000 /uL'`, `'150,000 - 450,000 /uL'` | Hardcoded standard reference ranges. |
| `MedicalRecordUploadPage.tsx:473` | Diagnosis code `'Z01.89'` (`Routine medical exam`) | Hardcoded ICD-10 code injected into record persistence payload. |
| `MedicalRecordUploadPage.tsx:481` | Procedure code `'CPT-80053'` (`Comprehensive Metabolic Panel`) | Hardcoded CPT code injected into record persistence payload. |
| `MedicalRecordUploadPage.tsx:483` | `'Processed via automated high-resolution neural OCR.'` | Hardcoded procedure note. |

---

## 4. Medical Record Persistence & Recent Uploads

### 4.1 "Save to Record" Submission Flow (`handleSaveToRecord`)
When the doctor confirms the reviewed data, `handleSaveToRecord` executes:
1. Validates `patient` is loaded.
2. Checks `isPatientMismatch`: if true, aborts save and triggers modal.
3. Sets `isSaving = true`.
4. Assembles clinical notes string incorporating:
   - Report Type
   - Facility Name
   - Collection Date
   - Patient Name & HealthVault ID
   - Formatted list of all clinical lab values (`${testName}: ${value} ${unit} (${referenceRange})`)
5. Constructs `CreateMedicalRecordDto` payload.
6. Calls `patientService.createMedicalRecord(patient.id, payload)`.
   Endpoint: `POST /api/v1/doctors/patients/:patientProfileId/medical-records`.
7. Calls `loadPatientRecentRecords(patient.id)` to reload recent uploads from backend.
8. Sets `currentStep = 'success'`.

### 4.2 Detailed Persistence Payload Structure

```typescript
const payload: CreateMedicalRecordDto = {
  title: `${reportTypeVal} Report`,
  chiefComplaint: `Routine diagnostic test review - ${reportTypeVal}`,
  clinicalNotes: clinicalNotesContent,
  treatmentPlan: 'Maintain current therapeutic protocol. Follow up upon repeat panel if required.',
  status: 'FINAL',
  encounter: {
    providerName: doctorName, // Resolved from authService.getJwtClaims().phone
    facilityName: facilityVal,
    encounterType: 'LABORATORY',
    encounterDate: new Date().toISOString(),
  },
  diagnoses: [
    {
      description: `${reportTypeVal} Evaluation`,
      code: 'Z01.89',
      type: 'PRIMARY',
      status: 'ACTIVE',
    },
  ],
  procedures: [
    {
      name: reportTypeVal,
      code: 'CPT-80053',
      performedAt: collectionDateVal,
      notes: 'Processed via automated high-resolution neural OCR.',
    },
  ],
  attachments: uploadedFile
    ? [
        {
          fileName: uploadedFile.name,
          originalName: uploadedFile.name,
          fileSize: uploadedFile.rawFile?.size || 1048576,
          mimeType: uploadedFile.type,
          storageUrl: uploadedFile.previewUrl, // CRITICAL DEFECT: Browser Object URL
          category: 'LAB_RESULT',
        },
      ]
    : undefined,
};
```

### 4.3 Persistence Deficiencies Identified
1. **Browser Object URL in Payload**: `attachments[0].storageUrl` contains `uploadedFile.previewUrl` (`blob:http://...`). When the session ends, the blob URL becomes invalid and inaccessible to backend systems or other users.
2. **Missing Binary Upload Step**: The user's uploaded file is never dispatched to `POST /api/v1/attachments`. Therefore, no genuine backend attachment ID or S3/cloud storage key exists.
3. **Missing OCR Human Review Confirmation**: Folder 15 of the authoritative Postman collection defines `POST /api/v1/ocr/review/:jobId` (with `{ reviewStatus: 'APPROVED', reviewNotes: '...', corrections: [...] }`) and `POST /api/v1/ai/ocr/confirm`. Neither of these endpoints is called during save, leaving OCR jobs in an unreviewed/unconfirmed audit state.
4. **Duplicate Submission Vulnerability**:
   - Concurrency is only guarded by `const [isSaving, setIsSaving] = useState(false)`.
   - If the user re-clicks or navigates back from Success to Review, another identical medical record is generated.
   - Prevention mechanism needed: Disable submit once saved, track created record ID (`savedRecordId`), and prevent duplicate POST requests for the same OCR job.

### 4.4 Recent Uploads Loading & Refreshing Mechanism
- **Initial Load**: Handled by `resolveTargetPatient()` which calls `loadPatientRecentRecords(profile.id)`.
- **Backend Call**:
  ```typescript
  const loadPatientRecentRecords = async (patientId: string) => {
    setLoadingRecentUploads(true);
    try {
      const records = await patientService.getPatientMedicalRecords(patientId);
      const mapped = records.slice(0, 10).map(mapMedicalRecordToRecentUpload);
      setRecentUploads(mapped);
    } catch {
      setRecentUploads([]);
    } finally {
      setLoadingRecentUploads(false);
    }
  };
  ```
- **Live Endpoint**: Calls `GET /api/v1/doctors/patients/:patientProfileId/medical-records?page=1&limit=20&includeArchived=true`.
- **Entity Mapper (`mapMedicalRecordToRecentUpload` in `src/pages/ocr/types.ts:67–95`)**:
  - `id`: `REC-${record.id.slice(0, 6).toUpperCase()}`
  - `documentName`: `record.title || 'Diagnostic Report'`
  - `type`: `record.encounters?.[0]?.encounterType || 'Laboratory'`
  - `date`: formatted `record.createdAt` (MM/DD/YYYY)
  - `status`: `'Verified'` (if `status === 'FINAL'`), `'Needs Review'` (if `'PRELIMINARY'` or `'DRAFT'`), else `'Saved'`
  - `statusColor`: styling pill matching Figma
  - `action`: `'Review'` (if needs review) or `'View'`
  - `rawRecordId`: `record.id`
- **Actions in Table**: Clicking action navigates to `/records/${row.rawRecordId}?patientId=${patient?.id}`.
- **Refresh Behavior**: Calling `loadPatientRecentRecords(patient.id)` immediately after `createMedicalRecord` successfully updates the table in state before transitioning to `success`. When the user clicks "Upload Another Document", the updated list is displayed.

---

## 5. Complete Mock Data, Fake Logic & Registry Inventory

The following table provides the exhaustive inventory of all synthetic, dummy, hardcoded, or mock items identified in the OCR and upload subsystems:

| Item # | File Path | Line Range | Current Synthetic Code / Content | Defect / Risk | Required Live Implementation |
|---|---|---|---|---|---|
| **M1** | `src/pages/ocr/MedicalRecordUploadPage.tsx` | 275 | `medicalAttachmentId: 'attachment-uuid-1'` | Hardcoded dummy attachment UUID sent to `POST /api/v1/ocr/jobs`. Fails or mocks job creation. | Upload genuine file to `POST /api/v1/attachments` first; use the returned real `data.id`. |
| **M2** | `src/pages/ocr/MedicalRecordUploadPage.tsx` | 279–286 | `const fallbackList = await ocrService.listOcrJobs({ limit: 1 }); submittedJob = fallbackList.items[0];` | Fallback quietly adopts an arbitrary prior OCR job when submission fails. | Report authentic error to user and allow genuine retry; remove silent fallback adoption. |
| **M3** | `src/pages/ocr/MedicalRecordUploadPage.tsx` | 216 | `const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;` | Browser Object URL generated instead of real uploaded attachment reference. | Upload binary file via `multipart/form-data`; use authentic `storageUrl` / file endpoint. |
| **M4** | `src/pages/ocr/MedicalRecordUploadPage.tsx` | 265, 292, 301, 315 | `setProcessingProgress(20)`, `(50)`, `(80)`, `(100)` | Fake hardcoded progress increments disconnected from real backend job progress. | Reflect real backend OCR status (`PENDING` -> `PROCESSING` -> `COMPLETED`). |
| **M5** | `src/pages/ocr/MedicalRecordUploadPage.tsx` | 325–328 | `setTimeout(() => { setCurrentStep('review'); setIsProcessing(false); }, 500);` | Simulated timer delay before switching to review. | Transition immediately upon real backend OCR job completion. |
| **M6** | `src/pages/ocr/MedicalRecordUploadPage.tsx` | 342, 359 | `setProcessingProgress(40)`, `(100)` in `handleRetryOcr` | Synthetic progress values on reprocessing retry. | Bind progress to actual polling status returned from `ocrService.reprocessOcrJob`. |
| **M7** | `src/pages/ocr/MedicalRecordUploadPage.tsx` | 360–363 | `setTimeout(() => { setCurrentStep('review'); setIsProcessing(false); }, 400);` | Simulated timer delay on retry. | Transition immediately upon poll completion. |
| **M8** | `src/pages/ocr/MedicalRecordUploadPage.tsx` | 486–497 | `storageUrl: uploadedFile.previewUrl` in persistence attachments | Browser Object URL stored in permanent medical record payload. | Store genuine backend `storageUrl` and `storageKey` returned from attachment upload. |
| **M9** | `src/pages/ocr/types.ts` | 289–296 | `addLabRow('Hemoglobin', '13.2', ...); addLabRow('Hematocrit', '40.5', ...); addLabRow('WBC Count', '6.8', ...); addLabRow('Platelet Count', '240', ...); addLabRow('RBC Count', '4.42', ...);` | Injects 5 hardcoded CBC clinical lab rows when backend returns empty data. | Return empty array or genuinely extracted items only; allow physician manual entry via "+ Add Row". |
| **M10** | `src/pages/ocr/types.ts` | 140 | `extractFromText(..., 'CareID Diagnostics Lab')` | Injects hardcoded facility name fallback. | Leave empty or use target patient's clinic / encounter facility without inventing data. |
| **M11** | `src/pages/ocr/types.ts` | 150 | `extractFromText(..., 'Complete Blood Count (CBC)')` | Injects hardcoded report type fallback. | Use document type from upload / file name or genuine OCR extraction. |
| **M12** | `src/pages/ocr/MedicalRecordUploadPage.tsx` | 1120–1124 | `<img src={uploadedFile?.previewUrl || scannedLabReport} />` | Document viewer renders static bundled PNG (`scannedLabReport`) or 1st-page object URL; does not handle multi-page PDFs. | Render active page from `ocrPages[currentPageIndex]` or PDF canvas renderer. |
| **M13** | `src/pages/ocr/MedicalRecordUploadPage.tsx` | 136 | `profile.healthCard?.cardNumber || profile.patientNumber || 'HV-' + activePatientId.slice(0, 8).toUpperCase()` | Generates synthetic `'HV-...'` ID when patient has no card or number. | Display actual patient profile ID or 'Not Assigned'. |
| **M14** | `src/pages/ocr/MedicalRecordUploadPage.tsx` | 473, 481, 483 | `code: 'Z01.89'`, `code: 'CPT-80053'`, `notes: 'Processed via automated high-resolution neural OCR.'` | Hardcoded diagnosis and procedure codes injected on save. | Omit or populate from genuine OCR report metadata. |

---

## 6. Figma UI Layout Preservation Checklist

The following approved Figma UI components and layout structures must be strictly preserved without layout breakage or styling divergence:

| Figma Node ID | UI Element Description | Critical Classes / Styles to Preserve |
|---|---|---|
| **1:1167** | Upload Page Container | `max-w-[1440px] mx-auto w-full p-6 space-y-6 bg-[#f8f9fa]` |
| **1:1192** | Patient Summary Bar | `bg-white border border-[#e7e8e9] rounded-[12px] p-5 relative overflow-hidden`, left accent bar `w-2 bg-[#28006d]` |
| **1:1217** | Bento Upload Grid | `grid grid-cols-1 md:grid-cols-3 gap-4` |
| **1:1229** | Computer Upload Dropzone | `border-2 border-dashed rounded-[12px] p-6 border-[#cbc4d4] hover:border-[#5b14b8]` |
| **1:1242** | Import PDF Card | `border border-[#e7e8e9] rounded-[12px] p-6 text-[#006971]` |
| **1:1253** | Supported Formats Strip | `bg-[#f3f4f5] p-4 rounded-[12px] flex justify-between`, pill styles `bg-[#e7e8e9]` |
| **1:1270** | Recent Uploads Table | `border border-[#e7e8e9] rounded-[12px] overflow-hidden`, header `bg-[#f3f4f5]`, status badges |
| **1:1088** | Processing Modal Container | `min-h-screen w-full flex items-center justify-center p-6 bg-[#f8f9fa]` |
| **1:1134** | Central Processing Card | `backdrop-blur-[6px] bg-[rgba(248,249,250,0.92)] border border-[#e1e3e4] rounded-[16px] max-w-[448px] p-8` |
| **1:1145** | Circular Progress Ring | `size-[192px]`, pulse ring `border-4 border-[rgba(0,105,113,0.2)] animate-ping`, orbit `animate-spin` |
| **1:1325** | Review Page Container | `w-full flex flex-col min-h-screen bg-[#f8f9fa]` |
| **1:1326** | Review Header Bar | `h-16 bg-[#f8f9fa] border-b border-slate-200 px-6 flex justify-between sticky top-0 z-20` |
| **1:1341** | 60% / 40% Split Content | `flex-1 flex flex-col lg:flex-row overflow-hidden` (`lg:w-[60%]` and `lg:w-[40%]`) |
| **1:1343** | Viewer Toolbar | `h-12 bg-[#f3f4f5] border-b border-[#cbc4d4] px-4 flex justify-between` |
| **1:1365** | Document Canvas | `bg-white rounded-lg shadow-md p-6 max-w-[680px] w-full transform scale/rotate` |
| **1:1366** | Patient Mismatch Interlock | Rose banner `bg-rose-50 border-2 border-rose-300 rounded-xl p-4`, reconciliation modal |
| **1:1369** | Extracted Data Header | `h-16 border-b border-[#cbc4d4] px-6 flex justify-between`, verified/review pills |
| **1:1381** | Demographics Section | Grid `grid-cols-2 gap-3.5`, input border `#cbc4d4`, focus `#5b14b8` |
| **1:1430** | Report Details Section | Grid `grid-cols-2 gap-3.5`, facility amber accent `#b06000` |
| **1:1467** | Clinical Values Table | Table border `#cbc4d4`, header `bg-[#f3f4f5]`, rows with inline inputs and trash button |
| **1:1505** | Bottom Sticky Action Bar | `h-20 bg-[#f8f9fa] border-t border-[#cbc4d4] px-6 flex justify-between sticky bottom-0` |
| **1:1513** | Success Screen Container | `min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#f8f9fa]` |
| **1:1529** | Double-Ring Success Icon | Outer ring `w-32 h-32 rounded-full bg-[rgba(118,241,255,0.2)]`, inner `bg-[#76f1ff]` |

---

## 7. Migration Blueprint & Recommended API Integration Architecture

To transition the OCR Review & Persistence subsystem to live backend APIs without breaking the layout:

### Step 1: Binary File Upload to `POST /api/v1/attachments`
1. Update `apiClient` or create an `uploadAttachment` helper that supports `multipart/form-data`:
   - Append `file: File`, `category: 'LAB_RESULT'`, and `patientProfileId: patient.id` to a `FormData` instance.
   - Do not pass `'Content-Type': 'application/json'` in headers so the browser sets the boundary automatically.
2. Returns genuine `BackendAttachment` (`id`, `storageUrl`, `storageKey`, `fileName`, `fileSize`, `mimeType`).

### Step 2: Real OCR Job Initiation & Polling
1. Call `ocrService.submitOcrJob({ medicalAttachmentId: realAttachment.id, documentType: 'LAB_REPORT' })`.
2. Poll `ocrService.pollOcrJob(jobId)` until status reaches `'COMPLETED'`, `'FAILED'`, or `'NEEDS_REVIEW'`.
3. Eliminate all `setTimeout` delay calls and synthetic percentage steps. The progress meter should reflect real status stages.

### Step 3: Clean Field Binding & Zero-Fabrication
1. If `ocrService.getOcrJobFields(jobId)` returns empty or minimal fields, render only authentic extracted fields.
2. Remove lines 289–296 in `src/pages/ocr/types.ts` that inject fake CBC lab rows.
3. Allow the physician to add parameters using the existing "+ Add Row" control without pre-injecting synthetic medical values.

### Step 4: Medical Record Persistence & Confirmation
1. In `handleSaveToRecord`, include the authentic backend attachment reference (`storageUrl: realAttachment.storageUrl`, `storageKey: realAttachment.storageKey`).
2. Dispatch `POST /api/v1/ocr/review/:jobId` to officially mark the OCR job review as `APPROVED`.
3. Dispatch `POST /api/v1/doctors/patients/:patientProfileId/medical-records` with real doctor credentials from the active JWT session.
4. Prevent duplicate submission: once submitted, set `hasSubmittedRecordId = true` and lock the "Save to Record" button.

### Step 5: Recent Uploads Verification
1. `loadPatientRecentRecords` continues calling `patientService.getPatientMedicalRecords(patientId)` which automatically reflects the newly saved record.
2. The Recent Uploads table persists across refreshes because data is retrieved directly from the live backend database.
