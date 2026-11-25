# CareID Doctor Web — Prescription & Clinical History Missing Backend APIs & Defect Specification

**Document Version:** 2.0.0 (Forensic Defect & Contract Specification)  
**Target Backend:** `https://360api.vnvision.in/api/v1`  
**Authoritative Reference:** `CareID-Staging.postman_collection.json` (559 documented items)  
**Date:** November 10, 2026  
**Audience:** Backend Engineering Team, Tech Leads, QA Leads, Systems Architecture

---

## 1. Executive Summary & Defect Overview

A comprehensive runtime and schema audit was executed on the deployed staging backend (`https://360api.vnvision.in/api/v1`) for all endpoints supporting the **Prescription & Clinical History** module (`/records/prescriptions?patientId=:patientId`).

The audit revealed three distinct categories of backend issues:
1. **TASK 1 — Authorize Refill Backend Exception (`POST /api/v1/prescriptions/:prescriptionId/refill`):**  
   The endpoint exists in Postman and actively validates the request body using `class-validator` (rejecting unexpected fields with HTTP 400), but throws an unhandled **HTTP 500 InternalServerError** when processing valid requests for existing, persisted prescriptions.
2. **TASK 2 — Individual Prescription Export Backend Exception (`GET /api/v1/prescriptions/:prescriptionId/export`):**  
   The endpoint exists in Postman, but crashes with **HTTP 500 InternalServerError** for all prescription IDs (both valid and invalid UUIDs), indicating a failure prior to entity resolution or missing relation mapping in the controller/service.
3. **TASK 3 — Genuinely Missing Platform API: Unified Clinical Record Export:**  
   No endpoint exists in any of the 27 folders of `CareID-Staging.postman_collection.json` to generate or stream a unified patient medical record summary (combining demographics, active prescriptions, clinical timeline, SOAP notes, and hospital admissions) as a multi-page PDF or JSON export.

---

## 2. Four-Way Status Classification

| Module Feature | Target Path / Method | Status Classification | Root Cause / Operational State |
|---|---|:---:|---|
| **Patient Profile** | `GET /api/v1/doctors/patients/:patientProfileId` | **FULLY COMPLETED** | Operational (HTTP 200). Resolves MRN, demographics, blood group, allergies. |
| **Prescription History** | `GET /api/v1/doctors/patients/:patientProfileId/prescriptions` | **FULLY COMPLETED** | Operational (HTTP 200). Returns array of active/past prescriptions with nested medications. |
| **New Prescription Order** | `POST /api/v1/doctors/patients/:patientProfileId/prescriptions` | **FULLY COMPLETED** | Operational (HTTP 201). Persists prescription with title, diagnosis, and medications array. |
| **Hospital Admissions** | `GET /api/v1/doctors/patients/:patientProfileId/admissions` | **FULLY COMPLETED** | Operational (HTTP 200). Returns inpatient records with ward/bed, dates, and diagnoses. |
| **Record Admission** | `POST /api/v1/doctors/patients/:patientProfileId/admissions` | **FULLY COMPLETED** | Operational (HTTP 201). Persists inpatient admission records in PostgreSQL. |
| **Clinical Timeline** | `GET /api/v1/doctors/patients/:patientProfileId/medical-records/timeline` | **FULLY COMPLETED** | Operational (HTTP 200). Streams attachments and medical records in unified timeline. |
| **SOAP Clinical Notes** | `GET /api/v1/doctors/patients/:patientProfileId/medical-records` | **FULLY COMPLETED** | Operational (HTTP 200). Returns full longitudinal chart with S, O, P, and follow-up notes. |
| **Authorize Refill** | `POST /api/v1/prescriptions/:prescriptionId/refill` | **BACKEND BUG FIX REQUIRED** | Documented in Postman; NestJS controller/service throws uncaught HTTP 500 on valid payloads. |
| **Individual Rx Export** | `GET /api/v1/prescriptions/:prescriptionId/export` | **BACKEND BUG FIX REQUIRED** | Documented in Postman; service throws uncaught HTTP 500 on all valid and invalid UUIDs. |
| **Unified Chart Export** | `GET /api/v1/doctors/patients/:id/medical-records/export` | **NEW BACKEND API REQUIRED** | Missing across entire 559-item Postman collection. |

---

## 3. TASK 1: Authorize Refill Backend Defect (`POST /api/v1/prescriptions/:id/refill`)

### A. Defect Description & Runtime Evidence
- **Endpoint:** `POST https://360api.vnvision.in/api/v1/prescriptions/:prescriptionId/refill`
- **Authentication:** `Bearer <doctor_access_token>` (Doctor role, user UUID: `fa502f2e-332c-4ec0-b6aa-83713216ec88`)
- **Tested Prescription UUID:** `d6314a44-384c-411d-8663-af312f96ef54` (persisted on backend)
- **Submitted Request Payload:**
  ```json
  {
    "quantity": 1,
    "notes": "Standard 30-day refill authorized by clinic"
  }
  ```
- **Observed HTTP Response:**
  ```json
  {
    "success": false,
    "statusCode": 500,
    "error": "InternalServerError",
    "message": "An internal server error occurred.",
    "meta": {
      "timestamp": "2026-11-10T07:40:14.234Z",
      "path": "/api/v1/prescriptions/d6314a44-384c-411d-8663-af312f96ef54/refill"
    }
  }
  ```

### B. Validation Verification
When submitting an unrecognized property:
```json
{
  "quantity": 1,
  "notes": "Test",
  "invalidExtraField": "unexpected"
}
```
The server immediately responds with:
```json
{
  "success": false,
  "statusCode": 400,
  "error": "BadRequestException",
  "message": [ "property invalidExtraField should not exist" ]
}
```
**Conclusion:** The NestJS `ValidationPipe` is functional and confirms the request structure is valid according to `AuthorizeRefillDto`. The crash occurs *after* validation inside `PrescriptionsService.authorizeRefill()`.

### C. Root Cause Forensic Analysis
1. **User Context Mismatch:**  
   The `PrescriptionsController` resides in the Medical Records / Patient App module (`08. Medical Records`). The service likely accesses `req.user.patientProfileId` without checking if `req.user` is a Doctor (`doctorProfileId`), resulting in `TypeError: Cannot read properties of undefined` when assigning or querying the authorizing entity.
2. **Missing Database Relationship in TypeORM:**  
   `PrescriptionsService` executes `this.prescriptionRepo.findOne({ where: { id: prescriptionId }, relations: ['refills', 'patientProfile'] })`. If the prescription was created via `POST /doctors/patients/:id/prescriptions` (stored in the `reports` table with `category = 'PRESCRIPTION'`), the `prescriptions` repository fails to resolve the foreign key or attempts to insert into a non-existent `prescription_refills` table without migration.
3. **Database Null Constraint Violation:**  
   The refill table requires a non-null `userId` or `patientProfileId` that is not populated when a Doctor triggers the authorization.

### D. Required Backend Fix
1. In `PrescriptionsService.authorizeRefill(prescriptionId, dto, user)`:
   - Extract `doctorProfileId` or `userId` from `user`:
     ```typescript
     const authorizerId = user.doctorProfileId || user.id;
     ```
   - Ensure the query checks both `prescriptions` and `reports` entities if unified storage is used.
   - Insert the refill record and increment `refillCount`:
     ```typescript
     prescription.refillCount = (prescription.refillCount || 0) + dto.quantity;
     await this.prescriptionRepo.save(prescription);
     ```
2. Return HTTP 201 Created with the updated prescription DTO:
   ```json
   {
     "success": true,
     "statusCode": 201,
     "data": {
       "id": "d6314a44-384c-411d-8663-af312f96ef54",
       "refillCount": 1,
       "status": "ACTIVE",
       "refills": [
         {
           "id": "refill-uuid",
           "refillNumber": 1,
           "quantity": 1,
           "refilledAt": "2026-11-10T13:10:00.000Z",
           "refilledBy": "fa502f2e-332c-4ec0-b6aa-83713216ec88",
           "refilledByName": "Dr. Sarah Connor, MD",
           "notes": "Standard 30-day refill authorized by clinic"
         }
       ]
     }
   }
   ```
- **Priority:** **Critical (P0)** — Blocks e-Rx electronic refill workflow.

---

## 4. TASK 2: Individual Prescription Export Backend Defect (`GET /api/v1/prescriptions/:id/export`)

### A. Defect Description & Runtime Evidence
- **Endpoint:** `GET https://360api.vnvision.in/api/v1/prescriptions/:prescriptionId/export`
- **Observed HTTP Status:** **HTTP 500 InternalServerError**
- **Test with Non-Existent UUID (`00000000-0000-0000-0000-000000000000`):** Returns HTTP 500 instead of HTTP 404 Not Found.
- **Error Response Body:**
  ```json
  {
    "success": false,
    "statusCode": 500,
    "error": "InternalServerError",
    "message": "An internal server error occurred.",
    "meta": {
      "timestamp": "2026-11-10T07:40:21.144Z",
      "path": "/api/v1/prescriptions/d6314a44-384c-411d-8663-af312f96ef54/export"
    }
  }
  ```

### B. Root Cause Forensic Analysis
1. The route crashes before performing the database existence check, indicating a failure inside a NestJS interceptor, guard, or the constructor of the export service.
2. If `Accept: application/pdf` or `Accept: application/json` is passed, the handler attempts to instantiate a PDF generation library (e.g. `pdfkit`, `puppeteer`, or HTML template renderer) where the template asset or fonts are missing in the deployed Docker container.
3. The serializer expects a relational join with `patient.user` and `prescriber.doctorProfile` that throws a `TypeError: Cannot read property of null` when optional fields are absent.

### C. Required Backend Fix
1. Add error boundary around export serializer in `PrescriptionsController.exportPrescription()`:
   - Check prescription existence first: if not found, return standard `NotFoundException('Prescription not found')`.
   - Validate patient authorization against the authenticated doctor.
   - Return formatted JSON manifest (or binary PDF stream with `Content-Type: application/pdf`):
     ```json
     {
       "prescriptionId": "d6314a44-384c-411d-8663-af312f96ef54",
       "rxNumber": "RX-2026-00123",
       "issuedAt": "2026-11-10T07:40:00.000Z",
       "patient": {
         "fullName": "Marcus Doe",
         "mrn": "+16505550004"
       },
       "prescriber": {
         "fullName": "Dr. Sarah Connor, MD",
         "specialization": "Interventional Cardiology"
       },
       "facilityName": "CareID Heart Institute",
       "medications": [ ... ],
       "status": "ACTIVE",
       "disclaimer": "CareID Digital Health Platform — Clinically Verified"
     }
     ```
- **Priority:** **High (P1)**

---

## 5. TASK 3: Missing API — Unified Patient Clinical Record Export

### A. Business Operation Required
Doctors require the ability to export the entire longitudinal medical summary for a patient directly from the Prescription & Clinical History header action button ("Export Record").

This compiled clinical document must aggregate:
1. **Patient Demographics:** Full name, MRN, date of birth, age, gender, blood group, known allergies.
2. **Active & Historical Prescriptions:** All active regimens, dosages, frequencies, prescribing doctors, and refill counts.
3. **Chronological SOAP Notes:** Subjective complaints, Objective examination/vitals, Assessment/diagnoses, and Plan (treatment orders and follow-up instructions).
4. **Hospital Admissions History:** Inpatient admission/discharge dates, ward/bed locations, attending physicians, and admitting diagnoses.
5. **Diagnostic Document Index:** List of verified laboratory attachments and clinical reports.
6. **Legal & Security Attestation:** Timestamped digital seal, doctor signature attribution, and HIPAA/CareID legal disclaimer.

### B. Audit Proof of Genuinely Missing Status
An exhaustive scan of all 559 items in `CareID-Staging.postman_collection.json` confirmed that:
- `04. Admin Portal` only has `/admin/audit-logs/export`.
- `08. Medical Records` only has `/prescriptions/:prescriptionId/export` (Single prescription only).
- `17. Governance` only has `/governance/configurations/export`.
- `20. Clinical Reports` only has `/reports/generated/:id/export` (Report template export only).
- **Zero endpoints exist for patient-level unified medical record export.**  
  Testing `GET /api/v1/doctors/patients/:patientProfileId/medical-records/export?format=PDF` confirms **HTTP 404 Not Found**.

### C. Proposed API Specification
- **Proposed HTTP Method & Endpoint:**  
  `GET /api/v1/doctors/patients/:patientProfileId/medical-records/export`
- **Query Parameters:**
  - `format` (optional, default: `PDF`): `PDF` | `JSON`
  - `includeAttachments` (optional, default: `true`): `boolean`
  - `startDate` (optional): ISO 8601 string
  - `endDate` (optional): ISO 8601 string
- **Required Headers:**  
  `Authorization: Bearer <doctor_token>`  
  `Accept: application/pdf, application/json`
- **Expected Successful Response (`format=PDF`):**
  - **Status:** HTTP 200 OK
  - **Headers:**  
    `Content-Type: application/pdf`  
    `Content-Disposition: attachment; filename="careid_record_PT-16505550004.pdf"`  
    `X-Document-Checksum: SHA256-...`
- **Expected Successful Response (`format=JSON`):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "exportId": "EXP-20261110-99412",
      "generatedAt": "2026-11-10T13:10:00.000Z",
      "patient": {
        "fullName": "Marcus Doe",
        "mrn": "+16505550004",
        "dateOfBirth": "1981-03-14",
        "bloodGroup": "O_POSITIVE",
        "knownAllergies": ["Penicillin"]
      },
      "activePrescriptionsCount": 2,
      "clinicalNotesCount": 1,
      "admissionsCount": 1,
      "downloadUrl": "https://360api.vnvision.in/api/v1/reports/download/EXP-20261110-99412/file?token=exp-timed-token"
    }
  }
  ```
- **Security & Authorization Rules:**
  - Only authenticated doctors authorized to treat the patient (`/doctors/patients`) may export the record.
  - Generates an immutable audit log entry in `audit_logs` table (`action: "PATIENT_RECORD_EXPORTED"`).
- **Priority:** **Medium (P2)** — High clinical utility; active browser print fallback protects user experience in the interim.
