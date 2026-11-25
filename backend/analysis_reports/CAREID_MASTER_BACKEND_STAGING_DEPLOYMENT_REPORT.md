# CAREID MASTER BACKEND STAGING DEPLOYMENT REPORT & RUNBOOK
**Project:** CareID Healthcare Ecosystem (Backend API)  
**Date:** November 18, 2026  
**Environment:** Staging Target (`https://360api.vnvision.in/api/v1`)  
**Target Package:** `CareID_Master_Backend_Production_Ready_Deployment_2026-11-18.zip`  
**Package SHA-256:** `c5ec528941e6b693e26ec96026f9d181fcac9896bae4d562f82f56d48596fad2`  
**Package Size:** `2,373,004 bytes (2.26 MB)`  
**Author:** Principal Software Architect, Senior Backend Engineer, Healthcare Systems Specialist  

---

## 1. DEPLOYMENT OVERVIEW & ENVIRONMENT TOPOLOGY

This report specifies the definitive deployment procedure for deploying the Phase 12 CareID Backend Master Engineering Candidate to the staging server.

### Environment Specification
- **Staging URL:** `https://360api.vnvision.in/api/v1`
- **Host Server:** `root@vmi2673411`
- **Application Directory:** `/www/wwwroot/360api.vnvision.in`
- **Process Manager:** PM2
- **PM2 Process Name:** `hvapi` (listening on port `3073`)
- **Runtime Environment:** Node.js v20+ / NestJS
- **Database:** PostgreSQL 16 (`hvapi_db` on `127.0.0.1:5432`)
- **Prisma Migrations:** 7 applied migrations (baseline synchronized)

---

## 2. DEPLOYMENT ARTIFACT VERIFICATION

Before applying updates to the staging server, verify that the archive checksum matches the authoritative build:

```bash
sha256sum CareID_Master_Backend_Production_Ready_Deployment_2026-11-18.zip
# Authoritative SHA-256:
# c5ec528941e6b693e26ec96026f9d181fcac9896bae4d562f82f56d48596fad2
```

### Archive Contents Summary
- Complete pre-compiled NestJS application (`dist/`)
- All 7 authoritative Prisma database migrations (`prisma/migrations/`)
- Authoritative Prisma schema (`prisma/schema.prisma`)
- Production runtime manifests (`package.json`, `package-lock.json`)
- Clean deployment manifest (`DEPLOYMENT_MANIFEST.json`)

---

## 3. STEP-BY-STEP STAGING DEPLOYMENT RUNBOOK

### Step 1: Pre-Deployment Backup
Connect to the staging server and snapshot the active running deployment:

```bash
ssh root@vmi2673411
cd /www/wwwroot/360api.vnvision.in

# Create timestamped rollback backup of current build
BACKUP_DIR="/www/backup/hvapi_pre_master_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r dist prisma package.json "$BACKUP_DIR/"
echo "Backup created at: $BACKUP_DIR"
```

### Step 2: Upload & Extract Master Release Package
Transfer the archive to `/www/wwwroot/360api.vnvision.in` and verify integrity:

```bash
cd /www/wwwroot/360api.vnvision.in

# Verify SHA256 checksum
echo "c5ec528941e6b693e26ec96026f9d181fcac9896bae4d562f82f56d48596fad2  CareID_Master_Backend_Production_Ready_Deployment_2026-11-18.zip" | sha256sum -c -

# Unzip archive overwriting dist and updated prisma assets
unzip -o CareID_Master_Backend_Production_Ready_Deployment_2026-11-18.zip
```

### Step 3: Verify Dependencies & Prisma Client
Ensure production dependencies and Prisma client are up to date:

```bash
# 1. Ensure production dependencies are aligned
npm ci --omit=dev

# 2. Deploy any pending database migrations
npx prisma migrate deploy

# 3. Regenerate Prisma Client against current schema
npx prisma generate
```

### Step 4: Graceful Application Restart via PM2
Reload the `hvapi` process with zero-downtime cluster reload:

```bash
# Graceful reload preserving existing environment variables
pm2 reload hvapi --update-env

# Verify process status
pm2 status hvapi
```

Expected PM2 status output:
```text
┌────┬─────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name    │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼─────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0  │ hvapi   │ default     │ 1.0.0   │ fork    │ [PID]    │ 0s     │ 0    │ online    │ 0%       │ 85.0mb   │ root     │ disabled │
└────┴─────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

---

## 4. POST-DEPLOYMENT SMOKE TESTS & ACCEPTANCE VERIFICATION

Run the following verification cURLs against the staging environment:

### 4.1. Health Check
```bash
curl -i -X GET https://360api.vnvision.in/api/v1/health
```
**Expected Response:** `HTTP/1.1 200 OK` (`{"status":"ok",...}`)

### 4.2. Admin Authentication & Lucas Vance Profile Verification (Workstream E)
```bash
# 1. Obtain Admin JWT token
ADMIN_TOKEN=$(curl -s -X POST https://360api.vnvision.in/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@careid.test","password":"Admin@123"}' | jq -r '.accessToken')

# 2. Query Lucas Vance Patient Profile (Previously returned 500 RangeError)
curl -i -X GET "https://360api.vnvision.in/api/v1/admin/patients/9a4ad630-de90-40e9-b4cd-1d76f8f63069" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Expected Response:** `HTTP/1.1 200 OK` (Valid profile JSON, timestamps properly serialized or null without RangeError).

### 4.3. Platform Security Settings Baseline Reset (Workstream D)
```bash
curl -i -X POST "https://360api.vnvision.in/api/v1/admin/settings/reset?category=SECURITY" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Expected Response:** `HTTP/1.1 200 OK` (Array of all 19 baseline security settings returned).

### 4.4. Surgical Readiness Validation (Workstream B)
```bash
# 1. Obtain Doctor JWT token
DOCTOR_TOKEN=$(curl -s -X POST https://360api.vnvision.in/api/v1/auth/password/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","password":"DoctorPassword123!"}' | jq -r '.accessToken')

# 2. Attempt GO decision with unconfirmed items (Must reject with 400)
curl -i -X PATCH "https://360api.vnvision.in/api/v1/appointments/test-appointment-id/readiness" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "checklist": {"labWorkConfirmed": false, "consentSigned": true, "fastingCompliant": true, "anesthesiaCleared": true, "imagingUploaded": true},
    "decision": "GO"
  }'
```
**Expected Response:** `HTTP/1.1 400 Bad Request` (`"Cannot set readiness decision to 'GO' when checklist items are unconfirmed"`).

---

## 5. ROLLBACK PROCEDURE

If any critical anomaly is detected post-deployment, execute the immediate rollback:

```bash
cd /www/wwwroot/360api.vnvision.in

# Restore backed-up dist directory
cp -r /www/backup/hvapi_pre_master_[TIMESTAMP]/dist ./

# Regenerate Prisma client if schema was altered
npx prisma generate

# Restart PM2 process
pm2 reload hvapi --update-env
```

---

## 6. RELEASE AUTHORIZATION

- **Engineering Lead Sign-Off:** Principal Software Architect
- **Package Integrity:** Confirmed (SHA-256 match)
- **Deployment Status:** **READY FOR EXECUTION BY SYSTEM OPERATOR**
