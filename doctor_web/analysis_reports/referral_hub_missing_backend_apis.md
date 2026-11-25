# CareID Doctor Web — Referral Hub
## Missing Backend API Audit & Enhancement Specifications

**Target Subsystem:** Referral Hub & Care Coordination (`/referrals`, `/referrals/new`, `/referrals/:id`, `/referrals/incoming/:id`)  
**Backend:** `https://360api.vnvision.in`  
**API Base:** `https://360api.vnvision.in/api/v1`  
**Authoritative Contract:** `CareID-Staging.postman_collection.json` (Folder 11: Referrals & Care Coordination)  
**Audit Date:** November 10, 2026  
**Status:** FORENSICALLY VERIFIED AGAINST LIVE STAGING BACKEND  

---

### Executive Summary

A comprehensive live runtime audit of the Referral Hub module was performed against the deployed NestJS staging backend (`https://360api.vnvision.in/api/v1`). The core referral lifecycle APIs (creation, listing, directional segregation, dashboard analytics, triage, status updates, notes, attachment linking, and audit history) are actively deployed, operational, and integrated into the frontend.

However, forensic live testing identified specific missing endpoints and server-side query limitations required to support the full enterprise-grade clinical workflow.

---

### Genuinely Missing Backend APIs

#### 1. Dedicated Referral Export Endpoint

- **Stage / Feature:** Referral Hub Dashboard (`/referrals`) — Export Records Action
- **Required Business Operation:** Export filtered referral registry records as CSV, JSON, or PDF for administrative reporting, regional compliance audits, and payer coordination.
- **Existing Related Endpoints:**
  - `GET /api/v1/admin/audit-logs/export` (Admin audit log export only)
  - `GET /api/v1/prescriptions/:prescriptionId/export` (Prescription export only)
  - `GET /api/v1/reports/generated/:id/export` (General reports export)
- **Why Existing Endpoints Are Insufficient:** There is no endpoint under `/api/v1/referrals` that generates or streams an export of patient care referrals. Direct calls to `GET /api/v1/referrals/export` return `404 Not Found`.
- **Frontend Fallback Implemented:** The frontend currently generates a client-side CSV blob download from the active dataset.
- **Proposed HTTP Method & Endpoint:**
  ```http
  GET /api/v1/referrals/export?format=csv|json|pdf&status=string&priority=string&startDate=string&endDate=string
  ```
- **Required Request Query Parameters:**
  - `format`: `"csv"` | `"json"` | `"pdf"` (default: `"csv"`)
  - `direction`: `"incoming"` | `"outgoing"` | `"all"` (optional)
  - `status`: Filter by referral status (optional)
  - `priority`: Filter by priority level (optional)
  - `startDate`: ISO 8601 date string (optional)
  - `endDate`: ISO 8601 date string (optional)
- **Expected Response:**
  - `Content-Type: text/csv; charset=utf-8` or `application/pdf` with `Content-Disposition: attachment; filename="careid_referrals_export_{timestamp}.csv"`
- **Required Database Persistence:** Audit entry logged in `AuditLog` table for data export compliance.
- **Priority:** **MEDIUM**

---

#### 2. Direct Multipart File Attachment Upload for Referrals

- **Stage / Feature:** Create Referral (`/referrals/new`) & Referral Details (`/referrals/:id`) — External Document Attachment
- **Required Business Operation:** Doctors need to upload PDF reports, DICOM summaries, and external clinic notes directly during referral creation or clinical review.
- **Existing Related Endpoints:**
  - `POST /api/v1/referrals/:id/attachments` (Only links an existing `attachmentId` UUID)
  - `GET /api/v1/referrals/:id/attachments` (Lists linked attachments)
  - `POST /api/v1/attachments/upload` (Generic unstructured file upload)
- **Why Existing Endpoints Are Insufficient:** Attaching external files currently requires a disjointed two-step HTTP process (upload to global storage, then associate UUID). A dedicated multipart endpoint streamlines clinical coordination and enforces document virus scanning within the referral scope.
- **Proposed HTTP Method & Endpoint:**
  ```http
  POST /api/v1/referrals/:id/attachments/upload
  ```
- **Required Request Payload:** `multipart/form-data`
  - `file`: Binary document (PDF, PNG, JPEG, DICOM; max 25MB)
  - `documentType`: `"CLINICAL_SUMMARY"` | `"DIAGNOSTIC_IMAGING"` | `"LAB_REPORT"` | `"PRIOR_AUTH"`
  - `isConfidential`: `boolean` (default: `false`)
- **Expected Response (201 Created):**
  ```json
  {
    "success": true,
    "statusCode": 201,
    "data": {
      "id": "uuid",
      "referralId": "uuid",
      "attachmentId": "uuid",
      "fileName": "Resting_ECG_Today.pdf",
      "fileType": "application/pdf",
      "fileSize": 1468006,
      "url": "https://cdn.careid.health/attachments/...",
      "createdAt": "2026-11-10T10:00:00.000Z"
    }
  }
  ```
- **Required Database Persistence:** Creates record in `MedicalAttachment` and links to `ReferralAttachment`.
- **Priority:** **MEDIUM**

---

### Existing APIs Requiring Backend Enhancement

#### 3. Server-Side Full-Text Search on `GET /api/v1/referrals`

- **Stage / Feature:** Referral Hub Table Search Input (`/referrals`)
- **Current Behavior:** Calling `GET /api/v1/referrals?search=Marcus` or `GET /api/v1/referrals?q=Marcus` returns `total: 0` on live staging, even though records with patient name "Marcus Doe" exist in the database.
- **Required Enhancement:** The NestJS controller for `GET /api/v1/referrals` should implement full-text and substring ILIKE matching on:
  - `patient.fullName`
  - `patient.patientNumber` (MRN)
  - `referralNumber`
  - `referringDoctor.fullName`
  - `receivingDoctor.fullName`
  - `specialtyRequired`
- **Frontend Mitigation:** The frontend currently fetches doctor-authorized records and performs robust client-side memoized filtering across all 6 fields.
- **Priority:** **HIGH**

---

#### 4. Server-Side Status Query Filtering on `GET /api/v1/referrals`

- **Stage / Feature:** Referral Hub Filter Pills (`All`, `Pending`, `Accepted`, `Urgent`)
- **Current Behavior:** Calling `GET /api/v1/referrals?status=PENDING` returns records with status `ACCEPTED`. The `status` query parameter is currently ignored by the SQL/Prisma query generator in the backend service.
- **Required Enhancement:** Bind `status` query parameter to the SQL WHERE clause (`WHERE r.status = :status`).
- **Frontend Mitigation:** The frontend filters records client-side using `mapBackendReferralToRecord()`.
- **Priority:** **HIGH**

---

#### 5. Role-Based Access Control on `DELETE /api/v1/referrals/:id`

- **Stage / Feature:** Referral Details — Withdraw / Cancel Referral
- **Current Behavior:** Calling `DELETE /api/v1/referrals/:id` as an Attending Doctor returns `403 Forbidden` (`Forbidden resource`).
- **Required Enhancement:** Allow referring doctors (`referringDoctorId === currentDoctorId`) to soft-delete or cancel referrals in `SUBMITTED` or `PENDING` status.
- **Frontend Mitigation:** The frontend successfully uses `PUT /api/v1/referrals/:id/status` with `status: "CANCELLED"` and reason, which returns `200 OK` and correctly updates status history.
- **Priority:** **LOW**

---

### Summary Classification Matrix

| Feature | Endpoint | Postman Status | Backend Live Status | Frontend Integration Status | Classification |
|---|---|---|---|---|---|
| Referral Export | `GET /api/v1/referrals/export` | Undocumented | 404 Not Found | Client-side CSV generation active | **GENUINELY MISSING BACKEND API** |
| Direct File Upload | `POST /api/v1/referrals/:id/attachments/upload` | Undocumented | 404 Not Found | Two-step link active | **GENUINELY MISSING BACKEND API** |
| Full-Text Search | `GET /api/v1/referrals?search=` | Undocumented param | Returns 0 results | Client-side multi-field filter active | **EXISTING API REQUIRING ENHANCEMENT** |
| Status Query Filter | `GET /api/v1/referrals?status=` | Documented in schema | Param ignored on query | Client-side tab filter active | **EXISTING API REQUIRING ENHANCEMENT** |
| Doctor Soft-Delete | `DELETE /api/v1/referrals/:id` | Documented | 403 Forbidden for Doctor | Using `PUT :id/status` (CANCELLED) | **EXISTING API REQUIRING ENHANCEMENT** |

