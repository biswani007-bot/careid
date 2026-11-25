# CAREID DOCTOR WEB — REPORTS MODULE MISSING BACKEND APIS & DEFECT AUDIT

**Date:** November 10, 2026  
**Environment:** Staging (`https://360api.vnvision.in/api/v1`)  
**Authoritative Reference:** `Postman collection/CareID-Staging.postman_collection.json`  
**Inspected Folders:**
- `05. Doctor Portal`
- `08. Medical Records`
- `20. Clinical Reports & Analytics`

---

## 1. Classification Matrix of Reports APIs

| Category | Endpoints Count | Summary Status |
| :--- | :---: | :--- |
| **Already Implemented & Working** | 2 | Authenticated doctor session and doctor appointments panel return HTTP 200. |
| **Existing APIs Needing Backend Enhancement / Fix** | 5 | Doctor-authorized patient records, profile, and timeline return HTTP 500. Diagnostic reports endpoints reject doctor tokens with HTTP 404. |
| **Completely Missing Backend APIs** | 3 | Doctor-initiated report upload for patients, doctor-wide reports dashboard list, and clinical critical alert panic acknowledgment. |

---

## 2. Existing APIs That Need Backend Enhancement / Bug Resolution

### Defect 1: Database Crash on Doctor-Authorized Patient Records
- **Endpoint:** `GET /api/v1/doctors/patients/:patientProfileId/medical-records`
- **Method:** `GET`
- **Current Runtime Status:** `HTTP 500 InternalServerError`
- **Error Response:**
  ```json
  {
    "success": false,
    "statusCode": 500,
    "error": "InternalServerError",
    "message": "An unexpected database error occurred.",
    "meta": {
      "timestamp": "2026-11-10T15:01:15.185Z",
      "path": "/api/v1/doctors/patients/787e5187-7859-4320-bb1a-465a57dd086a/medical-records"
    }
  }
  ```
- **Root Cause:** In NestJS `DoctorPatientsService.findMedicalRecordsForPatient`, a TypeORM relation join query on the `doctor_patients` relationship or `medical_records` entity encounters an unhandled SQL exception.
- **Required Backend Enhancement:** Fix the entity relation query in `DoctorPatientsService` so that assigned doctors can retrieve their patient's diagnostic medical records.

---

### Defect 2: Role Boundary Defect on Folder 20 Diagnostic Reports Endpoints
- **Endpoints:**
  - `GET /api/v1/reports`
  - `GET /api/v1/reports?category=LAB|RADIOLOGY|CLINICAL`
  - `GET /api/v1/reports/categories`
  - `GET /api/v1/reports/timeline`
  - `GET /api/v1/reports/:id`
  - `POST /api/v1/reports/:id/verify`
  - `GET /api/v1/reports/download/:id`
- **Current Runtime Status:** `HTTP 404 NotFoundException`
- **Error Response:**
  ```json
  {
    "success": false,
    "statusCode": 404,
    "error": "NotFoundException",
    "message": "Patient profile not found. Please complete registration first.",
    "meta": {
      "timestamp": "2026-11-10T15:01:14.411Z",
      "path": "/api/v1/reports"
    }
  }
  ```
- **Root Cause:** The controller uses a guard/service that queries `patient_profiles` for `req.user.id`. When called by an authenticated Doctor (whose identity is stored in `doctor_profiles`), the service finds no patient profile and throws `NotFoundException`.
- **Required Backend Enhancement:** Update `ReportsController` to support the `DOCTOR` role:
  - If caller is a Doctor and provides `?patientProfileId=...`, verify the doctor is authorized to treat the patient and return the patient's reports.
  - If caller is a Doctor calling `GET /api/v1/reports/:id`, verify doctor access to the report's owner and return report details.

---

## 3. Completely Missing Backend APIs

### Missing API 1: Doctor Upload Diagnostic Report for Authorized Patient
1. **Stage Number & Workflow:** Stage 13 / Stage 20 — Clinical Diagnostic Records Upload.
2. **Required Business Operation:** A doctor uploads or registers a diagnostic laboratory report, imaging DICOM study, or scanned paper document for an authorized patient under their care.
3. **Existing Related API Endpoints:**
   - `POST /api/v1/reports`: Exists, but strictly rejects `patientProfileId` (`HTTP 400: ["property patientProfileId should not exist"]`) and fails with HTTP 404 for doctor tokens.
   - `POST /api/v1/medical-records/:id/attachments`: Attaches files to an existing medical record, but does not create a standalone diagnostic report entry with report metadata, category, and provider details.
4. **Why Existing Endpoints Cannot Support the Operation:**
   Doctors cannot use `POST /api/v1/reports` because the backend only creates reports for the calling patient's own profile.
5. **Proposed Method & Endpoint:**
   `POST /api/v1/doctors/patients/:patientProfileId/reports`
6. **Required Request Payload:**
   ```json
   {
     "title": "Comprehensive Metabolic Panel (CMP)",
     "category": "LAB",
     "fileName": "cmp_panel_2026.pdf",
     "fileSize": 524288,
     "mimeType": "application/pdf",
     "storageUrl": "https://storage.careid.in/reports/cmp_panel_2026.pdf",
     "providerName": "City General Hospital - Central Labs",
     "reportDate": "2026-11-10",
     "description": "Marked interval increase in serum creatinine and hyperkalemia.",
     "tags": ["lab", "metabolic", "critical"]
   }
   ```
7. **Expected Response:**
   ```json
   {
     "success": true,
     "statusCode": 201,
     "message": "Diagnostic report uploaded and linked successfully",
     "data": {
       "id": "c1f7b82e-9d21-4f12-9c32-b883017e41fa",
       "patientProfileId": "787e5187-7859-4320-bb1a-465a57dd086a",
       "title": "Comprehensive Metabolic Panel (CMP)",
       "category": "LAB",
       "status": "PENDING",
       "storageUrl": "https://storage.careid.in/reports/cmp_panel_2026.pdf",
       "createdAt": "2026-11-10T15:20:00.000Z"
     }
   }
   ```
8. **Required Database Persistence:** Insert into `diagnostic_reports` table linking `patient_profile_id`, `uploaded_by_doctor_id`, and `storage_url`.
9. **Priority:** **HIGH (P1)**.

---

### Missing API 2: Doctor Reports Dashboard Feed Across Patient Panel
1. **Stage Number & Workflow:** Milestone 13 — Reports Dashboard (`/reports`).
2. **Required Business Operation:** Retrieve paginated diagnostic reports across all patients assigned to the authenticated doctor, with filtering by status (`verified`, `pending`, `critical`), category (`LAB`, `RADIOLOGY`, `CLINICAL`), and date ranges.
3. **Existing Related API Endpoints:**
   - `GET /api/v1/reports/dashboard/executive`: Requires `ADMIN` role and returns `HTTP 403 Forbidden` to doctors.
   - `GET /api/v1/reports`: Rejects doctors with `HTTP 404`.
4. **Why Existing Endpoints Cannot Support the Operation:**
   No endpoint currently aggregates diagnostic reports across a doctor's entire patient roster. Currently, the doctor frontend must query patients individually via appointments and stitch them client-side.
5. **Proposed Method & Endpoint:**
   `GET /api/v1/doctors/reports?category=...&status=...&priority=...&page=1&limit=20`
6. **Required Request Payload:** N/A (URL Query Parameters).
7. **Expected Response:**
   ```json
   {
     "success": true,
     "statusCode": 200,
     "data": {
       "items": [
         {
           "id": "rpt-uuid-1",
           "patientProfileId": "787e5187-7859-4320-bb1a-465a57dd086a",
           "patientName": "Marcus Doe",
           "patientMrn": "PT-CAREID-2026-0004",
           "title": "Comprehensive Metabolic Panel (CMP)",
           "category": "LAB",
           "status": "critical",
           "priority": "stat",
           "providerName": "City General Hospital - Central Labs",
           "createdAt": "2026-11-10T14:45:00.000Z"
         }
       ],
       "metrics": {
         "todayReports": 12,
         "pendingReviews": 4,
         "criticalResults": 1,
         "recentlyUploaded": 35
       },
       "meta": {
         "totalItems": 1,
         "page": 1,
         "limit": 20,
         "totalPages": 1
       }
     }
   }
   ```
8. **Required Database Persistence:** Read query joining `diagnostic_reports` with `doctor_patients` on `doctor_id = req.user.doctorId`.
9. **Priority:** **HIGH (P1)**.

---

### Missing API 3: Doctor Critical Report Panic Alert Acknowledgment
1. **Stage Number & Workflow:** Milestone 13 / Stage 20 — Critical Report Review (`/reports/critical/:id`).
2. **Required Business Operation:** An attending clinician acknowledges receipt and clinical review of a critical panic lab result (e.g. Potassium 6.2 mEq/L, Troponin I 0.142 ng/mL), recording an immutable audit timestamp and clinician note.
3. **Existing Related API Endpoints:**
   - `POST /api/v1/reports/:id/verify`: Documented in Postman Folder 20, but fails with `HTTP 404 NotFoundException` when called with doctor tokens due to the patient guard.
4. **Why Existing Endpoints Cannot Support the Operation:**
   Doctors cannot authenticate to the verification endpoint, leaving no server-side audit trail of panic alert acknowledgment.
5. **Proposed Method & Endpoint:**
   `POST /api/v1/doctors/reports/:id/acknowledge`
6. **Required Request Payload:**
   ```json
   {
     "notes": "Critical panic alert acknowledged by Dr. Sarah Jenkins. Initiating urgent consultation and withholding nephrotoxic agents.",
     "actionTaken": "CONSULTATION_INITIATED"
   }
   ```
7. **Expected Response:**
   ```json
   {
     "success": true,
     "statusCode": 200,
     "message": "Critical alert acknowledged successfully",
     "data": {
       "reportId": "c1f7b82e-9d21-4f12-9c32-b883017e41fa",
       "isAcknowledged": true,
       "acknowledgedByDoctorId": "1f06067b-e229-4707-84e2-afa27da2e4cd",
       "acknowledgedAt": "2026-11-10T15:22:15.000Z"
     }
   }
   ```
8. **Required Database Persistence:** Update `diagnostic_reports` setting `is_acknowledged = true`, `acknowledged_at = NOW()`, `acknowledged_by = doctorId`, and insert audit row into `report_audit_logs`.
9. **Priority:** **CRITICAL (P0)** for clinical and medico-legal compliance.

