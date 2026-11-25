# CareID Enterprise Standalone OCR Microservice

Production-grade, standalone Optical Character Recognition (OCR) microservice for **CareID / Health Vault 360**.  
Packaged for independent deployment to:  
**`https://careidocr.dokaan.in`**

---

## 1. Architecture Overview

```
[ Doctor App / Web ] ──► [ NestJS Main Backend ] ──(HTTPS)──► [ Nginx SSL (careidocr.dokaan.in) ]
                                                                       │
                                                                 (HTTP 127.0.0.1:5050)
                                                                       ▼
                                                          [ FastAPI / Uvicorn Daemon ]
                                                                       │
                                                          [ PaddleOCR PP-OCRv4 Mobile ]
                                                                       │
                                                          [ PyMuPDF Rasterizer ]
```

- **Engine:** PaddleOCR `PP-OCRv4` Mobile Detection + English Mobile Recognition.
- **Framework:** FastAPI (Python 3.11) + Uvicorn + Starlette.
- **Hardware Acceleration:** Multi-threaded CPU OpenMP / MKLDNN optimized.
- **Supported Formats:** PDF (multi-page), PNG, JPG, JPEG, WEBP, BMP, TIFF.
- **Authentication:** Mandatory `X-CareID-Internal-Secret` header using constant-time HMAC comparison.

---

## 2. Linux Server Installation (Ubuntu 22.04 / 24.04 LTS, Debian 12)

### Step 1: Extract Deployment Archive on Server
```bash
sudo mkdir -p /opt/careid-ocr
sudo unzip careid-ocr-deployment.zip -d /opt/careid-ocr
cd /opt/careid-ocr
```

### Step 2: Run Automated Installation Script
```bash
sudo bash scripts/install.sh
```
The installation script automatically:
1. Installs system packages: `python3.11`, `python3.11-venv`, `libgomp1`, `libgl1-mesa-glx`.
2. Creates the `/opt/careid-ocr/venv` Python 3.11 virtual environment.
3. Installs pinned dependencies from `requirements.txt`.
4. Pre-downloads PP-OCRv4 detection, direction, and recognition models to `~/.paddleocr`.
5. Pre-compiles execution graphs (warmup pass) to eliminate first-request cold latency.
6. Installs the `careid-ocr.service` systemd unit.

### Step 3: Configure Environment Variables
```bash
sudo cp .env.example .env
sudo nano .env
```
Ensure you generate a secure 64-character secret and set:
```ini
CAREID_OCR_HOST=127.0.0.1
CAREID_OCR_PORT=5050
CAREID_OCR_SECRET=your-64-character-production-hex-secret
```

### Step 4: Start and Enable Systemd Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now careid-ocr
sudo systemctl status careid-ocr
```

---

## 3. Nginx Reverse Proxy & SSL Setup

### Option A: aaPanel Hosted Deployment (Recommended for aaPanel Environments)
1. In aaPanel, create website: `careidocr.dokaan.in` (Pure HTML / Static type).
2. Go to **Website Settings -> SSL** -> Apply for Let's Encrypt Certificate.
3. Go to **Website Settings -> Configuration** (or Reverse Proxy).
4. Paste the directives from `deployment/nginx-aapanel-reverse-proxy.conf` inside the server block.
5. Save and verify status.
*Note: Do NOT overwrite the entire server block to preserve aaPanel's managed SSL paths and log handlers.*

### Option B: Standard Non-aaPanel Linux Server
1. Ensure DNS A record points `careidocr.dokaan.in` to the server IP.
2. Obtain Let's Encrypt SSL Certificate:
   ```bash
   sudo certbot certonly --nginx -d careidocr.dokaan.in
   ```
3. Deploy Nginx configuration:
   ```bash
   sudo cp deployment/nginx-careidocr.conf /etc/nginx/sites-available/careidocr.conf
   sudo ln -s /etc/nginx/sites-available/careidocr.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

---

## 4. Verification & Health Probes

Run the automated health check script:
```bash
CAREID_OCR_SECRET="your-secret" bash scripts/health-check.sh http://127.0.0.1:5050
```

Or test via HTTPS from an external machine:
```bash
# Public Health Check
curl -k https://careidocr.dokaan.in/health

# Readiness Probe
curl -k https://careidocr.dokaan.in/ready

# Version Probe (Protected)
curl -k https://careidocr.dokaan.in/internal/ocr/version \
  -H "X-CareID-Internal-Secret: your-secret"
```

---

## 5. Main NestJS Backend Integration

To connect the primary CareID NestJS backend to this standalone OCR service, update the NestJS `.env`:

```ini
# Main Backend Environment Configuration
CAREID_OCR_WORKER_URL=https://careidocr.dokaan.in
CAREID_OCR_SECRET=your-64-character-production-hex-secret
CAREID_OCR_TIMEOUT_MS=180000
```

The NestJS `OcrWorkerClient` (`src/modules/ocr/infrastructure/clients/ocr-worker.client.ts`) communicates over HTTPS via:
- `GET /health` — Readiness & telemetry check.
- `POST /internal/ocr/process` — Document OCR text extraction with `X-CareID-Internal-Secret` header.

---

## 6. Security & Governance

1. **Zero Permanent Storage:** Uploaded files are streamed to `/opt/careid-ocr/tmp`, processed in memory, and immediately unlinked/scrubbed in a `finally` block on both success and failure.
2. **Timing Attack Protection:** Header authentication utilizes `hmac.compare_digest` for constant-time evaluation.
3. **PHI Redaction:** Logs strictly output operation tags, elapsed milliseconds, page counts, and sanitized filenames. Document text is never written to application logs.
4. **Denial-of-Service Defense:** Maximum file size is strictly capped at 50MB and PDF pages at 50 pages per job.

