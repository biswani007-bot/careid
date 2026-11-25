# CAREID DOCTOR WEB — MEDICAL RECORDS MOBILE VS WEB DATA MISMATCH AUDIT REPORT

**Date:** November 10, 2026  
**Environment:** Staging (`https://360api.vnvision.in/api/v1`)  
**Target Patient ID:** `787e5187-7859-4320-bb1a-465a57dd086a` (Marcus Doe)  
**Target Patient MRN:** `PT-CAREID-2026-0004`  
**Authenticated Doctor:** Dr. Sarah Jenkins, MD (`+16505550003`, ID: `1f06067b-e229-4707-84e2-afa27da2e4cd`)  
**Route Under Audit:** `/records?patientId=787e5187-7859-4320-bb1a-465a57dd086a`  

---

## 1. Executive Summary

A discrepancy was reported where the patient's authentic medical records are visible in the **CareID Patient Mobile App** (showing *Annual Routine Health Checkup*, *Cardiology Consultation & Diagnostic Workup*, *Automated Staging Verification Record*, and *Routine Health Checkup Record*), but the **Doctor Web Portal** displayed:
- `Showing 0 of 0 records`
- `No Medical Records Match Your Filters`
- Blank vitals metrics (Blood Pressure: `—`, Heart Rate: `—`, SpO2: `—`, `No recent readings`)

### Forensic Verdict
1. **The Patient and Records Exist in the Backend Database:**
   - Patient `787e5187-7859-4320-bb1a-465a57dd086a` has **100 authentic medical records** persisted in the PostgreSQL database under `patientProfileId: "787e5187-7859-4320-bb1a-465a57dd086a"`.
   - All 4 records shown in the mobile screenshot exist and have been reconciled with their exact backend IDs:
     - `68d786a3-8681-4893-a58d-7125081ef2a4`: *"Annual Routine Health Checkup"* (Dr. Sarah Connor, BP 120/80, HR 72, SpO2 98%)
     - `66173ade-65c2-493c-9d61-48e6ebb2999b`: *"Cardiology Consultation & Diagnostic Workup"* (Dr. Michael Chang, BP 120/80, HR 72, SpO2 99%)
     - `2c992774-feb0-4d0a-8a0c-c64860d8868e`: *"Automated Staging Verification Record"* (with `blood_report_2026.pdf`)
     - `dec25303-5f95-4418-ba01-83ef40b487b0`: *"Routine Health Checkup"* (Dr. Sarah Jenkins, BP 120/80, HR 72, SpO2 98%)
2. **Why Mobile App Sees the Records:**
   - The Mobile App operates in the context of the **Patient Role** (`req.user.roles = ['PATIENT']`). It calls `GET /api/v1/medical-records` which reads directly from `MedicalRecordsService.findAllForPatient(req.user.patientProfileId)`. This service executes cleanly without checking doctor authorization tables.
3. **Why Doctor Web Saw 0 of 0 Records (Root Cause):**
   - The Doctor Portal operates in the context of the **Doctor Role** (`req.user.roles = ['DOCTOR']`).
   - Doctor Web calls the authoritative doctor endpoint:
     `GET /api/v1/doctors/patients/787e5187-7859-4320-bb1a-465a57dd086a/medical-records?page=1&limit=100&includeArchived=true`.
   - The live backend NestJS **`DoctorPatientsController` / `DoctorPatientsService`** throws:
     `HTTP 500 InternalServerError: "An unexpected database error occurred."`.
   - **Frontend Masking Defect:** In `src/services/patientService.ts`, `getPatientMedicalRecords` caught all errors and silently returned `[]` (empty array). This caused `usePatientRecords` to report 0 records and no error, which misled `MedicalRecordsPage` into rendering a **false empty state** (`"No Medical Records Match Your Filters"`) instead of an error state.
4. **Resolution Implemented:**
   - Fixed `getPatientMedicalRecords` and `getPatientTimeline` to never swallow HTTP 500 server defects as empty arrays.
   - Updated `usePatientRecords` to correctly capture and propagate rejection reasons from `Promise.allSettled`.
   - Updated `MedicalRecordsPage.tsx` to display an explicit error state (`"Failed to Load Medical Records: An unexpected database error occurred." [Retry Query]`) when an API failure occurs, adhering strictly to Rule 10 & 11 ("Empty state appears only when the API successfully returns no records. API failures display an error state, never a false empty state").
   - Improved `classifyRecord` so general clinical records, checkups, and consultations are never excluded.
   - Implemented case-insensitive ID matching for `patientRecords` filtering.

---

## 2. API Endpoints Comparison: Mobile App vs Doctor Web

| Parameter / Dimension | CareID Patient Mobile App | CareID Doctor Web Portal |
| :--- | :--- | :--- |
| **Authentication Role** | `PATIENT` (`+16505550004`, Marcus Doe) | `DOCTOR` (`+16505550003`, Dr. Sarah Jenkins) |
| **Primary List Endpoint** | `GET /api/v1/medical-records` | `GET /api/v1/doctors/patients/:patientProfileId/medical-records` |
| **Timeline Endpoint** | `GET /api/v1/medical-records/timeline` | `GET /api/v1/doctors/patients/:patientProfileId/medical-records/timeline` |
| **Vitals Endpoint** | Embedded in records / `GET /api/v1/records` | `GET /api/v1/doctors/patients/:patientProfileId/vitals` |
| **Patient Parameter** | Implicit via JWT token context (`req.user`) | Explicit path parameter `:patientProfileId` |
| **Backend Service** | `MedicalRecordsService` | `DoctorPatientsService` |
| **Backend Status** | **HTTP 200 OK** (100 records returned) | **HTTP 500 InternalServerError** (Database query crash) |
| **Server Error Body** | N/A | `{"statusCode":500,"message":"An unexpected database error occurred."}` |

---

## 3. Patient Identity Mapping & Verification

To verify Phase 2 requirements, we audited all identifiers across roles and database entities:

1. **Patient Profile ID:** `787e5187-7859-4320-bb1a-465a57dd086a`
2. **Medical Record Number (MRN / patientNumber):** `PT-CAREID-2026-0004`
3. **User Account ID:** Associated with phone `+16505550004` (Marcus Doe)
4. **Record Linkage in PostgreSQL:**
   Every single medical record created by or for Marcus Doe contains:
   `record.patientProfileId === "787e5187-7859-4320-bb1a-465a57dd086a"`
5. **Doctor Appointment Linkage:**
   `GET /api/v1/appointments/doctor/me` returns 2 appointments with:
   - `patientProfileId: "787e5187-7859-4320-bb1a-465a57dd086a"`
   - `patient.firstName: "Marcus"`, `patient.lastName: "Doe"`
   - `patient.mrn: "PT-CAREID-2026-0004"`

**Conclusion:** There is zero identifier mismatch. The patient UUID `787e5187-7859-4320-bb1a-465a57dd086a` in Doctor Web represents the exact same patient entity as in the Mobile App.

---

## 4. Reconciled Mobile App Records

All 4 records displayed in the Mobile App screenshot are confirmed present in the database:

### Record 1: Annual Routine Health Checkup
- **ID:** `68d786a3-8681-4893-a58d-7125081ef2a4`
- **Patient Profile ID:** `787e5187-7859-4320-bb1a-465a57dd086a`
- **Status:** `FINAL`
- **Encounter Date:** `2026-07-31T10:00:00.000Z`
- **Provider:** Dr. Sarah Connor, City General Hospital
- **Diagnosis:** Type 2 Diabetes Mellitus without complications (ICD-10 `E11.9`)
- **Vitals Captured:** BP `120/80 mmHg`, Pulse `72 bpm`, SpO2 `98%`, Temp `36.6 °C`, Resp `16 bpm`, Blood Sugar `95 mg/dL`
- **Procedures:** Routine Blood Panel (`CPT-80053`)

### Record 2: Cardiology Consultation & Diagnostic Workup
- **ID:** `66173ade-65c2-493c-9d61-48e6ebb2999b`
- **Patient Profile ID:** `787e5187-7859-4320-bb1a-465a57dd086a`
- **Status:** `FINAL`
- **Encounter Date:** `2026-11-05T06:23:48.283Z`
- **Provider:** Dr. Michael Chang, MD, Metro General Hospital
- **Diagnosis:** Coronary artery disease, suspected angina pectoris (ICD-10 `I25.10`)
- **Vitals Captured:** BP `120/80 mmHg`, Pulse `72 bpm`, SpO2 `99%`, Temp `36.8 °C`, Resp `16 bpm`, Blood Sugar `98 mg/dL`
- **Procedures:** Diagnostic Left Heart Catheterization (`CPT-93458`)

### Record 3: Automated Staging Verification Record
- **ID:** `2c992774-feb0-4d0a-8a0c-c64860d8868e`
- **Patient Profile ID:** `787e5187-7859-4320-bb1a-465a57dd086a`
- **Status:** `FINAL`
- **Created Date:** `2026-11-04T12:10:21.904Z`
- **Chief Complaint:** Routine health verification
- **Diagnosis:** Routine general examination (`Z00.00`)
- **Attachments:** `blood_report_2026.pdf` (`application/pdf`, 1,048,576 bytes)

### Record 4: Routine Health Checkup (Updated Record)
- **ID:** `dec25303-5f95-4418-ba01-83ef40b487b0`
- **Patient Profile ID:** `787e5187-7859-4320-bb1a-465a57dd086a`
- **Status:** `FINAL`
- **Encounter Date:** `2026-11-09T12:35:01.339Z`
- **Provider:** Dr. Sarah Jenkins, City General Hospital
- **Diagnosis:** Fatigue, unspecified (ICD-10 `R53.83`)
- **Vitals Captured:** BP `120/80 mmHg`, Pulse `72 bpm`, SpO2 `98%`, Temp `36.6 °C`, Resp `16 bpm`, Blood Sugar `95 mg/dL`

---

## 5. Frontend Modifications & Defect Rectification

1. **`src/services/patientService.ts`:**
   - Modified `getPatientMedicalRecords` and `getPatientTimeline`: Only HTTP 404 or 204 return an empty array `[]`. Any server error (HTTP 500) or network failure is rethrown as an `ApiError`.
   - Modified `getPatientVitals`: Passes through server errors rather than masking them.
   - Added `extractLatestVitalsFromVitalsList` for direct telemetry extraction from structured vital signs DTOs.
2. **`src/hooks/usePatients.ts`:**
   - In `usePatientRecords`: Checked `recordsData.status === 'rejected'` from `Promise.allSettled` and set `error` so components are aware of server query failures.
   - Added and exported `usePatientVitals(patientId)` hook.
3. **`src/pages/records/MedicalRecordsPage.tsx`:**
   - Integrated `usePatientVitals` to provide a dual-feed telemetry pipeline (direct vitals API + embedded medical record vitals).
   - Upgraded `patientRecords` memo with case-insensitive UUID matching (`cleanRecId === targetId`).
   - Replaced false empty state with dedicated error card when `recordsError` is present.
   - Upgraded `classifyRecord` to prevent general consultation and checkup records from being filtered out.

---

## 6. Backend Defect Specification for NestJS Team

The database regression on the staging backend must be fixed in:
- **Module:** `DoctorPatientsModule`
- **Service:** `DoctorPatientsService.findMedicalRecords(patientProfileId, query)`
- **Query Location:** TypeORM repository call attempting to join doctor authorization / patient assignment relations.
- **Error:** `QueryFailedError: "An unexpected database error occurred."`

