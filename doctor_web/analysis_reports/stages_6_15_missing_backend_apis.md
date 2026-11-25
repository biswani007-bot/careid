# CareID Doctor Web — Stages 6–15 Missing Backend APIs Specification

**Document Version:** 1.0.0  
**Target Backend:** `https://360api.vnvision.in/api/v1`  
**Authoritative Reference:** `CareID-Staging.postman_collection.json` (559 documented items)  
**Date:** November 10, 2026  
**Audience:** Backend Engineering Team, Tech Leads, CareID Product Team

---

## Executive Summary

During the comprehensive audit and integration of Stages 6–15 in `doctor-web-frontend-main`, every endpoint in the staging Postman collection was inspected and integrated into the frontend workflow. While core endpoints for **Treatment Offer Dispatch**, **Status Retrieval**, **Offer Cancellation**, **Patient Vitals**, **Patient Medical Records**, **Facility Room Discovery**, and **Appointment CRUD (Create, Read, Status Update, Reschedule, Cancel)** are documented and live, several critical clinical and administrative workflow steps lack dedicated backend endpoints.

In accordance with strict CareID architectural guidelines, the frontend does **not** simulate persistence or use temporary in-memory caches as a fake backend. Where backend APIs are absent, the UI honestly reflects live status, queries existing baseline clinical records (EHR/Vitals), and prevents invalid forward claims.

This specification details the **6 Genuinely Missing Backend APIs** required to achieve 100% full-stack completion of Stages 6–15.

---

## Summary Matrix of Missing Backend APIs

| ID | Stage | Functionality | Proposed Method & Route | Priority | Current Frontend State |
|---|---|---|---|---|---|
| **API-M01** | Stage 8 | Acceptance Certificate & Digital Signature Record | `GET /api/v1/doctors/treatment-offers/:id/acceptance-certificate` | **P1 (High)** | UI calculates dynamic hash & timestamp; certificate PDF generation relies on client offer DTO |
| **API-M02** | Stage 9 | Multi-Disciplinary Pre-Op Clearance Sign-off | `GET /api/v1/treatment-offers/:id/clearance`<br>`PUT /api/v1/treatment-offers/:id/clearance` | **P0 (Blocker)** | UI dynamically fetches live EHR records; clearance checklist state is local to consultation session |
| **API-M03** | Stage 11 | Suite Lock / Provisional Reservation Hold | `POST /api/v1/appointments/holds`<br>`DELETE /api/v1/appointments/holds/:holdId` | **P0 (Blocker)** | UI uses local 45-min timer and routes to actual booking on confirm; no multi-client concurrency lock |
| **API-M04** | Stage 14 | Pre-Op Clinical Readiness Checklist Attestation | `GET /api/v1/appointments/:id/readiness`<br>`PATCH /api/v1/appointments/:id/readiness` | **P0 (Blocker)** | UI validates live vitals & records from EHR; final physician sign-off advances encounter without server persistence |
| **API-M05** | Stage 15 | Dedicated Patient Clinical Check-in & Station Assignment | `POST /api/v1/appointments/:id/check-in` | **P1 (High)** | UI uses existing `PUT /api/v1/appointments/:id/status` (`IN_PROGRESS`); station and wristband details unpersisted |
| **API-M06** | Stage 10/12 | Procedure-to-Offer Relational Linking in Appointment | `POST /api/v1/appointments` (`treatmentOfferId` schema support) | **P1 (High)** | UI passes `treatmentOfferId` in metadata/notes; appointment entity lacks indexed foreign key column |

---

## Detailed API Specifications

### 1. API-M01: Digital Acceptance Certificate & Audit Signature
- **Stage:** Stage 8 — Offer Accepted
- **Priority:** P1 (High)
- **Functional Need:**
  When a patient accepts a treatment proposal via the patient portal or SMS link, a cryptographically sealed acceptance certificate must be recorded. The doctor web portal currently displays dynamic offer attributes and an SHA-256 audit hash derived from the offer ID, but needs the authentic patient IP address, signing timestamp, biometric/OTP trace, and certificate document download URL.
- **Proposed Endpoint:**
  - `GET /api/v1/doctors/treatment-offers/:offerId/acceptance-certificate`
- **Proposed Request Headers:**
  - `Authorization: Bearer <DOCTOR_JWT>`
- **Proposed Response Body (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "certificateId": "CERT-88219-3E41",
      "offerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "patientProfileId": "7b12d345-89ab-4cde-0123-456789abcdef",
      "patientFullName": "Marcus Sterling",
      "signedAt": "2026-11-04T14:15:00.000Z",
      "signingMethod": "SMS_OTP_BIOMETRIC",
      "signerIpAddress": "198.51.100.42",
      "auditHash": "SHA256:88923E41BC8991FA29048381284E0124",
      "termsVersion": "v2.4-2026",
      "financingApproved": true,
      "financingPackageId": "careid-0",
      "pdfDownloadUrl": "https://360api.vnvision.in/api/v1/documents/certificates/CERT-88219-3E41.pdf"
    }
  }
  ```
- **Database Entity Requirements:**
  - New table `treatment_offer_acceptance_certificates` with unique foreign key on `treatment_offer_id`.

---

### 2. API-M02: Multi-Disciplinary Pre-Op Clearance Sign-off
- **Stage:** Stage 9 — Pre-Op Clearance (Clinical Handoff)
- **Priority:** P0 (Blocker for full Stage 9 lifecycle completion)
- **Functional Need:**
  Stage 9 requires cardiology, anesthesia, surgical nursing, and financial counseling sign-offs prior to suite scheduling. Currently, the frontend queries EHR records via `patientService.getPatientMedicalRecords()` and confirms diagnostic presence, but cannot persist individual department clearances to the backend.
- **Proposed Endpoints:**
  - `GET /api/v1/treatment-offers/:offerId/clearance`
  - `PUT /api/v1/treatment-offers/:offerId/clearance`
- **Proposed Request Payload (`PUT`):**
  ```json
  {
    "department": "CARDIOLOGY",
    "clearedByDoctorId": "doc-uuid-1234",
    "status": "CLEARED",
    "clinicalNotes": "Coronary anatomy confirmed suitable for radial diagnostic angiogram.",
    "clearedAt": "2026-11-04T10:30:00Z",
    "requiredPrerequisites": {
      "coagulationLabs": true,
      "ecgRecorded": true,
      "imagingUploaded": true
    }
  }
  ```
- **Proposed Response Body (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "offerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "overallStatus": "PENDING_ANESTHESIA",
      "clearanceGates": [
        {
          "department": "FINANCIAL",
          "status": "CLEARED",
          "clearedAt": "2026-11-04T09:00:00Z",
          "clearedBy": "Financing Gateway System"
        },
        {
          "department": "CARDIOLOGY",
          "status": "CLEARED",
          "clearedAt": "2026-11-04T10:30:00Z",
          "clearedBy": "Dr. Sarah Jenkins, MD"
        },
        {
          "department": "ANESTHESIA",
          "status": "PENDING",
          "clearedAt": null,
          "clearedBy": null
        }
      ]
    }
  }
  ```

---

### 3. API-M03: Suite Lock / Provisional Reservation Hold
- **Stage:** Stage 11 — Hold Review
- **Priority:** P0 (Blocker for multi-user surgical suite concurrency)
- **Functional Need:**
  Stage 11 enforces a 45-minute surgical suite hold while the surgical team finalizes staff and equipment rosters. If two doctors attempt to reserve Cath Lab Suite 3 at the same time, without a backend hold mechanism, double-booking occurs. The frontend currently operates an in-memory 45-minute countdown and navigates cleanly, but needs backend distributed locking.
- **Proposed Endpoints:**
  - `POST /api/v1/appointments/holds`
  - `GET /api/v1/appointments/holds/:holdId`
  - `DELETE /api/v1/appointments/holds/:holdId` (Release hold)
- **Proposed Request Payload (`POST /appointments/holds`):**
  ```json
  {
    "facilityId": "fac-001",
    "roomId": "room-cath-03",
    "treatmentOfferId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "patientProfileId": "7b12d345-89ab-4cde-0123-456789abcdef",
    "holdDurationMinutes": 45,
    "slotDate": "2026-11-04",
    "slotStartTime": "09:30",
    "slotEndTime": "11:00"
  }
  ```
- **Proposed Response Body (`201 Created`):**
  ```json
  {
    "success": true,
    "data": {
      "holdId": "HOLD-CAT3-20261104-9182",
      "facilityId": "fac-001",
      "roomId": "room-cath-03",
      "lockedByDoctorId": "doc-uuid-1234",
      "expiresAt": "2026-11-04T10:15:00.000Z",
      "status": "ACTIVE_HOLD"
    }
  }
  ```
- **Conflict Behavior (`409 Conflict`):**
  Returns `409` if another provider has active hold on the requested suite during the target window.

---

### 4. API-M04: Pre-Op Clinical Readiness Checklist Attestation
- **Stage:** Stage 14 — Pre-Op Readiness
- **Priority:** P0 (Blocker for persistent surgical checklist compliance)
- **Functional Need:**
  The pre-procedure readiness checklist contains 11 clinical, legal, pharmacological, and logistical gates (Fasting NPO, Coagulation panel, Anesthesia protocol, Allergy wristbands, C-Arm calibration). The frontend currently validates live EHR lab records and vitals. However, the final clinical attestation by the attending physician is not persisted in a dedicated readiness table.
- **Proposed Endpoints:**
  - `GET /api/v1/appointments/:appointmentId/readiness`
  - `PATCH /api/v1/appointments/:appointmentId/readiness`
- **Proposed Request Payload (`PATCH`):**
  ```json
  {
    "attendingDoctorId": "doc-uuid-1234",
    "isFullyCleared": true,
    "clearedGates": [
      "FINANCIAL_SETTLEMENT",
      "BIOMETRIC_CONSENT",
      "COAGULATION_PANEL",
      "BMP_CREATININE",
      "ECG_RHYTHM",
      "ANESTHESIA_CLEARANCE",
      "NPO_COMPLIANCE",
      "PHARMACOLOGICAL_SAFETY",
      "EQUIPMENT_ROSTER",
      "ESCORT_CONFIRMATION"
    ],
    "attestationNotes": "Coagulation labs verified (INR 1.1). Anesthesia MAC Tier 1 approved. Patient cleared for transfer.",
    "attestedAt": "2026-11-04T07:15:00.000Z"
  }
  ```

---

### 5. API-M05: Dedicated Patient Day-of-Checkin & Station Assignment
- **Stage:** Stage 15 — Day-of-Checkin
- **Priority:** P1 (High)
- **Functional Need:**
  The frontend currently updates `PUT /api/v1/appointments/:id/status` to `IN_PROGRESS` when the doctor clicks "CONFIRM ARRIVAL". While this persists the high-level appointment status in the backend database, it lacks day-of-procedure specifics: pre-op prep bay assignment (`Bay #04`), nurse triage intake notes, barcode wristband scan token, and arrival timestamp.
- **Proposed Endpoint:**
  - `POST /api/v1/appointments/:appointmentId/check-in`
- **Proposed Request Payload:**
  ```json
  {
    "arrivalTime": "2026-11-04T07:30:00.000Z",
    "stationId": "BAY-04-PREOP",
    "triageNurseId": "nurse-vance-441",
    "barcodeWristbandId": "WB-9382104-MARCUS",
    "npoConfirmed": true,
    "npoHours": 6.0,
    "initialVitals": {
      "bloodPressure": "120/80",
      "heartRate": 72,
      "spO2": 98,
      "temperatureF": 98.6
    }
  }
  ```

---

### 6. API-M06: Procedure-to-Offer Relational Foreign Key in Appointment
- **Stage:** Stages 10 & 12 — Suite Scheduling & Slot Confirmed
- **Priority:** P1 (High)
- **Functional Need:**
  Currently, `POST /api/v1/appointments` schema in Postman accepts:
  `patientProfileId`, `doctorProfileId`, `appointmentDate`, `startTime`, `endTime`, `type`, `status`, `notes`.
  It does not have a formal first-class field `treatmentOfferId`. The frontend passes the offer ID inside `notes` (`Treatment Offer ID: 3fa85f64...`) so that the reference is preserved.
- **Proposed Enhancement:**
  Add `treatmentOfferId: string (UUID, optional)` to `POST /api/v1/appointments` and `AppointmentDTO`.
  Index `treatmentOfferId` on the appointments table to allow bidirectional queries:
  - `GET /api/v1/doctors/treatment-offers/:offerId/appointment`

---

## Conclusion & Recommendation for Backend Team

1. Implementing **API-M03 (Holds)** and **API-M04 (Readiness)** will immediately elevate Stages 11 and 14 to **FULLY COMPLETED (100% Persisted)**.
2. Adding `treatmentOfferId` to `Appointment` entity (**API-M06**) will streamline Stage 10, 12, and 13 navigation without requiring client heuristics.
3. The frontend is fully coded, type-safe, and ready to bind these 6 endpoints as soon as they are deployed to staging.

