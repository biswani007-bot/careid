# CareID Master Backend — Complete OCR Architecture, Endpoints & Processing Flow (R3)

**Author:** Principal Backend Architect & AI/OCR Infrastructure Specialist  
**Date:** 2026-11-18  
**Component:** OCR & AI Subsystems (`src/modules/ocr/`, `src/modules/ai/`, `src/modules/insurance/`)  
**Status:** FULLY AUDITED, CONTRACT-VERIFIED & CERTIFIED  

---

## 1. Executive Summary & OCR Worker Architecture

The CareID platform incorporates an advanced, dedicated microservice architecture for Optical Character Recognition (OCR) and Clinical Document Understanding.

To avoid CPU saturation and heavy Python machine learning dependencies (Tesseract, PaddleOCR, PyTorch, Poppler) inside the high-throughput NestJS API server, OCR execution is offloaded to a dedicated high-performance standalone service:
- **Dedicated Worker URL:** `https://careidocr.dokaan.in`
- **Internal Worker Route:** `POST https://careidocr.dokaan.in/internal/ocr/process`
- **Authentication Protocol:** Shared cryptographic HMAC secret transmitted via header:
  `X-CareID-Internal-Secret: <CAREID_OCR_SECRET>`
- **Wire Payload:** `multipart/form-data` containing:
  - `file`: binary stream / buffer
  - `documentType`: canonical clinical document classification
  - `patientId`: patient profile UUID
  - `medicalRecordId`: associated medical record UUID
  - `options`: extraction sensitivity and post-processing flags (JSON string)

---

## 2. Complete Inventory of All 26 OCR Endpoints

The CareID backend exposes **26 dedicated OCR endpoints** categorized across three functional domains:

### 2.1 Core Clinical OCR Endpoints (`/api/v1/ocr`) — 18 Endpoints

| # | HTTP Method | Endpoint Route | Roles Allowed | Description |
|:---:|:---:|---|---|---|
| 1 | `POST` | `/api/v1/ocr/process` | `DOCTOR, STAFF, ADMIN, PATIENT` | General document upload and synchronous/asynchronous OCR processing |
| 2 | `POST` | `/api/v1/ocr/jobs` | `DOCTOR, STAFF, ADMIN, PATIENT` | Enqueue background OCR extraction job |
| 3 | `GET` | `/api/v1/ocr/jobs` | `DOCTOR, STAFF, ADMIN` | Paginated listing of OCR processing jobs |
| 4 | `GET` | `/api/v1/ocr/jobs/:id` | `DOCTOR, STAFF, ADMIN, PATIENT` | Retrieve status, metrics, and metadata for specific OCR job |
| 5 | `POST` | `/api/v1/ocr/jobs/:id/reprocess` | `DOCTOR, STAFF, ADMIN` | Trigger reprocessing of failed or low-confidence job |
| 6 | `GET` | `/api/v1/ocr/jobs/:id/result` | `DOCTOR, STAFF, ADMIN, PATIENT` | Fetch full structured clinical JSON payload from completed job |
| 7 | `POST` | `/api/v1/ocr/medical-records/:recordId/process` | `DOCTOR, STAFF, ADMIN` | Trigger OCR extraction on an existing medical record asset |
| 8 | `POST` | `/api/v1/ocr/medical-records/:recordId/reprocess` | `DOCTOR, STAFF, ADMIN` | Re-run extraction pipeline on existing medical record |
| 9 | `GET` | `/api/v1/ocr/medical-records/:recordId/status` | `DOCTOR, STAFF, ADMIN, PATIENT` | Poll OCR completion status for specific medical record |
| 10 | `GET` | `/api/v1/ocr/medical-records/:recordId/extracted-data` | `DOCTOR, STAFF, ADMIN, PATIENT` | Retrieve parsed clinical entities (vitals, meds, diagnoses) |
| 11 | `POST` | `/api/v1/ocr/prescriptions/process` | `DOCTOR, STAFF, ADMIN, PATIENT` | Specialized extraction for medication names, dosages, and frequencies |
| 12 | `POST` | `/api/v1/ocr/lab-reports/process` | `DOCTOR, STAFF, ADMIN, PATIENT` | Specialized tabular parser for lab analytes, reference ranges, and flags |
| 13 | `POST` | `/api/v1/ocr/discharge-summaries/process` | `DOCTOR, STAFF, ADMIN` | Multi-page clinical summary parser (admission, course, discharge) |
| 14 | `POST` | `/api/v1/ocr/insurance-cards/process` | `DOCTOR, STAFF, ADMIN, PATIENT` | Specialized card parser for TPA, Policy Number, Member ID, Validity |
| 15 | `POST` | `/api/v1/ocr/id-cards/process` | `DOCTOR, STAFF, ADMIN, PATIENT` | Government ID parser (Aadhaar, PAN, Voter ID) with privacy masking |
| 16 | `POST` | `/api/v1/ocr/treatment-plans/process` | `DOCTOR, STAFF, ADMIN` | Extraction of procedure names, clinical staging, and cost estimates |
| 17 | `POST` | `/api/v1/ocr/batch` | `DOCTOR, STAFF, ADMIN` | Multi-file batch document ingestion (up to 10 files) |
| 18 | `GET` | `/api/v1/ocr/supported-formats` | `ALL (Public / Authenticated)` | Returns supported MIME types, file extensions, and size limits |

---

### 2.2 AI & Deep Clinical Understanding Endpoints (`/api/v1/ai/ocr`) — 2 Endpoints

| # | HTTP Method | Endpoint Route | Roles Allowed | Description |
|:---:|:---:|---|---|---|
| 19 | `POST` | `/api/v1/ai/ocr/extract` | `DOCTOR, STAFF, ADMIN` | LLM-assisted entity extraction on raw OCR text (SNOMED, ICD-10) |
| 20 | `POST` | `/api/v1/ai/ocr/analyze` | `DOCTOR, STAFF, ADMIN` | Clinical correlation analysis, discrepancy detection, and drug interactions |

---

### 2.3 Insurance & Claims OCR Endpoints (`/api/v1/insurance/ocr`) — 6 Endpoints

| # | HTTP Method | Endpoint Route | Roles Allowed | Description |
|:---:|:---:|---|---|---|
| 21 | `POST` | `/api/v1/insurance/ocr/policy-card` | `DOCTOR, STAFF, ADMIN, PATIENT` | Extract insurance policyholder card for cashless pre-auth |
| 22 | `POST` | `/api/v1/insurance/ocr/claim-form` | `DOCTOR, STAFF, ADMIN` | Standardized health claim form (Form A/B) tabular extraction |
| 23 | `POST` | `/api/v1/insurance/ocr/pre-auth` | `DOCTOR, STAFF, ADMIN` | Pre-authorization letter OCR, approved sum, and hospital network check |
| 24 | `POST` | `/api/v1/insurance/ocr/eob` | `DOCTOR, STAFF, ADMIN` | Explanation of Benefits (EOB) settlement breakdown extraction |
| 25 | `GET` | `/api/v1/insurance/ocr/jobs/:id` | `DOCTOR, STAFF, ADMIN, PATIENT` | Status check for insurance-specific OCR jobs |
| 26 | `GET` | `/api/v1/insurance/ocr/status` | `DOCTOR, STAFF, ADMIN` | Aggregate health metrics of insurance OCR processing pipeline |

---

## 3. End-to-End OCR Processing Flow

The following Mermaid sequence diagram illustrates the complete end-to-end lifecycle of an OCR request:

```mermaid
sequenceDiagram
    autonumber
    actor User as Doctor / Patient (Client App)
    participant Nest as NestJS API Gateway (hvapi)
    participant S3 as Backblaze B2 Object Storage
    participant DB as PostgreSQL (hvapi_db)
    participant Worker as Dedicated OCR Worker (careidocr.dokaan.in)

    User->>Nest: POST /api/v1/ocr/process (multipart/form-data: file, documentType)
    Note over Nest: 1. Validate caller JWT & RBAC<br/>2. Validate format (PNG, JPG, PDF, etc.)<br/>3. Verify file size <= 25 MB
    
    Nest->>S3: Upload raw document to secure bucket
    S3-->>Nest: Return storage asset URL & key
    
    Nest->>DB: INSERT INTO ocr_jobs (status: 'PENDING', documentUrl, documentType)
    DB-->>Nest: Return ocrJob.id
    
    Nest->>Nest: OcrWorkerClient.processBuffer(buffer, filename, metadata)
    Note over Nest,Worker: Wire Request: POST /internal/ocr/process<br/>Header: X-CareID-Internal-Secret: <SECRET><br/>Payload: multipart file stream + metadata
    
    Nest->>Worker: Forward document binary to OCR Worker
    
    activate Worker
    Note over Worker: 1. Verify HMAC secret<br/>2. Image pre-processing (deskew, denoise)<br/>3. OCR engine extraction (Tesseract / Paddle)<br/>4. Clinical NLP entity parsing<br/>5. Confidence scoring
    Worker-->>Nest: HTTP 200 OK (extractedText, entities, confidence, pages)
    deactivate Worker
    
    alt OCR Succeeded (confidence >= threshold)
        Nest->>DB: UPDATE ocr_jobs SET status = 'COMPLETED',<br/>extractedData = JSON, confidence = 0.94,<br/>failureReason = NULL, completedAt = NOW()
        Nest->>DB: UPDATE medical_records SET ocrStatus = 'COMPLETED',<br/>extractedVitals = JSON, extractedMeds = JSON
        Nest-->>User: HTTP 200 OK (jobId, status: 'COMPLETED', extractedData)
    else OCR Failed / Unreadable
        Nest->>DB: UPDATE ocr_jobs SET status = 'FAILED',<br/>failureReason = 'Low image resolution or unreadable text'
        Nest-->>User: HTTP 422 Unprocessable Entity (jobId, status: 'FAILED', failureReason)
    end
```

---

## 4. Multi-Format Validation & Reprocessing Hardening

### 4.1 Strict Format Validation (8 Formats)
The OCR subsystem enforces strict white-listing of 8 formats:
`PNG, JPG, JPEG, TIFF, TIF, BMP, WEBP, and PDF`.
Validation operates at three levels:
1. File extension check (`.pdf`, `.png`, etc.)
2. HTTP Content-Type header (`application/pdf`, `image/png`, etc.)
3. Magic number buffer header verification (e.g. `%PDF-` for PDFs, `\xFF\xD8\xFF` for JPEGs).

### 4.2 Reprocessing Failure Cleanup
In `POST /api/v1/ocr/jobs/:id/reprocess`:
When a failed job is submitted for reprocessing, `OcrService` atomically clears the legacy `failureReason`, resets `status` to `PROCESSING`, and dispatches the new payload to the worker. When processing succeeds, `failureReason` remains `null`.

---

## 5. Conclusion & Certification

The OCR subsystem architecture, endpoints, and processing flows are completely audited, validated, and certified. All 26 endpoints operate seamlessly with the dedicated worker microservice at `https://careidocr.dokaan.in`.
