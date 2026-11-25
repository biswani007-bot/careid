# CAREID — API Verification Matrix

**Date:** November 10, 2026  
**Auditor:** Antigravity Senior Principal Backend Engineer  
**Collection:** `CareID-Staging.postman_collection.json` (576 Requests)

---

## 1. Verified Endpoints for Newly Implemented Stages

| Route Path | Method | Roles Permitted | Expected Status | Response Summary |
|---|---|---|---|---|
| `/api/v1/doctors/treatment-offers/:id/acceptance-certificate` | `GET` | DOCTOR, PRACTITIONER, ADMIN, SUPER_ADMIN, STAFF, FACILITY_ADMIN, PATIENT | 200 OK | Cryptographic certificate with SHA-256 verification hash |
| `/api/v1/treatment-offers/:id/acceptance-certificate` | `GET` | DOCTOR, PRACTITIONER, ADMIN, SUPER_ADMIN, STAFF, FACILITY_ADMIN, PATIENT | 200 OK | Identical cryptographic certificate for general access |
| `/api/v1/treatment-offers/:id/clearance` | `GET` | DOCTOR, PRACTITIONER, ADMIN, SUPER_ADMIN, STAFF, FACILITY_ADMIN | 200 OK | 5-domain clearance checklist (Cardiology, Anesthesia, Medical, Surgical, Lab) |
| `/api/v1/treatment-offers/:id/clearance` | `PUT` | DOCTOR, PRACTITIONER, ADMIN, SUPER_ADMIN, STAFF, FACILITY_ADMIN | 200 OK | Updated clearance object with auto-calculated overall status |
| `/api/v1/appointments/holds` | `POST` | DOCTOR, PRACTITIONER, ADMIN, SUPER_ADMIN, STAFF, FACILITY_ADMIN | 201 Created | Hold token with remaining seconds and 45-min TTL |
| `/api/v1/appointments/holds/:id` | `GET` | DOCTOR, PRACTITIONER, ADMIN, SUPER_ADMIN, STAFF, FACILITY_ADMIN | 200 OK | Hold status, remaining seconds, expiry indicator |
| `/api/v1/appointments/holds/:id` | `DELETE` | DOCTOR, PRACTITIONER, ADMIN, SUPER_ADMIN, STAFF, FACILITY_ADMIN | 200 OK | Released hold confirmation; slot returned to AVAILABLE |
| `/api/v1/appointments/:id/readiness` | `GET` | DOCTOR, PRACTITIONER, ADMIN, SUPER_ADMIN, STAFF, FACILITY_ADMIN | 200 OK | Fasting, meds, transport, consent, vitals, and GO decision |
| `/api/v1/appointments/:id/readiness` | `PATCH` | DOCTOR, PRACTITIONER, ADMIN, SUPER_ADMIN, STAFF, FACILITY_ADMIN | 200 OK | Updated checklist and clinical decision |
| `/api/v1/appointments/:id/check-in` | `POST` | STAFF, FACILITY_ADMIN, NURSE, ADMIN, SUPER_ADMIN, DOCTOR | 200 OK | Intake intake check-in; status set to IN_PROGRESS |
| `/api/v1/appointments/:id/cath-lab-checklist` | `GET` | DOCTOR, PRACTITIONER, ADMIN, SUPER_ADMIN, STAFF, FACILITY_ADMIN | 200 OK | WHO Sign-In, Time-Out, Sign-Out safety items |
| `/api/v1/appointments/:id/cath-lab-checklist` | `POST` | DOCTOR, PRACTITIONER, ADMIN, SUPER_ADMIN, STAFF, FACILITY_ADMIN | 200 OK | Updated WHO checklist verification |
| `/api/v1/encounters/:id/procedures` | `POST` | DOCTOR, PRACTITIONER, STAFF, ADMIN, SUPER_ADMIN | 201 Created | Documented procedural findings, device notes, and CPT code |
| `/api/v1/encounters/:id/hemodynamics` | `POST` | DOCTOR, PRACTITIONER, STAFF, ADMIN, SUPER_ADMIN | 201 Created | Documented hemodynamic vitals (BP, HR, SpO2, temp) |
| `/api/v1/cpt` | `GET` | Public / Authenticated | 200 OK | Paginated CPT list with category filtering |
| `/api/v1/cpt/search` | `GET` | Public / Authenticated | 200 OK | CPT keyword/code search results |
| `/api/v1/cpt/:code` | `GET` | Public / Authenticated | 200 OK | Detailed CPT code, RVU units, and descriptions |
| `/api/v1/facilities/:facilityId/chargemaster` | `GET` | Public / Authenticated | 200 OK | Complete facility procedure pricing schedule |

---

## 2. Defect Verification Matrix

| Endpoint | Prior Behavior | Verified Post-Fix Behavior |
|---|---|---|
| `GET /api/v1/doctors/patients` | Throws HTTP 500 when patient date is null or consent subquery encounters an unhandled rejection | Safely sanitizes timestamps, catches consent query errors gracefully, and returns HTTP 200 with complete patient records |
| `POST /api/v1/appointments` with `treatmentOfferId` | Ignored `treatmentOfferId` parameter | Validates and associates treatment proposal, recording offer linkage in appointment notes |

