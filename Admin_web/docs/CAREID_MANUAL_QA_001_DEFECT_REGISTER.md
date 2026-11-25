# CAREID MANUAL QA 001 — DEFECT REGISTER

**Project:** CAREID / HEALTH VAULT 360  
**Applications Audited:** Admin Web (`http://localhost:5174`) & Doctor Web (`http://localhost:5173`)  
**Backend:** NestJS API (`http://localhost:3001`)  
**Database:** PostgreSQL (`careid_integration_db` on port 5433)  
**Execution Phase:** CAREID-MASTER-MANUAL-QA-001  
**Date:** November 23, 2026  

---

## 1. Defect Summary by Severity

| Severity Level | Description | Active Count | Resolved Count | Status |
|---|---|---|---|---|
| **P0 (Critical)** | Critical security flaw, data corruption, or system-wide outage | 0 | 0 | **CLEAN** |
| **P1 (Major)** | Core approved clinical/administrative workflow completely broken | 0 | 0 | **CLEAN** |
| **P2 (Medium)** | Partial workflow failure or significant usability impedance | 0 | 0 | **CLEAN** |
| **P3 (Minor)** | Minor presentation, cosmetic, or non-blocking defect | 0 | 0 | **CLEAN** |
| **DEP (External)** | Contractual requirement blocked by external third-party/infrastructure | 3 | 0 | **BLOCKED (DOCUMENTED)** |

---

## 2. Active Defect Inventory

*(Zero active P0, P1, P2, or P3 software bugs discovered during manual testing campaign).*

All 64 executable manual test cases across Admin Web, Doctor Web, and Cross-Platform workflows passed with complete UI verification, HTTP 200/201 responses, and verified PostgreSQL data persistence.

---

## 3. External Dependencies & Platform Integration Blockers

### DEF-EXT-01: External Hospital EHR System Endpoint Provisioning (CR-06)
- **Requirement Reference:** Approved Change Request CR-06 (`Care ID_ CR Sheet.xlsx`) & PRD Section 5.0
- **Affected Applications:** Doctor Web (`/settings/ehr-sync`), Admin Web (`/admin/settings/integrations`), Backend (`ehr` module)
- **Classification:** External Infrastructure Dependency (BLOCKED)
- **Severity:** Informational / Contractual External Dependency
- **Current Behavior:** 
  The EHR connector interface and internal synchronization data models exist in the database and frontend settings dashboards. However, triggering live real-time bidirectional clinical sync is blocked because external partner hospital IT organizations (Epic/Cerner/Allscripts) have not yet provisioned production/staging FHIR server endpoints, client ID secrets, or mutual TLS (mTLS) certificates.
- **Expected Behavior:** 
  Live hospital EHR records synchronize automatically upon network establishment.
- **Remediation Recommendation:** 
  Coordinate with client IT leadership and partner hospital clinical informatics teams to issue staging endpoint URLs and OAuth2 client credentials during the pilot phase.

---

### DEF-EXT-02: Production SMS & Push Notification Gateway Selection (CR-08)
- **Requirement Reference:** Approved Change Request CR-08 (`Care ID_ CR Sheet.xlsx`)
- **Affected Applications:** Doctor Web (`/prescriptions`), Admin Web (`/admin/operations/prescriptions`), Backend (`prescription` module)
- **Classification:** External Third-Party Gateway Dependency (BLOCKED)
- **Severity:** Informational / External Delivery Channel Dependency
- **Current Behavior:** 
  Prescription creation with pickup reminder interval configuration, administrative pickup tracking, and immediate reminder suppression upon collection (`[PICKUP_REMINDER] {"enabled": false, "collected": true}`) is 100% implemented and verified in PostgreSQL. In the local integration sandbox, OTPs and messages are delivered via `test-support/sms-inbox`. The background automated daemon for recurring production SMS/Push notification dispatch requires client confirmation of external provider selection (e.g., Twilio vs AWS SNS vs Firebase Cloud Messaging).
- **Expected Behavior:** 
  Background cron dispatches live SMS/Push to patient phones at configured intervals until collected.
- **Remediation Recommendation:** 
  Client to designate preferred telecommunications gateway provider and inject API credentials into staging `.env`.

---

### DEF-EXT-03: Healthcare Financing Production Lending Gateway (CR-02)
- **Requirement Reference:** Approved Change Request CR-02 (`Care ID_ CR Sheet.xlsx`)
- **Affected Applications:** Admin Web (`/admin/financing`), Backend (`financing` module)
- **Classification:** External Financial Partner Dependency (BLOCKED)
- **Severity:** Informational / External Merchant Clearinghouse Dependency
- **Current Behavior:** 
  The complete financing application lifecycle, partner tiering (CareCredit, Bajaj, Arogya), KPI dashboards, and administrative underwriting status transitions (`UNDER_REVIEW` → `APPROVED`) are 100% functional and verified in PostgreSQL. Live credit bureau pull and fund disbursement require external merchant API credentials.
- **Expected Behavior:** 
  Automated credit decisioning via external banking partner APIs.
- **Remediation Recommendation:** 
  Configure live partner webhook endpoints once institutional underwriting contracts are formalized.

---

## 4. Historical Defect Remediation Record (Pre-QA Phase B Fixes)

For historical completeness, the following six (6) items discovered during baseline audit were remediated prior to QA testing and verified during this test campaign:
1. `GAP-ADM-01`: Administrative Prescription endpoints (`GET /api/v1/prescriptions`, `PATCH /api/v1/prescriptions/:id/collect`) — *Remediated & Verified PASS (TC-ADM-A14-01, TC-ADM-A14-02)*.
2. `GAP-ADM-02`: Financing application status update DTO parameter alignment (`notes`) — *Remediated & Verified PASS (TC-ADM-A9-02)*.
3. `GAP-ADM-03`: Financing dashboard paginated envelope unpacking (`res.data.data`) — *Remediated & Verified PASS (TC-ADM-A9-01)*.
4. `GAP-ADM-04`: Prescription pickup dashboard live API wiring — *Remediated & Verified PASS (TC-ADM-A14-01)*.
5. `GAP-ADM-05`: Staging administrative password hash synchronization — *Remediated & Verified PASS (TC-ADM-A1-01)*.
6. `GAP-ADM-06`: CMS promotional banner submission DTO schema compliance (`redirectUrl`, `PUBLISHED`) — *Remediated & Verified PASS (TC-ADM-A8-02)*.
