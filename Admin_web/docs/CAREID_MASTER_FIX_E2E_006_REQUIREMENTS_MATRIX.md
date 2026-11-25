# CAREID MASTER FIX E2E 006 — REQUIREMENTS TRACEABILITY MATRIX

**Project:** CAREID / HEALTH VAULT 360  
**Phase:** CAREID-MASTER-PENDING-FIX-AND-LIVE-E2E-006  
**Scope:** PRD / FSD & Change Requests CR-02 through CR-08  
**Date:** November 23, 2026  

---

## 1. Traceability & Verification Classification

| Requirement Ref | Requirement Description | UI Layer | API Layer | DB Table | Live Verification Status | Notes |
|---|---|---|---|---|---|---|
| **PRD 4.1** | Patient Health Vault & Clinical History | Doctor Web (`/patients/:id`) | `GET /patients/:id` | `patient_profiles`, `medical_records` | **FULLY VERIFIED** | Longitudinal record, chronic conditions, and documents visible and persistent. |
| **PRD 4.2** | Vitals & Encounter SOAP Tracking | Doctor Web (`/vitals`) | `POST/GET /encounters` | `encounters`, `vitals` | **FULLY VERIFIED** | BP, HR, BMI charting and SOAP note creation verified. |
| **PRD 4.3** | Prescription & Refill Management | Doctor Web (`/prescriptions`) | `POST /prescriptions` | `prescriptions`, `prescription_items` | **FULLY VERIFIED** | Prescription creation, refill authorization, and PDF export verified live. |
| **PRD 4.4** | Admin Facility & Staff Management | Admin Web (`/admin/facilities`) | `GET/POST /facilities` | `facilities`, `staff_members` | **FULLY VERIFIED** | Facility directory, department associations, and doctor mapping verified. |
| **PRD 4.5** | Multi-Role Access Control (RBAC) | Both Portals | Auth Guard & RolesGuard | `roles`, `user_roles` | **FULLY VERIFIED** | Admin, Doctor, and Vet role boundaries strictly enforced. |
| **CR-02** | Healthcare Financing Subsystem | Admin Web (`/admin/financing`) | `GET/PATCH /financing` | `financing_applications` | **FULLY VERIFIED** | Application review, discount management, and status transitions verified. |
| **CR-03** | Clinic Capacity & Slot Optimization | Admin Web (`/operations/capacity`) | `GET /schedules/capacity` | `doctor_schedule_slots` | **PARTIALLY VERIFIED** | Capacity grid and utilization tracking functional. Live AI model optimization engine is external dependency. |
| **CR-04** | Real-Time Appointment Synchronization | Both Portals | `GET/PATCH /appointments` | `appointments` | **FULLY VERIFIED** | Lifecycle states (CONFIRMED, ARRIVED, COMPLETED, CANCELLED) synchronized. |
| **CR-05** | Specialist Clinical Referral Network | Both Portals | `GET/POST /referrals` | `patient_referrals` | **FULLY VERIFIED** | Inter-facility referrals, status tracking, and notes synchronized. |
| **CR-06** | Bilateral Hospital EHR Integration | Both Portals | `GET /ehr/connectors` | `ehr_integration_configs` | **BLOCKED BY EXT DEP** | Connector dashboard and FHIR schema operational; live partner exchange requires partner hospital IT onboarding. |
| **CR-07** | Secure Clinical Chat & Templates | Doctor Web (`/chat`) | `GET/POST /conversations` | `conversations`, `chat_templates` | **FULLY VERIFIED** | Intra-clinic chat messaging and clinician template management functional. |
| **CR-08** | Prescription Pickup Reminder Engine | Doctor Web & Backend | Scheduler & Prescriptions API | `prescription_reminder_schedules`, `events`, `notifications` | **FULLY VERIFIED (OPTION A)** | Option A internal engine fully verified (First occurrence PASS, Second occurrence PASS, Collection stop PASS). External SMS/Push deferred. |
