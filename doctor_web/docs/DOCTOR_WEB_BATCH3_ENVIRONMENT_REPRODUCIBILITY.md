# CareID Doctor Web Batch 3 — Environment & Reproducibility Audit Report

**Target:** Doctor Web Batch 3 Final Acceptance Gap Review  
**Project:** CareID Platform  
**Master Goal:** `CAREID-MASTER-DOCTOR-WEB-001`  
**Execution Mode:** Forensic Audit + Verification + Test Execution  
**Status:** Audit In-Progress — Batch 4 Not Approved  
**Date:** 2026-11-21  

---

## 1. Executive Summary

This Environment and Reproducibility Audit evaluates the health, isolation, build reproducibility, and lifecycle reliability of the CareID local integration stack supporting Doctor Web Batch 3.

### Key Environment Determinations:
1. **Docker Host Daemon Failure:** The Windows host Docker CLI hangs indefinitely due to an IPC named-pipe failure (`\\.\pipe\dockerDesktopLinuxEngine`) caused by `com.docker.service` being stopped on the host. Standard commands like `docker compose up` or `docker ps` from PowerShell cannot execute without hanging.
2. **Container Runtime Active via WSL2:** The underlying WSL2 `docker-desktop` distro remains active and operational. The integration containers (`careid-integration-postgres`, `careid-integration-backend`, `careid-integration-doctor-web`, `careid-integration-admin-web`) are healthy and running with their listening ports mapped to the Windows host.
3. **Database Isolation Confirmed:** The integration database (`careid_integration_db` on port 5433) is strictly isolated from the local development database (`hvapi_db` on port 5432). All integration tests run against port 5433.
4. **Port Allocation Confirmed:**
   - Backend API: `http://localhost:3001` (internal container port 3000)
   - Doctor Web Frontend: `http://localhost:5173` (internal nginx port 80)
   - Admin Web Frontend: `http://localhost:5174` (internal nginx port 80)
   - Integration PostgreSQL: `localhost:5433` (internal postgres port 5432)
5. **Vite API URL Configuration Drift:** The source file `doctor_web/.env` defines `VITE_API_BASE_URL="http://localhost:3000"`, which corresponds to the development backend (`hvapi_db`). When building Doctor Web for integration testing, `VITE_API_BASE_URL` must be explicitly passed as `http://localhost:3001` to ensure browser network requests target the integration stack.

---

## 2. Infrastructure & Port Mapping Verification

| Service | Container Name | Host Port | Container Port | Underlying Database | Health Status |
|---|---|---|---|---|---|
| **PostgreSQL** | `careid-integration-postgres` | `5433` | `5432` | `careid_integration_db` | Healthy |
| **Backend API** | `careid-integration-backend` | `3001` | `3000` | `careid_integration_db` (via container link) | Healthy (HTTP 200) |
| **Doctor Web** | `careid-integration-doctor-web` | `5173` | `80` | N/A (SPA static bundle via nginx) | Healthy (HTTP 200) |
| **Admin Web** | `careid-integration-admin-web` | `5174` | `80` | N/A (SPA static bundle via nginx) | Healthy (HTTP 200) |
| **Dev PostgreSQL** | N/A (Local / Dev container) | `5432` | `5432` | `hvapi_db` | Separate (Dev only) |
| **Dev Backend** | N/A (Local / Dev container) | `3000` | `3000` | `hvapi_db` | Separate (Dev only) |

---

## 3. Findings & Environmental Gaps

### FINDING-ENV-01: Windows Named-Pipe Docker CLI Hang
* **Finding ID:** `FINDING-ENV-01`
* **Severity:** Medium / Environmental Constraint
* **Actual Observed Behavior:** Running `docker`, `docker compose`, or `docker ps` from Windows PowerShell hangs indefinitely without outputting any error or exiting.
* **Expected Behavior:** `docker ps` returns active container listing within < 1000ms.
* **Root Cause:** The Windows service `com.docker.service` is stopped, preventing IPC between the Windows client and Docker Desktop's named pipe `\\.\pipe\dockerDesktopLinuxEngine`.
* **Workaround Employed:** Inspection and container lifecycle management are executed directly within the running WSL2 `docker-desktop` distro using `nsenter` and `/proc/<pid>/root` container mappings.
* **Impact on Acceptance:** Automated CI/CD rebuilds using native Windows PowerShell `docker compose` cannot complete until the Docker Desktop Windows service is restarted.

---

### FINDING-ENV-02: Source Build Synchronization Requirement
* **Finding ID:** `FINDING-ENV-02`
* **Severity:** Medium / Workflow Constraint
* **Actual Observed Behavior:** When application source code is updated on the host (e.g., `doctor_web/src` or `backend/src`), the running integration container does not mount the host source tree and requires manual or scripted copying of compiled `dist/` into `/proc/<pid>/root/...`.
* **Expected Behavior:** In standard development, volumes or hot-reloading propagate changes. For the integration stack, `docker-compose.integration.yml` specifies immutable build contexts.
* **Verification Performed:**
  - Backend `dist/` compiled cleanly with `npm run build` and was synced to container `/app/dist`. Process restarted cleanly (PID 23297) and verified responding on `http://localhost:3001`.
  - Doctor Web `dist/` compiled cleanly with `npx vite build` (with `VITE_API_BASE_URL=http://localhost:3001`) and was synced to `/usr/share/nginx/html`. Verified responding on `http://localhost:5173` serving bundle `index-C3JZLIHQ.js`.

---

### FINDING-ENV-03: Rate Limiting Memory Cooldown During Test Execution
* **Finding ID:** `FINDING-ENV-03`
* **Severity:** Low / Operational
* **Actual Observed Behavior:** Repeated test runs requesting OTPs for Dr. Sarah Jenkins (`+16505550003`) or the veterinarian (`+16505555165`) trigger `429 Too Many Requests` due to in-memory policies in `AuthRateLimiterService` (`phoneOtpRequestPolicy: 3 requests / 10 min`, `ipOtpRequestPolicy: 10 requests / 15 min`).
* **Expected Behavior:** Rate limiter functions as designed for production security.
* **Impact on Testing:** Rapid consecutive test executions must either wait for the cooldown window or perform a non-destructive restart of the backend process to reset in-memory maps.

---

## 4. Database Schema & Migration Verification

1. **Applied Migrations:** Inspected PostgreSQL `_prisma_migrations` in `careid_integration_db`. All core migrations through Batch 3 (including `pet_vaccinations`, `medical_records`, `prescriptions`, `qr_scan_logs`, and `doctor_profiles`) are applied and current.
2. **Persistence Integrity:** Tested and confirmed live writes to `pet_vaccinations` by the treating veterinarian. Records are persisted with UUID primary keys, valid foreign keys to `pets` and `doctor_profiles`, and audit timestamps.
3. **Rollback / Reset Non-Interference:** Verified that no migrations were rolled back, no databases were dropped or reset, and no mock data was inserted into production tables.

---

## 5. Non-Destructive Restart Reproducibility

* **Procedure:** The backend process within `careid-integration-backend` was terminated using `kill -TERM 65799`.
* **Container Supervisor Behavior:** The container runtime immediately re-spawned `node dist/src/main` under PID 23297.
* **Health Check Recovery:** The backend passed its container health check (`curl -f http://localhost:3000/api/v1/health`) within 5 seconds.
* **Test Suite Verification Post-Restart:** The full 35/35 automated security test suite (`test_batch3_security.cjs`) was re-executed against `http://localhost:3001` and achieved **100% PASS** (35 passed, 0 failed).
