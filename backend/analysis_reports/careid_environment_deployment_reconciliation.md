# CAREID CLINICAL NETWORK — ENVIRONMENT & DEPLOYMENT RECONCILIATION REPORT

**Document ID:** CR-ENV-REC-2026-11-10  
**Date:** November 10, 2026  
**Auditor / Engineer:** Principal Backend Systems Engineer & Forensic Security Auditor  
**Scope:** CareID Backend Environment Configurations (Development, Staging, Production & aaPanel Package)  
**Status:** FORENSICALLY RECONCILED & DOCUMENTED

---

## 1. EXECUTIVE SUMMARY

An exhaustive forensic comparison was conducted across all local and deployment environment configurations for the CareID Backend. Historical implementation reports contained significant configuration drifts, conflating local development variables with aaPanel staging and production release targets.

This report establishes the single source of truth across:
1. **Local Development Environment** (`.env` in active workspace).
2. **Local Test Environment** (`.env.test` / Docker PostgreSQL container `careid-test-postgres`).
3. **aaPanel / Staging Deployment Configuration** (`CareID_Backend_Deployment_Nov_2026` package, `ecosystem.config.js`).
4. **Target Production Topology** (`https://360api.vnvision.in/api/v1`).

---

## 2. ENVIRONMENT TOPOLOGY MATRIX

| Parameter | Local Development (`.env`) | Test Docker Runtime | aaPanel Staging Deployment Package | Target Production (`360api.vnvision.in`) |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js Target** | v20.x / v22.x | v20.x / v22.x | v20.18.0 LTS (aaPanel Node Project Manager) | Node.js v20 LTS |
| **Process Manager** | Direct (`nest start:dev`) | Direct CLI (`jest`) | PM2 (`ecosystem.config.js` - cluster mode) | PM2 Managed Process |
| **Application Port** | `3000` | Dynamic / Unbound | `3073` (Explicit aaPanel reverse proxy port) | `3073` (Behind Nginx reverse proxy) |
| **API Path Prefix** | `/api/v1` | `/api/v1` | `/api/v1` | `/api/v1` |
| **Database Host** | `127.0.0.1` | `127.0.0.1` | `127.0.0.1` | `127.0.0.1` |
| **Database Port** | `5432` | `5432` | `5432` | `5432` |
| **Database Name** | `hvapi_db` | `hvapi_db` | `360api` (aaPanel PostgreSQL database) | `360api` |
| **Database User** | `postgres` | `postgres` | `postgres` / `careid_user` | `careid_prod` |
| **OCR Worker Service** | `127.0.0.1:5050` | Mock / Internal Stub | `127.0.0.1:5050` (Systemd / PM2 python service) | `127.0.0.1:5050` (PaddleOCR v4) |
| **B2 Storage Mode** | Direct S3 SDK | Memory / Mock Stub | Private Backblaze B2 Bucket | Private Backblaze B2 Bucket |
| **PACS / DICOM Web** | Stubbed / Unset | Mock Response | Unconfigured (`PACS_URL` optional) | Blocked by External Dependency |

---

## 3. COMPILATION & PM2 RUNTIME RECONCILIATION

### 3.1 PM2 Configuration (`ecosystem.config.js`)
Inspection of `ecosystem.config.js` in the deployment package confirmed:
```javascript
module.exports = {
  apps: [
    {
      name: 'careid-api',
      script: 'dist/src/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3073
      }
    }
  ]
};
```

### 3.2 Port Discrepancy Resolution
- **Claim in early reports:** Backend listens on port `3000` or `8080`.
- **Forensic Reality:**
  - Local developers run `npm run start:dev` binding to port `3000` (`PORT=3000` in `.env`).
  - The live aaPanel Nginx reverse proxy routes traffic for `https://360api.vnvision.in` to upstream port `3073`.
  - The deployment package specifically enforces `PORT=3073` in `ecosystem.config.js` and `.env.example`.
  - **Verdict:** No conflict exists. Local dev uses 3000; Staging/Production deployment uses 3073.

---

## 4. DATABASE & MIGRATIONS RECONCILIATION

### 4.1 Migration Alignment
All 12 historical migrations were verified against `prisma/migrations/`:
1. `20261020083000_init`
2. `20261024120000_doctor_facility_relations`
3. `20261026090000_appointment_stages`
4. `20261028140000_treatment_offers`
5. `20261030110000_financing_applications`
6. `20261102090000_encryption_keys`
7. `20261104150000_ocr_records`
8. `20261106120000_cpt_chargemaster`
9. `20261108080000_cath_lab_checklists`
10. `20261109140000_doctor_patient_relations`
11. `20261110090000_encounter_vitals_extension`
12. `20261110113000_cath_lab_safety_and_qca`

### 4.2 Migration Execution Protocol for aaPanel
- Staging and production databases MUST be upgraded via:
  ```bash
  npx prisma migrate deploy
  ```
- **STRICT PROHIBITION:** `npx prisma migrate reset` or `npx prisma db push --force-reset` MUST NEVER be run in aaPanel staging or production, as this permanently destroys live clinical data.
- **Seed Scripts:** `prisma/seed.ts` is explicitly safeguarded with `if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_SEED) throw new Error(...)` to prevent staging seed contamination.

---

## 5. SECRET & KEY MANAGEMENT DISCREPANCIES

| Secret / Config Key | Source in Source Code | Development Handling | Production Recommendation |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | `auth.module.ts`, `jwt.strategy.ts` | Development secret string | Cryptographically generated 256-bit entropy |
| `FINANCING_ENCRYPTION_KEY` | `financing.service.ts` | 64-char hex string (AES-256-GCM) | KMS / aaPanel Encrypted Env Var |
| `OCR_INTERNAL_SECRET` | `ocr.service.ts`, `server.py` | Shared secret header `X-CareID-Internal-Secret` | aaPanel Secret Store |
| `B2_APPLICATION_KEY` | `storage.service.ts` | S3-compatible Backblaze credentials | Restricted-scope App Key (Read/Write to bucket only) |
| `PACS_URL` / `PACS_AET` | `cath-lab.service.ts` | Unset (triggers graceful fallback) | Set to hospital PACS server endpoint when commissioned |

---

## 6. EXTERNAL DEPENDENCIES & BLOCKERS STATUS

1. **OCR Worker (`services/ocr-worker`):**
   - **Engine:** PaddleOCR v4 + aiohttp.
   - **Port:** Localhost `5050`.
   - **Status:** Functional locally; requires Python 3.10+ runtime and PaddlePaddle packages in aaPanel.
2. **DICOM / PACS Node (`PACS_URL`):**
   - **Status:** `BLOCKED BY EXTERNAL DEPENDENCY`.
   - **Runtime Behavior:** The backend safely registers series metadata in PostgreSQL and returns an explicit HTTP 503 / `BLOCKED_BY_EXTERNAL_DEPENDENCY` response for binary frame streaming until hospital network connectivity is authorized.
3. **Direct C-Arm Fluoroscopy Telemetry:**
   - **Status:** Manual Log Feed active (`MANUAL_LOG_FEED`).
   - **Runtime Behavior:** Direct serial/DICOM Modality Performed Procedure Step (MPPS) hardware telemetry interface is unprovisioned; manual telemetry logging endpoints (`POST /cath-lab/telemetry/log`) are fully operational.

---

## 7. CONCLUSION & RELEASE INTEGRITY VERDICT

The CareID backend environment configurations are now forensically reconciled. All discrepancies between local development, testing, aaPanel staging deployment packages, and target production servers are completely resolved and clearly delineated.

