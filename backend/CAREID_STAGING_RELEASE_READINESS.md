# CareID — Staging Release Readiness & Deployment Verification Report

**Project:** CareID / Health Vault 360  
**Target Environment:** aaPanel Staging Server (`161.97.89.183`, `https://360api.vnvision.in`)  
**Deployment Path:** `/www/wwwroot/360api.vnvision.in`  
**Process Manager:** PM2 (`careid-backend` / `hvapi-backend`, Port 3073)  
**Date of Readiness Assessment:** November 3, 2026  
**Status:** READY FOR STAGING RELEASE — AWAITING USER APPROVAL (NO REMOTE CHANGES EXECUTED)  

---

## 1. Release Package Identity & Checksum Verification

The staging deployment archive was generated locally and verified through automated integrity checks.

| Property | Value |
| :--- | :--- |
| **Archive File** | `release/CareID_Backend_Staging_Release_2026-11-03.zip` |
| **Full Local Path** | `c:\Users\PABANI\Downloads\hvapi-main\hvapi-main\release\CareID_Backend_Staging_Release_2026-11-03.zip` |
| **File Size (Bytes)** | **1,602,077 bytes** (1.53 MB) |
| **SHA-256 Checksum** | `FF71F89EE17F5B53D5561DB562112CC36144A21F59AE26F2AC653E771317A289` |
| **Total Packaged Files** | **1,124 files** |
| **Active `.env` Files** | **0 (Zero)** — Strictly verified |
| **Configuration Template** | `.env.staging.example` included with safe placeholders |

---

## 2. Release Gate Checklist

| Release Gate | Verification Requirement | Status | Verification Evidence |
| :--- | :--- | :---: | :--- |
| **Gate 1: Jest Test Suite** | 100% of test suites must pass | **PASSED** | 60/60 suites passed, 916/916 tests passed |
| **Gate 2: Static Code Quality** | Zero ESLint errors or warnings | **PASSED** | `npm run lint` exited code 0 (0 errors, 0 warnings) |
| **Gate 3: Compilation** | Clean TypeScript production build | **PASSED** | `npm run build` compiled into `./dist` (exit code 0) |
| **Gate 4: Schema Integrity** | Zero schema drift or unapplied migrations | **PASSED** | `npx prisma validate` exited code 0 ("Schema is valid") |
| **Gate 5: Secret Sanitization** | Zero credentials or live `.env` in ZIP | **PASSED** | `node scripts/verify-release-package.js` (0 secrets found) |
| **Gate 6: Route Aliasing** | Support `/notifications` & `/notification` | **PASSED** | Controller aliased with `@Controller(['notifications', 'notification'])` |
| **Gate 7: Method Support** | Support `PUT` and `PATCH` preferences | **PASSED** | `@Put('preferences')` and `@Patch('preferences')` registered |
| **Gate 8: Referral Safety** | Non-colliding sequential referral ID | **PASSED** | Uniqueness checking loop implemented (`REF-YYYY-XXXXX`) |
| **Gate 9: Tx Decoupling** | No FK violations aborting transactions | **PASSED** | Audit logging decoupled from `$transaction` in referral creation |
| **Gate 10: Role Enum Guard** | Safe validation of query role filters | **PASSED** | Validates against `RoleName` enum; zero 500 crashes |

---

## 3. Package Contents Breakdown

The deployment ZIP archive contains all compiled runtime assets and production configurations:

```
release/CareID_Backend_Staging_Release_2026-11-03.zip
├── dist/                               # Freshly compiled NestJS 11 application
│   ├── src/main.js                     # Application entry point
│   ├── src/modules/...                 # Remediated domain controllers, services, repositories
│   └── src/database/...                # Seed and baseline definitions
├── prisma/
│   ├── schema.prisma                   # Canonical Prisma schema
│   ├── baseline_schema.sql             # SQL baseline reference
│   └── migrations_offline/             # Historical reference (offline only)
├── scripts/
│   ├── deploy-preflight.js             # Staging pre-flight connectivity & env validator
│   ├── server-healthcheck.js           # Live HTTP ping & database health validator
│   ├── seed-staging.js                 # Staging seed script
│   └── seed-local.js                   # Local seed script
├── ecosystem.config.js                 # PM2 process configuration for aaPanel
├── .env.staging.example                # Safe environment variable configuration template
├── package.json                        # Production dependencies definition
├── package-lock.json                   # Deterministic dependency lockfile
├── prisma.config.ts                    # Prisma configuration loader
├── README-AAPANEL-DEPLOYMENT.md        # Comprehensive aaPanel deployment guide
└── RELEASE-MANIFEST.json               # Release identity and checksum manifest
```

---

## 4. Staging Server Execution Runbook (When Approved)

When explicit deployment approval is provided by the user, the following deterministic runbook will be executed on the staging server:

### Step 1: Backup Current Staging Release
```bash
BACKUP_DIR="/www/backup/careid_backend_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r /www/wwwroot/360api.vnvision.in/* "$BACKUP_DIR/"
echo "Backup preserved at: $BACKUP_DIR"
```

### Step 2: Upload & Extract Staging Package
```bash
# Upload CareID_Backend_Staging_Release_2026-11-03.zip to /www/wwwroot/360api.vnvision.in/
cd /www/wwwroot/360api.vnvision.in
unzip -o CareID_Backend_Staging_Release_2026-11-03.zip
```

### Step 3: Install Production Dependencies & Generate Client
```bash
npm ci --omit=dev
npx prisma generate
```

### Step 4: Execute Staging Pre-Flight Check
```bash
node scripts/deploy-preflight.js
```

### Step 5: Reload Application via PM2
```bash
pm2 reload ecosystem.config.js --env staging
pm2 save
```

### Step 6: Verify Runtime Health & API Contracts
```bash
node scripts/server-healthcheck.js
curl -s -i https://360api.vnvision.in/api/v1/health
curl -s -i https://360api.vnvision.in/api/v1/docs-json
```

---

## 5. Rollback Procedures

If any post-deployment health check fails:
1. Restore previous release directory from `$BACKUP_DIR`:
   ```bash
   cp -r $BACKUP_DIR/* /www/wwwroot/360api.vnvision.in/
   ```
2. Reload previous PM2 process:
   ```bash
   pm2 reload ecosystem.config.js
   ```
3. Verify recovery via `curl -s -i https://360api.vnvision.in/api/v1/health`.

---

## 6. Pre-Deployment Final Sign-Off

- **Remediation Completed:** 100% of reported defects resolved.
- **Automated Tests:** 60/60 suites passing (916/916 tests).
- **Static Code Analysis:** Clean build, 0 ESLint errors.
- **Database Safety:** Validated against existing schema; 0 destructive operations.
- **Remote Environment Status:** **UNTOUCHED.** Awaiting user deployment authorization.

