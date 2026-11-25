# CAREID — OCR Microservice & Attachment Backend Audit Report

**Date:** November 10, 2026  
**Auditor:** Antigravity Senior Principal Backend Engineer  
**Component:** OCR Worker (`services/ocr-worker`), AI-OCR Module, Attachments Subsystem

---

## 1. System Overview

The CareID document intelligence and OCR ingestion pipeline consists of two interacting subsystems:
1. **NestJS Attachment Subsystem (`src/modules/storage` & `src/modules/medical-record`):**
   - Handles multi-part file uploads (`POST /api/v1/attachments`).
   - Validates file MIME types, file sizes (15MB ceiling), and computes SHA-256 checksums.
   - Saves files to local disk (`uploads/attachments`) and uploads to Backblaze B2 private bucket when configured.
   - Emits `attachmentId` and metadata.
2. **Python OCR Worker Microservice (`services/ocr-worker`):**
   - Implemented in Python using FastAPI / Flask with Tesseract OCR and OpenCV.
   - Listens on `http://127.0.0.1:5050`.
   - Processes image and PDF attachments, extracting bounding boxes, plain text, and structured clinical entities (e.g. CBC, lipid panel values).

---

## 2. Forensic Investigation of Staging 503 Defect

### 2.1 Staging Evidence
- Uploading an attachment via `POST /api/v1/attachments` succeeds with HTTP 201 Created and generates an attachment UUID.
- Dispatching an OCR extraction job via `POST /api/v1/ocr/jobs` returns:
  ```json
  {
    "statusCode": 503,
    "message": "OCR processing service is currently unavailable. Please verify the Python OCR worker is running.",
    "error": "Service Unavailable"
  }
  ```

### 2.2 Root Cause
- On staging, applications are orchestrated via PM2.
- Inspection of `ecosystem.config.js` showed that only the NestJS backend application (`hvapi`) was defined:
  ```javascript
  module.exports = {
    apps: [
      {
        name: 'hvapi',
        script: 'dist/main.js',
        instances: 1,
        exec_mode: 'fork',
        env: { NODE_ENV: 'production', PORT: 3000 }
      }
    ]
  };
  ```
- The Python OCR microservice (`services/ocr-worker/server.py`) was **omitted from the PM2 configuration**.
- When the staging server booted, PM2 started `hvapi` on port 3000, but nothing started the Python worker on port 5050.
- When NestJS forwarded the OCR extraction request to `http://127.0.0.1:5050/ocr`, the connection was refused (`ECONNREFUSED`), triggering the expected 503 Service Unavailable error.

---

## 3. Remediation & Operational Runbook

To resolve the 503 error on staging without modifying code:
1. Update `ecosystem.config.js` to define both the NestJS API and the Python OCR worker:
   ```javascript
   module.exports = {
     apps: [
       {
         name: 'careid-api',
         script: 'dist/src/main.js',
         instances: 1,
         exec_mode: 'fork',
         env: {
           NODE_ENV: 'production',
           PORT: 3000
         }
       },
       {
         name: 'careid-ocr-worker',
         script: 'services/ocr-worker/server.py',
         interpreter: 'python3',
         instances: 1,
         exec_mode: 'fork',
         env: {
           PORT: 5050
         }
       }
     ]
   };
   ```
2. Verify virtual environment dependencies via `services/ocr-worker/requirements.txt`:
   ```
   fastapi>=0.100.0
   uvicorn>=0.23.0
   pytesseract>=0.3.10
   Pillow>=10.0.0
   pydantic>=2.0.0
   python-multipart>=0.0.6
   ```
3. Start PM2: `pm2 start ecosystem.config.js`
4. Verify port 5050 responds: `curl http://127.0.0.1:5050/health` -> `{"status": "UP"}`.

