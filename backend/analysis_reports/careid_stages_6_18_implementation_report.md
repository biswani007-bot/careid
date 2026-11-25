# CAREID — End-to-End Implementation Report: Clinical Stages 6 Through 18

**Date:** November 10, 2026  
**Auditor:** Antigravity Senior Principal Backend Engineer  
**Scope:** Stages 6 Through 18 Complete Workflow Implementation

---

## 1. Architectural Narrative

The CareID procedure suite lifecycle models the end-to-end journey of an interventional cardiology patient, starting from diagnosis through proposal, multidisciplinary clearance, pre-op scheduling, day-of intake, cath lab safety sign-off, and intra-operative hemodynamic documentation.

### Stage 6 & 7: Draft Proposal & Dispatch
- Attending cardiologist drafts treatment proposal (`POST /api/v1/doctors/treatment-offers`) with itemized procedure codes (e.g. 93458, 92928), gross estimate, discount, and net payable.
- Offer dispatched (`POST /api/v1/doctors/treatment-offers/:id/dispatch`), moving status to `DISPATCHED`.

### Stage 8: Ratification & Acceptance Certificate
- Patient accepts offer (`POST /api/v1/patients/treatment-offers/:id/accept`). Status moves to `ACCEPTED`.
- Either doctor or patient fetches the legal Acceptance Certificate:
  - `GET /api/v1/doctors/treatment-offers/:id/acceptance-certificate`
  - `GET /api/v1/treatment-offers/:id/acceptance-certificate`
- Computes SHA-256 cryptographic verification hash: `SHA-256(offerId:patientProfileId:patientRespondedAt)`.
- Returns itemized financial breakdown, ratified terms, procedure items, and digital verification seal.

### Stage 9: Multidisciplinary Pre-Op Clearance
- Required prior to admission into the catheterization laboratory.
- `GET /api/v1/treatment-offers/:id/clearance`
- `PUT /api/v1/treatment-offers/:id/clearance`
- Tracks five multidisciplinary domains:
  1. `cardiologyClearance`: ECG, Echo, LVEF assessment.
  2. `anesthesiaClearance`: Airway class, intubation risk.
  3. `medicalClearance`: Glycemic control, renal profile.
  4. `surgicalClearance`: Consents, site mark.
  5. `labClearance`: CBC, PT/INR, BMP.
- Evaluates domain statuses to auto-compute `overallStatus`:
  - `CLEARED`: All 5 domains are CLEARED or NOT_REQUIRED.
  - `PARTIALLY_CLEARED`: Some CLEARED, some PENDING.
  - `REJECTED`: Any domain rejected.

### Stages 10, 11 & 12: Suite Holds & Scheduling
- Attending team places a 45-minute temporary hold on a catheterization suite slot:
  - `POST /api/v1/appointments/holds`
  - Body: `{ facilityId, slotId, procedureCategory: "CATH_LAB", holdDurationMinutes: 45 }`
  - Slot status transitions to `BLOCKED`.
  - Rejects concurrent booking attempts with HTTP 409 Conflict.
- Inspect hold remaining seconds: `GET /api/v1/appointments/holds/:id`.
- Book appointment linked to treatment offer: `POST /api/v1/appointments` with `treatmentOfferId`.
- Release hold: `DELETE /api/v1/appointments/holds/:id`.

### Stage 13: Financing Underwriting
- Patient applies for medical credit tenure via `POST /api/v1/financing/apply`.
- Fields `panOrNationalId` and `monthlyIncome` are encrypted via Node.js native AES-256-GCM.

### Stage 14: Pre-Op Day -1 Readiness & GO/NO-GO Decision
- Clinical coordinator conducts pre-admission verification:
  - `GET /api/v1/appointments/:id/readiness`
  - `PATCH /api/v1/appointments/:id/readiness`
- Validates:
  - `fastingConfirmed`: 12-hour fasting.
  - `medicationHoldConfirmed`: Anticoagulant / metformin holds verified.
  - `transportationArranged`: Escort arranged post-procedure.
  - `consentVerified`: Legal informed consent filed.
  - `vitalsWithinThreshold`: Baseline vitals within tolerance.
  - `decision`: `GO` | `NO_GO` | `CONDITIONAL_GO`.

### Stage 15: Day of Procedure Patient Check-In
- Intake desk confirms arrival:
  - `POST /api/v1/appointments/:id/check-in`
  - Body: `{ bedOrBayNumber: "PRE-OP-BAY-03", vitals: { bloodPressure: "120/80", heartRate: 72 } }`
- Transitions appointment status to `IN_PROGRESS`.

### Stage 16: Cath Lab WHO Surgical Safety Checklist
- Cath lab nursing team and interventionalist execute WHO surgical safety verification:
  - `GET /api/v1/appointments/:id/cath-lab-checklist`
  - `POST /api/v1/appointments/:id/cath-lab-checklist`
- Verifies:
  1. `signIn`: Identity confirmed, pulse oximeter operating, allergies reviewed.
  2. `timeOut`: Entire team introduced, patient name/procedure confirmed, antibiotics given, imaging displayed.
  3. `signOut`: Procedure recorded, counts correct, specimens labeled, recovery concerns reviewed.
  4. Automatically computes `overallStatus: "COMPLETED"`.

### Stages 17 & 18: Intra-Operative Procedures & Hemodynamics
- Procedural documentation:
  - `POST /api/v1/encounters/:id/procedures`
  - Records stent deployments, balloon angioplasties, and CPT codes (e.g. 92928, 93458).
- Hemodynamic documentation:
  - `POST /api/v1/encounters/:id/hemodynamics`
  - Records real-time vitals: systolic/diastolic blood pressure, pulse, respiration rate, SpO2, and temperature.

