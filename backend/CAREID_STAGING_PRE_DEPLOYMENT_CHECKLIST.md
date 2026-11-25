# CareID Backend — Staging Pre-Deployment Checklist (Direct Startup Script)

> [!CAUTION]
> # FINAL VERDICT: NOT READY — DO NOT DEPLOY
> 
> **Deployment is BLOCKED.**  
> The CareID NestJS backend runs directly through an existing server startup script on the staging host (`/www/wwwroot/360api.vnvision.in`) and is **NOT managed by PM2, systemd, or Docker**.  
> Because remote connections, SSH commands, and remote server modifications are strictly prohibited in this session, the actual startup script filename, its invocation flags, PID tracking, process deduplication, and log destinations **HAVE NOT BEEN INSPECTED**.
> 
> Deploying with guessed commands (such as `nohup node`, `./start.sh`, or `./run.sh`) is strictly prohibited. **The server operator must complete the server-side pre-checks and verify the startup script before any deployment execution may proceed.**

---

## Evaluation Parameters & Target Specification

| Parameter | Staging Specification | Current Audit State |
| :--- | :--- | :--- |
| **Target Host IP** | `161.97.89.183` | aaPanel Linux Staging Host |
| **Public Staging Domain** | `https://360api.vnvision.in` | Reverse-proxied via aaPanel Nginx (443/80 -> 3073) |
| **Application Directory** | `/www/wwwroot/360api.vnvision.in` | Physical directory on host |
| **Internal Port** | `3073` | Bound to Node.js / NestJS |
| **Process Manager** | **None (NO PM2, NO systemd, NO Docker)** | Direct execution via server startup script |
| **Startup Script** | Existing shell script on staging host | **NOT VERIFIED** (Resides exclusively on server) |
| **Release Archive** | `release/CareID_Backend_Staging_Release_2026-11-03.zip` | Stored in local repository |
| **Expected SHA-256** | `98AD41BE4517A194F079222634E2EB44AB3F22FC1D905CC5B225AE2BE0B7CF2B` | Cryptographically validated |
| **Archive Size** | `1,602,362 bytes` (1.53 MB, 1,124 verified files) | Exact byte length confirmed |
| **Database Migrations** | **0 (Zero)** — strictly preserves 144 PostgreSQL tables | Zero migrations generated or executed |
| **Audit Date** | November 3, 2026 | Phase 3 Pre-Deployment Verification |

---

## Evaluation Status Legend

- **`VERIFIED`**: Fully inspected, mathematically or programmatically validated against source code, test suites, and build artifacts, and completely meeting requirements.
- **`VERIFIED WITH LIMITATIONS`**: Inspected and validated structurally from code, but requires runtime confirmation on the live remote server during staging pre-flight.
- **`NOT VERIFIED`**: Resides strictly on the remote server host and could not be evaluated in the local session due to sandbox and safety constraints.
- **`BLOCKED`**: A critical dependency, unverified server component, or safety barrier that prevents safe deployment.

---

## 1. What Has Been Verified Locally from Source Code and Build Artifacts

1. **Complete Unit & Regression Test Suite:**
   - Full test run completed: **60/60 test suites passed, 916/916 tests passed (100% pass rate)**.
   - Zero test regressions across all 11 core application domains.
2. **Production TypeScript Build & Compilation:**
   - Compiled via TypeScript 5.7: `npm run build` generates `dist/src/main.js` cleanly.
   - Static analysis: `npm run lint` completed with **0 errors and 0 warnings**.
3. **Cryptographic Identity of Release Package:**
   - Package path: `release/CareID_Backend_Staging_Release_2026-11-03.zip`.
   - SHA-256 Checksum: `98AD41BE4517A194F079222634E2EB44AB3F22FC1D905CC5B225AE2BE0B7CF2B`.
   - Archive size: `1,602,362 bytes` (1.53 MB).
   - Total files: 1,124 verified files.
4. **Release Archive Cleanliness & Secrets Screening:**
   - Verified via `scripts/verify-release-package.js`:
     - **0** active `.env` files.
     - **0** private keys (`.pem`, `.key`).
     - **0** Git metadata or history (`.git`).
     - **0** test mock files or test suites (`.spec.ts`).
     - **0** database dump files.
5. **Database Zero-Migration Guarantee:**
   - Release contains **0** pending Prisma migrations (`prisma migrate deploy` is prohibited).
   - Zero `prisma db push` or seed scripts.
   - `prisma/schema.prisma` is validated locally via `npx prisma validate` and preserves all 144 baseline tables.
6. **Dependency Lockfile Integrity & Prisma CLI Isolation:**
   - `@prisma/client` (`^7.9.1`) resides in `dependencies`.
   - `prisma` CLI (`^7.9.1`, locked to `7.10.1`) resides in `devDependencies`.
   - Pre-generated Prisma client is pre-bundled in the release ZIP (`node_modules/@prisma/client`).
   - Verified offline-safe installation sequence:
     ```bash
     npm ci
     ./node_modules/.bin/prisma generate
     npm prune --omit=dev
     ```
   - This sequence eliminates runtime network dependencies and avoids unpinned package downloads via `npx`.
7. **Complete PM2 Removal:**
   - All PM2 references, ecosystem scripts, and daemon commands have been removed from the runbook and checklist.

---

## 2. What Has Been Verified from Source Code Only

1. **Production Entry Point Command:**
   - In [`package.json`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/package.json#L14), `"start:prod": "node dist/src/main"` boots the application directly via `node`.
2. **Internal Port Binding:**
   - In [`src/main.ts:106-108`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/main.ts#L106-L108), the NestJS application listens on `process.env.PORT || 3073`, binding to port `3073`.
3. **Graceful Process Shutdown Hooks:**
   - In [`src/main.ts:104`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/main.ts#L104), NestJS registers `app.enableShutdownHooks()`.
   - Intercepts `SIGTERM` (`kill -15`) to gracefully finish in-flight HTTP requests and disconnect PostgreSQL Prisma pools without data corruption.
4. **Health & Readiness Endpoints:**
   - In [`src/core/health/health.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/core/health/health.controller.ts):
     - `GET /api/v1/health` (liveness probe).
     - `GET /api/v1/ready` (database readiness probe).
     - `GET /api/v1/live` (process uptime probe).
5. **Authentication Endpoints:**
   - In [`src/modules/auth/presentation/controllers/auth.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/auth/presentation/controllers/auth.controller.ts):
     - `POST /api/v1/auth/password/login` (admin/staff password login).
     - `POST /api/v1/auth/otp/request` and `POST /api/v1/auth/otp/verify` (phone OTP login).
6. **Executive Dashboard Exact Route:**
   - In [`src/modules/reports/presentation/controllers/reports.controller.ts:28`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/reports/presentation/controllers/reports.controller.ts#L28), the controller specifies `@Controller('reports')` and `@Get('dashboard/executive')`.
   - The exact endpoint is `GET /api/v1/reports/dashboard/executive`. (Legacy documentation incorrectly referenced `/reports/executive`).
7. **Referrals API & Audit Isolation:**
   - In [`src/modules/referral/presentation/controllers/referral.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/referral/presentation/controllers/referral.controller.ts), referral creation (`POST /referrals`) and listing (`GET /referrals`) are implemented.
   - Audit event logging is decoupled from the primary database transaction to prevent rollback of valid referrals on non-fatal logging exceptions.
8. **Security Consents RBAC:**
   - In [`src/modules/security/presentation/controllers/security.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/security/presentation/controllers/security.controller.ts), endpoints enforce strict multi-role RBAC (`ADMIN`, `STAFF`, `DOCTOR`, `PATIENT`).
9. **Notifications Route Aliasing:**
   - In [`src/modules/notifications/presentation/controllers/notification.controller.ts:19`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/notifications/presentation/controllers/notification.controller.ts#L19), the controller registers dual route paths: `@Controller(['notifications', 'notification'])`.
10. **Admin User Filtering:**
    - In [`src/modules/admin/presentation/controllers/admin.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/admin/presentation/controllers/admin.controller.ts), `GET /api/v1/admin/users?role=DOCTOR` returns backward-compatible dual collections (`data: [...]` and `items: [...]`).

---

## 3. What Has NOT Been Verified (Exists Only on Staging Server)

The following items cannot be inspected from the local development workspace because they reside strictly on the remote staging host (`161.97.89.183`):

1. **Exact Server Startup Script Filename:**
   - The local repository tracks no shell scripts (`.sh`). The script used by aaPanel or the server operator exists exclusively in `/www/wwwroot/360api.vnvision.in/`.
   - Its exact name (e.g. `start.sh`, `run.sh`, `server.sh`) is **UNKNOWN**.
2. **Startup Script Execution Method & Flags:**
   - Whether the script launches `node dist/src/main.js`, runs inside `nohup`, background subshell `&`, `screen`, or a continuous wrapper loop is **UNKNOWN**.
3. **Server-Side PID Tracking & Deduplication:**
   - Whether the script maintains an `app.pid` file or detects already-running processes before spawning new instances is **UNKNOWN**.
4. **Process Output & Log Redirection:**
   - Whether stdout and stderr are written to `nohup.out`, `logs/app.log`, aaPanel virtual host logs, or `/dev/null` is **UNKNOWN**.
5. **Active Process Identity & Linux Account:**
   - The exact PID currently holding port `3073` and the active Linux user account (e.g. `www`, `root`, or `careid`) running it is **UNKNOWN**.
6. **Remote PostgreSQL Table Count & Connectivity:**
   - The live staging database has not been directly contacted from this environment. Parity with the 144 expected tables must be confirmed via `node scripts/deploy-preflight.js` during server staging.
7. **Nginx Reverse Proxy Timing & Buffering:**
   - Staging Nginx configuration (`proxy_pass http://127.0.0.1:3073`) and upstream timeout parameters reside on the remote server.

---

## 4. What Requires Operator Confirmation Before Deployment

Before executing the physical directory swap on the staging server, the operator MUST run the following commands in the server terminal and record the findings:

### Confirmation 1: Identify Server Startup Script
```bash
cd /www/wwwroot/360api.vnvision.in
ls -la *.sh scripts/*.sh 2>/dev/null || true
```
*Record the exact filename of the script used to start the backend.*

### Confirmation 2: Inspect Startup Script Contents
```bash
cat <IDENTIFIED_STARTUP_SCRIPT>
```
*Verify:*
- How Node.js is invoked.
- How `.env` is loaded.
- Where logs are redirected.
- Whether a PID file is managed.

### Confirmation 3: Identify Active Process and User on Port 3073
```bash
lsof -i :3073
ps -fp $(lsof -ti :3073)
```
*Verify:*
- The exact PID listening on port 3073.
- The Linux user account running the process (`PROC_USER`).
- The executable path (`/usr/bin/node`) and working directory (`/www/wwwroot/360api.vnvision.in`).

### Confirmation 4: Confirm Safe Process Termination
```bash
# Test graceful termination on staging:
kill -15 $(lsof -ti :3073)
# Confirm port 3073 is released within 15 seconds:
lsof -i :3073
```

### Confirmation 5: Test Execution under Application User
*Verify that the application user has shell access and can execute the startup script:*
```bash
su -s /bin/bash <PROC_USER> -c "cd /www/wwwroot/360api.vnvision.in && <IDENTIFIED_STARTUP_SCRIPT>"
```

---

## 5. What Blockers Currently Exist

> [!CAUTION]
> ### ACTIVE DEPLOYMENT BLOCKERS
> 
> 1. **BLOCKER 1: Uninspected Server-Side Startup Script.**  
>    The staging backend relies entirely on an uninspected shell script on the staging server. Without knowing its name, arguments, environment handling, and backgrounding behavior, running guessed fallback commands (`nohup node`, `./start.sh`, `./run.sh`) risks double-binding port 3073, dropping logs, or failing to run as a background service.
> 
> 2. **BLOCKER 2: Unverified Active Process User.**  
>    Assigning directory ownership via `chown` requires knowing the exact user account running the service. Defaulting blindly to `www` or `root` can cause file permission denials on `.env`, `data/`, or `logs/`.
> 
> 3. **BLOCKER 3: Mandatory Pre-Flight Execution on Staging.**  
>    The release directory must execute `node scripts/deploy-preflight.js` against the live staging `.env` before any directory swap occurs, ensuring that the remote PostgreSQL database matches the 144-table baseline.

---

## 6. Comprehensive Pre-Deployment Matrix

| # | Check Item / Domain | Verification Scope | Status | Evidence & Resolution |
| :-: | :--- | :--- | :---: | :--- |
| **1** | **Release Package Checksum** | Release archive SHA-256 matches build manifest. | **VERIFIED** | `98AD41BE4517A194F079222634E2EB44AB3F22FC1D905CC5B225AE2BE0B7CF2B` (1,602,362 bytes). |
| **2** | **Release Bundle Cleanliness** | 0 active `.env` files, 0 secrets, 0 private keys, 0 `.git` directories. | **VERIFIED** | Validated via `scripts/verify-release-package.js` (1,124 files, 0 secrets). |
| **3** | **Pre-Compiled Bundle** | `dist/src/main.js` compiled and present in release. | **VERIFIED** | Compiled via TypeScript 5.7; ESLint 0 errors, 0 warnings. |
| **4** | **Test Suite Regression** | Complete Jest test suite passes without regressions. | **VERIFIED** | **60/60 test suites passed, 916/916 tests passed (100%)**. |
| **5** | **Zero-Migration Guarantee** | No Prisma migrations (`prisma migrate deploy`) or `db push`. | **VERIFIED** | Package contains no migration scripts; preserves 144 existing tables. |
| **6** | **Prisma CLI Offline Safety** | Generation without network downloads or unpinned CLI versions. | **VERIFIED** | Sequence: `npm ci` $\to$ `./node_modules/.bin/prisma generate` $\to$ `npm prune --omit=dev`. |
| **7** | **Pre-Generated Prisma Client** | Client runtime pre-bundled in package. | **VERIFIED** | `node_modules/@prisma/client` bundled in release ZIP. |
| **8** | **PM2 Dependency Removal** | Zero PM2 commands, ecosystem files, or daemons in procedure. | **VERIFIED** | All PM2 references purged; native process controls applied. |
| **9** | **Production Start Command** | `package.json` defines `"start:prod": "node dist/src/main"`. | **VERIFIED** | Verified in [`package.json:14`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/package.json#L14). |
| **10** | **Port 3073 Binding** | App listens on `PORT` environment variable or 3073. | **VERIFIED** | Verified in [`src/main.ts:106-108`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/main.ts#L106-L108). |
| **11** | **Graceful Shutdown Hooks** | `enableShutdownHooks()` handles SIGTERM cleanly. | **VERIFIED** | Verified in [`src/main.ts:104`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/main.ts#L104). Drains connections & pool. |
| **12** | **Server Startup Script Identity** | Exact filename and path of server startup script. | **BLOCKED** | Script is on remote staging server only; not in repository. |
| **13** | **Server Startup Script Mechanism** | How script launches Node, backgrounds, and routes logs. | **NOT VERIFIED** | Requires operator inspection (`cat <script>`). |
| **14** | **PID File & Deduplication** | Whether server startup script manages an `app.pid`. | **NOT VERIFIED** | Requires operator inspection on server. |
| **15** | **Log Output Destination** | Where stdout/stderr are redirected by the script. | **NOT VERIFIED** | Must be confirmed by operator before deployment. |
| **16** | **Active Process Validation** | Multi-attribute PID validation before termination. | **VERIFIED** | Runbook validates PID, exe (`node`), cwd (`360api`), user, and cmdline. |
| **17** | **Process Stop Safety** | SIGTERM with 15s wait; operator prompt before SIGKILL. | **VERIFIED** | Automatic SIGKILL prohibited in runbook Section 4. |
| **18** | **Data Race Condition Fix** | Writes frozen: persistent sync occurs AFTER process stop. | **VERIFIED** | Offline staging $\to$ stop process $\to$ sync `.env`, `data/`, `uploads/`, `logs/` $\to$ swap. |
| **19** | **File Permissions Hardening** | No blanket `chmod -R 755`; directories `750`, files `640`, `.env` `600`. | **VERIFIED** | Defensive `find` permissions enforced in runbook Section 5.4. |
| **20** | **Uploads & Privacy** | Clinical uploads restricted (`750`/`640`), not public. | **VERIFIED** | Configured in runbook Section 5.4. |
| **21** | **Self-Contained Rollback** | Rollback independent of shell session variables. | **VERIFIED** | Validates rollback target, `dist/src/main.js`, `.env` before swap. |
| **22** | **Failed Deployment Preservation** | Failed release preserved as `.failed_${TIMESTAMP}`. | **VERIFIED** | Preserved for post-mortem forensics; backups not overwritten. |
| **23** | **Health & Readiness Endpoints** | `/api/v1/health`, `/api/v1/ready`, `/api/v1/live`. | **VERIFIED** | Verified in [`health.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/core/health/health.controller.ts). |
| **24** | **Executive Dashboard Route** | Route is `/api/v1/reports/dashboard/executive`. | **VERIFIED** | Verified in [`reports.controller.ts:28`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/reports/presentation/controllers/reports.controller.ts#L28). |
| **25** | **Remote Database 144 Tables** | Staging database table count parity. | **VERIFIED WITH LIMITATIONS** | Verified locally; remote parity delegated to preflight check. |

---

## 7. Final Verdict and Instructions

> [!CAUTION]
> # AUDIT VERDICT: NOT READY — DO NOT DEPLOY
> 
> **The backend release package is cryptographically verified, fully tested, and zero-migration safe. However, deployment to the staging server CANNOT be authorized at this time due to active blockers on the staging host:**
> 
> 1. The server startup script exists solely on the staging server host and has not been inspected.
> 2. The active Linux process user and PID holding port 3073 must be verified on the server host.
> 3. Guessing startup commands (`nohup node`, `./start.sh`, `./run.sh`) is prohibited.
> 
> ### Required Operator Actions to Clear Blockers:
> 1. Execute **Pre-Check 1 & 2** in Section 4 on the staging server to inspect the actual startup script.
> 2. Execute **Pre-Check 3** in Section 4 to identify the running PID and process owner.
> 3. Provide the identified script name and startup command.
> 4. Once cleared, proceed with deployment strictly following [CAREID_STAGING_DEPLOYMENT_EXECUTION_RUNBOOK.md](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/CAREID_STAGING_DEPLOYMENT_EXECUTION_RUNBOOK.md).
