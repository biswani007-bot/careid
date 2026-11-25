# Authoritative API Specification & Deployed Backend Status Report

**Document Date:** November 9, 2026  
**Auditor Archetype:** Teamwork Specification Miner (`spec_miner_survey_1`)  
**Target Backend:** `https://360api.vnvision.in/api/v1`  
**Authoritative Collections Inspected:**
- `CareID-Staging.postman_collection.json` (Release v2.1.0, 513 operations across 27 domain folders)
- `CareID-Staging.postman_environment.json` (49 variables)
- `CareID-Doctor-Patient-Staging.postman_collection.json`
- Backend NestJS Controllers & Repositories (`c:\Users\PABANI\Downloads\hvapi-main\hvapi-main\src`)

---

## 1. Executive Summary & Live Findings

| Focus Area | Route | Postman & Backend Contract | Live Status | Root Cause & Key Observations |
| :--- | :--- | :--- | :---: | :--- |
| **Doctor Login (OTP)** | `POST /api/v1/auth/otp/request`<br>`POST /api/v1/auth/otp/verify` | Phone challenge + OTP verify. Returns JWT `accessToken` & `refreshToken` | **200 OK** | Verified with test doctor `+16505550003` / OTP `123456`. Generates valid Bearer token for role `DOCTOR`. |
| **Doctor Identity** | `GET /api/v1/auth/me`<br>`GET /api/v1/doctors/me` | User claims & DoctorProfile demographic / verification metadata | **200 OK** | Doctor Profile ID: `1f06067b-e229-4707-84e2-afa27da2e4cd` (Dr. Sarah Jenkins), Status: `VERIFIED`. |
| **Doctor Patients List** | `GET /api/v1/doctors/patients` | Paginated authorized patient list (`search`, `page`, `limit`, `gender`, etc.) | **500 Error** | **Fails with HTTP 500** (`InternalServerError: An unexpected database error occurred.`). **NOT HTTP 403**. Caused by `this.db.securityConsentRecord.findMany()` database failure on live DB. |
| **Single Patient Profile** | `GET /api/v1/doctors/patients/:patientProfileId` | Complete demographic profile for authorized patient | **200 OK** | Verified for patient `787e5187-7859-4320-bb1a-465a57dd086a` (Marcus Doe). Authorized via active `REFERRAL`. |
| **Attachment Upload** | `POST /api/v1/attachments` | Multipart `file` (`File` binary, max 15MB) + `patientProfileId` + `category` | **201 Created** | Real binary PDF (`sample.pdf`, 18.8 KB) uploaded successfully. Attachment ID: `0b3288c1-dc8e-4e3c-85de-39a5066aabc7`. |
| **OCR Job Dispatch** | `POST /api/v1/ocr/jobs` | JSON `{ medicalAttachmentId, documentType }` | **503 Unavailable** | Backend persists job `aefb1015-93dd-4b22-8b2d-2d9bdc24bef1` as `FAILED`. Worker unreachable at `http://127.0.0.1:5050`. |
| **OCR Jobs List/Status** | `GET /api/v1/ocr/jobs`<br>`GET /api/v1/ocr/jobs/:id` | Lists OCR jobs, failure reasons, structured fields | **200 OK** | Live queries return full job history with recorded `failureReason`. |
| **Doctor Medical Record** | `POST /api/v1/doctors/patients/:patientProfileId/medical-records` | JSON payload with clinical notes, diagnoses, vitals, procedures | **201 Created** | Successfully persisted clinical record `dec25303-5f95-4418-ba01-83ef40b487b0` for patient `787e5187-7859-4320-bb1a-465a57dd086a`. |

---

## 2. Repository & Workspace Accessibility Status

### 2.1 File System & Disk Topology
- **Configured Working Directory:** `D:\New folder\New folder\doctor web\doctor-web-frontend-main`
- **Observed System Topology:** Windows PowerShell reports:
  ```powershell
  Get-PSDrive -PSProvider FileSystem
  Name: C (Fixed, NTFS) - Size: 475.75 GB (289.21 GB Free)
  ```
  `Get-Volume` confirms only drive `C:` is present on the physical NVMe SSD (`SK hynix PVC10 HFS512GEM9X173N`). **Drive `D:` does not exist on this machine (`DriveNotFoundException`).**
- **Existing Frontend Codebase / Repaired Artifacts:**
  * Repaired files preserved intact in: `C:\Users\PABANI\doctor-web-repaired`
  * Flutter Doctor App with Postman collections in: `C:\Users\PABANI\CareID_Doctor_application`
  * Backend repository & authoritative collections in: `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`

---

## 3. Test Credentials & Test Fixtures

### 3.1 Primary Test Accounts (Postman Environment & Live Backend)

| Role | Phone | Fixed OTP | Staging UUID (`userId`) | Profile UUID | Status / Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **DOCTOR** | `+16505550003` | `123456` | `fa502f2e-332c-4ec0-b6aa-83713216ec88` | `1f06067b-e229-4707-84e2-afa27da2e4cd` | Dr. Sarah Jenkins, MD (`VERIFIED`). Board certified cardiologist. |
| **PATIENT** | `+16505550004` | `123456` | `fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6` | `787e5187-7859-4320-bb1a-465a57dd086a` | Marcus Doe (`COMPLETED`). Active referral linked to Doctor. |
| **SUPER_ADMIN** | `+16505550001` | `123456` | `bc6f6875-434c-4050-b893-07343cc27986` | N/A | `superadmin@careid.test`. Full platform permissions. |
| **ADMIN** | `+16505550002` | `123456` | `678fa42b-5867-4d7a-8fba-9efcb78d9102` | N/A | `admin@careid.test`. Administrative permissions. |
| **FACILITY_ADMIN** | `+16505550005` | `123456` | `6db51804-03a1-43ee-b196-ea33b5c8fec1` | Facility: `3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb` | City General Hospital admin. |
| **STAFF** | `+16505550006` | `123456` | `82b488bb-1473-4712-aba9-612206145d99` | Staff: `3dcc7842-8570-43a0-9b1c-da174b23432b` | Clinical intake staff. |
| **FAMILY_MEMBER**| `+16505550007` | `123456` | `e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55` | N/A | Proxy consent & family circle member. |

### 3.2 Sample Medical Files in Workspace
- `C:\Users\PABANI\Downloads\sample.pdf` (18,810 bytes, application/pdf — verified live upload)
- `C:\Users\PABANI\Downloads\functionalsample.pdf` (application/pdf)
- `C:\Users\PABANI\Downloads\DARS_RRB_3.pdf` (application/pdf)
- `C:\Users\PABANI\Downloads\Eaadhaar_804313438552.pdf` (application/pdf)
- `C:\Users\PABANI\Downloads\CareID Health Records Logo Infographic.png` (image/png)
- `C:\Users\PABANI\Downloads\signatureDARSHANIKA-140x60.jpg` (image/jpeg)

---

## 4. Features Discovered & Authoritative API Contracts

### Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Auth & Session | Request Phone OTP Challenge | Issues SMS OTP challenge to registered mobile | JSON: `{ "phone": "+16505550003" }` | HTTP 200: `{ success: true, data: { challengeId, message } }` | 400 Bad Phone, 429 Rate Limited | Postman Folder `02. Authentication & OTP`, live probe |
| 2 | Auth & Session | Verify Phone OTP & Login | Verifies OTP code, generates JWT access and refresh tokens | JSON: `{ "challengeId": "<uuid>", "otpCode": "123456", "phone": "+16505550003" }` | HTTP 200: `{ success: true, data: { accessToken, refreshToken, expiresIn } }` | 400 Validation, 401 Invalid/Expired OTP | Postman Folder `02`, live probe |
| 3 | Doctor Portal | List Authorized Patients | Lists patients doctor is authorized to treat via appointment, referral, or consent | Query: `page`, `limit`, `search`, `q`, `gender`, `bloodGroup`, `status`. Header: `Authorization: Bearer <token>` | HTTP 200: `{ success: true, data: DoctorPatientSummaryDto[], meta: { totalItems, page, limit, totalPages } }` | 401 Unauthorized, 403 Suspended/Rejected Doctor, 500 Database Error (Live bug) | Postman Folder `05. Doctor Portal`, `doctor.controller.ts`, live probe |
| 4 | Doctor Portal | Get Authorized Patient Demographic Details | Returns full demographic and emergency contact profile for patient | Path: `:patientProfileId`. Header: `Authorization: Bearer <token>` | HTTP 200: `{ success: true, data: PatientSummary (includes currentAddress, emergencyContact, authSource) }` | 401 Unauthorized, 403 Not Authorized for Patient, 404 Patient Not Found | Postman Folder `05. Doctor Portal`, `doctor.controller.ts`, live probe |
| 5 | File Attachments | Upload Unlinked / Clinical Attachment | Uploads medical PDF or image via multipart FormData with virus scan and SHA256 checksum | Multipart FormData: `file` (Binary File), `patientProfileId` (string UUID), `category` (optional string enum). Header: `Authorization: Bearer <token>` | HTTP 201: `{ success: true, data: { id, patientProfileId, fileName, originalName, fileSize, mimeType, storageUrl, checksum, ... } }` | 400 File too large (>15MB) / invalid type, 401 Unauthorized, 403 Not authorized for patient | Postman Folder `16. File Uploads & Attachments`, `medical-record.controller.ts`, live probe |
| 6 | File Attachments | Stream Private Attachment File | Streams uploaded file with strict no-store headers | Path: `:filename`. Header: `Authorization: Bearer <token>` | HTTP 200: Binary octet stream / PDF with security headers | 401 Unauthorized, 403 Forbidden, 404 Not Found | Postman Folder `16`, `medical-record.controller.ts` |
| 7 | File Attachments | Generate Presigned Download URL | Generates temporary authenticated presigned URL for secure document access | Path: `:id`, Query: `expiresIn` (60-86400s). Header: `Authorization: Bearer <token>` | HTTP 200: `{ success: true, data: { url, expiresIn } }` | 401 Unauthorized, 404 Not Found | Postman Folder `16`, `medical-record.controller.ts` |
| 8 | OCR Subsystem | Submit Attachment for OCR Processing | Creates asynchronous CPU OCR extraction job using PaddleOCR engine | JSON: `{ "medicalAttachmentId": "<uuid>", "documentType": "LAB_REPORT" }`. Header: `Authorization: Bearer <token>` | HTTP 201: `{ success: true, data: { id, medicalAttachmentId, documentType, status: "QUEUED", ... } }` | 400 Missing attachment, 404 Attachment not found, 503 Worker unreachable (persists FAILED job) | Postman Folder `15. OCR & Document Verification`, `ocr.controller.ts`, live probe |
| 9 | OCR Subsystem | Get OCR Job Details | Polls status of OCR job | Path: `:id`. Header: `Authorization: Bearer <token>` | HTTP 200: `{ success: true, data: { id, status: "COMPLETED"|"FAILED"|"REVIEW_REQUIRED", failureReason, ... } }` | 401 Unauthorized, 404 Job Not Found | Postman Folder `15`, `ocr.controller.ts`, live probe |
| 10 | OCR Subsystem | Get Extracted Structured Fields | Retrieves extracted key-value fields with bounding boxes and confidence scores | Path: `:id/fields`. Header: `Authorization: Bearer <token>` | HTTP 200: `{ success: true, data: [{ fieldName, fieldValue, confidence, boundingBox, ... }] }` | 401 Unauthorized, 404 Job Not Found | Postman Folder `15`, `ocr.controller.ts` |
| 11 | OCR Subsystem | Get Extracted Raw OCR Text | Retrieves full raw text content recognized across all pages | Path: `:id/text`. Header: `Authorization: Bearer <token>` | HTTP 200: `{ success: true, data: { text: string } }` | 401 Unauthorized, 404 Job Not Found | Postman Folder `15`, `ocr.controller.ts` |
| 12 | Doctor Clinical | Create Medical Record for Authorized Patient | Persists complete clinical encounter, vitals, diagnoses, and procedures | Path: `:patientProfileId`, JSON Body: `{ title, chiefComplaint, clinicalNotes, treatmentPlan, encounter, diagnoses, vitalSigns, procedures, status }`. Header: `Authorization: Bearer <token>` | HTTP 201: `{ success: true, data: { id, patientProfileId, encounters: [...], diagnoses: [...], vitalSigns: [...], ... } }` | 400 Missing required fields, 401 Unauthorized, 403 Unauthorized for patient, 404 Patient not found | Postman Folder `05. Doctor Portal`, `doctor.controller.ts`, live probe |
| 13 | Doctor Clinical | List Authorized Patient Medical Records | Lists clinical records documented for patient | Path: `:patientProfileId/medical-records`, Query: `page`, `limit`. Header: `Authorization: Bearer <token>` | HTTP 200: `{ success: true, data: MedicalRecord[], meta: {...} }` | 401 Unauthorized, 403 Forbidden | Postman Folder `05. Doctor Portal` |
| 14 | Doctor Clinical | Get Authorized Patient Unified Timeline | Retrieves unified clinical timeline combining records, reports, and attachments | Path: `:patientProfileId/medical-records/timeline`, Query: `page`, `limit`. Header: `Authorization: Bearer <token>` | HTTP 200: `{ success: true, data: TimelineItem[], meta: {...} }` | 401 Unauthorized, 403 Forbidden | Postman Folder `05. Doctor Portal` |

---

## 5. Detailed Endpoint Schemas & Contract Alignment

### 5.1 Authentication (`POST /api/v1/auth/otp/verify`)
- **Headers:**
  ```http
  Content-Type: application/json
  Accept: application/json
  ```
- **Request Body Schema:**
  ```json
  {
    "challengeId": "d4aed205-2a2a-45ee-82d4-d5c193fdfccd",
    "otpCode": "123456",
    "phone": "+16505550003"
  }
  ```
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Operation executed successfully",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "15m"
    },
    "meta": { "timestamp": "2026-11-09T12:26:45.533Z" }
  }
  ```

### 5.2 Attachment Upload (`POST /api/v1/attachments`)
- **Headers:**
  ```http
  Authorization: Bearer <accessToken>
  Accept: application/json
  Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
  ```
  *(Note for Frontend: Do NOT set `Content-Type` header explicitly; Axios and browser must construct the multipart boundary automatically)*
- **FormData Body Schema:**
  * `file`: Native browser `File` object (Binary: `.pdf`, `.jpg`, `.jpeg`, `.png`, `.webp`, `.tiff`, `.dcm`; max 15MB)
  * `patientProfileId`: String UUID (Target patient profile ID, e.g. `787e5187-7859-4320-bb1a-465a57dd086a`)
  * `category`: String enum (`LAB_REPORT`, `PRESCRIPTION`, `DISCHARGE_SUMMARY`, `OTHER`)
- **Success Response (HTTP 201 Created):**
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Operation executed successfully",
    "data": {
      "id": "0b3288c1-dc8e-4e3c-85de-39a5066aabc7",
      "patientProfileId": "787e5187-7859-4320-bb1a-465a57dd086a",
      "fileName": "att-787e5187-7859-4320-bb1a-465a57dd086a-1794227657853-sample.pdf",
      "originalName": "sample.pdf",
      "fileSize": 18810,
      "mimeType": "application/pdf",
      "category": "LAB_RESULT",
      "storageKey": "attachments/att-787e5187-7859-4320-bb1a-465a57dd086a-1794227657853-sample.pdf",
      "storageUrl": "/api/v1/attachments/file/att-787e5187-7859-4320-bb1a-465a57dd086a-1794227657853-sample.pdf",
      "checksum": "229defbb0cee6f02673a5cde290d0673e75a0dc31cec43989c8ab2a4eca7e1bb",
      "version": 1,
      "isDeleted": false,
      "virusScanStatus": "PENDING",
      "createdAt": "2026-11-09T12:34:18.749Z",
      "updatedAt": "2026-11-09T12:34:18.749Z"
    },
    "meta": { "timestamp": "2026-11-09T12:34:18.777Z" }
  }
  ```

### 5.3 OCR Job Creation (`POST /api/v1/ocr/jobs`)
- **Headers:**
  ```http
  Authorization: Bearer <accessToken>
  Content-Type: application/json
  Accept: application/json
  ```
- **Request Body Schema:**
  ```json
  {
    "medicalAttachmentId": "0b3288c1-dc8e-4e3c-85de-39a5066aabc7",
    "documentType": "LAB_REPORT"
  }
  ```
- **Observed Response When PaddleOCR Worker is Offline (HTTP 503 Service Unavailable):**
  ```json
  {
    "success": false,
    "statusCode": 503,
    "error": "ServiceUnavailableException",
    "message": "An unexpected internal server error occurred.",
    "meta": {
      "timestamp": "2026-11-09T12:34:35.590Z",
      "path": "/api/v1/ocr/jobs"
    }
  }
  ```
- **Database Persistence Verified:**
  The backend immediately commits a job record to PostgreSQL before dispatching to the worker:
  ```json
  {
    "id": "aefb1015-93dd-4b22-8b2d-2d9bdc24bef1",
    "medicalAttachmentId": "0b3288c1-dc8e-4e3c-85de-39a5066aabc7",
    "documentType": "LAB_REPORT",
    "status": "FAILED",
    "submittedBy": "fa502f2e-332c-4ec0-b6aa-83713216ec88",
    "failureReason": "Persistent PaddleOCR worker is unreachable at http://127.0.0.1:5050. Verify that services/ocr-worker daemon is running.",
    "extractionEngine": "PP-OCRv4-Mobile-CPU",
    "isSimulated": false
  }
  ```

### 5.4 Doctor Medical Record Creation (`POST /api/v1/doctors/patients/:patientProfileId/medical-records`)
- **Headers:**
  ```http
  Authorization: Bearer <accessToken>
  Content-Type: application/json
  Accept: application/json
  ```
- **Request Body Schema:**
  ```json
  {
    "title": "Routine Health Checkup",
    "chiefComplaint": "Mild fatigue",
    "clinicalNotes": "Patient appears well nourished.",
    "treatmentPlan": "Hydration and balanced diet",
    "followUpInstructions": "Review in 2 weeks",
    "status": "FINAL",
    "encounter": {
      "providerName": "Dr. Sarah Jenkins",
      "facilityName": "City General Hospital",
      "encounterType": "CONSULTATION",
      "encounterDate": "2026-11-09T12:35:01.339Z"
    },
    "diagnoses": [
      {
        "description": "Fatigue, unspecified",
        "code": "R53.83",
        "type": "PRIMARY",
        "status": "ACTIVE"
      }
    ],
    "vitalSigns": {
      "heightCm": 175,
      "weightKg": 70,
      "systolicBp": 120,
      "diastolicBp": 80,
      "pulseBpm": 72,
      "respirationRate": 16,
      "temperatureC": 36.6,
      "bloodSugarMgDl": 95,
      "oxygenSaturation": 98
    },
    "procedures": []
  }
  ```
- **Success Response (HTTP 201 Created):**
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Operation executed successfully",
    "data": {
      "id": "dec25303-5f95-4418-ba01-83ef40b487b0",
      "patientProfileId": "787e5187-7859-4320-bb1a-465a57dd086a",
      "title": "Routine Health Checkup",
      "chiefComplaint": "Mild fatigue",
      "clinicalNotes": "Patient appears well nourished.",
      "treatmentPlan": "Hydration and balanced diet",
      "followUpInstructions": "Review in 2 weeks",
      "status": "FINAL",
      "isDeleted": false,
      "encounters": [
        {
          "id": "8d5ba837-f26d-4525-9357-7ced158623f8",
          "medicalRecordId": "dec25303-5f95-4418-ba01-83ef40b487b0",
          "encounterDate": "2026-11-09T12:35:01.339Z",
          "providerName": "Dr. Sarah Jenkins",
          "facilityName": "City General Hospital",
          "encounterType": "CONSULTATION",
          "createdAt": "2026-11-09T12:35:03.127Z",
          "updatedAt": "2026-11-09T12:35:03.127Z"
        }
      ],
      "diagnoses": [
        {
          "id": "c04805c0-0602-4416-811f-8840557db58a",
          "medicalRecordId": "dec25303-5f95-4418-ba01-83ef40b487b0",
          "code": "R53.83",
          "description": "Fatigue, unspecified",
          "type": "PRIMARY",
          "status": "ACTIVE",
          "createdAt": "2026-11-09T12:35:03.127Z"
        }
      ],
      "vitalSigns": [
        {
          "id": "8c53a482-9802-4d59-a06c-c376f1bc08fb",
          "medicalRecordId": "dec25303-5f95-4418-ba01-83ef40b487b0",
          "heightCm": 175,
          "weightKg": 70,
          "bmi": 22.9,
          "systolicBp": 120,
          "diastolicBp": 80,
          "pulseBpm": 72,
          "respirationRate": 16,
          "temperatureC": 36.6,
          "bloodSugarMgDl": 95,
          "oxygenSaturation": 98,
          "recordedAt": "2026-11-09T12:35:03.127Z"
        }
      ],
      "procedures": [],
      "attachments": [],
      "createdAt": "2026-11-09T12:35:03.127Z",
      "updatedAt": "2026-11-09T12:35:03.127Z"
    },
    "meta": { "timestamp": "2026-11-09T12:35:03.595Z" }
  }
  ```

---

## 6. Edge Cases & Empirical Observations

| # | Feature | Input / Condition | Observed Behavior |
|---|---------|-------------------|-------------------|
| 1 | `POST /auth/otp/request` | Repeated rapid OTP requests for `+16505550003` | Returned **HTTP 429 Too Many Requests**: `{"success": false, "statusCode": 429, "error": "HttpException", "message": "Too many OTP requests for this phone number. Please wait before requesting another code."}` |
| 2 | `GET /doctors/patients` | Valid doctor Bearer token | Returned **HTTP 500 InternalServerError**: `{"success": false, "statusCode": 500, "error": "InternalServerError", "message": "An unexpected database error occurred."}`. (Does NOT return 403 Forbidden). |
| 3 | `GET /security/consents` | Valid doctor Bearer token | Returned **HTTP 500 InternalServerError**: `{"success": false, "statusCode": 500, "error": "InternalServerError", "message": "An unexpected database error occurred."}`. Pinpoints the exact DB query failure in `findAuthorizedPatients()`. |
| 4 | `GET /doctors/patients/:id` | Valid doctor Bearer token with patient `787e5187-7859-4320-bb1a-465a57dd086a` | Returned **HTTP 200 OK**: Full demographic details returned. `authSource: "REFERRAL"` confirms the doctor is legitimately authorized to access this patient. |
| 5 | `POST /attachments` | Real browser/node `Buffer` from `sample.pdf` (18,810 bytes), valid boundary | Returned **HTTP 201 Created**: Correctly computed SHA256 checksum `229defbb...`, stored to `/api/v1/attachments/file/...`, and returned generated UUID `0b3288c1-dc8e-4e3c-85de-39a5066aabc7`. |
| 6 | `POST /ocr/jobs` | Valid `medicalAttachmentId: "0b3288c1-dc8e-4e3c-85de-39a5066aabc7"` | Returned **HTTP 503 Service Unavailable**. Simultaneously created DB record with status `FAILED` and recorded error: `Persistent PaddleOCR worker is unreachable at http://127.0.0.1:5050`. |
| 7 | `POST /doctors/patients/:id/medical-records` | Valid clinical record with diagnoses and vitals | Returned **HTTP 201 Created**: Computed BMI (`22.9`), persisted encounters and vitals in PostgreSQL. |
| 8 | Drive D: Path Lookup | Path `D:\New folder\New folder\doctor web\doctor-web-frontend-main` | PowerShell threw `DriveNotFoundException: Cannot find drive. A drive with the name 'D' does not exist.` Host machine has only C: drive. |

---

## 7. PaddleOCR Worker Investigation & Admin Recovery Instructions

### 7.1 Architecture & Unreachability Findings
1. **Endpoint Called by Backend:** `http://127.0.0.1:5050/ocr`
2. **Current State on Deployed Backend:**
   The NestJS backend attempts an HTTP POST to `http://127.0.0.1:5050/ocr`. Because port 5050 is not listening or the Python service process has terminated, the Node HTTP client throws `ECONNREFUSED`.
3. **Backend Failure Handling:**
   In `src/modules/ocr/infrastructure/clients/ocr-worker.client.ts`:
   The exception is caught and recorded as:
   `"Persistent PaddleOCR worker is unreachable at http://127.0.0.1:5050. Verify that services/ocr-worker daemon is running."`
   The OCR job status is set to `FAILED`, and the HTTP endpoint responds with `503 ServiceUnavailableException`.

### 7.2 Server Administrator Recovery Instructions
To restore live PaddleOCR processing on the aaPanel / Linux deployment server:

1. **Verify Python Virtual Environment & Dependencies:**
   ```bash
   cd /www/wwwroot/360api.vnvision.in/services/ocr-worker # or corresponding aaPanel app path
   source venv/bin/activate
   pip install -r requirements.txt
   # Ensure paddlepaddle and paddleocr mobile CPU packages are installed
   ```

2. **Verify Worker Health Manually:**
   ```bash
   python3 ocr_worker.py --port 5050
   # In another shell:
   curl -X GET http://127.0.0.1:5050/health
   # Expected response: {"status": "ok", "engine": "PP-OCRv4-Mobile-CPU"}
   ```

3. **Configure Systemd / aaPanel Supervisor Daemon:**
   Create `/etc/systemd/system/careid-ocr-worker.service`:
   ```ini
   [Unit]
   Description=CareID PaddleOCR Mobile Worker Daemon
   After=network.target

   [Service]
   Type=simple
   User=www
   WorkingDirectory=/www/wwwroot/360api.vnvision.in/services/ocr-worker
   ExecStart=/www/wwwroot/360api.vnvision.in/services/ocr-worker/venv/bin/python3 app.py
   Restart=always
   RestartSec=5
   Environment=PORT=5050
   Environment=PYTHONUNBUFFERED=1

   [Install]
   WantedBy=multi-user.target
   ```
   Enable and start the service:
   ```bash
   systemctl daemon-reload
   systemctl enable careid-ocr-worker
   systemctl start careid-ocr-worker
   systemctl status careid-ocr-worker
   ```
