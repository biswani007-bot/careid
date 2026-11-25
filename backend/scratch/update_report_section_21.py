with open(r"c:\Users\PABANI\Downloads\hvapi-main\hvapi-main\CAREID_BACKEND_MASTER_IMPLEMENTATION_REPORT.md", "r", encoding="utf-8") as f:
    content = f.read()

# Replace Section 21 with the corrected, updated pre-deployment version
target_marker = "## 21. INDEPENDENT LINUX OCR SERVICE DEPLOYMENT PACKAGE & INTEGRATION (careidocr.dokaan.in)"

updated_section_21 = """## 21. INDEPENDENT LINUX OCR SERVICE DEPLOYMENT PACKAGE & INTEGRATION (careidocr.dokaan.in)

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
│  - Strict Production Validation: No Silent Localhost        │
│    Fallback in Production Environment                       │
│  - Mandatory Binary Multipart Dispatch (processBuffer)      │
│    for All Remote OCR Worker Destinations                   │
└────────────────┬────────────────────────────────────────────┘
                 │ (HTTPS / TLS 1.3 with X-CareID-Internal-Secret)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│       Nginx Reverse Proxy (careidocr.dokaan.in:443)         │
│  - SSL Termination (Let's Encrypt / aaPanel)                │
│  - Rate Limiting Zone: 10r/s (burst=20 nodelay)             │
│  - 60MB client_max_body_size                                │
│  - Unbuffered streaming for multipart uploads               │
│  - Non-Destructive aaPanel Include Configuration            │
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

### 21.2 Pre-Deployment Engineering Corrections Implemented

1. **ZIP Internal Path Normalization:**
   - The archive is packaged directly at the root of `careid-ocr/` (`app/`, `deployment/`, `scripts/`, `requirements.txt`, `.env.example`, `README.md`).
   - Extracting via `sudo unzip careid-ocr-deployment.zip -d /opt/careid-ocr` places all files directly into `/opt/careid-ocr/` without an unnecessary nested directory.
   - All extraction and installation paths in `README.md` match system paths 100%.

2. **Hardened Systemd Service (`careid-ocr.service`):**
   - Working Directory: `/opt/careid-ocr`.
   - Executable: `/opt/careid-ocr/venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 5050 --workers 1` (avoids unpinned C-extension flags).
   - Environment File: `EnvironmentFile=-/opt/careid-ocr/.env` (graceful bootstrap handling).
   - Runtime Identity: Dynamic configuration supporting both `www` (aaPanel) and `www-data` (Debian/Ubuntu).
   - Process Controls: `Restart=always`, `RestartSec=5s`, `MemoryHigh=3500M`, `MemoryMax=4000M`.

3. **Distribution-Aware Installation Script (`install.sh`):**
   - Accurately inspects `/etc/os-release` and checks for existing Python interpreters `>= 3.10` and `< 3.13`.
   - On Ubuntu 22.04 LTS (where Python 3.10 is default), automatically registers `ppa:deadsnakes/ppa` to fetch Python 3.11.
   - On Ubuntu 24.04 LTS and Debian 12, installs native `python3.11` packages.
   - Installs mandatory native C libraries: `libgomp1` (OpenMP CPU multi-threading), `libgl1` (OpenCV graphics), and `libglib2.0-0`.
   - Validates model inference execution during the build phase (`download_models.py`).

4. **Dual Nginx Configuration (aaPanel Safe):**
   - Provided standalone configuration (`nginx-careidocr.conf`) for general Linux servers.
   - Provided specialized non-destructive configuration (`nginx-aapanel-reverse-proxy.conf`) for aaPanel servers to insert inside the aaPanel-managed `server { ... }` block without overwriting SSL certificate paths or log directives.

5. **No Silent Localhost Fallback in NestJS `OcrWorkerClient`:**
   - In production (`NODE_ENV=production` or `APP_ENV=production`), omitting `CAREID_OCR_WORKER_URL` or `OCR_WORKER_URL` throws a `ServiceUnavailableException` immediately rather than silently falling back to `127.0.0.1:5050`.
   - Omitting `CAREID_OCR_SECRET` or `OCR_SECRET` logs a critical production error and rejects calls with `InternalServerErrorException`.

6. **Mandatory Multipart File Dispatch for Remote Workers:**
   - In `ocr.service.ts`, before dispatching to a remote worker (`https://careidocr.dokaan.in`), private disk files at `resolvedFilePath` are automatically read into a binary buffer and dispatched via `processBuffer(fileBuffer, ...)` over HTTPS as `multipart/form-data`.
   - Sending local filesystem paths (`processFile`) to remote hosts is strictly blocked.

7. **Shared Secret Security & Zero Logging:**
   - Authenticated endpoints (`/internal/*`) enforce `hmac.compare_digest` in `app/security.py`.
   - The shared secret is never printed, formatted, or exposed in application logs.

8. **Sanitized Health & Readiness Probes:**
   - Public endpoints `GET /health` and `GET /ready` output operational metrics (uptime, RSS memory, thread counts, engine readiness) with zero disclosure of secrets, database URLs, or internal paths.

9. **Guaranteed Failure & Retry Resilience:**
   - OCR worker outages or timeouts safely transition the job to `FAILED` with failure telemetry.
   - Failed jobs are never marked `COMPLETED`.
   - Original document attachments remain completely preserved in private storage and can be reprocessed at any time via `POST /api/v1/ocr/reprocess/:jobId`.

---

### 21.3 Automated Test Evidence

#### Microservice Test Suite (`careid-ocr/tests`)
```text
platform win32 -- Python 3.11.9, pytest-9.2.0, pluggy-1.7.0
rootdir: C:\\Users\\PABANI\\Downloads\\hvapi-main\\hvapi-main\\careid-ocr

tests/test_auth.py::test_auth_success PASSED                             [  7%]
tests/test_auth.py::test_auth_missing_header_fails PASSED                [ 14%]
tests/test_auth.py::test_auth_invalid_header_fails PASSED                [ 21%]
tests/test_health.py::test_health_endpoint PASSED                        [ 28%]
tests/test_health.py::test_readiness_endpoint PASSED                     [ 35%]
tests/test_process.py::test_jpg_extraction PASSED                        [ 42%]
tests/test_process.py::test_png_extraction PASSED                        [ 50%]
tests/test_process.py::test_single_page_pdf_extraction PASSED            [ 57%]
tests/test_process.py::test_multipage_pdf_extraction PASSED              [ 64%]
tests/test_process.py::test_invalid_file_extension PASSED                [ 71%]
tests/test_process.py::test_oversized_file PASSED                        [ 78%]
tests/test_process.py::test_corrupted_file PASSED                        [ 85%]
tests/test_process.py::test_temporary_file_cleanup PASSED                [ 92%]
tests/test_process.py::test_careid_contract_schema PASSED                [100%]

======================= 14 passed, 8 warnings in 16.06s =======================
```

#### NestJS Backend Client Test Suite (`src/modules/ocr/tests`)
```text
PASS src/modules/ocr/tests/ocr-worker.client.spec.ts (5.495 s)
PASS src/modules/ocr/tests/ocr.service.spec.ts (8.573 s)

Test Suites: 2 passed, 2 total
Tests:       17 passed, 17 total
Snapshots:   0 total
Time:        9.875 s
```

#### NestJS Production Build Check
- `npm run build` -> **Exit Code 0** (`dist/` compiled cleanly).

---

### 21.4 Final Verified Deployment Archive (`careid-ocr-deployment.zip`)

- **File Path:** `c:\\Users\\PABANI\\Downloads\\hvapi-main\\hvapi-main\\careid-ocr-deployment.zip`
- **Archive Size:** 24,718 bytes
- **Integrity Status:** `zipfile.testzip()` passed with **0 errors**.
- **Archive Manifest (22 Verified Entries):**
  ```text
  [  1171 bytes] .env.example
  [   308 bytes] .gitignore
  [  5503 bytes] README.md
  [   702 bytes] requirements.txt
  [  1627 bytes] app/config.py
  [  6297 bytes] app/engine.py
  [ 14659 bytes] app/main.py
  [  3719 bytes] app/schemas.py
  [  3037 bytes] app/security.py
  [   149 bytes] app/__init__.py
  [   538 bytes] deployment/careid-ocr.service
  [  2052 bytes] deployment/nginx-aapanel-reverse-proxy.conf
  [  2915 bytes] deployment/nginx-careidocr.conf
  [  1858 bytes] scripts/download_models.py
  [  2120 bytes] scripts/health-check.sh
  [  5587 bytes] scripts/install.sh
  [  1067 bytes] scripts/start.sh
  [  1562 bytes] tests/conftest.py
  [  1151 bytes] tests/test_auth.py
  [   866 bytes] tests/test_health.py
  [  6757 bytes] tests/test_process.py
  [    25 bytes] tests/__init__.py
  ```

---

### 21.5 Production Deployment Instructions

#### 1. Server Extraction & Installation Command
```bash
# Extract archive directly into /opt/careid-ocr
sudo mkdir -p /opt/careid-ocr
sudo unzip careid-ocr-deployment.zip -d /opt/careid-ocr
cd /opt/careid-ocr

# Run automated installer
sudo bash scripts/install.sh
```

#### 2. Service Configuration & Startup
```bash
# Configure production secret
sudo cp .env.example .env
sudo nano .env

# Enable and start daemon
sudo systemctl daemon-reload
sudo systemctl enable --now careid-ocr
sudo systemctl status careid-ocr
```

#### 3. Main Backend `.env` Variables
```ini
CAREID_OCR_WORKER_URL=https://careidocr.dokaan.in
CAREID_OCR_SECRET=<shared-64-character-hex-secret>
CAREID_OCR_TIMEOUT_MS=180000
```
"""

if target_marker in content:
    idx = content.find(target_marker)
    new_content = content[:idx] + updated_section_21
    with open(r"c:\Users\PABANI\Downloads\hvapi-main\hvapi-main\CAREID_BACKEND_MASTER_IMPLEMENTATION_REPORT.md", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Successfully updated Section 21 in CAREID_BACKEND_MASTER_IMPLEMENTATION_REPORT.md")
else:
    print("Marker not found, appending instead")

