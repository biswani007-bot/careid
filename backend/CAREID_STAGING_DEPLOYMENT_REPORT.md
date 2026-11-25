# CareID Backend — Staging Deployment Report

**Project:** CareID / Health Vault 360 Enterprise Backend  
**Deployment Target:** aaPanel Linux Server (`/www/wwwroot/360api.vnvision.in`)  
**Staging Host IP:** `161.97.89.183`  
**Public Staging API:** `https://360api.vnvision.in`  
**Internal Application Port:** `3073` (Loopback binding behind Nginx reverse proxy)  
**Process Manager:** PM2 (`careid-backend-api` via `ecosystem.config.js`)  
**Release Candidate Archive:** `release/CareID_Backend_Staging_Release_2026-11-03.zip`  
**Archive SHA-256:** `30727AE1CDF6B2093E03143805BFFB6D20A6ECD40E6EE3D31F2A49134F478132`  
**Deployment Status:** **READY FOR OPERATOR EXTRACTION (CREDENTIAL BOUNDARY REACHED)**

---

## 1. Staging Server Status & Live Probing

Before staging deployment, independent diagnostic probes were performed against the staging target:

### 1.1 HTTP Health Endpoint Probe
- **Target URL:** `GET https://360api.vnvision.in/api/v1/health`
- **Response Code:** `HTTP 200 OK`
- **Response Headers:**
  - `Server: nginx`
  - `Content-Type: application/json; charset=utf-8`
- **Response Payload:**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-11-03T04:47:04.606Z",
    "service": "HVAPI Backend"
  }
  ```
- **Finding:** Staging reverse proxy and running backend instance are currently online and responding normally.

### 1.2 Network & SSH Port Connectivity Probe
- **Host:** `161.97.89.183`
- **Port:** `22 (SSH)`
- **TCP Connection Test:** `TcpTestSucceeded : True`
- **Authentication Probe:**
  ```powershell
  ssh -o BatchMode=yes root@161.97.89.183
  ```
- **Output:**
  ```
  Permission denied (publickey,password).
  ```

---

## 2. Deployment Access Boundary & Stoppage Rationale

### Strict Deployment Guard Compliance
In strict compliance with the user and architectural instructions:
> *"If any required permission, credential, schema approval, environment confirmation or deployment access is missing, stop at that exact step. Explain what is missing and do not bypass the restriction. Do not claim successful deployment until the application is running and the post-deployment smoke tests have passed."*

1. **Missing Element:** The local development workstation does not possess root SSH private keys, deployment tokens, or aaPanel API credentials for server `161.97.89.183`.
2. **Action Taken:** The automated deployment workflow stopped cleanly at the remote transfer gate. No insecure credential workarounds or brute-force attempts were executed.
3. **Delivery Mechanism:** The complete, verified, release-packaged archive has been compiled, scrubbed of secrets, verified, and placed at:
   `c:\Users\PABANI\Downloads\hvapi-main\hvapi-main\release\CareID_Backend_Staging_Release_2026-11-03.zip`
4. **Integrity Hash:**
   `SHA-256: 30727AE1CDF6B2093E03143805BFFB6D20A6ECD40E6EE3D31F2A49134F478132`

---

## 3. Step-by-Step aaPanel Operator Deployment Guide

To deploy this verified release candidate to the staging server via aaPanel, follow the standard procedure below:

### Step 1: Backup Existing Deployment
On the server (via aaPanel Terminal or SSH):
```bash
cd /www/wwwroot/360api.vnvision.in

# Create timestamped backup of current running release and logs
tar -czvf /www/backup/360api_backup_$(date +%Y%m%d_%H%M%S).tar.gz dist/ package.json
```

### Step 2: Upload & Extract Release Candidate Archive
1. In aaPanel web interface, navigate to **Files** -> `/www/wwwroot/360api.vnvision.in`.
2. Upload `CareID_Backend_Staging_Release_2026-11-03.zip` to the directory.
3. Extract the archive into `/www/wwwroot/360api.vnvision.in`, replacing existing `./dist` and configuration files.

Alternatively, via SCP/SSH:
```bash
scp release/CareID_Backend_Staging_Release_2026-11-03.zip root@161.97.89.183:/www/wwwroot/360api.vnvision.in/
ssh root@161.97.89.183
cd /www/wwwroot/360api.vnvision.in
unzip -o CareID_Backend_Staging_Release_2026-11-03.zip
```

### Step 3: Install Production Dependencies & Generate Prisma Client
Run in the project directory:
```bash
# 1. Install production dependencies without rebuilding dev tools
npm ci --omit=dev

# 2. Re-generate Prisma Client from the verified schema
npx prisma generate
```

### Step 4: Environment File Verification
Confirm the existing `.env` file is preserved and configured correctly:
```bash
# Verify .env exists and is readable only by the application user
ls -la .env
chmod 600 .env

# Verify mandatory settings in .env:
# NODE_ENV=production
# APP_ENV=staging
# PORT=3073
# HOST=127.0.0.1
# TRUST_PROXY=loopback
```
*(If setting up a fresh environment, copy `.env.staging.example` to `.env` and supply the staging database credentials and JWT secret).*

### Step 5: Reload Application via PM2
Reload the application with zero-downtime cluster reload:
```bash
# Reload application process using the bundled ecosystem configuration
pm2 reload ecosystem.config.js --update-env

# Or restart specifically:
pm2 restart careid-backend-api

# Save PM2 process list
pm2 save
```

### Step 6: Verify PM2 Status and Logs
```bash
# Check PM2 process list
pm2 status

# Inspect recent logs for clean startup
pm2 logs careid-backend-api --lines 50 --nostream
```
Expected log output:
```
[Nest] ... LOG [NestApplication] Nest application successfully started
[Nest] ... LOG [HVAPI] Server listening on http://127.0.0.1:3073/api/v1
```

---

## 4. Post-Deployment Verification & Smoke Tests

Once reloaded on the server, execute the bundled verification scripts:

### 1. Basic Health Check
```bash
curl -i http://127.0.0.1:3073/api/v1/health
```
Expected: `HTTP 200 OK` with JSON `{"status":"ok", ...}`.

### 2. External HTTPS Ingress Check
```bash
curl -i https://360api.vnvision.in/api/v1/health
```
Expected: `HTTP 200 OK` via Nginx reverse proxy.

### 3. Server Healthcheck Script
```bash
node scripts/server-healthcheck.js
```
Expected: Verifies database connectivity, migrations, and endpoint availability.

### 4. Swagger Documentation Verification
Visit `https://360api.vnvision.in/api/v1/docs` in a browser to confirm Swagger UI loads all endpoints (including new Support, Pet, Financing, OCR, Security, and Referral endpoints).

---

## 5. Rollback Procedure

If an unexpected issue arises post-deployment:
```bash
cd /www/wwwroot/360api.vnvision.in

# Restore from prior backup archive
tar -xzvf /www/backup/360api_backup_<TIMESTAMP>.tar.gz

# Reload PM2
pm2 reload ecosystem.config.js
```
