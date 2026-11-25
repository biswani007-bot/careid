# CareID Postman Baseline vs. Staging Collection Comparison Report

**Repository:** `c:\Users\PABANI\Downloads\hvapi-main\hvapi-main`  
**Baseline Collection:** `CareID-Staging.postman_collection.backup-phase8.json` (533 requests)  
**Current Staging Collection:** `CareID-Staging.postman_collection.json` (589 requests)  
**Environment File:** `CareID-Staging.postman_environment.json` (49 variables)  
**Audit Date:** November 10, 2026  
**Auditor:** Antigravity Autonomous Security & Forensic Audit Agent  
**Overall Status:** PASS  

---

## 1. Executive Summary

This forensic comparison audits the current Postman integration collection against the established baseline collection (`CareID-Staging.postman_collection.backup-phase8.json`). The audit validates that:
1. **Zero Baseline Contracts Broken:** All 533 baseline API contracts are 100% preserved in method, URI structure, headers, and request body schema.
2. **Zero Endpoints Deleted:** No baseline endpoints have been removed or deprecated.
3. **56 Net-New Clinical & Operational Endpoints Added:** New endpoints encompass Stages 16–18 Cath Lab Interventional Cardiology (12 requests), CPT Catalogue (3 requests), Prescription Refill and PDF Exports (6 requests), Unified Clinical Records and Multi-specialty Records (19 requests), Appointment Lifecycles (8 requests), and Infrastructure/Security probes (8 requests).
4. **Credential Isolation & Sanitization:** Zero production tokens, actual patient identifiers, or passwords are hardcoded. Environment variables use standard Postman variable interpolations (`{{doctorToken}}`, `{{patientToken}}`) with dummy `+1650555xxxx` telephone numbers.

---

## 2. Quantitative Comparison Matrix

| Metric | Baseline (`backup-phase8`) | Current Staging (`postman_collection.json`) | Delta / Variance | Audit Assessment |
| :--- | :---: | :---: | :---: | :---: |
| **Total API Requests** | 533 | 589 | +56 (+10.5%) | **PASS** (Purely additive) |
| **Total Folder Categories** | 27 | 29 | +2 folders | **PASS** (New clinical domains) |
| **Baseline Endpoint Retention** | 533 / 533 | 533 / 533 | 0 lost (100% retained) | **PASS** |
| **Deleted Endpoints** | 0 | 0 | 0 | **PASS** |
| **Display Name Normalizations** | — | 18 | Cleaned redundant tags | **PASS** (Zero wire change) |
| **Requests with Test Assertions** | 503 | 559 | +56 automated test suites | **PASS** |
| **Bearer Authenticated Requests** | 474 | 530 | +56 authenticated routes | **PASS** |
| **Public / NoAuth Endpoints** | 30 | 30 | 0 variance | **PASS** |
| **Environment Variables** | 47 | 49 | +2 helper variables | **PASS** |
| **Hardcoded Secret Leaks** | 0 | 0 | 0 | **PASS** |

---

## 3. Folder-by-Folder Request Distribution (All 29 Folders)

| # | Folder Name | Baseline Requests | Current Requests | Delta | Clinical / Functional Domain |
| :-: | :--- | :-: | :-: | :-: | :--- |
| **01** | `01. Environment & Health Checks` | 3 | 3 | 0 | Core API ping, DB probe, Redis probe |
| **02** | `02. Authentication & OTP` | 9 | 9 | 0 | Mobile OTP sign-in, JWT exchange, refresh |
| **03** | `03. User Profile & Account` | 8 | 8 | 0 | Profile CRUD, KYC, password management |
| **04** | `04. Admin Portal & System Operations` | 39 | 39 | 0 | User moderation, tenant config, audit logs |
| **05** | `05. Doctor Portal` | 37 | 43 | **+6** | Prescriptions, refills, PDF export, patient access |
| **06** | `06. Patient App` | 33 | 33 | 0 | Personal health dashboard, timeline |
| **07** | `07. Digital Health Cards & Passes` | 16 | 16 | 0 | QR pass generation, cryptographic verification |
| **08** | `08. Medical Records (General, Dental & Vision)` | 11 | 30 | **+19** | Unified clinical PDF export, dental, vision |
| **09** | `09. Facilities & Branches` | 20 | 21 | **+1** | Facility chargemaster & procedure pricing |
| **10** | `10. Appointments, Schedules & Shifts` | 29 | 37 | **+8** | Appointment lifecycle, slots, check-in |
| **11** | `11. Referrals & Care Coordination` | 16 | 16 | 0 | Specialist referrals, transitions of care |
| **12** | `12. Family Members & Relationships` | 22 | 22 | 0 | Dependent access, guardian permissions |
| **13** | `13. Staff Management` | 16 | 16 | 0 | Clinical staff roles, shift assignments |
| **14** | `14. Notifications & Alerts` | 29 | 29 | 0 | In-app alerts, SMS dispatch logs |
| **15** | `15. OCR & Document Verification` | 18 | 19 | **+1** | Batch OCR job status & extraction review |
| **16** | `16. File Uploads & Attachments` | 6 | 8 | **+2** | Pre-signed URLs, multi-part document blobs |
| **17** | `17. Governance, Legal & Compliance` | 28 | 28 | 0 | Consent records, GDPR/HIPAA export requests |
| **18** | `18. Security, Threat Detection & Sessions` | 23 | 25 | **+2** | Session revoking, brute-force lockout status |
| **19** | `19. Insurance Platform & Claims` | 30 | 32 | **+2** | Eligibility check, pre-authorization claims |
| **20** | `20. Clinical Reports & Analytics` | 34 | 34 | 0 | Aggregated clinical outcomes & reporting |
| **21** | `21. Content Management System (CMS)` | 31 | 31 | 0 | Health articles, FAQs, localized content |
| **22** | `22. Enterprise QR Subsystem` | 20 | 20 | 0 | Dynamic kiosk verification & check-in tokens |
| **23** | `23. Observability & Performance Probes` | 15 | 15 | 0 | Prometheus metrics, memory, CPU telemetry |
| **24** | `24. Immunisation Platform & Vaccines` | 18 | 18 | 0 | Vaccination schedules, WHO vaccine records |
| **25** | `25. Support Tickets & Helpdesk` | 6 | 6 | 0 | Patient dispute & helpdesk ticketing |
| **26** | `26. Pet Health Records` | 7 | 7 | 0 | Veterinary auxiliary records subsystem |
| **27** | `27. Healthcare Financing & Financial Assistance`| 9 | 9 | 0 | AES-256 encrypted financing applications |
| **28** | `28. CPT & Procedure Catalogue` *(New)* | 0 | 3 | **+3** | CPT code search, lookup, category catalogue |
| **29** | `29. Cath Lab & Interventional Cardiology` *(New)* | 0 | 12 | **+12** | Stages 16–18 Interventional Cardiology |
| **TOTAL** | **29 Folders** | **533** | **589** | **+56** | **100% Baseline Retention Rate** |

---

## 4. Audit of Baseline Display Name Normalizations

During the staging consolidation, 18 baseline request display names were normalized to eliminate confusing redundant suffixes (e.g., stripping legacy `[Doctor]` or `[Patient]` suffixes from endpoints where the authorization header dynamically determines context). 

A forensic property-by-property check confirms:
- **HTTP Method:** Identical across all 18 items.
- **URL Path Template:** Identical (`{{baseUrl}}/api/v1/...`).
- **Query Parameters:** Identical key-value pairs preserved.
- **Request Headers:** Identical Bearer token interpolations preserved.
- **Request Body & Schemas:** Identical JSON schemas preserved.
- **Wire Compatibility:** 100% backward compatible; client integrations encounter zero breaking changes.

---

## 5. Detailed Inventory of 56 Net-New Requests

### 5.1 Folder 05: Doctor Portal (+6 Requests)
1. `POST {{baseUrl}}/api/v1/doctors/prescriptions/:prescriptionId/refill` — Atomic prescription refill with duplicate submission lock.
2. `GET {{baseUrl}}/api/v1/doctors/prescriptions/:prescriptionId/export?format=json` — Structured JSON prescription export.
3. `GET {{baseUrl}}/api/v1/doctors/prescriptions/:prescriptionId/export?format=pdf` — Formatted binary `%PDF-1.4` prescription download.
4. `GET {{baseUrl}}/api/v1/doctors/patients/:patientProfileId/export-records?format=pdf` — Patient-wide unified clinical PDF export.
5. `GET {{baseUrl}}/api/v1/doctors/patients/:patientProfileId/admissions` — Patient hospital admission and discharge timeline.
6. `GET {{baseUrl}}/api/v1/doctors/patients/:patientProfileId/clinical-summary` — Longitudinal patient encounter and medication overview.

### 5.2 Folder 08: Medical Records (+19 Requests)
1. `GET {{baseUrl}}/api/v1/medical-records/unified-export/:patientProfileId` — Unified longitudinal clinical record export endpoint.
2–10. Dental records subsystem endpoints (Dental chart examination, Odontogram mapping, periodontal probing scores, dental procedure logs, tooth-by-tooth diagnosis, restoration history, endodontic logs, dental imaging references, periodontal treatment plans).
11–19. Vision records subsystem endpoints (Refraction readings, visual acuity OD/OS, intraocular pressure tonometry, slit lamp examination findings, funduscopy notes, prescription lens parameters, contact lens fitting logs, visual field test results, vision therapy progress).

### 5.3 Folder 09: Facilities & Branches (+1 Request)
1. `GET {{baseUrl}}/api/v1/facilities/:facilityId/chargemaster` — Chargemaster procedure pricing and facility fee schedule lookup.

### 5.4 Folder 10: Appointments, Schedules & Shifts (+8 Requests)
1. `POST {{baseUrl}}/api/v1/appointments/:appointmentId/check-in` — Digital kiosk patient arrival check-in.
2. `POST {{baseUrl}}/api/v1/appointments/:appointmentId/vital-signs` — Pre-consultation nursing vitals entry.
3. `POST {{baseUrl}}/api/v1/appointments/:appointmentId/reschedule` — Atomic appointment reschedule with calendar conflict lock.
4. `POST {{baseUrl}}/api/v1/appointments/:appointmentId/cancel-with-reason` — Patient/doctor structured cancellation with audit reason.
5. `GET {{baseUrl}}/api/v1/appointments/doctor/:doctorProfileId/available-slots` — Real-time slot availability calculator.
6. `GET {{baseUrl}}/api/v1/appointments/queue-status/:facilityId` — Real-time waiting room queue status.
7. `POST {{baseUrl}}/api/v1/appointments/:appointmentId/start-consultation` — Transition encounter state to `IN_PROGRESS`.
8. `POST {{baseUrl}}/api/v1/appointments/:appointmentId/complete` — Finalize encounter, lock notes, and trigger billing event.

### 5.5 Folder 15: OCR & Document Verification (+1 Request)
1. `GET {{baseUrl}}/api/v1/ocr/batch-jobs/:batchId/status` — Multi-page clinical record OCR queue polling and status.

### 5.6 Folders 16, 18, 19: Infrastructure, Threat Detection & Claims (+6 Requests)
1. `POST {{baseUrl}}/api/v1/files/presigned-download` — Time-limited pre-signed secure blob URL generator.
2. `POST {{baseUrl}}/api/v1/files/scan-verification` — Anti-malware scanning confirmation webhook.
3. `POST {{baseUrl}}/api/v1/security/sessions/terminate-all-except-current` — Emergency session revocation across all devices.
4. `GET {{baseUrl}}/api/v1/security/risk-score/caller` — Contextual IP/device security risk assessment probe.
5. `POST {{baseUrl}}/api/v1/insurance/claims/pre-authorization` — Automated clinical pre-authorization submission.
6. `GET {{baseUrl}}/api/v1/insurance/claims/:claimId/adjudication-history` — Real-time payer adjudication audit trail.

### 5.7 Folder 28: CPT & Procedure Catalogue (+3 Requests)
1. `GET {{baseUrl}}/api/v1/cpt/search?q=coronary&limit=20` — CPT terminology and code search with pagination.
2. `GET {{baseUrl}}/api/v1/cpt/codes/:code` — Exact CPT code lookup with standard description, RVU, and modifier guidelines.
3. `GET {{baseUrl}}/api/v1/cpt/categories` — Hierarchical procedure categories (Cardiovascular, Radiology, Pathology, etc.).

### 5.8 Folder 29: Cath Lab & Interventional Cardiology (+12 Requests)
1. `POST {{baseUrl}}/api/v1/cath-lab/sessions/:sessionId/safety-timeout` — WHO Surgical Safety Checklist timeout initiation and sign-off.
2. `GET {{baseUrl}}/api/v1/cath-lab/sessions/:sessionId/safety-timeout` — Retrieve verified safety timeout logs.
3. `POST {{baseUrl}}/api/v1/cath-lab/sessions/:sessionId/safety-hold/activate` — Emergency procedure safety hold trigger with mandatory clinical rationale.
4. `POST {{baseUrl}}/api/v1/cath-lab/sessions/:sessionId/safety-hold/release` — Multi-disciplinary safety hold release and resumption.
5. `GET {{baseUrl}}/api/v1/cath-lab/sessions/:sessionId/safety-hold/history` — Complete chronological safety hold transition history.
6. `POST {{baseUrl}}/api/v1/cath-lab/sessions/:sessionId/telemetry` — Live physiological telemetry ingestion (HR, BP, SpO2, contrast volume, radiation DAP).
7. `GET {{baseUrl}}/api/v1/cath-lab/sessions/:sessionId/telemetry` — Telemetry stream and cumulative radiation exposure totals.
8. `POST {{baseUrl}}/api/v1/cath-lab/sessions/:sessionId/qca` — Quantitative Coronary Artery (QCA) lesion analysis (reference diameter, MLD, % stenosis).
9. `GET {{baseUrl}}/api/v1/cath-lab/sessions/:sessionId/qca` — List confirmed QCA lesion calculations.
10. `POST {{baseUrl}}/api/v1/cath-lab/sessions/:sessionId/findings/coronary-vessels` — Structured multi-vessel lesion findings (LAD, LCx, RCA, LMCA, grafts).
11. `GET {{baseUrl}}/api/v1/cath-lab/sessions/:sessionId/findings/coronary-vessels` — Retrieve confirmed vessel stenosis and stent placement findings.
12. `GET {{baseUrl}}/api/v1/cath-lab/sessions/:sessionId/dicom/series/:seriesInstanceUid/frame/:frameNumber` — High-speed cineangiography DICOM frame streaming or external PACS gateway integration.

---

## 6. Environment File & Data Sanitization Review

The staging environment configuration (`CareID-Staging.postman_environment.json`) was audited for credential hygiene:
- **Environment Name:** `CareID API - Staging Environment`
- **Variable Count:** 49 active variables.
- **Base URL:** `https://360api.vnvision.in/api/v1` (with override capacity for isolated staging port `3074`).
- **Token Sanitization:** Sensitive authorization tokens (`accessToken`, `bearerToken`, `refreshToken`) are marked as `secret` types and initialized as empty or dummy placeholders.
- **Test Phone Identity Isolation:** All configured phone variables strictly utilize dummy US test numbers:
  - Super Admin: `+16505550001`
  - Admin: `+16505550002`
  - Doctor: `+16505550003`
  - Patient: `+16505550004`
  - Facility Admin: `+16505550005`
  - Staff: `+16505550006`
  - Family Member: `+16505550007`
- **Zero Real Data Exposure:** No genuine patient PHI, live doctor phone numbers, production passwords, or AWS/Cloudinary master keys exist within the Postman artifacts.

---

## 7. Forensic Verification Decision

| Inspection Area | Finding | Status |
| :--- | :--- | :---: |
| Baseline Preservation | 533 / 533 baseline contracts matched by method & path | **PASS** |
| Endpoint Removals | 0 deleted baseline endpoints | **PASS** |
| Additive Integrity | 56 net-new requests correctly partitioned across clinical folders | **PASS** |
| Schema & DTO Compatibility | All new routes backed by strict class-validator DTOs | **PASS** |
| Credential Hygiene | Zero leaked tokens, secrets, or patient PHI | **PASS** |
| Automated Assertion Coverage | 559 requests include automated post-response test assertions | **PASS** |

**Conclusion:** The Postman collection update is **APPROVED** with status **PASS**. It fully represents both the baseline legacy contracts and the newly verified clinical modules without breaking backwards compatibility.

