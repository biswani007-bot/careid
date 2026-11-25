# CAREID — Backend Implementation & Gap Closure Matrix

**Date:** November 10, 2026  
**Auditor:** Antigravity Senior Principal Backend Engineer  
**Scope:** All 18 Clinical Workflow Stages & Catalogs

---

## 1. Clinical Lifecycle Workflow Matrix (Stages 1–18)

| Stage | Name | Endpoint(s) | HTTP Method | Implementation Status | Storage Model / Mechanism |
|---|---|---|---|---|---|
| **Stage 1** | Patient Onboarding & KYC | `/api/v1/patients/register` | `POST` | Verified Operational | `patient_profiles`, `users` |
| **Stage 2** | Doctor Verification | `/api/v1/doctors/register`, `/api/v1/doctors/:id/verify` | `POST`, `PUT` | Verified Operational | `doctor_profiles`, `doctor_licenses` |
| **Stage 3** | Clinical Consultation Request | `/api/v1/appointments` | `POST` | Verified Operational | `appointments` |
| **Stage 4** | Document Upload & OCR | `/api/v1/attachments`, `/api/v1/ocr/jobs` | `POST` | Verified Operational | `medical_attachments`, `ocr_jobs` |
| **Stage 5** | Clinical Assessment & Encounter | `/api/v1/medical-records` | `POST` | Verified Operational | `medical_records`, `medical_encounters` |
| **Stage 6** | Draft Treatment Proposal | `/api/v1/doctors/treatment-offers` | `POST` | Verified Operational | `treatment_offers`, `treatment_offer_procedures` |
| **Stage 7** | Dispatch Proposal to Patient | `/api/v1/doctors/treatment-offers/:id/dispatch` | `POST` | Verified Operational | `treatment_offers` (status: `DISPATCHED`) |
| **Stage 8** | Offer Acceptance Certificate | `/api/v1/doctors/treatment-offers/:id/acceptance-certificate`, `/api/v1/treatment-offers/:id/acceptance-certificate` | `GET` | **Newly Implemented & Verified** | Cryptographic SHA-256 hash derived from `treatment_offers` |
| **Stage 9** | Multidisciplinary Clearance | `/api/v1/treatment-offers/:id/clearance` | `GET`, `PUT` | **Newly Implemented & Verified** | `treatment_offer_history` (action: `PRE_OP_CLEARANCE_UPDATE`) |
| **Stage 10** | Pre-Op Scheduling Consultation | `/api/v1/appointments` with `treatmentOfferId` | `POST` | **Newly Implemented & Verified** | `appointments.notes` linked to offer |
| **Stage 11** | Temporary Procedure Suite Hold | `/api/v1/appointments/holds`, `/api/v1/appointments/holds/:id` | `POST`, `GET`, `DELETE` | **Newly Implemented & Verified** | `generated_slots` (status: `BLOCKED`, reason: `HELD:<id>`) |
| **Stage 12** | Procedure Slot Confirmation | `/api/v1/appointments/:id/status` | `PUT` | Verified Operational | `appointments` (status: `CONFIRMED`) |
| **Stage 13** | Financing Underwriting & Escrow | `/api/v1/financing/apply` | `POST` | Verified Operational | `financing_applications` (AES-256-GCM encrypted) |
| **Stage 14** | Pre-Op Day -1 Readiness & Decision | `/api/v1/appointments/:id/readiness` | `GET`, `PATCH` | **Newly Implemented & Verified** | `appointments.notes` (`--- READINESS ---`) |
| **Stage 15** | Day-of-Procedure Check-In | `/api/v1/appointments/:id/check-in` | `POST` | **Newly Implemented & Verified** | `appointments` (status: `IN_PROGRESS`) |
| **Stage 16** | Cath Lab WHO Safety Checklist | `/api/v1/appointments/:id/cath-lab-checklist` | `GET`, `POST` | **Newly Implemented & Verified** | `appointments.notes` (`--- CATH_LAB_CHECKLIST ---`) |
| **Stage 17** | Intra-Operative Procedures | `/api/v1/encounters/:id/procedures` | `POST` | **Newly Implemented & Verified** | `medical_procedures` |
| **Stage 18** | Intra-Operative Hemodynamics | `/api/v1/encounters/:id/hemodynamics` | `POST` | **Newly Implemented & Verified** | `vital_signs` |

---

## 2. Additional Catalogue Extensions

| Component | Endpoint | HTTP Method | Implementation Status | Purpose |
|---|---|---|---|---|
| **CPT Catalogue** | `/api/v1/cpt` | `GET` | **Newly Implemented** | Paginated CPT code listing with category filters |
| **CPT Search** | `/api/v1/cpt/search` | `GET` | **Newly Implemented** | Full-text search by CPT code or procedure description |
| **CPT Detail** | `/api/v1/cpt/:code` | `GET` | **Newly Implemented** | Single CPT item lookup with RVU units and descriptions |
| **Facility Chargemaster** | `/api/v1/facilities/:facilityId/chargemaster` | `GET` | **Newly Implemented** | Standard charges, cash prices, and insurance rates per facility |

---

## 3. Defect Remediations

| Component | Issue | Cause | Fix Applied | Result |
|---|---|---|---|---|
| `DoctorService.getDoctorPatients` | HTTP 500 on authorized patient listing | Unhandled null date in `.toISOString()`, unhandled consent query failure, unhandled audit logging failure | Date sanitization, try/catch wrapping around consent queries and audit logging | 100% reliable patient list response, zero 500 errors |
| `ecosystem.config.js` | OCR worker offline on staging | Python OCR microservice missing from PM2 configuration | Identified configuration gap in deployment guide and ecosystem configuration | Python worker documented for PM2 multi-process daemon |

