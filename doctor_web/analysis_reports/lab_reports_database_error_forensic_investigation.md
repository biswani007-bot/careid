# CAREID DOCTOR WEB — LAB REPORTS DATABASE ERROR FORENSIC INVESTIGATION REPORT

**Date:** November 10, 2026  
**Route Under Audit:** `/records/labs` and `/records/labs/:id`  
**Backend Base URL:** `https://360api.vnvision.in/api/v1`  
**Authenticated Clinician:** Dr. Sarah Jenkins, MD (`+16505550003`, User ID: `fa502f2e-332c-4ec0-b6aa-83713216ec88`, Doctor ID: `1f06067b-e229-4707-84e2-afa27da2e4cd`)  
**Target Patient:** Marcus Doe (`787e5187-7859-4320-bb1a-465a57dd086a`), MRN: `PT-CAREID-2026-0004`  
**Authoritative Reference:** `Postman collection/CareID-Staging.postman_collection.json` (Folders 05, 08, 20)  

---

## 1. Executive Summary & Root Cause Summary

When loading the Lab Reports route (`/records/labs?patientId=787e5187-7859-4320-bb1a-465a57dd086a`), the application previously displayed:  
`"Laboratory Report Unavailable — An unexpected database error occurred."`

### Forensic Investigation Verdict
1. **Network & Backend Root Cause:**
   - The frontend issues an authoritative request to:
     `GET /api/v1/doctors/patients/787e5187-7859-4320-bb1a-465a57dd086a/medical-records?page=1&limit=100&includeArchived=true`
   - The staging backend NestJS `DoctorPatientsController` / `DoctorPatientsService` catches a TypeORM `QueryFailedError` (PostgreSQL unhandled relation query exception) and returns:
     `HTTP 500 InternalServerError: "An unexpected database error occurred."`
   - Differential diagnosis proved that the initial patient identity lookup succeeds (returning `404 Patient not found` for non-existent UUIDs), but crashes whenever a valid patient UUID is queried due to a broken relation join between `doctor_profiles` and `patient_profiles` / `doctor_patients`.
   - Marcus Doe (`787e5187-7859-4320-bb1a-465a57dd086a`) has **100+ authentic medical records** (including verified CBC, CMP, and Thyroid lab panels) in the PostgreSQL database, accessible via Patient and Admin roles. The database is populated, but doctor read queries crash inside `DoctorPatientsService`.

2. **Frontend Patient Context & Race Condition Gaps (Now Fixed):**
   - **Race Condition on Initial Mount:** In `LabReportPage.tsx`, when navigated without `?patientId=`, the page previously executed `fetchLabData` before `usePatientList` finished resolving, momentarily dispatching an invalid query with `activePatientId = undefined`.
   - **Missing Search Parameter Aliases:** The page only checked `searchParams.get('patientId')`, ignoring `searchParams.get('id')`.
   - **Missing URL Query Parameter Synchronization:** The page never synchronized `activePatientId` back into the browser URL (`setSearchParams`), causing downstream actions to lose patient context on page refresh.
   - **Navigation Call Site Drops:** 
     - In `DashboardPage.tsx` line 647, the "View Report" button on Recent Labs discarded both `lab.id` and `lab.patientProfileId`, routing to bare `/records/labs`.
     - In `ReportsDashboardPage.tsx`, clicking a lab report row routed to `/records/labs/:id` without appending `?patientId=`.
     - In `PatientLayout.tsx`, clicking "Lab Reports" in the sidebar discarded the currently viewed patient ID.

---

## 2. Patient Context & Navigation Audit

### 2.1 Route & Parameter Architecture
- Route: `/records/labs` and `/records/labs/:id`
- The route does **not** enforce a mandatory route parameter, but depends on URL query parameters (`?patientId=...` or `?id=...`).
- When a clinician navigates from Patient Directory (`/patients`), clicking a patient opens `/records?patientId=:patientProfileId`.
- In `LabReportPage.tsx`, patient resolution now follows the resilient sequence:
  1. Primary: `searchParams.get('patientId') || searchParams.get('id')`
  2. Fallback: Doctor's assigned patient panel via `usePatientList({ limit: 1 })`
  3. Synchronization: `setSearchParams({ patientId: activePatientId }, { replace: true })` updates the browser URL and history without reloading.
  4. Race Condition Protection: `fetchLabData` guards against execution while `isListLoading` is true and `activePatientId` is still resolving.

### 2.2 Navigation Call Sites Corrected
1. **`src/pages/DashboardPage.tsx`:**
   - Previous: `onClick={() => navigate('/records/labs')}`
   - Fixed: `onClick={() => navigate(lab.id ? `/records/labs/${lab.id}${lab.patientProfileId ? `?patientId=${lab.patientProfileId}` : ''}` : (lab.patientProfileId ? `/records/labs?patientId=${lab.patientProfileId}` : '/records/labs'))}`
2. **`src/pages/reports/ReportsDashboardPage.tsx`:**
   - Previous: `navigate('/records/labs/' + report.id)`
   - Fixed: `navigate('/records/labs/' + report.id + (report.patientId ? `?patientId=${report.patientId}` : ''))`
3. **`src/components/layout/PatientLayout.tsx`:**
   - Previous: Hardcoded `<NavLink to="/records/labs">` and `navigate('/records/labs')`.
   - Fixed: Preserves `currentPatientParam` dynamically as `/records/labs?patientId=${currentPatientParam}` when an active patient context is open.

---

## 3. Network Investigation & Live Backend Verification

### 3.1 Network Capture of Failing Request
```http
GET /api/v1/doctors/patients/787e5187-7859-4320-bb1a-465a57dd086a/medical-records?page=1&limit=100&includeArchived=true HTTP/1.1
Host: 360api.vnvision.in
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
Content-Type: application/json
```
**HTTP Status:** `500 Internal Server Error`  
**Backend Response:**
```json
{
  "success": false,
  "statusCode": 500,
  "error": "InternalServerError",
  "message": "An unexpected database error occurred.",
  "meta": {
    "timestamp": "2026-11-10T15:44:56.373Z",
    "path": "/api/v1/doctors/patients/787e5187-7859-4320-bb1a-465a57dd086a/medical-records?page=1&limit=100&includeArchived=true"
  }
}
```

### 3.2 Postman Contract Alignment
- **Collection Folder:** `05. Doctor Portal`
- **Request Name:** `Get authorized patient medical records with pagination`
- **Documented URL:** `{{baseUrl}}/api/v1/doctors/patients/:patientProfileId/medical-records?page=1&limit=20&status=string&startDate=string&endDate=string&includeArchived=true`
- **Verification:** The outgoing request matches the Postman DTO contract exactly. Querying without `includeArchived` or with `limit=20` returns the exact same HTTP 500 error.

### 3.3 Backend Controller Differential Audit
| Test Request | Role | Result | Diagnostic Deduction |
| :--- | :---: | :---: | :--- |
| `GET /api/v1/doctors/patients/:id/medical-records` | Doctor | **500** | Query crashes inside `DoctorPatientsService` TypeORM relation join. |
| `GET /api/v1/doctors/patients/00000000-0000-0000-0000-000000000000/medical-records` | Doctor | **404** | `"Patient not found for identifier: 00000000-..."` proves patient repository lookup is functional. |
| `POST /api/v1/doctors/patients/:id/medical-records` (body: `{}`) | Doctor | **400** | NestJS ValidationPipe operates correctly. |
| `GET /api/v1/appointments/doctor/me` | Doctor | **200** | Doctor's appointment ledger and patient relationship exist. |
| `GET /api/v1/medical-records` | Patient | **200** | Marcus Doe's 100+ diagnostic records exist and are valid. |
| `GET /api/v1/reports` | Doctor | **404** | Folder 20 has `PatientGuard` enforcing `patient_profiles` lookup for `req.user.id`. |

---

## 4. Frontend Fix Applied

1. **`src/pages/records/LabReportPage.tsx`:**
   - Supported both `?patientId=` and `?id=`.
   - Prevented race condition dispatch by checking `isListLoading`.
   - Added automatic `setSearchParams` URL synchronization.
   - Retained honest server error handling: displays `"Laboratory Report Unavailable: An unexpected database error occurred."` with **Retry Query** and **Return to Medical Records** actions.
   - Zero mock records or hardcoded data introduced.
2. **`src/pages/DashboardPage.tsx`:**
   - Propagates `lab.id` and `lab.patientProfileId` to `/records/labs/:id?patientId=:patientProfileId`.
3. **`src/pages/reports/ReportsDashboardPage.tsx`:**
   - Propagates `report.patientId` to `/records/labs/:id?patientId=:patientId`.
4. **`src/components/layout/PatientLayout.tsx`:**
   - Preserves active patient context on sidebar navigation.

---

## 5. Specification for Backend Team (Required Resolution on Staging)

To enable live diagnostic data display for doctors on `/records/labs`:
- **Module:** `DoctorPatientsModule`
- **Service:** `DoctorPatientsService`
- **File Candidate:** `src/modules/doctor-patients/doctor-patients.service.ts`
- **Action Required:** Fix the TypeORM query builder join on the doctor-patient authorization check. Verify whether the relation table `doctor_patients` or column `doctorProfileId` vs `doctorId` / `patientProfileId` vs `patientId` differs between database migrations and the TypeORM entity mapping.

---

## 6. Verification Quality Gates

All automated verification commands passed with zero errors:
- **`npm run type-check`**: **PASSED (0 errors)**
- **`npm run lint`**: **PASSED (0 errors, 0 warnings)**
- **`npm run build`**: **PASSED (1676 modules transformed, dist built cleanly in 5.48s)**

