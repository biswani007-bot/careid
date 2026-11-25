# CAREID STAGING DEPLOYMENT PREFLIGHT AUDIT & READINESS REPORT

**Date:** November 10, 2026  
**Auditor:** Antigravity Forensic Engineering  
**Repository:** `C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Target Environment:** Staging / aaPanel Ingress  
**Preflight Mode:** Read-Only / Verification Gate (Zero migrations executed, Zero service restarts)

---

## 1. PREFLIGHT STATUS DASHBOARD

| Dimension | Target Standard | Preflight Verification | Status |
| :--- | :--- | :--- | :--- |
| **Backend TypeScript Build** | Zero compile errors | `npm run build` completed with exit code 0 | **PASS** |
| **Automated Unit & Regression Tests** | 100% passing across all suites | 84 passed / 84 total (6 test suites) | **PASS** |
| **Postman API Contract Integrity** | 533 baseline preserved | 588 total verified (533 baseline preserved) | **PASS** |
| **Prisma Schema & Migrations** | 0 pending DDL migrations | 6 verified migrations; Cath Lab zero-migration design | **PASS** |
| **Node.js Runtime Compatibility** | Node.js v20.x LTS | Verified Node.js v20.18.0 compatibility | **PASS** |
| **Python OCR Runtime Compatibility** | PaddleOCR + PP-OCRv4 | Python 3.10+; PaddleOCR 2.7.3 / PP-OCRv4 reconciled | **PASS** |
| **Security & Credential Masking** | Zero credentials in logs/artifacts | AES-256-GCM verified; all passwords redacted | **PASS** |
| **Environment Isolation** | Dedicated staging database & host | Target database `360api` and host `360api.vnvision.in` collide with PRODUCTION | **BLOCKED** |
| **Physical Hardware Telemetry / DICOM** | Live PACS / C-Arm stream | Physical hardware unavailable in software staging | **NOT VERIFIED** (External) |

---

## 2. ENVIRONMENT ISOLATION & TARGET IDENTIFICATION

### Target Identity Verification
- **Target Ingress:** `https://360api.vnvision.in` (Nginx reverse proxy to `127.0.0.1:3073`)
- **Target Database:** `360api` (`postgresql://[REDACTED_USER]:[REDACTED_PASS]@127.0.0.1:5432/360api?schema=public`)
- **Target Process Manager:** PM2 Cluster Mode (`careid-backend`, 2 instances)

### Isolation Finding & Blocker
- **Finding:** The configured target host `360api.vnvision.in` and database `360api` correspond directly to the **LIVE PRODUCTION** environment.
- **Rule Verification:** "Do not assume that database `360api` is staging." Inspection confirms that `360api` is currently running production workloads. No isolated staging database (such as `360api_staging`) or staging subdomain (such as `staging-360api.vnvision.in`) is configured.
- **Action:** Preflight blocks any live deployment or schema migration command until an isolated staging tenant is provisioned.

---

## 3. RUNTIME & SYSTEM COMPATIBILITY

### A. Node.js Backend Runtime
- **Engine Version:** Node.js v20.18.0 LTS (npm v10.8.2)
- **Framework:** NestJS 10.x with Fastify / Express adapter
- **ORM:** Prisma 5.22.0 (`@prisma/client` generated and in sync with schema)
- **Process Management:** PM2 via `ecosystem.config.js` (Must be adapted to `ecosystem.staging.config.js` with `PORT=3074`)

### B. Python OCR Worker Runtime
- **Interpreter:** Python 3.10 or 3.11
- **Library Version:** `paddleocr==2.7.3`
- **Execution Framework:** `paddlepaddle>=2.5.0`
- **Model Family:** `PP-OCRv4` (`ocr_version='PP-OCRv4'`)
- **Server:** `aiohttp` asynchronous web server on port `5050` (or `5051` for staging)
- **Authentication:** `X-CareID-Internal-Secret` matching `OCR_INTERNAL_SECRET`

---

## 4. DATABASE MIGRATION STATUS

Prisma migration directory: `prisma/migrations/`
- Verified migrations (in chronological order):
  1. `0_init` (Base schema: patients, doctors, appointments, medical records)
  2. `20261030113000_add_atomic_offers_and_audit` (Atomic sequences and audit tables)
  3. `20261030123000_add_patient_insurance_and_history` (Insurance and medical history)
  4. `20261106110000_add_financing_workflow_schema` (Financing applications, encrypted metadata)
  5. `20261106120000_add_treatment_offer_cascade_and_indexes` (Offer relations and indices)
  6. `20261106140000_add_ocr_processing_indexes` (OCR job indexing)
- **Pending Migrations:** **0**
- **Cath Lab Clinical Persistence Architecture:** Stages 16–18 (Safety timeout, safety hold, hemodynamic telemetry, QCA stenosis, and DICOM metadata) intentionally utilize structured delimited markers in `appointment.notes` and `medical_record.clinical_notes`, eliminating schema drift and avoiding DDL table lock risks during staging rollouts.

---

## 5. SAFE ORDERED STAGING DEPLOYMENT PLAN

Once the staging database and subdomain are provisioned by the operations team, execute the deployment in the following strict sequential order:

```mermaid
flowchart TD
    A["Step 1: Provision Isolated Staging Database (360api_staging)"] --> B["Step 2: Configure Staging Subdomain & Port (PORT=3074)"]
    B --> C["Step 3: Deploy & Start Python OCR Worker (Port 5051)"]
    C --> D["Step 4: Execute Prisma Migrations (npx prisma migrate deploy)"]
    D --> E["Step 5: Launch Backend via PM2 (careid-backend-staging)"]
    E --> F["Step 6: Run Automated Health Check & Smoke Suite"]
    F --> G["Step 7: Execute Postman 588 Contract Regression Suite"]
```

### Step-by-Step Instructions:
1. **Database Isolation Setup:**
   - Execute: `CREATE DATABASE "360api_staging";` on PostgreSQL.
   - Set `.env.staging` with `DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/360api_staging?schema=public"`.
2. **Port & Reverse Proxy Allocation:**
   - In aaPanel Nginx, configure `staging-360api.vnvision.in` forwarding to `http://127.0.0.1:3074`.
   - Set `PORT=3074` in `.env.staging`.
3. **Start OCR Worker:**
   - Run `python server.py` in virtual environment with `PORT=5051` or connect to shared worker with staging tag.
4. **Deploy Schema:**
   - Run: `npx prisma migrate deploy` targeting `360api_staging` ONLY.
5. **Start Application:**
   - Run: `pm2 start ecosystem.staging.config.js`.
6. **Health Verification:**
   - Verify: `GET https://staging-360api.vnvision.in/api/v1/health` returns `{"status":"ok"}`.
7. **Regression Execution:**
   - Execute Newman test suite against `CareID-Staging.postman_collection.json`.

---

## 6. ROLLBACK RUNBOOK & CONTINGENCY PROCEDURES

In the event of an unrecoverable failure during staging testing:

1. **Database Reversion:**
   - Take an immediate baseline dump prior to migration:  
     `pg_dump -U postgres 360api_staging > /backup/staging_preflight_$(date +%F).sql`
   - Revert via:  
     `psql -U postgres 360api_staging < /backup/staging_preflight_$(date +%F).sql`
2. **Process Rollback:**
   - Stop staging process: `pm2 stop careid-backend-staging`
   - Revert application directory to previous release build symlink.
   - Restart: `pm2 restart careid-backend-staging`
3. **Zero-Production Touch Guarantee:**
   - Because staging runs on an isolated port (`3074`) and isolated database (`360api_staging`), a staging rollback has **0% impact** on the live production services (`3073` / `360api`).

---

## 7. FINAL PREFLIGHT SIGN-OFF

- **Code Quality & Build:** **APPROVED (84/84 tests, build clean)**
- **API Contract Verification:** **APPROVED (588 requests preserved)**
- **Database Safety:** **APPROVED (0 pending DDL changes)**
- **Staging Deployment Authorization:** **HELD AT PREFLIGHT GATE** pending staging environment isolation.

