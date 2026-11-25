# CAREID STAGING ENVIRONMENT ISOLATION AUDIT REPORT

**Date:** November 10, 2026  
**Auditor:** Antigravity Forensic Engineering  
**Scope:** Backend Environment Isolation Verification (`C:\Users\PABANI\Downloads\hvapi-main\hvapi-main`)  
**Status:** **BLOCKED — ENVIRONMENT NOT ISOLATED**

---

## 1. EXECUTIVE SUMMARY & ISOLATION VERDICT

The staging deployment preflight audit was initiated to verify whether the target deployment environment is physically and logically isolated from the live production infrastructure. 

Following a forensic examination of `.env`, `.env.example`, `ecosystem.config.js`, reverse proxy configurations, and server target endpoints:

> **CRITICAL VERDICT:**  
> **THE INTENDED TARGET ENVIRONMENT IS NOT ISOLATED FROM PRODUCTION.**  
> The target database `360api` and target hostname `360api.vnvision.in` serve the **LIVE PRODUCTION** environment. Proceeding with deployment or schema operations against this target would directly overwrite and disrupt production operations and patient clinical data.  
> **Staging deployment is strictly BLOCKED until a dedicated staging environment is provisioned.**

---

## 2. FORENSIC ENVIRONMENT MAPPING

### A. Local Development & Test Environment
- **Host / Bind:** `127.0.0.1` / `localhost`
- **Application Port:** `3000` (`PORT=3000`)
- **Database Identity:** `hvapi_db` on `localhost:5432`
- **Connection URL:** `postgresql://postgres:[REDACTED]@localhost:5432/hvapi_db?schema=public`
- **Execution Mode:** Direct Node.js / `nest start` / `ts-node`
- **OCR Worker Integration:** `http://localhost:5050` via mock/worker client

### B. aaPanel Target Infrastructure (`ecosystem.config.js` & Deployment Manifests)
- **Host / Ingress:** `https://360api.vnvision.in`
- **Reverse Proxy Route:** Nginx reverse proxy forwards `https://360api.vnvision.in` -> `http://127.0.0.1:3073`
- **Target Process Name:** `careid-backend`
- **Target Port:** `3073` (`PORT=3073`)
- **Target Process Manager:** PM2 Cluster Mode (`instances: 2`, `exec_mode: "cluster"`)
- **Target Database Name:** `360api` on `127.0.0.1:5432`
- **Target Connection URL:** `postgresql://[REDACTED_USER]:[REDACTED_PASS]@127.0.0.1:5432/360api?schema=public`
- **Target OCR Worker:** `http://127.0.0.1:5050` (`OCR_WORKER_URL`)

---

## 3. EVIDENCE OF NON-ISOLATION (PRODUCTION CONFLICT)

| Attribute | Production Configuration | Purported "Staging" Target | Isolation Status | Impact / Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Domain / Hostname** | `360api.vnvision.in` | `360api.vnvision.in` | **COLLISION** | Zero domain segregation; routing targets live doctor/patient traffic. |
| **Reverse Proxy Port** | `3073` | `3073` | **COLLISION** | Deploying will restart the active production listener. |
| **PostgreSQL Database** | `360api` | `360api` | **COLLISION** | `360api` contains live records; DDL or data changes will mutate production. |
| **Process Manager App** | `careid-backend` (PM2) | `careid-backend` (PM2) | **COLLISION** | Restarts or code replacements directly swap out the production daemon. |
| **OCR Worker Service** | `127.0.0.1:5050` | `127.0.0.1:5050` | **SHARED** | Unisolated OCR queue processing; shared auth secret. |

### Conclusion on Database `360api`
Database `360api` is **NOT** a staging database. It is the primary production database of CareID / Health Vault 360. In accordance with strict preflight rules:
- **Do not assume database `360api` is staging.**
- **Do not execute `prisma migrate deploy` or seed scripts against `360api`.**
- **Do not run `pm2 restart careid-backend` on the live aaPanel server.**

---

## 4. PRE-REQUISITES TO UNBLOCK STAGING DEPLOYMENT

Before any staging deployment commands can be executed, the system administrator must provision a genuinely isolated staging environment on aaPanel:

1. **Staging Subdomain & DNS:**
   - Configure a dedicated staging DNS record: e.g., `staging-360api.vnvision.in` or `staging.careid.vnvision.in`.
2. **Dedicated Staging Port:**
   - Assign an independent application port: e.g., `PORT=3074` (leaving `3073` undisturbed for production).
3. **Dedicated Staging Database:**
   - Create a separate PostgreSQL database: `careid_staging` or `360api_staging`.
   - Seed it with sanitized test fixtures or baseline migration history.
   - Connection URL: `postgresql://[STAGING_USER]:[STAGING_PASS]@127.0.0.1:5432/360api_staging?schema=public`.
4. **Dedicated PM2 Configuration:**
   - Configure `careid-backend-staging` in `ecosystem.staging.config.js` with `instances: 1`, `PORT=3074`.
5. **Isolated OCR Worker:**
   - Run a secondary OCR worker on port `5051` (`OCR_WORKER_URL=http://localhost:5051`) or ensure staging requests carry distinct tracing metadata.

---

## 5. AUDIT CONCLUSION

The CareID backend codebase has achieved full internal build and test readiness (84/84 tests passing, NestJS build successful, 588 Postman contracts verified). However, **deployment is safely paused at the preflight gate** to prevent catastrophic production contamination. Staging deployment will proceed immediately once the isolated infrastructure outlined above is confirmed.

