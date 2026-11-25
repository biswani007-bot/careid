# Frontend Upload Health Record Page (`/records/upload`) — Comprehensive Survey & Investigation Report

**Subagent**: Survey Subagent 2 (Frontend Upload Page Explorer)  
**Date**: 2026-11-09  
**Workspace**: `d:\New folder\New folder\doctor web\doctor-web-frontend-main`  
**State Folder**: `d:\New folder\New folder\doctor web\doctor-web-frontend-main\.agents\teamwork\explorer_survey_frontend_1\`  
**Target Backend**: `https://360api.vnvision.in`  
**Authoritative API Reference**: `Postman collection/CareID-Staging.postman_collection.json`  
**Design Reference**: Figma Nodes `1:1167` (Upload Initial), `1:1088` (OCR Processing), `1:1325` (OCR Review), `1:1513` (Upload Success)

---

## Executive Summary

The CareID Doctor Web Portal's Upload Health Record workflow (`/records/upload`) is currently implemented as a four-stage UI inside a single monolithic component (`src/pages/ocr/MedicalRecordUploadPage.tsx`, 1,662 lines). While the Figma-compliant UI states, styling, responsive layouts, zoom/pan document canvas, and clinical safety interlock modal are visually rich and functional, the underlying data layer is largely disconnected from genuine binary file storage and relies on critical hardcoding:
1. **No Binary File Upload**: Files selected via camera or computer dropzone are never uploaded to the backend attachment upload endpoint (`POST /api/v1/attachments`). Instead, a hardcoded attachment ID (`"attachment-uuid-1"`) is submitted to `POST /api/v1/ocr/jobs`.
2. **Object URL Misuse**: A local browser Object URL (`URL.createObjectURL(file)`) is created at `MedicalRecordUploadPage.tsx:216` and incorrectly persisted as the permanent `storageUrl` when committing the record via `patientService.createMedicalRecord()`.
3. **HTTP Client Limitation**: `src/services/apiClient.ts` only supports JSON payloads (`JSON.stringify(body)` and forced `Content-Type: application/json`), with no support for `multipart/form-data` or `FormData` binary uploads.
4. **Patient Demographic Resolution Defect**: `patientService.getDoctorPatientProfile` attempts to resolve patient demographics by querying the doctor's appointment list (`/api/v1/appointments/doctor/me`) rather than calling the authoritative backend endpoint `GET /api/v1/doctors/patients/:patientProfileId` (or `GET /api/v1/admin/patients/:patientId`). Consequently, Test Patient `787e5187-7859-4320-bb1a-465a57dd086a` is not cleanly resolved unless an appointment happens to exist.
5. **Mock/Fallback Data**: Hardcoded baseline CBC values (`Hemoglobin: 13.2`, `Hematocrit: 40.5`, `WBC: 6.8`, `Platelet: 240`, `RBC: 4.42`) in `src/pages/ocr/types.ts:289-296`, fallback facility names (`CareID Diagnostics Lab`), and static ICD/CPT codes (`Z01.89`, `CPT-80053`) are injected into records.
6. **Build Baseline**: `npm run type-check`, `npm run lint`, and `npm run build` were all executed and passed with 0 errors.

---

## 1. Routing, Architecture & Components

### 1.1 Exact Route Implementation
- **Route Definitions** (`src/routes/index.tsx`, lines 285–316):
  ```tsx
  // 4. OCR & Document Processing
  { path: '/records/upload', element: <MedicalRecordUploadPage /> },
  { path: '/records/ocr', element: <MedicalRecordUploadPage /> },
  { path: '/records/ocr/upload', element: <MedicalRecordUploadPage /> },
  { path: '/records/ocr/processing', element: <MedicalRecordUploadPage /> },
  { path: '/records/ocr/review', element: <MedicalRecordUploadPage /> },
  { path: '/records/ocr/success', element: <MedicalRecordUploadPage /> },
  { path: '/ocr/upload', element: <MedicalRecordUploadPage /> },
  { path: '/ocr/verify/:id', element: <MedicalRecordUploadPage /> },
  ```
- **Routing Engine**: React Router DOM v6.28.2 (`createBrowserRouter`, `RouterProvider`).
- **Guards & Shell**:
  - Guard: `ProtectedLayout` (`src/routes/index.tsx`, lines 54–74) checks `useAuth()`. If unauthenticated or token expired, redirects to `/auth/login`.
  - Shell: `<PatientLayout />` (`src/components/layout/PatientLayout.tsx`).
  - Workstation Specialization: `isSpecialWorkstation` (lines 30–46) matches `/records/upload` and `/ocr`.
    - Automatically suppresses the top global workspace header (search bar, notification badge, profile icon).
    - Removes container padding (`p-0` instead of `p-6`) and allows full viewport width (`w-full`).
    - The dedicated clinical navigation sidebar (`<aside>`, width `w-64`, sticky) remains mounted on the left.
    - Renders `<Breadcrumbs />` and `<Outlet />`.

### 1.2 Component Structure & Page Layout
The entire workflow is housed inside `MedicalRecordUploadPage.tsx` (1,662 lines), structured into 4 sequential workflow states managed by `currentStep` (`OcrWorkflowStep = 'upload' | 'processing' | 'review' | 'success'`):

| State | Figma Node | Key UI Elements | File Line Numbers |
|---|---|---|---|
| **State 1: Upload Initial** | `1:1167` | Breadcrumb navigation (`Patients > Patient Profile > Medical Records > Upload Record`), Header, Patient Summary Bar (`1:1192`), Bento Grid (`1:1217`) with 3 options: Camera Scan, Computer Dropzone, Import PDF; Format selector pills (`PDF`, `PNG`, `JPG / JPEG`, `DICOM`), File Preview Strip, CTA button ("Start OCR Processing"), Recent Uploads table (`1:1270`). | Lines 524–882 |
| **State 2: OCR Processing** | `1:1088` | Blurred document texture background (`scannedLabReport`), Central Card (`1:1134`), Animated concentric double pulse rings (`1:1145`), Center icon badge, Stage subtitle (cycles through 4 stages), Gradient progress bar, Cancel button, Error/Retry state. | Lines 885–980 |
| **State 3: OCR Review** | `1:1325` | Top Review Header (`1:1326`), Split View (`1:1341`): Left 60% Document Viewer (`1:1343`) with page controls (`Page 1 of N`), zoom/rotate/reset controls, interactive SVG canvas with OCR bounding box overlays; Right 40% Extracted Data Panel (`1:1369`) with Verified / Needs Review badges, Patient Identity Mismatch Alert Banner (`ocr-mismatch-banner`), Demographics form (`1:1381`), Report Details form (`1:1430`), Clinical Values table (`1:1467`) with dynamic row add/delete, Sticky bottom action bar (`1:1505`) with "Save to Record". | Lines 983–1487 |
| **State 4: Upload Success** | `1:1513` | Glowing double-ring checkmark illustration (`1:1529`), Title "Health Record Successfully Saved", Description, Ingested File summary card with category and verified pill, CTAs: "Return to Medical Records" and "Upload Another Document". | Lines 1490–1560 |
| **Interlock Modal** | Custom EHR | Patient Identity Reconciliation Hard Stop Modal (`showMismatchModal`, `ocr-mismatch-modal`). Blocks saving when document demographics diverge from open patient chart. | Lines 1562–1657 |

### 1.3 UI Libraries, Styling & State Management
- **Styling**: Tailwind CSS v3.4.17 with utility tokens (`src/styles/tokens.ts`, `src/styles/globals.css`). Helper `cn()` combining `clsx` and `tailwind-merge` (`src/lib/utils.ts`).
- **Icons**: `lucide-react` v0.475.0 (`Upload`, `Camera`, `FileText`, `Check`, `AlertCircle`, `AlertTriangle`, `ZoomIn`, `ZoomOut`, `RotateCw`, `Maximize2`, `ChevronRight`, `Plus`, `Trash2`, `ArrowLeft`, `X`, `FileCheck2`, `Scan`, `Loader2`, `RefreshCw`).
- **State Management**:
  - React local component state (`useState`, `useRef`, `useCallback`, `useEffect`).
  - React Router URL state (`useSearchParams`, `useLocation`, `useNavigate`).
  - Global Session: `AuthContext` (`src/context/AuthContext.tsx`) managing clinician identity and token persistence.

---

## 2. Patient Context Resolution

### 2.1 Current Resolution Logic
In `MedicalRecordUploadPage.tsx` lines 112–161:
```tsx
const urlPatientId =
  searchParams.get('patientId') ||
  (location.state as { patientId?: string })?.patientId ||
  (location.state as { patient?: { id?: string } })?.patient?.id;

let activePatientId = urlPatientId;

if (!activePatientId) {
  // Fetch doctor-assigned patients or patient list to get the active patient context
  const listRes = await patientService.listPatients({ limit: 5 });
  if (listRes.data && listRes.data.length > 0) {
    activePatientId = listRes.data[0].id;
  }
}
```
If `activePatientId` is found, `patientService.getDoctorPatientProfile(activePatientId)` is called, and the returned profile is formatted into `PatientSummary`:
- `id`: `profile.id`
- `name`: `profile.fullName || `${profile.firstName} ${profile.lastName}`.trim()`
- `healthVaultId`: `profile.healthCard?.cardNumber || profile.patientNumber || `HV-${activePatientId.slice(0, 8).toUpperCase()}``
- `age`: calculated from `profile.dateOfBirth` via `calculateAge()`
- `gender`: `profile.gender`
- `verified`: `profile.profileStatus === 'COMPLETED' || profile.userStatus === 'ACTIVE'`

### 2.2 Test Patient ID `787e5187-7859-4320-bb1a-465a57dd086a` Handling
- In `Postman collection/CareID-Staging.postman_environment.json`, line 67:
  `"patientId": "787e5187-7859-4320-bb1a-465a57dd086a"`
- In the existing frontend source code:
  - Test patient ID `787e5187-7859-4320-bb1a-465a57dd086a` is **not referenced anywhere in `src/`**.
  - If a user navigates to `/records/upload` with `?patientId=787e5187-7859-4320-bb1a-465a57dd086a`, `urlPatientId` receives it.
  - However, if the page is visited directly at `/records/upload`, it falls back to the first item from `patientService.listPatients({ limit: 5 })`. If the doctor has no patients assigned or the list is empty, it displays an error banner: *"No patient context selected. Please select a patient from the directory."*

### 2.3 Profile Aggregation Defect in `patientService.ts`
Investigation of `patientService.getDoctorPatientProfile` (`src/services/patientService.ts`, lines 830–930) revealed a significant design gap:
- Lines 854–876 attempt to retrieve demographics by fetching `/api/v1/appointments/doctor/me` and searching for an appointment matching `patientId`.
- If no appointment matches, `patientDemographics` remains empty, defaulting the patient name to `"Patient"` or `"Patient #<id>"`, gender to `"Not Specified"`, and patientNumber to `"PT-<id>"`.
- **Authoritative Postman Endpoint**:
  `GET /api/v1/doctors/patients/:patientProfileId`  
  *Postman folder*: `05. Doctor Portal > Get complete demographic information for an authorized patient`.  
  *Returns*: Full demographic record (`firstName`, `lastName`, `dateOfBirth`, `gender`, `bloodGroup`, `phone`, `email`, `knownAllergies`, `chronicConditions`, `emergencyContact`, `currentAddress`).
  *Admin Fallback*: `GET /api/v1/admin/patients/:patientId`.
- **Required Fix**: `patientService.getDoctorPatientProfile` must directly query `GET /api/v1/doctors/patients/:patientProfileId` (with fallback to `GET /api/v1/admin/patients/:patientId`), completely eliminating the appointments lookup workaround.

### 2.4 Identified Hardcoded Mock Data & Fallbacks
1. `src/pages/ocr/MedicalRecordUploadPage.tsx:275`:
   `medicalAttachmentId: 'attachment-uuid-1'` hardcoded in `ocrService.submitOcrJob()`.
2. `src/pages/ocr/MedicalRecordUploadPage.tsx:493`:
   `storageUrl: uploadedFile.previewUrl` (local `blob:` Object URL) persisted to backend medical record.
3. `src/pages/ocr/types.ts:289–296`:
   Hardcoded baseline CBC values injected when extracted lab values are empty:
   ```ts
   addLabRow('Hemoglobin', '13.2', 'g/dL', '12.0 - 15.5 g/dL');
   addLabRow('Hematocrit', '40.5', '%', '37.0 - 48.0 %');
   addLabRow('WBC Count', '6.8', 'x10^3/uL', '4.5 - 11.0 x10^3/uL');
   addLabRow('Platelet Count', '240', 'x10^3/uL', '150 - 450 x10^3/uL');
   addLabRow('RBC Count', '4.42', 'x10^6/uL', '3.90 - 5.20 x10^6/uL');
   ```
4. `src/pages/ocr/types.ts:140`:
   Fallback facility `'CareID Diagnostics Lab'`.
5. `src/pages/ocr/types.ts:145`:
   Fallback report type `'Complete Blood Count (CBC)'`.
6. `src/pages/ocr/MedicalRecordUploadPage.tsx:473–481`:
   Hardcoded diagnostic code `'Z01.89'` and CPT code `'CPT-80053'` in medical record creation.

### 2.5 Recommended Live Patient Context Flow
1. When `/records/upload` initializes:
   - Extract `patientId` from URL query parameter (`searchParams.get('patientId')`).
   - If missing, fall back to Test Patient ID `787e5187-7859-4320-bb1a-465a57dd086a` (or first patient from `patientService.listPatients()`).
2. Invoke `patientService.getPatientById(patientId)` which executes `GET /api/v1/doctors/patients/:patientProfileId`.
3. Set `patient` state with real patient demographics (`fullName`, `patientNumber`, `dateOfBirth`, `gender`, `profileStatus`).
4. Display resolved demographics in Patient Summary Bar (`1:1192`) and pass `patient.id` down to attachment upload and medical record creation.

---

## 3. Document Upload UI Controls

### 3.1 Camera Scan Control
- **Location**: `MedicalRecordUploadPage.tsx`, lines 643–664.
- **HTML Implementation**:
  ```tsx
  <input
    ref={cameraInputRef}
    type="file"
    accept="image/*"
    capture="environment"
    onChange={handleFileInputChange}
    className="hidden"
  />
  ```
- **Trigger**: Clicking the "Scan with Camera" bento card triggers `cameraInputRef.current?.click()`.
- **Device Behavior**: On mobile / tablet devices with rear cameras, `capture="environment"` directly launches the camera app to take a photo. On desktop workstations without direct camera access, it opens the OS file picker filtered to image formats.
- **Current Frame Processing**:
  - `onChange` triggers `handleFileInputChange(e)`, which takes `e.target.files[0]` and invokes `processSelectedFile(file)`.
  - Validates extension against `['.pdf', '.png', '.jpg', '.jpeg', '.dicom', '.dcm']`.
  - Validates size <= 25 MB (`25 * 1024 * 1024`).
  - Creates local preview URL: `URL.createObjectURL(file)`.
  - Stores in state `uploadedFile: UploadedFileMeta`.
  - **Defect**: The captured frame is kept only in browser memory. No backend upload occurs.

### 3.2 Computer File Upload
- **Location**: `MedicalRecordUploadPage.tsx`, lines 667–698.
- **HTML Implementation**:
  ```tsx
  <input
    ref={fileInputRef}
    type="file"
    accept=".pdf,.png,.jpg,.jpeg,.dicom,.dcm"
    onChange={handleFileInputChange}
    className="hidden"
  />
  ```
- **Dropzone Support**: Handles `onDragOver`, `onDragLeave`, and `onDrop`. Dragging visually highlights the card (`border-[#5b14b8] bg-[#f8f5ff]`).
- **Format Handling**:
  - PNG / JPG: `file.type.startsWith('image/')` triggers `URL.createObjectURL(file)` which displays in the Review viewer.
  - PDF: `previewUrl` is set to `undefined`. In the Review viewer (line 1121):
    `<img src={uploadedFile?.previewUrl || scannedLabReport} ... />`
    Because `previewUrl` is undefined for PDFs, the viewer displays the static fallback PNG (`scannedLabReport`).
  - DICOM (`.dicom`, `.dcm`): Treated as `application/octet-stream`, `previewUrl` is undefined, falls back to `scannedLabReport`.

### 3.3 Multi-Page PDF Import
- **Location**: `MedicalRecordUploadPage.tsx`, lines 700–714.
- **Current Implementation**: Clicking the "Import PDF" card simply invokes `fileInputRef.current?.click()`. It does not perform client-side PDF page slicing.
- **Review Screen Multi-Page Controls** (lines 1028–1052):
  - Displays `Page {currentPageIndex + 1} of {ocrPages.length > 0 ? ocrPages.length : 1}`.
  - Next/Prev buttons update `currentPageIndex`.
  - `ocrPages` is populated from `completedJob.pages` returned by the backend OCR job (`BackendOcrPage[]`).
- **Page Order Preservation**: The backend OCR job returns an ordered `pages` array with `pageNumber: 1, 2, ...`. When genuine file upload is linked, the backend PDF rasterizer extracts pages in sequential order.

### 3.4 Browser Object URLs (`URL.createObjectURL`) Misuse
- **Creation Point**:
  `src/pages/ocr/MedicalRecordUploadPage.tsx:216`:
  ```tsx
  const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
  ```
- **Misuse in Record Persistence** (lines 486–497):
  ```tsx
  attachments: uploadedFile
    ? [
        {
          fileName: uploadedFile.name,
          originalName: uploadedFile.name,
          fileSize: uploadedFile.rawFile?.size || 1048576,
          mimeType: uploadedFile.type,
          storageUrl: uploadedFile.previewUrl, // <-- BUG: Browser Blob URL sent to backend!
          category: 'LAB_RESULT',
        },
      ]
    : undefined,
  ```
- **Misuse in OCR Job Submission** (lines 274–277):
  ```tsx
  submittedJob = await ocrService.submitOcrJob({
    medicalAttachmentId: 'attachment-uuid-1', // <-- BUG: Hardcoded dummy ID!
    documentType: selectedFormat === 'PDF' ? 'LAB_REPORT' : 'DIAGNOSTIC_IMAGE',
  });
  ```
- **Consequences**:
  1. The backend never receives the binary file.
  2. OCR job runs on a dummy or non-existent attachment.
  3. The saved medical record contains a dead `blob:http://...` URL that cannot be accessed by other sessions or persisted across browser restarts.
  4. Memory leak: `URL.revokeObjectURL(previewUrl)` is never called on file reset or component unmount.

### 3.5 Validation Analysis: Current vs Needed

| Validation | Currently Implemented | Needed for Live Backend Integration |
|---|---|---|
| **Extensions** | `.pdf`, `.png`, `.jpg`, `.jpeg`, `.dicom`, `.dcm` | Maintain existing extensions; map to MIME types: `application/pdf`, `image/png`, `image/jpeg`, `application/dicom`. |
| **Max File Size** | 25 MB (`25 * 1024 * 1024`) | Retain 25 MB client validation. Handle backend HTTP 413 (Payload Too Large). |
| **MIME Sanitization** | Basic `file.type` check | Ensure `FormData` binary part includes clean MIME type and filename. |
| **Attachment Linkage** | None (`attachment-uuid-1` placeholder) | Upload binary to `POST /api/v1/attachments` via `multipart/form-data`, obtain authentic `attachment.id` and `storageUrl`, pass to `POST /api/v1/ocr/jobs`. |

---

## 4. Build & Environment Verification

### 4.1 Scripts & Build Verification
Executed all verification scripts from `package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "type-check": "tsc -b --noEmit",
  "lint": "eslint ."
}
```

**Verification Results**:
1. `npm run type-check` (`tsc -b --noEmit`):
   - **Result**: Exit code `0` (Zero TypeScript compilation errors).
2. `npm run lint` (`eslint .`):
   - **Result**: Exit code `0` (Zero ESLint warnings or errors).
3. `npm run build` (`tsc -b && vite build`):
   - **Result**: Exit code `0` (Built successfully in 8.98s).
   - Output: `dist/index.html` (0.94 kB), `dist/assets/index-BZ1IrLlU.css` (106.96 kB), `dist/assets/index-MAOrc3Kv.js` (1,270.07 kB).

### 4.2 HTTP Client Architecture (`src/services/apiClient.ts`)
- **Underlying Engine**: Native browser `fetch` wrapped in `apiRequest<T>()`.
- **Base URL Resolution**:
  `const getBaseUrl = () => (import.meta.env.VITE_API_BASE_URL || 'https://360api.vnvision.in').replace(/\/+$/, '')`
- **Authentication**:
  - Automatically reads `careid_access_token` from `sessionStorage` and injects `Authorization: Bearer <token>`.
  - Mutex-guarded 401 token refresh queue (`subscribeTokenRefresh` / `performTokenRefresh`) using `careid_refresh_token` against `${baseUrl}/api/v1/auth/token/refresh`.
  - On refresh failure, clears storage and dispatches `careid:auth_expired` event.
- **CRITICAL ARCHITECTURAL LIMITATION**:
  - In `apiClient.ts` lines 124–128:
    ```ts
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };
    ```
  - And in `apiClient.post`:
    ```ts
    post: <T>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
      apiRequest<T>(endpoint, {
        method: 'POST',
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }),
    ```
  - **Issue**: If a `FormData` instance is passed as `body`, `JSON.stringify(formData)` evaluates to `"{}"`, and the `Content-Type` is forced to `application/json` instead of letting the browser compute `multipart/form-data; boundary=...`.
  - **Required Addition**: An upload method `apiClient.upload<T>(endpoint, formData)` or auto-detection:
    ```ts
    const isFormData = options.body instanceof FormData;
    const headers: HeadersInit = {
      Accept: 'application/json',
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    };
    ```

### 4.3 Environment Configuration
- `.env`:
  ```
  VITE_APP_TITLE="Doctor-Web Portal"
  VITE_API_BASE_URL="https://360api.vnvision.in"
  ```
- `.env.example`: Configured with the same keys.
- Live backend connectivity test to `https://360api.vnvision.in/api/v1`: Verified reachable and responding.

---

## 5. Authoritative API Specifications (Postman Source of Truth)

From `Postman collection/CareID-Staging.postman_collection.json`:

### 5.1 Attachment Upload Endpoint
- **Folder**: `16. File Uploads & Attachments > Upload an unlinked or global attachment`
- **Method & Path**: `POST /api/v1/attachments`
- **Headers**:
  - `Authorization: Bearer {{accessToken}}`
  - `Accept: application/json`
  - *(Omit `Content-Type` to allow multipart boundary)*
- **Body**: `multipart/form-data`
  - `file`: binary file
  - `category`: `"LAB_RESULT"` | `"DIAGNOSTIC_REPORT"`
  - `patientProfileId`: `<patient UUID>`
- **Response Schema** (`201 Created`):
  ```json
  {
    "id": "attachment-uuid",
    "medicalRecordId": "string",
    "patientProfileId": "string",
    "fileName": "string",
    "originalName": "string",
    "fileSize": 1048576,
    "mimeType": "application/pdf",
    "category": "LAB_RESULT",
    "storageKey": "string",
    "storageUrl": "https://cdn.vnvision.in/attachments/...",
    "checksum": "string",
    "version": 1,
    "virusScanStatus": "PASSED",
    "createdAt": "2026-11-09T00:00:00.000Z",
    "updatedAt": "2026-11-09T00:00:00.000Z"
  }
  ```

### 5.2 OCR Job Creation Endpoint
- **Folder**: `15. OCR & Document Verification > Submit medical attachment for local CPU OCR processing`
- **Method & Path**: `POST /api/v1/ocr/jobs`
- **Headers**: `Content-Type: application/json`, `Accept: application/json`
- **Body**:
  ```json
  {
    "medicalAttachmentId": "<attachment.id from 5.1>",
    "documentType": "LAB_REPORT"
  }
  ```
- **Response Schema** (`201 Created`): Returns `BackendOcrJob` with `id`, `status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"`.

### 5.3 OCR Job Polling & Retrieval Endpoints
- `GET /api/v1/ocr/jobs/:id` — Status and full job metadata
- `GET /api/v1/ocr/jobs/:id/fields` — Extracted structured fields (`BackendOcrField[]`)
- `GET /api/v1/ocr/jobs/:id/text` — Extracted raw OCR text
- `POST /api/v1/ocr/reprocess/:jobId` — Reprocess job if failed

### 5.4 Medical Record Persistence Endpoint
- **Folder**: `05. Doctor Portal > Create medical record for an authorized patient`
- **Method & Path**: `POST /api/v1/doctors/patients/:patientProfileId/medical-records`
- **Headers**: `Content-Type: application/json`, `Accept: application/json`
- **Payload**:
  ```json
  {
    "title": "Complete Blood Count (CBC) Report",
    "chiefComplaint": "Routine diagnostic test review",
    "clinicalNotes": "...",
    "treatmentPlan": "...",
    "status": "FINAL",
    "encounter": {
      "providerName": "Dr. Clinical",
      "facilityName": "CareID Diagnostics Lab",
      "encounterType": "LABORATORY",
      "encounterDate": "2026-11-09T00:00:00.000Z"
    },
    "attachments": [
      {
        "fileName": "sample.pdf",
        "originalName": "sample.pdf",
        "fileSize": 1048576,
        "mimeType": "application/pdf",
        "storageUrl": "<real storageUrl from attachment response>",
        "category": "LAB_RESULT"
      }
    ]
  }
  ```

### 5.5 Recent Uploads Query
- **Endpoint**: `GET /api/v1/doctors/patients/:patientProfileId/medical-records?page=1&limit=20`
- Maps directly to Recent Uploads table via existing `mapMedicalRecordToRecentUpload()` in `src/pages/ocr/types.ts`.

---

## 6. Implementation Action Plan for Downstream Agents

| Step | Action Item | Target File(s) | Specific Changes |
|---|---|---|---|
| **Step 1** | Add Multipart / Binary Upload Support | `src/services/apiClient.ts` | Update `apiRequest` to detect `options.body instanceof FormData` and omit `'Content-Type': 'application/json'` so the browser sets the multipart boundary. Add `apiClient.upload<T>(endpoint, formData, headers)`. |
| **Step 2** | Create Attachment Service | `src/services/attachmentService.ts` (new) or `src/services/patientService.ts` | Implement `uploadAttachment({ file, category, patientProfileId })` invoking `POST /api/v1/attachments` with `FormData`. Return authentic `MedicalAttachment` containing real `id` and `storageUrl`. |
| **Step 3** | Fix Patient Demographic Retrieval | `src/services/patientService.ts` | Update `getDoctorPatientProfile(patientId)` to call `GET /api/v1/doctors/patients/:patientProfileId` directly (with fallback to `/api/v1/admin/patients/:patientId`). Eliminate fallback to appointments. |
| **Step 4** | Wire Real Binary Upload in Workflow | `src/pages/ocr/MedicalRecordUploadPage.tsx` | In `handleStartProcessing`: First upload `uploadedFile.rawFile` to `POST /api/v1/attachments`, await genuine `attachmentId`, then pass `attachmentId` to `ocrService.submitOcrJob({ medicalAttachmentId: attachmentId })`. |
| **Step 5** | Eliminate Browser Object URL Persistence | `src/pages/ocr/MedicalRecordUploadPage.tsx` | Use `attachment.storageUrl` (or `attachment.id`) in `handleSaveToRecord` payload instead of `uploadedFile.previewUrl`. Call `URL.revokeObjectURL` on cleanup. |
| **Step 6** | Remove Mock Fallback Injections | `src/pages/ocr/types.ts` | Remove lines 289–296 where hardcoded CBC lab values (`13.2`, `40.5`, etc.) are injected into empty results. If OCR yields no lab values, render an empty state or extracted raw text without fabricated numbers. |
| **Step 7** | Default to Test Patient ID | `src/pages/ocr/MedicalRecordUploadPage.tsx` | If no `patientId` parameter is provided in query params or route state, default to Test Patient ID `787e5187-7859-4320-bb1a-465a57dd086a` and resolve their live backend chart. |
| **Step 8** | Verification & Regression Check | Root workspace | Run `npm run type-check`, `npm run lint`, and `npm run build` to verify clean build. |
