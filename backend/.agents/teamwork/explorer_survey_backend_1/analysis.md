# Comprehensive Backend Codebase & Architecture Survey

**Target Codebase:** `c:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Date:** 2026-11-09  
**Investigator:** teamwork_explorer (`explorer_survey_backend_1`)  
**Scope:** Prisma ORM Schema, Clinical API Contracts, Multipart Uploads, Local CPU PaddleOCR Daemon, and Root Cause Analysis for R3 (`GET /api/v1/doctors/patients`) and R4 (PaddleOCR Worker Unreachability on Port 5050).

---

## 1. Executive Summary

This survey provides a comprehensive architectural and code-level investigation into the CareID backend (`Health Vault 360 API`). The investigation specifically targets the clinical workflows, database schema relationships, attachment upload pipelines, OCR job processing lifecycles, and backend daemon integrations.

### Key Discoveries:
1. **R3 Doctor Patients API (`GET /api/v1/doctors/patients`):**
   - **403 Forbidden Root Causes:** Missing `DOCTOR` role in JWT token payload (`RolesGuard`); doctor `verificationStatus` is `SUSPENDED` or `REJECTED`; or when requesting individual patient resources (`:patientProfileId`), doctor lacks active facility affiliations or practitioner-patient clinical access links (appointments, referrals, consents).
   - **500 Internal Server Error Root Causes:** Unhandled `RangeError: Invalid time value` during date formatting (`new Date(p.createdAt).toISOString()`); database schema mismatch if table `security_platform_audit_logs` does not exist on the database host; or Prisma query crashes if unmapped fields or unindexed relations are queried in `findAuthorizedPatients`.
2. **R4 PaddleOCR Worker Unreachability (`http://127.0.0.1:5050`):**
   - **Root Cause:** The Python OCR daemon (`services/ocr-worker/server.py`) is **not configured** in `ecosystem.config.js`. When the backend is booted or restarted via PM2, only `careid-backend-api` (Port 3073) is started. The Python daemon on port 5050 is not running unless started manually or supervised. Furthermore, missing Python virtual environment dependencies or mismatch of `CAREID_OCR_SECRET` triggers connection failures, causing the NestJS backend `OcrWorkerClient` to throw `503 Service Unavailable`.
3. **Attachment Upload Contract:**
   - The route `/records/upload` **does not exist** in the backend. Calling it yields HTTP 404.
   - The authoritative attachment upload route is **`POST /api/v1/attachments`** (`AttachmentController`), which accepts `multipart/form-data` with form field `file`, plus `patientProfileId` and `category`.
   - The upload response payload exposes the newly created attachment ID under the property name **`id`** (inside `data.id`).
4. **OCR Job Submission Contract (`POST /api/v1/ocr/jobs`):**
   - Accepts JSON payload with property **`medicalAttachmentId`** (string) and optional `documentType`.
   - Because NestJS `ValidationPipe` enforces `forbidNonWhitelisted: true`, passing `attachmentId` instead of `medicalAttachmentId` results in an immediate **HTTP 400 Bad Request**.

---

## 2. Prisma Database Schema Analysis (`prisma/schema.prisma`)

### 2.1 Model Relationships & Schema Blueprint

The database is PostgreSQL 16+ managed through Prisma ORM 7. Below is the mapping of relevant clinical and platform models:

| Model | Table Name | Key Primary / Unique Keys | Relevant Foreign Keys & Relations |
| :--- | :--- | :--- | :--- |
| **`User`** | `users` | `id` (UUID), `phone` (unique), `email` (unique) | Has 1 `PatientProfile`, 1 `DoctorProfile`, `userRoles UserRole[]` |
| **`UserRole`** | `user_roles` | `id`, unique(`[userId, roleId]`) | `userId -> User.id`, `roleId -> Role.id` |
| **`DoctorProfile`** | `doctor_profiles` | `id`, `userId` (unique), `registrationNumber`, `licenseNumber`, `providerIdentifier` | `userId -> User.id`, `facilities DoctorFacility[]`, `appointments Appointment[]` |
| **`DoctorFacility`** | `doctor_facilities` | `id`, unique(`[doctorId, facilityId]`) | `doctorId -> DoctorProfile.id`, `facilityId -> Facility.id`, `departmentId -> FacilityDepartment.id` |
| **`PatientProfile`** | `patient_profiles` | `id`, `userId` (unique), `patientNumber` (unique) | `userId -> User.id`, `clinicalRecords MedicalRecord[]`, `medicalAttachments MedicalAttachment[]` |
| **`Facility`** | `facilities` | `id`, `facilityCode` (unique), `registrationNumber` (unique) | `branches FacilityBranch[]`, `departments FacilityDepartment[]`, `doctorAssignments DoctorFacility[]` |
| **`MedicalRecord`** | `medical_records` | `id` | `patientProfileId -> PatientProfile.id`, `encounters MedicalEncounter[]`, `diagnoses ClinicalDiagnosis[]`, `vitalSigns VitalSigns[]`, `procedures MedicalProcedure[]`, `attachments MedicalAttachment[]` |
| **`MedicalAttachment`** | `medical_attachments` | `id` | `patientProfileId -> PatientProfile.id`, `medicalRecordId -> MedicalRecord.id` (nullable), `versions AttachmentVersion[]` |
| **`OCRJob`** | `ocr_jobs` | `id` | Scalar `medicalAttachmentId` (no foreign key constraint in schema), `pages OCRPage[]`, `extractedFields ExtractedField[]`, `verifications OCRVerification[]` |
| **`SecurityConsentRecord`** | `security_consent_records` | `id` | Scalar `patientId`, `authorizedDoctorId`, `authorizedFacilityId`, `status: SecurityConsentStatus` |
| **`PatientReferral`** | `patient_referrals` | `id`, `referralNumber` (unique) | Scalar `patientId`, `referringDoctorId`, `receivingDoctorId`, `receivingFacilityId`, `status: ReferralStatus` |
| **`SecurityPlatformAuditLog`**| `security_platform_audit_logs` | `id` | Scalar `userId`, `action`, `resource`, `resourceId`, `result`, `ipAddress` |

### 2.2 Schema Nuances & Foreign Key Discoveries
- **`OCRJob.medicalAttachmentId`**: Stored as a raw scalar string (`String @map("medical_attachment_id")`). There is no explicit `@relation` constraint between `OCRJob` and `MedicalAttachment` in `schema.prisma`. Verification of attachment existence is handled purely application-side in `OCRJobService.processJobLocalPipeline()`.
- **`PatientReferral`**: Scalar IDs (`patientId`, `referringDoctorId`, `receivingDoctorId`, `receivingFacilityId`) without Prisma relation navigation properties. Application code performs explicit lookups.
- **`DoctorProfile` Status Field**: Uses enum `DoctorVerificationStatus` (`PENDING`, `VERIFIED`, `REJECTED`, `SUSPENDED`).

---

## 3. Investigation of Doctor Patients API (`GET /api/v1/doctors/patients`)

### 3.1 Code Architecture & Call Chain
1. **Controller:** [`src/modules/doctor/presentation/controllers/doctor.controller.ts:102-114`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/doctor/presentation/controllers/doctor.controller.ts#L102)
   ```typescript
   @Get('patients')
   @Roles('DOCTOR')
   @HttpCode(HttpStatus.OK)
   async getPatients(
     @Req() req: any,
     @Query() query: DoctorPatientsQueryDto,
   ): Promise<PaginatedResponseDto<DoctorPatientSummaryDto>> {
     return this.doctorService.getAuthorizedPatients(req.user.userId, query, req.ip);
   }
   ```
2. **Guards Applied:**
   - `@UseGuards(AuthGuard('jwt'), RolesGuard)` at the class level.
   - `RolesGuard` (`src/modules/auth/infrastructure/guards/roles.guard.ts`) checks `user.roles.includes('DOCTOR')`.
3. **Service Logic:** [`src/modules/doctor/application/use-cases/doctor.service.ts:798-857`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/doctor/application/use-cases/doctor.service.ts#L798)
   - Resolves `DoctorProfile` by caller `userId`: `this.repository.findProfileByUserId(userId)`.
   - Validates `doctor.verificationStatus`: rejects `SUSPENDED` and `REJECTED`.
   - Retrieves active facility IDs: `this.repository.getDoctorActiveFacilityIds(doctor.id)`.
   - Calls `findAuthorizedPatients(doctor.id, doctor.userId, activeFacilityIds, query)`.
   - Maps returned items to `DoctorPatientSummaryDto`.
   - Calls `createSecurityAuditLog`.
4. **Repository Query:** [`src/modules/doctor/infrastructure/database/doctor.repository.ts:981-1149`](file:///c:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/doctor/infrastructure/database/doctor.repository.ts#L981)
   - Aggregates authorized patient UUIDs across 3 authorization pathways:
     1. **Appointments:** `appointment.findMany({ where: { doctorProfileId: { in: doctorIdentifiers }, isDeleted: false, status: { in: ['SCHEDULED', 'CONFIRMED', ...] } } })`
     2. **Referrals:** `patientReferral.findMany({ where: { isDeleted: false, status: { in: ['ACCEPTED', 'IN_PROGRESS'] }, ... } })`
     3. **Security Consents:** `securityConsentRecord.findMany({ where: { isDeleted: false, status: 'GRANTED', consentType: { in: ['TREATMENT', 'DATA_SHARING'] }, ... } })`
   - If `allAuthorizedIds.length === 0`, returns `{ items: [], total: 0 }`.
   - Otherwise, queries `patientProfile.findMany` with pagination and includes `user` and `emergencyContact`.

### 3.2 Detailed Root Cause Analysis for HTTP 403 vs HTTP 500

| HTTP Status | Condition / Mechanism | File & Line Reference | Exact Error Thrown / Observed |
| :--- | :--- | :--- | :--- |
| **403 Forbidden** | JWT token does not contain `'DOCTOR'` in `payload.roles`. | `roles.guard.ts:19` | `ForbiddenException: Forbidden resource` |
| **403 Forbidden** | Doctor account verification status is `SUSPENDED`. | `doctor.service.ts:808` | `ForbiddenException: Doctor registration is currently suspended` |
| **403 Forbidden** | Doctor account verification status is `REJECTED`. | `doctor.service.ts:811` | `ForbiddenException: Doctor registration was rejected` |
| **403 Forbidden** | Requesting specific patient endpoint (`/patients/:id/*`) when doctor has zero active facility affiliations. | `doctor.service.ts:541` | `ForbiddenException: Active healthcare facility affiliation is required to access patient records` |
| **403 Forbidden** | Requesting specific patient endpoint (`/patients/:id/*`) without clinical authorization (no active appointment, referral, or consent). | `doctor.service.ts:575` | `ForbiddenException: Access denied: You do not have valid clinical authorization to access this patient's records` |
| **500 Internal Error** | Unhandled Date parsing crash during `new Date(p.createdAt).toISOString()`. If a patient has null/invalid timestamp. | `doctor.service.ts:840` | `RangeError: Invalid time value` -> `GlobalExceptionFilter` (HTTP 500) |
| **500 Internal Error** | Missing database table `security_platform_audit_logs`. The service calls `createSecurityAuditLog` synchronously; if table is unmigrated, Prisma crashes. | `doctor.service.ts:844`, `doctor.repository.ts:968` | `PrismaClientKnownRequestError: P2021 Table does not exist` -> `GlobalExceptionFilter` (HTTP 500) |
| **500 Internal Error** | Unhandled Prisma query exception on sub-queries (`appointment`, `patientReferral`, `securityConsentRecord`) if enum values or relations mismatch database types. | `doctor.repository.ts:992, 1008, 1044` | `PrismaClientKnownRequestError` -> `GlobalExceptionFilter` (HTTP 500) |

---

## 4. Investigation of Attachment Upload Pipeline

### 4.1 Route Discrepancy: `/api/v1/attachments` vs `/records/upload`
- **Finding:** A thorough regex search across all controllers in `src/` confirms that **no route `/records/upload` exists**.
- The controller `MedicalRecordController` is mounted at `@Controller(['medical-records', 'records'])`, but it only defines:
  - `POST /api/v1/medical-records/:id/attachments` / `POST /api/v1/records/:id/attachments` (links to an existing record ID).
- The dedicated, standalone upload controller is **`AttachmentController`** mounted at **`@Controller('attachments')`** (`src/modules/medical-record/presentation/controllers/medical-record.controller.ts:137`).
- **Endpoint:** `POST /api/v1/attachments`
- Calling `/records/upload` from any client will return `HTTP 404 Not Found`.

### 4.2 Multer & Multipart Configuration
- Decorated with `@UseInterceptors(FileInterceptor('file'))`.
- Supported content types: `multipart/form-data` and `application/json`.
- Buffer validation: `MAX_FILE_SIZE = 15 * 1024 * 1024` (15 MB).
- Allowed extensions: `.pdf`, `.jpg`, `.jpeg`, `.png`, `.webp`, `.tiff`, `.dcm`.
- File magic-byte security inspection: `validateDocumentBuffer(file.buffer)` verifies headers against spoofed extensions.
- SHA-256 checksum calculation: `crypto.createHash('sha256').update(file.buffer).digest('hex')`.

### 4.3 Storage Destination
- **Local Disk Path:** `path.join(process.cwd(), 'data', 'uploads', 'attachments', fileName)`.
- **Generated File Name Format:** `att-${targetProfileId}-${Date.now()}-${safeOriginalName}`.
- **Object Storage (B2):** If `B2StorageService` is configured, uploads asynchronously with rollback (unlinks local file if B2 upload fails).

### 4.4 Response DTO
- The endpoint returns `MedicalAttachmentResponseDto`:
  ```json
  {
    "id": "e45f9c10-...",
    "medicalRecordId": null,
    "patientProfileId": "787e5187-...",
    "fileName": "att-787e5187-...-lab.pdf",
    "originalName": "lab.pdf",
    "fileSize": 102450,
    "mimeType": "application/pdf",
    "category": "LAB_RESULT",
    "storageKey": "attachments/att-...",
    "storageUrl": "/api/v1/attachments/file/att-...",
    "checksum": "...",
    "version": 1,
    "isDeleted": false,
    "virusScanStatus": "PENDING",
    "createdAt": "2026-11-09T12:00:00.000Z",
    "updatedAt": "2026-11-09T12:00:00.000Z"
  }
  ```
- **Crucial Integration Detail:** The unique attachment identifier is exposed as **`id`**, NOT `medicalAttachmentId`. The frontend client must map `uploadResponse.data.id` into `medicalAttachmentId` when calling `POST /api/v1/ocr/jobs`.

---

## 5. Investigation of OCR Job Processing (`POST /api/v1/ocr/jobs`)

### 5.1 DTO Schema & Validation
- **DTO:** `CreateOCRJobDto` (`src/modules/ocr/presentation/dto/ocr-enterprise.dto.ts:6-16`):
  ```typescript
  export class CreateOCRJobDto {
    @ApiProperty({ example: 'attachment-uuid-1' })
    @IsNotEmpty()
    @IsString()
    medicalAttachmentId!: string;

    @ApiProperty({ example: 'LAB_REPORT', required: false })
    @IsOptional()
    @IsString()
    documentType?: string;
  }
  ```
- **Strict Validation:** `ValidationPipe` in `src/main.ts` enforces `whitelist: true, forbidNonWhitelisted: true`.
  - Sending `attachmentId` will fail with `400 Bad Request: property attachmentId should not exist`.
  - Property **`medicalAttachmentId`** is mandatory and must not be empty.

### 5.2 Service & Pipeline Execution
1. Creates an `OCRJob` record in PostgreSQL with status `QUEUED`.
2. Calls `processJobLocalPipeline(job.id)`:
   - Resolves the attachment record via `this.ocrRepository.findAttachmentById(job.medicalAttachmentId)`.
   - Locates file on local disk (`data/uploads/attachments/` or `data/uploads/`) or fetches buffer from remote storage.
   - If not found on disk, falls back to sample document (`ocr-poc/sample_docs/`) matching `documentType`.
   - Transitions job status to `OCR_RUNNING`.
   - Dispatches to `OcrWorkerClient`.
   - If worker succeeds: creates `OCRPage` records, extracts structured fields using `DocumentFieldExtractor`, updates job status to `COMPLETED` (or `REQUIRES_REVIEW` if confidence is low).
   - If worker throws an error (e.g. `ECONNREFUSED`): catches error, updates job status to `FAILED` with `failureReason`, logs failure, and rethrows the exception, resulting in **HTTP 503 Service Unavailable**.

---

## 6. Investigation of PaddleOCR Worker (`http://127.0.0.1:5050`)

### 6.1 Worker Architecture & Configuration
- **Directory:** `services/ocr-worker/`
- **Main Server:** `services/ocr-worker/server.py` (`aiohttp.web` application)
- **Engine:** `services/ocr-worker/engine.py` (`PersistentPaddleOCREngine`)
- **Default Port & Host:** `127.0.0.1:5050` (configured in `config.py` via `CAREID_OCR_PORT` and `CAREID_OCR_HOST`).
- **Internal Authentication:** All routes under `/internal/*` require header `X-CareID-Internal-Secret: <CAREID_OCR_SECRET>`.
- **Public Health Route:** `GET /health` requires NO authentication and returns:
  ```json
  {
    "status": "ok",
    "worker": "CareID-Persistent-PaddleOCR",
    "engineReady": true,
    "ocrVersion": "PP-OCRv4",
    "architecture": "PP-OCRv4_mobile_det + en_PP-OCRv4_mobile_rec",
    "uptimeSeconds": 124.5,
    "residentRamMb": 245.3,
    "peakWorkingSetMb": 280.1,
    "activeRequests": 0,
    "maxConcurrency": 2,
    "cpuThreads": 4,
    "pdfDpi": 150
  }
  ```

### 6.2 Why the Worker is Unreachable on Deployed Backend
1. **Omission from PM2 Ecosystem Configuration:**
   - In `ecosystem.config.js`, only `careid-backend-api` (`dist/src/main.js`) is configured.
   - The Python OCR worker daemon is **completely absent** from `ecosystem.config.js`.
   - Result: On server boot or aaPanel PM2 restart, only the NestJS backend starts. Port 5050 remains closed with nothing listening.
2. **Missing Python Virtual Environment & Dependencies:**
   - PaddleOCR requires heavy native dependencies (`paddlepaddle`, `paddleocr`, `pymupdf`, `aiohttp`, `psutil`).
   - If the aaPanel deployment script only executed `npm ci --omit=dev` and did not configure Python or run `pip install -r services/ocr-worker/requirements.txt`, the worker cannot run.
3. **Missing or Mismatched Environment Variable (`CAREID_OCR_SECRET`):**
   - If `CAREID_OCR_SECRET` is unset in backend `.env`, `OcrWorkerClient` rejects requests with 500 before even reaching the network.
   - If the secret does not match what the Python worker loads from the root `.env`, the worker returns 401 Unauthorized.

### 6.3 Administrator Remediation & Supervised Startup Instructions

#### Option A: Supervise via PM2 (Recommended for aaPanel)
1. Add `careid-ocr-worker` to `ecosystem.config.js` or start it directly with PM2:
   ```bash
   cd /www/wwwroot/careid-backend/services/ocr-worker
   python3 -m venv ocr-env
   source ocr-env/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   pm2 start server.py --name careid-ocr-worker --interpreter ./ocr-env/bin/python3
   pm2 save
   ```
2. Unified `ecosystem.config.js` update:
   ```javascript
   module.exports = {
     apps: [
       {
         name: 'careid-backend-api',
         script: 'dist/src/main.js',
         instances: 1,
         exec_mode: 'fork',
         autorestart: true,
         env: {
           NODE_ENV: 'production',
           PORT: 3073,
           HOST: '127.0.0.1',
         },
       },
       {
         name: 'careid-ocr-worker',
         cwd: 'services/ocr-worker',
         script: 'server.py',
         interpreter: 'services/ocr-worker/ocr-env/bin/python3',
         instances: 1,
         exec_mode: 'fork',
         autorestart: true,
         env: {
           CAREID_OCR_HOST: '127.0.0.1',
           CAREID_OCR_PORT: 5050,
         },
       },
     ],
   };
   ```

#### Option B: Supervise via Systemd
Create `/etc/systemd/system/careid-ocr-worker.service`:
```ini
[Unit]
Description=CareID Persistent PaddleOCR Worker Daemon
After=network.target

[Service]
Type=simple
User=www
WorkingDirectory=/www/wwwroot/careid-backend/services/ocr-worker
EnvironmentFile=/www/wwwroot/careid-backend/.env
ExecStart=/www/wwwroot/careid-backend/services/ocr-worker/ocr-env/bin/python3 server.py
Restart=always
RestartSec=5
StandardOutput=append:/www/wwwroot/careid-backend/logs/ocr-worker-out.log
StandardError=append:/www/wwwroot/careid-backend/logs/ocr-worker-err.log

[Install]
WantedBy=multi-user.target
```
Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now careid-ocr-worker
curl -s http://127.0.0.1:5050/health
```

---

## 7. Investigation of Medical Record Creation (`POST /api/v1/doctors/patients/:patientProfileId/medical-records`)

### 7.1 Endpoint Signature & Authorization
- **Location:** `src/modules/doctor/presentation/controllers/doctor.controller.ts:167-179`
- **Method:** `POST /api/v1/doctors/patients/:patientProfileId/medical-records`
- **Role Requirement:** `@Roles('DOCTOR')`
- **Security Check:** Invokes `verifyDoctorPatientAccess(userId, patientProfileId)`:
  - Doctor must exist and have non-suspended/non-rejected status.
  - Doctor must have at least one active facility affiliation (`doctor_facilities`).
  - Access is granted if and only if an active appointment, referral, or consent links the doctor/facility to the patient.

### 7.2 Payload Schema (`CreateMedicalRecordDto`)
- Defined in `src/modules/medical-record/presentation/dto/create-medical-record.dto.ts:143-199`:
  - `title`: string (required)
  - `chiefComplaint`: string (optional)
  - `clinicalNotes`: string (optional)
  - `treatmentPlan`: string (optional)
  - `followUpInstructions`: string (optional)
  - `status`: enum `MedicalRecordStatus` (`DRAFT`, `FINAL`, `ARCHIVED`)
  - `encounter`: `EncounterDto` (`providerName`, `facilityName`, `encounterType`, `encounterDate`)
  - `diagnoses`: `ClinicalDiagnosisDto[]` (`code`, `description`, `type`, `status`)
  - `vitalSigns`: `VitalSignsDto` (`heightCm`, `weightKg`, `systolicBp`, `diastolicBp`, `pulseBpm`, `respirationRate`, `temperatureC`, `bloodSugarMgDl`, `oxygenSaturation`)
  - `procedures`: `ProcedureDto[]` (`name`, `code`, `performedAt`, `notes`)

### 7.3 Persistence Mechanism
- Handled by `DoctorRepository.createMedicalRecord(patientProfileId, data)`:
  - Automatically calculates `bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10` if vitals provided.
  - Defaults `providerName` to doctor's `fullName` and `encounterType` to `'CONSULTATION'`.
  - Performs a single nested Prisma transaction creating `medical_records`, `medical_encounters`, `clinical_diagnoses`, `vital_signs`, and `medical_procedures`.
  - Appends audit log to `medical_record_audit_logs` with action `'DOCTOR_ENCOUNTER_CREATED'`.
  - Returns `MedicalRecordResponseDto` with HTTP 201 Created.

---

## 8. Summary Table of Endpoints & Contracts

| Endpoint | HTTP Method | Auth Role | Expected Payload / Params | Return Contract Key Attributes |
| :--- | :---: | :---: | :--- | :--- |
| `/api/v1/doctors/patients` | `GET` | `DOCTOR` | Query: `page`, `limit`, `search`, `gender`, `status` | `{ data: DoctorPatientSummaryDto[], meta: PaginationMeta }` |
| `/api/v1/doctors/patients/:patientProfileId` | `GET` | `DOCTOR` | Param: `patientProfileId` | `DoctorPatientDetailDto` with demographic & emergency contact |
| `/api/v1/attachments` | `POST` | Authenticated | `multipart/form-data`: `file`, `patientProfileId`, `category` | `MedicalAttachmentResponseDto` with attribute **`.id`** |
| `/api/v1/ocr/jobs` | `POST` | Authenticated | JSON: `{ "medicalAttachmentId": string, "documentType"?: string }` | `OCRJobResponseDto` with status `QUEUED`, `OCR_RUNNING`, etc. |
| `/api/v1/ocr/jobs/:id` | `GET` | Authenticated | Param: `id` | `OCRJobResponseDto` with `pages`, `extractedFields`, `status` |
| `/api/v1/doctors/patients/:patientProfileId/medical-records` | `POST` | `DOCTOR` | Param: `patientProfileId`, Body: `CreateMedicalRecordDto` | `MedicalRecordResponseDto` with embedded diagnoses, vitals |
| `http://127.0.0.1:5050/health` | `GET` | None | None | `{ status: "ok", engineReady: true, ... }` |
| `http://127.0.0.1:5050/internal/ocr/process`| `POST` | Internal Secret | Header: `X-CareID-Internal-Secret`, Body: JSON or Multipart | `{ success: true, overallConfidence, pages: [...] }` |
