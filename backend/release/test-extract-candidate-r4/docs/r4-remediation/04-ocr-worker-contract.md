# CareID OCR: PaddleOCR Python Worker Specification & Integration Contract

**Document ID:** `CAREID-R4-DOC-04`  
**Engine:** PaddleOCR v4 Mobile CPU (`PP-OCRv4-Mobile-CPU`)  
**Daemon Runtime:** Python 3.10+ / FastAPI / Uvicorn  
**Client Implementation:** `src/modules/ocr/infrastructure/clients/ocr-worker.client.ts`  
**Status:** SPECIFIED & PRODUCTION TESTED  

---

## 1. Architectural Overview

The CareID OCR subsystem decouples CPU-intensive neural optical character recognition from the NestJS Node.js event loop by delegating image inference to a dedicated Python daemon running PaddleOCR.

The NestJS backend interacts with the worker via `OcrWorkerClient`, which supports both local shared-filesystem invocation and remote multi-part HTTP streaming.

```
┌────────────────────────────────────────────────────────┐
│                   NestJS API Gateway                   │
│                                                        │
│  [OCRModule]       [AiOcrModule]      [InsuranceModule]│
│         │                 │                   │        │
│         └────────────┬────┴───────────────────┘        │
│                      ▼                                 │
│              OcrWorkerClient                           │
└──────────────────────┬─────────────────────────────────┘
                       │ HTTP / JSON or Multipart
                       ▼
┌────────────────────────────────────────────────────────┐
│             PaddleOCR Daemon (Port 5050)               │
│                                                        │
│  - Text Detection (DBNet / MobileNetV3)                │
│  - Direction Classification (Angle Classifier)         │
│  - Text Recognition (SVTR_LCNet / PP-OCRv4)            │
│  - PDF Rendering (PyMuPDF / pdf2image)                 │
└────────────────────────────────────────────────────────┘
```

---

## 2. API Contract Endpoints

### 2.1 `GET /health`
Liveness probe to verify worker daemon responsiveness.

- **HTTP Method:** `GET`
- **Path:** `/health`
- **Response Format:** `application/json`
- **Response Schema:**
  ```json
  {
    "status": "ok",
    "worker": "paddleocr-daemon"
  }
  ```

---

### 2.2 `GET /readiness`
Deep readiness probe checking neural model weight initialization, memory metrics, and CPU concurrency.

- **HTTP Method:** `GET`
- **Path:** `/readiness`
- **Response Schema:**
  ```json
  {
    "status": "ready",
    "worker": "careid-paddleocr-cpu",
    "engineReady": true,
    "ocrVersion": "PP-OCRv4",
    "architecture": "Mobile-CPU",
    "uptimeSeconds": 14205,
    "residentRamMb": 412.5,
    "peakWorkingSetMb": 680.2,
    "activeRequests": 0,
    "maxConcurrency": 4,
    "cpuThreads": 4
  }
  ```

---

### 2.3 `POST /ocr/process` (Local Shared Filesystem)
Invoked when the NestJS backend and the worker share the host filesystem.

- **HTTP Method:** `POST`
- **Path:** `/ocr/process`
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "file_path": "/www/wwwroot/360api.vnvision.in/data/uploads/attachments/report.png",
    "document_type": "LAB_REPORT"
  }
  ```

---

### 2.4 `POST /ocr/process-buffer` (Remote Binary Multipart)
Invoked when the worker operates on an independent container or host without shared disk access.

- **HTTP Method:** `POST`
- **Path:** `/ocr/process-buffer`
- **Request Headers:** `Content-Type: multipart/form-data`
- **Form Fields:**
  - `file`: Binary file stream (PNG, JPG, TIFF, WEBP, PDF)
  - `filename`: Original file name with extension (e.g. `prescription.jpg`)
  - `document_type`: Target document classification (`LAB_REPORT`, `PRESCRIPTION`, `INSURANCE_CARD`, `UNKNOWN`)

---

## 3. Worker Response Schema (`OcrWorkerResponse`)

All processing requests return a standardized structured payload:

```json
{
  "success": true,
  "documentType": "LAB_REPORT",
  "sourceFile": "attachment-uuid-1.png",
  "pageCount": 1,
  "overallConfidence": 0.945,
  "combinedText": "HEALTH VAULT 360 - CLINICAL LABORATORY REPORT\nPatient Name: Jane Smith\nMRN: MRN-102938\nTest Name: Complete Blood Count\nHemoglobin: 13.8 g/dL\nWBC: 7,200 /uL\nPlatelet Count: 280,000 /uL",
  "pages": [
    {
      "pageNumber": 1,
      "rawText": "HEALTH VAULT 360 - CLINICAL LABORATORY REPORT\nPatient Name: Jane Smith\nMRN: MRN-102938...",
      "lines": [
        {
          "text": "Patient Name: Jane Smith",
          "confidence": 0.97,
          "box": [[120, 45], [380, 45], [380, 68], [120, 68]]
        },
        {
          "text": "Hemoglobin: 13.8 g/dL",
          "confidence": 0.94,
          "box": [[120, 110], [310, 110], [310, 132], [120, 132]]
        }
      ],
      "imagePath": "uploads/attachments/attachment-uuid-1.png",
      "confidence": 0.945
    }
  ],
  "durationMs": 348,
  "engine": "PP-OCRv4-Mobile-CPU",
  "ocrVersion": "PP-OCRv4",
  "error": null
}
```

### Error Response Schema (when `success: false`):
```json
{
  "success": false,
  "documentType": "LAB_REPORT",
  "sourceFile": "corrupted.png",
  "pageCount": 0,
  "overallConfidence": 0.0,
  "combinedText": "",
  "pages": [],
  "durationMs": 42,
  "engine": "PP-OCRv4-Mobile-CPU",
  "error": "Failed to decode image bytes: Invalid PNG header"
}
```

---

## 4. Failure Mode Contracts in NestJS Backend

1. **Worker Unreachable / Offline:**
   - `OcrWorkerClient` catches network socket connection failures (`ECONNREFUSED`, `ETIMEDOUT`).
   - Throws `ServiceUnavailableException('OCR worker client service is unavailable. Cannot process document.')`.
   - The job is marked `FAILED` with explicit timestamp and error details in `failureReason`.
   - **Zero synthetic fallback data is permitted.**

2. **File Missing from Storage:**
   - Throws `NotFoundException('Source document file ... could not be resolved from storage or disk.')`.
   - Job marked `FAILED`.

3. **Unsupported File Format:**
   - Throws `BadRequestException` for non-whitelisted extensions.
