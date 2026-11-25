# CAREID PENDING CLOSURE 007 — BASELINE & ENVIRONMENT AUDIT REPORT

**Project:** CAREID / HEALTH VAULT 360  
**Phase:** CAREID-MASTER-PENDING-CLOSURE-LIVE-E2E-007  
**Execution Date:** November 23, 2026  
**Auditor / Runner:** Antigravity Autonomous Integration Agent  

---

## 1. Environment Topology & Health Verification

All integration services run under Docker Desktop Compose (`docker-compose.integration.yml`):

| Container Name | Service Name | Internal Port | Exposed Host Port | Status | Healthcheck Response |
|---|---|---|---|---|---|
| `careid-integration-postgres` | PostgreSQL 16 | 5432 | `localhost:5433` | Healthy | `pg_isready -U careid_test_user -d careid_integration_db` (OK) |
| `careid-integration-backend` | NestJS API | 3000 | `localhost:3001` | Healthy | `curl http://localhost:3000/api/v1/health` (HTTP 200 OK) |
| `careid-integration-doctor-web` | Doctor Web (Vite/Nginx) | 80 | `localhost:5173` | Healthy | `wget -q -O /dev/null http://127.0.0.1:80/` (HTTP 200 OK) |
| `careid-integration-admin-web` | Admin Web (Vite/Nginx) | 80 | `localhost:5174` | Healthy | `wget -q -O /dev/null http://127.0.0.1:80/` (HTTP 200 OK) |

**Isolation Rules Verified:**
- Development Backend on port 3000 and PostgreSQL on port 5432 remained 100% untouched.
- Real clinical production records and external phone numbers remained untouched.
- `C:\Users\biswa\Downloads` untouched.
- Flutter mobile apps (`CAREID_doctor_app`, `CAREID_patient_app`) untouched.

---

## 2. Test Credentials & Isolated QA Fixtures

| Role | Name | Phone | User ID | Specific Clinical Entity ID |
|---|---|---|---|---|
| Super Admin | CareID Super Administrator | `+16505550002` | `eff36819-1c8a-4209-b97c-8746d461215b` | Admin Role: `['ADMIN', 'SUPER_ADMIN']` |
| Human Doctor | Dr. Sarah Jenkins, MD | `+16505550003` | `5cb9e3a5-6dab-4757-9143-524e317c1aaa` | Doctor Profile: `771bee09-3092-4599-9e76-fc31f97f7d05` (Cardiology) |
| Vet Doctor | Dr. Emily Thorne, DVM | `+16505555120` | `12fcede7-9f0c-45d3-bd30-26b9104df134` | Doctor Profile: `ef13c89d-abd8-4d71-9042-b3b609267d9d` (Veterinary Medicine) |
| Synthetic Patient | John Doe | `+16505550100` | `usr-pat-john-doe` | Patient Profile: `3896bc97-bd3b-40ae-80c1-0cc0455ca3a4` |

---

## 3. Database State Baseline

At test inception against `careid_integration_db`:
- `users`: 39 accounts
- `doctor_profiles`: 18 clinicians
- `patient_profiles`: 12 patients
- `facilities`: 9 medical and veterinary centres
- `appointments`: 6 bookings
- `patient_referrals`: 6 clinical referrals
- `financing_applications`: 1 active application
- `prescriptions`: 34 electronic prescriptions
- `prescription_reminder_schedules`: 29 durable schedules
- `prescription_reminder_events`: 39 delivery events
- `notifications`: 68 internal notifications
- `audit_logs`: 1,295 audit entries
