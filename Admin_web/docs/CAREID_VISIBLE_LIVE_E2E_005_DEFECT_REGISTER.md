# CAREID VISIBLE LIVE E2E 005 — DEFECT REGISTER

**Project:** CAREID / HEALTH VAULT 360  
**Phase:** CAREID-MASTER-VISIBLE-LIVE-E2E-005  
**Date:** November 23, 2026  
**Execution Mode:** QA Only (Zero Code Changes Permitted)  
**Status:** **ZERO ACTIVE APPLICATION DEFECTS**  

---

## 1. Defect Summary by Severity

| Severity Level | Description | Active Count | Closed Count | Status |
|---|---|---|---|---|
| **P0 (Critical)** | System-wide outage preventing live testing | 0 | 1 | **CLOSED (RESOLVED)** |
| **P1 (Major)** | Core approved clinical/administrative workflow broken | 0 | 0 | None identified in code |
| **P2 (Medium)** | Partial workflow break or significant usability issue | 0 | 0 | None identified in code |
| **P3 (Minor)** | Minor presentation, cosmetic, or non-blocking defect | 0 | 0 | None identified in code |
| **External Dependencies** | Deferred third-party integrations (EHR, SMS/Push) | 2 | 0 | **DEFERRED / EXTERNAL** |

---

## 2. Resolved Defect Inventory

### DEF-LIVE-01: Integration Docker Daemon Outage Preventing Live Container Connectivity
- **Defect ID:** `DEF-LIVE-01`
- **Requirement Reference:** Section 4 & Phase A (Environment Readiness Gate), CAREID-INFRA-RECOVERY-001
- **Portal / Layer:** Infrastructure / Windows Docker Desktop & WSL2 Engine
- **Severity:** **P0 — Critical Infrastructure Blocker**
- **Resolution:**
  - Windows Docker Desktop Engine v29.9.3 was restored and initialized.
  - WSL2 virtual disk (`docker_data.vhdx`) and PostgreSQL volume preserved with zero data loss.
  - All 4 integration containers (`careid-integration-backend`, `careid-integration-postgres`, `careid-integration-doctor-web`, `careid-integration-admin-web`) restored to healthy state.
  - Verified active network listeners on ports 3001, 5173, 5174, and 5433.
- **Status:** **CLOSED (VERIFIED IN LIVE ENVIRONMENT)**

---

## 3. External Dependencies & Deferred Scope

### DEP-EXT-01: External Hospital EHR Production Exchange (CR-06)
- **Status:** **BLOCKED BY EXTERNAL DEPENDENCY**
- **Details:** The EHR integration connector dashboard, audit log table, and FHIR data models are fully implemented and verified in Doctor Web (`/settings/ehr`) and Admin Web (`/admin/settings/integrations`). Live bilateral exchange with external hospital systems requires production VPN, hospital network credentials, and active partner EHR endpoints.

### DEP-EXT-02: Third-Party SMS & Push Notification Delivery (CR-08)
- **Status:** **DEFERRED BY CLIENT DECISION (OPTION A)**
- **Details:** Under approved Option A, the internal recurring reminder scheduler, database persistence, and collection cancellation are 100% complete and operational. External SMS gateways (Twilio) and Firebase Cloud Messaging (FCM) are intentionally deferred per client mandate.
