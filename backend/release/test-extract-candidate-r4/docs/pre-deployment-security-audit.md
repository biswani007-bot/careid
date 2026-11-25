# CareID — Pre-Deployment Security and Authorization Audit

**Audit Date:** October 26, 2026  
**Target Project:** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Reference Snapshot (Read-Only Baseline):** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main - Copy`  
**Environment Target:** aaPanel Linux (PM2 Cluster + Nginx Reverse Proxy + PostgreSQL 15+)  
**Audit Scope:** Read-only source code inspection, authorization policy validation, dependency vulnerability scanning, configuration analysis, and test suite review.  
**Execution Boundary:** Zero database connections, zero schema modifications, zero secret disclosures, zero live infrastructure access, zero source code edits.

---

## 1. Executive Summary

A comprehensive, evidence-based security and authorization audit was conducted on the CareID NestJS backend codebase prior to its planned deployment on aaPanel. The objective was to identify security vulnerabilities, authorization gaps, information disclosures, and deployment-dependent risks across all 28 API domain modules without altering source code, schema, dependencies, or database state.

### Key Audit Conclusions

1. **Core Authentication Hardening is Verified:**  
   The primary authentication flow in [`src/modules/auth/application/use-cases/auth.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/auth/application/use-cases/auth.service.ts) and [`src/modules/auth/presentation/controllers/auth.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/auth/presentation/controllers/auth.controller.ts) demonstrates sound cryptographic practices: OTPs in production use cryptographically secure random integers (`crypto.randomInt(100000, 1000000)`), OTP hashes are stored using bcrypt with salt rounds of 10, verification attempts are locked out after 3 failures, refresh token rotation is atomic with UUID `jti` tracking, and environment validation strictly prohibits default or short secrets in production.

2. **Core Clinical Data Isolation is Verified:**  
   Direct access to patient medical records ([`MedicalRecordService`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/application/use-cases/medical-record.service.ts)) and family member profiles ([`FamilyService`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/family/application/use-cases/family.service.ts)) enforces strict caller-profile ownership (`record.patientProfileId !== callerProfileId` throws `ForbiddenException(403)`). Unapproved cross-profile clinical access is blocked.

3. **High-Risk Authorization Gaps Discovered:**  
   - **SEC-AUD-01 (High):** Broken Object Level Authorization (BOLA/IDOR) in notification endpoints allows any authenticated user to list, read, mark as read, or soft-delete other users' notifications by ID or query parameter.
   - **SEC-AUD-02 (High):** Missing Function Level Access Control (`RolesGuard`) on Observability endpoints allows any authenticated caller (including `PATIENT` or `RECEPTIONIST`) to view application logs, distributed traces, background job execution history, and performance statistics.

4. **Medium-Risk Data Handling & Exception Leakage Discovered:**  
   - **SEC-AUD-03 (Medium):** Predictable, unvalidated download tokens and unscanned medical attachment delivery in [`ReportService.getDownloadToken`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/report/application/use-cases/report.service.ts#L349-L367).
   - **SEC-AUD-04 (Medium):** Information disclosure in [`GlobalExceptionFilter`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/common/filters/global-exception.filter.ts#L35-L40), exposing raw database schema error messages and internal error details in HTTP responses.
   - **SEC-AUD-05 (Medium):** Unredacted `Authorization` and `Cookie` headers in HTTP request logging ([`src/app.module.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/app.module.ts#L41-L46)), creating token leakage risks in server log files.

---

## 2. Findings Grouped by Severity

### Summary Table

| Finding ID | Severity | Status | Category | Affected File(s) |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-AUD-01** | **High** | Confirmed | Broken Object Level Authorization (IDOR) | [`src/modules/notifications/presentation/controllers/notification.controller.ts:47-85`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/presentation/controllers/notification.controller.ts#L47-L85)<br>[`src/modules/notifications/application/use-cases/notification.service.ts:130-169`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/application/use-cases/notification.service.ts#L130-L169) |
| **SEC-AUD-02** | **High** | Confirmed | Missing Function Level Access Control | [`src/modules/observability/presentation/controllers/observability.controller.ts:20-216`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/observability/presentation/controllers/observability.controller.ts#L20-L216) |
| **SEC-AUD-03** | **Medium** | Confirmed | Predictable Download Token & Unscanned Attachment Delivery | [`src/modules/report/application/use-cases/report.service.ts:349-367`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/report/application/use-cases/report.service.ts#L349-L367) |
| **SEC-AUD-04** | **Medium** | Confirmed | Information Disclosure in Exception Filter | [`src/common/filters/global-exception.filter.ts:34-40`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/common/filters/global-exception.filter.ts#L34-L40) |
| **SEC-AUD-05** | **Medium** | Confirmed | Sensitive Header Logging (Bearer Token Leakage Risk) | [`src/app.module.ts:41-46`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/app.module.ts#L41-L46) |
| **SEC-AUD-06** | **Low** | Deployment-Dependent | Multi-Process In-Memory Rate Limiter Partitioning | [`src/modules/auth/infrastructure/services/auth-rate-limiter.service.ts:15`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/auth/infrastructure/services/auth-rate-limiter.service.ts#L15)<br>[`ecosystem.config.js:7-8`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/ecosystem.config.js#L7-L8) |
| **SEC-AUD-07** | **Low** | Confirmed | Unconditional Public OpenAPI / Swagger Exposure | [`src/main.ts:81-93`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/main.ts#L81-L93) |
| **SEC-AUD-08** | **Low** | Confirmed | Missing Input Validation Constraints on Attachment DTOs | [`src/modules/medical-record/presentation/dto/create-attachment.dto.ts:16-41`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/presentation/dto/create-attachment.dto.ts#L16-L41)<br>[`src/modules/report/presentation/dto/upload-report.dto.ts:18-40`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/report/presentation/dto/upload-report.dto.ts#L18-L40) |

---

### Detailed Findings

#### SEC-AUD-01 — Broken Object Level Authorization (IDOR) on Notification Endpoints
- **Severity:** High
- **Status:** Confirmed
- **Affected File & Lines:**
  - [`src/modules/notifications/presentation/controllers/notification.controller.ts:47-85`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/presentation/controllers/notification.controller.ts#L47-L85)
  - [`src/modules/notifications/application/use-cases/notification.service.ts:130-169`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/application/use-cases/notification.service.ts#L130-L169)
- **Supporting Code Path:**
  In [`notification.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/presentation/controllers/notification.controller.ts#L47-L58):
  ```typescript
  @Get()
  async getNotifications(
    @Query('recipientUserId') recipientUserId?: string,
    @Query('status') status?: string,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationService.getNotifications(recipientUserId, status);
  }

  @Get(':id')
  async getNotificationById(@Param('id') id: string): Promise<NotificationResponseDto> {
    return this.notificationService.getNotificationById(id);
  }

  @Put(':id/read')
  async markAsRead(@Req() req: any, @Param('id') id: string): Promise<NotificationResponseDto> {
    return this.notificationService.markAsRead(id, req.user.userId);
  }

  @Delete(':id')
  async softDeleteNotification(@Req() req: any, @Param('id') id: string): Promise<any> {
    return this.notificationService.softDeleteNotification(id, req.user.userId);
  }
  ```
  In [`notification.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/application/use-cases/notification.service.ts#L141-L169):
  `markAsRead(id, userId)` and `softDeleteNotification(id, userId)` accept `userId` only to record in the audit log, but perform zero verification that `notification.recipientUserId === userId` or that the caller is an administrator. Furthermore, `getNotifications(recipientUserId, status)` allows any user to supply any arbitrary `recipientUserId` or omit it altogether to list all system notifications.
- **Potential Impact:**
  Any authenticated user (e.g. standard `PATIENT`) can query, read, mark as read, or soft-delete notifications belonging to other patients, doctors, or administrative staff. Notifications frequently contain sensitive information, such as clinical update notices, appointment reminders, and security alerts.
- **Minimal Proposed Remediation:**
  1. In `getNotifications`, enforce that non-admin callers can only query notifications where `recipientUserId === req.user.userId`.
  2. In `getNotificationById`, `markAsRead`, and `softDeleteNotification`, compare `notification.recipientUserId` with `callerUserId`; if they do not match and the caller does not hold `ADMIN` or `SUPER_ADMIN` roles, throw a `ForbiddenException('Access denied')`.
- **Verification Test Required:**
  A unit and e2e test where User B attempts to call `GET /notifications/:id`, `PUT /notifications/:id/read`, and `DELETE /notifications/:id` for a notification owned by User A, asserting HTTP 403 Forbidden.

---

#### SEC-AUD-02 — Missing Function Level Access Control on Observability Endpoints
- **Severity:** High
- **Status:** Confirmed
- **Affected File & Lines:**
  - [`src/modules/observability/presentation/controllers/observability.controller.ts:20-216`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/observability/presentation/controllers/observability.controller.ts#L20-L216)
- **Supporting Code Path:**
  [`ObservabilityController`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/observability/presentation/controllers/observability.controller.ts#L24-L215) protects endpoints using `@UseGuards(AuthGuard('jwt'))`, but completely omits `@UseGuards(RolesGuard)` and `@Roles(...)`. For example:
  ```typescript
  @Get('dashboard')
  @UseGuards(AuthGuard('jwt'))
  async getDashboard() { ... }

  @Get('logs')
  @UseGuards(AuthGuard('jwt'))
  async getLogs(...) { ... }

  @Get('traces')
  @UseGuards(AuthGuard('jwt'))
  async getTraces(...) { ... }

  @Get('jobs')
  @UseGuards(AuthGuard('jwt'))
  async getBackgroundJobs(...) { ... }
  ```
- **Potential Impact:**
  Any authenticated user with any role (`PATIENT`, `DOCTOR`, `NURSE`, `RECEPTIONIST`) can inspect internal system logs, request payloads, user IDs, error stack traces, distributed tracing spans, background job schedules, and operational performance metrics. Additionally, non-admin users can write arbitrary metrics via `POST /api/v1/observability/metrics`.
- **Minimal Proposed Remediation:**
  Add `@UseGuards(AuthGuard('jwt'), RolesGuard)` and `@Roles(Role.ADMIN, Role.SUPER_ADMIN)` to the controller class or individual administrative endpoints in `ObservabilityController`. Leave `/health`, `/health/live`, and `/health/ready` public for aaPanel/load balancer health checks.
- **Verification Test Required:**
  A test asserting that a user with role `PATIENT` or `DOCTOR` calling `GET /api/v1/observability/dashboard`, `GET /api/v1/observability/logs`, or `GET /api/v1/observability/traces` receives HTTP 403 Forbidden.

---

#### SEC-AUD-03 — Predictable Download Tokens and Unchecked Delivery of Unscanned/Infected Attachments
- **Severity:** Medium
- **Status:** Confirmed
- **Affected File & Lines:**
  - [`src/modules/report/application/use-cases/report.service.ts:349-367`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/report/application/use-cases/report.service.ts#L349-L367)
- **Supporting Code Path:**
  ```typescript
  async getDownloadToken(userId: string, reportId: string): Promise<DownloadTokenResponseDto> {
    const profileId = await this.resolveProfile(userId);
    const report = await this.repository.findReportById(reportId);

    if (!report) throw new NotFoundException('Medical report not found');
    if (report.patientProfileId !== profileId) throw new ForbiddenException('Access denied');

    const attachment = report.attachments?.[0];
    const storageUrl = attachment?.storageUrl || 'https://cdn.hvapi.com/reports/sample.pdf';

    const token = `dl_token_${Date.now()}_${reportId.slice(0, 8)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      downloadUrl: `${storageUrl}?token=${token}`,
      token,
      expiresAt,
    };
  }
  ```
- **Potential Impact:**
  1. The download token is generated using a timestamp and substring of the report ID. It is not cryptographically signed (HMAC/JWT), not stored in a session/cache store, and not verified by an internal download handler.
  2. The service does not inspect `attachment.virusScanStatus`. If an attachment has status `PENDING` (the newly introduced default) or `INFECTED`, the endpoint still returns a valid download URL without warning or blocking the request.
- **Minimal Proposed Remediation:**
  1. Check `attachment.virusScanStatus`: if `virusScanStatus !== 'CLEAN'`, throw `BadRequestException('Attachment virus scan is pending or failed; download unavailable')`.
  2. Implement a signed token (e.g. `jwtService.sign({ reportId, attachmentId }, { expiresIn: '15m' })`) or cloud pre-signed URL (e.g. S3/MinIO signed GET URL).
- **Verification Test Required:**
  A unit test for `ReportService.getDownloadToken` asserting that requesting a download for a report whose attachment has `virusScanStatus: 'PENDING'` or `'INFECTED'` rejects with HTTP 400 Bad Request.

---

#### SEC-AUD-04 — Information Disclosure via Global Exception Filter
- **Severity:** Medium
- **Status:** Confirmed
- **Affected File & Lines:**
  - [`src/common/filters/global-exception.filter.ts:34-40`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/common/filters/global-exception.filter.ts#L34-L40)
- **Supporting Code Path:**
  ```typescript
  } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    errorName = `DatabaseError(${exception.code})`;
    if (exception.code === 'P2002') {
      status = HttpStatus.CONFLICT;
      message = 'A unique constraint violation occurred on the database fields.';
    } else if (exception.code === 'P2025') {
      status = HttpStatus.NOT_FOUND;
      message = 'Record requested for operation does not exist.';
    } else {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message; // <-- Leaks raw database error message
    }
  } else if (exception instanceof Error) {
    errorName = exception.name;
    message = exception.message;   // <-- Leaks raw error message for all unhandled runtime errors
  }
  ```
- **Potential Impact:**
  For any unhandled Prisma error code (such as foreign key failure `P2003`, relation violations, or SQL query errors) and any standard JavaScript `Error` (such as file system errors or library crashes), the exact internal error message is returned directly in the response payload. In production, this discloses database table names, constraint definitions, internal paths, and query fragments.
- **Minimal Proposed Remediation:**
  In production (`process.env.NODE_ENV === 'production'`), sanitize error messages before returning them to clients: return a generic message (e.g., `'A database error occurred'` or `'Internal Server Error'`) while logging the full exception stack trace internally via `this.logger.error(...)`.
- **Verification Test Required:**
  A filter unit test asserting that in `NODE_ENV=production`, an unexpected `new Error('sensitive DB connection failure')` returns `{ message: 'Internal Server Error' }` rather than leaking the raw message string.

---

#### SEC-AUD-05 — Sensitive Header Logging (Bearer Token Leakage Risk)
- **Severity:** Medium
- **Status:** Confirmed
- **Affected File & Lines:**
  - [`src/app.module.ts:41-46`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/app.module.ts#L41-L46)
- **Supporting Code Path:**
  ```typescript
  PinoLoggerModule.forRoot({
    pinoHttp: {
      transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
      level: process.env.LOG_LEVEL || 'info',
    },
  }),
  ```
- **Potential Impact:**
  `pinoHttp` does not specify redaction paths (`redact`). Standard HTTP logging configurations in Pino log incoming request headers (`req.headers`), which includes `authorization` (containing raw Bearer JWT tokens) and `cookie`. These sensitive credentials can be persisted to disk in PM2 log files (`logs/pm2-out.log`), accessible to server operators or backup processes.
- **Minimal Proposed Remediation:**
  Configure `redact` in `pinoHttp`:
  ```typescript
  redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password', 'req.body.otp']
  ```
- **Verification Test Required:**
  A test verifying that when an authenticated request is logged by `PinoLoggerModule`, the `req.headers.authorization` field is replaced with `"[Redacted]"`.

---

#### SEC-AUD-06 — Multi-Worker Rate Limiter Partitioning in Cluster Mode
- **Severity:** Low (Deployment-Dependent)
- **Status:** Deployment-Dependent
- **Affected File & Lines:**
  - [`src/modules/auth/infrastructure/services/auth-rate-limiter.service.ts:15`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/auth/infrastructure/services/auth-rate-limiter.service.ts#L15)
  - [`ecosystem.config.js:7-8`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/ecosystem.config.js#L7-L8)
- **Supporting Code Path:**
  [`AuthRateLimiterService`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/auth/infrastructure/services/auth-rate-limiter.service.ts#L15) tracks client attempt timestamps in an in-memory JavaScript `Map`:
  ```typescript
  private readonly records: Map<string, ClientRecord> = new Map();
  ```
  [`ecosystem.config.js`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/ecosystem.config.js#L7-L8) specifies:
  ```javascript
  instances: 'max',
  exec_mode: 'cluster',
  ```
- **Potential Impact:**
  When deployed across $N$ CPU cores in cluster mode, each worker process maintains an isolated `Map`. Requests load-balanced by PM2 across workers effectively multiply rate limits by $N$ (e.g., 3 OTP requests allowed per worker $\times 4$ workers = 12 OTP requests allowed before lockout). Additionally, worker restarts or crashes reset rate limit history.
- **Minimal Proposed Remediation:**
  1. For initial aaPanel deployment without external dependencies, set `instances: 1` or configure Nginx-level rate limiting (`limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;`).
  2. For multi-worker deployments, integrate Redis/Valkey for shared rate-limiting state when approved.
- **Verification Test Required:**
  A deployment configuration verification verifying that Nginx reverse proxy enforces a perimeter rate limit on `/api/v1/auth/*`.

---

#### SEC-AUD-07 — Unconditional Public OpenAPI / Swagger UI Exposure
- **Severity:** Low
- **Status:** Confirmed
- **Affected File & Lines:**
  - [`src/main.ts:81-93`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/main.ts#L81-L93)
- **Supporting Code Path:**
  ```typescript
  const document = SwaggerModule.createDocument(app, config);
  const swaggerPath = process.env.SWAGGER_PATH || 'docs';
  SwaggerModule.setup(swaggerPath, app, document);
  ```
- **Potential Impact:**
  Swagger UI is mounted unconditionally at `/docs` (and `/docs-json`), exposing the entire API surface, DTO structures, parameter types, and endpoint inventory to unauthenticated external users in production. While not directly an exploitable vulnerability, it significantly eases attacker reconnaissance on clinical and administrative surfaces.
- **Minimal Proposed Remediation:**
  Gate Swagger initialization behind an environment flag (e.g., `if (process.env.ENABLE_SWAGGER === 'true' || !isProduction)`).
- **Verification Test Required:**
  A test asserting that when `ENABLE_SWAGGER` is false in production, `GET /docs` returns 404 Not Found.

---

#### SEC-AUD-08 — Missing Input Validation Constraints on Attachment DTOs
- **Severity:** Low
- **Status:** Confirmed
- **Affected File & Lines:**
  - [`src/modules/medical-record/presentation/dto/create-attachment.dto.ts:16-41`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/presentation/dto/create-attachment.dto.ts#L16-L41)
  - [`src/modules/report/presentation/dto/upload-report.dto.ts:18-40`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/report/presentation/dto/upload-report.dto.ts#L18-L40)
- **Supporting Code Path:**
  In [`create-attachment.dto.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/presentation/dto/create-attachment.dto.ts#L16-L41):
  - `fileSize`: Decorated with `@IsNumber()` and `@Min(1)`, but lacks `@Max(15728640)` despite the documentation indicating a 15MB ceiling.
  - `mimeType`: Decorated only with `@IsString()`. No MIME whitelist (`@IsIn(['application/pdf', 'image/jpeg', 'image/png'])`) is enforced.
  - `storageUrl`: Decorated only with `@IsString()`. No URL format (`@IsUrl()`) or trusted domain whitelist is enforced.
- **Potential Impact:**
  Clients can store attachment records referencing arbitrary executable MIME types (`application/x-msdownload`, `text/html`), oversized files, or arbitrary external URLs (`http://malicious-domain.com/...`), facilitating stored cross-site scripting (via SVG/HTML) or open-redirect/phishing attacks when attachments are rendered in web portals.
- **Minimal Proposed Remediation:**
  Add `@Max(15728640)`, `@IsIn(ALLOWED_MIME_TYPES)`, and `@IsUrl({ require_tld: true, require_protocol: true })` decorators to `CreateAttachmentDto` and `UploadReportDto`.
- **Verification Test Required:**
  A DTO validation test verifying that payloads with negative or 20MB file sizes, executable MIME types, or malformed URLs are rejected with HTTP 400 Bad Request.

---

## 3. Verified Secure Controls

The audit verified that the following critical controls are active and functioning as designed:

1. **Strict Production Environment Secret Enforcement:**  
   [`src/config/env.validation.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/config/env.validation.ts#L44-L68) enforces that `JWT_SECRET` must be defined, must be $\ge 32$ characters in length, and cannot match default/placeholder values in production or staging environments. Startup is halted immediately if validation fails.
2. **Cryptographic OTP Generation & Lockout:**  
   [`src/modules/auth/application/use-cases/auth.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/auth/application/use-cases/auth.service.ts#L36-L46) uses `crypto.randomInt(100000, 1000000)` in production. OTPs expire in 5 minutes, bcrypt hashing is enforced with salt rounds of 10, verification is locked out after 3 failed attempts, resends have a 60-second cooldown, and a maximum of 3 resends is permitted per challenge.
3. **Atomic Refresh Token Rotation:**  
   Refresh tokens utilize a unique UUID `jti` claim. Upon refresh, the previous token is revoked immediately in a single database transaction, and a concurrency grace period cache protects legitimate concurrent network requests while mitigating replay attacks.
4. **Proxy Trust Guardrails:**  
   [`src/config/proxy-trust.config.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/config/proxy-trust.config.ts) and [`src/main.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/main.ts#L44-L46) reject insecure proxy settings (`true`, `*`, numeric hop counts, and broad CIDR subnets like `0.0.0.0/0` or private subnets). Only explicit, valid upstream proxy IPs or `'loopback'` are accepted, preventing `X-Forwarded-For` client IP spoofing.
5. **Production CORS Lockdown:**  
   [`src/main.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/main.ts#L49-L65) enforces that `CORS_ORIGIN` must be explicitly configured in production. Localhost and development origins are strictly disallowed when `NODE_ENV === 'production'`.
6. **HTTP Security Headers & Compression:**  
   [`src/main.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/main.ts#L41-L42) registers `helmet()` with default security headers (HSTS, X-Content-Type-Options, X-Frame-Options, DNS prefetch control) and `compression()`.
7. **Global Validation & Non-Whitelisted Property Rejection:**  
   [`src/main.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/main.ts#L71-L79) applies `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, and `enableImplicitConversion: true`, preventing parameter injection and mass assignment.
8. **Loopback Host Binding:**  
   [`src/main.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/main.ts#L104-L105) binds NestJS to loopback (`127.0.0.1:3073`) in production by default, preventing direct public access bypassing the Nginx reverse proxy.
9. **Clinical Profile Ownership Isolation:**  
   [`MedicalRecordService`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/application/use-cases/medical-record.service.ts) and [`FamilyService`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/family/application/use-cases/family.service.ts) resolve the authenticated user's `patientProfileId` and verify record ownership before executing updates, reads, or deletions. Cross-profile access throws HTTP 403 Forbidden.
10. **Administrative Role Enforcement:**  
    [`AdminController`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/presentation/controllers/admin.controller.ts), [`SecurityController`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/security/presentation/controllers/security.controller.ts), [`GovernanceController`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/governance/presentation/controllers/governance.controller.ts), [`ReportsController`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/reports/presentation/controllers/reports.controller.ts), and [`NotificationTemplateController`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/presentation/controllers/notification-template.controller.ts) strictly enforce `@UseGuards(AuthGuard('jwt'), RolesGuard)` with `@Roles(Role.ADMIN, Role.SUPER_ADMIN)`.

---

## 4. Unverified Areas and Testing Limitations

The following items could not be verified in this audit due to environmental and scope constraints:

1. **Database Integration & Migrations:**  
   The local PostgreSQL server at `127.0.0.1:5432` was offline (`ECONNREFUSED`). Live SQL queries, Prisma database connections, database constraint triggers, and offline migrations were not executed.
2. **Antivirus Daemon & Scanning Service:**  
   No active ClamAV or external virus scanning daemon is present in the workspace. The database field `virusScanStatus` defaults to `'PENDING'`, but the asynchronous scanning queue and automated transition to `'CLEAN'` or `'INFECTED'` are not yet implemented.
3. **External Client Integration:**  
   The five external client surfaces (Admin React, Patient React, Doctor React, Patient Flutter, Doctor Flutter) reside in separate repositories and were not audited in this pass.
4. **Third-Party CDN & Object Storage:**  
   Direct S3/CDN token validation and file download serving rely on external infrastructure (`cdn.hvapi.com`) and could not be verified locally.

---

## 5. Prioritized Remediation Plan

### Phase 1: Pre-Deployment Release Blockers (Immediate)

1. **Remediate Notification BOLA/IDOR (SEC-AUD-01):**
   - Update [`NotificationController`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/presentation/controllers/notification.controller.ts) to pass `req.user.userId` and `req.user.role` to all notification queries.
   - Enforce that non-admin callers can only view, read, or delete notifications where `notification.recipientUserId === callerUserId`.
2. **Lock Down Observability Endpoints (SEC-AUD-02):**
   - Apply `RolesGuard` and `@Roles(Role.ADMIN, Role.SUPER_ADMIN)` to [`ObservabilityController`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/observability/presentation/controllers/observability.controller.ts) for `/dashboard`, `/metrics`, `/logs`, `/traces`, `/jobs`, `/performance`, and `/statistics`.
   - Preserve `/health`, `/health/live`, and `/health/ready` as public endpoints for probe monitoring.
3. **Sanitize Production Error Responses (SEC-AUD-04):**
   - Modify [`GlobalExceptionFilter`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/common/filters/global-exception.filter.ts) so that unhandled Prisma and runtime `Error` messages return generic error text when `NODE_ENV === 'production'`.
4. **Redact Sensitive HTTP Headers in Logs (SEC-AUD-05):**
   - In [`src/app.module.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/app.module.ts), configure Pino `pinoHttp.redact` to strip `req.headers.authorization` and `req.headers.cookie`.

### Phase 2: Defense-in-Depth & API Hardening (Next Sprint)

1. **Gate OpenAPI / Swagger UI (SEC-AUD-07):**
   - In [`src/main.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/main.ts), mount `SwaggerModule` only when `process.env.ENABLE_SWAGGER === 'true'` or when `NODE_ENV !== 'production'`.
2. **Harden Attachment DTOs (SEC-AUD-08):**
   - In [`CreateAttachmentDto`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/presentation/dto/create-attachment.dto.ts) and [`UploadReportDto`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/report/presentation/dto/upload-report.dto.ts), enforce `@Max(15728640)`, MIME type whitelisting, and URL validation.
3. **Block Unscanned Attachment Downloads (SEC-AUD-03):**
   - In [`ReportService.getDownloadToken`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/report/application/use-cases/report.service.ts), verify that `attachment.virusScanStatus === 'CLEAN'` before issuing a download URL.
4. **Nginx Perimeter Rate Limiting (SEC-AUD-06):**
   - Add Nginx `limit_req_zone` directives on `/api/v1/auth/*` in the aaPanel Nginx configuration to guard against brute-force attacks across multi-worker PM2 instances.

---

## 6. Release-Blocker Checklist

Before deploying the CareID backend to aaPanel, each item on this checklist must be satisfied:

- [ ] **RB-01:** `NotificationController` and `NotificationService` verified to block cross-user notification access.
- [ ] **RB-02:** `ObservabilityController` protected by `RolesGuard` with `ADMIN` and `SUPER_ADMIN` restrictions on logs, traces, and metrics.
- [ ] **RB-03:** `GlobalExceptionFilter` sanitized so internal database details are never returned in production responses.
- [ ] **RB-04:** Pino logger configured with header redaction for `Authorization` and `Cookie` headers.
- [ ] **RB-05:** `ReportService.getDownloadToken` verified to block downloads when `virusScanStatus !== 'CLEAN'`.
- [ ] **RB-06:** Production environment variables validated: `JWT_SECRET` $\ge 32$ characters, `CORS_ORIGIN` set to trusted domains, `TRUST_PROXY` set to explicit reverse proxy IP or `'loopback'`.
- [ ] **RB-07:** All 327+ unit and regression tests pass with exit code 0 (`npm test`).
- [ ] **RB-08:** Production build succeeds without errors (`npm run build`).

---

## 7. Exact Inspection Commands Executed and Actual Results

| # | Inspection Command | Execution Directory | Exit Code | Actual Result Summary |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `git status` | `hvapi-main` | 1 | Git directory not initialized in workspace; verified source tree directly. |
| 2 | `npm test` | `hvapi-main` | 0 | **29 test suites passed, 327 tests passed, 0 failed** in 15.3s. Security regression, proxy trust, auth rate limiter, and role guard specs verified green. |
| 3 | `npm run build` | `hvapi-main` | 0 | **Nest build succeeded**; TypeScript compiled cleanly to `dist/` without compilation errors. |
| 4 | `npm audit` | `hvapi-main` | 1 | **17 vulnerabilities found in dependencies** (4 moderate, 11 high, 2 critical including `proxy-addr` GHSA-jqcg-44mw-7w3h, `compression` GHSA-vc2v-76pw-4v95, `multer` GHSA-wc9g-mqfw-jrwm). |
| 5 | Source inspections via read tools | `hvapi-main` | 0 | Inspected all 28 controllers, DTOs, guards, middleware, `GlobalExceptionFilter`, `PinoLoggerModule`, and `main.ts`. |

---

## Recommendation

**BLOCKED — HIGH-RISK FINDINGS REQUIRE REVIEW**

*Deployment to aaPanel must remain on hold until the two High-severity authorization findings (SEC-AUD-01: Notification BOLA/IDOR and SEC-AUD-02: Observability Role Bypass) and the two Medium-severity information leakage findings (SEC-AUD-04: Exception Filter Leakage and SEC-AUD-05: Unredacted Header Logging) are reviewed and remediated.*
