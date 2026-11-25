# CAREID MASTER FIX E2E 006 — BASELINE ENVIRONMENT & PRE-FLIGHT AUDIT

**Project:** CAREID / HEALTH VAULT 360  
**Phase:** CAREID-MASTER-PENDING-FIX-AND-LIVE-E2E-006  
**Execution Mode:** Baseline Audit & Environmental Verification  
**Date:** November 23, 2026  
**Status:** **ENVIRONMENT READY & STABLE**

---

## 1. Integration Environment Status (A01 - A06)

The integration test environment was verified prior to executing browser automation and lifecycle tests:

| Service | Container Name | Port | Health Status | Verification Method |
|---|---|---|---|---|
| **NestJS Backend** | `careid-integration-backend` | `3001` (internal `3000`) | **HEALTHY** | HTTP GET `/api/v1/health` (HTTP 200) |
| **Doctor Web** | `careid-integration-doctor-web` | `5173` (internal `80`) | **HEALTHY** | HTTP GET `http://localhost:5173/` |
| **Admin Web** | `careid-integration-admin-web` | `5174` (internal `80`) | **HEALTHY** | HTTP GET `http://localhost:5174/` |
| **PostgreSQL DB** | `careid-integration-postgres` | `5433` (internal `5432`) | **HEALTHY** | `pg_isready -U careid_test_user` |

- **Docker Version:** Docker Engine v29.9.3
- **Development Environment Protected:** Dev port 3000 and Dev PostgreSQL port 5432 were completely untouched.
- **Data Volumes Protected:** Volume `careid_integration_postgres_data` preserved with zero resets or data deletion.
- **Flutter Codebase Protected:** Zero modifications made to `CAREID_doctor_app` or `CAREID_patient_app`.
- **System Downloads Protected:** Zero access to `C:\Users\biswa\Downloads`.

---

## 2. PostgreSQL Migration History (A03)

Migration state in `_prisma_migrations` confirms all 9 migrations successfully finished:
1. `0_init` (2026-11-19 13:41:56 UTC)
2. `20261030113000_consent_and_referral_clinical_authorization` (2026-11-19 13:41:56 UTC)
3. `20261030123000_appointment_module_and_state_machine` (2026-11-19 13:41:56 UTC)
4. `20261106110000_treatment_offers_subsystem` (2026-11-19 13:41:56 UTC)
5. `20261106120000_atomic_offer_sequences` (2026-11-19 13:41:56 UTC)
6. `20261106140000_financing_applications_persistence` (2026-11-19 13:41:56 UTC)
7. `20261114120000_doctor_app_core_clinical_subsystems` (2026-11-19 13:41:57 UTC)
8. `20261119213500_pet_records_and_persistence` (2026-11-19 16:03:39 UTC)
9. `20261123120000_cr08_prescription_pickup_reminder_engine` (2026-11-23 06:51:36 UTC)

---

## 3. Baseline Database Entity Counts (A04)

Prior to test executions, the baseline record count was recorded:
- Users: 39
- Doctor Profiles: 18
- Patient Profiles: 12
- Facilities: 9
- Prescriptions: 32
- Reminder Schedules: 24
- Reminder Events: 34
- Appointments: 6
- Patient Referrals: 6
- Financing Applications: 1
- Audit Logs: 1,136

---

## 4. Authorized QA Test Credentials (A05)

| Role | Synthetic Phone | Email | Verified Identity |
|---|---|---|---|
| **Super Admin** | `+16505550001` | `superadmin@careid.test` | System Super Administrator |
| **Admin** | `+16505550002` | `admin@careid.test` | Compliance & Operations Admin |
| **Human Doctor** | `+16505550003` | N/A | Dr. Sarah Jenkins, MD (Cardiology) |
| **Veterinary Doctor** | `+16505555120` | `dr.emily.thorne.1795097606707@careid.test` | Dr. Emily Thorne, DVM (Veterinary) |
| **QA Patient** | N/A | N/A | John Doe (`pat-uuid-001` / `3896bc97-...`) |

---

## 5. Chrome Graphical Browser Verification (A06)

Real Google Chrome browser execution was confirmed via Puppeteer running with `headless: false`:
- **Binary:** `C:\Program Files\Google\Chrome\Application\chrome.exe`
- **Viewport:** 1440x900
- **Verification Evidence:** `D:\careid\Admin_web\docs\evidence\CAREID_MASTER_FIX_E2E_006\d01_01_prescriptions_page.png`
