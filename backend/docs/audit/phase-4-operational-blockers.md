# CareID Backend — Phase 4.4: Production Operational Blockers & Readiness Audit

**Audit Date:** October 2026  
**Target Platform:** CareID Production Deployment (`/www/wwwroot/360api.vnvision.in`)  
**Production URL:** `https://360api.vnvision.in`  
**Backend Stack:** NestJS 11.1.28 + TypeScript 5.7 + Prisma 7.9.1 + PostgreSQL  
**Audit Purpose:** Comprehensive review of production operational readiness, security configurations, asynchronous pipelines, and architectural bottlenecks before mobile app rollout.

---

## 1. Operational Blockers Summary Matrix

| Category | Component / Subsystem | Production Status | Classification | Action Required / Owner |
|---|---|---|---|---|
| **CORS** | Browser Cross-Origin Middleware | Configured & Hardened | `READY` (Env Dependent) | Server Admin: set `CORS_ALLOWED_ORIGINS` for Web Admin |
| **File Antivirus** | ClamAV / Virus Scanner Pipeline | Broken (Fail-Closed) | **CRITICAL CODE DEFECT** | Engineering: Implement background scanner or fallback |
| **File Downloads** | Timed Token & Presigned B2 URLs | Blocked by Antivirus | **OPERATIONAL BLOCKER** | Blocked until Antivirus pipeline resolves `CLEAN` status |
| **OCR Pipeline** | Text Recognition & Extraction | Simulated / Mocked | `CODE LIMITATION` | Engineering: Integrate real OCR engine (Tesseract/Paddle/Cloud) |
| **Notifications** | Queue Worker & Gateway Dispatch | Queue-Only; No Dispatch | `CODE DEFECT` | Engineering: Build queue worker + FCM/APNs/Twilio integration |
| **Appointments** | Booking & State Machine | Unimplemented Stub | `API MISSING` | Engineering: Implement `AppointmentModule` in Phase 5 |
| **Rate Limiting** | Sliding Window Protection | In-Memory (Single Node) | `SCALING LIMITATION` | Engineering/DevOps: Migrate to Redis for PM2 clusters |
| **Token Refresh** | Single-Use JWT Rotation | Production Hardened | `READY` | None (Client Dio interceptor required) |
| **Logging & PII** | Pino Structured Logging | Hardened & Redacted | `READY` | None (Sensitive headers censored; stack traces hidden) |

---

## 2. In-Depth Operational Analysis

### 2.1 CORS Configuration
- **Implementation:** `src/common/utils/cors.util.ts`, integrated into `src/main.ts`.
- **Behavior:**
  1. **Native Mobile Apps (Flutter iOS & Android):**
     Native HTTP clients (Dart `http`, `dio`) do not send an `Origin` header. The custom CORS callback in `cors.util.ts` explicitly accounts for this:
     ```typescript
     if (!origin) {
       return callback(null, true);
     }
     ```
     Native mobile requests are **never blocked by CORS**.
  2. **Web Clients (Flutter Web / Admin Portal):**
     Origins are evaluated against `process.env.CORS_ALLOWED_ORIGINS`.
     - In **Development**, falls back to `http://localhost:3000`, `http://localhost:5173`, etc.
     - In **Production**, if `CORS_ALLOWED_ORIGINS` is missing, empty, or contains wildcards (`*`), it **fails closed** (`[]`).
- **Owner Action:** The server administrator must ensure `CORS_ALLOWED_ORIGINS` in `/www/wwwroot/360api.vnvision.in/.env` includes all web portal domains (e.g. `https://admin.careid.in,https://360api.vnvision.in`).

---

### 2.2 File Upload & Antivirus Pipeline (Critical Operational Blocker)
- **Architecture:**
  - File uploads persist to Backblaze B2 via `B2StorageService` using S3-compatible APIs.
  - Attachment records are created in PostgreSQL with `virusScanStatus: 'PENDING'`.
- **The Defect:**
  In Phase 2, security remediation properly ensured that files are not falsely reported as `'CLEAN'` upon upload. However:
  1. No background daemon, cron job, or worker service exists to inspect uploaded files with ClamAV.
  2. No code in the entire repository ever transitions `virusScanStatus` from `'PENDING'` to `'CLEAN'` (outside of test suites).
  3. All download and preview endpoints in `ReportService` enforce:
     ```typescript
     if (!attachment.virusScanStatus || attachment.virusScanStatus !== 'CLEAN') {
       throw new BadRequestException('Attachment virus scan is pending or failed; download unavailable');
     }
     ```
- **Consequence:**
  **Every newly uploaded document, lab report, or diagnostic PDF in production is permanently locked and cannot be previewed or downloaded by patients or doctors.**
- **Remediation Recommendation:**
  In Phase 5, implement an asynchronous virus scanning task (or synchronous validation on upload for files under 5MB) using a local ClamAV TCP daemon (`clamd`) or cloud scanning API, updating `virusScanStatus = 'CLEAN'`.

---

### 2.3 File Download & Document Security
- **Architecture:**
  - Token-based URL generation (`GET /api/v1/reports/download/:id` returns a signed URL with a short-lived HMAC token).
  - Storage redirection: Direct binary streaming or redirect to Backblaze B2 presigned download URL (`B2StorageService.getPresignedDownloadUrl`).
- **Security Posture:**
  - Strict authentication: Validates caller's clinical authorization or patient profile ownership.
  - Fail-closed configuration: If B2 storage credentials are misconfigured, requests fail closed rather than serving unverified files.
- **Operational Blocker:**
  Functionally complete and secure, but currently blocked from serving user-uploaded files due to the Antivirus `PENDING` issue described in Section 2.2.

---

### 2.4 Genuine vs Simulated OCR
- **Current State:**
  - `AiOcrService` (`/api/v1/ai/ocr`): Returns a hardcoded static mock object:
    ```typescript
    const mockExtracted = {
      title: 'Blood Count Report OCR',
      category: 'Laboratory',
      prescribedBy: 'Dr. John Watson',
    };
    ```
  - `OCRJobService` (`/api/v1/ocr`): Has a full relational schema (`ocr_jobs`, `ocr_pages`, `ocr_extracted_fields`, `ocr_templates`, `ocr_audit_logs`). However, `processJobLocalPipeline` injects static mock laboratory report text (`Patient Name: John Doe`, `Hemoglobin: 14.5 g/dL`, `WBC: 6,800 /uL`).
- **Missing Infrastructure:**
  Neither Tesseract, PaddleOCR, AWS Textract, nor Google Cloud Vision API is wired up.
- **Operational Assessment:**
  The human review workflow (`GET /api/v1/ocr/review` and `POST /api/v1/ocr/review/:jobId`) is production-ready and fully role-enforced. However, mobile users will observe identical extracted data regardless of what physical document they photograph or upload.

---

### 2.5 Notifications Subsystem & Queue Worker
- **Current State:**
  - Creating a notification (`POST /api/v1/notifications`) stores the record in `notifications` (status `QUEUED`) and creates an entry in `notification_queue`.
  - In-app notification retrieval (`GET /api/v1/notifications`) and unread count badges (`GET /api/v1/notifications/unread/count`) query PostgreSQL directly and function properly.
- **Missing Delivery Engine:**
  - No background worker reads from `notification_queue` to dispatch notifications.
  - No Firebase Cloud Messaging (FCM) or Apple Push Notification service (APNs) SDK is integrated.
  - No device token registration table or API exists in the backend schema.
  - No SMS gateway client (Twilio / Gupshup / AWS SNS) is integrated.
- **Operational Assessment:**
  In-app notifications work via polling. **Out-of-app push notifications and SMS alerts do not function.**

---

### 2.6 Appointment Workflow and State Machine
- **Current State:**
  `AppointmentController`, `AppointmentService`, and `AppointmentRepository` in `src/modules/appointment/` are empty scaffolding stubs marked `// TODO: Phase 5 Implementation`.
- **Operational Assessment:**
  No appointment booking API exists. The Doctor and Patient mobile applications must omit or disable the appointment scheduling UI until Phase 5 is implemented.

---

### 2.7 Rate Limiting & Production Clustering
- **Implementation:** `AuthRateLimiterService` (`src/modules/auth/infrastructure/services/auth-rate-limiter.service.ts`).
- **Policy:**
  - IP OTP request: 10 requests / 15 minutes.
  - Phone OTP request: 3 requests / 10 minutes.
  - Resend OTP cooldown: 60 seconds per challenge.
  - IP OTP verification: 10 attempts / minute.
  - IP Token refresh: 30 requests / minute.
- **Clustering Limitation:**
  The rate limiter uses an in-memory `Map<string, ClientRecord>`. In a production environment running multiple PM2 worker processes (e.g. `pm2 start -i max`), each worker maintains its own isolated map. Requests routed round-robin across 4 workers effectively quadruple the allowed rate limit.
- **Reverse Proxy IP Trust:**
  `src/main.ts` correctly configures `app.set('trust proxy', resolveTrustProxyConfig(process.env.TRUST_PROXY))`. The Nginx reverse proxy must send `X-Forwarded-For` and `X-Real-IP`.

---

### 2.8 Token Refresh & Session Management
- **Security Features:**
  - Single-use refresh token rotation with SHA-256 hash persistence.
  - `jti` (JWT ID) tracking and revocation propagation upon token reuse detection.
  - 30-second concurrency tolerance window (`recentRotations` cache) to prevent network retry race conditions on mobile.
  - Active session validation (`user_sessions.is_active`).
- **Operational Assessment:**
  Fully production-ready and verified.

---

### 2.9 Logging & PHI/PII Protection
- **Configuration:** `nestjs-pino` in `src/app.module.ts`.
- **Redaction Rules:**
  - `req.headers.authorization` -> `[REDACTED]`
  - `req.headers.cookie` -> `[REDACTED]`
  - `req.headers["x-api-key"]` -> `[REDACTED]`
  - `req.headers["set-cookie"]` -> `[REDACTED]`
- **PHI / PII Safeguards:**
  Request bodies containing sensitive clinical diagnoses or vitals are not logged to disk. Stack traces are hidden from client HTTP responses in production mode (`isProduction`).
- **Operational Assessment:**
  Fully production-ready and HIPAA/GDPR aligned.

---

## 3. Summary of Operational Action Items

| Priority | Action Item | Target Phase | Responsibility |
|---|---|---|---|
| **P0 (Immediate)** | Resolve Antivirus `PENDING` status blocking file downloads | Phase 5 | Backend Engineering |
| **P0 (Immediate)** | Add `DOCTOR` medical encounter documentation & records access | Phase 5 | Backend Engineering |
| **P1 (High)** | Implement `AppointmentModule` booking API and state machine | Phase 5 | Backend Engineering |
| **P1 (High)** | Configure production SMS gateway provider in `auth.service.ts` | Phase 5 / Ops | DevOps & Engineering |
| **P2 (Medium)** | Integrate FCM/APNs push notification worker and device token API | Phase 5 | Backend Engineering |
| **P2 (Medium)** | Migrate in-memory rate limiter to Redis for PM2 cluster safety | Phase 5 | DevOps & Engineering |
| **P3 (Future)** | Connect genuine OCR engine (PaddleOCR / Cloud Vision) | Post-MVP | AI/ML Engineering |

