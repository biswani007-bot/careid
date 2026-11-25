# CareID External Integrations & Background Processing Audit Findings

**Audit Phase:** Phase 1 Read-Only System Audit  
**Category:** External Services, Storage, Asynchronous Queues & Operational Failures  
**Verification Method:** Static Code Analysis, Configuration Inspection & Live Route Probes  

---

## 1. Executive Summary

An audit of external services, background queues, and file processing integrations reveals several critical operational blockers:
1. **Attachment Virus-Scan Deadlock**: Attachments are created with `virusScanStatus = 'PENDING'`. The file download endpoint strictly forbids downloading any attachment unless `virusScanStatus === 'CLEAN'`. Because **no background virus scanner, cron job, daemon, or integration exists** to scan files or transition their status, **no newly uploaded clinical report or attachment can ever be downloaded by end users**.
2. **Missing OCR Reprocessing Endpoint (Confirmed Route Absence)**: Live HTTP probes confirm that `POST /api/v1/ocr/reprocess/:jobId` returns **HTTP 404**. Source code analysis reveals the route is completely absent from `OCRController` and `AiOcrController`.
3. **Simulated / Mock OCR Pipeline**: The OCR pipeline in `OCRJobService.processJobLocalPipeline` does not interface with any real OCR engine (e.g. PaddleOCR, Tesseract, Google Cloud Vision). It returns hardcoded static strings ("HEALTH VAULT 360 - CLINICAL LABORATORY REPORT", "John Doe", "14.5 g/dL").
4. **Ghost Notification Queue**: `NotificationService.createNotification` creates records in the `notification_queue` database table with status `QUEUED`, but there are no background consumers (no BullMQ, no Celery, no scheduler) to dispatch emails, SMS, or push notifications.
5. **Backblaze B2 Storage Client**: Correctly configured using `@aws-sdk/client-s3` with presigned URLs, but relies on properly set B2 environment variables; missing credentials in staging/production correctly abort client initialization.

---

## 2. Integration Status Matrix

| Integration / Subsystem | Current Implementation Status | Backing Service / Protocol | Operational Failure Risk | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **Cloud Storage** | **Implemented** | Backblaze B2 via AWS S3 SDK v3 | Invalid credentials cause presigned URL generation to fail safely. | Medium |
| **Virus Scanner** | **Unintegrated (Deadlock)** | None (Status hardcoded to `PENDING`) | **Critical Blocker**: Users cannot download any uploaded report. | **Critical** |
| **OCR Text Recognition**| **Mock / Simulated** | Simulated static string generation | Production documents produce identical fake results. | **High** |
| **OCR Reprocessing** | **Confirmed Missing** | None (Route absent in controller) | API consumers receive HTTP 404 on reprocess requests. | **High** |
| **Notification Dispatch**| **Unintegrated (Ghost Queue)**| None (Records queued to DB only) | Notifications are never transmitted via Email/SMS/Push. | **Medium** |
| **SMS / OTP Gateway** | **Unintegrated** | None (Generated & stored in DB only)| Real patients cannot receive SMS OTP without manual test bypass.| **High** |

---

## 3. Detailed Failure Modes & Architectural Risks

### 3.1. Critical Attachment Virus-Scan Deadlock

- **Affected Files**:
  - `src/modules/medical-record/application/use-cases/medical-record.service.ts:280`
  - `src/modules/report/application/use-cases/report.service.ts:403, 541, 640`
- **Mechanism**:
  1. When a patient or doctor uploads a clinical document or report attachment, `medical-record.service.ts` initializes the database record:
     ```typescript
     virusScanStatus: 'PENDING', // Awaiting background scanner execution; not falsely reported as CLEAN
     ```
  2. When a user requests to download the report or attachment via `ReportController.downloadReportFile` (`GET /reports/download/:id/file`) or `ReportController.getDownloadToken` (`GET /reports/download/:id`), `report.service.ts` enforces:
     ```typescript
     if (!attachment.virusScanStatus || attachment.virusScanStatus !== 'CLEAN') {
       throw new ForbiddenException(
         `Attachment virus scan is ${attachment.virusScanStatus ? attachment.virusScanStatus.toLowerCase() : 'incomplete'}; download unavailable`,
       );
     }
     ```
  3. There is **no background worker, daemon, cron task, or integration** (such as ClamAV, AWS GuardDuty, or an S3 bucket event trigger) that inspects the file and transitions `virusScanStatus` from `PENDING` to `CLEAN`.
- **Operational Consequence**: Every report uploaded by any user in production or staging enters an irreversible lock state where downloads are perpetually forbidden.
- **Recommended Remediation**:
  1. Implement an asynchronous worker (or webhook) that scans attachments upon upload and updates `virusScanStatus = 'CLEAN'`.
  2. In the interim, allow immediate download if file security validation passes (`validateFileSecurity`), or introduce an administrative endpoint to update scanner statuses.

---

### 3.2. Confirmed Missing OCR Reprocessing Endpoint

- **Affected Route**: `POST /api/v1/ocr/reprocess/:jobId`
- **Audit Findings**:
  - `OCRController` defines:
    - `POST /ocr/jobs`
    - `GET /ocr/jobs`
    - `GET /ocr/jobs/:id`
    - `GET /ocr/jobs/:id/text`
    - `GET /ocr/jobs/:id/fields`
    - `GET /ocr/jobs/:id/json`
    - `POST /ocr/review/:jobId`
  - There is **no `@Post('reprocess/:jobId')` or `@Post('jobs/:id/reprocess')` handler anywhere in the codebase**.
  - **Live Probe Result**: An HTTP POST request to `https://360api.vnvision.in/api/v1/ocr/reprocess/00000000-0000-0000-0000-000000000000` returned **HTTP 404**, whereas the existing `POST /ocr/review/:jobId` returned **HTTP 401** (guard activation).
- **Conclusion**: The historical report of OCR reprocessing returning 404 is definitively explained by **route absence**, not by invalid UUIDs, authorization failures, or reverse proxy issues.
- **Recommended Remediation**: Implement `@Post('reprocess/:jobId')` in `OCRController`, delegating to `OCRJobService.reprocessJob(jobId, userId)`.

---

### 3.3. Simulated Mock OCR Engine in Production Pipeline

- **Affected File**: `src/modules/ocr/application/use-cases/ocr.service.ts:200-253`
- **Evidence**:
  ```typescript
  // Local CPU OCR Text Recognition Engine
  const mockRawText = `HEALTH VAULT 360 - CLINICAL LABORATORY REPORT\nPatient Name: John Doe\nMRN: MRN-987654\nTest Name: Complete Blood Count (CBC)\nHemoglobin: 14.5 g/dL (Normal)\nWBC: 6,800 /uL\nPlatelet Count: 250,000 /uL\nDate of Report: 2026-07-31\nStatus: Final Approved`;

  await this.ocrRepository.createPage({
    ocrJobId: jobId,
    pageNumber: 1,
    imagePath: '/storage/medical-attachments/preprocessed_page1.png',
    rawText: mockRawText,
    confidence: 0.94,
    rotationAngle: 0.0,
    processingMetadata: { engine: 'PaddleOCR-CPU', opencvDeskew: true },
  });
  ```
- **Operational Consequence**: Any medical document uploaded by any patient or doctor produces the identical mock Complete Blood Count (CBC) report for "John Doe" with identical mock confidence metrics. Real document processing does not exist.
- **Recommended Remediation**: Replace mock text generation with an integrated OCR microservice or native SDK binding (e.g. Tesseract.js / AWS Textract / Google Cloud Vision).

---

### 3.4. Ghost Notification Queue & Missing Transports

- **Affected File**: `src/modules/notifications/application/use-cases/notification.service.ts:114-128`
- **Evidence**:
  When a notification is dispatched via `createNotification`:
  ```typescript
  const notification = await this.notificationRepository.createNotification(dto);
  await this.notificationRepository.createQueueItem(notification.id, 1);
  await this.notificationRepository.updateNotificationStatus(notification.id, 'QUEUED');
  ```
  The record is inserted into `notification_queue` with status `QUEUED`. There are **no event listeners, no message bus consumers (RabbitMQ, Kafka, Redis BullMQ), and no scheduled cron jobs** that poll and process this table.
  The manual retry endpoint `retryQueue` simply executes:
  ```typescript
  await this.notificationRepository.updateNotificationStatus(item.notificationId, 'SENT', new Date());
  ```
  It mutates the database status to `SENT` without actually transmitting any message over email, SMS, or web push.
- **Operational Consequence**: Users never receive out-of-band security alerts, password reset codes, family invite emails, or appointment reminders.

---

### 3.5. Storage Presigned URL Configuration & Timeout Risks

- **Affected File**: `src/modules/storage/infrastructure/b2-storage.service.ts`
- **Evidence**:
  `B2StorageService` correctly integrates `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
  - Endpoint normalization ensures HTTPS URLs (`https://s3.us-east-005.backblazeb2.com`).
  - Default expiration: 900 seconds (15 minutes), configurable via `B2_DOWNLOAD_EXPIRY_SECONDS` up to 86,400 seconds.
  - Placeholder credential guard safely prevents connection attempts with invalid placeholder credentials.
- **Operational Consequence**: Presigned URL generation functions cleanly when environment variables are supplied. If storage credentials expire or are rotated in Backblaze without updating server `.env`, presigned URL generation throws `InternalServerErrorException`.

