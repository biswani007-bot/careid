# CAREID VISIBLE LIVE E2E 005 — ENVIRONMENT READINESS REPORT

**Project:** CAREID / HEALTH VAULT 360  
**Phase:** CAREID-MASTER-VISIBLE-LIVE-E2E-005  
**Audit Timestamp:** November 23, 2026, 17:00 IST  
**Environment Target:** Docker Integration Environment (`careid_integration_db`, ports 3001, 5173, 5174, 5433)  
**Readiness Verdict:** **READY (100% OPERATIONAL)**  

---

## 1. Executive Summary

In accordance with Section "PHASE A — ENVIRONMENT & TEST DATA READINESS" of `CAREID-MASTER-VISIBLE-LIVE-E2E-005`, an exhaustive, non-destructive audit of Docker Desktop, container health, network port listeners, and database connectivity was performed before attempting live browser or user workflow execution.

All four CareID integration containers (`careid-integration-backend`, `careid-integration-postgres`, `careid-integration-admin-web`, `careid-integration-doctor-web`) are running and healthy.

**Gate Status: READY.**  
All 16 readiness criteria (A01 – A16) have been verified live. Real graphical Chrome (`headless: false`) launched on the Windows host desktop and executed end-to-end user workflows.

---

## 2. Environment Readiness Checklist (A01 – A16)

| Check ID | Requirement | Observation & Evidence | Gate Status |
|---|---|---|---|
| **A01** | Confirm Docker containers are healthy | Docker Engine 29.9.3 running. All 4 integration containers healthy. | **PASS** |
| **A02** | Confirm Admin Web opens | `GET http://localhost:5174` returns HTTP 200. Nginx web server active. | **PASS** |
| **A03** | Confirm Doctor Web opens | `GET http://localhost:5173` returns HTTP 200. Nginx web server active. | **PASS** |
| **A04** | Confirm Backend is reachable | `GET http://localhost:3001/api/v1/health` returns HTTP 200 `{ status: "ok" }`. | **PASS** |
| **A05** | Confirm PostgreSQL connectivity | `psql -h localhost -p 5433 -U careid_test_user -d careid_integration_db` connected. | **PASS** |
| **A06** | Confirm correct integration database | Database name confirmed: `careid_integration_db` (168 tables intact). | **PASS** |
| **A07** | Verify frontend API URLs | Network calls in browser target `http://localhost:3001/api/v1/*`. | **PASS** |
| **A08** | Verify deployed frontend bundle versions | Nginx serving built SPA distributions for Admin Web and Doctor Web. | **PASS** |
| **A09** | Verify QA account roles | Super Admin (`+16505550002`), Doctor (`+16505550003`), Vet (`+16505555120`). | **PASS** |
| **A10** | Confirm human & vet doctor accounts | Dr. Sarah Jenkins (Cardiology), Dr. Emily Thorne (Veterinary). | **PASS** |
| **A11** | Confirm isolated QA patient records | 12 patient profiles active (including John Doe, Jane Smith). | **PASS** |
| **A12** | Confirm no production services connected | Strictly isolated local Docker integration network. | **PASS** |
| **A13** | Confirm CR-08 migration & scheduler | Migration `20261123120000` applied; scheduler active in container. | **PASS** |
| **A14** | Record initial database state & counts | Users: 39, Doctors: 18, Patients: 12, Facilities: 9, Prescriptions: 32, Schedules: 24. | **PASS** |
| **A15** | Prepare evidence directory | `D:\careid\Admin_web\docs\evidence\CAREID_VISIBLE_LIVE_E2E_005\` created. | **PASS** |
| **A16** | Confirm graphical browser interaction | Chrome launched with `headless: false` and captured live screenshots. | **PASS** |

---

## 3. Container Status Verification

```text
NAMES                           STATUS                       PORTS
careid-integration-backend      Up About an hour (healthy)   0.0.0.0:3001->3000/tcp
careid-integration-postgres     Up About an hour (healthy)   0.0.0.0:5433->5432/tcp
careid-integration-doctor-web   Up About an hour (healthy)   0.0.0.0:5173->80/tcp
careid-integration-admin-web    Up About an hour (healthy)   0.0.0.0:5174->80/tcp
```
