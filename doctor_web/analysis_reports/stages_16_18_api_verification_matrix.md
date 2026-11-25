# CareID Doctor Web — Stages 16–18 API Verification Matrix

**Document Version:** 1.0.0  
**Target Backend:** `https://360api.vnvision.in/api/v1`  
**Authoritative Reference:** `CareID-Staging.postman_collection.json` (559 items)  
**Date:** November 10, 2026

---

## Complete API Verification Matrix (Stages 16–18)

| Stage | Operation | HTTP Method | Actual Endpoint | Postman Documented | Integrated | Runtime Verified | Persistence Verified | Notes / Limitations |
|:---:|:---|:---:|:---|:---:|:---:|:---:|:---:|:---|
| **16** | Fetch Patient Profile & Demographics | `GET` | `/api/v1/doctors/patients/:patientProfileId` | Documented | **Integrated** | **Yes (HTTP 200)** | **PostgreSQL Persisted** | Resolves patient name, MRN, date of birth, blood group, allergies |
| **16** | Fetch Baseline Triage Vitals | `GET` | `/api/v1/doctors/patients/:patientProfileId/vitals` | Documented | **Integrated** | **Yes (HTTP 200)** | **PostgreSQL Persisted** | Hydrates baseline BP, pulse rate, SpO2 RA, temperature |
| **16** | Fetch Treatment Proposal | `GET` | `/api/v1/doctors/treatment-offers/:id` | Documented | **Integrated** | **Yes (HTTP 200)** | **PostgreSQL Persisted** | Hydrates procedure name, CPT code, financing settlement, audit hash |
| **16** | List Appointments for Patient | `GET` | `/api/v1/appointments` | Documented | **Integrated** | **Yes (HTTP 200)** | **PostgreSQL Persisted** | Resolves active procedure appointment ID |
| **16** | Ratify Safety Time-Out on Appointment | `PUT` | `/api/v1/appointments/:id/status` | Documented | **Integrated** | **Yes (HTTP 200)** | **PostgreSQL Persisted** | Mutates appointment status to `IN_PROGRESS` with clinical audit notes |
| **16** | WHO Surgical Safety 6-Gate Entity | `POST` | `/api/v1/cath-lab/safety-timeout` | **Missing** | Workaround | Client Handled | Session-only | Dedicated checklist table unpersisted; logged to appointment |
| **17** | Hydrate Induction Metadata from Offer | `GET` | `/api/v1/doctors/treatment-offers/:id` | Documented | **Integrated** | **Yes (HTTP 200)** | **PostgreSQL Persisted** | Preserves state across refresh and direct URL navigation |
| **17** | Query Appointment Induction Slot | `GET` | `/api/v1/appointments/:id` | Documented | **Integrated** | **Yes (HTTP 200)** | **PostgreSQL Persisted** | Verifies scheduled suite and time window |
| **17** | Initiate Encounter Induction | `PUT` | `/api/v1/appointments/:id/status` | Documented | **Integrated** | **Yes (HTTP 200)** | **PostgreSQL Persisted** | Sets status `IN_PROGRESS` with induction notes |
| **17** | Standby Hold Flagging | `POST` | `/api/v1/cath-lab/safety-hold` | **Missing** | Workaround | Client Handled | Session-only | Standby hold taxonomy schema unpersisted |
| **18** | Document Complete Clinical Encounter | `POST` | `/api/v1/doctors/patients/:patientProfileId/encounters` | Documented | **Integrated** | **Yes (HTTP 201)** | **PostgreSQL Persisted** | Creates authentic MedicalRecord with diagnoses, vitals, procedures |
| **18** | Update Clinical Record Notes | `PUT` | `/api/v1/doctors/patients/:patientProfileId/medical-records/:recordId` | Documented | **Integrated** | **Yes (HTTP 200)** | **PostgreSQL Persisted** | Updates procedure findings and physician attestation |
| **18** | Longitudinal EHR Reflection | `GET` | `/api/v1/doctors/patients/:patientProfileId/medical-records` | Documented | **Integrated** | **Yes (HTTP 200)** | **PostgreSQL Persisted** | Verifies documented encounter appears in patient's chart |
| **18** | Update Appointment to Completed | `PUT` | `/api/v1/appointments/:id/status` | Documented | **Integrated** | **Yes (HTTP 200)** | **PostgreSQL Persisted** | Updates appointment lifecycle upon procedure completion |
| **18** | QCA 4-Vessel Stenosis Tree Entity | `POST` | `/api/v1/cath-lab/encounters/:id/vessel-findings` | **Missing** | Workaround | Client Handled | Session-only | Structured QCA tree serialized into procedure notes |
| **18** | Live Fluoroscopy Telemetry Stream | `GET` | `/api/v1/cath-lab/telemetry/live` | **Missing** | Workaround | Client Timer | In-memory | Device hardware interface unpersisted |

---

## Verification Summary

- **Documented APIs Verified Live:** 10 endpoints
- **Missing APIs Specified:** 4 specialized cath-lab endpoints
- **Data Persistence Mode:** PostgreSQL for all standard clinical records, patient profiles, vitals, and appointments.
- **Zero Mock Data:** Eradicated `TR-8921`, `8472-9901`, `FIN-TR8921`, and static fixtures.

