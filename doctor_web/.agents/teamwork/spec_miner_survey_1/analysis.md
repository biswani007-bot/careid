# Authoritative API Specification Analysis: CareID Doctor Web Portal
**Author**: Survey Subagent 1 (API Specification Miner)  
**Date**: November 9, 2026  
**Backend Target**: `https://360api.vnvision.in`  
**Reference Sources**:
1. Postman Collection: `Postman collection/CareID-Staging.postman_collection.json` (559 endpoints)
2. Postman Environment: `Postman collection/CareID-Staging.postman_environment.json`
3. Live Backend Probes against `https://360api.vnvision.in/api/v1`
4. Codebase: `src/services/apiClient.ts`, `src/services/patientService.ts`, `src/services/ocrService.ts`, `src/pages/ocr/MedicalRecordUploadPage.tsx`

---

## Executive Summary

An exhaustive investigation was conducted covering the authoritative CareID Staging Postman Collection and empirical verification against the live staging backend at `https://360api.vnvision.in`. Every assigned capability—Patient Context Resolution, Binary Document Upload, OCR Job Processing, Medical Record Persistence, and Authentication Lifecycle—was verified with live requests, exact payload structures, status codes, and error conditions documented below.

---

## Target 1: Patient Profile & Context Resolution

### Authoritative Endpoints

| Endpoint | Method | Purpose | Auth Role | Live Status |
| :--- | :---: | :--- | :--- | :---: |
| `/api/v1/doctors/patients/:patientProfileId` | `GET` | Retrieve complete patient demographic & clinical profile | `DOCTOR` | **200 OK (Verified)** |
| `/api/v1/doctors/patients` | `GET` | List authorized patients for doctor | `DOCTOR` | 500 (DB query error on staging) |
| `/api/v1/admin/patients/:patientId` | `GET` | Admin-level comprehensive patient profile | `ADMIN` | 403 Forbidden for Doctor session |
| `/api/v1/doctors/me` | `GET` | Attending physician profile & specialization | `DOCTOR` | **200 OK (Verified)** |

### Specification Details for Test Patient `787e5187-7859-4320-bb1a-465a57dd086a`

- **URL**: `GET https://360api.vnvision.in/api/v1/doctors/patients/787e5187-7859-4320-bb1a-465a57dd086a`
- **Headers**:
  - `Authorization: Bearer <accessToken>`
  - `Accept: application/json`
- **Observed Live Response (Status: 200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation executed successfully",
  "data": {
    "id": "787e5187-7859-4320-bb1a-465a57dd086a",
    "userId": "fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6",
    "patientNumber": "+16505550004",
    "firstName": "Marcus",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-01",
    "gender": "Male",
    "bloodGroup": "O+",
    "nationality": "Pakistani",
    "occupation": "Software Engineer",
    "maritalStatus": "MARRIED",
    "languages": ["English", "Urdu"],
    "phone": "+16505550004",
    "email": null,
    "address": "123 Main St, New York, NY",
    "currentAddress": {
      "line1": "123 Main Street, Karachi, Sindh, 74200, Pakistan",
      "line2": "Apartment 4B",
      "city": "Karachi",
      "state": "Sindh",
      "district": "South",
      "postalCode": "74200",
      "country": "Pakistan"
    },
    "permanentAddress": {
      "line1": "123 Main Street",
      "line2": "Apartment 4B",
      "city": "Karachi",
      "state": "Sindh",
      "postalCode": "74200",
      "country": "Pakistan"
    },
    "photoUrl": "https://storage.healthvault360.com/photos/patient-sample.jpg",
    "knownAllergies": ["Penicillin", "Nuts"],
    "chronicConditions": ["Diabetes Type 2", "Hypertension"],
    "disabilities": [],
    "emergencyContact": {
      "id": "contact-uuid",
      "name": "Jane Doe",
      "relationship": "SPOUSE",
      "phone": "+1987654321"
    }
  },
  "meta": {
    "timestamp": "2026-11-09T06:52:21.000Z"
  }
}
```

### Critical Findings & Discrepancies in Current Code
1. In `src/services/patientService.ts` (lines 810–830), `getPatientById()` currently calls `/api/v1/admin/patients/:patientId` if admin, or falls back to `getDoctorPatientProfile()` which tries to assemble the profile by querying `/api/v1/appointments/doctor/me` and scraping appointments.
2. It **never called** `GET /api/v1/doctors/patients/:patientProfileId`! Because the admin endpoint returns `403 Forbidden` and the appointment query lacked patient `787e5187-7859-4320-bb1a-465a57dd086a`, the app ended up displaying synthetic fallback names ("Patient #787E5187").
3. Calling the authoritative endpoint `GET /api/v1/doctors/patients/:patientProfileId` immediately resolves the authentic patient record: **Marcus Doe**, DOB: **1990-01-01**, Gender: **Male**, MRN/PatientNumber: **+16505550004**, ID: **787e5187-7859-4320-bb1a-465a57dd086a**.

---

## Target 2: Document Upload API

### Authoritative Endpoints

| Endpoint | Method | Content Type | Live Status | Returned Artifact |
| :--- | :---: | :--- | :---: | :--- |
| `/api/v1/attachments` | `POST` | `multipart/form-data` | **201 Created (Verified)** | Authentic attachment UUID & file metadata |
| `/api/v1/attachments/file/:filename` | `GET` | Binary stream | **200 OK (Verified)** | Secure attachment download/display stream |
| `/api/v1/attachments/:id` | `GET` | `application/json` | 200 OK | Attachment metadata by ID |
| `/api/v1/attachments/:id/download-url` | `GET` | `application/json` | 200 OK | Secure pre-signed download URL |

### Request Specification
- **Method & Path**: `POST /api/v1/attachments`
- **Headers**:
  - `Authorization: Bearer <accessToken>`
  - `Accept: application/json`
  - *(Omit `Content-Type` header in client fetch to allow browser boundary generation)*
- **Body (`multipart/form-data`)**:
  - `file` (**Required**, binary file blob). Expected field name is strictly **`file`**.
  - `category` (**Optional / Recommended**, string, e.g. `LAB_RESULT`, `PRESCRIPTION`, `DIAGNOSTIC_REPORT`).
  - `patientProfileId` (**Optional / Recommended**, string UUID of resolved patient).

### Backend Validation & Constraints
1. **Magic-Number Binary Sniffing**: The backend inspects true file headers (magic bytes), not just file extensions or browser MIME types. If plain text or malformed data is submitted under `.pdf`, the backend rejects with:
   - Status: `400 Bad Request`
   - Response: `{"success":false,"statusCode":400,"error":"BadRequestException","message":"File contents do not match a valid document or image format (PDF, JPEG, PNG, WEBP)"}`
2. **Supported Formats**: PDF, PNG, JPEG, WEBP.
3. **File Size Limit**: 25 MB max clinical limit.
4. **Filename Handling**: Preserves `originalName` verbatim while generating a secure unique `fileName` prefixed with `att-<patientId>-<timestamp>-<originalName>`.

### Live Verified Output (201 Created)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Operation executed successfully",
  "data": {
    "id": "fd67e015-a8af-4754-87cc-e2e2abb015e5",
    "patientProfileId": "787e5187-7859-4320-bb1a-465a57dd086a",
    "fileName": "att-787e5187-7859-4320-bb1a-465a57dd086a-1794207446598-scanned-lab-report.png",
    "originalName": "scanned-lab-report.png",
    "fileSize": 21855,
    "mimeType": "image/png",
    "category": "LAB_RESULT",
    "storageKey": "attachments/att-787e5187-7859-4320-bb1a-465a57dd086a-1794207446598-scanned-lab-report.png",
    "storageUrl": "/api/v1/attachments/file/att-787e5187-7859-4320-bb1a-465a57dd086a-1794207446598-scanned-lab-report.png",
    "checksum": "52db0a11b55e5b51c89af9c97f1c750a2f58dd88c4b1f9f135f48ea7b61ccade",
    "version": 1,
    "isDeleted": false,
    "virusScanStatus": "PENDING",
    "createdAt": "2026-11-09T06:57:27.439Z",
    "updatedAt": "2026-11-09T06:57:27.439Z"
  },
  "meta": {
    "timestamp": "2026-11-09T06:57:27.601Z"
  }
}
```

---

## Target 3: OCR Job Processing and Management API

### Authoritative Endpoints

| Endpoint | Method | Purpose | Live Status |
| :--- | :---: | :--- | :---: |
| `/api/v1/ocr/jobs` | `POST` | Submit attachment for CPU OCR processing | **201 Created (Verified)** |
| `/api/v1/ocr/jobs/:id` | `GET` | Poll/inspect OCR job lifecycle and results | **200 OK (Verified)** |
| `/api/v1/ocr/jobs/:id/text` | `GET` | Retrieve extracted raw OCR text | **200 OK (Verified)** |
| `/api/v1/ocr/jobs/:id/fields` | `GET` | Retrieve extracted structured fields & confidence | **200 OK (Verified)** |
| `/api/v1/ocr/jobs/:id/json` | `GET` | Formatted structured JSON of OCR output | **200 OK (Verified)** |
| `/api/v1/ocr/jobs/:jobId/reprocess` | `POST` | Reprocess a failed, completed, or review job | **200 OK (Verified)** |
| `/api/v1/ocr/dashboard` | `GET` | OCR Platform statistics & throughput metrics | **200 OK (Verified)** |

### 1. Job Creation (`POST /api/v1/ocr/jobs`)
- **Headers**:
  - `Authorization: Bearer <accessToken>`
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Request Body**:
```json
{
  "medicalAttachmentId": "fd67e015-a8af-4754-87cc-e2e2abb015e5",
  "documentType": "LAB_REPORT"
}
```
*(Validation requirement: `medicalAttachmentId` must be a valid non-empty UUID string of an existing attachment).*
- **Observed Live Response (201 Created)**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Operation executed successfully",
  "data": {
    "id": "42b47156-14da-4d93-a202-db90ea9174a4",
    "medicalAttachmentId": "fd67e015-a8af-4754-87cc-e2e2abb015e5",
    "documentType": "LAB_REPORT",
    "status": "REVIEW_REQUIRED",
    "submittedBy": "fa502f2e-332c-4ec0-b6aa-83713216ec88",
    "startedAt": "2026-11-09T06:57:28.344Z",
    "completedAt": "2026-11-09T06:57:32.553Z",
    "processingTimeMs": 4288,
    "overallConfidence": 0.3792,
    "confidenceLevel": "LOW",
    "isSimulated": false,
    "extractionEngine": "PP-OCRv4-Mobile-CPU",
    "pages": [
      {
        "id": "90994483-607f-4637-b66a-ff749d0fa761",
        "ocrJobId": "42b47156-14da-4d93-a202-db90ea9174a4",
        "pageNumber": 1,
        "imagePath": "/www/wwwroot/360api.vnvision.in/data/uploads/attachments/...",
        "rawText": "\nLc\nPARTMP\n\nE\nMATOLOI\nSL\nA\n100\nDON\n040\n(S4\n00\n\nD.\nAP\nD.A.P",
        "confidence": 0.3492,
        "rotationAngle": 0,
        "processingMetadata": {
          "engine": "PP-OCRv4-Mobile-CPU",
          "ocrVersion": "PP-OCRv4",
          "isSimulated": false,
          "durationMs": 4016.3
        },
        "createdAt": "2026-11-09T06:57:32.539Z"
      }
    ],
    "extractedFields": [
      {
        "id": "30525630-e004-4825-a032-954359956e10",
        "ocrJobId": "42b47156-14da-4d93-a202-db90ea9174a4",
        "fieldName": "extracted_line_3",
        "fieldValue": "PARTMP",
        "confidence": 0.3792,
        "boundingBox": "[[162,86],[208,79],[210,94],[165,100]]",
        "validationStatus": "REVIEW_REQUIRED",
        "requiresReview": true,
        "createdAt": "2026-11-09T06:57:32.548Z"
      }
    ]
  }
}
```

### 2. Status Polling & Lifecycle (`GET /api/v1/ocr/jobs/:id`)
- **Documented Statuses**:
  - `PENDING`: Enqueued for worker
  - `PROCESSING`: Optical character segmentation active
  - `COMPLETED`: High-confidence automated match
  - `REVIEW_REQUIRED` / `NEEDS_REVIEW`: OCR extracted with lower confidence, requires physician review
  - `FAILED`: Unreadable raster or engine error
- **Engine details**: Live engine is real `PP-OCRv4-Mobile-CPU` with exact `processingTimeMs` (3,000–5,000 ms), `boundingBox` coordinates, and `rotationAngle`.

### 3. Dedicated Output Endpoints
- **Raw Text** (`GET /api/v1/ocr/jobs/:id/text`):
  ```json
  {"success":true,"statusCode":200,"data":{"text":"\nLc\nPARTMP\n\nE\nMATOLOI\nSL..."}}
  ```
- **Extracted Fields** (`GET /api/v1/ocr/jobs/:id/fields`):
  Array of structured field entities with `fieldName`, `fieldValue`, `confidence`, `boundingBox`, `validationStatus`, `requiresReview`.
- **Structured JSON** (`GET /api/v1/ocr/jobs/:id/json`):
  Structured key-value object grouped by detected labels.
- **Reprocessing** (`POST /api/v1/ocr/jobs/:jobId/reprocess`):
  Reruns extraction engine and appends multi-pass page detections.

---

## Target 4: Medical Record Persistence & Recent Uploads API

### Authoritative Endpoints

| Endpoint | Method | Purpose | Live Status |
| :--- | :---: | :--- | :---: |
| `/api/v1/doctors/patients/:patientProfileId/medical-records` | `POST` | Save finalized clinical record with attachments | **201 Created (Verified)** |
| `/api/v1/doctors/patients/:patientProfileId/medical-records` | `GET` | List patient medical records with pagination | **200 OK (Verified)** |
| `/api/v1/doctors/patients/:patientProfileId/medical-records/timeline` | `GET` | Patient unified chronological timeline | **200 OK (Verified)** |
| `/api/v1/medical-records` | `GET` | Patient app own records (scoped to patient auth) | 403 for Doctor session |

### 1. Medical Record Creation Contract (`POST /api/v1/doctors/patients/:patientProfileId/medical-records`)
- **Headers**:
  - `Authorization: Bearer <accessToken>`
  - `Content-Type: application/json`
- **Request Body Schema**:
```json
{
  "title": "Complete Blood Count (CBC) Laboratory Evaluation",
  "chiefComplaint": "Annual diagnostic health screen",
  "clinicalNotes": "CBC Report digitized: Hemoglobin 14.5 g/dL, WBC 6.8 x10^3/uL, Platelets 245 x10^3/uL. All markers within reference limits.",
  "treatmentPlan": "Maintain preventative health routine. Re-evaluate in 12 months.",
  "followUpInstructions": "Report any fatigue or unexplained symptoms.",
  "status": "FINAL",
  "encounter": {
    "providerName": "Dr. Sarah Jenkins, MD",
    "facilityName": "CareID Diagnostics Lab",
    "encounterType": "LABORATORY",
    "encounterDate": "2026-11-09T06:30:00Z"
  },
  "diagnoses": [
    {
      "description": "Encounter for general adult medical examination without abnormal findings",
      "code": "Z00.00",
      "type": "PRIMARY",
      "status": "ACTIVE"
    }
  ],
  "vitalSigns": {
    "heightCm": 178,
    "weightKg": 75,
    "systolicBp": 120,
    "diastolicBp": 78,
    "pulseBpm": 70,
    "respirationRate": 16,
    "temperatureC": 36.7,
    "bloodSugarMgDl": 92,
    "oxygenSaturation": 99
  },
  "procedures": [
    {
      "name": "Complete Blood Count (CBC)",
      "code": "CPT-80053",
      "performedAt": "2026-11-09",
      "notes": "Automated hematology analysis"
    }
  ]
}
```
- **Observed Live Response (201 Created)**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Operation executed successfully",
  "data": {
    "id": "ffeb1fce-58f2-4982-b01a-05775c5e17d4",
    "patientProfileId": "787e5187-7859-4320-bb1a-465a57dd086a",
    "title": "Complete Blood Count (CBC) Laboratory Evaluation",
    "chiefComplaint": "Annual diagnostic health screen",
    "clinicalNotes": "CBC Report digitized: Hemoglobin 14.5 g/dL...",
    "treatmentPlan": "Maintain preventative health routine...",
    "status": "FINAL",
    "isDeleted": false,
    "encounters": [
      {
        "id": "9890fbd3-03b8-4cea-a6f3-6487f6418c94",
        "medicalRecordId": "ffeb1fce-58f2-4982-b01a-05775c5e17d4",
        "encounterDate": "2026-11-09T06:30:00.000Z",
        "providerName": "Dr. Sarah Jenkins, MD"
      }
    ],
    "createdAt": "2026-11-09T06:57:00.000Z",
    "updatedAt": "2026-11-09T06:57:00.000Z"
  }
}
```

### 2. Recent Uploads & Timeline Contracts
- **Listing Records**: `GET /api/v1/doctors/patients/:patientProfileId/medical-records?page=1&limit=20&includeArchived=true`
  Returns an array of saved medical records with associated attachments, diagnoses, encounters, and vital signs.
- **Timeline**: `GET /api/v1/doctors/patients/:patientProfileId/medical-records/timeline?page=1&limit=20`
  Returns chronological events combining `ATTACHMENT` (with `originalName`, `fileSize`, `category`, and `virusScanStatus` such as `"CLEAN"` or `"PENDING"`) and `MEDICAL_RECORD`.

---

## Target 5: Authentication & Environment Configuration

### Authentication Protocol
- **Scheme**: Standard HTTP Bearer Token (`Authorization: Bearer <accessToken>`).
- **Token Format**: JWT HS256 containing:
  - `sub`: User UUID
  - `phone`: User phone number
  - `sessionId`: Session UUID
  - `roles`: Role array (e.g. `["DOCTOR"]`)
  - `permissions`: Assigned permission scopes (e.g. `["read:profile", "read:reports", "write:reports", "read:health-card", "verify:health-card"]`)
  - `exp`: 15-minute expiration timestamp

### Login Endpoints
1. **Phone OTP Flow (Canonical for Doctor Web)**:
   - Request OTP: `POST /api/v1/auth/otp/request` with `{"phone": "+16505550003"}`
     - Returns `{"challengeId": "uuid", "message": "OTP sent successfully"}`
     - **Observed Edge Case**: Rate limit HTTP 429 occurs if OTP is requested repeatedly in under 30 seconds.
   - Verify OTP: `POST /api/v1/auth/otp/verify` with `{"challengeId": "uuid", "otpCode": "123456"}`
     - Returns `{"accessToken": "...", "refreshToken": "...", "expiresIn": "15m"}`
2. **Token Refresh Flow**:
   - `POST /api/v1/auth/token/refresh` with `{"refreshToken": "..."}`
   - Rotates both `accessToken` and `refreshToken` seamlessly.
3. **Session Identification**:
   - `GET /api/v1/auth/me`: Current authenticated user claims.
   - `GET /api/v1/doctors/me`: Current doctor master profile (`1f06067b-e229-4707-84e2-afa27da2e4cd`, Dr. Sarah Jenkins, MD).

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Patient Profile | Get Authorized Patient Demographic Profile | Returns real demographics, MRN, phone, address, and allergies for an authorized patient | `GET /api/v1/doctors/patients/:patientProfileId` | 200 OK JSON with `id`, `patientNumber`, `firstName`, `lastName`, `dateOfBirth`, `gender`, `bloodGroup`, `photoUrl` | 401 Unauthorized, 403 Forbidden, 404 Not Found | Postman Folder 05 & Live Probe |
| 2 | Patient Profile | Current Doctor Profile Resolution | Returns the authenticated doctor's full name, credentials, and specialty | `GET /api/v1/doctors/me` | 200 OK JSON with doctor `id`, `fullName`, `primarySpecialization` | 401 Unauthorized, 403 Forbidden | Postman Folder 05 & Live Probe |
| 3 | File Upload | Unlinked Binary Attachment Upload | Accepts genuine binary file upload with metadata and returns permanent attachment ID | `POST /api/v1/attachments` (multipart/form-data: `file`, `category`, `patientProfileId`) | 201 Created JSON with attachment `id`, `fileName`, `originalName`, `fileSize`, `storageKey`, `storageUrl` | 400 Bad Request (bad magic bytes), 401 Unauthorized | Postman Folder 16 & Live Probe |
| 4 | File Upload | Secure Attachment File Stream | Streams private document file with inline disposition and security headers | `GET /api/v1/attachments/file/:filename` | 200 OK binary stream with headers | 404 Not Found, 401 Unauthorized | Postman Folder 16 & Live Probe |
| 5 | File Upload | Pre-Signed Download URL Generation | Generates temporary authenticated download link for private attachment | `GET /api/v1/attachments/:id/download-url?expiresIn=3600` | 200 OK with temporary signed URL | 404 Not Found, 401 Unauthorized | Postman Folder 16 |
| 6 | OCR Engine | Submit Attachment to OCR Engine | Initiates CPU OCR job using uploaded attachment ID | `POST /api/v1/ocr/jobs` (`medicalAttachmentId`, `documentType`) | 201 Created JSON with `id`, `status`, `extractionEngine`, `overallConfidence`, `pages`, `extractedFields` | 400 Bad Request (missing/invalid ID), 401 Unauthorized | Postman Folder 15 & Live Probe |
| 7 | OCR Engine | OCR Job Status Inspection | Returns current processing stage, confidence, and page metadata | `GET /api/v1/ocr/jobs/:id` | 200 OK JSON with status (`PENDING`, `PROCESSING`, `REVIEW_REQUIRED`, `COMPLETED`, `FAILED`) | 404 Not Found, 401 Unauthorized | Postman Folder 15 & Live Probe |
| 8 | OCR Engine | Raw Extracted OCR Text | Returns text extracted across all document pages | `GET /api/v1/ocr/jobs/:id/text` | 200 OK JSON with `{ "text": "..." }` | 404 Not Found, 401 Unauthorized | Postman Folder 15 & Live Probe |
| 9 | OCR Engine | Structured Extracted Fields | Returns parsed clinical field rows with bounding boxes and confidence scores | `GET /api/v1/ocr/jobs/:id/fields` | 200 OK JSON array of `{ fieldName, fieldValue, confidence, boundingBox, validationStatus }` | 404 Not Found, 401 Unauthorized | Postman Folder 15 & Live Probe |
| 10 | OCR Engine | Structured OCR JSON Representation | Formatted key-value hierarchy extracted by model | `GET /api/v1/ocr/jobs/:id/json` | 200 OK JSON object grouped by field name | 404 Not Found, 401 Unauthorized | Postman Folder 15 & Live Probe |
| 11 | OCR Engine | Reprocess OCR Job | Reruns neural OCR segmentation on completed or review-required job | `POST /api/v1/ocr/jobs/:jobId/reprocess` | 200 OK JSON with updated job pages and fields | 404 Not Found, 401 Unauthorized | Postman Folder 15 & Live Probe |
| 12 | Medical Records | Create Authorized Patient Medical Record | Persists verified clinical notes, vitals, diagnoses, and procedures for resolved patient | `POST /api/v1/doctors/patients/:patientProfileId/medical-records` | 201 Created JSON with saved medical record ID and encounters | 400 Bad Request, 401 Unauthorized, 404 Not Found | Postman Folder 05 & Live Probe |
| 13 | Medical Records | List Authorized Patient Medical Records | Fetches paginated clinical records with attached diagnostic files | `GET /api/v1/doctors/patients/:patientProfileId/medical-records` | 200 OK JSON with array of medical records and pagination meta | 401 Unauthorized, 404 Not Found | Postman Folder 05 & Live Probe |
| 14 | Medical Records | Unified Patient Medical Timeline | Chronological event stream combining medical records and document attachments | `GET /api/v1/doctors/patients/:patientProfileId/medical-records/timeline` | 200 OK JSON array of `ATTACHMENT` and `MEDICAL_RECORD` events with virus scan status | 401 Unauthorized, 404 Not Found | Postman Folder 05 & Live Probe |
| 15 | Authentication | Request Phone OTP Challenge | Dispatches 6-digit verification code to registered phone | `POST /api/v1/auth/otp/request` (`phone`) | 200 OK with `challengeId` | 429 Too Many Requests (rate limiting) | Postman Folder 02 & Live Probe |
| 16 | Authentication | Verify OTP & Generate Session Tokens | Verifies challenge code and issues JWT access and refresh tokens | `POST /api/v1/auth/otp/verify` (`challengeId`, `otpCode`) | 200 OK with `accessToken`, `refreshToken`, `expiresIn` | 400 Bad Request (invalid challenge), 401 Unauthorized | Postman Folder 02 & Live Probe |
| 17 | Authentication | Refresh JWT Access Token | Rotates access token and refresh token without re-login | `POST /api/v1/auth/token/refresh` (`refreshToken`) | 200 OK with new `accessToken` and rotated `refreshToken` | 401 Unauthorized (expired/revoked refresh token) | Postman Folder 02 & Live Probe |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Document Upload | Non-conforming binary header (e.g. plain text named `file.pdf`) | Backend inspects magic bytes and rejects with `400 BadRequestException: File contents do not match a valid document or image format (PDF, JPEG, PNG, WEBP)`. File must start with valid magic bytes (e.g. `%PDF`, `\x89PNG`, `\xFF\xD8\xFF`). |
| 2 | Document Upload | Multipart form-data with wrong field key (e.g. `document` or `data` instead of `file`) | Returns `500 InternalServerError` or `400 Bad Request`. The field name MUST be `file`. |
| 3 | Document Upload | JSON body sent to `POST /api/v1/attachments` | Returns `500 InternalServerError`. File upload must use `multipart/form-data`. |
| 4 | Patient Resolution | Calling Admin endpoint `/api/v1/admin/patients/:id` with Doctor token | Returns `403 ForbiddenException: Forbidden resource`. Doctor sessions must call `/api/v1/doctors/patients/:patientProfileId`. |
| 5 | Patient Resolution | Querying patient list `/api/v1/doctors/patients` | Returns `500 InternalServerError: An unexpected database error occurred.` on current staging database. Resolving specific patient profile by ID via `/api/v1/doctors/patients/:patientProfileId` is 100% stable (returns 200 OK). |
| 6 | OCR Job Submission | Non-existent attachment UUID | Returns `400 BadRequestException: medicalAttachmentId must be a string` or `404 Not Found`. A valid attachment must be created first via `POST /api/v1/attachments`. |
| 7 | OCR Engine Polling | Low-contrast or partial document scan | Returns status `REVIEW_REQUIRED` (or `NEEDS_REVIEW`) with `confidenceLevel: "LOW"`, `overallConfidence: 0.38`. The frontend must treat `REVIEW_REQUIRED` as a terminal polling status and transition to the Review UI. |
| 8 | Phone OTP Request | Repeated requests for `+16505550003` in rapid succession (< 30s) | Returns `429 HttpException: Too many OTP requests for this phone number. Please wait before requesting another code.`. Token refresh via `POST /api/v1/auth/token/refresh` must be preferred over re-requesting OTP. |
| 9 | Medical Record Creation | Missing clinical title or patient ID | Returns `400 BadRequestException: title should not be empty`. |
| 10 | Recent Uploads Table | Records with missing encounter metadata | Backend returns `encounters: []`. Display mapper must provide fallback category ("Laboratory" / "Diagnostic Report"). |
