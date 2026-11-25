# CAREID VISIBLE LIVE E2E 005 — PENDING TASKS & ROADMAP

**Project:** CAREID / HEALTH VAULT 360  
**Phase:** CAREID-MASTER-VISIBLE-LIVE-E2E-005  
**Date:** November 23, 2026  

---

## 1. Summary of Remaining Work

Following complete visible UI functional verification, all approved in-scope Admin Web, Doctor Web, Shared Backend API, and Option A CR-08 features are **100% verified and operational**.

Zero application code defects were discovered. The only remaining tasks are external partner dependencies and non-blocking testing conveniences.

---

## 2. Pending Implementation Tasks Inventory

| Task ID | Task Title | Category | Owning Role / Workspace | Priority | External Dependency | Acceptance Criteria |
|---|---|---|---|---|---|---|
| **TASK-EXT-01** | Partner Hospital EHR Connectivity & VPN Setup | Integration / Ops | DevOps / Enterprise Integration | **P2 (Medium)** | Hospital IT endpoints & VPN credentials | Successful bidirectional FHIR/HL7 message exchange with live partner hospital endpoint. |
| **TASK-EXT-02** | External SMS & Push Notification Gateway Integration (CR-08 Option B) | Feature / Backend | Backend (`D:\careid\backend`) & Mobile | **P3 (Low)** | Twilio account credentials & Firebase Cloud Messaging project | When Option B is commissioned by client, wire internal notification dispatch to Twilio SMS and FCM push. |
| **TASK-QA-01** | Non-Production Test-Clock API Endpoint for Accelerated Recurrence Testing | QA Harness | Backend (`D:\careid\backend\src\modules\prescription`) | **P3 (Low)** | None (Internal) | A secure test-only endpoint `POST /api/v1/test/clock/advance` enabled strictly under `NODE_ENV === 'test'` to advance scheduler timestamp without manual delays. |

---

## 3. Workspaces & Ownership Boundaries

- **Developer 1 (Verified 100% Complete for Approved Web Scope):**
  - `D:\careid\backend`
  - `D:\careid\doctor_web`
  - `D:\careid\Admin_web`
- **Developer 2 (Mobile Apps):**
  - `CAREID_doctor_app` (Flutter)
  - `CAREID_patient_app` (Flutter)
- **External Partner IT:**
  - Production Hospital EHR systems (Cerner / Epic / FHIR endpoints).
