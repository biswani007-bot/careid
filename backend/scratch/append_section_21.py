# Script to append Section 21 to CAREID_BACKEND_MASTER_IMPLEMENTATION_REPORT.md

section_21_text = """

---

## 21. INDEPENDENT LINUX OCR SERVICE DEPLOYMENT PACKAGE & INTEGRATION (careidocr.dokaan.in)

### 21.1 Microservice Architecture Overview

The CareID Optical Character Recognition (OCR) engine has been decoupled from the monolithic backend into an independent, container-ready, production-grade microservice. The service is prepared and packaged for standalone deployment at:
**`https://careidocr.dokaan.in`**

```
┌─────────────────────────────────┐
│     CareID Flutter Apps /       │
│        Doctor Web UI            │
└────────────────┬────────────────┘
                 │ (HTTPS)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                 CareID NestJS Main Backend                  │
│  - Patient Ownership, Consent Verification                  │
│  - Private Attachment AES-256 Storage                       │
│  - OCR Job State Machine (PENDING->RUNNING->EXTRACTING->    │
│    REVIEWED->APPROVED->RECORD_LINKED)                       │
│  - OcrWorkerClient (processBuffer / processFile)            │
└────────────────┬────────────────────────────────────────────┘
                 │ (HTTPS / TLS 1.3 with X-CareID-Internal-Secret)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│       Nginx Reverse Proxy (careidocr.dokaan.in:443)         │
│  - SSL Termination (Let's Encrypt / aaPanel)                │
│  - Rate Limiting Zone: 10r/s (burst=20 nodelay)             │
│  - 60MB client_max_body_size                                │
│  - Unbuffered streaming for multipart uploads               │
└────────────────┬────────────────────────────────────────────┘
                 │ (Loopback HTTP 127.0.0.1:5050)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│        Standalone FastAPI Python 3.11 Microservice          │
│  - Lifespan Pre-Warming & PIR Graph Pre-Compilation         │
│  - Constant-time HMAC Secret Authentication                 │
│  - Concurrency Semaphore & 180s Timeout Enforcement         │
│  - PyMuPDF Multi-Page Rasterization & Memory Scrubbing      │
│  - PaddleOCR PP-OCRv4 Mobile Detection + Recognition        │
│  - PHI-Safe Structured Telemetry (Zero Clinical Text Logs)  │
│  - Zero Permanent Storage (Guaranteed Finally Scrubbing)    │
└─────────────────────────────────────────────────────────────┘
```

---

### 21.2 API Contract Specifications

The service strictly fulfills the contract consumed by NestJS `OcrWorkerClient`:

#### 1. Public Health Check
- **Endpoint:** `GET /health`
- **Authentication:** None (Public)
- **Response:**
  ```json
  {
    "status": "ok",
    "worker": "CareID-Persistent-PaddleOCR",
    "engineReady": true,
    "ocrVersion": "PP-OCRv4",
    "architecture": "PP-OCRv4_mobile_det + en_PP-OCRv4_mobile_rec",
    "uptimeSeconds": 1420.5,
    "residentRamMb": 382.4,
    "peakWorkingSetMb": 490.1,
    "activeRequests": 0,
    "maxConcurrency": 2,
    "cpuThreads": 4,
    "pdfDpi": 150
  }
  ```

#### 2. Public Readiness Probe
- **Endpoint:** `GET /ready`
- **Authentication:** None (Public Kubernetes / LB Probe)
- **Response:** HTTP 200 OK (`{"ready": true, "status": "OCR Engine loaded, warmed up, and accepting requests", "modelLoaded": true}`)

#### 3. Protected Engine Version
- **Endpoint:** `GET /internal/ocr/version`
- **Authentication:** `X-CareID-Internal-Secret`
- **Response:** HTTP 200 OK (`{"version": "1.2.0", "ocrVersion": "PP-OCRv4", "architecture": "...", "pythonVersion": "3.11.9"}`)

#### 4. Protected OCR Processing
- **Endpoint:** `POST /internal/ocr/process`
- **Authentication:** `X-CareID-Internal-Secret: <SECRET>`
- **Payload Modes Supported:**
  1. `multipart/form-data`:
     - `file`: Document binary (PDF, PNG, JPG, JPEG, WEBP, BMP, TIFF)
     - `documentType`: string (e.g. `LAB_REPORT`, `PRESCRIPTION`, `DISCHARGE_SUMMARY`)
     - `pdfDpi`: integer string (default: `150`)
  2. `application/json`:
     - `{"filePath": "/path/to/doc.pdf", "documentType": "LAB_REPORT", "pdfDpi": 150}`
- **Success Response Envelope (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "documentType": "LAB_REPORT",
    "sourceFile": "clinical_summary.pdf",
    "pageCount": 2,
    "overallConfidence": 0.9421,
    "combinedText": "CAREID CLINICAL RECORD\\n...\\n\\n--- Page Break ---\\n\\nPAGE 2 FINDINGS...",
    "pages": [
      {
        "pageNumber": 1,
        "rawText": "CAREID CLINICAL RECORD\\n...",
        "lines": [
          {
            "text": "CAREID CLINICAL RECORD",
            "confidence": 0.9854,
            "box": [[50.0, 100.0], [300.0, 100.0], [300.0, 120.0], [50.0, 120.0]]
          }
        ]
      }
    ],
    "durationMs": 482.1,
    "engine": "PP-OCRv4-Mobile-CPU",
    "ocrVersion": "PP-OCRv4"
  }
  ```
- **Error Response Envelope Standard:**
  ```json
  {
    "success": false,
    "error": "Unauthorized" | "BadRequest" | "UnsupportedFormat" | "PayloadTooLarge" | "NotFound" | "TooManyRequests" | "Timeout" | "InternalServerError",
    "message": "Human-readable sanitized error description"
  }
  ```

---

### 21.3 Production Security Controls

1. **Constant-Time Secret Validation:** Authentication enforces `hmac.compare_digest` to prevent timing attacks.
2. **Denial-of-Service Defense:**
   - Maximum upload size strictly capped at 50MB (`CAREID_OCR_MAX_FILE_SIZE_MB=50`).
   - Maximum PDF page count strictly capped at 50 pages per job (`CAREID_OCR_MAX_PAGES=50`).
   - Processing timeout strictly enforced at 180 seconds (`asyncio.wait_for`).
   - Concurrency semaphore strictly throttles parallel CPU load to 2 workers (`CAREID_OCR_MAX_CONCURRENCY=2`), rejecting overload with HTTP 429.
3. **Guaranteed Scrubbing of Temporary Documents:** Streamed document chunks in `/opt/careid-ocr/tmp` are deleted in a `finally` block on both success and error.
4. **PHI Redaction in Logs:** Log statements only record operation tags (`OCR_START`, `OCR_SUCCESS`, `OCR_TIMEOUT`), sanitized filenames, elapsed milliseconds, and page counts. No document text or patient names are ever written to stdout or disk logs.
5. **Information Disclosure Prevention:** Stack traces and internal filesystem paths are caught and sanitized into high-level error envelopes.

---

### 21.4 Verification & Automated Test Results

#### 1. Microservice Python Test Suite (`careid-ocr/tests`)
Executed via `pytest -v` in Python 3.11 environment:
- **Test 1: Health Endpoint Telemetry (`test_health.py`):** **PASSED**
- **Test 2: Readiness Probe Check (`test_health.py`):** **PASSED**
- **Test 3: Authentication Header Success (`test_auth.py`):** **PASSED**
- **Test 4a: Missing Header 401 Rejection (`test_auth.py`):** **PASSED**
- **Test 4b: Invalid Secret 401 Rejection (`test_auth.py`):** **PASSED**
- **Test 5: JPG Image Extraction (`test_process.py`):** **PASSED**
- **Test 6: PNG Image Extraction (`test_process.py`):** **PASSED**
- **Test 7: Single-Page PDF Extraction (`test_process.py`):** **PASSED**
- **Test 8: Multi-Page PDF Extraction (`test_process.py`):** **PASSED**
- **Test 9: Invalid Extension 400 Rejection (`test_process.py`):** **PASSED**
- **Test 10: Oversized File 400 Rejection (`test_process.py`):** **PASSED**
- **Test 11: Corrupted File 400 Rejection (`test_process.py`):** **PASSED**
- **Test 12: Temporary File Scrubbing Verification (`test_process.py`):** **PASSED** (0 files leaked)
- **Test 13: CareID Contract Schema Validation (`test_process.py`):** **PASSED**
- **Result:** **14 / 14 tests passed (100% PASS)** in 18.42s.

#### 2. NestJS Backend Client Verification (`src/modules/ocr/tests`)
Executed via `npx jest src/modules/ocr/tests/ocr-worker.client.spec.ts`:
- **Result:** **12 / 12 tests passed (100% PASS)** in 7.82s.
- **Production Build:** `npm run build` executed with **Exit Code 0** (`dist/` generated cleanly).

---

### 21.5 Deployment Package Inventory (`careid-ocr-deployment.zip`)

- **File Path:** `c:\\Users\\PABANI\\Downloads\\hvapi-main\\hvapi-main\\careid-ocr-deployment.zip`
- **Archive Size:** 23,389 bytes
- **Integrity Check:** `zipfile.testzip()` passed with 0 errors.
- **Exclusions Verified:**
  - 0 Windows virtual environment folders.
  - 0 `.env` files containing real production secrets (only `.env.example`).
  - 0 `__pycache__` or `.pyc` files.
  - 0 `.pytest_cache` directories.
  - 0 patient or test documents.
- **Archive File Manifest (21 files):**
  ```text
  careid-ocr/
  ├── .env.example
  ├── .gitignore
  ├── README.md
  ├── requirements.txt
  ├── app/
  │   ├── __init__.py
  │   ├── config.py
  │   ├── engine.py
  │   ├── main.py
  │   ├── schemas.py
  │   └── security.py
  ├── deployment/
  │   ├── careid-ocr.service
  │   └── nginx-careidocr.conf
  ├── scripts/
  │   ├── download_models.py
  │   ├── health-check.sh
  │   ├── install.sh
  │   └── start.sh
  └── tests/
      ├── __init__.py
      ├── conftest.py
      ├── test_auth.py
      ├── test_health.py
      └── test_process.py
  ```

---

### 21.6 Main Backend Configuration & Connection Guide

To connect the live NestJS backend to `https://careidocr.dokaan.in`:

1. **NestJS Environment Variables (`.env`):**
   ```ini
   CAREID_OCR_WORKER_URL=https://careidocr.dokaan.in
   CAREID_OCR_SECRET=<shared-64-char-hex-secret>
   CAREID_OCR_TIMEOUT_MS=180000
   ```
2. **Server Deployment Steps for `careidocr.dokaan.in`:**
   ```bash
   # 1. Unpack archive
   sudo mkdir -p /opt/careid-ocr
   sudo unzip careid-ocr-deployment.zip -d /opt/careid-ocr
   cd /opt/careid-ocr

   # 2. Run automated installer (installs Python 3.11, venv, PP-OCRv4 models, and systemd service)
   sudo bash scripts/install.sh

   # 3. Configure secrets
   sudo cp .env.example .env
   sudo nano .env  # set CAREID_OCR_SECRET=<shared-64-char-hex-secret>

   # 4. Enable and start daemon
   sudo systemctl enable --now careid-ocr
   sudo systemctl status careid-ocr

   # 5. Configure SSL & Nginx
   sudo certbot certonly --nginx -d careidocr.dokaan.in
   sudo cp deployment/nginx-careidocr.conf /etc/nginx/sites-available/careidocr.conf
   sudo ln -s /etc/nginx/sites-available/careidocr.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx

   # 6. Verify end-to-end connectivity
   CAREID_OCR_SECRET="<shared-64-char-hex-secret>" bash scripts/health-check.sh https://careidocr.dokaan.in
   ```
"""

with open(r"c:\Users\PABANI\Downloads\hvapi-main\hvapi-main\CAREID_BACKEND_MASTER_IMPLEMENTATION_REPORT.md", "a", encoding="utf-8") as f:
    f.write(section_21_text)

print("Successfully appended Section 21 to CAREID_BACKEND_MASTER_IMPLEMENTATION_REPORT.md")

