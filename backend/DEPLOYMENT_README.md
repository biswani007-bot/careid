# CareID Enterprise Backend — Production Deployment Guide & Runbook

**Release Package:** `CAREID_BACKEND_DEPLOYMENT_2026-11-12.zip`  
**Application Name:** CareID / Health Vault 360 Backend API  
**Target Environment:** aaPanel Linux (Ubuntu 22.04/24.04 LTS, Debian 12, Rocky Linux 9)  
**Production Host Path:** `/www/wwwroot/360api.vnvision.in`  
**Public API URL:** `https://360api.vnvision.in/api/v1`  
**Internal Runtime Binding:** `127.0.0.1:3073` (Reverse-proxied via Nginx)

---

## 1. Package Contents

The deployment package contains the production-compiled backend and runtime assets:
```text
CAREID_BACKEND_DEPLOYMENT_2026-11-12/
├── dist/                          # Production compiled NestJS application (clean of maps/specs)
│   └── src/
│       └── main.js                # Application entry point
├── prisma/
│   ├── schema.prisma              # Authoritative Prisma schema
│   ├── baseline_schema.sql        # Baseline PostgreSQL DDL reference
│   └── migrations/                # Historical migration definitions
├── scripts/
│   ├── deploy-preflight.js        # Automated pre-deployment validation script
│   ├── server-healthcheck.js      # Post-deployment HTTP health diagnostic
│   └── seed-staging.js            # Staging environment seed script
├── .env.example                   # Sanitized configuration reference template
├── .env.staging.example           # Sanitized aaPanel staging configuration template
├── ecosystem.config.js            # aaPanel PM2 process manager configuration
├── ecosystem.staging.config.js    # Staging PM2 configuration
├── package.json                   # Production dependency manifest
├── package-lock.json              # Deterministic dependency lockfile
├── prisma.config.ts               # Prisma runtime driver adapter config
├── tsconfig.json                  # TypeScript runtime configuration
├── DEPLOYMENT_MANIFEST.json       # Production release manifest
├── CareID-Staging.postman_collection.json # Complete Postman collection with 8 security audit tests
└── DEPLOYMENT_README.md           # This document
```

---

## 2. Server Prerequisites

Ensure the following runtimes and packages are present on the aaPanel Linux host:
- **Operating System:** Linux (Ubuntu 22.04/24.04 LTS, Debian 12, or AlmaLinux 9)
- **Node.js Engine:** Node.js v20.x, v22.x, or v24.x LTS (`node -v`)
- **Package Manager:** npm v10.x or v11.x (`npm -v`)
- **Process Manager:** PM2 (managed via aaPanel Node.js Version Manager or global npm: `npm i -g pm2`)
- **Database Engine:** PostgreSQL 16 or 18 (`360api` database on port 5432)
- **Reverse Proxy:** Nginx 1.22+ configured with SSL terminating to loopback `127.0.0.1:3073`

---

## 3. Database Schema & Migration Decision

### **VERDICT: NO DATABASE MIGRATION REQUIRED**

- All required database models (`security_platform_audit_logs`, `audit_logs`, `security_consent_records`, `patient_referrals`) already exist in the database with matching column definitions and composite indexes.
- **Do NOT execute `prisma migrate deploy` against the production database.** The production database was provisioned without the `_prisma_migrations` tracking table. Running `prisma migrate deploy` will cause schema conflicts.
- **Pre-deployment Verification Query (Optional Read-Only Check):**
  ```sql
  SELECT column_name, data_type, is_nullable, column_default 
  FROM information_schema.columns 
  WHERE table_name = 'security_platform_audit_logs'
  ORDER BY ordinal_position;
  ```
  Expected columns: `id`, `user_id`, `action`, `resource`, `resource_id`, `ip_address`, `user_agent`, `result`, `details`, `created_at`.

---

## 4. Step-by-Step Production Deployment Procedure

### Step 4.1 — Create Backup of Current Deployment
Before applying the new release, snapshot the existing production directory:
```bash
cd /www/wwwroot
tar -czvf /www/backup_360api_$(date +%Y%m%d_%H%M%S).tar.gz 360api.vnvision.in/
```

### Step 4.2 — Extract Release Package
Upload `CAREID_BACKEND_DEPLOYMENT_2026-11-11.zip` to the server and extract it into the application root:
```bash
cd /www/wwwroot/360api.vnvision.in
unzip -o CAREID_BACKEND_DEPLOYMENT_2026-11-11.zip
```
Ensure that the existing `.env` file is **preserved and NOT overwritten**.

### Step 4.3 — Install Dependencies & Generate Prisma Client
Install production dependencies and re-generate the Prisma Client:
```bash
cd /www/wwwroot/360api.vnvision.in
npm ci --omit=dev
npx prisma generate
```

### Step 4.4 — Execute Preflight Verification
Verify that the configuration and database connection are operational:
```bash
node scripts/deploy-preflight.js
```
Expected output: All preflight checks return `[PASS]`.

### Step 4.5 — Production Startup & Process Reload
Depending on how the production server manages processes, execute the corresponding command:

- **Option A: Managed via PM2 (Standard aaPanel CLI / CLI Deployment):**
  ```bash
  pm2 reload ecosystem.config.js --update-env
  # Or if starting cleanly:
  pm2 start ecosystem.config.js
  pm2 save
  pm2 status careid-backend-api
  pm2 logs careid-backend-api --lines 50
  ```

- **Option B: Managed via aaPanel Node.js Project Manager (Web GUI):**
  1. Open aaPanel Dashboard -> Website -> Node.js Project.
  2. Locate project `360api.vnvision.in`.
  3. Ensure Run Opt is set to `start:prod` (`node dist/src/main.js`).
  4. Click `Restart` to load the newly unpacked `dist/`.

- **Option C: Managed via systemd service or Direct Node CLI:**
  ```bash
  # If managed by systemd:
  systemctl restart 360api
  # If managed by direct background process:
  npm run start:prod
  ```

Expected log output across all managers:
```text
CareID API is running on http://127.0.0.1:3073/api/v1 (production)
```

---

## 5. Post-Deployment Verification Checklist

Execute the following post-deployment tests:

### 1. HTTP Health Readiness Check
```bash
curl -I -s http://127.0.0.1:3073/api/v1/health
curl -I -s https://360api.vnvision.in/api/v1/health
```
**Expected Result:** HTTP `200 OK` with JSON `{"status":"ok","database":"healthy"}`.

### 2. Doctor Security Audit API Access
Execute `GET /api/v1/security/audit` with an authenticated Doctor Bearer token:
```bash
curl -s -H "Authorization: Bearer <DOCTOR_JWT_TOKEN>" https://360api.vnvision.in/api/v1/security/audit
```
**Expected Result:**
- HTTP `200 OK` (Previously returned HTTP `403 Forbidden`).
- Array of audit event objects containing only records where `userId` equals the authenticated doctor's `User.id`.
- Zero credentials, passwords, hashes, session tokens, or cookies in the response.

### 3. IDOR Tampering Prevention Test
Execute `GET /api/v1/security/audit?userId=<OTHER_USER_ID>` with the same Doctor Bearer token:
```bash
curl -i -s -H "Authorization: Bearer <DOCTOR_JWT_TOKEN>" "https://360api.vnvision.in/api/v1/security/audit?userId=<OTHER_USER_ID>"
```
**Expected Result:**
- HTTP `403 Forbidden`.
- Cross-user audit log inspection is strictly rejected with zero database execution and zero information leakage.

### 4. Admin & Super Admin Platform Visibility Test
Execute `GET /api/v1/security/audit` with an Admin or Super Admin Bearer token:
```bash
curl -s -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" https://360api.vnvision.in/api/v1/security/audit
```
**Expected Result:** HTTP `200 OK` with platform-wide audit logs.

### 5. Unauthorized Role Rejection Test
Execute `GET /api/v1/security/audit` with a Patient Bearer token:
```bash
curl -s -H "Authorization: Bearer <PATIENT_JWT_TOKEN>" https://360api.vnvision.in/api/v1/security/audit
```
**Expected Result:** HTTP `403 Forbidden`.

---

## 6. Rollback Procedure

If any critical issue or unexpected regression occurs after deployment:

1. **Stop the Running Process:**
   - If PM2: `pm2 stop careid-backend-api`
   - If aaPanel GUI: Click `Stop` in Node.js Project Manager
   - If systemd: `systemctl stop 360api`

2. **Restore Prior Backup Archive:**
   ```bash
   cd /www/wwwroot
   tar -xzvf 360api_backup_<TIMESTAMP>.tar.gz
   cd 360api.vnvision.in
   npm ci --omit=dev
   npx prisma generate
   ```

3. **Restart Service:**
   - If PM2: `pm2 reload ecosystem.config.js`
   - If aaPanel GUI: Click `Start` in Node.js Project Manager
   - If systemd: `systemctl start 360api`
   ```
2. **Restore Previous Application Snapshot:**
   ```bash
   cd /www/wwwroot
   mv 360api.vnvision.in 360api.vnvision.in_failed_$(date +%Y%m%d_%H%M%S)
   tar -xzvf /www/backup_360api_<TIMESTAMP>.tar.gz
   ```
3. **Restart the Restored Process:**
   ```bash
   cd /www/wwwroot/360api.vnvision.in
   pm2 start ecosystem.config.js
   pm2 save
   ```
4. **Confirm Restored Health:**
   ```bash
   curl -I https://360api.vnvision.in/api/v1/health
   ```
   *Note: Because no database migrations were applied, no database rollback DDL is needed.*

---

## 7. Troubleshooting Guide

| Issue | Likely Cause | Resolution |
| :--- | :--- | :--- |
| **Port 3073 in use** | Zombie Node process | Identify PID with `lsof -i :3073` and kill cleanly with `kill -15 <PID>`. |
| **Prisma P2022 / P2021** | Database schema mismatch | Verify that PostgreSQL is running and check connection URL in `.env`. |
| **HTTP 502 Bad Gateway** | Node process down | Check `pm2 logs careid-backend-api` and verify `127.0.0.1:3073` is listening. |
| **HTTP 401 Unauthorized** | Expired / invalid JWT | Re-authenticate on the web portal to acquire a fresh Bearer token. |
| **CORS Rejected** | Origin not in allowlist | Check `CORS_ALLOWED_ORIGINS` in `.env` to ensure `https://careiddoctor.vnvision.in` is listed. |

