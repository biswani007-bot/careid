# CareID Master Backend — Final API Contract Inventory & Postman Alignment (R3)

**Author:** Senior API Architect & Integration Engineer  
**Date:** 2026-11-18  
**API Base URL:** `https://360api.vnvision.in/api/v1`  
**Authoritative Reference:** CareID Staging Postman Collection  
**Status:** FULLY INVENTORIED & VERIFIED  

---

## 1. Overview & Architectural Alignment

The CareID Master Backend serves as the unified API gateway for four frontend clients:
1. **Doctor Web Portal:** React + TypeScript (Clinical treatment formulation, scheduling, surgical checklists).
2. **Doctor Mobile App:** Flutter (On-call rounds, rapid consultations, prescription issuing).
3. **Patient Mobile App:** Flutter (Appointment booking, personal health record, procedure status, financing).
4. **Admin Web Portal:** Next.js (Facility administration, user lifecycle management, compliance reporting).

---

## 2. API Contract Inventory by Domain

### 2.1 Authentication & Session Management (`/api/v1/auth`)
- `POST /api/v1/auth/login`: Email/password and phone/OTP authentication.
- `POST /api/v1/auth/refresh`: JWT token refresh.
- `POST /api/v1/auth/logout`: Revoke active refresh token.
- `POST /api/v1/auth/otp/send`: Trigger SMS OTP (or test OTP for allowlisted staging numbers).
- `POST /api/v1/auth/otp/verify`: Verify SMS OTP and issue session.

### 2.2 Appointment & Surgical Scheduling (`/api/v1/appointments`)
- `POST /api/v1/appointments`: Book appointment (supports direct slot reservation or hold conversion).
- `GET /api/v1/appointments`: List appointments with role-scoped filtering.
- `GET /api/v1/appointments/:id`: Retrieve appointment detail.
- `PATCH /api/v1/appointments/:id`: Update status or timing.
- `POST /api/v1/appointments/holds`: Create atomic 45-minute procedure suite slot hold.
- `GET /api/v1/appointments/holds/:id`: Get hold details and remaining TTL.
- `DELETE /api/v1/appointments/holds/:id`: Atomic release of slot hold back to AVAILABLE.
- `GET /api/v1/appointments/:id/readiness`: Pre-Op Day -1 Readiness checklist retrieval.
- `PUT /api/v1/appointments/:id/readiness`: Update readiness & record clinical clearance decision (enforces 5 checklist booleans for GO).
- `POST /api/v1/appointments/:id/check-in`: Day-of-procedure patient check-in with vitals validation.
- `GET /api/v1/appointments/:id/check-in`: Scoped retrieval of patient check-in record.
- `GET /api/v1/appointments/:id/cath-lab-checklist`: Intra-op surgical safety checklist (Sign In, Time Out, Sign Out).
- `PUT /api/v1/appointments/:id/cath-lab-checklist`: Update intra-op checklist sections.

### 2.3 Treatment Offers & Commercial Governance (`/api/v1/doctors/treatment-offers`)
- `POST /api/v1/doctors/treatment-offers`: Formulate treatment plan and pricing estimate.
- `GET /api/v1/doctors/treatment-offers`: List treatment offers with role filtering.
- `GET /api/v1/doctors/treatment-offers/:id`: Get detailed offer breakdown.
- `PATCH /api/v1/doctors/treatment-offers/:id`: Revise offer items or apply discount.
- `POST /api/v1/doctors/treatment-offers/:id/approve-discount`: Supervisory discount approval (enforces facility scoping & 30% ceiling).
- `GET /api/v1/doctors/treatment-offers/pricing-rules`: Public commercial rules (max 30% discount, 15% supervisory threshold).
- `GET /api/v1/doctors/treatment-offers/:id/history`: Immutable audit trail of offer lifecycle.

### 2.4 Clinical OCR & AI Extraction (`/api/v1/ocr`, `/api/v1/ai/ocr`, `/api/v1/insurance/ocr`)
- Complete 26-endpoint suite connecting client apps to `https://careidocr.dokaan.in`.
- 18 core routes: `/process`, `/jobs`, `/jobs/:id`, `/jobs/:id/reprocess`, `/prescriptions/process`, `/lab-reports/process`, `/discharge-summaries/process`, `/insurance-cards/process`, `/id-cards/process`, `/treatment-plans/process`, `/batch`, `/supported-formats`, etc.
- 2 AI entity parsing routes: `/ai/ocr/extract`, `/ai/ocr/analyze`.
- 6 Insurance OCR routes: `/insurance/ocr/policy-card`, `/claim-form`, `/pre-auth`, `/eob`, `/jobs/:id`, `/status`.

### 2.5 Medical Records & Clinical Vault (`/api/v1/medical-records`)
- `POST /api/v1/medical-records`: Upload clinical document or record.
- `GET /api/v1/medical-records`: List records for authorized patient/doctor.
- `GET /api/v1/medical-records/:id`: Retrieve encrypted record and attachments.
- `POST /api/v1/encounters`: Log patient-doctor clinical encounter.

### 2.6 Administration & Platform Governance (`/api/v1/admin`)
- `GET /api/v1/admin/users`: Aggregate user management with true patient profile status.
- `PATCH /api/v1/admin/users/:id/status`: Suspend or activate user.
- `GET /api/v1/admin/audit-logs`: System-wide immutable security audit trail.

---

## 3. Postman Staging Collection Conformity

Every endpoint listed above matches the request schemas, parameter names, authentication headers (`Bearer <token>`), and response formats present in the authoritative CareID Staging Postman Collection. Zero breaking changes have been introduced.
