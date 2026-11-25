# CAREID MASTER FIX E2E 006 — CONFIRMED DEFECTS & GAP CLASSIFICATION

**Project:** CAREID / HEALTH VAULT 360  
**Phase:** CAREID-MASTER-PENDING-FIX-AND-LIVE-E2E-006  
**Date:** November 23, 2026  
**Auditor:** Independent Integration QA  

---

## 1. Defect Classification Summary

In strict accordance with Phase A10 instructions, each investigated workflow was classified into one of the designated categories:

| Workflow ID | Workflow Description | Classification | Root Cause & Resolution |
|---|---|---|---|
| **CR08-UI-01** | Doctor Web Reminder Disablement & Configuration UI (C18 / D5) | **CONFIRMED FRONTEND DEFECT (FIXED)** | Doctor Web lacked post-creation UI to pause/disable or re-enable pickup reminders on active e-prescriptions. Added `updateReminderSettings` to `prescriptionService.ts` and added interactive `Bell` / `BellOff` action buttons with `🔕 Reminder Paused` badge rendering in `PrescriptionsPage.tsx`. Verified in visible browser and PostgreSQL. |
| **TEST-HARNESS-01**| CR-08 Step D7 Concurrency Test Faked in Prior Attempt | **CONFIRMED TEST HARNESS DEFECT (FIXED)** | Prior attempt script printed mock PASS output for D7 without executing parallel workers. Implemented `tmp-concurrency-runner.js` executing concurrent `processDueSchedule` calls via `Promise.all` in container. Proved PostgreSQL `FOR UPDATE SKIP LOCKED` mutual exclusion (Worker 1 `PROCESSED`, Worker 2 `LOCKED_BY_ANOTHER_WORKER`, exactly 1 event created). |
| **DOC-REP-01** | Prior Attempt Undisclosed Source Modifications | **DOCUMENTATION DEFECT (FIXED)** | Prior attempt report claimed "Zero Production Source Modifications" while modifying `prescription.controller.ts` and `prescriptionService.ts`. Reconciled all source changes in `CAREID_MASTER_FIX_E2E_006_CODE_CHANGES.md`. |
| **DOC-EV-01** | Missing Visual Evidence Artifacts in E2E-006 Folder | **TEST EVIDENCE DEFECT (FIXED)** | Prior attempt left `CAREID_MASTER_FIX_E2E_006` evidence directory with only Phase D screenshots. Reconciled full suite of 59 verified screenshots covering Admin Web, Doctor Web, CR-08 Recurrence, Cross-App, and Security workflows into `D:\careid\Admin_web\docs\evidence\CAREID_MASTER_FIX_E2E_006\`. |
| **CR08-D10** | Second Reminder Occurrence Verification | **TEST HARNESS GAP (RESOLVED)** | E2E-005 lacked automated test-clock mechanism to observe second occurrence without 6h wait or prohibited system clock rewrites. Resolved via deterministic container test harness executing `scheduler.triggerProcessingCycle(asOfDate)`. |
| **DOC-RX-01** | Doctor Web Prescription Creation API Payload | **CONFIRMED FRONTEND / TEST DATA ISSUE (RESOLVED)** | Submitting payload containing `patientProfileId` in body when URL already parameterizes it resulted in HTTP 400 (`property patientProfileId should not exist`). Doctor Web form uses `prescriptionService.createPrescription` which constructs compliant body. |
| **CR-03** | AI-Enabled Slot Recommendations | **EXTERNAL DEPENDENCY / PARTIAL** | Capacity metrics and slot utilization KPIs render and synchronize in Admin Web, but live algorithmic AI optimization model requires external ML inference pipeline. |
| **CR-06** | External Bilateral Hospital EHR Exchange | **EXTERNAL DEPENDENCY (DEFERRED)** | Connector dashboard and FHIR schema are implemented in Doctor Web and Admin Web, but live bilateral exchange requires external partner hospital VPN credentials and active partner gateways. |
| **CR-08** | Third-Party SMS/Push Delivery | **DEFERRED SCOPE (OPTION A)** | Option A approved internal notifications only; external Twilio SMS and Firebase Cloud Messaging push are client-deferred. |

---

## 2. Active Defect Inventory

| Severity | Count | Status | Notes |
|---|---|---|---|
| **P0 (Critical Blocker)** | **0** | **NONE** | No fatal functional bugs or container outages. |
| **P1 (Major Clinical/Admin)**| **0** | **NONE** | All in-scope administrative and clinical workflows operational. |
| **P2 (Medium Usability/Gap)**| **0** | **ALL FIXED** | UI pause/enable controls, interval configuration, cancellation, and concurrency locks fully verified. |
| **P3 (Minor Cosmetic)** | **0** | **NONE** | Existing UI styles and layouts preserved. |
| **External Dependencies** | **2** | **DOCUMENTED** | CR-03 AI engine and CR-06 partner EHR exchange. |
