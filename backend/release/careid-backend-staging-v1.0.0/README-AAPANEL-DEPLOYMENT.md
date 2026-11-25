# CareID Enterprise Backend — aaPanel Staging Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying and upgrading the verified **CareID NestJS + Prisma + PostgreSQL** backend on an aaPanel Linux server environment.

The deployment package is configured for a dedicated **STAGING / TESTING** environment supporting:
- **Dual Authentication Architecture:**
  - **Admin Password Authentication (`POST /api/v1/auth/password/login`):** Required documented authentication endpoint for CareID Admin Portal and Super Admin accounts. Accepts `{ "identifier": "...", "password": "..." }`, supporting email (`superadmin@careid.test`), username (`superadmin`), or phone (`+16505550001`). Returns genuine JWT tokens, user profile, and assigned role.
  - **Admin Login Alias (`POST /api/v1/auth/admin/login`):** Fully operational legacy endpoint preserved for backwards-compatibility.
  - **Phone OTP Authentication (`POST /api/v1/auth/otp/request` & `verify`):** Standard phone OTP flow preserved for all 7 platform roles (`SUPER_ADMIN`, `ADMIN`, `DOCTOR`, `PATIENT`, `FACILITY_ADMIN`, `STAFF`, `FAMILY_MEMBER`).
- Fixed server-side test OTP (`123456`) restricted exclusively to allowlisted test phone numbers on staging.
- Automated preflight (`npm run preflight`) and health-check (`npm run healthcheck`) diagnostic scripts.
- Secure production compilation (`dist/`) running under PM2 with Nginx reverse proxy and SSL on port `3073`.
- Additive database migration system for zero-data-loss database schema updates.

---

## 1. Prerequisites on aaPanel Server

Ensure the following components are installed via aaPanel App Store or system package manager:
- **Operating System:** Linux (Ubuntu 22.04/24.04 LTS, Debian 12, Rocky Linux 9, or AlmaLinux 9)
- **aaPanel Version:** 6.8 or newer
- **Node.js Version Manager:** Install **Node.js v20.x or v22.x LTS**
- **Process Manager:** PM2 (available in aaPanel Node Version Manager or via `npm install -g pm2`)
- **Web Server:** Nginx 1.22+
- **Database:** PostgreSQL 15 or 16
- **Utility Tools:** `jq` (optional, for JSON parsing in test scripts: `apt install -y jq` or `dnf install -y jq`)

---

## 2. Step-by-Step Deployment Instructions

### Step 2.1 — Upload and Extract Application Package

1. Log into your aaPanel web interface (`http://your-server-ip:8888`).
2. Go to **Files** in the left menu.
3. Navigate to `/www/wwwroot/` and create directory:
   ```bash
   /www/wwwroot/careid-backend
   ```
4. Upload `careid-backend-aaPanel-staging-v1.0.0.zip` to `/www/wwwroot/careid-backend/`.
5. Select the ZIP file and click **Unzip** (Extract).
6. Verify directory structure:
   ```text
   /www/wwwroot/careid-backend/
   ├── dist/
   │   └── src/
   │       └── main.js
   ├── prisma/
   │   ├── schema.prisma
   │   ├── baseline_schema.sql
   │   └── migrations_offline/
   ├── scripts/
   │   ├── deploy-preflight.js
   │   ├── server-healthcheck.js
   │   ├── seed-staging.js
   │   └── seed-local.js
   ├── .env.staging.example
   ├── ecosystem.config.js
   ├── package.json
   ├── package-lock.json
   ├── prisma.config.ts
   ├── README-AAPANEL-DEPLOYMENT.md
   └── RELEASE-MANIFEST.json
   ```

---

### Step 2.2 — Provision the Staging PostgreSQL Database

1. In aaPanel, navigate to **Databases** > **PostgreSQL** (or use the server terminal).
2. Create a new staging database:
   - **Database Name:** `careid_staging_db`
   - **Username:** `careid_staging_user`
   - **Password:** `<CREATE_STRONG_PASSWORD>`
3. Initialize the 144 CareID baseline database tables using `prisma/baseline_schema.sql`:
   ```bash
   cd /www/wwwroot/careid-backend
   psql -U careid_staging_user -d careid_staging_db -f prisma/baseline_schema.sql
   ```
   *(Enter the password when prompted. This creates the exact 144 CareID tables, foreign keys, and indexes).*

---

### Step 2.3 — Configure Environment Variables

1. In the project directory, copy `.env.staging.example` to `.env`:
   ```bash
   cd /www/wwwroot/careid-backend
   cp .env.staging.example .env
   ```
2. Generate secure 32+ character cryptographic secrets on the server terminal:
   ```bash
   openssl rand -base64 36
   ```
3. Edit `.env` (`nano .env` or use aaPanel File Editor) and update:
   - `DATABASE_URL`: Set to your staging PostgreSQL connection:
     `postgresql://careid_staging_user:<PASSWORD>@127.0.0.1:5432/careid_staging_db?schema=public`
   - `JWT_SECRET`: Paste the generated 32+ character random secret.
   - `QR_SIGNING_KEY`: Paste a separate generated 32+ character secret.
   - `CORS_ALLOWED_ORIGINS`: Add your staging frontend URLs (e.g., `https://staging-app.careid.yourdomain.com`).
   - Confirm staging test OTP flags:
     `NODE_ENV=production`
     `APP_ENV=staging`
     `DEPLOYMENT_ENV=staging`
     `ENABLE_TEST_OTP=true`
     `TEST_OTP_CODE=123456`
     `TEST_PHONE_NUMBERS=+16505550001,+16505550002,+16505550003,+16505550004,+16505550005,+16505550006,+16505550007`

---

### Step 2.4 — Install Production Dependencies & Generate Prisma Client

Run the following commands in the application directory:
```bash
cd /www/wwwroot/careid-backend

# 1. Install verified production dependencies (excluding dev tools)
npm ci --omit=dev

# 2. Generate Prisma Client bindings for the Linux host
npx prisma generate
```

---

### Step 2.5 — Run Preflight Verification

Verify system readiness, Node version, and PostgreSQL connectivity:
```bash
npm run preflight
```
**Expected Output:**
```text
✓ Node.js version satisfies requirement (>= v20.x).
✓ Staging Test OTP is enabled for 7 allowlisted phone numbers.
✓ JWT_SECRET meets enterprise cryptographic entropy requirements.
✓ Successfully connected to PostgreSQL server.
✓ Public schema table count: 144 tables.
✓ Baseline schema appears fully populated (144 tables).
PREFLIGHT PASSED: Environment and database are ready for CareID.
```

---

### Step 2.6 — Seed Synthetic Staging Accounts & Provision Admin Password

Populate the dedicated staging database with synthetic test accounts, roles, clinical entities, and provision the staging Admin account password.

> **CRITICAL SECURITY REQUIREMENT:**
> Admin credentials MUST be managed exclusively through database seeding. **NEVER add `ADMIN_LOGIN_PASSWORD` or `ADMIN_LOGIN_EMAIL` to `.env`.**

The initial Admin password must be supplied at runtime by the operator using one of the following secure methods:

#### Method A — Secure Hidden Shell Prompt (Recommended - No Shell History)
```bash
cd /www/wwwroot/careid-backend

# Read password invisibly without echoing or saving to bash history
read -s -p "Enter Staging Admin Initial Password: " SEED_ADMIN_PASSWORD
echo ""

# Run seed with explicit operator approval and one-time password
ALLOW_SERVER_TEST_SEED=true SEED_ADMIN_PASSWORD="$SEED_ADMIN_PASSWORD" npm run seed:staging

# Immediately clear password variable from shell environment
unset SEED_ADMIN_PASSWORD
```

#### Method B — CLI Argument
```bash
ALLOW_SERVER_TEST_SEED=true npm run seed:staging -- --admin-password="<STRONG_ADMIN_PASSWORD>"
```

*(On Windows / PowerShell: `$env:ALLOW_SERVER_TEST_SEED="true"; $env:SEED_ADMIN_PASSWORD="<STRONG_PASSWORD>"; npm run seed:staging; Remove-Item Env:\SEED_ADMIN_PASSWORD`)*

#### Idempotency & Safe Upsert Behavior:
- **Preserves Existing Passwords:** If the Admin account already has a password hash in the database, repeated seed runs will safely preserve the existing password and will **not** overwrite it.
- **Explicit Password Reset:** If you intentionally wish to overwrite/reset an existing Admin password, pass `--reset-admin-password` or `RESET_ADMIN_PASSWORD=true`:
  ```bash
  ALLOW_SERVER_TEST_SEED=true SEED_ADMIN_PASSWORD="<NEW_PASSWORD>" RESET_ADMIN_PASSWORD=true npm run seed:staging
  ```
- **Custom Admin Email (Optional):** By default, seeds `admin@careid.test` and `superadmin@careid.test`. To override: `--admin-email="custom-admin@yourdomain.com"`.

**Expected Output:**
```text
--- Step 1: Seeding Platform Roles ---
✓ Seeded 7 roles successfully.
--- Step 2: Seeding User Accounts & Role Assignments ---
✓ Provisioned password hash for Admin account (superadmin@careid.test)
✓ Provisioned password hash for Admin account (admin@careid.test)
✓ Seeded 7 user accounts with verified roles.
--- Step 3: Seeding Healthcare Facility & Clinical Departments ---
✓ Seeded Facility: Metro General Hospital with Department: Cardiology Department.
--- Step 4: Seeding Doctor Profile & Facility Affiliation ---
✓ Seeded Doctor Profile: Dr. Sarah Jenkins, MD.
--- Step 5: Seeding Staff Member Profile ---
✓ Seeded Staff Member: Alice Smith, RN.
--- Step 6: Seeding Patient Profile & Core Clinical Vault Data ---
✓ Seeded Patient Profile: John Doe (PT-CAREID-2026-0004).
✓ Staging Seed Completed Successfully
```

---

### Step 2.7 — Launch Application Process via PM2

Start the NestJS backend with the pre-configured `ecosystem.config.js`:
```bash
cd /www/wwwroot/careid-backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Verify the process is running:
```bash
pm2 status
pm2 logs careid-backend-api --lines 30
```

Alternatively, use aaPanel **Node project** manager:
- **Project name:** `careid-backend`
- **Path:** `/www/wwwroot/careid-backend`
- **Run opt:** `npm run start:prod` or `dist/src/main.js`
- **Port:** `3073`
- **User:** `www`

---

### Step 2.8 — Configure Nginx Reverse Proxy & SSL in aaPanel

1. In aaPanel, go to **Websites** > **Add site**.
   - **Domain:** `api-staging.careid.yourdomain.com` (point DNS A record to your server IP).
   - **Database:** None (already configured).
   - **PHP version:** Pure static (no PHP needed).
2. Go to **SSL** tab on the website and apply for **Let's Encrypt SSL certificate**.
3. Go to **Reverse Proxy** tab > **Add reverse proxy**:
   - **Proxy name:** `careid-api-proxy`
   - **Target URL:** `http://127.0.0.1:3073`
   - **Sent Domain:** `$host`
4. In **Proxy Config**, ensure the following headers are present:
   ```nginx
   location / {
       proxy_pass http://127.0.0.1:3073;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_http_version 1.1;
       proxy_read_timeout 60s;
       client_max_body_size 15M;
   }
   ```

---

### Step 2.9 — Verify Server Health & Diagnostics

Run the automated health check script locally on the server:
```bash
npm run healthcheck
```
**Expected Output:**
```text
✓ [200 OK] /health (11ms): Service is alive and operating normally.
✓ [200 OK] /ready  (19ms): PostgreSQL database connectivity verified.
✓ [200 OK] /live   (2ms): Uptime: active
STATUS: HEALTHY — All API and Database checks passed successfully.
```

Test external domain connectivity from your local workstation:
```bash
curl -i https://api-staging.careid.yourdomain.com/api/v1/health
curl -i https://api-staging.careid.yourdomain.com/api/v1/ready
```
Visit Swagger/OpenAPI documentation in browser:
```text
https://api-staging.careid.yourdomain.com/docs
```

---

### Step 2.10 — Verify Admin Password Login & JWT Claims

Test the newly implemented Super Admin / Admin password login endpoint securely without writing the password to shell history:

```bash
# 1. Prompt for password invisibly
read -s -p "Enter Staging Super Admin Password: " ADMIN_PASS
echo ""

# 2. Execute Admin Password Login POST request (Documented contract)
LOGIN_RESPONSE=$(curl -s -X POST http://127.0.0.1:3073/api/v1/auth/password/login \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"superadmin@careid.test\",\"password\":\"$ADMIN_PASS\"}")

# 3. Clean up the password variable immediately
unset ADMIN_PASS

# 4. Inspect login response (requires jq: apt install -y jq)
echo "$LOGIN_RESPONSE" | jq .

# 5. Extract Access Token and verify user session & permissions
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.access_token')
curl -s -X GET http://127.0.0.1:3073/api/v1/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

**Expected `POST /api/v1/auth/password/login` Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": "1099f683-d9bc-49e0-b4f1-697ded5dd51d",
      "user_type": "admin",
      "role": {
        "id": "e48f72dc-1839-4e4d-8cf4-14b89ee06bbd",
        "name": "SUPER_ADMIN"
      }
    }
  }
}
```

**Expected `/api/v1/auth/me` Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile retrieved successfully",
  "data": {
    "id": "1099f683-d9bc-49e0-b4f1-697ded5dd51d",
    "email": "superadmin@careid.test",
    "phone": "+16505550001",
    "status": "ACTIVE",
    "roles": ["SUPER_ADMIN"],
    "permissions": ["read:all", "write:all", "delete:all", "read:audit-logs", "manage:roles"]
  }
}
```

---

## 3. Seeded Staging Test Accounts Sheet

CareID supports dual authentication mechanisms based on role authorization:
- **Admin Accounts (`ADMIN`, `SUPER_ADMIN`):** Can authenticate via **both** Email/Password (`POST /api/v1/auth/admin/login`) and Phone OTP (`POST /api/v1/auth/otp/verify`).
- **Clinical & Vault Accounts (`DOCTOR`, `PATIENT`, `STAFF`, etc.):** Authenticate securely via Phone OTP.

| Role | Email Address | Phone Number | Fixed Staging OTP | Supported Auth Flows | Name & Description | Core Modules to Test |
|---|---|---|---|---|---|---|
| **SUPER_ADMIN** | `superadmin@careid.test` | `+16505550001` | `123456` | Email/Password + Phone OTP | CareID Super Administrator | Admin Portal, User Management, Global Security Policies |
| **ADMIN** | `admin@careid.test` | `+16505550002` | `123456` | Email/Password + Phone OTP | CareID System Administrator | Admin Dashboard, Reports, Audit Logs, System Diagnostics |
| **DOCTOR** | *(N/A)* | `+16505550003` | `123456` | Phone OTP | Dr. Sarah Jenkins, MD | Doctor Clinical Portal, Consultations, Referrals |
| **PATIENT** | *(N/A)* | `+16505550004` | `123456` | Phone OTP | John Doe | Health Vault, Profile (`/patients/me`), Digital Health Card, QR Code |
| **FACILITY_ADMIN** | *(N/A)* | `+16505550005` | `123456` | Phone OTP | Metro Facility Admin | Hospital Management, Departments, Doctor/Staff Onboarding |
| **STAFF** | *(N/A)* | `+16505550006` | `123456` | Phone OTP | Alice Smith, RN | Clinical Staff Desk, Patient Triage, Vital Signs |
| **FAMILY_MEMBER** | *(N/A)* | `+16505550007` | `123456` | Phone OTP | Jane Doe (Family) | Family Vault, Dependent Profiles, Shared Health Records |

*Note: Unlisted phone numbers attempting to use `123456` will be rejected with `401 Unauthorized`.*

---

## 4. Upgrading an Existing aaPanel Staging Deployment (Zero-Data-Loss Upgrade)

Follow these steps when applying an updated release package (such as v1.0.0 with Admin Email/Password authentication) to an existing staging server that already has database tables and seeded clinical records:

### Step 4.1 — Create Safe Backups of Application & Database
```bash
# 1. Create a timestamped backup directory
mkdir -p /www/backup/careid

# 2. Back up current application files (including active .env)
tar -czf /www/backup/careid/careid-backend-app-$(date +%F_%H%M%S).tar.gz -C /www/wwwroot careid-backend

# 3. Create a complete PostgreSQL snapshot of the staging database
pg_dump -U careid_staging_user -h 127.0.0.1 -d careid_staging_db -F c -b -v \
  -f /www/backup/careid/careid_staging_db-$(date +%F_%H%M%S).dump
```

### Step 4.2 — Extract Updated Release Archive Without Overwriting `.env`
> The release ZIP archive strictly excludes `.env` and all secrets. Extracting with `-o` updates compiled code, migration scripts, and seed files while preserving your active server `.env`:
```bash
cd /www/wwwroot/careid-backend

# Extract the updated release archive (safely excluding .env)
unzip -o /path/to/careid-backend-aaPanel-staging-v1.0.0.zip -x ".env"
```

### Step 4.3 — Apply Additive Database Schema Migration
Apply the non-destructive migration to add `email` (unique) and `password_hash` columns to the `users` table:
```bash
psql -U careid_staging_user -h 127.0.0.1 -d careid_staging_db \
  -f prisma/migrations_offline/20261028_add_user_email_password_hash/migration.sql
```
*(This migration is purely additive: it adds nullable columns and creates a unique index. All existing users, clinical data, and foreign key relationships are 100% preserved).*

### Step 4.4 — Re-generate Prisma Client
Regenerate Prisma client bindings for the updated schema:
```bash
cd /www/wwwroot/careid-backend
npx prisma generate
```

### Step 4.5 — Provision the Staging Admin Password
Run the staging seed script to assign the initial password hash to the Admin and Super Admin accounts.
> Note: Admin credentials are **NEVER** placed in `.env`. Supply the password securely at execution time:
```bash
# Read password invisibly:
read -s -p "Enter Initial Staging Admin Password: " SEED_ADMIN_PASSWORD
echo ""

# Execute staging seed with password provisioning:
ALLOW_SERVER_TEST_SEED=true SEED_ADMIN_PASSWORD="$SEED_ADMIN_PASSWORD" npm run seed:staging

# Clear variable:
unset SEED_ADMIN_PASSWORD
```
*(If the Admin account already has a password hash in the database, the seed script will preserve it without unexpected overwriting. If you ever need to reset the password, append `RESET_ADMIN_PASSWORD=true`).*

### Step 4.6 — Restart Application Service via PM2
Restart the backend on port `3073`:
```bash
pm2 restart careid-backend-api
pm2 logs careid-backend-api --lines 30
```

### Step 4.7 — Run Verification Checks
```bash
# 1. Run local health check
npm run healthcheck

# 2. Test Admin Login with the newly provisioned password
read -s -p "Enter Staging Admin Password: " TEST_PASS; echo ""
curl -s -X POST http://127.0.0.1:3073/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@careid.test\",\"password\":\"$TEST_PASS\"}" | jq .
unset TEST_PASS
```

---

## 5. Rollback Procedure

If a deployment or upgrade encounters critical issues, roll back immediately using the backups taken in Step 4.1:

1. **Stop the Application:**
   ```bash
   pm2 stop careid-backend-api
   ```

2. **Restore Application Files:**
   ```bash
   cd /www/wwwroot
   # Remove current failed deployment
   rm -rf careid-backend-failed
   mv careid-backend careid-backend-failed
   # Restore previous working archive
   tar -xzf /www/backup/careid/careid-backend-app-<TIMESTAMP>.tar.gz -C /www/wwwroot/
   ```

3. **Revert Database Migration (if required):**
   - Option A: Revert only the additive columns via SQL:
     ```sql
     psql -U careid_staging_user -d careid_staging_db -c '
       DROP INDEX IF EXISTS "users_email_key";
       ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";
       ALTER TABLE "users" DROP COLUMN IF EXISTS "email";
     '
     ```
   - Option B: Full database restore from the pre-upgrade snapshot:
     ```bash
     pg_restore -U careid_staging_user -d careid_staging_db --clean --if-exists \
       /www/backup/careid/careid_staging_db-<TIMESTAMP>.dump
     ```

4. **Restart PM2 & Run Diagnostics:**
   ```bash
   cd /www/wwwroot/careid-backend
   pm2 restart careid-backend-api
   npm run healthcheck
   ```

---

## 6. Test OTP Management & Production Safeguards

### How to Disable Test OTP on Staging
To disable fixed test OTP and revert to normal random SMS OTP generation on staging:
1. Edit `.env`:
   ```bash
   ENABLE_TEST_OTP=false
   ```
   (or remove the `ENABLE_TEST_OTP`, `TEST_OTP_CODE`, and `TEST_PHONE_NUMBERS` lines).
2. Reload PM2:
   ```bash
   pm2 reload careid-backend-api
   ```

### Why Test OTP Must NEVER Be Enabled in Production
1. **Security Vulnerability:** Fixed test OTP allows anyone who knows the allowlisted phone numbers and test code to authenticate without access to the physical mobile device.
2. **Automated Server Crash Guard:** The CareID backend enforces strict environment guards in `src/config/env.validation.ts`. If `ENABLE_TEST_OTP=true` is present when `APP_ENV=production` or `DEPLOYMENT_ENV=production` (or if environment declarations conflict) (or when `NODE_ENV=production` without explicit staging designation), the application **immediately crashes on startup** with:
   `CRITICAL SECURITY ERROR: ENABLE_TEST_OTP cannot be enabled in a production environment. Server startup aborted.`
3. **Production Policy:** Real production environments must use real SMS provider credentials (AWS SNS, Twilio, or Telecom aggregators) with cryptographically random 6-digit OTPs and real clinical patient data. Never enable test OTP or seed synthetic records into production.

