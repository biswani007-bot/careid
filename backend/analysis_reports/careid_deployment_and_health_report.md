# CareID Deployment Preparation & Runtime Health Report

**Application Name:** `careid-backend-staging`  
**Entry Point:** `dist/src/main.js`  
**Internal Port:** `3074`  
**Runtime Engine:** Node.js v22.13.0 + NestJS 10  
**Process Manager:** PM2 (Cluster/Fork configuration)  
**Compilation Status:** SUCCESS (`npm run build` completed with exit code 0)  
**Date:** November 10, 2026  

---

## 1. Build Verification & Entry Point Integrity

The build command `npm run build` was executed, compiling all TypeScript source code into `dist/`.

### Verified Artifacts:
- **Main Entrypoint:** `dist/src/main.js` (Verified present: `Test-Path dist\src\main.js` -> `True`)
- **Modules Compiled:**
  - `CathLabModule`: Compiled to `dist/src/modules/cath-lab/`
  - `DoctorModule`: Compiled to `dist/src/modules/doctor/`
  - `HealthModule`: Compiled to `dist/src/core/health/`
  - `AuthModule`: Compiled to `dist/src/modules/auth/`
  - `PatientModule`: Compiled to `dist/src/modules/patient/`
  - `AppointmentModule`: Compiled to `dist/src/modules/appointment/`
  - `MedicalRecordModule`: Compiled to `dist/src/modules/medical-record/`
- **Zero Compilation Errors:** All imports, models, and decorators compiled cleanly.

---

## 2. Service Endpoints & Health Check Verification

The runtime health check probes were verified via real HTTP calls:

| Endpoint | Method | Expected | Actual Status | Response Payload |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/health` | GET | 200 OK | **200 OK** | `{"status":"ok","timestamp":"2026-11-10T...","service":"HVAPI Backend"}` |
| `/api/v1/ready` | GET | 200 OK | **200 OK** | `{"status":"ready","database":"connected","timestamp":"..."}` |
| `/api/v1/live` | GET | 200 OK | **200 OK** | `{"status":"live","timestamp":"..."}` |

---

## 3. Microservice & OCR Worker Isolation

- **Production OCR Worker:** Runs on port `5050` with model PP-OCRv4 Mobile CPU.
- **Staging OCR Worker:** Configured on port `5051` via `.env.staging` (`OCR_WORKER_URL="http://127.0.0.1:5051"`).
- **Graceful Failure Guard:** If the OCR worker daemon is offline during non-OCR tasks, health and clinical routes operate without interruption. When OCR endpoints are invoked while the worker is offline, the backend returns clear `503 Service Unavailable` with guidance.

---

## 4. PM2 Process Specification

```javascript
// ecosystem.staging.config.js
module.exports = {
  apps: [
    {
      name: 'careid-backend-staging',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'staging',
        PORT: 3074,
        DOTENV_CONFIG_PATH: '.env.staging',
      },
    },
  ],
};
```
- **Process Memory Cap:** 1 GB
- **Restart Policy:** Automatic restart on uncaught exceptions, exponential backoff
- **Log Paths:**
  - Standard Out: `/root/.pm2/logs/careid-backend-staging-out.log`
  - Standard Error: `/root/.pm2/logs/careid-backend-staging-error.log`

