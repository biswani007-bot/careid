# CAREID MASTER BACKEND — API CONTRACT RECONCILIATION REPORT

**Document ID:** CRID-DOC-REM-06  
**Ecosystem:** Backend API, Doctor Web, Doctor Mobile, Patient Mobile, Postman Collection  
**Base URL:** `https://360api.vnvision.in/api/v1`  
**Authoritative References:**
- CareID Staging Postman Collection v1.2.0 (`CareID_Doctor_application/CareID-Staging.postman_collection.json`)
- Live Swagger OpenAPI 3.0 (`https://360api.vnvision.in/api/docs-json`)
- Doctor Web Portal (`https://careiddoctor.vnvision.in/`)

---

## 1. Executive Summary

This report establishes total contract parity across all 16 clinical, administrative, and financial stages. Every endpoint contract was cross-checked against the NestJS DTOs, controllers, Swagger documentation, and the authoritative Postman collection.

---

## 2. Comprehensive Endpoint Reconciliation Matrix

| Stage | Method | Route | Request Body / Query | Success Status | Auth Roles |
|---|---|---|---|---|---|
| Stage 1 | `POST` | `/treatment-offers` | `CreateTreatmentOfferDto` | 201 Created | `DOCTOR` |
| Stage 2 | `GET` | `/treatment-offers/:id/financing-options` | N/A | 200 OK | `PATIENT`, `DOCTOR`, `STAFF`, `ADMIN` |
| Stage 3 | `POST` | `/treatment-offers/:id/financing-applications` | `CreateFinancingApplicationDto` | 201 Created | `PATIENT`, `STAFF`, `ADMIN` |
| Stage 4 | `POST` | `/treatment-offers/:id/approve-discount` | `ApproveDiscountDto` (`approved`, `comments`) | 200 OK | `STAFF` (facility scoped), `ADMIN` |
| Stage 5 | `POST` | `/treatment-offers/:id/dispatch` | `DispatchOfferDto` | 200 OK | `DOCTOR`, `STAFF`, `ADMIN` |
| Stage 6 | `POST` | `/treatment-offers/:id/ratify` | `RatifyOfferDto` (`signatureDataUrl`) | 200 OK | `PATIENT` |
| Stage 7 | `GET` | `/appointments/slots/available` | Query: `doctorId`, `facilityId`, `date` | 200 OK | All Authenticated |
| Stage 8 | `POST` | `/appointments/slots/holds` | `CreateSlotHoldDto` (`slotId`, `facilityId`) | 201 Created | All Authenticated |
| Stage 9 | `GET` | `/appointments/slots/holds/:id` | N/A | 200 OK | All Authenticated |
| Stage 10 | `DELETE` | `/appointments/slots/holds/:id` | N/A | 200 OK | Hold Creator, `STAFF`, `ADMIN` |
| Stage 11 | `POST` | `/appointments` | `CreateAppointmentDto` (`holdId`, `slotId`) | 201 Created | All Authenticated |
| Stage 12 | `GET` | `/appointments/:id` | N/A | 200 OK | Patient Owner, Doctor, Staff, Admin |
| Stage 13 | `PATCH` | `/appointments/:id/status` | `UpdateAppointmentStatusDto` (`status`) | 200 OK | `DOCTOR`, `STAFF`, `ADMIN` |
| Stage 14 | `GET` | `/appointments/:id/readiness` | N/A | 200 OK | `DOCTOR`, `STAFF`, `ADMIN` |
| Stage 14 | `PATCH` | `/appointments/:id/readiness` | `UpdateReadinessDto` (flat booleans, `decision`) | 200 OK | `DOCTOR`, `STAFF`, `ADMIN` |
| Stage 15 | `POST` | `/appointments/:id/check-in` | `AppointmentCheckInDto` (vitals, bay) | 200 OK | `STAFF`, `FACILITY_ADMIN`, `NURSE`, `DOCTOR` |
| Stage 15 | `GET` | `/appointments/:id/check-in` | N/A | 200 OK | Patient Owner, Assigned Doctor, Staff |
| Stage 16 | `GET` | `/appointments/:id/cath-lab-checklist` | N/A | 200 OK | `DOCTOR`, `STAFF`, `ADMIN` |
| Stage 16 | `POST` | `/appointments/:id/cath-lab-checklist` | `UpdateCathLabChecklistDto` (WHO stages) | 200 OK | `DOCTOR`, `STAFF`, `ADMIN` |

---

## 3. High-Priority Contract Details Reconciled

### Stage 14: Pre-Op Day -1 Readiness Checklist Contract
```json
{
  "fastingConfirmed": true,
  "medicationHoldConfirmed": true,
  "transportationArranged": true,
  "consentVerified": true,
  "vitalsWithinThreshold": true,
  "decision": "GO",
  "notes": "Patient pre-operative readiness confirmed by clinical team."
}
```
- **Validation Rule:** Decision `'GO'` is strictly blocked with HTTP 400 Bad Request if any of the five mandatory items (`fastingConfirmed`, `medicationHoldConfirmed`, `transportationArranged`, `consentVerified`, `vitalsWithinThreshold`) is `false` or missing.

### Stage 15: Day of Procedure Patient Check-In Contract
```json
{
  "checkInTime": "2026-11-18T08:30:00.000Z",
  "facilityId": "fac-100",
  "bedOrBayNumber": "PRE-OP-BAY-4",
  "vitals": {
    "bloodPressure": "120/80",
    "heartRate": 72,
    "oxygenSaturation": 98,
    "temperature": 36.6
  },
  "notes": "Patient prepped for procedure."
}
```
- **Validation Rule:** Heart rate must be 20–300 bpm, SpO2 50–100%, and temperature 30–45°C.
- **Privacy Rule:** Access is strictly limited to the patient owner, assigned doctor, and facility staff.

---
**Verified By:** Backend Architecture & Integration Lead  
**Status:** 100% RECONCILED WITH ZERO DEFECTS
