# CAREID MASTER BACKEND — FINAL STAGING DEPLOYMENT RUNBOOK

**Document ID:** CRID-DOC-REM-10  
**Target Host:** `vmi2673411` (Ubuntu / aaPanel)  
**Target Root:** `/www/wwwroot/360api.vnvision.in`  
**Internal Port:** `3073` (Bound to `127.0.0.1`, Reverse-Proxied via Nginx)  
**External API Base:** `https://360api.vnvision.in/api/v1`  
**Package Archive:** `CareID_Master_Backend_Staging_Candidate_2026-11-18_R2.zip`  
**Target SHA-256:** `84cf9b4c2500eb91ae256e444d60ff6b889713538641966026e088918e369707`  

---

## 1. Pre-Deployment Operator Checklist

Before commencing deployment on the staging server:
- [ ] Ensure terminal session is open on `vmi2673411` as root or deployment user.
- [ ] Confirm PostgreSQL service is active: `systemctl status postgresql`.
- [ ] Confirm PM2 is running: `pm2 status`.
- [ ] Confirm Nginx reverse proxy is active: `systemctl status nginx`.
- [ ] Verify that current release candidate zip is uploaded to `/www/wwwroot/360api.vnvision.in`.

---

## 2. Step-by-Step Deployment Instructions

### Step 1: Navigate to Deployment Directory & Verify Package Checksum
```bash
cd /www/wwwroot/360api.vnvision.in

# Verify SHA-256 matches exactly:
sha256sum CareID_Master_Backend_Staging_Candidate_2026-11-18_R2.zip
# EXPECTED OUTPUT:
# 84cf9b4c2500eb91ae256e444d60ff6b889713538641966026e088918e369707  CareID_Master_Backend_Staging_Candidate_2026-11-18_R2.zip
```
> [!CAUTION]
> If the checksum does not match `84cf9b4c2500eb91ae256e444d60ff6b889713538641966026e088918e369707`, DO NOT proceed. Re-transfer the package.

### Step 2: Backup Active Deployment Runtime & Database
```bash
# Create timestamped backup directory
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p /www/backup/careid_backend
tar -czf /www/backup/careid_backend/pre_deploy_backup_${TIMESTAMP}.tar.gz dist prisma ecosystem.config.js package.json .env

# PostgreSQL logical schema and data dump
pg_dump -U postgres -d hvapi_db -F c -b -v -f /www/backup/careid_backend/hvapi_db_${TIMESTAMP}.dump
```

### Step 3: Extract Package Archive Over Existing Directory
```bash
# Unzip candidate files (preserves existing .env file)
unzip -o CareID_Master_Backend_Staging_Candidate_2026-11-18_R2.zip
```

### Step 4: Install Dependencies Deterministically
```bash
# Run npm ci to install pinned dependencies, including local prisma CLI
npm ci
```

### Step 5: Regenerate Prisma Client
```bash
npx prisma generate
```

### Step 6: Verify Database Migrations (Zero New Migrations)
```bash
# Check status (should confirm 7 migrations already applied, database up to date)
npx prisma migrate status
```
> [!NOTE]
> All 7 migrations were successfully applied during prior deployment. No new SQL migrations are needed for R2 because hold durability uses the existing `generated_slots.status_reason` column.

### Step 7: Verify Environment Configuration
Ensure `/www/wwwroot/360api.vnvision.in/.env` contains the required staging configuration:
```ini
NODE_ENV=production
APP_ENV=staging
DEPLOYMENT_ENV=staging
PORT=3073
HOST=127.0.0.1
DATABASE_URL="postgresql://postgres:<PASSWORD>@127.0.0.1:5432/hvapi_db?schema=public"
JWT_SECRET="<SECURE_STAGING_JWT_SECRET>"
QR_SIGNING_KEY="<SECURE_STAGING_QR_KEY>"
ENABLE_TEST_OTP=true
TEST_PHONE_NUMBERS="+16505550001,+16505550002,+16505550003,+16505550004,+16505550005"
```

### Step 8: Run Preflight Check
```bash
node scripts/deploy-preflight.js
```
Confirm all checks report `[OK]`.

### Step 9: Reload PM2 Application Process
```bash
# Check existing running process name in PM2
pm2 status

# Reload using the matching process name or ecosystem config:
pm2 reload ecosystem.config.js || pm2 reload careid-backend-api || pm2 reload hvapi
```

### Step 10: Validate Healthcheck & API Acceptance
```bash
# Execute local healthcheck
node scripts/server-healthcheck.js

# Verify external endpoint over HTTPS:
curl -I https://360api.vnvision.in/api/v1/health
# EXPECTED: HTTP/1.1 200 OK
```

---

## 3. Rollback Procedure

If any fatal error occurs during reload or healthcheck:
```bash
# 1. Restore previous runtime files
tar -xzf /www/backup/careid_backend/pre_deploy_backup_${TIMESTAMP}.tar.gz -C /www/wwwroot/360api.vnvision.in/

# 2. Re-run prisma generate for restored code
npx prisma generate

# 3. Reload PM2
pm2 reload ecosystem.config.js || pm2 reload careid-backend-api || pm2 reload hvapi

# 4. Verify health
node scripts/server-healthcheck.js
```

---
**Runbook Approved By:** Lead DevOps Release Engineer  
**Date:** November 18, 2026
