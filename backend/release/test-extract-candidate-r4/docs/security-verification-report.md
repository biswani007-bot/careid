# CareID — Authorization Verification and Pre-Deployment Security Review

**Date:** October 26, 2026  
**Auditor:** Antigravity (Google DeepMind Team)  
**Target Repository:** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Reference Snapshot (Strictly Read-Only):** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main - Copy`  
**Target Deployment Environment:** aaPanel Linux (PM2 Cluster + Nginx Reverse Proxy + PostgreSQL 15+)  
**Review Scope:** Independent verification of recently applied authorization remediations (SEC-AUD-01 and SEC-AUD-02), discovery of new authorization edge cases, assessment of remaining audit findings (SEC-AUD-03 through SEC-AUD-08), test execution verification, and release readiness evaluation.

---

## 1. Executive Summary & Release Recommendation

### 1.1 Executive Summary
An independent, evidence-based security verification was performed on the active CareID NestJS backend codebase. Rather than relying on previous claims at face value, this review performed line-by-line inspection of the actual controller and service logic, evaluated guard execution and role bindings, examined repository queries, executed both targeted and full test suites locally, and inspected the six remaining audit findings from [`docs/pre-deployment-security-audit.md`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/docs/pre-deployment-security-audit.md).

The recent remediations for **SEC-AUD-01** (Notification Ownership) and **SEC-AUD-02** (Observability Role Restrictions) successfully resolved the primary vulnerability paths:
1. Normal authenticated users (`PATIENT`, `DOCTOR`, `STAFF`) are prevented from querying other users' notifications via query parameter manipulation.
2. Cross-user access to notification resources by identifier is blocked with `ForbiddenException` (HTTP 403).
3. The 12 internal observability endpoints are strictly restricted to `ADMIN` and `SUPER_ADMIN` via `RolesGuard`, while the 3 health probes remain publicly accessible.

However, line-by-line analysis identified **two newly discovered authorization edge cases** in [`NotificationService`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/application/use-cases/notification.service.ts) and confirmed **six outstanding security findings** (SEC-AUD-03 through SEC-AUD-08) that must be addressed before live deployment.

### 1.2 Release Recommendation: CONDITIONAL — NOT READY FOR PRODUCTION
**CareID is NOT yet ready for production deployment.** 
While the core authentication and multi-role authorization architectures are robust and all 379 test cases pass, the application contains release-blocking information disclosure and data validation vulnerabilities:
- **Blocker 1 (New Edge Case):** Notifications where `recipientUserId = null` fail open to any authenticated user for reading, marking as read, and soft-deletion due to truthiness-check bypasses.
- **Blocker 2 (SEC-AUD-04):** Raw database errors and internal runtime exceptions are returned directly to client HTTP responses by [`GlobalExceptionFilter`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/common/filters/global-exception.filter.ts).
- **Blocker 3 (SEC-AUD-05):** Inbound `Authorization` bearer tokens and session cookies are logged in cleartext by Pino HTTP in [`src/app.module.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/app.module.ts).
- **Blocker 4 (SEC-AUD-07):** OpenAPI Swagger UI and complete API schema are exposed unconditionally on production environments in [`src/main.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/main.ts).

Production deployment should remain blocked until the prioritized remediation plan in Section 6 is approved and implemented.

---

## 2. Independent Verification: SEC-AUD-01 & SEC-AUD-02

### 2.1 Finding 1: Notification Authorization (SEC-AUD-01)
Source files inspected:
- [`src/modules/notifications/presentation/controllers/notification.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/presentation/controllers/notification.controller.ts)
- [`src/modules/notifications/application/use-cases/notification.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/application/use-cases/notification.service.ts)
- [`src/modules/notifications/infrastructure/database/notification.repository.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/infrastructure/database/notification.repository.ts)
- [`src/modules/notifications/tests/notification.service.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/tests/notification.service.spec.ts)
- [`src/modules/notifications/tests/notification.controller.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/tests/notification.controller.spec.ts)

#### Verification Checklist:
1. **Route Authentication & JWT Context:**  
   `NotificationController` applies `@UseGuards(AuthGuard('jwt'), RolesGuard)` at the class level (line 20). Every endpoint extracts identity from `req.user.userId` and `req.user.roles`.
2. **Caller Scoping & Query Parameter Independence:**  
   In `NotificationService.getNotifications` (lines 136–145):
   ```typescript
   let targetUserId = recipientUserId;
   if (callerUserId) {
     const isAdmin = callerRoles.includes('ADMIN') || callerRoles.includes('SUPER_ADMIN');
     if (!isAdmin) {
       if (recipientUserId && recipientUserId !== callerUserId) {
         throw new ForbiddenException('You do not have access to these notifications');
       }
       targetUserId = callerUserId;
     }
   }
   ```
   If a non-admin supplies `?recipientUserId=other-user`, the request is immediately rejected with HTTP 403. If a non-admin omits `?recipientUserId`, `targetUserId` is forced to `callerUserId`, preventing retrieval of system-wide notifications.
3. **Cross-User Protection on Specific IDs:**  
   In `getNotificationById`, `markAsRead`, and `softDeleteNotification`, the notification's `recipientUserId` is compared with the caller's verified `userId`. For mismatched IDs, non-admin callers receive `ForbiddenException('You do not have access to this notification')`.
4. **Approved Administrative Roles:**  
   Only `ADMIN` and `SUPER_ADMIN` bypass the recipient match (`const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')`). Unprivileged roles such as `DOCTOR`, `PATIENT`, and `STAFF` cannot access another user's notifications.
5. **Compatibility of Existing Pipelines:**  
   Existing notification creation (`POST /notifications` restricted to `ADMIN`, `SUPER_ADMIN`, `FACILITY_ADMIN`), queue creation, queue retries, and audit logging remain fully compatible and functional.
6. **Test Coverage:**  
   Targeted tests in [`notification.service.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/tests/notification.service.spec.ts) (19 tests) and [`notification.controller.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/tests/notification.controller.spec.ts) (9 tests) execute both positive (owner access, admin access) and negative (cross-user access blocked) cases.

---

### 2.2 Finding 2: Observability Role Restrictions (SEC-AUD-02)
Source files inspected:
- [`src/modules/observability/presentation/controllers/observability.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/observability/presentation/controllers/observability.controller.ts)
- [`src/modules/observability/application/use-cases/observability.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/observability/application/use-cases/observability.service.ts)
- [`src/modules/observability/tests/observability.controller.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/observability/tests/observability.controller.spec.ts)

#### Verification Checklist:
1. **Administrative Access Control:**  
   All 12 internal endpoints (`dashboard`, `recordMetric`, `getMetrics`, `getMetricsByCategory`, `getLogs`, `getLogsByRequestId`, `getTraces`, `getTraceById`, `getBackgroundJobs`, `getBackgroundJobById`, `getPerformanceSnapshot`, `getStatistics`) are explicitly decorated with:
   ```typescript
   @UseGuards(AuthGuard('jwt'), RolesGuard)
   @Roles('ADMIN', 'SUPER_ADMIN')
   ```
2. **Denial of Unauthorized Callers:**  
   Verified via [`observability.controller.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/observability/tests/observability.controller.spec.ts):
   - Unauthenticated requests return `false` in `RolesGuard.canActivate()`.
   - Callers with roles `PATIENT`, `DOCTOR`, or `FACILITY_ADMIN` return `false`.
   - Callers with `ADMIN` or `SUPER_ADMIN` return `true`.
3. **Public Probes Preservation:**  
   The three operational health probes:
   - `GET /observability/health`
   - `GET /observability/health/live`
   - `GET /observability/health/ready`
   remain undecorated by `AuthGuard` or `RolesGuard`, ensuring aaPanel, Kubernetes, or load balancer probes do not require credentials.
4. **Information Disclosure in Health Probes:**  
   - `health/live` returns strictly: `{ status: 'UP', timestamp: string }`.
   - `health/ready` returns strictly: `{ status: 'READY', database: 'CONNECTED', timestamp: string }` or HTTP 503 `{ status: 'DEGRADED', database: 'DEGRADED', timestamp: string }`.
   - Neither probe discloses internal database credentials, connection strings, hostnames, or process PIDs.
   - *Observation on `health`:* `GET /observability/health` returns `components: [details]`. Currently, no automated cron writes failure details into `SystemHealthCheck`, but if error strings containing hostnames or stack traces were recorded, they would be serialized in this public response.

---

## 3. Newly Discovered Authorization Edge Cases

During the line-by-line verification pass, two concrete authorization defects and two architectural considerations were discovered:

### 3.1 Confirmed Defect: Notifications with `recipientUserId = null` Fail Open to Non-Admin Users
- **Severity:** High
- **Location:** [`src/modules/notifications/application/use-cases/notification.service.ts:160, 177, 201`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/application/use-cases/notification.service.ts#L160)
- **Code Path:**
  ```typescript
  // In getNotificationById (L160):
  if (!isAdmin && notification.recipientUserId && notification.recipientUserId !== callerUserId) {
    throw new ForbiddenException('You do not have access to this notification');
  }

  // In markAsRead (L177):
  if (!isAdmin && notification.recipientUserId && notification.recipientUserId !== userId) {
    throw new ForbiddenException('You do not have access to this notification');
  }

  // In softDeleteNotification (L201):
  if (!isAdmin && notification.recipientUserId && notification.recipientUserId !== userId) {
    throw new ForbiddenException('You do not have access to this notification');
  }
  ```
- **Analysis:**
  Because the condition includes `notification.recipientUserId &&`, if a notification in the database has `recipientUserId: null` (such as external notifications sent via email/phone, or platform broadcast notices), the condition evaluates to `null` (falsy). 
  As a result:
  1. Any regular authenticated `PATIENT` or `DOCTOR` can read any notification where `recipientUserId = null` via `GET /notifications/:id`.
  2. Any regular authenticated `PATIENT` or `DOCTOR` can mark any notification where `recipientUserId = null` as `READ` via `PUT /notifications/:id/read`.
  3. Any regular authenticated `PATIENT` or `DOCTOR` can permanently soft-delete any notification where `recipientUserId = null` via `DELETE /notifications/:id`.
- **Status:** **Confirmed Vulnerability.**
- **Required Fix:** Notifications with `recipientUserId = null` must be treated as administrative/broadcast messages. Only `ADMIN` and `SUPER_ADMIN` should be permitted to read, mark as read, or soft-delete them:
  ```typescript
  const isOwner = notification.recipientUserId === userId;
  if (!isAdmin && !isOwner) {
    throw new ForbiddenException('You do not have access to this notification');
  }
  ```

---

### 3.2 Confirmed Defect: Missing `callerUserId` Fails Open in Notification Service
- **Severity:** Medium
- **Location:** [`src/modules/notifications/application/use-cases/notification.service.ts:137, 158`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/application/use-cases/notification.service.ts#L137)
- **Code Path:**
  ```typescript
  // In getNotifications (L137):
  let targetUserId = recipientUserId;
  if (callerUserId) {
    // ... authorization checks ...
  }
  const notifications = await this.notificationRepository.findNotifications(targetUserId, status);

  // In getNotificationById (L158):
  if (callerUserId) {
    // ... authorization checks ...
  }
  return this.mapNotification(notification);
  ```
- **Analysis:**
  If `callerUserId` is undefined (e.g. if invoked by an internal service, background task, or if `req.user.userId` failed to populate), the entire authorization block is bypassed. `getNotifications(recipientUserId)` will execute with `targetUserId = recipientUserId` (or `undefined`, returning all notifications), and `getNotificationById` will return the notification to an unverified caller without checking ownership.
- **Status:** **Confirmed Defect.**
- **Required Fix:** Enforce fail-closed verification: `if (!callerUserId) throw new UnauthorizedException('Authentication identity required');`.

---

### 3.3 Architectural Observation: Non-Atomic Repository Mutations (TOCTOU)
- **Severity:** Low / Architectural
- **Location:** [`src/modules/notifications/infrastructure/database/notification.repository.ts:114, 122`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/infrastructure/database/notification.repository.ts#L114)
- **Analysis:**
  In `markAsRead` and `softDeleteNotification`, the service performs a two-step operation:
  1. `findNotificationById(id)` to check ownership.
  2. `update({ where: { id }, data: ... })` in the repository.
  Because the SQL update only matches `where: { id }`, ownership is not enforced atomically at the database layer. In a high-concurrency environment, if ownership or recipient assignment changed between the check and the update, the update would succeed regardless.
- **Recommendation:** Update repository methods to accept caller scope conditionally:
  `where: isAdmin ? { id } : { id, recipientUserId: userId }`.

---

### 3.4 Architectural Observation: Duplicate Health Controller Architecture
- **Severity:** Informational
- **Locations:**
  - [`src/core/health/health.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/core/health/health.controller.ts) (`/api/v1/health`, `/ready`, `/live`)
  - [`src/modules/observability/presentation/controllers/observability.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/observability/presentation/controllers/observability.controller.ts) (`/api/v1/observability/health`, `/health/live`, `/health/ready`)
- **Analysis:**
  The backend maintains two separate sets of health and readiness probes. The aaPanel reverse proxy documentation and Kubernetes manifests should standardize on [`src/core/health/health.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/core/health/health.controller.ts) (`/api/v1/health`, `/ready`, `/live`) to avoid ambiguity.

---

## 4. Assessment of Remaining Audit Findings (SEC-AUD-03 through SEC-AUD-08)

Each remaining finding from [`docs/pre-deployment-security-audit.md`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/docs/pre-deployment-security-audit.md) was independently analyzed against current source code:

| Finding ID | Severity | Status | Category | Release Blocker? |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-AUD-03** | Medium | **Confirmed** | Insecure Direct Download & Virus Scan Bypass | **Yes** |
| **SEC-AUD-04** | Medium | **Confirmed** | Information Disclosure in Exception Filter | **Yes** |
| **SEC-AUD-05** | Medium | **Confirmed** | Sensitive Header Logging (Bearer Token Leakage) | **Yes** |
| **SEC-AUD-06** | Low | **Confirmed** (Deployment-Dependent) | PM2 In-Memory Rate Limiter Partitioning | No (Deploy 1 worker or Redis) |
| **SEC-AUD-07** | Low | **Confirmed** | Unconditional Public OpenAPI / Swagger Exposure | **Yes** |
| **SEC-AUD-08** | Low | **Confirmed** | Missing Input Validation Constraints on Attachment DTOs | No (Defense-in-depth) |

---

### 4.1 SEC-AUD-03 — Predictable Download Tokens and Unchecked Delivery of Unscanned Attachments
- **Classification:** **Confirmed**
- **Affected File & Lines:** [`src/modules/report/application/use-cases/report.service.ts:349-367`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/report/application/use-cases/report.service.ts#L349-L367)
- **Source Evidence:**
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
- **Impact:**
  1. The download token is predictable (timestamp + 8 chars of report ID) and completely unverified by any internal download router.
  2. The service ignores `attachment.virusScanStatus`. If an attachment has `virusScanStatus: 'PENDING'` (the schema default) or `virusScanStatus: 'INFECTED'`, the endpoint still generates a download URL. Patients and clinicians can download unverified or infected medical files.
- **Recommended Remediation:**
  1. Inspect `attachment.virusScanStatus`: if `attachment && attachment.virusScanStatus !== 'CLEAN'`, throw `BadRequestException('Attachment virus scan is pending or failed; download unavailable')`.
  2. Generate a cryptographically signed HMAC token or JWT (e.g. `crypto.createHmac('sha256', secret).update(...).digest('hex')`) instead of a predictable string.
- **Tests Required:** Unit tests asserting that requesting a download token for an attachment with `virusScanStatus: 'PENDING'` or `'INFECTED'` throws HTTP 400 Bad Request.
- **Approval / Infrastructure Impact:** No infrastructure changes required; code fix in `ReportService`.

---

### 4.2 SEC-AUD-04 — Information Disclosure in Global Exception Filter
- **Classification:** **Confirmed**
- **Affected File & Lines:** [`src/common/filters/global-exception.filter.ts:33-40, 51-55`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/common/filters/global-exception.filter.ts#L33-L40)
- **Source Evidence:**
  ```typescript
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = exception.message; // Leaked Prisma details
      }
    } else if (exception instanceof Error) {
      errorName = exception.name;
      message = exception.message; // Leaked raw runtime exception message
    }
  ```
- **Impact:**
  When unhandled Prisma database errors (e.g. foreign key failures, invalid column names) or unexpected JavaScript runtime exceptions occur, `exception.message` is returned directly to the HTTP client in the JSON body. In production, this reveals database schema names, SQL query structures, and internal code paths to external attackers.
- **Recommended Remediation:**
  In production (`process.env.NODE_ENV === 'production'`), mask unhandled database and runtime errors with a generic message:
  ```typescript
  const isProduction = process.env.NODE_ENV === 'production';
  const clientMessage = isProduction ? 'An unexpected internal error occurred' : exception.message;
  ```
  The full stack trace and error message continue to be written to Pino logs for internal diagnostics.
- **Tests Required:** Unit tests for `GlobalExceptionFilter` verifying that in production mode, raw Error messages and unhandled Prisma errors are masked.
- **Approval / Infrastructure Impact:** Purely code-level; zero infrastructure impact.

---

### 4.3 SEC-AUD-05 — Sensitive Header Logging (Bearer Token Leakage Risk)
- **Classification:** **Confirmed**
- **Affected File & Lines:** [`src/app.module.ts:41-46`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/app.module.ts#L41-L46)
- **Source Evidence:**
  ```typescript
  PinoLoggerModule.forRoot({
    pinoHttp: {
      transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
      level: process.env.LOG_LEVEL || 'info',
    },
  }),
  ```
- **Impact:**
  Pino HTTP logs incoming HTTP requests. Because `redact` is not configured, incoming `authorization: Bearer <JWT>` and `cookie: ...` request headers are printed in plain text to log files (`./logs/pm2-out.log`, Pino output). Anyone with read access to server logs or centralized logging can harvest active session tokens.
- **Recommended Remediation:**
  Add explicit redaction paths in `PinoLoggerModule`:
  ```typescript
  pinoHttp: {
    transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
    level: process.env.LOG_LEVEL || 'info',
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  }
  ```
- **Tests Required:** Verify that serialized log records mask `req.headers.authorization` with `[Redacted]`.
- **Approval / Infrastructure Impact:** Purely configuration change in `app.module.ts`.

---

### 4.4 SEC-AUD-06 — In-Memory Rate Limiting under Multiple PM2 Workers
- **Classification:** **Confirmed (Deployment-Dependent)**
- **Affected File & Lines:**
  - [`src/modules/auth/infrastructure/services/auth-rate-limiter.service.ts:15`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/auth/infrastructure/services/auth-rate-limiter.service.ts#L15)
  - [`ecosystem.config.js:7-8`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/ecosystem.config.js#L7-L8)
- **Source Evidence:**
  `AuthRateLimiterService` stores sliding window counters in a process-local `Map<string, ClientRecord>`.
  `ecosystem.config.js` configures PM2 with:
  ```javascript
  instances: 'max',
  exec_mode: 'cluster',
  ```
- **Impact:**
  In a multi-core PM2 cluster (e.g. 4 cores), requests are round-robined across workers. A brute-force attacker can execute 4x the configured rate limit (e.g. 40 OTP verification attempts per minute instead of 10) before exhausting counters on any single worker.
- **Recommended Remediation:**
  - *Immediate Deployment Solution:* In [`ecosystem.config.js`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/ecosystem.config.js), set `instances: 1` or `exec_mode: 'fork'` for the initial aaPanel rollout to maintain strict rate limits in memory.
  - *Scalable Production Solution:* Migrate `AuthRateLimiterService` to Redis via `ioredis` with an in-memory fallback.
- **Approval / Infrastructure Impact:** Requires Redis provisioning if multi-worker cluster is desired, or PM2 configuration adjustment to single-instance mode.

---

### 4.5 SEC-AUD-07 — Unconditional Public OpenAPI / Swagger Exposure
- **Classification:** **Confirmed**
- **Affected File & Lines:** [`src/main.ts:81-93`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/main.ts#L81-L93)
- **Source Evidence:**
  ```typescript
  const document = SwaggerModule.createDocument(app, config);
  const swaggerPath = process.env.SWAGGER_PATH || 'docs';
  SwaggerModule.setup(swaggerPath, app, document);
  ```
- **Impact:**
  Swagger documentation is initialized on all environments without checking `NODE_ENV`. Any public user who navigates to `https://<domain>/docs` can view the complete API specification, all endpoint paths, DTO schemas, and model relationships, facilitating reconnaissance.
- **Recommended Remediation:**
  Conditionally gate Swagger setup on `NODE_ENV !== 'production'` or an explicit `ENABLE_SWAGGER=true` environment variable:
  ```typescript
  if (!isProduction || process.env.ENABLE_SWAGGER === 'true') {
    const document = SwaggerModule.createDocument(app, config);
    const swaggerPath = process.env.SWAGGER_PATH || 'docs';
    SwaggerModule.setup(swaggerPath, app, document);
  }
  ```
- **Tests Required:** Verify that when `NODE_ENV=production` and `ENABLE_SWAGGER` is unset, `/docs` returns HTTP 404.
- **Approval / Infrastructure Impact:** Code change in `main.ts` + optional `.env` variable.

---

### 4.6 SEC-AUD-08 — Missing Input Validation Constraints on Attachment DTOs
- **Classification:** **Confirmed**
- **Affected File & Lines:**
  - [`src/modules/medical-record/presentation/dto/create-attachment.dto.ts:16-41`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/medical-record/presentation/dto/create-attachment.dto.ts#L16-L41)
  - [`src/modules/report/presentation/dto/upload-report.dto.ts:84-98`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/report/presentation/dto/upload-report.dto.ts#L84-L98)
- **Source Evidence:**
  - `fileSize`: Decorated with `@Min(1)`, but lacks `@Max(...)` constraint (even though the description notes "max 15MB").
  - `mimeType`: Decorated with `@IsString()`, but lacks `@IsIn(...)` whitelist or regex validation.
  - `storageUrl`: Decorated with `@IsString()`, but lacks `@IsUrl()` validation.
- **Impact:**
  Callers can supply arbitrary URLs (e.g. `javascript:...` or `data:...`), oversized integer values for file size, or unexpected MIME types (`application/x-msdownload`, `text/html`).
- **Recommended Remediation:**
  Add `@Max(15 * 1024 * 1024)` (15MB), `@IsUrl({ require_protocol: true })`, and a whitelist of accepted clinical MIME types (`@IsIn(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/dicom'])`).
- **Tests Required:** Validation pipe tests asserting HTTP 400 when invalid URLs or disallowed MIME types are provided.
- **Approval / Infrastructure Impact:** Code change in DTO classes only.

---

## 5. Independent Test Execution & Build Verification

All tests and builds were independently executed locally in the active development workspace:

### 5.1 Targeted Test Suites
```bash
npx jest src/modules/notifications/tests/
```
- **Exit Code:** 0
- **Suites:** 2 passed, 2 total
- **Tests:** 28 passed, 28 total
- **Time:** 4.14 s

```bash
npx jest src/modules/observability/tests/
```
- **Exit Code:** 0
- **Suites:** 2 passed, 2 total
- **Tests:** 34 passed, 34 total
- **Time:** 4.23 s

### 5.2 Full Test Suite
```bash
npm test
```
- **Exit Code:** 0
- **Suites:** 31 passed, 31 total
- **Tests:** 379 passed, 379 total
- **Snapshots:** 0 total
- **Time:** 14.14 s

### 5.3 Build Verification
```bash
npm run build
```
- **Exit Code:** 0
- **Command:** `nest build`
- **Output:** Clean compilation, 0 TypeScript errors.

---

## 6. Prioritized Remediation Plan

To bring CareID to a secure, production-ready state, remediations should be executed in the following prioritized order:

### Phase 1 — Release Blockers (Immediate Fix Required)
1. **Remediate Null-Recipient & Missing Caller Identity in Notification Service (Section 3.1 & 3.2):**
   - Enforce that `recipientUserId = null` notifications can only be read, modified, or deleted by `ADMIN` or `SUPER_ADMIN`.
   - Add explicit fail-closed check: `if (!callerUserId) throw new UnauthorizedException('Authentication identity required')`.
2. **Remediate Information Disclosure in Global Exception Filter (SEC-AUD-04):**
   - In [`src/common/filters/global-exception.filter.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/common/filters/global-exception.filter.ts), mask raw Prisma and runtime Error messages in production mode.
3. **Redact Sensitive Headers in Pino Logger (SEC-AUD-05):**
   - In [`src/app.module.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/app.module.ts), add `redact: ['req.headers.authorization', 'req.headers.cookie']` to Pino HTTP configuration.
4. **Enforce Virus-Scan Status on Attachment Downloads (SEC-AUD-03):**
   - In [`src/modules/report/application/use-cases/report.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/report/application/use-cases/report.service.ts), block download token generation if `virusScanStatus !== 'CLEAN'`.
5. **Gate OpenAPI Swagger Exposure (SEC-AUD-07):**
   - In [`src/main.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/main.ts), conditionally initialize Swagger only when `process.env.NODE_ENV !== 'production'` or `process.env.ENABLE_SWAGGER === 'true'`.

### Phase 2 — High Priority Hardening (Prior to Public Launch)
6. **Attachment DTO Validation Hardening (SEC-AUD-08):**
   - Add `@Max(15728640)`, `@IsUrl()`, and MIME type whitelists to `CreateAttachmentDto` and `UploadReportDto`.
7. **Rate Limiter Multi-Process Alignment (SEC-AUD-06):**
   - Set `instances: 1` in `ecosystem.config.js` for initial single-instance aaPanel deployment, or provision Redis for distributed rate limiting.
8. **Atomic Repository Ownership Enforcement (Section 3.3):**
   - Update `NotificationRepository` mutation methods to enforce `where: { id, recipientUserId: userId }` atomically.

---

## 7. Strict Boundary & Non-Modification Statement

During this independent verification pass:
- **Zero source code files were edited.**
- **Zero test files were edited.**
- **`prisma/schema.prisma` was NOT modified.**
- **Zero database migrations, push commands, resets, or destructive SQL commands were executed.**
- **Zero production or staging databases were connected to.**
- **Zero infrastructure components (aaPanel, Nginx, PM2, firewall) were accessed or modified.**
- **Zero secrets, tokens, passwords, or clinical records were disclosed or printed.**
- **The read-only reference snapshot (`hvapi-main - Copy`) was preserved completely untouched.**
- **The only file created was this report:** [`docs/security-verification-report.md`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/docs/security-verification-report.md).
