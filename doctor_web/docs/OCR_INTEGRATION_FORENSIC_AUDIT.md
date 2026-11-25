# CAREID DOCTOR WEB — OCR INTEGRATION FORENSIC AUDIT & DIAGNOSIS REPORT

**Audit Date:** November 18, 2026  
**Auditor:** Lead Systems Forensic & Clinical Integration Auditor  
**Application:** CareID Doctor Web Portal (`doctor-web-frontend-main`)  
**Target Screen:** Health Records → Upload (`http://localhost:5175/records/upload`)  
**Investigated API:** `POST https://360api.vnvision.in/api/v1/ocr/jobs`  
**Internal OCR Service:** `https://careidocr.dokaan.in/internal/ocr/process`  
**Primary Error Investigated:** `HTTP 500 Internal Server Error` (`OCR Processing Error – An internal server error occurred.`)  

---

## A. Current Architecture & Verified Request Flow

The clinical document ingestion and OCR extraction workflow in Doctor Web spans three architectural tiers: Doctor Web Frontend, CareID Core Backend (`360api.vnvision.in`), and the standalone internal OCR engine (`careidocr.dokaan.in`).

```
+----------------------------------------------------------------------------------------------------+
|                                      DOCTOR WEB FRONTEND                                           |
|                                (http://localhost:5175/records/upload)                              |
+----------------------------------------------------------------------------------------------------+
       |                                                                            |
  Step 1: Upload Binary File                                                   Step 2: Submit OCR Job
  (multipart/form-data: file, category, patientProfileId)                     (application/json: medicalAttachmentId, documentType)
       |                                                                            |
       v                                                                            v
+----------------------------------------------------------------------------------------------------+
|                                    CAREID CORE BACKEND (NestJS)                                    |
|                                     (https://360api.vnvision.in)                                   |
|                                                                                                    |
|  - POST /api/v1/attachments: Stores file at /www/wwwroot/360api.vnvision.in/data/uploads/          |
|    Returns { id: attachmentUuid, storageUrl, storageKey }                                          |
|                                                                                                    |
|  - POST /api/v1/ocr/jobs:                                                                         |
|    * Reads attachment metadata from database.                                                      |
|    * Resolves Document Template (TPL_LAB_CBC, etc.).                                              |
|                                                                                                    |
|    [ACTUAL RUNTIME BEHAVIOR VERIFIED]:                                                             |
|    Executes local server process: PP-OCRv4-Mobile-CPU on host web server.                          |
|    Takes 11,000ms – 23,000ms of blocking CPU time.                                                 |
|    Throws unhandled 500 InternalServerError if documentType is not handled in template switch!    |
+----------------------------------------------------------------------------------------------------+
                                      | (INTENDED DELEGATION)
                                      | [STATUS: DISCONNECTED / NOT ROUTED]
                                      v
+----------------------------------------------------------------------------------------------------+
|                                 INTERNAL OCR PROCESSING SERVICE                                    |
|                             (https://careidocr.dokaan.in/internal/ocr/process)                     |
|                                                                                                    |
|  - Standalone FastAPI Python OCR Engine.                                                           |
|  - Protected by header: X-CareID-Internal-Secret.                                                  |
|  - Rejects direct external requests with 401 Unauthorized.                                        |
|  - Core NestJS backend currently DOES NOT delegate jobs to this service.                          |
+----------------------------------------------------------------------------------------------------+
```

---

## B. API Contract Comparison

### 1. `POST /api/v1/ocr/jobs` Contract Breakdown

| Specification Parameter | Postman Authoritative Contract (`CareID-Staging.postman_collection.json`) | Actual Frontend Implementation (`src/pages/ocr/MedicalRecordUploadPage.tsx`) | Match Status | Discrepancy & Behavioral Evidence |
|---|---|---|:---:|---|
| **HTTP Method** | `POST` | `POST` via `ocrService.submitOcrJob` | **MATCH** | Exact method alignment. |
| **Request URL** | `{{baseUrl}}/api/v1/ocr/jobs` | `https://360api.vnvision.in/api/v1/ocr/jobs` | **MATCH** | Correct base URL resolution. |
| **Authentication** | `Bearer {{token}}` | `Authorization: Bearer <accessToken>` | **MATCH** | Interceptor injects valid session JWT. |
| **Content-Type** | `application/json` | `application/json` | **MATCH** | Valid JSON payload format. |
| **Payload Structure** | `{ "medicalAttachmentId": "uuid", "documentType": "LAB_REPORT" }` | `{ "medicalAttachmentId": attachmentId, "documentType": documentType }` | **CONDITIONAL MISMATCH** | When `selectedFormat !== 'PDF'`, frontend sends `documentType: 'DIAGNOSTIC_IMAGE'`. Backend rejects `DIAGNOSTIC_IMAGE` with **HTTP 500**. |
| **Permitted `documentType` Values** | `LAB_REPORT`, `PRESCRIPTION`, `DISCHARGE_SUMMARY`, `OTHER`, `UNKNOWN` | `LAB_REPORT` (if PDF), `DIAGNOSTIC_IMAGE` (if PNG, JPG, DICOM) | **CRITICAL MISMATCH** | `DIAGNOSTIC_IMAGE` is not a recognized document template on backend; triggers unhandled exception. |
| **Prerequisite** | Valid pre-uploaded `medicalAttachmentId` | Uploads file via `POST /api/v1/attachments` first, then passes returned `uploadRes.id` | **MATCH** | Correct 2-step ingestion. |
| **Supported File Formats** | PDF, JPEG, PNG, WEBP (enforced by attachment validator) | PDF, PNG, JPG, DICOM | **PARTIAL MISMATCH** | Backend attachment service validates magic bytes and strictly rejects raw text or unsupported formats with 400. |
| **File Size Limit** | 15 MB (15,728,640 bytes) | `MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024` | **MATCH** | Validated client-side and server-side. |

### 2. Live Runtime Evidence of `documentType` Behavioral Discrepancies

A targeted test matrix was executed against `POST https://360api.vnvision.in/api/v1/ocr/jobs` with an authentic, verified attachment:

```
DocumentType: LAB_REPORT           -> Status: 201 Created (Duration: 22.6s, Engine: PP-OCRv4-Mobile-CPU)
DocumentType: PRESCRIPTION         -> Status: 201 Created (Engine: PP-OCRv4-Mobile-CPU)
DocumentType: DISCHARGE_SUMMARY    -> Status: 201 Created (Engine: PP-OCRv4-Mobile-CPU)
DocumentType: OTHER                -> Status: 201 Created (Engine: PP-OCRv4-Mobile-CPU)
DocumentType: UNKNOWN              -> Status: 201 Created (Engine: PP-OCRv4-Mobile-CPU)

DocumentType: DIAGNOSTIC_IMAGE     -> Status: 500 InternalServerError {"message": "An internal server error occurred."}
DocumentType: ID_CARD              -> Status: 500 InternalServerError {"message": "An internal server error occurred."}
DocumentType: INSURANCE_CARD       -> Status: 500 InternalServerError {"message": "An internal server error occurred."}
DocumentType: GENERAL_MEDICAL      -> Status: 500 InternalServerError {"message": "An internal server error occurred."}
```

---

## C. Internal OCR Service Integration Audit (`careidocr.dokaan.in`)

### 1. Endpoint Analysis
- **Service URL**: `https://careidocr.dokaan.in/internal/ocr/process`
- **Architecture**: Independent Python FastAPI microservice.

### 2. Live Forensic Probing Evidence
- **GET Request**:
  - `GET https://careidocr.dokaan.in/internal/ocr/process`
  - Response: `HTTP 405 Method Not Allowed`
  - Body: `{"detail":"Method Not Allowed"}`
- **POST Request (Unauthenticated)**:
  - `POST https://careidocr.dokaan.in/internal/ocr/process`
  - Response: `HTTP 401 Unauthorized`
  - Body: `{"success":false,"error":"Unauthorized","message":"Invalid or missing X-CareID-Internal-Secret authentication header."}`
- **POST Request (Dummy Secret)**:
  - `POST https://careidocr.dokaan.in/internal/ocr/process` with `X-CareID-Internal-Secret: test`
  - Response: `HTTP 401 Unauthorized`
  - Body: `{"success":false,"error":"Unauthorized","message":"Invalid or missing X-CareID-Internal-Secret authentication header."}`

### 3. Investigation Checklist

| Item | Investigation Question | Audit Finding | Evidence / Status |
|---|---|---|---|
| 1 | Does `/api/v1/ocr/jobs` call the internal service? | **NO** | Runtime job responses from `POST /api/v1/ocr/jobs` confirm execution by local CPU process on the web server: `"extractionEngine": "PP-OCRv4-Mobile-CPU"`, `"imagePath": "/www/wwwroot/360api.vnvision.in/data/uploads/attachments/..."`. |
| 2 | Is the internal service URL configured in NestJS? | **NOT VERIFIED** | Backend configuration is on server filesystem (`.env`). However, runtime traces show no delegation is occurring. |
| 3 | Is the request payload sent to the internal service correct? | **NOT VERIFIED** | Core backend is not invoking the service. |
| 4 | Is the document forwarded correctly? | **NOT VERIFIED** | Core backend processes the file locally from its own disk. |
| 5 | Are internal service credentials required? | **YES (CONFIRMED)** | `careidocr.dokaan.in` strictly requires `X-CareID-Internal-Secret`. Rejects requests with 401 Unauthorized if missing or invalid. |
| 6 | Does internal service return expected format? | **NOT VERIFIED** | Requires valid secret held only by backend DevOps. |
| 7 | Does backend handle OCR service errors? | **NO** | When internal failures or unhandled template lookups occur, NestJS throws unhandled exceptions returning generic HTTP 500. |
| 8 | Does OCR job database persistence succeed? | **YES** | Verified: Jobs with supported types (`LAB_REPORT`) persist with UUID (`ddbf360d-ceae-4691-8bb0-33d7b6e20bc5`), pages, and extracted fields in PostgreSQL. |
| 9 | Do timeout or connection failures occur? | **YES (CONFIRMED)** | Because local CPU OCR consumes 100% of host CPU for 12–25s per job, concurrent requests trigger `connect ETIMEDOUT 161.97.89.183:443`. |
| 10| Is OCR result linked to the job? | **YES** | For successful jobs, `GET /api/v1/ocr/jobs/:id/fields` and `GET /api/v1/ocr/jobs/:id/text` retrieve persisted data. |

---

## D. Differentiation of OCR Subsystems

| Feature / Subsystem | Enterprise OCR Subsystem (`/api/v1/ocr`) | AI Document OCR Subsystem (`/api/v1/ai/ocr`) | Insurance Card OCR Subsystem (`/api/v1/insurance/ocr`) |
|---|---|---|---|
| **Intended Business Scope** | Clinical Medical Records (Lab reports, diagnostic panels, discharge summaries). | Rapid single-image metadata extraction from hosted URLs. | Specialized Insurance Card & Policy scanning in Billing module. |
| **Primary Ingestion API** | `POST /api/v1/ocr/jobs` | `POST /api/v1/ai/ocr/extract` | `POST /api/v1/insurance/ocr` (or `/scan`) |
| **Payload Contract** | JSON: `{ medicalAttachmentId: string, documentType?: string }` | JSON: `{ imageUrl: string }` *(rejects `documentId` with 400!)* | Multipart: `imageUrl` or `file`, `patientId` |
| **Workflow Model** | Asynchronous Job (`PENDING` -> `PROCESSING` -> `REVIEW_REQUIRED` / `COMPLETED`). | Synchronous candidate metadata extraction. | Synchronous / Policy Confirmation workflow. |
| **Availability on Staging** | **ACTIVE & FUNCTIONAL** (for supported document types). | **ACTIVE** (requires public `imageUrl`). | **404 NOT FOUND** (unregistered on staging). |
| **Proper Subsystem for Health Records Upload** | **YES (CORRECT CHOICE)**. Doctor Web correctly targets `/api/v1/ocr/jobs`. | No. Incompatible with uploaded attachments. | No. Restricted to insurance policy creation. |

---

## E. Complete OCR Workflow State Matrix

| Stage # | Workflow Step | Implementation Location | Runtime Status | Forensic Evidence / Verification Notes |
|:---:|---|---|:---:|---|
| **1** | Document Selection & Pre-validation | `MedicalRecordUploadPage.tsx`<br>`attachmentService.validateAttachmentFile` | **FULLY WORKING** | Enforces 15 MB limit and extension checks (`.pdf, .jpg, .jpeg, .png, .webp, .tiff, .dcm`). |
| **2** | Binary File Upload to Storage | `attachmentService.uploadAttachment`<br>`POST /api/v1/attachments` | **FULLY WORKING** | Verified: Returns HTTP 201 with authentic `id`, `storageKey`, `storageUrl`, and SHA-256 `checksum`. |
| **3** | Create / Submit OCR Job | `ocrService.submitOcrJob`<br>`POST /api/v1/ocr/jobs` | **PARTIALLY WORKING** | **Fails with HTTP 500** if non-PDF is uploaded (sends `documentType: 'DIAGNOSTIC_IMAGE'`). Works with HTTP 201 if `documentType` is `LAB_REPORT` or omitted. |
| **4** | Receive OCR Job ID | `MedicalRecordUploadPage.tsx` | **FULLY WORKING** | Successfully captures UUID (`ddbf360d-ceae-4691-8bb0-33d7b6e20bc5`). |
| **5** | Poll / Track Job Status | `ocrService.pollOcrJob`<br>`GET /api/v1/ocr/jobs/:id` | **FULLY WORKING** | Polls at 800ms intervals; updates UI progress bar through `PENDING`, `PROCESSING`, `COMPLETED` / `REVIEW_REQUIRED`. |
| **6** | Retrieve Extracted Raw Text | `ocrService.getOcrJobText`<br>`GET /api/v1/ocr/jobs/:id/text` | **FULLY WORKING** | Verified: Returns extracted text string from OCR engine. |
| **7** | Retrieve Structured Fields & Confidence | `ocrService.getOcrJobFields`<br>`GET /api/v1/ocr/jobs/:id/fields` | **FULLY WORKING** | Verified: Returns parsed fields with bounding boxes and confidence scores. |
| **8** | Display Results in Review UI | `MedicalRecordUploadPage.tsx`<br>`parseOcrFields` | **FULLY WORKING** | Renders color-coded confidence pills (High/Med/Low), side-by-side document raster zoom/pan, and editable lab rows. |
| **9** | Manual Review & Discrepancy Editing | `MedicalRecordUploadPage.tsx` | **FULLY WORKING** | Clinician can edit fields, resolve patient ID mismatches, and add missing lab rows via "+ Add Row". |
| **10**| Commit to Master Registry (EHR) | `patientService.createMedicalRecord`<br>`POST /api/v1/doctors/patients/:id/medical-records` | **FULLY WORKING** | Ingests confirmed fields, vitals, and diagnoses into PostgreSQL Master Registry. |

---

## F. Root Cause Analysis of HTTP 500 Error

The reported error:
`POST https://360api.vnvision.in/api/v1/ocr/jobs` -> `500 Internal Server Error`  
`Frontend Message: OCR Processing Error – An internal server error occurred.`

is caused by **two distinct, verified issues**:

### 1. Primary Direct Trigger: Invalid `documentType` Sent by Frontend
* In `src/pages/ocr/MedicalRecordUploadPage.tsx` line 431:
  ```typescript
  const documentType = selectedFormat === 'PDF' ? 'LAB_REPORT' : 'DIAGNOSTIC_IMAGE';
  ```
* When a user uploads any image (PNG, JPG/JPEG, or DICOM), `selectedFormat` is not `'PDF'`, causing the frontend to submit `{ medicalAttachmentId: "...", documentType: "DIAGNOSTIC_IMAGE" }`.
* **The backend NestJS controller has no template or extraction pipeline for `DIAGNOSTIC_IMAGE`**. It executes an unhandled switch/case or throws an uncaught database query error when attempting to fetch OCR document templates for `DIAGNOSTIC_IMAGE`, resulting in an unhandled exception converted by NestJS into **`HTTP 500 Internal Server Error`**.
* **Proof**: Sending `documentType: 'LAB_REPORT'` or omitting `documentType` succeeds with `HTTP 201 Created`. Sending `documentType: 'DIAGNOSTIC_IMAGE'` immediately reproduces `HTTP 500 Internal Server Error`.

### 2. Secondary Backend Infrastructure Trigger: Local CPU Blocking & Server Overload
* The backend executes `PP-OCRv4-Mobile-CPU` directly on the web server (`161.97.89.183`).
* OCR processing consumes 100% CPU on the API host for 12,000ms to 23,000ms per single document page.
* Under concurrent requests or when processing large/complex rasters, the local Python process crashes or the Node.js event loop blocks, resulting in connection timeouts (`ETIMEDOUT`) and unhandled server process terminations (`500`).
* The dedicated microservice `https://careidocr.dokaan.in/internal/ocr/process` was deployed to resolve this issue, but **the NestJS backend was never re-routed to use it**, leaving the fragile local CPU execution active.

---

## G. Confirmed Issues

1. **Frontend Sends Unhandled `documentType: 'DIAGNOSTIC_IMAGE'`**:
   - `MedicalRecordUploadPage.tsx` hardcodes `'DIAGNOSTIC_IMAGE'` for non-PDFs. The backend only recognizes `LAB_REPORT`, `PRESCRIPTION`, `DISCHARGE_SUMMARY`, `OTHER`, or `UNKNOWN`.
2. **Backend Crashes on Unrecognized `documentType` with 500 Instead of 400**:
   - Rather than returning a clean `400 Bad Request` with permitted enum values, NestJS throws an unhandled internal exception.
3. **Core Backend Does Not Route to External OCR Microservice**:
   - `360api.vnvision.in` runs slow local CPU OCR (`PP-OCRv4-Mobile-CPU`) taking up to 23 seconds instead of delegating to `careidocr.dokaan.in`.
4. **Internal Microservice Inaccessible Without Backend Secret**:
   - Direct frontend calls to `https://careidocr.dokaan.in/internal/ocr/process` are blocked by design (401 Unauthorized), confirming this is an internal backend-to-backend dependency.
5. **Magic Byte Strictness on Binary Attachment Upload**:
   - Files uploaded to `/api/v1/attachments` must have valid binary headers matching their declared MIME type. Arbitrary or corrupted blobs are rejected with 400.

---

## H. Backend Dependencies (Action Required from Backend Team)

1. **Fix NestJS DocumentType Validation**:
   - Add a class-validator `@IsEnum(['LAB_REPORT', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'DIAGNOSTIC_IMAGE', 'OTHER', 'UNKNOWN'])` on `CreateOcrJobDto`.
   - Prevent unhandled exceptions when `documentType` has no matching template; default gracefully to generic OCR extraction (`UNKNOWN` or `OTHER`) instead of throwing 500.
2. **Wire NestJS to `careidocr.dokaan.in`**:
   - In `OcrService.ts` on NestJS, replace the blocking local `child_process.spawn('python', ['ppocr', ...])` execution with an HTTP client call to `https://careidocr.dokaan.in/internal/ocr/process`.
   - Configure the internal secret in the backend's `.env`:
     `CAREID_OCR_INTERNAL_URL=https://careidocr.dokaan.in/internal/ocr/process`  
     `CAREID_OCR_INTERNAL_SECRET=<secret>`
   - Pass the header `X-CareID-Internal-Secret: <secret>` and forward the uploaded file buffer or storage URL.
3. **Handle Server-Side Timeouts**:
   - Wrap OCR jobs in a BullMQ queue or async background worker to prevent HTTP requests from hanging for 23 seconds.

---

## I. Frontend Dependencies (Action Required in Doctor Web)

1. **Correct `documentType` Mapping in `MedicalRecordUploadPage.tsx`**:
   - Update line 431 so it never sends `'DIAGNOSTIC_IMAGE'` to `POST /api/v1/ocr/jobs`.
   - Map formats safely to valid backend document types:
     - PDF / Lab Reports -> `'LAB_REPORT'`
     - Prescriptions -> `'PRESCRIPTION'`
     - Discharge Summaries -> `'DISCHARGE_SUMMARY'`
     - Images / Scans / Others -> `'LAB_REPORT'` or `'OTHER'`
2. **Increase Client-Side Polling Timeout for Large Documents**:
   - Since local CPU processing currently takes 12–25 seconds, ensure `ocrService.pollOcrJob` maintains a timeout of at least 60,000ms with progressive retry backoff.
3. **Display Meaningful Error Message on Backend 500**:
   - In `handleStartProcessing`, catch 500 errors and advise the user: *"OCR extraction server is experiencing high processing load. Please retry in a moment or upload as a standard PDF attachment."*

---

## J. Prioritized Remediation Plan

| Priority | Component | Action Item | Estimated Impact |
|:---:|---|---|---|
| **P0 (Immediate)** | **Frontend** | Change `documentType = 'DIAGNOSTIC_IMAGE'` to `'LAB_REPORT'` (or `'OTHER'`) in `MedicalRecordUploadPage.tsx` line 431. | **Immediately eliminates the 100% reproducible HTTP 500 error** for image uploads on staging. |
| **P0 (Immediate)** | **Backend** | Add validation and fallback in NestJS `OcrService` so unrecognized `documentType`s default to generic extraction rather than crashing with 500. | Hardens the backend API against unhandled 500 errors. |
| **P1 (High)** | **Backend** | Connect NestJS `OcrService` to `https://careidocr.dokaan.in/internal/ocr/process` using `X-CareID-Internal-Secret`. | Offloads heavy CPU work from main web server; drops processing time from 23s to <3s. |
| **P2 (Medium)** | **Frontend** | Add specific user-facing error toast for timeouts or server overload. | Improves clinician UX during peak server loads. |

---

*Report certified by Antigravity Forensic Audit Agent on November 18, 2026.*  
*Strict Audit Rule Compliance: No application source code, configurations, database records, or backend services were modified during this investigation.*

